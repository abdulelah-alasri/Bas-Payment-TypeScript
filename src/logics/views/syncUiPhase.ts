import type { Translator } from '../../i18n'
import type { UrlParams } from '../../urlParams'
import { renderErrorView } from '../../ui/errorView'
import { renderLoading } from '../../ui/render'
import type { AppModel } from '../appModel'
import { goBack } from '../navigation/goBack'
import { renderCompletedView } from './renderCompletedView'
import { renderPaymentSuccessView } from './renderPaymentSuccessView'

export interface SyncUiPhaseDeps {
  root: HTMLElement
  model: AppModel
  translator: Translator
  url: UrlParams
  /** Current checkout renderer; may be a no-op until wiring completes. */
  renderCheckoutView: () => void
}

/**
 * Single entry to paint the UI for the current `model.phase` (loading, error, checkout, terminal).
 */
export function syncUiPhase(deps: SyncUiPhaseDeps): void {
  const { root, model, translator, url, renderCheckoutView } = deps
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
    renderPaymentSuccessView({ root, model, url, translator })
    return
  }
  if (model.phase === 'completed') {
    renderCompletedView({ root, model, translator })
    return
  }
  renderCheckoutView()
}
