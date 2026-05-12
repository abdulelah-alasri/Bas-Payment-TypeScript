export interface ParameterName {
  key: string
  type: string
  title: string
  desc: string
  visible: number
}

export interface PaymentMethod {
  id: number
  name: string
  paymentMethodTypeId?: number
  paymentMethodTypeName?: string
  partyId?: number
  parametersNames?: ParameterName[]
  isSupportChargeBack?: boolean
  image?: string
  sdkCode?: string
  isHaveMultipleAccounts?: boolean
  canChangeAccount?: boolean
  interactionMethod?: number
  linkAccountMechanism?: number
  paymentMethodAccounts?: unknown[]
  messagesForCustomer?: string[]
  fees?: unknown[]
  isEnabled?: boolean
  extraFields?: Record<string, unknown>
}

export interface MiniAppInfo {
  appId: string
  miniAppId: number
  name: string
  description: string
  image?: string
  providerName?: string
}

export interface Amount {
  value: number
  currency: string
}

/** Snapshot after successful confirm; used for success UI and printable receipt. */
export interface PaymentSuccessSnapshot {
  pgTransactionId: string
  /** Localized date/time string for when the transaction completed (or server order time). */
  transactionDateTime: string
  paymentMethodName: string
  paymentMethodImage?: string
  accountPhone: string
}

export interface PreInitializeData {
  trxStatus: string
  /** Optional string reference from API; UI "Order ID" prefers numeric `id`. */
  orderId?: string
  orderType?: string
  appId?: string
  trxId?: string
  trxToken?: string
  trxStatusId?: number
  isTokenExpired?: boolean
  orderDate?: string
  amount: Amount
  description?: string
  commissions?: unknown[]
  trxType?: string
  miniAppInfo: MiniAppInfo
  availablePaymentMethods: PaymentMethod[]
  extraFields?: Record<string, unknown>
  /** After successful payment: open this URL (e.g. continue / return to merchant). */
  redirecturl?: string
  /** Cancel / leave checkout: navigate here when present; otherwise history.back(). */
  cancelurl?: string
  /** Numeric order id from pre-initialize response; shown as Order ID when present. */
  id?: number
}

export interface PreInitializeSuccessBody {
  status: number
  success: true
  code: string
  messages: unknown[]
  data: PreInitializeData
}

export interface PreInitializeFailureBody {
  status: number
  success: false
  code: string
  messages: string[]
}

export type PreInitializeResponseBody =
  | PreInitializeSuccessBody
  | PreInitializeFailureBody

/** POST /api/v1/merchant/sdk-payment/initiate-payment */
export interface InitiatePaymentRequestBody {
  customerPaymentMethodId: number
  trxToken: string
  account: string
  phoneNumber: string
  fullName: string
  extraFields: Record<string, string>
}

export interface InitiatePaymentData {
  extraFields?: Record<string, unknown>
  actionId?: number
  trxStatus?: string
  trxId?: string
  trxToken?: string
  trxStatusId?: number
  authenticated?: boolean
  gatewayInfo?: Record<string, unknown>
  [key: string]: unknown
}

export interface InitiatePaymentSuccessBody {
  status: number
  success: true
  code: string
  messages: unknown[]
  data: InitiatePaymentData
}

export interface InitiatePaymentFailureBody {
  status: number
  success: false
  code: string
  messages: string[]
}

export type InitiatePaymentResponseBody =
  | InitiatePaymentSuccessBody
  | InitiatePaymentFailureBody

/** POST /api/v1/merchant/sdk-payment/confirm-payment */
export interface ConfirmPaymentRequestBody {
  customerPaymentMethodId: number
  appId: string
  trxToken: string
  account: string
  pgTransactionToken: string
  extraFields: Record<string, string>
}

export interface ConfirmGatewayInfo {
  pgTransactionId?: string
  /** API field name (typo of "Request") */
  pgRequstInfo?: string
  pgRequestInfo?: string
  [key: string]: unknown
}

export interface ConfirmOrderSummary {
  orderId?: string
  amount?: Amount
  appId?: string
  creationDate?: string
  [key: string]: unknown
}

export interface ConfirmPaymentData {
  trxStatus?: string
  trxToken?: string
  trxId?: string
  redirecturl?: string
  miniAppInfo?: MiniAppInfo
  gatewayInfo?: ConfirmGatewayInfo
  order?: ConfirmOrderSummary
  [key: string]: unknown
}

export interface ConfirmPaymentSuccessBody {
  status: number
  success: true
  code: string
  messages: unknown[]
  data: ConfirmPaymentData
}

export interface ConfirmPaymentFailureBody {
  status: number
  success: false
  code: string
  messages: string[]
}

export type ConfirmPaymentResponseBody =
  | ConfirmPaymentSuccessBody
  | ConfirmPaymentFailureBody
