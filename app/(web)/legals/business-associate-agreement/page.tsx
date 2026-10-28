import type { Metadata } from 'next'
import { brand } from '@/lib/brand'
import { LegalDocument, type LegalSection } from '../legal-document'

const TITLE = 'Acordo de Parceiro de Negócios | Nexo'
const DESCRIPTION =
  'As obrigações do Nexo ao lidar com informações de saúde protegidas de um cliente.'
const VERSION = '2026-09-22'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/business-associate-agreement' },
  openGraph: {
    type: 'website',
    url: '/legals/business-associate-agreement',
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

const PREAMBLE = [
  'O Nexo é uma empresa brasileira e não está, por si só, sujeita à legislação americana de saúde (HIPAA). Este Acordo de Parceiro de Negócios ("BAA") é um documento suplementar, opcional, oferecido a Clientes que precisam armazenar informações de saúde protegidas ("PHI") sujeitas à HIPAA no Nexo Cloud. Ele só se aplica mediante execução específica entre o Nexo e o Cliente, e passa a reger o tratamento dessas informações no lugar dos Termos e do DPA, no que for conflitante.',
]

const SECTIONS: LegalSection[] = [
  {
    id: 'definicoes',
    title: '1. Definições',
    blocks: [
      {
        paragraphs: [
          'Os termos "Entidade Coberta" ("Covered Entity"), "Parceiro de Negócios" ("Business Associate"), "PHI" e "Incidente de Segurança" têm o significado atribuído pela HIPAA (45 C.F.R. Partes 160 e 164). Neste documento, o Cliente é a Entidade Coberta e o Nexo é o Parceiro de Negócios.',
        ],
      },
    ],
  },
  {
    id: 'obrigacoes-do-nexo',
    title: '2. Obrigações do Nexo',
    blocks: [
      {
        paragraphs: [
          'O Nexo se compromete a: usar e divulgar PHI somente conforme permitido por este BAA ou exigido por lei; aplicar as salvaguardas administrativas, físicas e técnicas exigidas pela Security Rule da HIPAA; notificar o Cliente sobre qualquer uso ou divulgação não autorizada de que tiver conhecimento; exigir que qualquer subcontratado que trate PHI assuma obrigações equivalentes; disponibilizar registros à autoridade americana competente (HHS) quando exigido; e não vender PHI nem usá-la para marketing ou captação de recursos.',
        ],
      },
    ],
  },
  {
    id: 'obrigacoes-do-cliente',
    title: '3. Obrigações do Cliente',
    blocks: [
      {
        paragraphs: [
          'O Cliente é responsável por obter as autorizações exigidas pela HIPAA antes de submeter PHI ao Serviço, por enviar apenas o mínimo necessário de PHI, e por notificar o Nexo sobre qualquer restrição de uso que tenha se comprometido a respeitar perante seus próprios pacientes ou usuários.',
        ],
      },
    ],
  },
  {
    id: 'notificacao-de-violacao',
    title: '4. Notificação de violação',
    blocks: [
      {
        paragraphs: [
          'O Nexo notificará o Cliente em até 30 dias corridos após identificar uma violação envolvendo PHI, com as informações disponíveis para que o Cliente cumpra suas próprias obrigações de notificação a indivíduos, ao HHS e, quando exigido, à imprensa.',
        ],
      },
    ],
  },
  {
    id: 'subcontratados',
    title: '5. Subcontratados',
    blocks: [
      {
        paragraphs: [
          'Qualquer subcontratado do Nexo que trate PHI deve firmar um acordo por escrito com obrigações equivalentes às deste BAA. A lista de sub-processadores está disponível em nexopm.com/legals/sub-processors.',
        ],
      },
    ],
  },
  {
    id: 'vigencia-e-rescisao',
    title: '6. Vigência e rescisão',
    blocks: [
      {
        paragraphs: [
          'Este BAA acompanha a vigência do Prazo de Assinatura do Cliente. Ao término, a PHI é devolvida ou excluída conforme a Seção 9.5 dos Termos de Serviço; se a devolução ou exclusão não for tecnicamente viável, as proteções deste BAA continuam a se aplicar à PHI retida.',
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
          `Para solicitar este BAA ou tirar dúvidas: ${brand.tradeName} (CNPJ ${brand.cnpj}), e-mail juridico@nexopm.com.`,
        ],
      },
    ],
  },
]

export default function BusinessAssociateAgreementPage() {
  return (
    <LegalDocument
      title='Acordo de Parceiro de Negócios'
      version={VERSION}
      preamble={PREAMBLE}
      sections={SECTIONS}
    />
  )
}
