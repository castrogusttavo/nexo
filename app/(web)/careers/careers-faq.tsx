'use client'

import { useState } from 'react'
import { JsonLd } from '@/components/seo/json-ld'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'

// Fonte única: o Accordion e o schema FAQPage abaixo renderizam a partir
// deste array, pra nunca ficarem dessincronizados.
const CAREERS_FAQ_ITEMS = [
  {
    question: 'Nada das vagas combina comigo. Ainda assim vale escrever?',
    answer:
      'Vale sim. Escreva contando o que você construiria aqui e por que isso importa pra você. Se preferir pular o texto, mostre alguma coisa que você já construiu — um projeto pessoal, uma contribuição, o que for. Isso conta mais do que uma carta de apresentação.',
  },
  {
    question: 'Uma IA vai decidir se eu entro?',
    answer:
      'Não. Contratação segue o mesmo princípio que usamos pra construir o produto: agentes cuidam do trabalho repetitivo, pessoas cuidam do julgamento. Agentes ajudam a agendar, transcrever e organizar. Uma pessoa lê cada candidatura, pessoas conduzem cada conversa, e quem trabalhou com você no work trial é quem decide.',
  },
  {
    question: 'O que é o work trial?',
    answer:
      'A última etapa do nosso processo: de dois a cinco dias remunerados de trabalho real com o time que você entraria, no seu ritmo, com o valor combinado por escrito antes de você aceitar — e você recebe independente do resultado. Ele avalia a gente tanto quanto avalia você.',
  },
  {
    question: 'Estou no começo da carreira pra essas vagas?',
    answer:
      'Contratamos por trajetória e evidência de construção, não por anos de experiência. Se você já entregou coisas, mostre essas coisas — projeto pessoal, contribuição em algum lugar, obsessão pessoal que virou algo real, tudo conta. Não existe exigência de senioridade pra mostrar o que você fez.',
  },
]

const CAREERS_FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: CAREERS_FAQ_ITEMS.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
}

export function CareersFaq() {
  const [value, setValue] = useState<string[]>(['item-1'])

  return (
    <div className='flex items-start justify-between gap-6 w-full mx-auto px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384 py-16 md:py-24'>
      <JsonLd data={CAREERS_FAQ_SCHEMA} />
      <div className='space-y-6'>
        <Title as='h2' className='text-4xl font-medium'>
          Perguntas que você pode ter
        </Title>
        <SubTitle>
          Qualquer coisa que não foi respondida aqui, manda pra
          vagas@nexo.coodee.dev, e alguém do nosso time responde.
        </SubTitle>
      </div>
      <Accordion
        className='max-w-5xl mx-auto flex flex-col'
        value={value}
        onValueChange={(newValue) => {
          if (newValue.length === 0) return
          setValue(newValue)
        }}
      >
        {CAREERS_FAQ_ITEMS.map(({ question, answer }, index) => (
          <AccordionItem
            key={question}
            value={`item-${index + 1}`}
            className='data-open:bg-card p-4'
          >
            <AccordionTrigger className='w-full text-base hover:no-underline data-open:bg-card pt-0'>
              {question}
            </AccordionTrigger>
            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
