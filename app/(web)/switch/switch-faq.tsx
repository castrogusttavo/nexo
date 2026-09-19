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

// Single source of truth: the Accordion and the FAQPage schema below render
// from this array, so they never fall out of sync.
const SWITCH_FAQ_ITEMS = [
  {
    question:
      'Como sabemos se o Nexo se encaixa no jeito que nosso time trabalha?',
    answer:
      'Comece pela comparação com a sua ferramenta atual, depois teste um projeto representativo no Nexo. Confira os estados, campos, views, permissões e integrações que o seu time usa antes de planejar uma migração maior.',
  },
  {
    question: 'O que vamos precisar configurar no Nexo?',
    answer:
      'Planeje configurar e testar workflows, permissões, views, dashboards, automações e integrações no Nexo. Valide a configuração com quem usa isso no dia a dia.',
  },
  {
    question: 'Podemos testar um projeto antes de migrar o time inteiro?',
    answer:
      'Sim. Use um projeto piloto pra validar seus dados, testar workflows e estimar o tempo necessário pra migração maior. Mantenha sua ferramenta atual disponível durante essa avaliação.',
  },
  {
    question: 'Podemos manter o Nexo na nossa própria infraestrutura?',
    answer:
      'Hoje o Nexo roda 100% na nuvem. Self-hosted e air-gapped estão no nosso roadmap — fale com a gente se isso for um requisito pro seu time.',
  },
  {
    question: 'O Nexo ajuda com uma migração mais complexa?',
    answer:
      'Sim. Conta pra gente o seu setup atual, os workflows necessários e as necessidades de hospedagem, e a gente ajuda a planejar a migração e escolher o plano certo.',
  },
  {
    question: 'E se ainda estamos pagando pela nossa ferramenta atual?',
    answer:
      'Fale com o nosso time de vendas sobre o seu contrato atual — a gente vê juntos o que faz sentido pra sua migração. Dá pra avaliar o Nexo enquanto essa conversa acontece.',
  },
  {
    question: 'Podemos levar nossos dados se sairmos do Nexo?',
    answer:
      'Sim. Exporte seus itens de trabalho e páginas quando quiser — você não fica preso à gente.',
  },
]

const SWITCH_FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: SWITCH_FAQ_ITEMS.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
}

export function SwitchFaq() {
  const [value, setValue] = useState<string[]>(['item-1'])

  return (
    <section className='flex flex-col md:flex-row items-start justify-between gap-6 w-full mx-auto px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384 py-16 md:py-24'>
      <JsonLd data={SWITCH_FAQ_SCHEMA} />
      <div className='space-y-6'>
        <Title as='h2' className='text-4xl font-medium'>
          Perguntas frequentes
        </Title>
        <SubTitle>
          O que checar, o que migra e como trazer seu time pro Nexo.
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
        {SWITCH_FAQ_ITEMS.map(({ question, answer }, index) => (
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
