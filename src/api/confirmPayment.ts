import type {
  ConfirmPaymentData,
  ConfirmPaymentFailureBody,
  ConfirmPaymentRequestBody,
  ConfirmPaymentResponseBody,
} from '../types/payment'

const CONFIRM_PATH = '/api/v1/merchant/sdk-payment/confirm-payment'

export type ConfirmPaymentResult =
  | { ok: true; data: ConfirmPaymentData }
  | { ok: false; kind: 'network'; detail?: string }
  | { ok: false; kind: 'api'; messages: string[]; code?: string }

function getConfig(): { baseUrl: string; token: string } {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? '')
    .trim()
    .replace(/\/$/, '')
  const token = import.meta.env.VITE_SDK_BEARER_TOKEN ?? ''
  return { baseUrl, token }
}

export async function confirmPayment(
  body: ConfirmPaymentRequestBody,
): Promise<ConfirmPaymentResult> {
  const { baseUrl, token } = getConfig()
  const url =
    baseUrl === '' ? CONFIRM_PATH : `${baseUrl}${CONFIRM_PATH}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    let parsed: ConfirmPaymentResponseBody
    try {
      parsed = (await res.json()) as ConfirmPaymentResponseBody
    } catch {
      return {
        ok: false,
        kind: 'network',
        detail: 'Invalid JSON response',
      }
    }

    if (!res.ok) {
      const fail = parsed as ConfirmPaymentFailureBody
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
      const fail = parsed as ConfirmPaymentFailureBody
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
