import type { Translator } from '../../i18n'
import type { UrlParams } from '../../urlParams'
import { renderCompleted } from '../../ui/render'
import type { AppModel } from '../appModel'

export interface RenderCompletedViewDeps {
  root: HTMLElement
  model: AppModel
  translator: Translator
  url: UrlParams
}

/**
 * Renders the read-only "already completed" state for a settled transaction.
 */
export function renderCompletedView(deps: RenderCompletedViewDeps): void {
  const { root, model, translator, url } = deps
  if (!model.data) return
  renderCompleted(root, model.data, translator, url.fullName.trim())
}
