import { ArrowLeft02Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChangelogCopyLinkButton } from '@/app/_components/changelog/changelog-copy-link-button'
import { ChangelogEntryBody } from '@/app/_components/changelog/changelog-entry'
import { CopyMarkdownButton } from '@/components/copy-markdown-button'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { formatPostDate } from '@/src/lib/blog/format-ṕost-date'
import {
  getAllChangelogEntries,
  getChangelogEntry,
  getRecentChangelogEntries,
} from '@/src/lib/changelog'
import { WebFooter } from '../../_components/web-footer'

interface Props {
  params: Promise<{ slug: string }>
}

// Every entry is a file in the build, so every slug is known up front and each
// page prerenders. An unknown slug renders at request time to answer a real
// 404, which is why the validator must not treat params as blocking here.
export const instant = false

// Cache Components refuses an empty list at build time, so an empty changelog
// prerenders one placeholder instead. Its underscores can never match an entry
// (the slug schema allows only [a-z0-9-]), so it renders the 404.
const PLACEHOLDER_SLUG = '__placeholder__'

export async function generateStaticParams() {
  const entries = await getAllChangelogEntries()
  if (entries.length === 0) return [{ slug: PLACEHOLDER_SLUG }]
  return entries.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const entry = await getChangelogEntry(slug)
  if (!entry) return { title: 'Novidade não encontrada | Nexo' }

  const title = `${entry.title} | Changelog Nexo`
  return {
    title,
    description: entry.summary,
    alternates: { canonical: `/changelog/${entry.slug}` },
    openGraph: {
      type: 'article',
      url: `/changelog/${entry.slug}`,
      title,
      description: entry.summary,
      publishedTime: entry.date,
    },
  }
}

export default async function ChangelogEntryPage({ params }: Props) {
  const { slug } = await params
  const entry = await getChangelogEntry(slug)
  if (!entry) notFound()
  const recent = await getRecentChangelogEntries(entry.slug)

  return (
    <>
      <main className='mx-auto w-full flex flex-col items-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10 pt-8 lg:pt-20'>
        <article className='mx-auto w-full max-w-187.5'>
          <Link
            href='/changelog'
            className='hover:underline flex gap-2 items-center font-medium text-sm w-fit'
          >
            <NexoIcon icon={ArrowLeft02Icon} strokeWidth={2} />
            Back to Changelog
          </Link>
          <div className='pt-5'>
            <h1 className='text-4xl font-semibold'>{entry.title}</h1>
            <div className='w-full flex items-center justify-between gap-4 pt-5 md:pt-6'>
              <Muted>
                <time dateTime={entry.date}>{formatPostDate(entry.date)}</time>
              </Muted>
              <div className='flex items-center gap-2'>
                <ChangelogCopyLinkButton path={`/changelog/${entry.slug}`} />
                <CopyMarkdownButton
                  markdown={entry.markdown}
                  variant='outline'
                  size='lg'
                />
              </div>
            </div>
          </div>
          <hr className='mt-8' />
          <ChangelogEntryBody entry={entry} className='mt-6' />
        </article>
        {recent.length > 0 && (
          <section className='w-full mx-auto'>
            <h2 className='text-3xl font-semibold'>Recent Changelog</h2>
            <div className='pt-8 pb-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
              {recent.map((item) => (
                <Link
                  key={item.slug}
                  href={`/changelog/${item.slug}`}
                  className='border-2 border-muted flex flex-col gap-2 rounded-xl p-6 transition-colors hover:border-border'
                >
                  <Muted>
                    <time dateTime={item.date}>
                      {formatPostDate(item.date)}
                    </time>
                  </Muted>
                  <h3 className='font-medium'>{item.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <WebFooter />
    </>
  )
}
