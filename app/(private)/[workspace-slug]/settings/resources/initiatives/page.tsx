import { BulbIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Iniciativas | Nexo',
}

export const instant = true

export default function SettingsInitiativesPage() {
  return <SettingsPlaceholderPage title='Iniciativas' icon={BulbIcon} />
}
