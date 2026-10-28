import type { ReactNode } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { Title } from '../_components/text/title'
import { WebFooter } from '../_components/web-footer'
import { linkifyLegalText } from './linkify-legal-text'
import { SectionHeading } from './section-heading'

export interface LegalBlock {
  heading?: string
  paragraphs: string[]
}

export interface LegalSection {
  id: string
  title: string
  /** Paragraphs before the section's blocks. */
  intro?: string[]
  blocks?: LegalBlock[]
}

// The anchor of a block heading. Other pages and the cookie banner link to
// these ids, so they must never change: by default the section id plus the
// heading's first word; with `numberedBlocks`, the block's 1-based position.
function blockAnchor(
  sectionId: string,
  block: LegalBlock,
  index: number,
  numbered: boolean,
) {
  if (numbered) return `${sectionId}-${index + 1}`
  return `${sectionId}-${block.heading?.split(' ')[0]}`
}

// Every legal page: title and version, the preamble, the numbered sections
// and the footer. Pages with a shape of their own (a table of
// sub-processors) add it as children, after the sections.
export function LegalDocument({
  title,
  version,
  preamble,
  sections = [],
  numberedBlocks = false,
  children,
}: {
  title: string
  version: string
  preamble: string[]
  sections?: LegalSection[]
  numberedBlocks?: boolean
  children?: ReactNode
}) {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>{title}</Title>
          <Muted>Versão {version}</Muted>
        </header>

        <section className='flex flex-col gap-4'>
          {preamble.map((paragraph) => (
            <P key={paragraph}>{linkifyLegalText(paragraph)}</P>
          ))}
        </section>

        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className='flex flex-col gap-4'
          >
            <SectionHeading as='h2' id={section.id} className='pt-12 pb-6'>
              {section.title}
            </SectionHeading>
            {section.intro?.map((paragraph) => (
              <P key={paragraph}>{linkifyLegalText(paragraph)}</P>
            ))}
            {section.blocks?.map((block, index) => {
              const anchor = block.heading
                ? blockAnchor(section.id, block, index, numberedBlocks)
                : undefined
              return (
                <div
                  key={block.heading ?? block.paragraphs[0]}
                  id={numberedBlocks ? anchor : undefined}
                  className='flex flex-col gap-2'
                >
                  {block.heading && (
                    <SectionHeading
                      as='h3'
                      id={blockAnchor(section.id, block, index, numberedBlocks)}
                      className='text-lg font-medium pb-3'
                    >
                      {block.heading}
                    </SectionHeading>
                  )}
                  {block.paragraphs.map((paragraph) => (
                    <P key={paragraph}>{linkifyLegalText(paragraph)}</P>
                  ))}
                </div>
              )
            })}
          </section>
        ))}

        {children}
      </main>
      <WebFooter showBanner={false} />
    </>
  )
}
