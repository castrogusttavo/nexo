import type { Metadata } from 'next'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { linkifyLegalText } from '../linkify-legal-text'
import { SectionHeading } from '../section-heading'

const TITLE = 'Termos de Uso de IA | Nexo'
const DESCRIPTION =
  'Como os agentes de IA operam dentro do Nexo e os limites desse uso.'
const VERSION = '2026-09-09'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/ai-terms' },
  openGraph: {
    type: 'website',
    url: '/legals/ai-terms',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/twitter-image'],
  },
}

interface Block {
  heading?: string
  paragraphs: string[]
}

interface LegalSection {
  id: string
  title: string
  blocks: Block[]
}

const PREAMBLE = [
  'Estes Termos de Uso de IA regem o uso do Nexo AI e de qualquer outra funcionalidade baseada em IA do Serviço ("Funcionalidades de IA"), e são incorporados aos Termos de Serviço por referência. Em caso de conflito específico sobre IA, este documento prevalece sobre os Termos.',
]

const SECTIONS: LegalSection[] = [
  {
    id: 'visao-geral',
    title: '1. Visão geral',
    blocks: [
      {
        paragraphs: [
          'O Nexo AI ajuda em tarefas como geração e resumo de conteúdo, triagem, e automação de fluxos de trabalho dentro do Serviço.',
        ],
      },
    ],
  },
  {
    id: 'como-funciona',
    title: '2. Como as Funcionalidades de IA funcionam',
    blocks: [
      {
        paragraphs: [
          'No Nexo Cloud, suas entradas ("Entrada de IA") são enviadas a provedores terceiros de IA, listados como sub-processadores em nexopm.com/legals/sub-processors, e processadas para gerar uma resposta ("Resultado de IA"). Entrada e Resultado de IA são tratados como Dados do Cliente, sujeitos às mesmas proteções contratuais e de segurança.',
        ],
      },
    ],
  },
  {
    id: 'uso-de-dados',
    title: '3. Uso de dados e treinamento',
    blocks: [
      {
        paragraphs: [
          'O Nexo não usa Dados do Cliente para treinar ou ajustar modelos de IA de propósito geral — nem os nossos, nem os de terceiros. Cada processamento é isolado por Cliente e não é compartilhado entre workspaces. Nossos acordos com sub-processadores de IA proíbem reter Entrada ou Resultado de IA além do necessário pra gerar a resposta, exceto quando exigido por lei ou para investigação de abuso.',
        ],
      },
    ],
  },
  {
    id: 'precisao-e-limitacoes',
    title: '4. Precisão e limitações',
    blocks: [
      {
        paragraphs: [
          'Resultados de IA são probabilísticos e podem ser imprecisos, incompletos ou inadequados. Você deve revisar e validar qualquer Resultado de IA antes de usá-lo. É proibido usar Resultado de IA como base única para decisões automatizadas de alto risco (emprego, crédito, seguro, moradia, educação ou segurança pública) sem supervisão humana efetiva — decisões consequentes exigem revisão de uma pessoa.',
        ],
      },
    ],
  },
  {
    id: 'propriedade-intelectual',
    title: '5. Propriedade sobre resultados gerados',
    blocks: [
      {
        paragraphs: [
          'O Cliente é titular do Resultado de IA gerado a partir dos seus próprios Dados do Cliente, na mesma medida em que já é titular dos Dados do Cliente que o originaram. O Nexo não reivindica propriedade intelectual sobre Resultados de IA e não garante que eles sejam originais ou livres de violação de direitos de terceiros — o Cliente assume esse risco ao usar o Resultado de IA fora do Serviço.',
        ],
      },
    ],
  },
  {
    id: 'limitacoes-e-uso-responsavel',
    title: '6. Limitações e uso responsável',
    blocks: [
      {
        paragraphs: [
          'O Nexo aplica filtros técnicos razoáveis, mas o Cliente continua responsável por monitorar o uso das Funcionalidades de IA na sua organização e por cumprir a legislação aplicável ao uso de IA na sua jurisdição. Funcionalidades de IA em fase beta são fornecidas "no estado em que se encontram", sem SLA nem obrigação de suporte, conforme a Seção 2.7 dos Termos.',
        ],
      },
    ],
  },
  {
    id: 'contato',
    title: '7. Contato',
    blocks: [
      {
        paragraphs: [
          'Dúvidas sobre estes Termos de Uso de IA: Nexo Software, Inc., e-mail juridico@nexopm.com.',
        ],
      },
    ],
  },
]

export default function AiTermsPage() {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>Termos de Uso de IA</Title>
          <Muted>Versão {VERSION}</Muted>
        </header>

        <section className='flex flex-col gap-4'>
          {PREAMBLE.map((paragraph) => (
            <P key={paragraph}>{linkifyLegalText(paragraph)}</P>
          ))}
        </section>

        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className='flex flex-col gap-4'
          >
            <SectionHeading as='h2' id={section.id} className='pt-12 pb-6'>
              {section.title}
            </SectionHeading>
            {section.blocks.map((block) => (
              <div
                key={block.heading ?? block.paragraphs[0]}
                className='flex flex-col gap-2'
              >
                {block.heading && (
                  <SectionHeading
                    as='h3'
                    id={`${section.id}-${block.heading.split(' ')[0]}`}
                    className='text-lg font-medium pb-3'
                  >
                    {block.heading}
                  </SectionHeading>
                )}
                {block.paragraphs.map((paragraph) => (
                  <P key={paragraph}>{linkifyLegalText(paragraph)}</P>
                ))}
              </div>
            ))}
          </section>
        ))}
      </main>
      <WebFooter showBanner={false} />
    </>
  )
}
