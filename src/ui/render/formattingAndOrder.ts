import type { AppLang } from '../../i18n'
import type { PreInitializeData } from '../../types/payment'

/** Order ID row: API `id` first; if missing, use `orderId` string. */
export function displayOrderReference(data: PreInitializeData): string {
  if (data.id != null && Number.isFinite(data.id)) return String(data.id)
  const oid = typeof data.orderId === 'string' ? data.orderId.trim() : ''
  if (oid) return oid
  return '—'
}

/** Safe read of pre-initialize amount (API may send strings or omit nested fields). */
export function resolvedPreInitAmount(
  data: PreInitializeData,
): { value: number; currency: string } | null {
  const a = data.amount as { value?: unknown; currency?: unknown } | undefined
  if (!a || typeof a !== 'object') return null
  const rawV = a.value
  let value: number
  if (typeof rawV === 'number') {
    value = rawV
  } else if (typeof rawV === 'string') {
    value = Number.parseFloat(rawV.trim())
  } else {
    return null
  }
  if (!Number.isFinite(value)) return null
  const cur =
    typeof a.currency === 'string' ? a.currency.trim().toUpperCase() : ''
  return { value, currency: cur || '—' }
}

export function formatAmountNumeric(value: number, lang: AppLang): string {
  try {
    const intlLocale = lang === 'ar' ? 'ar' : 'en'
    return new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return value.toFixed(2)
  }
}

export function formatAmount(
  value: number,
  currency: string,
  lang: AppLang,
): string {
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

export function formatCommissionLine(item: unknown): string {
  if (item === null || item === undefined) return ''
  if (typeof item === 'string' || typeof item === 'number') return String(item)
  try {
    return JSON.stringify(item)
  } catch {
    return String(item)
  }
}
