import { confirmPayment } from '../../api/confirmPayment'
import type { Translator } from '../../i18n'
import {
  accountFromPgRequest,
  isSuccessfulConfirmTrxStatus,
  paymentMethodNameFromPgRequest,
  pgRequestInfoString,
  pgTransactionIdFromConfirmData,
} from '../../util/confirmGateway'
import { isAllowedMerchantNavigationUrl } from '../../util/navigationUrl'
import type { AppModel } from '../appModel'
import { mergeConfirmIntoPreData } from '../confirm/mergeConfirmIntoPreData'
import { formatLocaleDateTime } from '../display/formatLocaleDateTime'
import { transactionDisplayInstant } from '../display/transactionDisplayInstant'

/** Inputs and callbacks for the confirm-payment flow. */
export interface HandleConfirmPaymentDeps {
  model: AppModel
  translator: Translator
  /** Full phase sync (e.g. switch to payment success). */
  syncUi: () => void
  /** Re-renders checkout on validation/API errors or in-progress UI. */
  renderCheckoutView: () => void
  otpCountdown: { reset: () => void }
}

/**
 * Validates OTP when required, calls confirm, then either shows success, redirects, or re-syncs state.
 * May assign `window.location` on allowed merchant redirects.
 */
export async function handleConfirmPayment(
  deps: HandleConfirmPaymentDeps,
): Promise<void> {
  const { model, translator, syncUi, renderCheckoutView, otpCountdown } = deps
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
    otpCountdown.reset()
    model.phase = 'paymentSuccess'
    syncUi()
    return
  }

  const nextRedirect = result.data.redirecturl?.trim()
  if (nextRedirect && isAllowedMerchantNavigationUrl(nextRedirect)) {
    window.location.assign(nextRedirect)
    return
  }

  syncUi()
}
