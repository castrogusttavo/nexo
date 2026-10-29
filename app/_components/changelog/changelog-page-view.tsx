import { notFound } from 'next/navigation'
import { ChangelogEntry } from '@/app/_components/changelog/changelog-entry'
import { ChangelogPagination } from '@/app/_components/changelog/changelog-pagination'
import { SubTitle } from '@/app/(web)/_components/text/sub-title'
import { Title } from '@/app/(web)/_components/text/title'
import { WebFooter } from '@/app/(web)/_components/web-footer'
import { Muted } from '@/components/typography/text/muted'
import { getChangelogPage } from '@/src/lib/changelog'

export const CHANGELOG_DESCRIPTION =
  'Acompanhe as novidades, melhorias e correções que chegam ao Nexo.'

// /changelog and /changelog/page/:n render the same list, one page each.
export async function ChangelogPageView({ page }: { page: number }) {
  const result = await getChangelogPage(page)
  if (!result) notFound()

  return (
    <>
      <main className='mx-auto w-full flex flex-col items-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10'>
        <section className='w-full py-16 space-y-6'>
          <div className='text-branding-600 text-sm md:whitespace-pre-line mb-4'>
            Novidades
          </div>
          <Title className='text-6xl font-semibold'>Changelog</Title>
          <SubTitle className='text-lg'>{CHANGELOG_DESCRIPTION}</SubTitle>
        </section>
        <section className='w-full'>
          {result.entries.length === 0 ? (
            <Muted>Nenhuma novidade publicada ainda.</Muted>
          ) : (
            result.entries.map((entry, index) => (
              <ChangelogEntry
                key={entry.slug}
                entry={entry}
                latest={page === 1 && index === 0}
              />
            ))
          )}
        </section>
        <ChangelogPagination page={page} totalPages={result.totalPages} />
      </main>
      <WebFooter />
    </>
  )
}
