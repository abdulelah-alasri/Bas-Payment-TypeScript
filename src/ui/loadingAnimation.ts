import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_light'
import { publicAssetUrl } from '../util/publicAsset'

let activeLoadingAnim: AnimationItem | null = null

export function destroyLoadingAnimation(): void {
  if (activeLoadingAnim) {
    activeLoadingAnim.destroy()
    activeLoadingAnim = null
  }
}

/**
 * Plays `public/logo_loading.json` inside `container`. Falls back to CSS spinner on failure.
 */
export async function mountLoadingLottie(
  container: HTMLElement,
): Promise<void> {
  destroyLoadingAnimation()
  container.replaceChildren()
  const url = publicAssetUrl('logo_loading.json')
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const animationData: unknown = await res.json()
    activeLoadingAnim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData as object,
    })
  } catch {
    container.classList.add('lottie-fallback')
    const spin = document.createElement('div')
    spin.className = 'spinner'
    spin.setAttribute('role', 'status')
    container.appendChild(spin)
  }
}
