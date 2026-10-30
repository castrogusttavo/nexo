import { ArrowUp03Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Exportações | Nexo',
}

export const instant = true

export default function SettingsExportsPage() {
  return <SettingsPlaceholderPage title='Exportações' icon={ArrowUp03Icon} />
}
