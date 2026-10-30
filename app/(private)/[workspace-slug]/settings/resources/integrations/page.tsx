import { GitMergeIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Integrações | Nexo',
}

export const instant = true

export default function SettingsIntegrationsPage() {
  return <SettingsPlaceholderPage title='Integrações' icon={GitMergeIcon} />
}
