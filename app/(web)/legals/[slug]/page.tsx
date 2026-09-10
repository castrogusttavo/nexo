import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { COOKIES_VERSION } from '@/lib/legal/versions'
import { getLegalDocBySlug } from '@/src/lib/legal/legal-doc'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = await getLegalDocBySlug(slug)
  if (!doc) return { title: 'Documento não encontrado | Nexo' }

  const title = `${doc.title} | Nexo`

  return {
    title,
    description: doc.summary,
    alternates: { canonical: `/legals/${doc.slug}` },
    openGraph: {
      type: 'website',
      url: `/legals/${doc.slug}`,
      title,
      description: doc.summary,
      images: ['/opengraph-image'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: doc.summary,
      images: ['/twitter-image'],
    },
  }
}

export default async function LegalDocPage({ params }: Props) {
  const { slug } = await params
  const doc = await getLegalDocBySlug(slug)
  if (!doc) notFound()

  // COOKIES_VERSION is recorded in ConsentEvent at sign-up (src/lib/auth.ts) —
  // the version shown here must come from this constant, not the frontmatter,
  // so it never diverges from what consent actually recorded.
  const version =
    doc.slug === 'cookie-policy' ? COOKIES_VERSION : doc.date.slice(0, 10)

  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2 text-left'>
        <H1 className='text-left'>{doc.title}</H1>
        <Muted>Versão {version}</Muted>
      </header>

      <div className='rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4'>
        <P className='mt-0 text-sm'>
          Este documento está em rascunho e pendente de revisão jurídica. O
          texto final será publicado antes da exigência de aceite em produção. A
          estrutura abaixo lista as seções planejadas.
        </P>
      </div>

      <div
        className='legal-content prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-primary prose-p:text-primary'
        // html is sanitized via rehype-sanitize in src/lib/legal/legal-doc.ts
        // before it gets here
        dangerouslySetInnerHTML={{ __html: doc.contentHtml }}
      />
    </main>
  )
}
