import type { ReactNode } from 'react'
import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import { cn } from '@/lib/utils'

const WIDTH = {
  // Project settings: a centred column.
  narrow: 'py-9 w-full max-w-225 mx-auto',
  // Workspace settings: tables that use the whole pane.
  full: 'w-full p-6',
} as const

type SettingsPageHeaderProps = {
  title: string
  description?: ReactNode
  /** Sits at the right of the title, e.g. an "Adicionar" button. */
  action?: ReactNode
}

// Every settings page: the same title block and the same spacing, so the
// pages read as one section of the app.
export function SettingsPage({
  width = 'narrow',
  className,
  children,
  ...header
}: SettingsPageHeaderProps & {
  width?: keyof typeof WIDTH
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn(WIDTH[width], 'flex flex-col gap-6', className)}>
      <SettingsPageHeader {...header} />
      {children}
    </div>
  )
}

export function SettingsPageHeader({
  title,
  description,
  action,
}: SettingsPageHeaderProps) {
  return (
    <div className='flex items-center justify-between gap-4'>
      <div>
        <H3>{title}</H3>
        {description && <Muted>{description}</Muted>}
      </div>
      {action}
    </div>
  )
}
