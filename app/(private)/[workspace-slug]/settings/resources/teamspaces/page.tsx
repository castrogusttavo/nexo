import { UserMultipleIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Espaços de equipe | Nexo',
}

export const instant = true

export default function SettingsTeamspacesPage() {
  return (
    <SettingsPlaceholderPage
      title='Espaços de equipe'
      icon={UserMultipleIcon}
    />
  )
}
