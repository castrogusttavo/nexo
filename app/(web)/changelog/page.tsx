import type { Metadata } from 'next'
import { ChangelogPageView } from '@/app/_components/changelog/changelog-page-view'

const TITLE = 'Changelog | Nexo'
const DESCRIPTION =
  'Acompanhe as novidades, melhorias e correções que chegam ao Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/changelog' },
  openGraph: {
    type: 'website',
    url: '/changelog',
    title: TITLE,
    description: DESCRIPTION,
  },
}

// The entries are build-time files behind a 'use cache' reader, so the page
// prerenders whole and navigations into it are instant.
export const instant = true

export default function ChangelogPage() {
  return <ChangelogPageView page={1} />
}
