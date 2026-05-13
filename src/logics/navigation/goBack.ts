/**
 * Leaves the payment page: uses browser history when possible, otherwise tries `window.close()`.
 */
export function goBack(): void {
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  window.close()
}
