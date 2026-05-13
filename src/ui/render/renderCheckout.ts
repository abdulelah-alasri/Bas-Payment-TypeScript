import type { Translator } from '../../i18n'
import type { PreInitializeData } from '../../types/payment'
import { renderAppPage } from '../layout'
import { renderMethodList } from '../steps/methodSelect'
import { renderPhoneStep } from '../steps/phoneAndExtras'
import { publicAssetUrl } from '../../util/publicAsset'
import { detailRow } from './detailRow'
import {
  displayOrderReference,
  formatAmount,
  formatCommissionLine,
} from './formattingAndOrder'

export interface CheckoutHandlers {
  onSelectMethod: (id: number) => void
  onContinue: () => void
  onChangeMethod: () => void
  onMobileInput: (value: string) => void
  onSendCode: () => void
  onExtraChange: (key: string, value: string) => void
  /** After initiate success: return to editing mobile / resend flow */
  onEditInitiateAccount: () => void
  /** POST confirm-payment after OTP / account step */
  onConfirmPayment: () => void
}

export function renderCheckout(
  root: HTMLElement,
  input: {
    data: PreInitializeData
    step: 1 | 2
    selectedMethodId: number
    requireOtp?: boolean
    mobile: string
    extraFieldValues: Record<string, string>
    checkoutStepError?: string
    initiateInProgress?: boolean
    confirmInProgress?: boolean
    showInitiateAccountCard?: boolean
    initiateAccountDisplay?: string
    /** null = off; 0 = show resend; >0 seconds left */
    otpCountdownRemaining?: number | null
    /** From URL `fullName`; shown after order ID when non-empty */
    urlFullName?: string
    translator: Translator
    handlers: CheckoutHandlers
  },
): void {
  const {
    data,
    step,
    selectedMethodId,
    requireOtp,
    mobile,
    extraFieldValues,
    checkoutStepError,
    initiateInProgress,
    confirmInProgress,
    showInitiateAccountCard,
    initiateAccountDisplay,
    otpCountdownRemaining,
    urlFullName,
    translator,
    handlers,
  } = input
  const { t, lang } = translator

  const methods = data.availablePaymentMethods.filter(
    (m) => m.isEnabled !== false,
  )
  const selected =
    methods.find((m) => m.id === selectedMethodId) ?? methods[0] ?? null

  renderAppPage(
    root,
    {
      translator,
      phase: 'checkout',
      merchantName: data.miniAppInfo.name,
      cancelHref: data.cancelUrl,
    },
    (main) => {
      const shell = document.createElement('div')
      shell.className = 'shell'

      const header = document.createElement('header')
      header.className = 'checkout-header'

      const merchantImageUrl = (data.miniAppInfo.image ?? '').trim()

      const amountCol = document.createElement('div')
      amountCol.className = 'header-amount'
      amountCol.textContent = formatAmount(
        data.amount.value,
        data.amount.currency,
        lang,
      )

      const merchantCenter = document.createElement('div')
      merchantCenter.className = 'header-merchant-center'

      const basCol = document.createElement('div')
      basCol.className = 'header-bas-end'
      const basLogo = document.createElement('img')
      basLogo.className = 'platform-logo'
      basLogo.src = publicAssetUrl('logo.png')
      basLogo.alt = t('platformAlt')
      basLogo.addEventListener('error', () => {
        basLogo.remove()
        basCol.textContent = 'Bas'
        basCol.classList.add('platform-fallback')
      })
      basCol.appendChild(basLogo)

      const merchantSection = document.createElement('section')
      merchantSection.className = 'merchant-block'

      if (merchantImageUrl) {
        const mImg = document.createElement('img')
        mImg.className = 'header-merchant-logo'
        mImg.src = merchantImageUrl
        mImg.alt = data.miniAppInfo.name
        mImg.loading = 'lazy'
        mImg.addEventListener('error', () => {
          mImg.remove()
          const nameEl = document.createElement('div')
          nameEl.className = 'header-merchant-name'
          nameEl.textContent = data.miniAppInfo.name
          merchantCenter.appendChild(nameEl)
          merchantSection.replaceChildren()
          merchantSection.remove()
        })
        merchantCenter.appendChild(mImg)
        const mName = document.createElement('div')
        mName.className = 'merchant-name'
        mName.textContent = data.miniAppInfo.name
        merchantSection.appendChild(mName)
      } else {
        const nameEl = document.createElement('div')
        nameEl.className = 'header-merchant-name'
        nameEl.textContent = data.miniAppInfo.name
        merchantCenter.appendChild(nameEl)
      }

      header.appendChild(amountCol)
      header.appendChild(merchantCenter)
      header.appendChild(basCol)

      const details = document.createElement('section')
      details.className = 'details-card'
      details.appendChild(detailRow(t('orderId'), displayOrderReference(data)))
      const payerName = (urlFullName ?? '').trim()
      if (payerName) {
        details.appendChild(detailRow(t('customerName'), payerName))
      }
      if (data.description) {
        details.appendChild(detailRow(t('description'), data.description))
      }
      details.appendChild(
        detailRow(
          t('total'),
          formatAmount(data.amount.value, data.amount.currency, lang),
          { boldValue: true },
        ),
      )
      if (data.commissions && data.commissions.length > 0) {
        const commTitle = document.createElement('div')
        commTitle.className = 'details-subtitle'
        commTitle.textContent = t('commissions')
        details.appendChild(commTitle)
        data.commissions.forEach((c, i) => {
          details.appendChild(
            detailRow(
              `${t('commissionItem')} ${i + 1}`,
              formatCommissionLine(c),
            ),
          )
        })
      }

      const body = document.createElement('div')
      body.className = 'checkout-body'

      if (step === 1) {
        renderMethodList(
          body,
          methods,
          selectedMethodId,
          t,
          handlers.onSelectMethod,
        )
      } else if (selected) {
        const acc = (initiateAccountDisplay ?? '').trim()
        const showAccount = Boolean(showInitiateAccountCard && acc)
        renderPhoneStep(
          body,
          selected,
          {
            mobile,
            requireOtp,
            extraFieldValues,
            errorMessage: checkoutStepError,
            sendLoading: initiateInProgress,
            confirmLoading: confirmInProgress,
            showConfirmPayment: showAccount,
            showInitiateAccountCard,
            initiateAccountDisplay,
            otpCountdownRemaining,
          },
          t,
          handlers.onMobileInput,
          handlers.onSendCode,
          handlers.onChangeMethod,
          handlers.onExtraChange,
          handlers.onEditInitiateAccount,
          handlers.onConfirmPayment,
        )
      }

      const actions = document.createElement('div')
      actions.className = 'checkout-actions'

      if (step === 1) {
        const primary = document.createElement('button')
        primary.type = 'button'
        primary.className = 'btn btn-primary btn-block'
        primary.textContent = t('completePayment')
        primary.disabled = methods.length === 0
        primary.addEventListener('click', handlers.onContinue)
        actions.appendChild(primary)
      }

      shell.appendChild(header)
      if (merchantSection.childNodes.length > 0) {
        shell.appendChild(merchantSection)
      }
      shell.appendChild(details)
      shell.appendChild(body)
      shell.appendChild(actions)
      main.appendChild(shell)
    },
  )
}
