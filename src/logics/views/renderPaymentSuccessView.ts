import type { Translator } from '../../i18n'
import { isAllowedMerchantNavigationUrl } from '../../util/navigationUrl'
import type { UrlParams } from '../../urlParams'
import { renderPaymentSuccess } from '../../ui/render'
import type { AppModel } from '../appModel'
import { goBack } from '../navigation/goBack'

export interface RenderPaymentSuccessViewDeps {
  root: HTMLElement
  model: AppModel
  url: UrlParams
  translator: Translator
}

/**
 * Renders the post-confirm success screen when phase is `paymentSuccess` and snapshot exists.
 */
export function renderPaymentSuccessView(
  deps: RenderPaymentSuccessViewDeps,
): void {
  const { root, model, url, translator } = deps
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
