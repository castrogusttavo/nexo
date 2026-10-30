import { AlarmClockIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Worklogs | Nexo',
}

export const instant = true

export default function SettingsWorklogsPage() {
  return <SettingsPlaceholderPage title='Worklogs' icon={AlarmClockIcon} />
}
