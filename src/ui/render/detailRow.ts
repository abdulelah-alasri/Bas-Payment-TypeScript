function addSpaceSeparatedClasses(
  el: Element,
  classString: string | undefined,
): void {
  if (!classString?.trim()) return
  for (const token of classString.trim().split(/\s+/)) {
    if (token) el.classList.add(token)
  }
}

export function detailRow(
  label: string,
  value: string,
  opts?: { boldValue?: boolean; valueClass?: string; rowClass?: string },
): HTMLElement {
  const row = document.createElement('div')
  row.className = 'detail-row'
  addSpaceSeparatedClasses(row, opts?.rowClass)
  const l = document.createElement('span')
  l.className = 'detail-label'
  l.textContent = label
  const v = document.createElement('span')
  v.className = 'detail-value'
  if (opts?.boldValue) v.classList.add('detail-value--bold')
  addSpaceSeparatedClasses(v, opts?.valueClass)
  v.textContent = value
  row.appendChild(l)
  row.appendChild(v)
  return row
}
