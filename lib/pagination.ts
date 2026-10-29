export type PaginationRangeItem = number | 'ellipsis-start' | 'ellipsis-end'

// The pages a pagination bar shows: the first, the last and `siblings` either
// side of the current one, with an ellipsis for each gap. A gap of a single
// page shows that page instead, since an ellipsis would take the same room.
// The two ellipses are distinct values so they can key a list on their own.
export function paginationRange(
  current: number,
  total: number,
  siblings = 1,
): PaginationRangeItem[] {
  const pages = new Set([1, total])
  for (let page = current - siblings; page <= current + siblings; page++) {
    if (page >= 1 && page <= total) pages.add(page)
  }

  const range: PaginationRangeItem[] = []
  for (const page of [...pages].sort((a, b) => a - b)) {
    const previous = range.at(-1)
    if (typeof previous === 'number' && page - previous === 2) {
      range.push(previous + 1)
    } else if (typeof previous === 'number' && page - previous > 2) {
      range.push(range.length === 1 ? 'ellipsis-start' : 'ellipsis-end')
    }
    range.push(page)
  }
  return range
}