import type { AppModel } from '../appModel'
import { OTP_RESEND_WINDOW_SEC } from '../constants'

function formatOtpCountdownLabel(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Updates only the countdown text node so checkout is not fully re-rendered (preserves input focus).
 */
function patchOtpCountdownDom(totalSecs: number): void {
  const el = document.getElementById('otp-countdown-display')
  if (el) el.textContent = formatOtpCountdownLabel(totalSecs)
}

/**
 * Creates OTP resend countdown state + interval. Caller owns `model.otpCountdownRemaining` updates.
 * When the timer hits zero, triggers a full checkout re-render once (resend UI).
 */
export function createOtpCountdownController(deps: {
  model: AppModel
  /** Cooldown length in seconds; defaults to {@link OTP_RESEND_WINDOW_SEC}. */
  windowSec?: number
  /** Invoked when countdown reaches 0 so the template can show the resend action. */
  onExpiredNeedFullRerender: () => void
}): { start: () => void; stop: () => void; reset: () => void } {
  const windowSec = deps.windowSec ?? OTP_RESEND_WINDOW_SEC
  const model = deps.model
  let tickId: ReturnType<typeof setInterval> | null = null

  function stop(): void {
    if (tickId != null) {
      window.clearInterval(tickId)
      tickId = null
    }
  }

  function reset(): void {
    stop()
    model.otpCountdownRemaining = null
  }

  function start(): void {
    stop()
    model.otpCountdownRemaining = windowSec
    tickId = window.setInterval(() => {
      if (model.phase !== 'checkout' || model.otpCountdownRemaining == null) {
        stop()
        return
      }
      if (model.otpCountdownRemaining <= 0) {
        stop()
        return
      }
      model.otpCountdownRemaining -= 1
      if (model.otpCountdownRemaining > 0) {
        patchOtpCountdownDom(model.otpCountdownRemaining)
      } else {
        deps.onExpiredNeedFullRerender()
        stop()
      }
    }, 1000)
  }

  return { start, stop, reset }
}
