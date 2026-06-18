import { LUCIDE_ICONS } from './modal/lucide-icons'

interface ProjectEmojiProps {
  value: string | null | undefined
  size?: number
  fallback?: string
}

export function ProjectEmoji({
  value,
  size = 20,
  fallback = '📁',
}: ProjectEmojiProps) {
  if (!value) return <>{fallback}</>

  const [name, color] = value.includes(':')
    ? value.split(':', 2)
    : [value, undefined]

  const lucide = LUCIDE_ICONS.find((i) => i.name === name)
  if (lucide) {
    const Icon = lucide.icon
    return <Icon size={size} color={color} />
  }

  return <>{value}</>
}
