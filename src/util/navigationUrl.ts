/**
 * True when the API-provided URL is safe to use for navigation (http(s) or same-origin path).
 * Invalid or missing values keep current behaviour (history.back / no redirect button).
 */
export function isAllowedMerchantNavigationUrl(
  raw: string | null | undefined,
): boolean {
  const t = (raw ?? '').trim()
  if (!t || t === '#') return false
  const u = t.toLowerCase()
  if (u.startsWith('javascript:') || u.startsWith('data:')) return false
  if (u.startsWith('http://') || u.startsWith('https://')) return true
  return t.startsWith('/') && !t.startsWith('//')
}
