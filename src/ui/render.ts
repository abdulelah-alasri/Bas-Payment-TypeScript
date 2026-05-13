import { mountLoadingLottie } from './loadingAnimation'
import { firePaymentSuccessConfetti } from './paymentSuccessConfetti'
import type { AppLang, Translator } from '../i18n'
import type { PaymentSuccessSnapshot, PreInitializeData } from '../types/payment'
import { renderAppPage } from './layout'
import { renderMethodList } from './steps/methodSelect'
import { renderPhoneStep } from './steps/phoneAndExtras'
import { isAllowedMerchantNavigationUrl } from '../util/navigationUrl'
import { publicAssetUrl } from '../util/publicAsset'
import { createPaymentPrintReceiptEl } from './paymentPrintReceipt'

export function renderLoading(root: HTMLElement, translator: Translator): void {
  renderAppPage(
    root,
    { translator, phase: 'loading' },
    (main) => {
      const wrap = document.createElement('div')
      wrap.className = 'loading-screen'
      const lottieHost = document.createElement('div')
      lottieHost.className = 'lottie-loading'
      lottieHost.setAttribute('role', 'status')
      const label = document.createElement('p')
      label.className = 'loading-text'
      label.textContent = translator.t('loading')
      wrap.appendChild(lottieHost)
      wrap.appendChild(label)
      main.appendChild(wrap)
      void mountLoadingLottie(lottieHost)
    },
    'center',
  )
}

export interface CheckoutHandlers {
  onSelectMethod: (id: number) => void
  onContinue: () => void
  onChangeMethod: () => void
  onMobileInput: (value: string) => void
  onSendCode: () => void
  onExtraChange: (key: string, value: string) => void
  /** After initiate success: return to editing mobile / resend flow */
  onEditInitiateAccount: () => void
  /** POST confirm-payment after OTP / account step */
  onConfirmPayment: () => void
}

export function renderCheckout(
  root: HTMLElement,
  input: {
    data: PreInitializeData
    step: 1 | 2
    selectedMethodId: number
    requireOtp?: boolean
    mobile: string
    extraFieldValues: Record<string, string>
    checkoutStepError?: string
    initiateInProgress?: boolean
    confirmInProgress?: boolean
    showInitiateAccountCard?: boolean
    initiateAccountDisplay?: string
    /** null = off; 0 = show resend; >0 seconds left */
    otpCountdownRemaining?: number | null
    /** From URL `fullName`; shown after order ID when non-empty */
    urlFullName?: string
    translator: Translator
    handlers: CheckoutHandlers
  },
): void {
  const {
    data,
    step,
    selectedMethodId,
    requireOtp,
    mobile,
    extraFieldValues,
    checkoutStepError,
    initiateInProgress,
    confirmInProgress,
    showInitiateAccountCard,
    initiateAccountDisplay,
    otpCountdownRemaining,
    urlFullName,
    translator,
    handlers,
  } = input
  const { t, lang } = translator

  const methods = data.availablePaymentMethods.filter(
    (m) => m.isEnabled !== false,
  )
  const selected =
    methods.find((m) => m.id === selectedMethodId) ?? methods[0] ?? null

  renderAppPage(
    root,
    {
      translator,
      phase: 'checkout',
      merchantName: data.miniAppInfo.name,
      cancelHref: data.cancelurl,
    },
    (main) => {
  const shell = document.createElement('div')
  shell.className = 'shell'

  const header = document.createElement('header')
  header.className = 'checkout-header'

  const merchantImageUrl = (data.miniAppInfo.image ?? '').trim()

  const amountCol = document.createElement('div')
  amountCol.className = 'header-amount'
  amountCol.textContent = formatAmount(
    data.amount.value,
    data.amount.currency,
    lang,
  )

  const merchantCenter = document.createElement('div')
  merchantCenter.className = 'header-merchant-center'

  const basCol = document.createElement('div')
  basCol.className = 'header-bas-end'
  const basLogo = document.createElement('img')
  basLogo.className = 'platform-logo'
  basLogo.src = publicAssetUrl('logo.png')
  basLogo.alt = t('platformAlt')
  basLogo.addEventListener('error', () => {
    basLogo.remove()
    basCol.textContent = 'Bas'
    basCol.classList.add('platform-fallback')
  })
  basCol.appendChild(basLogo)

  const merchantSection = document.createElement('section')
  merchantSection.className = 'merchant-block'

  if (merchantImageUrl) {
    const mImg = document.createElement('img')
    mImg.className = 'header-merchant-logo'
    mImg.src = merchantImageUrl
    mImg.alt = data.miniAppInfo.name
    mImg.loading = 'lazy'
    mImg.addEventListener('error', () => {
      mImg.remove()
      const nameEl = document.createElement('div')
      nameEl.className = 'header-merchant-name'
      nameEl.textContent = data.miniAppInfo.name
      merchantCenter.appendChild(nameEl)
      merchantSection.replaceChildren()
      merchantSection.remove()
    })
    merchantCenter.appendChild(mImg)
    const mName = document.createElement('div')
    mName.className = 'merchant-name'
    mName.textContent = data.miniAppInfo.name
    merchantSection.appendChild(mName)
  } else {
    const nameEl = document.createElement('div')
    nameEl.className = 'header-merchant-name'
    nameEl.textContent = data.miniAppInfo.name
    merchantCenter.appendChild(nameEl)
  }

  header.appendChild(amountCol)
  header.appendChild(merchantCenter)
  header.appendChild(basCol)

  const details = document.createElement('section')
  details.className = 'details-card'
  details.appendChild(detailRow(t('orderId'), displayOrderReference(data)))
  const payerName = (urlFullName ?? '').trim()
  if (payerName) {
    details.appendChild(detailRow(t('customerName'), payerName))
  }
  if (data.description) {
    details.appendChild(detailRow(t('description'), data.description))
  }
  details.appendChild(
    detailRow(
      t('total'),
      formatAmount(data.amount.value, data.amount.currency, lang),
      { boldValue: true },
    ),
  )
  if (data.commissions && data.commissions.length > 0) {
    const commTitle = document.createElement('div')
    commTitle.className = 'details-subtitle'
    commTitle.textContent = t('commissions')
    details.appendChild(commTitle)
    data.commissions.forEach((c, i) => {
      details.appendChild(
        detailRow(
          `${t('commissionItem')} ${i + 1}`,
          formatCommissionLine(c),
        ),
      )
    })
  }

  const body = document.createElement('div')
  body.className = 'checkout-body'

  if (step === 1) {
    renderMethodList(
      body,
      methods,
      selectedMethodId,
      t,
      handlers.onSelectMethod,
    )
  } else if (selected) {
    const acc = (initiateAccountDisplay ?? '').trim()
    const showAccount = Boolean(showInitiateAccountCard && acc)
    renderPhoneStep(
      body,
      selected,
      {
        mobile,
        requireOtp,
        extraFieldValues,
        errorMessage: checkoutStepError,
        sendLoading: initiateInProgress,
        confirmLoading: confirmInProgress,
        showConfirmPayment: showAccount,
        showInitiateAccountCard,
        initiateAccountDisplay,
        otpCountdownRemaining,
      },
      t,
      handlers.onMobileInput,
      handlers.onSendCode,
      handlers.onChangeMethod,
      handlers.onExtraChange,
      handlers.onEditInitiateAccount,
      handlers.onConfirmPayment,
    )
  }

  const actions = document.createElement('div')
  actions.className = 'checkout-actions'

  if (step === 1) {
    const primary = document.createElement('button')
    primary.type = 'button'
    primary.className = 'btn btn-primary btn-block'
    primary.textContent = t('completePayment')
    primary.disabled = methods.length === 0
    primary.addEventListener('click', handlers.onContinue)
    actions.appendChild(primary)
  }

  shell.appendChild(header)
  if (merchantSection.childNodes.length > 0) {
    shell.appendChild(merchantSection)
  }
  shell.appendChild(details)
  shell.appendChild(body)
  shell.appendChild(actions)
  main.appendChild(shell)
    },
  )
}

export function renderCompleted(
  root: HTMLElement,
  data: PreInitializeData,
  translator: Translator,
  onContinue: () => void,
): void {
  renderAppPage(
    root,
    {
      translator,
      phase: 'completed',
      merchantName: data.miniAppInfo.name,
      cancelHref: data.cancelurl,
    },
    (main) => {
      const wrap = document.createElement('div')
      wrap.className = 'completed-screen'
      wrap.setAttribute('role', 'status')

      const iconWrap = document.createElement('div')
      iconWrap.className = 'completed-icon-wrap'
      iconWrap.setAttribute('aria-hidden', 'true')
      iconWrap.innerHTML = `<svg class="completed-done-check" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#22c55e"/>
        <path d="M18 33l10 10 18-22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
      wrap.appendChild(iconWrap)

      const msg = document.createElement('p')
      msg.className = 'completed-message'
      msg.textContent = translator.t('transactionCompleted')
      wrap.appendChild(msg)
      if (isAllowedMerchantNavigationUrl(data.redirecturl)) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'btn btn-primary btn-block'
        btn.textContent = translator.t('continueToMerchant')
        btn.addEventListener('click', onContinue)
        wrap.appendChild(btn)
      }
      main.appendChild(wrap)
    },
    'center',
  )
}

function paymentSuccessCopyIconSvg(): string {
  return `<svg class="btn-copy-pg-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
}

function paymentSuccessCheckIconSvg(): string {
  return `<svg class="btn-copy-pg-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`
}

function paymentSuccessCopyFailIconSvg(): string {
  return `<svg class="btn-copy-pg-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
}

/** Absolute image URL for method icons when API returns a root-relative path */
function resolvePaymentMethodImageUrl(raw: string): string {
  const u = raw.trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')
  if (base && u.startsWith('/')) return `${base}${u}`
  return u
}

export function renderPaymentSuccess(
  root: HTMLElement,
  input: {
    data: PreInitializeData
    urlFullName: string
    snapshot: PaymentSuccessSnapshot
    translator: Translator
    onPrint: () => void
    onDone: () => void
  },
): void {
  const { data, urlFullName, snapshot, translator, onPrint, onDone } = input
  const { t, lang } = translator

  renderAppPage(
    root,
    {
      translator,
      phase: 'paymentSuccess',
      merchantName: data.miniAppInfo.name,
      cancelHref: data.cancelurl,
    },
    (main) => {
      const shell = document.createElement('div')
      shell.className = 'shell payment-success-screen'

      const hero = document.createElement('div')
      hero.className = 'payment-success-hero print-hidden'
      hero.setAttribute('role', 'status')

      const iconWrap = document.createElement('div')
      iconWrap.className = 'payment-success-icon-wrap'
      iconWrap.innerHTML = `<svg class="payment-success-check" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#22c55e"/>
        <path d="M18 33l10 10 18-22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
      hero.appendChild(iconWrap)

      const title = document.createElement('p')
      title.className = 'payment-success-title'
      title.textContent = t('paymentSuccessful')
      hero.appendChild(title)

      shell.appendChild(hero)

      const receipt = document.createElement('section')
      receipt.className =
        'details-card payment-success-receipt print-hidden'

      const idToCopy = snapshot.pgTransactionId.trim()
      const pgRow = document.createElement('div')
      pgRow.className = 'detail-row detail-row--pg-id'
      const pgLabel = document.createElement('span')
      pgLabel.className = 'detail-label'
      pgLabel.textContent = t('transactionId')
      const pgValWrap = document.createElement('div')
      pgValWrap.className = 'detail-pg-value'
      const pgText = document.createElement('span')
      pgText.className = 'detail-value-mono'
      pgText.textContent = idToCopy || '—'
      pgValWrap.appendChild(pgText)
      if (idToCopy) {
        const copyBtn = document.createElement('button')
        copyBtn.type = 'button'
        copyBtn.className = 'btn-copy-pg'
        copyBtn.setAttribute('aria-label', t('copyTransactionId'))
        copyBtn.title = t('copyTransactionId')
        copyBtn.innerHTML = paymentSuccessCopyIconSvg()
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(idToCopy)
            copyBtn.innerHTML = paymentSuccessCheckIconSvg()
            copyBtn.classList.add('btn-copy-pg--success')
            window.setTimeout(() => {
              copyBtn.innerHTML = paymentSuccessCopyIconSvg()
              copyBtn.classList.remove('btn-copy-pg--success')
            }, 1600)
          } catch {
            copyBtn.innerHTML = paymentSuccessCopyFailIconSvg()
            copyBtn.classList.add('btn-copy-pg--error')
            window.setTimeout(() => {
              copyBtn.innerHTML = paymentSuccessCopyIconSvg()
              copyBtn.classList.remove('btn-copy-pg--error')
            }, 1600)
          }
        })
        pgValWrap.appendChild(copyBtn)
      }
      pgRow.appendChild(pgLabel)
      pgRow.appendChild(pgValWrap)
      receipt.appendChild(pgRow)

      receipt.appendChild(
        detailRow(t('transactionDateTime'), snapshot.transactionDateTime),
      )

      receipt.appendChild(detailRow(t('orderId'), displayOrderReference(data)))
      const payer = urlFullName.trim()
      if (payer) {
        receipt.appendChild(detailRow(t('customerName'), payer))
      }
      if (data.description) {
        receipt.appendChild(detailRow(t('description'), data.description))
      }
      if (data.commissions && data.commissions.length > 0) {
        const commTitle = document.createElement('div')
        commTitle.className = 'details-subtitle'
        commTitle.textContent = t('commissions')
        receipt.appendChild(commTitle)
        data.commissions.forEach((c, i) => {
          receipt.appendChild(
            detailRow(
              `${t('commissionItem')} ${i + 1}`,
              formatCommissionLine(c),
            ),
          )
        })
      }

      const methodRow = document.createElement('div')
      methodRow.className = 'detail-row detail-row--method'
      const mLabel = document.createElement('span')
      mLabel.className = 'detail-label'
      mLabel.textContent = t('paymentMethodRow')
      const mVal = document.createElement('div')
      mVal.className = 'detail-method-value'
      const iconBox = document.createElement('div')
      iconBox.className = 'method-icon-wrap'
      const imgUrl = (snapshot.paymentMethodImage ?? '').trim()
      const resolvedImg = resolvePaymentMethodImageUrl(imgUrl)
      if (resolvedImg) {
        const img = document.createElement('img')
        img.className = 'method-icon'
        img.src = resolvedImg
        img.alt = t('methodImageAlt')
        img.loading = 'lazy'
        img.addEventListener('error', () => {
          img.replaceWith(methodInitialEl(snapshot.paymentMethodName))
        })
        iconBox.appendChild(img)
      } else {
        iconBox.appendChild(methodInitialEl(snapshot.paymentMethodName))
      }
      const mName = document.createElement('span')
      mName.className = 'payment-success-method-name'
      mName.textContent = snapshot.paymentMethodName
      mVal.appendChild(iconBox)
      mVal.appendChild(mName)
      methodRow.appendChild(mLabel)
      methodRow.appendChild(mVal)
      receipt.appendChild(methodRow)

      receipt.appendChild(detailRow(t('accountNumberLabel'), snapshot.accountPhone))

      receipt.appendChild(
        detailRow(
          t('total'),
          formatAmount(data.amount.value, data.amount.currency, lang),
          { boldValue: true },
        ),
      )

      shell.appendChild(receipt)

      const actions = document.createElement('div')
      actions.className = 'payment-success-actions print-hidden'
      const printBtn = document.createElement('button')
      printBtn.type = 'button'
      printBtn.className = 'btn btn-secondary btn-block'
      printBtn.textContent = t('printReceipt')
      printBtn.addEventListener('click', onPrint)
      const doneBtn = document.createElement('button')
      doneBtn.type = 'button'
      doneBtn.className = 'btn btn-primary btn-block'
      doneBtn.textContent = t('done')
      doneBtn.addEventListener('click', onDone)
      actions.appendChild(printBtn)
      actions.appendChild(doneBtn)
      shell.appendChild(actions)

      shell.appendChild(
        createPaymentPrintReceiptEl(data, urlFullName, snapshot, translator),
      )

      main.appendChild(shell)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          firePaymentSuccessConfetti()
        })
      })
    },
  )
}

function methodInitialEl(name: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'method-icon-placeholder'
  el.textContent = (name.trim()[0] ?? '?').toUpperCase()
  return el
}

/** Order ID row: API `id` first; if missing, use `orderId` string. */
function displayOrderReference(data: PreInitializeData): string {
  if (data.id != null && Number.isFinite(data.id)) return String(data.id)
  const oid = typeof data.orderId === 'string' ? data.orderId.trim() : ''
  if (oid) return oid
  return '—'
}

function formatAmount(
  value: number,
  currency: string,
  lang: AppLang,
): string {
  try {
    const intlLocale = lang === 'ar' ? 'ar' : 'en'
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

function formatCommissionLine(item: unknown): string {
  if (item === null || item === undefined) return ''
  if (typeof item === 'string' || typeof item === 'number') return String(item)
  try {
    return JSON.stringify(item)
  } catch {
    return String(item)
  }
}

function detailRow(
  label: string,
  value: string,
  opts?: { boldValue?: boolean },
): HTMLElement {
  const row = document.createElement('div')
  row.className = 'detail-row'
  const l = document.createElement('span')
  l.className = 'detail-label'
  l.textContent = label
  const v = document.createElement('span')
  v.className = 'detail-value'
  if (opts?.boldValue) v.classList.add('detail-value--bold')
  v.textContent = value
  row.appendChild(l)
  row.appendChild(v)
  return row
}
