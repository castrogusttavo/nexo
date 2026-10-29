import Link from 'next/link'
import { Muted } from '@/components/typography/text/muted'
import { cn } from '@/lib/utils'
import { formatPostDate } from '@/src/lib/blog/format-ṕost-date'
import type { ChangelogEntryDTO } from '@/types/changelog-entry'
import { ChangelogAccordion } from './changelog-accordion'
import { ChangelogTag } from './changelog-tag'

export function ChangelogEntry({
  entry,
  latest = false,
}: {
  entry: ChangelogEntryDTO
  latest?: boolean
}) {
  const date = <time dateTime={entry.date}>{formatPostDate(entry.date)}</time>

  return (
    <article className='w-full flex flex-col md:flex-row gap-10'>
      <div className='relative hidden shrink-0 md:block lg:w-100'>
        <div className='absolute top-0 bottom-0 left-3 -z-10 w-0.5 bg-muted' />
        <div className='sticky top-20 flex items-center gap-4 pl-1.5'>
          <div
            className={cn(
              'rounded-full size-3',
              latest ? 'bg-branding-800' : 'bg-muted-foreground',
            )}
          />
          <Muted>{date}</Muted>
        </div>
      </div>
      <div className='flex w-full min-w-0 flex-col gap-2 pt-1 pb-20'>
        <Muted className='block shrink-0 md:hidden'>{date}</Muted>
        <h2 className='font-medium text-4xl'>
          <Link href={`/changelog/${entry.slug}`} className='hover:underline'>
            {entry.title}
          </Link>
        </h2>
        <ChangelogEntryBody entry={entry} className='my-6' />
      </div>
    </article>
  )
}

// What an entry says: the tagged news from the Markdown body, then the
// improvements and fixes. The list and the entry's own page share it.
export function ChangelogEntryBody({
  entry,
  className,
}: {
  entry: ChangelogEntryDTO
  className?: string
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {entry.contentHtml && (
        <>
          <ChangelogTag variant='new'>Novidades</ChangelogTag>
          <div
            className='prose prose-neutral dark:prose-invert max-w-none prose-headings:font-medium prose-h2:text-3xl prose-h3:text-3xl prose-a:text-branding-500 prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl'
            // html is sanitized via rehype-sanitize in src/lib/changelog.ts
            // react-doctor-disable-next-line react-doctor/dangerous-html-sink
            dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
          />
        </>
      )}
      {(entry.improvements.length > 0 || entry.fixes.length > 0) && (
        <div>
          {entry.improvements.length > 0 && (
            <ChangelogAccordion title='Melhorias' items={entry.improvements} />
          )}
          {entry.fixes.length > 0 && (
            <ChangelogAccordion title='Correções' items={entry.fixes} />
          )}
        </div>
      )}
    </div>
  )
}
