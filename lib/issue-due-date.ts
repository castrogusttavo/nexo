export function getDueDateColorClass(dueDate: string | null): string | undefined {
  if (!dueDate) return undefined

  const due = new Date(dueDate)
  const today = new Date()

  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const diffDays = Math.round((dueDay.getTime() - todayDay.getTime()) / 86_400_000)

  if (diffDays < 0) return 'text-red-500'
  if (diffDays === 0) return 'text-yellow-500'
  return undefined
}
