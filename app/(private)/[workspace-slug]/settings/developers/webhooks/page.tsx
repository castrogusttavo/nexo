import { WebhookIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Webhooks | Nexo',
}

export const instant = true

export default function SettingsWebhooksPage() {
  return <SettingsPlaceholderPage title='Webhooks' icon={WebhookIcon} />
}
