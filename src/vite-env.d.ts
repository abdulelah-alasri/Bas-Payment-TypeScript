/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_PROXY_API_TARGET?: string
  readonly VITE_SDK_BEARER_TOKEN?: string
  readonly VITE_BASGATE_HOME?: string
  readonly VITE_BASGATE_PRIVACY_URL?: string
  readonly VITE_BASGATE_TERMS_URL?: string
  readonly VITE_BASGATE_CONTACT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
