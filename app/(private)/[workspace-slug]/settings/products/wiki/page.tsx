import { StickyNote03Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import { SettingsPlaceholderPage } from '@/app/(private)/_components/settings-placeholder-page'

export const metadata: Metadata = {
  title: 'Wiki | Nexo',
}

export const instant = true

export default function SettingsWikiPage() {
  return <SettingsPlaceholderPage title='Wiki' icon={StickyNote03Icon} />
}
