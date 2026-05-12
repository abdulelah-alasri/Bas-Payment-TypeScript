import type {
  InitiatePaymentData,
  InitiatePaymentFailureBody,
  InitiatePaymentRequestBody,
  InitiatePaymentResponseBody,
} from '../types/payment'

const INITIATE_PATH = '/api/v1/merchant/sdk-payment/initiate-payment'

export type InitiatePaymentResult =
  | { ok: true; data: InitiatePaymentData }
  | { ok: false; kind: 'network'; detail?: string }
  | { ok: false; kind: 'api'; messages: string[]; code?: string }

function getConfig(): { baseUrl: string; token: string } {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '')
    .trim()
    .replace(/\/$/, '')
  const token = import.meta.env.VITE_SDK_BEARER_TOKEN ?? ''
  return { baseUrl, token }
}

export async function initiatePayment(
  body: InitiatePaymentRequestBody,
): Promise<InitiatePaymentResult> {
  const { baseUrl, token } = getConfig()
  const url =
    baseUrl === '' ? INITIATE_PATH : `${baseUrl}${INITIATE_PATH}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    let parsed: InitiatePaymentResponseBody
    try {
      parsed = (await res.json()) as InitiatePaymentResponseBody
    } catch {
      return {
        ok: false,
        kind: 'network',
        detail: 'Invalid JSON response',
      }
    }

    if (!res.ok) {
      const fail = parsed as InitiatePaymentFailureBody
      return {
        ok: false,
        kind: 'api',
        messages: fail.messages?.length
          ? fail.messages
          : [`HTTP ${res.status}`],
        code: fail.code,
      }
    }

    if (!parsed.success) {
      const fail = parsed as InitiatePaymentFailureBody
      return {
        ok: false,
        kind: 'api',
        messages: fail.messages?.length
          ? fail.messages
          : ['Request failed'],
        code: fail.code,
      }
    }

    return { ok: true, data: parsed.data }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e)
    return { ok: false, kind: 'network', detail }
  }
}
