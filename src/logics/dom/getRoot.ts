/**
 * Returns the root mount element for the payment app.
 * @throws If `#app` is missing from the document.
 */
export function getRoot(): HTMLElement {
  const el = document.getElementById('app')
  if (!el) throw new Error('#app not found')
  return el
}
