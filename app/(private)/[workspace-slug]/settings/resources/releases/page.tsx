import { BoatIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Lançamentos | Nexo',
}

export const instant = true

export default function SettingsReleasesPage() {
  return <SettingsPlaceholderPage title='Lançamentos' icon={BoatIcon} />
}
