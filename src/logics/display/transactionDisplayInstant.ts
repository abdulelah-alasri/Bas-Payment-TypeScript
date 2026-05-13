import type { AppLang } from '../../i18n'
import type {
  ConfirmOrderSummary,
  ConfirmPaymentData,
  PreInitializeData,
} from '../../types/payment'

/** Sentinel when no server datetime is available (em dash). */
export const PRE_INIT_DATETIME_UNAVAILABLE = '\u2014'

const EXTRA_DATETIME_KEYS = [
  'completedAt',
  'paymentDate',
  'creationDate',
  'orderCompletedAt',
  'trxDate',
  'paidAt',
] as const

function isPlaceholderInstant(d: Date): boolean {
  return d.getUTCFullYear() <= 1
}

function parseDisplayableInstant(raw: string): Date | null {
  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) return null
  const d = new Date(ms)
  if (isPlaceholderInstant(d)) return null
  return d
}

function collectPreInitDateTimeRawStrings(data: PreInitializeData): string[] {
  const out: string[] = []
  const od = typeof data.orderDate === 'string' ? data.orderDate.trim() : ''
  if (od) out.push(od)
  const ef = data.extraFields
  if (!ef || typeof ef !== 'object') return out
  for (const key of EXTRA_DATETIME_KEYS) {
    const v = ef[key as string]
    if (typeof v === 'string' && v.trim()) out.push(v.trim())
  }
  return out
}

/**
 * Best-effort transaction date/time for completed pre-initialize payloads:
 * uses `orderDate` when not a placeholder, then common keys in `extraFields`.
 * Returns em dash when nothing parseable is found (caller may replace with i18n).
 */
export function formatPreInitializeTransactionDateTimeForCompleted(
  data: PreInitializeData,
  lang: AppLang,
): string {
  const localeTag = lang === 'ar' ? 'ar' : 'en-US'
  for (const raw of collectPreInitDateTimeRawStrings(data)) {
    const inst = parseDisplayableInstant(raw)
    if (!inst) continue
    try {
      return new Intl.DateTimeFormat(localeTag, {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(inst)
    } catch {
      continue
    }
  }
  return PRE_INIT_DATETIME_UNAVAILABLE
}

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
