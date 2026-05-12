import type { AppLang } from '../i18n'
import type { ConfirmPaymentData } from '../types/payment'

/** `gatewayInfo.pgTransactionId` from confirm-payment response */
export function pgTransactionIdFromConfirmData(d: ConfirmPaymentData): string {
  const g = d.gatewayInfo
  if (g && typeof g === 'object') {
    const id = (g as Record<string, unknown>).pgTransactionId
    if (id != null && String(id).trim()) return String(id).trim()
  }
  return ''
}

function gatewayRecord(d: ConfirmPaymentData): Record<string, unknown> | null {
  const g = d.gatewayInfo
  if (g && typeof g === 'object') return g as Record<string, unknown>
  return null
}

/** Raw JSON string in `gatewayInfo.pgRequstInfo` (API spelling). */
export function pgRequestInfoString(d: ConfirmPaymentData): string {
  const rec = gatewayRecord(d)
  if (!rec) return ''
  const raw = rec.pgRequstInfo ?? rec.pgRequestInfo
  return typeof raw === 'string' ? raw.trim() : ''
}

export function paymentMethodNameFromPgRequest(
  json: string,
  lang: AppLang,
): string | undefined {
  if (!json) return undefined
  try {
    const o = JSON.parse(json) as Record<string, unknown>
    const from = o.FromPaymentMethod as Record<string, unknown> | undefined
    if (!from) return undefined
    if (lang === 'ar') {
      const ar = from.PaymentMethodNameAr
      if (typeof ar === 'string' && ar.trim()) return ar.trim()
    }
    const en = from.PaymentMethodNameEn
    if (typeof en === 'string' && en.trim()) return en.trim()
    const ar = from.PaymentMethodNameAr
    if (typeof ar === 'string' && ar.trim()) return ar.trim()
  } catch {
    /* invalid JSON */
  }
  return undefined
}

export function accountFromPgRequest(json: string): string | undefined {
  if (!json) return undefined
  try {
    const o = JSON.parse(json) as Record<string, unknown>
    const from = o.FromPaymentMethod as Record<string, unknown> | undefined
    const acc = from?.Account
    if (typeof acc === 'string' && acc.trim()) return acc.trim()
    const ex = o.ExtraFields as Record<string, unknown> | undefined
    const a = ex?.account
    if (typeof a === 'string' && a.trim()) return a.trim()
  } catch {
    /* ignore */
  }
  return undefined
}

export function isSuccessfulConfirmTrxStatus(raw: string | undefined): boolean {
  const s = (raw ?? '').trim().toLowerCase()
  return (
    s === 'completed' ||
    s === 'processed' ||
    s === 'paid' ||
    s === 'success'
  )
}
