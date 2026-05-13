import type { InitiatePaymentData } from '../../types/payment'

/**
 * Whether the gateway requires an OTP step after initiate (reads `extraFields.OTP`).
 */
export function otpRequiredFromInitiate(data: InitiatePaymentData): boolean {
  const ex = data.extraFields
  if (!ex || typeof ex !== 'object') return false
  const v = (ex as Record<string, unknown>).OTP
  return v === true || v === 'true' || v === '1'
}
