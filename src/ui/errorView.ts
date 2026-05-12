import type { Translator } from '../i18n'
import { renderAppPage } from './layout'

export function renderErrorView(
  root: HTMLElement,
  translator: Translator,
  message: string,
  onBack: () => void,
): void {
  renderAppPage(
    root,
    { translator, phase: 'error' },
    (main) => {
      const wrap = document.createElement('div')
      wrap.className = 'error-screen'

      const card = document.createElement('div')
      card.className = 'error-card'

      const icon = document.createElement('div')
      icon.className = 'error-icon'
      icon.setAttribute('aria-hidden', 'true')
      icon.innerHTML = invoiceUnavailableIconSvg

      const msg = document.createElement('p')
      msg.className = 'error-message'
      msg.textContent = message

      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'btn btn-primary btn-block error-back-btn'
      btn.textContent = translator.t('back')
      btn.addEventListener('click', onBack)

      card.appendChild(icon)
      card.appendChild(msg)
      card.appendChild(btn)
      wrap.appendChild(card)
      main.appendChild(wrap)
    },
    'center',
  )
}

/** Soft receipt-style illustration for unavailable invoice */
const invoiceUnavailableIconSvg = `
<svg viewBox="0 0 88 88" width="88" height="88" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="evg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDF2F2"/>
      <stop offset="100%" stop-color="#FAD6D5"/>
    </linearGradient>
  </defs>
  <circle cx="44" cy="44" r="42" fill="url(#evg)" stroke="#F5BCBB" stroke-width="1.5"/>
  <g transform="translate(24 22)">
    <rect x="0" y="0" width="40" height="48" rx="6" fill="#fff" stroke="#EB6867" stroke-width="2"/>
    <path d="M10 14h20M10 22h20M10 30h14" stroke="#EB6867" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
    <circle cx="32" cy="36" r="9" fill="#EB6867"/>
    <path d="M32 27v8" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="32" cy="40" r="1.75" fill="#fff"/>
  </g>
</svg>
`.trim()
