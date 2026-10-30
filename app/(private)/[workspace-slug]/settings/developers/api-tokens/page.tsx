import { Key01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Tokens de API | Nexo',
}

export const instant = true

export default function SettingsApiTokensPage() {
  return <SettingsPlaceholderPage title='Tokens de API' icon={Key01Icon} />
}
