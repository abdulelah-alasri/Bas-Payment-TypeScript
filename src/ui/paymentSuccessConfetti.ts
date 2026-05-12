import confetti from 'canvas-confetti'

/** Bright scraps to match payment success (green check + brand tones) */
const CELEBRATION_COLORS = [
  '#22c55e',
  '#4ade80',
  '#86efac',
  '#fbbf24',
  '#fb923c',
  '#f472b6',
  '#c084fc',
  '#60a5fa',
  '#eb6867',
  '#fde047',
]

/**
 * Fire confetti bursts near the top-center (with the success icon).
 * Runs after layout paint via double rAF from the caller.
 */
export function firePaymentSuccessConfetti(): void {
  const base = {
    spread: 78,
    startVelocity: 32,
    decay: 0.92,
    gravity: 1.08,
    ticks: 240,
    colors: CELEBRATION_COLORS,
    scalar: 1.08,
    zIndex: 9999,
    disableForReducedMotion: true,
  }

  void confetti({
    ...base,
    particleCount: 110,
    origin: { x: 0.5, y: 0.26 },
  })

  window.setTimeout(() => {
    void confetti({
      ...base,
      particleCount: 50,
      angle: 55,
      origin: { x: 0.08, y: 0.34 },
    })
    void confetti({
      ...base,
      particleCount: 50,
      angle: 125,
      origin: { x: 0.92, y: 0.34 },
    })
  }, 160)

  window.setTimeout(() => {
    void confetti({
      ...base,
      particleCount: 70,
      spread: 100,
      startVelocity: 22,
      origin: { x: 0.5, y: 0.22 },
      scalar: 0.9,
    })
  }, 320)
}
