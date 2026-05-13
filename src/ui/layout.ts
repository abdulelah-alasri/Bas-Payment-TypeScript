import { destroyLoadingAnimation } from './loadingAnimation'
import { renderSiteFooter, type SiteFooterOptions } from './footer'

/**
 * Standard page: scrollable main + sticky-style footer at bottom.
 */
export function renderAppPage(
  root: HTMLElement,
  footerOptions: SiteFooterOptions,
  renderMain: (main: HTMLElement) => void,
  mainModifier?: 'center',
): void {
  destroyLoadingAnimation()
  root.replaceChildren()
  const layout = document.createElement('div')
  layout.className = 'app-layout'
  layout.dir = footerOptions.translator.lang === 'ar' ? 'rtl' : 'ltr'
  const main = document.createElement('div')
  main.className = 'app-main'
  if (mainModifier === 'center') {
    main.classList.add('app-main--center')
  }
  const footer = document.createElement('footer')
  footer.className = 'site-footer'
  if (import.meta.env.VITE_MODE?.trim() === 'test') {
    const ribbonHost = document.createElement('div')
    ribbonHost.className = 'env-test-ribbon-host'
    const banner = document.createElement('aside')
    banner.className = 'env-test-ribbon'
    banner.setAttribute('role', 'status')
    banner.textContent = footerOptions.translator.t('testEnvBanner')
    ribbonHost.appendChild(banner)
    layout.appendChild(ribbonHost)
  }
  layout.appendChild(main)
  layout.appendChild(footer)
  root.appendChild(layout)
  renderMain(main)
  renderSiteFooter(footer, footerOptions)
}
