import { confirmPayment } from './api/confirmPayment'
import { initiatePayment } from './api/initiatePayment'
import {
  isPreInitializeConfigValid,
  preInitializePayment,
} from './api/preInitialize'
import {
  applyDocumentLanguage,
  createTranslator,
  resolveAppLang,
  type AppLang,
} from './i18n'
import type {
  ConfirmOrderSummary,
  ConfirmPaymentData,
  InitiatePaymentData,
  PaymentSuccessSnapshot,
  PreInitializeData,
} from './types/payment'
import {
  accountFromPgRequest,
  isSuccessfulConfirmTrxStatus,
  paymentMethodNameFromPgRequest,
  pgRequestInfoString,
  pgTransactionIdFromConfirmData,
} from './util/confirmGateway'
import { isAllowedMerchantNavigationUrl } from './util/navigationUrl'
import { parseUrlParams } from './urlParams'
import { renderErrorView } from './ui/errorView'
import {
  renderCheckout,
  renderCompleted,
  renderLoading,
  renderPaymentSuccess,
} from './ui/render'

type Phase =
  | 'loading'
  | 'error'
  | 'checkout'
  | 'completed'
  | 'paymentSuccess'

interface AppModel {
  phase: Phase
  errorMessage?: string
  data?: PreInitializeData
  checkoutStep: 1 | 2
  selectedMethodId: number | null
  showExtraFields: boolean
  requireOtp: boolean
  mobile: string
  extraFieldValues: Record<string, string>
  activeTrxToken: string
  initiateInProgress: boolean
  confirmInProgress: boolean
  checkoutStepError?: string
  showInitiateAccountCard: boolean
  initiateAccountDisplay: string
  /** From initiate `gatewayInfo` when present; fallback to trxToken at confirm time */
  lastPgTransactionToken?: string
  paymentSuccessSnapshot?: PaymentSuccessSnapshot
  /** Seconds left for OTP resend (null = inactive). 0 = show resend link. */
  otpCountdownRemaining: number | null
}

const OTP_RESEND_WINDOW_SEC = 120

function getRoot(): HTMLElement {
  const el = document.getElementById('app')
  if (!el) throw new Error('#app not found')
  return el
}

function otpRequiredFromInitiate(data: InitiatePaymentData): boolean {
  const ex = data.extraFields
  if (!ex || typeof ex !== 'object') return false
  const v = (ex as Record<string, unknown>).OTP
  return v === true || v === 'true' || v === '1'
}

function pgTransactionTokenFromInitiate(data: InitiatePaymentData): string {
  const g = data.gatewayInfo
  if (g && typeof g === 'object') {
    const r = g as Record<string, unknown>
    const id = r.pgTransactionId ?? r.pgTransactionToken
    const s = id == null ? '' : String(id).trim()
    if (s) return s
  }
  return (data.trxToken ?? '').trim()
}

function formatLocaleDateTime(lang: AppLang, d: Date): string {
  const localeTag = lang === 'ar' ? 'ar' : 'en-US'
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(d)
}

/** Prefer server order time, then pre-initialize order date, else client "now". */
function transactionDisplayInstant(
  confirm: ConfirmPaymentData,
  pre: PreInitializeData,
): Date {
  const ord = confirm.order
  const creation =
    ord && typeof ord === 'object'
      ? (ord as ConfirmOrderSummary).creationDate
      : undefined
  const rawOrder = typeof creation === 'string' ? creation.trim() : ''
  const rawPre =
    typeof pre.orderDate === 'string' ? pre.orderDate.trim() : ''
  for (const raw of [rawOrder, rawPre]) {
    if (!raw) continue
    const ms = Date.parse(raw)
    if (!Number.isNaN(ms)) return new Date(ms)
  }
  return new Date()
}

function mergeConfirmIntoPreData(
  base: PreInitializeData,
  d: ConfirmPaymentData,
): PreInitializeData {
  const next: PreInitializeData = { ...base }
  if (typeof d.trxStatus === 'string' && d.trxStatus) next.trxStatus = d.trxStatus
  if (typeof d.trxToken === 'string' && d.trxToken.trim()) {
    next.trxToken = d.trxToken.trim()
  }
  if (typeof d.trxId === 'string' && d.trxId) next.trxId = d.trxId
  const red = typeof d.redirecturl === 'string' ? d.redirecturl.trim() : ''
  if (red) next.redirecturl = red
  if (d.order && typeof d.order === 'object') {
    const ord = d.order as ConfirmOrderSummary
    if (typeof ord.orderId === 'string' && ord.orderId.trim()) {
      if (next.id == null || !Number.isFinite(next.id)) {
        next.orderId = ord.orderId.trim()
      }
    }
  }
  return next
}

export function startApp(): void {
  const url = parseUrlParams()
  const lang = resolveAppLang(url.language)
  applyDocumentLanguage(lang)
  const translator = createTranslator(lang)

  const model: AppModel = {
    phase: 'loading',
    checkoutStep: 1,
    selectedMethodId: null,
    showExtraFields: false,
    requireOtp: false,
    mobile: url.userIdentifier.trim(),
    extraFieldValues: {},
    activeTrxToken: url.trxToken.trim(),
    initiateInProgress: false,
    confirmInProgress: false,
    showInitiateAccountCard: false,
    initiateAccountDisplay: '',
    otpCountdownRemaining: null,
  }

  const root = getRoot()

  let otpTickId: ReturnType<typeof setInterval> | null = null

  function stopOtpCountdownTimer(): void {
    if (otpTickId != null) {
      window.clearInterval(otpTickId)
      otpTickId = null
    }
  }

  function resetOtpCountdownState(): void {
    stopOtpCountdownTimer()
    model.otpCountdownRemaining = null
  }

  function formatOtpCountdownLabel(totalSecs: number): string {
    const m = Math.floor(totalSecs / 60)
    const s = totalSecs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  /** Update countdown text without re-rendering checkout (keeps input focus). */
  function patchOtpCountdownDom(totalSecs: number): void {
    const el = document.getElementById('otp-countdown-display')
    if (el) el.textContent = formatOtpCountdownLabel(totalSecs)
  }

  function startOtpCountdownTimer(): void {
    stopOtpCountdownTimer()
    model.otpCountdownRemaining = OTP_RESEND_WINDOW_SEC
    otpTickId = window.setInterval(() => {
      if (model.phase !== 'checkout' || model.otpCountdownRemaining == null) {
        stopOtpCountdownTimer()
        return
      }
      if (model.otpCountdownRemaining <= 0) {
        stopOtpCountdownTimer()
        return
      }
      model.otpCountdownRemaining -= 1
      if (model.otpCountdownRemaining > 0) {
        patchOtpCountdownDom(model.otpCountdownRemaining)
      } else {
        renderCheckoutView()
        stopOtpCountdownTimer()
      }
    }, 1000)
  }

  function goBack(): void {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    window.close()
  }

  async function handleSendCode(): Promise<void> {
    if (!model.data || model.selectedMethodId === null) return
    const phone = model.mobile.trim()
    model.checkoutStepError = undefined
    if (!phone) {
      model.checkoutStepError = translator.t('mobileRequired')
      renderCheckoutView()
      return
    }

    model.initiateInProgress = true
    renderCheckoutView()

    const extraFields: Record<string, string> = {
      ...model.extraFieldValues,
      account: phone,
    }

    const result = await initiatePayment({
      customerPaymentMethodId: model.selectedMethodId,
      trxToken: model.activeTrxToken,
      account: phone,
      phoneNumber: phone,
      fullName: url.fullName.trim(),
      extraFields,
    })

    model.initiateInProgress = false

    if (!result.ok) {
      if (result.kind === 'network') {
        model.checkoutStepError =
          result.detail ?? translator.t('networkError')
      } else {
        model.checkoutStepError =
          result.messages?.join('\n') ??
          translator.t('initiatePaymentFailed')
      }
      renderCheckoutView()
      return
    }

    const nextToken = (result.data.trxToken ?? '').trim()
    if (nextToken) {
      model.activeTrxToken = nextToken
      if (model.data) {
        model.data = { ...model.data, trxToken: nextToken }
      }
    }

    model.requireOtp = otpRequiredFromInitiate(result.data)
    model.showInitiateAccountCard = true
    model.initiateAccountDisplay = phone
    model.showExtraFields = model.requireOtp
    model.lastPgTransactionToken = pgTransactionTokenFromInitiate(result.data)
    delete model.extraFieldValues.OTP
    if (model.requireOtp) {
      startOtpCountdownTimer()
    } else {
      resetOtpCountdownState()
    }
    renderCheckoutView()
  }

  async function handleConfirmPayment(): Promise<void> {
    if (!model.data || model.selectedMethodId === null) return
    if (!model.showInitiateAccountCard) return

    const account = model.initiateAccountDisplay.trim()
    model.checkoutStepError = undefined

    if (model.requireOtp) {
      const otp = (model.extraFieldValues.OTP ?? '').trim()
      if (!otp) {
        model.checkoutStepError = translator.t('otpRequiredForConfirm')
        renderCheckoutView()
        return
      }
    }

    const appId = (model.data.appId ?? model.data.miniAppInfo.appId).trim()
    if (!appId) {
      model.checkoutStepError = translator.t('missingAppId')
      renderCheckoutView()
      return
    }

    const pgTok = (
      model.lastPgTransactionToken?.trim() || model.activeTrxToken
    ).trim()

    model.confirmInProgress = true
    renderCheckoutView()

    const extraFields: Record<string, string> = {
      ...model.extraFieldValues,
      account,
    }

    const result = await confirmPayment({
      customerPaymentMethodId: model.selectedMethodId,
      appId,
      trxToken: model.activeTrxToken,
      account,
      pgTransactionToken: pgTok,
      extraFields,
    })

    model.confirmInProgress = false

    if (!result.ok) {
      if (result.kind === 'network') {
        model.checkoutStepError =
          result.detail ?? translator.t('networkError')
      } else {
        model.checkoutStepError =
          result.messages?.join('\n') ??
          translator.t('confirmPaymentFailed')
      }
      renderCheckoutView()
      return
    }

    model.data = mergeConfirmIntoPreData(model.data, result.data)
    const nextTok = (result.data.trxToken ?? '').trim()
    if (nextTok) {
      model.activeTrxToken = nextTok
      model.data = { ...model.data, trxToken: nextTok }
    }

    if (isSuccessfulConfirmTrxStatus(result.data.trxStatus)) {
      const methods = model.data.availablePaymentMethods.filter(
        (m) => m.isEnabled !== false,
      )
      const selected =
        methods.find((m) => m.id === model.selectedMethodId) ??
        methods[0] ??
        null
      const pgJson = pgRequestInfoString(result.data)
      const apiMethodName = paymentMethodNameFromPgRequest(
        pgJson,
        translator.lang,
      )
      const apiAccount = accountFromPgRequest(pgJson)
      let pgId = pgTransactionIdFromConfirmData(result.data)
      if (!pgId && typeof result.data.trxId === 'string') {
        pgId = result.data.trxId.trim()
      }
      const selectedName = selected?.name?.trim()
      const selectedTypeName = selected?.paymentMethodTypeName?.trim()
      model.paymentSuccessSnapshot = {
        pgTransactionId: pgId,
        transactionDateTime: formatLocaleDateTime(
          translator.lang,
          transactionDisplayInstant(result.data, model.data),
        ),
        paymentMethodName:
          selectedName ||
          apiMethodName?.trim() ||
          selectedTypeName ||
          '—',
        paymentMethodImage: (selected?.image ?? '').trim() || undefined,
        accountPhone: (apiAccount?.trim() || account).trim(),
      }
      resetOtpCountdownState()
      model.phase = 'paymentSuccess'
      sync()
      return
    }

    const nextRedirect = result.data.redirecturl?.trim()
    if (nextRedirect && isAllowedMerchantNavigationUrl(nextRedirect)) {
      window.location.assign(nextRedirect)
      return
    }

    sync()
  }

  function renderCheckoutView(): void {
    if (!model.data || model.phase !== 'checkout') return
    const methods = model.data.availablePaymentMethods.filter(
      (m) => m.isEnabled !== false,
    )
    if (
      model.selectedMethodId === null &&
      methods.length > 0
    ) {
      model.selectedMethodId = methods[0]!.id
    }

    renderCheckout(root, {
      data: model.data,
      step: model.checkoutStep,
      selectedMethodId: model.selectedMethodId ?? methods[0]!.id,
      showExtraFields: model.showExtraFields,
      requireOtp: model.requireOtp,
      mobile: model.mobile,
      extraFieldValues: model.extraFieldValues,
      checkoutStepError: model.checkoutStepError,
      initiateInProgress: model.initiateInProgress,
      confirmInProgress: model.confirmInProgress,
      showInitiateAccountCard: model.showInitiateAccountCard,
      initiateAccountDisplay: model.initiateAccountDisplay,
      urlFullName: url.fullName.trim(),
      otpCountdownRemaining: model.otpCountdownRemaining,
      translator,
      handlers: {
        onSelectMethod(id) {
          model.selectedMethodId = id
          renderCheckoutView()
        },
        onContinue() {
          model.checkoutStep = 2
          renderCheckoutView()
        },
        onChangeMethod() {
          resetOtpCountdownState()
          model.checkoutStep = 1
          model.showExtraFields = false
          model.requireOtp = false
          model.extraFieldValues = {}
          model.checkoutStepError = undefined
          model.lastPgTransactionToken = undefined
          model.confirmInProgress = false
          model.showInitiateAccountCard = false
          model.initiateAccountDisplay = ''
          renderCheckoutView()
        },
        onMobileInput(value) {
          model.mobile = value
        },
        onSendCode() {
          void handleSendCode()
        },
        onExtraChange(key, value) {
          model.extraFieldValues[key] = value
        },
        onEditInitiateAccount() {
          resetOtpCountdownState()
          model.showInitiateAccountCard = false
          model.showExtraFields = false
          model.requireOtp = false
          model.extraFieldValues = {}
          model.checkoutStepError = undefined
          model.lastPgTransactionToken = undefined
          model.confirmInProgress = false
          renderCheckoutView()
        },
        onConfirmPayment() {
          void handleConfirmPayment()
        },
      },
    })
  }

  function renderPaymentSuccessView(): void {
    if (!model.data || !model.paymentSuccessSnapshot) return
    renderPaymentSuccess(root, {
      data: model.data,
      urlFullName: url.fullName.trim(),
      snapshot: model.paymentSuccessSnapshot,
      translator,
      onPrint() {
        window.print()
      },
      onDone() {
        const next = model.data?.redirecturl?.trim()
        if (next && isAllowedMerchantNavigationUrl(next)) {
          window.location.assign(next)
          return
        }
        goBack()
      },
    })
  }

  function renderCompletedView(): void {
    if (!model.data) return
    renderCompleted(
      root,
      model.data,
      translator,
      () => {
        const next = model.data?.redirecturl?.trim()
        if (next && isAllowedMerchantNavigationUrl(next)) {
          window.location.assign(next)
        }
      },
    )
  }

  function sync(): void {
    if (model.phase === 'loading') {
      renderLoading(root, translator)
      return
    }
    if (model.phase === 'error') {
      const msg =
        model.errorMessage ?? translator.t('invoiceUnavailable')
      renderErrorView(root, translator, msg, goBack)
      return
    }
    if (model.phase === 'paymentSuccess') {
      renderPaymentSuccessView()
      return
    }
    if (model.phase === 'completed') {
      renderCompletedView()
      return
    }
    renderCheckoutView()
  }

  async function run(): Promise<void> {
    model.phase = 'loading'
    sync()

    if (!url.trxToken.trim()) {
      model.phase = 'error'
      model.errorMessage = translator.t('missingTrxToken')
      sync()
      return
    }

    if (!isPreInitializeConfigValid()) {
      model.phase = 'error'
      model.errorMessage = translator.t('missingConfig')
      sync()
      return
    }

    const result = await preInitializePayment(url.trxToken.trim())
    if (!result.ok) {
      model.phase = 'error'
      if (result.kind === 'network') {
        model.errorMessage = translator.t('networkError')
      } else {
        model.errorMessage = translator.t('invoiceUnavailable')
      }
      sync()
      return
    }

    model.data = result.data
    const nextTok = (result.data.trxToken ?? '').trim()
    if (nextTok) model.activeTrxToken = nextTok
    else model.activeTrxToken = url.trxToken.trim()

    const status = result.data.trxStatus?.toLowerCase() ?? ''
    if (status === 'completed') {
      model.phase = 'completed'
      sync()
      return
    }

    model.phase = 'checkout'
    model.checkoutStep = 1
    model.showExtraFields = false
    model.requireOtp = false
    model.selectedMethodId = null
    model.extraFieldValues = {}
    model.checkoutStepError = undefined
    model.lastPgTransactionToken = undefined
    model.confirmInProgress = false
    model.showInitiateAccountCard = false
    model.initiateAccountDisplay = ''
    model.paymentSuccessSnapshot = undefined
    resetOtpCountdownState()
    sync()
  }

  void run()
}
