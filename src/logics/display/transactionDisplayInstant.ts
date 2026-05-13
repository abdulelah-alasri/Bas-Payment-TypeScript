import type {
  ConfirmOrderSummary,
  ConfirmPaymentData,
  PreInitializeData,
} from '../../types/payment'

/**
 * Picks a single instant for success UI: prefer confirm order creation time,
 * then pre-initialize order date, else "now" on the client.
 */
export function transactionDisplayInstant(
  confirm: ConfirmPaymentData,
  pre: PreInitializeData,
): Date {
  const ord = confirm.order
  const creation =
    ord && typeof ord === 'object'
      ? (ord as ConfirmOrderSummary).creationDate
      : undefined
  const rawOrder = typeof creation === 'string' ? creation.trim() : ''
  const rawPre =
    typeof pre.orderDate === 'string' ? pre.orderDate.trim() : ''
  for (const raw of [rawOrder, rawPre]) {
    if (!raw) continue
    const ms = Date.parse(raw)
    if (!Number.isNaN(ms)) return new Date(ms)
  }
  return new Date()
}
