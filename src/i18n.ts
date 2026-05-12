import ar from './locales/ar.json'
import en from './locales/en.json'

export type AppLang = 'ar' | 'en'

export type LocaleMessages = typeof en

export type MessageKey = keyof LocaleMessages

const messages: Record<AppLang, LocaleMessages> = {
  ar: ar as LocaleMessages,
  en: en as LocaleMessages,
}

export function resolveLangTag(raw: string | null | undefined): AppLang {
  const v = (raw ?? '').trim().toLowerCase()
  if (v === 'ar' || v.startsWith('ar-')) return 'ar'
  return 'en'
}

/** URL `language` wins; if missing, use browser locale so `dir` matches UX. */
export function resolveAppLang(urlLanguage: string | null | undefined): AppLang {
  const trimmed = (urlLanguage ?? '').trim()
  if (trimmed) return resolveLangTag(trimmed)
  if (typeof navigator !== 'undefined' && navigator.language) {
    return resolveLangTag(navigator.language)
  }
  return 'en'
}

export function applyDocumentLanguage(lang: AppLang): void {
  const html = document.documentElement
  const rtl = lang === 'ar'
  html.dir = rtl ? 'rtl' : 'ltr'
  html.lang = lang
}

export function createTranslator(lang: AppLang) {
  const table = messages[lang]

  function t(key: MessageKey, params?: Record<string, string>): string {
    let s = table[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        s = s.replaceAll(`{${k}}`, v)
      }
    }
    return s
  }

  return { t, lang }
}

export type Translator = ReturnType<typeof createTranslator>
