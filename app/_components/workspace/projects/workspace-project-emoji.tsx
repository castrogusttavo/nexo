import { LUCIDE_ICONS } from './modal/lucide-icons'

interface WorkspaceProjectEmojiProps {
  value: string | null | undefined
  size?: number
  fallback?: string
}

export function WorkspaceProjectEmoji({
  value,
  size = 24,
  fallback = '📁',
}: WorkspaceProjectEmojiProps) {
  if (!value) return <>{fallback}</>

  const [name, color] = value.includes(':')
    ? value.split(':', 2)
    : [value, undefined]

  const lucide = LUCIDE_ICONS.find((i) => i.name === name)
  if (lucide) {
    const Icon = lucide.icon
    return <Icon size={size} color={color} strokeWidth={2} />
  }

  return <>{value}</>
}
