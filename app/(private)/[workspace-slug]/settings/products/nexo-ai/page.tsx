import { SparklesIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Nexo AI | Nexo',
}

export const instant = true

export default function SettingsNexoAiPage() {
  return <SettingsPlaceholderPage title='Nexo AI' icon={SparklesIcon} />
}
