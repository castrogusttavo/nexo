const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })

export function formatRelativeTime(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)
  const months = Math.round(days / 30)
  const years = Math.round(months / 12)
  
  if (Math.abs(years) >= 1) return formatter.format(years, 'year')
  if (Math.abs(months) >= 1) return formatter.format(months, 'month')
  if (Math.abs(days) >= 1) return formatter.format(days, 'day')
  if (Math.abs(hours) >= 1) return formatter.format(hours, 'hour')
  if (Math.abs(minutes) >= 1) return formatter.format(minutes, 'minute')
  return formatter.format(seconds, 'second')
}