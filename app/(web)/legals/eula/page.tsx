import type { Metadata } from 'next'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { linkifyLegalText } from '../linkify-legal-text'
import { SectionHeading } from '../section-heading'

const TITLE = 'Licença de Uso Final (EULA) | Nexo'
const DESCRIPTION =
  'Os termos de licenciamento para instâncias self-hosted do Nexo.'
const VERSION = '2026-09-09'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/eula' },
  openGraph: {
    type: 'website',
    url: '/legals/eula',
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
  'Esta Licença de Uso Final ("EULA") rege a instalação e o uso do software Nexo em implantações self-hosted e air-gapped, e complementa a Seção 3.2 dos Termos de Serviço. Ela não se aplica ao Nexo Cloud, que é fornecido como assinatura hospedada, sem licença de software.',
]

const SECTIONS: LegalSection[] = [
  {
    id: 'concessao-de-licenca',
    title: '1. Concessão de licença',
    blocks: [
      {
        paragraphs: [
          'Mediante o pagamento das taxas aplicáveis, o Nexo concede ao Cliente uma licença limitada, não exclusiva, intransferível e revogável para instalar e operar o software Nexo na infraestrutura do próprio Cliente durante o Prazo de Assinatura, dimensionada por assentos, funcionalidades do plano contratado e limites de uso da API, conforme o Pedido de Contratação.',
        ],
      },
    ],
  },
  {
    id: 'restricoes',
    title: '2. Restrições de uso',
    blocks: [
      {
        paragraphs: [
          'O Cliente não pode copiar, modificar, distribuir ou criar obras derivadas do software fora do permitido por esta licença; fazer engenharia reversa, exceto na medida expressamente permitida por lei; usar o software para construir um produto concorrente; remover avisos de propriedade; ou acessar o software sem uma licença válida.',
        ],
      },
    ],
  },
  {
    id: 'propriedade-intelectual',
    title: '3. Propriedade intelectual',
    blocks: [
      {
        paragraphs: [
          'O Nexo e seus licenciadores retêm todos os direitos sobre o software, incluindo todas as cópias e obras derivadas autorizadas. Nenhum direito além da licença concedida na Seção 1 é transferido ao Cliente. Sugestões e feedback enviados pelo Cliente podem ser incorporados ao software sem qualquer obrigação ou compensação, nos termos da Seção 6.2 dos Termos de Serviço.',
        ],
      },
    ],
  },
  {
    id: 'atualizacoes',
    title: '4. Atualizações e modificações',
    blocks: [
      {
        paragraphs: [
          'O Nexo pode disponibilizar atualizações, correções de segurança e novas versões do software. Mudanças materiais no licenciamento ou nos requisitos técnicos são comunicadas por e-mail ou aviso no produto, com antecedência razoável quando a mudança exigir ação do Cliente.',
        ],
      },
    ],
  },
  {
    id: 'garantias',
    title: '5. Garantias e isenções',
    blocks: [
      {
        paragraphs: [
          'Na máxima extensão permitida pela legislação aplicável, o software é fornecido "no estado em que se encontra", sem garantias de qualquer tipo, expressas ou implícitas, incluindo garantias de comercialização, adequação a um propósito específico e não violação — nos mesmos termos da Seção 10 dos Termos de Serviço, que se aplica integralmente a esta licença. Essa isenção não afasta os direitos assegurados ao consumidor pelo Código de Defesa do Consumidor, quando aplicável.',
        ],
      },
    ],
  },
  {
    id: 'limitacao-de-responsabilidade',
    title: '6. Limitação de responsabilidade',
    blocks: [
      {
        paragraphs: [
          'A responsabilidade do Nexo sob esta licença está sujeita às mesmas limitações e exclusões de danos indiretos, incidentais e consequenciais previstas na Seção 11 dos Termos de Serviço.',
        ],
      },
    ],
  },
  {
    id: 'rescisao',
    title: '7. Rescisão',
    blocks: [
      {
        paragraphs: [
          'Esta licença termina automaticamente ao fim do Prazo de Assinatura ou em caso de rescisão dos Termos de Serviço, aplicando-se os efeitos da Seção 9.5(c): o Cliente deve cessar o uso, desativar a licença e desinstalar as cópias do software, mantendo os Dados do Cliente já armazenados em sua própria infraestrutura.',
        ],
      },
    ],
  },
  {
    id: 'legislacao-aplicavel',
    title: '8. Lei aplicável',
    blocks: [
      {
        paragraphs: [
          'Esta EULA é regida pelas leis da República Federativa do Brasil, nos mesmos termos da Seção 15 dos Termos de Serviço.',
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
          'Dúvidas sobre esta EULA: Nexo Software, Inc., e-mail juridico@nexo.coodee.dev.',
        ],
      },
    ],
  },
]

export default function EulaPage() {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>Licença de Uso Final (EULA)</Title>
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
