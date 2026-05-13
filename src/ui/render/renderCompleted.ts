import {
  formatPreInitializeTransactionDateTimeForCompleted,
  PRE_INIT_DATETIME_UNAVAILABLE,
} from '../../logics/display/transactionDisplayInstant'
import type { Translator } from '../../i18n'
import type { PaymentSuccessSnapshot, PreInitializeData } from '../../types/payment'
import { createPaymentPrintReceiptEl } from '../paymentPrintReceipt'
import { renderAppPage } from '../layout'
import { detailRow } from './detailRow'
import {
  formatAmountNumeric,
  resolvedPreInitAmount,
} from './formattingAndOrder'

export function renderCompleted(
  root: HTMLElement,
  data: PreInitializeData,
  translator: Translator,
  urlFullName: string,
): void {
  const { t, lang } = translator
  const resolvedAmount = resolvedPreInitAmount(data)
  const amountWithCurrency =
    resolvedAmount != null
      ? `${formatAmountNumeric(resolvedAmount.value, lang)}\u00A0${resolvedAmount.currency}`.trim()
      : '—'
  const dataForPrint: PreInitializeData =
    resolvedAmount != null
      ? data
      : {
          ...data,
          amount: { value: 0, currency: 'YER' },
        }
  const orderDateRaw =
    formatPreInitializeTransactionDateTimeForCompleted(data, lang)
  const orderDateDisplay =
    orderDateRaw === PRE_INIT_DATETIME_UNAVAILABLE ? '#' : orderDateRaw
  const trxIdDisplay = (data.trxId ?? '').trim() || '—'
  const snapshot: PaymentSuccessSnapshot = {
    pgTransactionId: (data.trxId ?? '').trim(),
    transactionDateTime: orderDateDisplay,
    paymentMethodName: '—',
    accountPhone: '—',
  }

  renderAppPage(
    root,
    {
      translator,
      phase: 'completed',
      merchantName: data.miniAppInfo.name,
      cancelHref: data.cancelUrl,
    },
    (main) => {
      const wrap = document.createElement('div')
      wrap.className = 'completed-screen'
      wrap.setAttribute('role', 'status')

      const iconWrap = document.createElement('div')
      iconWrap.className = 'completed-icon-wrap print-hidden'
      iconWrap.setAttribute('aria-hidden', 'true')
      iconWrap.innerHTML = `<svg class="completed-done-check" viewBox="0 0 64 64" width="64" height="64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="30" fill="#22c55e"/>
        <path d="M18 33l10 10 18-22" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
      wrap.appendChild(iconWrap)

      const headline = document.createElement('p')
      headline.className =
        'completed-message completed-success-headline print-hidden'
      headline.textContent = t('transactionAlreadyCompletedSuccess')
      wrap.appendChild(headline)

      const card = document.createElement('div')
      card.className =
        'details-card completed-screen-details print-hidden'
      card.appendChild(
        detailRow(t('total'), amountWithCurrency, {
          boldValue: true,
          valueClass: 'detail-value--numeric',
        }),
      )
      card.appendChild(
        detailRow(t('transactionId'), trxIdDisplay, {
          valueClass: 'detail-value--numeric detail-value--trx-id',
          rowClass: 'detail-row--trx-id',
        }),
      )
      card.appendChild(
        detailRow(t('transactionDateTime'), orderDateDisplay),
      )
      wrap.appendChild(card)

      const printBtn = document.createElement('button')
      printBtn.type = 'button'
      printBtn.className = 'btn btn-secondary btn-block print-hidden'
      printBtn.textContent = t('printReceipt')
      printBtn.addEventListener('click', () => {
        window.print()
      })
      wrap.appendChild(printBtn)

      wrap.appendChild(
        createPaymentPrintReceiptEl(
          dataForPrint,
          urlFullName,
          snapshot,
          translator,
        ),
      )

      main.appendChild(wrap)
    },
    'center',
  )
}
