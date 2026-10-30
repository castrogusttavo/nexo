import { ArrowDown03Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Importações | Nexo',
}

export const instant = true

export default function SettingsImportsPage() {
  return <SettingsPlaceholderPage title='Importações' icon={ArrowDown03Icon} />
}
