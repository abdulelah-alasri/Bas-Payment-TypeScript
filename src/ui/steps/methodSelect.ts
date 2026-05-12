import type { PaymentMethod } from '../../types/payment'
import type { Translator } from '../../i18n'

export function renderMethodList(
  container: HTMLElement,
  methods: PaymentMethod[],
  selectedId: number | null,
  t: Translator['t'],
  onSelect: (id: number) => void,
): void {
  container.replaceChildren()

  const title = document.createElement('h2')
  title.className = 'section-title'
  title.textContent = t('payWith')
  container.appendChild(title)

  const list = document.createElement('div')
  list.className = 'method-list'
  list.setAttribute('role', 'radiogroup')
  list.setAttribute('aria-label', t('payWith'))

  for (const m of methods) {
    const row = document.createElement('label')
    row.className = 'method-row'
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = 'paymentMethod'
    input.value = String(m.id)
    input.checked = selectedId === m.id
    input.addEventListener('change', () => onSelect(m.id))

    const body = document.createElement('div')
    body.className = 'method-row-body'

    const imgWrap = document.createElement('div')
    imgWrap.className = 'method-icon-wrap'
    if (m.image) {
      const img = document.createElement('img')
      img.className = 'method-icon'
      img.src = m.image
      img.alt = t('methodImageAlt')
      img.loading = 'lazy'
      img.decoding = 'async'
      img.addEventListener('error', () => {
        img.replaceWith(placeholderInitial(m.name))
      })
      imgWrap.appendChild(img)
    } else {
      imgWrap.appendChild(placeholderInitial(m.name))
    }

    const text = document.createElement('div')
    text.className = 'method-text'
    const name = document.createElement('div')
    name.className = 'method-name'
    name.textContent = m.name
    text.appendChild(name)

    body.appendChild(imgWrap)
    body.appendChild(text)
    row.appendChild(input)
    row.appendChild(body)
    list.appendChild(row)
  }

  container.appendChild(list)
}

function placeholderInitial(name: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'method-icon-placeholder'
  el.textContent = (name.trim()[0] ?? '?').toUpperCase()
  return el
}
