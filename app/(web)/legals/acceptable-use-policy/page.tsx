import type { Metadata } from 'next'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { linkifyLegalText } from '../linkify-legal-text'
import { SectionHeading } from '../section-heading'

const TITLE = 'Política de Uso Aceitável | Nexo'
const DESCRIPTION =
  'Os usos permitidos e proibidos ao operar uma conta no Nexo.'
const VERSION = '2026-09-09'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/acceptable-use-policy' },
  openGraph: {
    type: 'website',
    url: '/legals/acceptable-use-policy',
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
  'Esta Política de Uso Aceitável ("AUP") rege o uso do Serviço do Nexo por qualquer Cliente e Usuário Autorizado, e é incorporada aos Termos de Serviço por referência.',
  'O responsável pela conta é integralmente responsável por toda atividade realizada sob ela, incluindo a de qualquer Usuário Autorizado. O Nexo pode agir contra uma violação do espírito desta AUP mesmo quando a conduta específica não esteja listada abaixo.',
]

const SECTIONS: LegalSection[] = [
  {
    id: 'principios-gerais',
    title: '1. Princípios gerais',
    blocks: [
      {
        paragraphs: [
          'Use o Serviço apenas para finalidades lícitas e de acordo com estes Termos, a Documentação e a legislação aplicável — em especial a LGPD e o Marco Civil da Internet (Lei nº 12.965/2014).',
        ],
      },
    ],
  },
  {
    id: 'integridade-e-seguranca',
    title: '2. Integridade e segurança do Serviço',
    blocks: [
      {
        paragraphs: [
          'É proibido: testar ou explorar vulnerabilidades do Serviço sem autorização por escrito; fazer engenharia reversa fora do permitido pelos Termos; contornar mecanismos de autenticação ou controle de acesso; interferir na infraestrutura ou interceptar comunicações de outros usuários; sobrecarregar o Serviço com bots, scrapers ou volume de requisições muito acima do uso humano equivalente; exceder limites de taxa (rate limits) de forma deliberada; e transmitir vírus, malware ou qualquer código malicioso.',
        ],
      },
    ],
  },
  {
    id: 'conduta-proibida',
    title: '3. Conduta proibida',
    blocks: [
      {
        paragraphs: [
          'É proibido usar o Serviço para: atividade ilegal; violar direitos de propriedade intelectual, privacidade ou de imagem de terceiros; assediar, ameaçar ou discriminar qualquer pessoa; se passar por outra pessoa ou entidade, ou praticar phishing; coletar (scraping) ou inferir dados sensíveis de outros usuários sem base legal; viabilizar transações ilícitas; contornar restrições de acesso; ou construir um produto concorrente a partir de informações confidenciais obtidas através do Serviço.',
        ],
      },
    ],
  },
  {
    id: 'padroes-de-conteudo',
    title: '4. Padrões de conteúdo',
    blocks: [
      {
        paragraphs: [
          'Não é permitido publicar, através do Serviço, conteúdo falso ou difamatório, obsceno, que incite violência, automutilação ou terrorismo, que sexualize crianças ou adolescentes sob qualquer forma (nesse caso, reportamos às autoridades competentes), que promova ódio ou discriminação, código malicioso, ou conteúdo previamente removido por violar esta AUP.',
        ],
      },
    ],
  },
  {
    id: 'dados-sensiveis',
    title: '5. Dados sensíveis',
    blocks: [
      {
        paragraphs: [
          'Conforme a Seção 4.3 dos Termos de Serviço, não envie ao Serviço dados pessoais sensíveis (art. 5º, II, da LGPD), informações de saúde protegidas sob a HIPAA ou dados de cartão de pagamento (PCI DSS), a menos que exista um acordo específico por escrito cobrindo esse tratamento (como um Acordo de Parceiro de Negócios).',
        ],
      },
    ],
  },
  {
    id: 'funcionalidades-de-ia',
    title: '6. Funcionalidades de IA',
    blocks: [
      {
        paragraphs: [
          'Ao usar o Nexo AI, não é permitido: tentar manipular ou "jailbreak" o modelo pra contornar suas proteções; gerar conteúdo que violaria esta AUP se produzido por um humano; usar resultados de IA como única base para decisões automatizadas de alto risco (emprego, crédito, seguro, moradia, educação ou segurança pública) sem supervisão humana; apresentar conteúdo gerado por IA como criado por humano quando isso for relevante; produzir desinformação, deepfakes ou avaliações falsas; ou confiar em resultado de IA sem verificação independente. O Nexo AI é fornecido "no estado em que se encontra", conforme a Seção 5.3 dos Termos.',
        ],
      },
    ],
  },
  {
    id: 'obrigacoes-do-cliente',
    title: '7. Obrigações do Cliente',
    blocks: [
      {
        paragraphs: [
          'O Cliente é responsável pela segurança de suas credenciais, pelo conteúdo enviado e pela conformidade de todos os Usuários Autorizados com esta AUP.',
        ],
      },
    ],
  },
  {
    id: 'api-e-integracoes',
    title: '8. Uso de API e integrações',
    blocks: [
      {
        paragraphs: [
          'O uso da API deve respeitar os limites de taxa, a autenticação e as diretrizes da Documentação. Não é permitido extrair dados sem relação com um uso legítimo, degradar a experiência de outros usuários, ou usar a API pra construir uma ferramenta concorrente. O Cliente é responsável por garantir que qualquer aplicativo de terceiro integrado também cumpra esta AUP.',
        ],
      },
    ],
  },
  {
    id: 'consequencias',
    title: '9. Consequências de violação',
    blocks: [
      {
        paragraphs: [
          'Dependendo da gravidade, o Nexo pode: emitir um aviso com prazo para correção; remover o conteúdo violador; suspender a conta; ou encerrá-la — inclusive de forma imediata e sem prazo de correção, nos casos legalmente permitidos e quando a violação não for sanável, conforme as Seções 9.2 e 9.4 dos Termos de Serviço. Conteúdo ilegal, especialmente envolvendo exploração de crianças e adolescentes, é reportado às autoridades competentes.',
        ],
      },
    ],
  },
  {
    id: 'independencia-das-clausulas',
    title: '10. Independência das cláusulas',
    blocks: [
      {
        paragraphs: [
          'Se qualquer disposição desta AUP for considerada inexequível, ela será modificada na medida mínima necessária, ou desconsiderada caso a modificação não seja possível, permanecendo o restante em pleno vigor.',
        ],
      },
    ],
  },
  {
    id: 'legislacao-aplicavel',
    title: '11. Legislação aplicável',
    blocks: [
      {
        paragraphs: [
          'Esta AUP é regida pelas leis da República Federativa do Brasil, nos mesmos termos da Seção 15 dos Termos de Serviço.',
        ],
      },
    ],
  },
  {
    id: 'como-denunciar',
    title: '12. Como denunciar violações',
    blocks: [
      {
        paragraphs: [
          'Para denunciar uma violação desta AUP, envie um e-mail para juridico@nexo.coodee.dev. O Nexo investiga toda denúncia de boa-fé e pode solicitar sua cooperação durante a apuração.',
        ],
      },
    ],
  },
  {
    id: 'contato',
    title: '13. Contato',
    blocks: [
      {
        paragraphs: [
          'Em caso de dúvidas sobre esta AUP, entre em contato: Nexo Software, Inc., e-mail juridico@nexo.coodee.dev.',
        ],
      },
    ],
  },
]

export default function AcceptableUsePolicyPage() {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>Política de Uso Aceitável</Title>
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
