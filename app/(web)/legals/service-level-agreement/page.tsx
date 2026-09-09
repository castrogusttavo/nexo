import type { Metadata } from 'next'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { linkifyLegalText } from '../linkify-legal-text'
import { SectionHeading } from '../section-heading'

const TITLE = 'Acordo de Nível de Serviço | Nexo'
const DESCRIPTION =
  'O compromisso de disponibilidade, suporte e créditos de serviço do Nexo.'
const VERSION = '2026-09-09'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/service-level-agreement' },
  openGraph: {
    type: 'website',
    url: '/legals/service-level-agreement',
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
  'Este Acordo de Nível de Serviço ("SLA") se aplica ao Nexo Cloud e é incorporado aos Termos de Serviço por referência. Ele não se aplica a implantações self-hosted ou air-gapped, cuja disponibilidade depende da infraestrutura do próprio Cliente.',
]

const SECTIONS: LegalSection[] = [
  {
    id: 'disponibilidade',
    title: '1. Compromisso de disponibilidade',
    blocks: [
      {
        paragraphs: [
          'Nos planos Business e Enterprise, o Nexo se compromete com uma Disponibilidade Mensal de 99,5%, com créditos de serviço em caso de descumprimento, conforme a Seção 5. No plano Pro, 99,5% é a meta perseguida, mas sem o compromisso financeiro dos planos superiores. O plano Free é fornecido sem garantia de disponibilidade.',
        ],
      },
    ],
  },
  {
    id: 'disponibilidade-mensal',
    title: '2. Cálculo da Disponibilidade Mensal',
    blocks: [
      {
        paragraphs: [
          'Disponibilidade Mensal = (minutos totais do mês − minutos de Indisponibilidade) ÷ minutos totais do mês × 100.',
        ],
      },
    ],
  },
  {
    id: 'indisponibilidade',
    title: '3. Indisponibilidade',
    blocks: [
      {
        paragraphs: [
          '"Indisponibilidade" significa qualquer período em que a funcionalidade essencial do Nexo Cloud fica materialmente inacessível, conforme aferido pelo nosso próprio monitoramento.',
        ],
      },
    ],
  },
  {
    id: 'exclusoes',
    title: '4. Exclusões',
    blocks: [
      {
        paragraphs: [
          'Não contam como Indisponibilidade: janelas de manutenção programada; eventos de força maior; problemas causados pelo próprio Cliente (uso indevido, credenciais comprometidas por negligência do Cliente); falhas de serviços de terceiros fora do nosso controle; suspensão por inadimplência ou violação dos Termos; e indisponibilidade de Serviços Beta.',
        ],
      },
    ],
  },
  {
    id: 'creditos-de-servico',
    title: '5. Créditos de serviço',
    blocks: [
      {
        heading: '5.1 Elegibilidade',
        paragraphs: [
          'Somente Clientes dos planos Business e Enterprise são elegíveis a créditos de serviço.',
        ],
      },
      {
        heading: '5.2 Tabela de créditos',
        paragraphs: [
          'Disponibilidade Mensal entre 99,5% e 99,0%: crédito de 10% da fatura do mês. Entre 99,0% e 95,0%: crédito de 25%. Abaixo de 95,0%: crédito de 50%.',
        ],
      },
      {
        heading: '5.3 Limite e forma do crédito',
        paragraphs: [
          'O total de créditos em um mês é limitado a 100% do valor faturado nesse mês. Créditos são aplicados na fatura seguinte, não são reembolsáveis em dinheiro e expiram no cancelamento da assinatura.',
        ],
      },
      {
        heading: '5.4 Como solicitar',
        paragraphs: [
          'Solicitações de crédito devem ser enviadas por escrito para suporte@nexo.coodee.dev em até 30 dias corridos após o fim do mês em que ocorreu a Indisponibilidade, com os horários e o impacto observados.',
        ],
      },
    ],
  },
  {
    id: 'suporte',
    title: '6. Suporte',
    blocks: [
      {
        heading: '6.1 Canais e escopo',
        paragraphs: [
          'O suporte cobre o Nexo Cloud e a instalação/atualização do software self-hosted. Ele não cobre a infraestrutura, a rede ou componentes de terceiros do ambiente self-hosted do Cliente, conforme a Seção 3.2(d) dos Termos.',
        ],
      },
      {
        heading: '6.2 Tempos-alvo de resposta por severidade',
        paragraphs: [
          'Severidade crítica (serviço indisponível): até 4 horas nos planos Business/Enterprise, até 1 dia útil no plano Pro, sem SLA no plano Free.',
          'Severidade alta (funcionalidade essencial degradada): até 8 horas nos planos Business/Enterprise, até 2 dias úteis no Pro, sem SLA no Free.',
          'Severidade normal (dúvidas e solicitações gerais): até 24 horas nos planos Business/Enterprise, até 5 dias úteis no Pro, melhor esforço no Free.',
        ],
      },
    ],
  },
  {
    id: 'manutencao-e-comunicacao',
    title: '7. Manutenção e comunicação',
    blocks: [
      {
        paragraphs: [
          'Manutenções programadas são avisadas com pelo menos 3 dias de antecedência e agendadas em horários de menor uso. Manutenções emergenciais buscam um aviso de pelo menos 60 minutos, quando viável. O status do serviço é público em nexo.coodee.dev/status, com atualizações durante qualquer incidente em andamento.',
        ],
      },
    ],
  },
  {
    id: 'alteracoes',
    title: '8. Alterações a este SLA',
    blocks: [
      {
        paragraphs: [
          'Podemos atualizar este SLA periodicamente. Reduções materiais nos compromissos de disponibilidade ou suporte para Clientes ativos entram em vigor só após 30 dias de aviso prévio.',
        ],
      },
    ],
  },
  {
    id: 'contato',
    title: '9. Contato',
    blocks: [
      {
        paragraphs: [
          'Dúvidas sobre este SLA ou solicitações de crédito: suporte@nexo.coodee.dev.',
        ],
      },
    ],
  },
]

export default function ServiceLevelAgreementPage() {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>Acordo de Nível de Serviço</Title>
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
