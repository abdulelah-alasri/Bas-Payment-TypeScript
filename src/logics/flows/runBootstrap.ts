import {
  isPreInitializeConfigValid,
  preInitializePayment,
} from '../../api/preInitialize'
import type { Translator } from '../../i18n'
import type { UrlParams } from '../../urlParams'
import type { AppModel } from '../appModel'

/** Inputs for the initial pre-initialize bootstrap that sets `model.phase`. */
export interface RunBootstrapDeps {
  model: AppModel
  url: UrlParams
  translator: Translator
  /** Renders loading/error/checkout/etc. from current `model.phase`. */
  syncUi: () => void
  otpCountdown: { reset: () => void }
}

/**
 * Loads invoice via pre-initialize, maps API outcome to `model.phase`, and resets checkout fields when entering checkout.
 */
export async function runBootstrap(deps: RunBootstrapDeps): Promise<void> {
  const { model, url, translator, syncUi, otpCountdown } = deps

  model.phase = 'loading'
  syncUi()

  if (!url.trxToken.trim()) {
    model.phase = 'error'
    model.errorMessage = translator.t('missingTrxToken')
    syncUi()
    return
  }

  if (!isPreInitializeConfigValid()) {
    model.phase = 'error'
    model.errorMessage = translator.t('missingConfig')
    syncUi()
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
    syncUi()
    return
  }

  model.data = result.data
  const nextTok = (result.data.trxToken ?? '').trim()
  if (nextTok) model.activeTrxToken = nextTok
  else model.activeTrxToken = url.trxToken.trim()

  const status = result.data.trxStatus?.toLowerCase() ?? ''
  if (status === 'completed') {
    model.phase = 'completed'
    syncUi()
    return
  }

  model.phase = 'checkout'
  model.checkoutStep = 1
  model.requireOtp = false
  model.selectedMethodId = null
  model.extraFieldValues = {}
  model.checkoutStepError = undefined
  model.lastPgTransactionToken = undefined
  model.confirmInProgress = false
  model.showInitiateAccountCard = false
  model.initiateAccountDisplay = ''
  model.paymentSuccessSnapshot = undefined
  otpCountdown.reset()
  syncUi()
}
