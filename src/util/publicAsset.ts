/** URL for a file served from Vite `public/` (respects `base`). */
export function publicAssetUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const path = file.replace(/^\//, '')
  return `${normalizedBase}${path}`
}
