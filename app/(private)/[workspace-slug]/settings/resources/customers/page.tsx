import { BlockGameIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Modelos | Nexo',
}

export const instant = true

export default function SettingsTemplatesPage() {
  return <SettingsPlaceholderPage title='Modelos' icon={BlockGameIcon} />
}
