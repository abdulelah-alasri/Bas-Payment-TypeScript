import type { InitiatePaymentData } from '../../types/payment'

/**
 * Best-effort PG transaction id/token from initiate response for confirm payload.
 * Prefers `gatewayInfo.pgTransactionId` / `pgTransactionToken`, else falls back to `trxToken`.
 */
export function pgTransactionTokenFromInitiate(data: InitiatePaymentData): string {
  const g = data.gatewayInfo
  if (g && typeof g === 'object') {
    const r = g as Record<string, unknown>
    const id = r.pgTransactionId ?? r.pgTransactionToken
    const s = id == null ? '' : String(id).trim()
    if (s) return s
  }
  return (data.trxToken ?? '').trim()
}
