import type { AppLang } from '../../i18n'

/**
 * Formats a date/time for display using the app language (ar vs en-US).
 */
export function formatLocaleDateTime(lang: AppLang, d: Date): string {
  const localeTag = lang === 'ar' ? 'ar' : 'en-US'
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(d)
}
