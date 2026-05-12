import type { AppLang, Translator } from '../i18n'
import type { PaymentSuccessSnapshot, PreInitializeData } from '../types/payment'
import { publicAssetUrl } from '../util/publicAsset'

function displayOrderReference(data: PreInitializeData): string {
  if (data.id != null && Number.isFinite(data.id)) return String(data.id)
  const oid = typeof data.orderId === 'string' ? data.orderId.trim() : ''
  if (oid) return oid
  return '—'
}

function formatMoney(value: number, currency: string, lang: AppLang): string {
  try {
    const intlLocale = lang === 'ar' ? 'ar' : 'en'
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

function formatCommission(item: unknown): string {
  if (item === null || item === undefined) return ''
  if (typeof item === 'string' || typeof item === 'number') return String(item)
  try {
    return JSON.stringify(item)
  } catch {
    return String(item)
  }
}

function printTableRow(label: string, value: string): HTMLTableRowElement {
  const tr = document.createElement('tr')
  const th = document.createElement('th')
  th.className = 'receipt-print-line-label'
  th.scope = 'row'
  th.textContent = label
  const td = document.createElement('td')
  td.className = 'receipt-print-line-value'
  td.textContent = value
  tr.appendChild(th)
  tr.appendChild(td)
  return tr
}

/**
 * Printable invoice block (hidden on screen, visible when printing).
 */
export function createPaymentPrintReceiptEl(
  data: PreInitializeData,
  urlFullName: string,
  snapshot: PaymentSuccessSnapshot,
  translator: Translator,
): HTMLElement {
  const { t, lang } = translator
  const wrap = document.createElement('div')
  wrap.className = 'receipt-print-invoice'
  wrap.setAttribute('aria-hidden', 'true')

  const issued = new Date()
  const localeTag = lang === 'ar' ? 'ar' : 'en-US'
  const issuedStr = new Intl.DateTimeFormat(localeTag, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(issued)

  const header = document.createElement('header')
  header.className = 'receipt-print-header'

  const brand = document.createElement('div')
  brand.className = 'receipt-print-brand'
  const basLogo = document.createElement('img')
  basLogo.className = 'receipt-print-bas-logo'
  basLogo.src = publicAssetUrl('logo.png')
  basLogo.alt = t('platformAlt')
  basLogo.addEventListener('error', () => {
    basLogo.remove()
    const fb = document.createElement('div')
    fb.className = 'receipt-print-bas-fallback'
    fb.textContent = 'Bas'
    brand.appendChild(fb)
  })
  brand.appendChild(basLogo)
  const brandText = document.createElement('div')
  brandText.className = 'receipt-print-brand-text'
  const brandName = document.createElement('div')
  brandName.className = 'receipt-print-brand-name'
  brandName.textContent = t('receiptPrintPlatformName')
  const brandSub = document.createElement('div')
  brandSub.className = 'receipt-print-brand-sub'
  brandSub.textContent = t('receiptPrintPlatformTagline')
  brandText.appendChild(brandName)
  brandText.appendChild(brandSub)
  brand.appendChild(brandText)

  const docTitle = document.createElement('div')
  docTitle.className = 'receipt-print-doc-meta'
  const h1 = document.createElement('h1')
  h1.className = 'receipt-print-title'
  h1.textContent = t('receiptPrintTitle')
  const issuedP = document.createElement('p')
  issuedP.className = 'receipt-print-issued'
  const lab = document.createElement('span')
  lab.className = 'receipt-print-issued-label'
  lab.textContent = t('receiptPrintIssuedAt')
  const strong = document.createElement('strong')
  strong.className = 'receipt-print-issued-value'
  strong.textContent = issuedStr
  issuedP.appendChild(lab)
  issuedP.appendChild(document.createTextNode(' '))
  issuedP.appendChild(strong)
  docTitle.appendChild(h1)
  docTitle.appendChild(issuedP)

  header.appendChild(brand)
  header.appendChild(docTitle)
  wrap.appendChild(header)

  const merchantSec = document.createElement('section')
  merchantSec.className = 'receipt-print-merchant'
  const mh2 = document.createElement('h2')
  mh2.className = 'receipt-print-section-title'
  mh2.textContent = t('receiptPrintMerchant')
  merchantSec.appendChild(mh2)

  const merchantCard = document.createElement('div')
  merchantCard.className = 'receipt-print-merchant-card'
  const mImgUrl = (data.miniAppInfo.image ?? '').trim()
  if (mImgUrl) {
    const mImg = document.createElement('img')
    mImg.className = 'receipt-print-merchant-logo'
    mImg.src = mImgUrl
    mImg.alt = data.miniAppInfo.name
    mImg.addEventListener('error', () => mImg.remove())
    merchantCard.appendChild(mImg)
  }
  const mBody = document.createElement('div')
  mBody.className = 'receipt-print-merchant-body'
  const mNameEl = document.createElement('div')
  mNameEl.className = 'receipt-print-merchant-name'
  mNameEl.textContent = data.miniAppInfo.name
  mBody.appendChild(mNameEl)
  const mDescText = (data.miniAppInfo.description ?? '').trim()
  if (mDescText) {
    const mDesc = document.createElement('div')
    mDesc.className = 'receipt-print-merchant-desc'
    mDesc.textContent = mDescText
    mBody.appendChild(mDesc)
  }
  merchantCard.appendChild(mBody)
  merchantSec.appendChild(merchantCard)
  wrap.appendChild(merchantSec)

  const table = document.createElement('table')
  table.className = 'receipt-print-table'
  const caption = document.createElement('caption')
  caption.className = 'receipt-print-caption'
  caption.textContent = t('receiptPrintDetailsCaption')
  table.appendChild(caption)
  const tbody = document.createElement('tbody')

  const idToCopy = snapshot.pgTransactionId.trim()
  tbody.appendChild(printTableRow(t('transactionId'), idToCopy || '—'))
  tbody.appendChild(
    printTableRow(t('transactionDateTime'), snapshot.transactionDateTime),
  )
  tbody.appendChild(printTableRow(t('orderId'), displayOrderReference(data)))
  const payer = urlFullName.trim()
  if (payer) {
    tbody.appendChild(printTableRow(t('customerName'), payer))
  }
  if (data.description) {
    tbody.appendChild(printTableRow(t('description'), data.description))
  }
  if (data.commissions && data.commissions.length > 0) {
    data.commissions.forEach((c, i) => {
      tbody.appendChild(
        printTableRow(`${t('commissionItem')} ${i + 1}`, formatCommission(c)),
      )
    })
  }
  tbody.appendChild(
    printTableRow(t('paymentMethodRow'), snapshot.paymentMethodName),
  )
  tbody.appendChild(
    printTableRow(t('accountNumberLabel'), snapshot.accountPhone),
  )

  const totalTr = document.createElement('tr')
  totalTr.className = 'receipt-print-total-row'
  const th = document.createElement('th')
  th.scope = 'row'
  th.textContent = t('total')
  const td = document.createElement('td')
  td.className = 'receipt-print-total-value'
  td.textContent = formatMoney(
    data.amount.value,
    data.amount.currency,
    lang,
  )
  totalTr.appendChild(th)
  totalTr.appendChild(td)
  tbody.appendChild(totalTr)

  table.appendChild(tbody)
  wrap.appendChild(table)

  const footer = document.createElement('footer')
  footer.className = 'receipt-print-footer'
  footer.textContent = t('receiptPrintFooter')
  wrap.appendChild(footer)

  return wrap
}
