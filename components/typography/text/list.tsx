import { cn } from '@/lib/utils'

interface ListProps {
  children: React.ReactNode
  className?: string
}

export function UnorderedList({ children, className }: ListProps) {
  return (
    <ul className={cn('my-6 ml-6 list-disc [&>li]:mt-2', className)}>
      {children}
    </ul>
  )
}

export function OrderedList({ children, className }: ListProps) {
  return (
    <ol className={cn('my-6 ml-6 list-decimal [&>li]:mt-2', className)}>
      {children}
    </ol>
  )
}

export function ListItem({ children, className }: ListProps) {
  return <li className={cn('text-primary', className)}>{children}</li>
}
