import type { Metadata } from 'next'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { brand } from '@/lib/brand'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { linkifyLegalText } from '../linkify-legal-text'
import { SectionHeading } from '../section-heading'

const TITLE = 'Aditivo de Processamento de Dados | Nexo'
const DESCRIPTION =
  'Como o Nexo trata dados pessoais em nome dos seus clientes, sob a LGPD.'
const VERSION = '2026-09-22'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/dpa' },
  openGraph: {
    type: 'website',
    url: '/legals/dpa',
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
  'Este Aditivo de Processamento de Dados ("DPA") é incorporado aos Termos de Serviço por referência e se aplica sempre que o Nexo trata dados pessoais contidos em Dados do Cliente, em nome do Cliente, ao operar o Nexo Cloud.',
  'Nos termos da LGPD, o Cliente atua como controlador e o Nexo como operador. Em caso de conflito entre este DPA e os Termos quanto ao tratamento de dados pessoais, prevalece este DPA.',
]

const SECTIONS: LegalSection[] = [
  {
    id: 'objeto-e-natureza',
    title: '1. Objeto e natureza do tratamento',
    blocks: [
      {
        paragraphs: [
          'O Nexo trata dados pessoais contidos em Dados do Cliente exclusivamente para fornecer, manter e dar suporte ao Serviço, conforme as instruções documentadas do Cliente (os Termos, a Documentação e as configurações da conta). O Nexo não trata esses dados para nenhuma outra finalidade própria.',
        ],
      },
    ],
  },
  {
    id: 'categorias-de-dados',
    title: '2. Categorias de dados e titulares',
    blocks: [
      {
        paragraphs: [
          'As categorias de dados pessoais e de titulares dependem do que o Cliente opta por armazenar no Serviço — tipicamente, dados de contato e de conta dos usuários do workspace do Cliente (funcionários, contratados, clientes do Cliente). O Cliente é responsável por não submeter categorias de dados sensíveis sem base legal adequada e sem um acordo específico, conforme a Seção 4.3 dos Termos.',
        ],
      },
    ],
  },
  {
    id: 'obrigacoes-do-operador',
    title: '3. Obrigações do operador',
    blocks: [
      {
        paragraphs: [
          'O Nexo se compromete a: tratar dados pessoais somente conforme instruído pelo Cliente; garantir que as pessoas autorizadas a tratar esses dados estejam sujeitas a obrigação de confidencialidade; implementar as medidas de segurança técnicas e organizacionais descritas na Seção 6; auxiliar o Cliente, na medida do razoável, a responder solicitações de titulares (art. 18 da LGPD); e excluir ou devolver os dados pessoais ao fim da prestação do Serviço, conforme a Seção 8.',
        ],
      },
    ],
  },
  {
    id: 'subcontratacao',
    title: '4. Subcontratação de sub-processadores',
    blocks: [
      {
        paragraphs: [
          'O Cliente autoriza, de forma geral, o Nexo a contratar sub-processadores para operar o Serviço, listados em nexopm.com/legals/sub-processors. O Nexo impõe a esses sub-processadores obrigações de proteção de dados equivalentes às deste DPA, e permanece responsável pelo cumprimento delas.',
          'O Nexo notificará o Cliente com pelo menos 30 dias de antecedência antes de contratar um novo sub-processador ou substituir um existente, através de aviso por e-mail ou na página de sub-processadores. O Cliente pode se opor por escrito dentro desse prazo; nesse caso, as partes buscarão uma solução razoável, podendo o Cliente rescindir o Prazo de Assinatura afetado caso a objeção não seja resolvida.',
        ],
      },
    ],
  },
  {
    id: 'transferencia-internacional',
    title: '5. Transferência internacional de dados',
    blocks: [
      {
        paragraphs: [
          'Quando o tratamento envolver transferência internacional de dados pessoais, o Nexo adota mecanismos de transferência reconhecidos pela legislação aplicável — como cláusulas contratuais padrão — para garantir um nível de proteção adequado, nos termos do Capítulo V da LGPD.',
        ],
      },
    ],
  },
  {
    id: 'seguranca-dos-dados',
    title: '6. Segurança dos dados',
    blocks: [
      {
        paragraphs: [
          'O Nexo mantém medidas técnicas e organizacionais compatíveis com o risco do tratamento, incluindo criptografia em trânsito e em repouso, controle de acesso baseado em função, e monitoramento de segurança. Detalhes estão disponíveis em nexopm.com/legals/security.',
        ],
      },
    ],
  },
  {
    id: 'notificacao-de-incidentes',
    title: '7. Notificação de incidentes',
    blocks: [
      {
        paragraphs: [
          'Em caso de incidente de segurança que afete dados pessoais tratados em nome do Cliente, o Nexo notificará o Cliente sem atraso indevido, e em até 72 horas após a confirmação do incidente, com as informações disponíveis para que o Cliente cumpra suas próprias obrigações de notificação, inclusive à ANPD quando aplicável.',
        ],
      },
    ],
  },
  {
    id: 'auditoria',
    title: '8. Auditoria e vigência',
    blocks: [
      {
        heading: '8.1 Auditoria',
        paragraphs: [
          'Mediante solicitação razoável e com aviso prévio de pelo menos 30 dias, o Nexo disponibilizará ao Cliente as informações necessárias para demonstrar o cumprimento deste DPA, incluindo relatórios de auditoria de segurança já existentes, quando disponíveis.',
        ],
      },
      {
        heading: '8.2 Vigência e efeitos da rescisão',
        paragraphs: [
          'Este DPA vigora enquanto o Nexo tratar dados pessoais em nome do Cliente. Ao fim do Prazo de Assinatura, aplicam-se os prazos de exportação e exclusão de Dados do Cliente da Seção 9.5 dos Termos de Serviço.',
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
          `Dúvidas sobre este DPA: ${brand.tradeName} (CNPJ ${brand.cnpj}), e-mail juridico@nexopm.com.`,
        ],
      },
    ],
  },
]

export default function DpaPage() {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>Aditivo de Processamento de Dados</Title>
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
