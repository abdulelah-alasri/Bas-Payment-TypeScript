import type { Translator } from '../../i18n'
import { isAllowedMerchantNavigationUrl } from '../../util/navigationUrl'
import { renderCompleted } from '../../ui/render'
import type { AppModel } from '../appModel'

export interface RenderCompletedViewDeps {
  root: HTMLElement
  model: AppModel
  translator: Translator
}

/**
 * Renders the read-only "already completed" state for a settled transaction.
 */
export function renderCompletedView(deps: RenderCompletedViewDeps): void {
  const { root, model, translator } = deps
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
