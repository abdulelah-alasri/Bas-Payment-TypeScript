import type { ParameterName, PaymentMethod } from '../types/payment'

/** Visible method parameters shown before initiate (excludes synthetic OTP). */
export function visibleMethodParametersForPayment(
  method: PaymentMethod,
): ParameterName[] {
  return (
    method.parametersNames?.filter(
      (p) => p.visible === 1 && p.key.toUpperCase() !== 'OTP',
    ) ?? []
  )
}
