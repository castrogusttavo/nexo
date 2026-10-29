import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  CHANGELOG_DESCRIPTION,
  ChangelogPageView,
} from '@/app/_components/changelog/changelog-page-view'
import { changelogPageHref } from '@/app/_components/changelog/changelog-pagination'
import { getChangelogPageCount } from '@/src/lib/changelog'

interface Props {
  params: Promise<{ page: string }>
}

// Every page of the list is known at build time and prerendered. Page 1 is
// listed too (cacheComponents refuses an empty list while the changelog fits
// on one page) and points its canonical at /changelog. An unknown page renders
// at request time to answer a real 404.
export const instant = false

export async function generateStaticParams() {
  const total = await getChangelogPageCount()
  return Array.from({ length: total }, (_, index) => ({
    page: String(index + 1),
  }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params
  return {
    title: `Changelog, página ${page} | Nexo`,
    description: CHANGELOG_DESCRIPTION,
    alternates: { canonical: changelogPageHref(Number(page)) },
  }
}

export default async function ChangelogPaginatedPage({ params }: Props) {
  const { page } = await params
  const number = Number(page)
  // "02" or "2.0" would render page 2 under another URL; only the canonical
  // spelling exists.
  if (String(number) !== page) notFound()

  return <ChangelogPageView page={number} />
}
