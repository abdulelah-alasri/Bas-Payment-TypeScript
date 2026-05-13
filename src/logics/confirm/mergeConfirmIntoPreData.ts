import type {
  ConfirmOrderSummary,
  ConfirmPaymentData,
  PreInitializeData,
} from '../../types/payment'

/**
 * Shallow-merges confirm response fields into existing pre-initialize payload
 * so the UI and redirect URLs stay consistent after confirm.
 */
export function mergeConfirmIntoPreData(
  base: PreInitializeData,
  d: ConfirmPaymentData,
): PreInitializeData {
  const next: PreInitializeData = { ...base }
  if (typeof d.trxStatus === 'string' && d.trxStatus) next.trxStatus = d.trxStatus
  if (typeof d.trxToken === 'string' && d.trxToken.trim()) {
    next.trxToken = d.trxToken.trim()
  }
  if (typeof d.trxId === 'string' && d.trxId) next.trxId = d.trxId
  const red =
    typeof d.redirectUrl === 'string'
      ? d.redirectUrl.trim()
      : typeof d.redirecturl === 'string'
        ? d.redirecturl.trim()
        : ''
  if (red) next.redirectUrl = red
  if (d.order && typeof d.order === 'object') {
    const ord = d.order as ConfirmOrderSummary
    if (typeof ord.orderId === 'string' && ord.orderId.trim()) {
      if (next.id == null || !Number.isFinite(next.id)) {
        next.orderId = ord.orderId.trim()
      }
    }
  }
  return next
}
