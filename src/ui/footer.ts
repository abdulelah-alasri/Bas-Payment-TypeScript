import type { Translator } from '../i18n'
import { isAllowedMerchantNavigationUrl } from '../util/navigationUrl'
import { publicAssetUrl } from '../util/publicAsset'

export type AppPhase =
  | 'loading'
  | 'error'
  | 'checkout'
  | 'completed'
  | 'paymentSuccess'

export interface SiteFooterOptions {
  translator: Translator
  phase: AppPhase
  merchantName?: string
  /** Merchant `cancelurl` from pre-initialize when safe to navigate. */
  cancelHref?: string | null
}

const LANG_OPTIONS: { code: 'en' | 'ar'; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
]

function basgateUrls(): {
  home: string
  privacy: string
  terms: string
  contact: string
} {
  const home =
    import.meta.env.VITE_BASGATE_HOME?.trim() || 'https://basgate.com/'
  const privacy =
    import.meta.env.VITE_BASGATE_PRIVACY_URL?.trim() || home
  const terms =
    import.meta.env.VITE_BASGATE_TERMS_URL?.trim() || home
  const contact =
    import.meta.env.VITE_BASGATE_CONTACT_URL?.trim() ||
    'https://basgate.com/contactus/'
  return { home, privacy, terms, contact }
}

function applyLanguageParam(code: string): void {
  const q = new URLSearchParams(window.location.search)
  q.set('language', code)
  const next = `${window.location.pathname}?${q.toString()}${window.location.hash}`
  window.location.assign(next)
}

function historyBackOrClose(): void {
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  window.close()
}

type CancelRowModel =
  | { mode: 'historyBack'; text: string }
  | { mode: 'link'; href: string; text: string }

function cancelRowModel(opts: SiteFooterOptions): CancelRowModel {
  const merchant = opts.merchantName?.trim()
  const explicit = opts.cancelHref?.trim()
  const hasCancelUrl = isAllowedMerchantNavigationUrl(explicit)

  if (
    opts.phase === 'checkout' ||
    opts.phase === 'completed' ||
    opts.phase === 'paymentSuccess'
  ) {
    if (hasCancelUrl) {
      const text = merchant
        ? opts.translator.t('cancelReturnTo', { merchant })
        : opts.translator.t('cancelReturnPlatform')
      return { mode: 'link', href: explicit!, text }
    }
    if (merchant) {
      return {
        mode: 'historyBack',
        text: opts.translator.t('cancelReturnTo', { merchant }),
      }
    }
  }

  return {
    mode: 'historyBack',
    text: opts.translator.t('cancelReturnPlatform'),
  }
}

const yemenFlagSvg = `<svg class="footer-flag" width="26" height="17" viewBox="0 0 26 17" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <rect width="26" height="5.67" fill="#CE1126"/>
  <rect y="5.67" width="26" height="5.66" fill="#fff"/>
  <rect y="11.33" width="26" height="5.67" fill="#000"/>
</svg>`

const chevronSvg = `<svg class="footer-chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`

export function renderSiteFooter(
  footer: HTMLElement,
  opts: SiteFooterOptions,
): void {
  footer.replaceChildren()
  const { translator: tr } = opts
  const urls = basgateUrls()

  const cancelRow = document.createElement('div')
  cancelRow.className = 'footer-row footer-row--cancel'
  const cancelCfg = cancelRowModel(opts)

  if (cancelCfg.mode === 'historyBack') {
    const cancel = document.createElement('a')
    cancel.className = 'footer-cancel-link'
    cancel.href = '#'
    cancel.textContent = cancelCfg.text
    cancel.addEventListener('click', (e) => {
      e.preventDefault()
      historyBackOrClose()
    })
    cancelRow.appendChild(cancel)
  } else {
    const cancel = document.createElement('a')
    cancel.className = 'footer-cancel-link'
    cancel.href = cancelCfg.href
    cancel.rel = 'noopener noreferrer'
    cancel.textContent = cancelCfg.text
    cancelRow.appendChild(cancel)
  }
  footer.appendChild(cancelRow)

  const linksRow = document.createElement('div')
  linksRow.className = 'footer-row footer-row--links'

  const basLink = document.createElement('a')
  basLink.className = 'footer-bas-link'
  basLink.href = urls.home
  basLink.rel = 'noopener noreferrer'
  basLink.target = '_blank'
  basLink.setAttribute('aria-label', tr.t('basPlatformLink'))
  const basImg = document.createElement('img')
  basImg.src = publicAssetUrl('logo.png')
  basImg.alt = ''
  basImg.decoding = 'async'
  basLink.appendChild(basImg)
  linksRow.appendChild(basLink)

  linksRow.appendChild(textSep())

  linksRow.appendChild(
    inlineLink(urls.privacy, tr.t('privacyPolicy'), false),
  )
  linksRow.appendChild(textSep())
  linksRow.appendChild(inlineLink(urls.terms, tr.t('termsAndConditions'), false))
  linksRow.appendChild(textSep())
  linksRow.appendChild(
    inlineLink(urls.contact, tr.t('contactUs'), true),
  )

  linksRow.appendChild(textSep())

  const langWrap = document.createElement('div')
  langWrap.className = 'footer-lang'

  const triggerRow = document.createElement('div')
  triggerRow.className = 'footer-lang-trigger-row'

  LANG_OPTIONS.forEach((opt, i) => {
    if (i > 0) triggerRow.appendChild(textSep())
    const lab = document.createElement('button')
    lab.type = 'button'
    lab.className = 'footer-lang-label'
    if (opt.code === tr.lang) lab.classList.add('is-active')
    lab.textContent = opt.label
    lab.addEventListener('click', () => {
      if (opt.code !== tr.lang) applyLanguageParam(opt.code)
    })
    triggerRow.appendChild(lab)
  })

  triggerRow.appendChild(textSep())

  const panel = document.createElement('div')
  panel.className = 'footer-lang-panel footer-lang-panel--popup'
  panel.hidden = true
  panel.setAttribute('role', 'menu')

  LANG_OPTIONS.forEach((opt) => {
    const optBtn = document.createElement('button')
    optBtn.type = 'button'
    optBtn.className = 'footer-lang-option'
    optBtn.setAttribute('role', 'menuitem')
    if (opt.code === tr.lang) optBtn.classList.add('is-active')
    optBtn.textContent = opt.label
    optBtn.addEventListener('click', () => {
      if (opt.code !== tr.lang) applyLanguageParam(opt.code)
      closeLangPanel()
    })
    panel.appendChild(optBtn)
  })

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'footer-lang-toggle'
  toggle.setAttribute('aria-expanded', 'false')
  toggle.setAttribute('aria-haspopup', 'true')
  toggle.setAttribute('aria-label', 'Language')
  const tail = document.createElement('span')
  tail.className = 'footer-lang-tail'
  tail.innerHTML = `${yemenFlagSvg}${chevronSvg}`
  toggle.appendChild(tail)

  function closeLangPanel(): void {
    panel.hidden = true
    toggle.classList.remove('is-open')
    toggle.setAttribute('aria-expanded', 'false')
    document.removeEventListener('mousedown', onDocDown)
  }

  function openLangPanel(): void {
    document.removeEventListener('mousedown', onDocDown)
    panel.hidden = false
    toggle.classList.add('is-open')
    toggle.setAttribute('aria-expanded', 'true')
    queueMicrotask(() => {
      document.addEventListener('mousedown', onDocDown)
    })
  }

  function onDocDown(ev: MouseEvent): void {
    if (!langWrap.contains(ev.target as Node)) {
      closeLangPanel()
    }
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation()
    if (panel.hidden) openLangPanel()
    else closeLangPanel()
  })

  triggerRow.appendChild(toggle)
  langWrap.appendChild(triggerRow)
  langWrap.appendChild(panel)

  linksRow.appendChild(langWrap)
  footer.appendChild(linksRow)
}

function textSep(): HTMLSpanElement {
  const s = document.createElement('span')
  s.className = 'footer-sep'
  s.textContent = '|'
  return s
}

function inlineLink(
  href: string,
  text: string,
  accent: boolean,
): HTMLAnchorElement {
  const a = document.createElement('a')
  a.className = accent
    ? 'footer-inline-link footer-inline-link--accent'
    : 'footer-inline-link'
  a.href = href
  a.rel = 'noopener noreferrer'
  a.target = '_blank'
  a.textContent = text
  return a
}
