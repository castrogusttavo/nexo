const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const

export function formatPostDate(isoDate: string) {
  const date = new Date(isoDate)
  return `${date.getUTCDate()} ${MONTH_LABELS[date.getUTCMonth()]}, ${date.getUTCFullYear()}`
}
