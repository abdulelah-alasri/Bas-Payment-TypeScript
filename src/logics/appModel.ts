import type { PaymentSuccessSnapshot, PreInitializeData } from '../types/payment'

/**
 * High-level UI state for the payment shell (loading, checkout, terminal screens).
 */
export type Phase =
  | 'loading'
  | 'error'
  | 'checkout'
  | 'completed'
  | 'paymentSuccess'

/**
 * Mutable client-side state shared across checkout, initiate, and confirm flows.
 */
export interface AppModel {
  phase: Phase
  errorMessage?: string
  data?: PreInitializeData
  checkoutStep: 1 | 2
  selectedMethodId: number | null
  requireOtp: boolean
  mobile: string
  extraFieldValues: Record<string, string>
  activeTrxToken: string
  initiateInProgress: boolean
  confirmInProgress: boolean
  checkoutStepError?: string
  showInitiateAccountCard: boolean
  initiateAccountDisplay: string
  /** From initiate `gatewayInfo` when present; fallback to trxToken at confirm time */
  lastPgTransactionToken?: string
  paymentSuccessSnapshot?: PaymentSuccessSnapshot
  /** Seconds left for OTP resend (null = inactive). 0 = show resend link. */
  otpCountdownRemaining: number | null
}
