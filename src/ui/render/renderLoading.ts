import type { Translator } from '../../i18n'
import { mountLoadingLottie } from '../loadingAnimation'
import { renderAppPage } from '../layout'

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
