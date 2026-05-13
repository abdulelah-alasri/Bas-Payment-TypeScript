import {
  applyDocumentLanguage,
  createTranslator,
  resolveAppLang,
} from '../i18n'
import { parseUrlParams } from '../urlParams'
import type { AppModel } from './appModel'
import { getRoot } from './dom/getRoot'
import { handleConfirmPayment } from './flows/handleConfirmPayment'
import { handleSendCode } from './flows/handleSendCode'
import { runBootstrap } from './flows/runBootstrap'
import { createOtpCountdownController } from './otp/otpCountdown'
import { createCheckoutRenderer } from './views/createCheckoutRenderer'
import { syncUiPhase } from './views/syncUiPhase'

/**
 * Bootstraps the payment SPA: parses URL, applies i18n, wires checkout/OTP flows, and runs pre-initialize.
 */
export function startApp(): void {
  const url = parseUrlParams()
  const lang = resolveAppLang(url.language)
  applyDocumentLanguage(lang)
  const translator = createTranslator(lang)

  const model: AppModel = {
    phase: 'loading',
    checkoutStep: 1,
    selectedMethodId: null,
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

  let renderCheckoutView: () => void = () => {}

  const otpCountdown = createOtpCountdownController({
    model,
    onExpiredNeedFullRerender: () => renderCheckoutView(),
  })

  function syncUi(): void {
    syncUiPhase({
      root,
      model,
      translator,
      url,
      renderCheckoutView,
    })
  }

  renderCheckoutView = createCheckoutRenderer({
    root,
    model,
    url,
    translator,
    otpCountdown: {
      start: otpCountdown.start,
      reset: otpCountdown.reset,
    },
    onSendCode: () =>
      void handleSendCode({
        model,
        url,
        translator,
        renderCheckoutView,
        otpCountdown: {
          start: otpCountdown.start,
          reset: otpCountdown.reset,
        },
      }),
    onConfirmPayment: () =>
      void handleConfirmPayment({
        model,
        translator,
        syncUi,
        renderCheckoutView,
        otpCountdown: { reset: otpCountdown.reset },
      }),
  })

  void runBootstrap({
    model,
    url,
    translator,
    syncUi,
    otpCountdown: { reset: otpCountdown.reset },
  })
}
