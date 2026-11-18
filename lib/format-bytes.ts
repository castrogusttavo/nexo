const UNITS = ['B', 'KB', 'MB', 'GB'] as const

const numberFormat = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
})

/** 1536 -> "1,5 KB". Bytes stay whole; everything above gets one decimal. */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${numberFormat.format(value)} ${UNITS[unit]}`
}
