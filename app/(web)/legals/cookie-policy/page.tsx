import type { Metadata } from 'next'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { COOKIES_VERSION } from '@/lib/legal/versions'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { linkifyLegalText } from '../linkify-legal-text'
import { SectionHeading } from '../section-heading'

const TITLE = 'Política de Cookies | Nexo'
const DESCRIPTION = 'Quais cookies o Nexo usa e como você controla eles.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/cookie-policy' },
  openGraph: {
    type: 'website',
    url: '/legals/cookie-policy',
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
  'Esta Política de Cookies complementa nossa Política de Privacidade e explica quais cookies e tecnologias semelhantes o Nexo usa nos seus sites, e como você pode gerenciá-los.',
]

const SECTIONS: LegalSection[] = [
  {
    id: 'o-que-sao-cookies',
    title: '1. O que são cookies',
    blocks: [
      {
        paragraphs: [
          'Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Usamos também tecnologias semelhantes, como pixels e armazenamento local do navegador, para os mesmos fins descritos aqui.',
        ],
      },
    ],
  },
  {
    id: 'cookies-que-usamos',
    title: '2. Cookies que usamos',
    blocks: [
      {
        paragraphs: [
          'Organizamos os cookies do Nexo em quatro categorias: essenciais, funcionais, de análise e de marketing, detalhadas abaixo.',
        ],
      },
    ],
  },
  {
    id: 'cookies-essenciais',
    title: '3. Cookies essenciais',
    blocks: [
      {
        paragraphs: [
          'Necessários pro funcionamento básico do site e da aplicação — autenticação de sessão, segurança (proteção contra CSRF) e balanceamento de carga. Não podem ser desativados, porque sem eles o Serviço não funciona.',
        ],
      },
    ],
  },
  {
    id: 'cookies-de-analise',
    title: '4. Cookies de análise e desempenho',
    blocks: [
      {
        paragraphs: [
          'Usamos o Google Analytics (GA4) nos nossos sites de marketing pra entender como visitantes chegam e navegam pelo site, e medir a eficácia de páginas e campanhas. Esses cookies só são carregados mediante o seu consentimento.',
        ],
      },
    ],
  },
  {
    id: 'como-gerenciar',
    title: '5. Como gerenciar suas preferências',
    blocks: [
      {
        paragraphs: [
          'Você pode aceitar ou recusar cookies não essenciais no banner de consentimento exibido na sua primeira visita, ou ajustar as configurações de cookies do seu navegador a qualquer momento — isso pode afetar funcionalidades que dependem deles.',
        ],
      },
    ],
  },
  {
    id: 'cookies-de-terceiros',
    title: '6. Cookies de terceiros',
    blocks: [
      {
        paragraphs: [
          'Cookies definidos por provedores como o Google Analytics são regidos pela política de privacidade desses provedores, além desta. Não usamos cookies de publicidade de terceiros nem redirecionamos dados pra fins de publicidade comportamental entre sites.',
        ],
      },
    ],
  },
  {
    id: 'alteracoes',
    title: '7. Alterações desta política',
    blocks: [
      {
        paragraphs: [
          'Podemos atualizar esta Política de Cookies periodicamente. Mudanças materiais são comunicadas com uma nova exibição do banner de consentimento.',
        ],
      },
    ],
  },
  {
    id: 'contato',
    title: '8. Contato',
    blocks: [
      {
        paragraphs: [
          'Dúvidas sobre esta Política de Cookies: Nexo Software, Inc., e-mail juridico@nexo.coodee.dev.',
        ],
      },
    ],
  },
]

export default function CookiePolicyPage() {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>Política de Cookies</Title>
          <Muted>Versão {COOKIES_VERSION}</Muted>
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
