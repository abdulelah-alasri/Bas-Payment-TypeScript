import { initiatePayment } from '../../api/initiatePayment'
import type { Translator } from '../../i18n'
import type { UrlParams } from '../../urlParams'
import { visibleMethodParametersForPayment } from '../../util/paymentMethodParams'
import type { AppModel } from '../appModel'
import { otpRequiredFromInitiate } from '../initiate/otpRequiredFromInitiate'
import { pgTransactionTokenFromInitiate } from '../initiate/pgTransactionTokenFromInitiate'

/** Inputs and callbacks for the initiate (send code) flow. */
export interface HandleSendCodeDeps {
  /** Mutable checkout + API state. */
  model: AppModel
  url: UrlParams
  translator: Translator
  /** Re-renders checkout after validation or API result. */
  renderCheckoutView: () => void
  /** OTP resend timer; `start` after OTP-required initiate, `reset` when leaving OTP step. */
  otpCountdown: { start: () => void; reset: () => void }
}

/**
 * Validates phone/extra fields, calls initiate, then updates model for OTP or account card.
 * Mutates `model` and calls `renderCheckoutView` on each terminal path.
 */
export async function handleSendCode(deps: HandleSendCodeDeps): Promise<void> {
  const { model, url, translator, renderCheckoutView, otpCountdown } = deps
  if (!model.data || model.selectedMethodId === null) return
  const phone = model.mobile.trim()
  model.checkoutStepError = undefined
  if (!phone) {
    model.checkoutStepError = translator.t('mobileRequired')
    renderCheckoutView()
    return
  }

  const methodsForInit = model.data.availablePaymentMethods.filter(
    (m) => m.isEnabled !== false,
  )
  const methodForInit =
    methodsForInit.find((m) => m.id === model.selectedMethodId) ?? null
  if (methodForInit) {
    for (const p of visibleMethodParametersForPayment(methodForInit)) {
      if (!(model.extraFieldValues[p.key] ?? '').trim()) {
        model.checkoutStepError = translator.t('paymentExtraFieldsRequired')
        renderCheckoutView()
        return
      }
    }
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
  model.lastPgTransactionToken = pgTransactionTokenFromInitiate(result.data)
  delete model.extraFieldValues.OTP
  if (model.requireOtp) {
    otpCountdown.start()
  } else {
    otpCountdown.reset()
  }
  renderCheckoutView()
}
