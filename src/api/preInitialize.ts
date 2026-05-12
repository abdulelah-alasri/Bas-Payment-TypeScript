import type {
  PreInitializeData,
  PreInitializeFailureBody,
  PreInitializeResponseBody,
} from '../types/payment'

const PRE_INIT_PATH =
  '/api/v1/merchant/sdk-payment/pre-initialize-payment'

export type PreInitializeResult =
  | { ok: true; data: PreInitializeData }
  | { ok: false; kind: 'network'; detail?: string }
  | { ok: false; kind: 'api'; messages: string[]; code?: string }

function getConfig(): { baseUrl: string; token: string } {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '')
    .trim()
    .replace(/\/$/, '')
  const token = import.meta.env.VITE_SDK_BEARER_TOKEN ?? ''
  return { baseUrl, token }
}

export function isPreInitializeConfigValid(): boolean {
  const { token } = getConfig()
  // baseUrl may be empty in dev: requests use same-origin `/api/...` via Vite proxy
  return Boolean(token)
}

export async function preInitializePayment(
  trxToken: string,
): Promise<PreInitializeResult> {
  const { baseUrl, token } = getConfig()
  const url =
    baseUrl === ''
      ? PRE_INIT_PATH
      : `${baseUrl}${PRE_INIT_PATH}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trxToken,
      }),
    })

    let body: PreInitializeResponseBody
    try {
      body = (await res.json()) as PreInitializeResponseBody
    } catch {
      return {
        ok: false,
        kind: 'network',
        detail: 'Invalid JSON response',
      }
    }

    if (!res.ok) {
      const fail = body as PreInitializeFailureBody
      return {
        ok: false,
        kind: 'api',
        messages: fail.messages?.length
          ? fail.messages
          : [`HTTP ${res.status}`],
        code: fail.code,
      }
    }

    if (!body.success) {
      const fail = body as PreInitializeFailureBody
      return {
        ok: false,
        kind: 'api',
        messages: fail.messages?.length
          ? fail.messages
          : ['Request failed'],
        code: fail.code,
      }
    }

    return { ok: true, data: body.data }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    return { ok: false, kind: 'network', detail }
  }
}
