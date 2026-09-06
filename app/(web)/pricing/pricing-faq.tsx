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
const PRICING_FAQ_ITEMS = [
  {
    question: 'O que é o Nexo?',
    answer:
      'O Nexo é uma plataforma de gerenciamento de projetos que ajuda equipes a colaborar, acompanhar o progresso e entregar projetos com eficiência. Ele combina gerenciamento de projetos, wiki e formulários de solicitação em uma plataforma unificada.',
  },
  {
    question: 'O Nexo é gratuito?',
    answer:
      'Sim. O Nexo oferece um plano gratuito bastante completo com os principais recursos para até 12 usuários. Também disponibilizamos planos pagos para funcionalidades avançadas, necessidades corporativas e suporte prioritário.',
  },
  {
    question: 'Posso hospedar o Nexo na minha própria infraestrutura?',
    answer:
      'Sim. No plano Enterprise oferecemos implantações privadas e gerenciadas: o Nexo rodando na sua própria infraestrutura, com mais controle e privacidade, implantado e mantido pela nossa equipe. Fale com vendas para conhecer as opções.',
  },
  {
    question: 'Quais integrações o Nexo oferece?',
    answer:
      'O Nexo integra-se com ferramentas populares como GitHub, GitLab, Slack, Sentry e Draw.io para simplificar seu fluxo de trabalho e manter sua equipe conectada.',
  },
  {
    question: 'Como migrar de outras ferramentas de gerenciamento de projetos?',
    answer:
      'Disponibilizamos importadores para plataformas como Jira, Linear, Asana e ClickUp, além de importação via CSV. Nossa equipe também pode auxiliar durante todo o processo de migração.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer:
      'A segurança é nossa prioridade. Utilizamos criptografia seguindo os padrões do setor, realizamos auditorias de segurança regularmente e adotamos boas práticas para proteger seus dados, em conformidade com a LGPD.',
  },
]

const PRICING_FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: PRICING_FAQ_ITEMS.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
}

export function PricingFaq() {
  const [value, setValue] = useState<string[]>(['item-1'])

  return (
    <div className='flex items-start justify-between gap-6 w-full mx-auto px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384 py-16 md:py-24'>
      <JsonLd data={PRICING_FAQ_SCHEMA} />
      <div className='space-y-6'>
        <Title as='h2' className='text-4xl font-medium'>
          O que podemos responder por você hoje?
        </Title>
        <SubTitle>
          Qualquer coisa que não foi respondida aqui, manda pra
          suporte@nexo.coodee.dev, e alguém do nosso time responde.
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
        {PRICING_FAQ_ITEMS.map(({ question, answer }, index) => (
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
