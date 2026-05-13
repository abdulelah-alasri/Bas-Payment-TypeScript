import type { ParameterName, PaymentMethod } from '../../types/payment'
import type { Translator } from '../../i18n'
import { visibleMethodParametersForPayment } from '../../util/paymentMethodParams'

export interface PhoneStepModel {
  mobile: string
  /** When initiate response includes OTP requirement */
  requireOtp?: boolean
  extraFieldValues: Record<string, string>
  errorMessage?: string
  sendLoading?: boolean
  confirmLoading?: boolean
  /** After successful initiate: show final pay button */
  showConfirmPayment?: boolean
  /** After successful initiate: show account summary card */
  showInitiateAccountCard?: boolean
  initiateAccountDisplay?: string
  /** null = inactive; >0 = MM:SS; 0 = show resend (post-initiate OTP step) */
  otpCountdownRemaining?: number | null
}

export function renderPhoneStep(
  container: HTMLElement,
  method: PaymentMethod,
  model: PhoneStepModel,
  t: Translator['t'],
  onMobileInput: (value: string) => void,
  onSendCode: () => void,
  onChangeMethod: () => void,
  onExtraChange: (key: string, value: string) => void,
  onEditInitiateAccount: () => void,
  onConfirmPayment: () => void,
): void {
  container.replaceChildren()

  const busy = Boolean(model.sendLoading || model.confirmLoading)

  const methodCard = document.createElement('div')
  methodCard.className = 'selected-method-card'

  const info = document.createElement('div')
  info.className = 'selected-method-info'

  const imgWrap = document.createElement('div')
  imgWrap.className = 'method-icon-wrap'
  if (method.image) {
    const img = document.createElement('img')
    img.className = 'method-icon'
    img.src = method.image
    img.alt = t('methodImageAlt')
    img.loading = 'lazy'
    img.decoding = 'async'
    img.addEventListener('error', () => {
      img.replaceWith(placeholderInitial(method.name))
    })
    imgWrap.appendChild(img)
  } else {
    imgWrap.appendChild(placeholderInitial(method.name))
  }

  const nameEl = document.createElement('div')
  nameEl.className = 'selected-method-name'
  nameEl.textContent = method.name

  info.appendChild(imgWrap)
  info.appendChild(nameEl)

  const changeBtn = document.createElement('button')
  changeBtn.type = 'button'
  changeBtn.className = 'btn btn-primary btn-change-method'
  changeBtn.textContent = t('changeMethodShort')
  changeBtn.setAttribute('aria-label', t('changePaymentMethod'))
  changeBtn.disabled = busy
  changeBtn.addEventListener('click', onChangeMethod)

  methodCard.appendChild(info)
  methodCard.appendChild(changeBtn)
  container.appendChild(methodCard)

  const showAccount =
    model.showInitiateAccountCard &&
    Boolean((model.initiateAccountDisplay ?? '').trim())

  if (showAccount) {
    const acc = (model.initiateAccountDisplay ?? '').trim()
    const accCard = document.createElement('div')
    accCard.className = 'selected-method-card selected-account-card'

    const accInfo = document.createElement('div')
    accInfo.className = 'selected-method-info'

    const accIconWrap = document.createElement('div')
    accIconWrap.className = 'method-icon-wrap'
    accIconWrap.appendChild(placeholderInitial(acc))

    const textBlock = document.createElement('div')
    textBlock.className = 'selected-account-text-block'
    const accLabel = document.createElement('div')
    accLabel.className = 'selected-account-label'
    accLabel.textContent = t('accountNumberLabel')
    const accValue = document.createElement('div')
    accValue.className = 'selected-account-value'
    accValue.textContent = acc
    textBlock.appendChild(accLabel)
    textBlock.appendChild(accValue)

    accInfo.appendChild(accIconWrap)
    accInfo.appendChild(textBlock)

    const accChange = document.createElement('button')
    accChange.type = 'button'
    accChange.className = 'btn btn-primary btn-change-method'
    accChange.textContent = t('changeMethodShort')
    accChange.setAttribute('aria-label', t('editAccountNumber'))
    accChange.disabled = busy
    accChange.addEventListener('click', onEditInitiateAccount)

    accCard.appendChild(accInfo)
    accCard.appendChild(accChange)
    container.appendChild(accCard)
  }

  const methodParams = visibleMethodParametersForPayment(method)

  if (!showAccount) {
    const phoneWrap = document.createElement('div')
    phoneWrap.className = 'field-block'
    const phoneLabel = document.createElement('label')
    phoneLabel.className = 'field-label'
    phoneLabel.htmlFor = 'mobile-input'
    phoneLabel.textContent = t('mobileLabel')
    const phoneInput = document.createElement('input')
    phoneInput.id = 'mobile-input'
    phoneInput.className = 'field-input'
    phoneInput.type = 'tel'
    phoneInput.autocomplete = 'tel'
    phoneInput.value = model.mobile
    phoneInput.disabled = busy
    phoneInput.addEventListener('input', () => onMobileInput(phoneInput.value))
    phoneInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      if (!busy) onSendCode()
    })
    phoneWrap.appendChild(phoneLabel)
    phoneWrap.appendChild(phoneInput)
    container.appendChild(phoneWrap)

    for (let i = 0; i < methodParams.length; i++) {
      const p = methodParams[i]!
      appendParameterFieldBlock(
        container,
        p,
        model,
        busy,
        t,
        onExtraChange,
        onSendCode,
        onConfirmPayment,
        {
          showOtpTimer: false,
          otpCountdownRemaining: null,
          enterAction: 'send',
          isLastInGroup: i === methodParams.length - 1,
          singleInConfirmGroup: false,
        },
      )
    }

    const sendBtn = document.createElement('button')
    sendBtn.type = 'button'
    sendBtn.className = 'btn btn-secondary btn-block'
    sendBtn.textContent = t('sendCode')
    sendBtn.disabled = busy
    sendBtn.addEventListener('click', () => {
      onSendCode()
    })
    container.appendChild(sendBtn)

    if (model.sendLoading && !model.confirmLoading) {
      const progress = document.createElement('div')
      progress.className = 'phone-step-progress'
      progress.setAttribute('role', 'status')
      progress.setAttribute('aria-live', 'polite')
      const spinner = document.createElement('div')
      spinner.className = 'spinner'
      spinner.setAttribute('aria-hidden', 'true')
      const progressText = document.createElement('p')
      progressText.className = 'phone-step-progress-text'
      progressText.textContent = t('requestInProgress')
      progress.appendChild(spinner)
      progress.appendChild(progressText)
      container.appendChild(progress)
    }

    if (model.errorMessage) {
      const err = document.createElement('p')
      err.className = 'phone-step-error'
      err.setAttribute('role', 'alert')
      err.textContent = model.errorMessage
      container.appendChild(err)
    }
  }

  if (showAccount && model.requireOtp) {
    const otpParam: ParameterName = {
      key: 'OTP',
      type: 'text',
      title: t('otpLabel'),
      desc: '',
      visible: 1,
    }
    appendParameterFieldBlock(
      container,
      otpParam,
      model,
      busy,
      t,
      onExtraChange,
      onSendCode,
      onConfirmPayment,
      {
        showOtpTimer: true,
        otpCountdownRemaining: model.otpCountdownRemaining ?? null,
        enterAction: 'confirm',
        isLastInGroup: true,
        singleInConfirmGroup: true,
      },
    )
  }

  if (showAccount && model.showConfirmPayment) {
    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = 'btn btn-primary btn-block'
    confirmBtn.textContent = t('confirmPayment')
    confirmBtn.disabled = busy
    confirmBtn.addEventListener('click', () => onConfirmPayment())
    container.appendChild(confirmBtn)

    if (model.confirmLoading) {
      const progress = document.createElement('div')
      progress.className = 'phone-step-progress'
      progress.setAttribute('role', 'status')
      progress.setAttribute('aria-live', 'polite')
      const spinner = document.createElement('div')
      spinner.className = 'spinner'
      spinner.setAttribute('aria-hidden', 'true')
      const progressText = document.createElement('p')
      progressText.className = 'phone-step-progress-text'
      progressText.textContent = t('confirmInProgress')
      progress.appendChild(spinner)
      progress.appendChild(progressText)
      container.appendChild(progress)
    }

    if (model.errorMessage) {
      const err = document.createElement('p')
      err.className = 'phone-step-error'
      err.setAttribute('role', 'alert')
      err.textContent = model.errorMessage
      container.appendChild(err)
    }
  }
}

function appendParameterFieldBlock(
  container: HTMLElement,
  p: ParameterName,
  model: PhoneStepModel,
  busy: boolean,
  t: Translator['t'],
  onExtraChange: (key: string, value: string) => void,
  onSendCode: () => void,
  onConfirmPayment: () => void,
  opts: {
    showOtpTimer: boolean
    otpCountdownRemaining: number | null
    enterAction: 'send' | 'confirm'
    isLastInGroup: boolean
    singleInConfirmGroup: boolean
  },
): void {
  const block = document.createElement('div')
  block.className = 'field-block'
  const isOtpField = p.key.toUpperCase() === 'OTP'
  const showOtpTimer =
    opts.showOtpTimer &&
    isOtpField &&
    Boolean(model.requireOtp) &&
    opts.otpCountdownRemaining != null

  if (showOtpTimer) {
    const labelRow = document.createElement('div')
    labelRow.className = 'field-label-row'
    const lab = document.createElement('label')
    lab.className = 'field-label field-label--grow'
    lab.htmlFor = `extra-${p.key}`
    lab.textContent = p.title || p.key
    labelRow.appendChild(lab)
    const rem = opts.otpCountdownRemaining!
    if (rem > 0) {
      const cd = document.createElement('span')
      cd.id = 'otp-countdown-display'
      cd.className = 'otp-countdown'
      cd.setAttribute('aria-live', 'polite')
      cd.setAttribute('aria-atomic', 'true')
      cd.textContent = formatOtpCountdown(rem)
      labelRow.appendChild(cd)
    } else {
      const resend = document.createElement('button')
      resend.type = 'button'
      resend.className = 'otp-resend-link'
      resend.textContent = t('otpResend')
      resend.disabled = busy
      resend.addEventListener('click', () => onSendCode())
      labelRow.appendChild(resend)
    }
    block.appendChild(labelRow)
  } else {
    const lab = document.createElement('label')
    lab.className = 'field-label'
    lab.htmlFor = `extra-${p.key}`
    lab.textContent = p.title || p.key
    block.appendChild(lab)
  }

  const inp = document.createElement('input')
  inp.id = `extra-${p.key}`
  inp.className = 'field-input'
  inp.type = p.type === 'number' ? 'number' : 'text'
  inp.value = model.extraFieldValues[p.key] ?? ''
  inp.disabled = busy
  inp.addEventListener('input', () => onExtraChange(p.key, inp.value))

  const shouldEnterConfirm =
    opts.enterAction === 'confirm' &&
    model.showConfirmPayment &&
    (opts.singleInConfirmGroup || isOtpField || opts.isLastInGroup)

  if (opts.enterAction === 'send' && opts.isLastInGroup) {
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      if (!busy) onSendCode()
    })
  } else if (shouldEnterConfirm) {
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      if (!busy) onConfirmPayment()
    })
  }

  block.appendChild(inp)
  container.appendChild(block)
}

function placeholderInitial(name: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'method-icon-placeholder'
  el.textContent = (name.trim()[0] ?? '?').toUpperCase()
  return el
}

function formatOtpCountdown(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
