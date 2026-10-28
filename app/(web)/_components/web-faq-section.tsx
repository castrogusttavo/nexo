'use client'

import { useState } from 'react'
import { JsonLd } from '@/components/seo/json-ld'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SubTitle } from './text/sub-title'
import { Title } from './text/title'

export type WebFaqItem = { question: string; answer: string }

// The FAQ block of the marketing pages. The accordion and the FAQPage
// schema both render from `items`, so they never fall out of sync.
export function WebFaqSection({
  title,
  subtitle,
  items,
}: {
  title: string
  subtitle: string
  items: WebFaqItem[]
}) {
  // One answer always stays open.
  const [value, setValue] = useState<string[]>(['item-1'])

  return (
    <section className='flex flex-col md:flex-row items-start justify-between gap-6 w-full mx-auto px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384 py-16 md:py-24'>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: { '@type': 'Answer', text: answer },
          })),
        }}
      />
      <div className='space-y-6'>
        <Title as='h2' className='text-4xl font-medium'>
          {title}
        </Title>
        <SubTitle>{subtitle}</SubTitle>
      </div>
      <Accordion
        className='max-w-5xl mx-auto flex flex-col'
        value={value}
        onValueChange={(newValue) => {
          if (newValue.length === 0) return
          setValue(newValue)
        }}
      >
        {items.map(({ question, answer }, index) => (
          <AccordionItem
            key={question}
            value={`item-${index + 1}`}
            className='p-4'
          >
            <AccordionTrigger className='w-full text-base hover:no-underline pt-0'>
              {question}
            </AccordionTrigger>
            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
