import type { Translator } from '../../i18n'
import type { PaymentSuccessSnapshot, PreInitializeData } from '../../types/payment'
import { firePaymentSuccessConfetti } from '../paymentSuccessConfetti'
import { createPaymentPrintReceiptEl } from '../paymentPrintReceipt'
import { renderAppPage } from '../layout'
import { detailRow } from './detailRow'
import {
  displayOrderReference,
  formatAmount,
  formatCommissionLine,
} from './formattingAndOrder'

function paymentSuccessCopyIconSvg(): string {
  return `<svg class="btn-copy-pg-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
}

function paymentSuccessCheckIconSvg(): string {
  return `<svg class="btn-copy-pg-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`
}

function paymentSuccessCopyFailIconSvg(): string {
  return `<svg class="btn-copy-pg-svg" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
}

/** Absolute image URL for method icons when API returns a root-relative path */
function resolvePaymentMethodImageUrl(raw: string): string {
  const u = raw.trim()
  if (!u) return ''
  if (/^https?:\/\//i.test(u) || u.startsWith('data:')) return u
  const base = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '')
  if (base && u.startsWith('/')) return `${base}${u}`
  return u
}

function methodInitialEl(name: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'method-icon-placeholder'
  el.textContent = (name.trim()[0] ?? '?').toUpperCase()
  return el
}

export function renderPaymentSuccess(
  root: HTMLElement,
  input: {
    data: PreInitializeData
    urlFullName: string
    snapshot: PaymentSuccessSnapshot
    translator: Translator
    onPrint: () => void
    onDone: () => void
  },
): void {
  const { data, urlFullName, snapshot, translator, onPrint, onDone } = input
  const { t, lang } = translator

  renderAppPage(
    root,
    {
      translator,
      phase: 'paymentSuccess',
      merchantName: data.miniAppInfo.name,
      cancelHref: data.cancelUrl,
    },
    (main) => {
      const shell = document.createElement('div')
      shell.className = 'shell payment-success-screen'

      const hero = document.createElement('div')
      hero.className = 'payment-success-hero print-hidden'
      hero.setAttribute('role', 'status')

      const iconWrap = document.createElement('div')
      iconWrap.className = 'payment-success-icon-wrap'
      iconWrap.innerHTML = `<svg class="payment-success-check" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#22c55e"/>
        <path d="M18 33l10 10 18-22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
      hero.appendChild(iconWrap)

      const title = document.createElement('p')
      title.className = 'payment-success-title'
      title.textContent = t('paymentSuccessful')
      hero.appendChild(title)

      shell.appendChild(hero)

      const receipt = document.createElement('section')
      receipt.className =
        'details-card payment-success-receipt print-hidden'

      const idToCopy = snapshot.pgTransactionId.trim()
      const pgRow = document.createElement('div')
      pgRow.className = 'detail-row detail-row--pg-id'
      const pgLabel = document.createElement('span')
      pgLabel.className = 'detail-label'
      pgLabel.textContent = t('transactionId')
      const pgValWrap = document.createElement('div')
      pgValWrap.className = 'detail-pg-value'
      const pgText = document.createElement('span')
      pgText.className = 'detail-value-mono'
      pgText.textContent = idToCopy || '—'
      pgValWrap.appendChild(pgText)
      if (idToCopy) {
        const copyBtn = document.createElement('button')
        copyBtn.type = 'button'
        copyBtn.className = 'btn-copy-pg'
        copyBtn.setAttribute('aria-label', t('copyTransactionId'))
        copyBtn.title = t('copyTransactionId')
        copyBtn.innerHTML = paymentSuccessCopyIconSvg()
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(idToCopy)
            copyBtn.innerHTML = paymentSuccessCheckIconSvg()
            copyBtn.classList.add('btn-copy-pg--success')
            window.setTimeout(() => {
              copyBtn.innerHTML = paymentSuccessCopyIconSvg()
              copyBtn.classList.remove('btn-copy-pg--success')
            }, 1600)
          } catch {
            copyBtn.innerHTML = paymentSuccessCopyFailIconSvg()
            copyBtn.classList.add('btn-copy-pg--error')
            window.setTimeout(() => {
              copyBtn.innerHTML = paymentSuccessCopyIconSvg()
              copyBtn.classList.remove('btn-copy-pg--error')
            }, 1600)
          }
        })
        pgValWrap.appendChild(copyBtn)
      }
      pgRow.appendChild(pgLabel)
      pgRow.appendChild(pgValWrap)
      receipt.appendChild(pgRow)

      receipt.appendChild(
        detailRow(t('transactionDateTime'), snapshot.transactionDateTime),
      )

      receipt.appendChild(detailRow(t('orderId'), displayOrderReference(data)))
      const payer = urlFullName.trim()
      if (payer) {
        receipt.appendChild(detailRow(t('customerName'), payer))
      }
      if (data.description) {
        receipt.appendChild(detailRow(t('description'), data.description))
      }
      if (data.commissions && data.commissions.length > 0) {
        const commTitle = document.createElement('div')
        commTitle.className = 'details-subtitle'
        commTitle.textContent = t('commissions')
        receipt.appendChild(commTitle)
        data.commissions.forEach((c, i) => {
          receipt.appendChild(
            detailRow(
              `${t('commissionItem')} ${i + 1}`,
              formatCommissionLine(c),
            ),
          )
        })
      }

      const methodRow = document.createElement('div')
      methodRow.className = 'detail-row detail-row--method'
      const mLabel = document.createElement('span')
      mLabel.className = 'detail-label'
      mLabel.textContent = t('paymentMethodRow')
      const mVal = document.createElement('div')
      mVal.className = 'detail-method-value'
      const iconBox = document.createElement('div')
      iconBox.className = 'method-icon-wrap'
      const imgUrl = (snapshot.paymentMethodImage ?? '').trim()
      const resolvedImg = resolvePaymentMethodImageUrl(imgUrl)
      if (resolvedImg) {
        const img = document.createElement('img')
        img.className = 'method-icon'
        img.src = resolvedImg
        img.alt = t('methodImageAlt')
        img.loading = 'lazy'
        img.addEventListener('error', () => {
          img.replaceWith(methodInitialEl(snapshot.paymentMethodName))
        })
        iconBox.appendChild(img)
      } else {
        iconBox.appendChild(methodInitialEl(snapshot.paymentMethodName))
      }
      const mName = document.createElement('span')
      mName.className = 'payment-success-method-name'
      mName.textContent = snapshot.paymentMethodName
      mVal.appendChild(iconBox)
      mVal.appendChild(mName)
      methodRow.appendChild(mLabel)
      methodRow.appendChild(mVal)
      receipt.appendChild(methodRow)

      receipt.appendChild(detailRow(t('accountNumberLabel'), snapshot.accountPhone))

      receipt.appendChild(
        detailRow(
          t('total'),
          formatAmount(data.amount.value, data.amount.currency, lang),
          { boldValue: true },
        ),
      )

      shell.appendChild(receipt)

      const actions = document.createElement('div')
      actions.className = 'payment-success-actions print-hidden'
      const printBtn = document.createElement('button')
      printBtn.type = 'button'
      printBtn.className = 'btn btn-secondary btn-block'
      printBtn.textContent = t('printReceipt')
      printBtn.addEventListener('click', onPrint)
      const doneBtn = document.createElement('button')
      doneBtn.type = 'button'
      doneBtn.className = 'btn btn-primary btn-block'
      doneBtn.textContent = t('done')
      doneBtn.addEventListener('click', onDone)
      actions.appendChild(printBtn)
      actions.appendChild(doneBtn)
      shell.appendChild(actions)

      shell.appendChild(
        createPaymentPrintReceiptEl(data, urlFullName, snapshot, translator),
      )

      main.appendChild(shell)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          firePaymentSuccessConfetti()
        })
      })
    },
  )
}
