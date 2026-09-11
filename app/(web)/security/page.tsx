import { ArrowRight02Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { WebFooter } from '../_components/footer'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'

const TITLE = 'Seguro por design, privado por padrão | Nexo'
const DESCRIPTION =
  'Como o Nexo protege contas, dados e workspaces na nuvem, com conformidade pensada pra LGPD desde o início.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/security' },
  openGraph: {
    type: 'website',
    url: '/security',
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

interface SecurityCard {
  title: string
  description: string
}

const CERTS = ['gdpr', 'iso', 'soc2'] as const

const CARD_SPAN_BY_INDEX = [
  'sm:col-span-3',
  'sm:col-span-3',
  'sm:col-span-2',
  'sm:col-span-2',
  'sm:col-span-2',
]

const AUTH_SECURITY_CARDS: SecurityCard[] = [
  {
    title: 'Verificação em duas etapas',
    description:
      'Entre com um código único enviado por e-mail. Senha continua sendo só uma opção, não a única porta de entrada.',
  },
  {
    title: 'Autenticação de dois fatores',
    description:
      'Ative uma camada extra de proteção na sua conta a qualquer momento.',
  },
  {
    title: 'Senhas com hash seguro',
    description:
      'Usamos argon2, um dos algoritmos de hash mais robustos disponíveis hoje, pra proteger senhas mesmo em caso de vazamento do banco de dados.',
  },
  {
    title: 'Limite de tentativas',
    description:
      'Rotas de autenticação têm limite de tentativas baseado em Redis, dificultando ataques de força bruta.',
  },
  {
    title: 'Cabeçalhos de segurança por padrão',
    description:
      'CSP, HSTS e outros cabeçalhos de segurança vêm ativos em toda requisição, sem precisar configurar nada.',
  },
]

function SecurityCardGrid({ cards }: { cards: SecurityCard[] }) {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-6 gap-6 w-full'>
      {cards.map((card, index) => (
        <div
          key={card.title}
          className={`bg-card p-4 md:p-8 rounded-xl overflow-hidden border border-border space-y-2 text-start ${CARD_SPAN_BY_INDEX[index]}`}
        >
          <h6 className='font-medium text-lg md:whitespace-pre-line'>
            {card.title}
          </h6>
          <p className='text-base text-muted-foreground'>{card.description}</p>
        </div>
      ))}
    </div>
  )
}

export default function SecurityPage() {
  return (
    <>
      <main className='min-h-dvh w-full flex flex-col items-center flex-1 mx-auto'>
        <section className='flex flex-col items-center text-center mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384 py-16 space-y-6'>
          <div className='uppercase text-cyan-500 text-sm md:whitespace-pre-line mb-4'>
            seguro por design, privado por padrão
          </div>
          <div className='space-y-4'>
            <Title>
              Segurança e privacidade <br />
              que dá pra verificar
            </Title>
            <SubTitle>
              O Nexo roda 100% na nuvem, com segurança pensada desde a primeira
              linha de código. <br />
              Conformidade pensada pra LGPD desde o início, não como retrofit.
            </SubTitle>
          </div>
          <Link href='/talk-to-sales'>
            <Button>Falar com vendas</Button>
          </Link>
        </section>
        <section className='flex flex-col lg:flex-row lg:items-center gap-12 text-start mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384 py-16'>
          <div className='space-y-2'>
            <Title>
              Conformidade com os padrões <br />
              de mercado que importam
            </Title>
            <SubTitle>
              Nexo segue diversas normas regulatórias regionais e globais.
            </SubTitle>
          </div>
          <div className='flex-1 shrink-0 flex items-center justify-end gap-4'>
            {CERTS.map((cert: 'gdpr' | 'iso' | 'soc2') => (
              <div key={cert} className='flex items-center justify-center'>
                <span
                  role='img'
                  aria-label={cert.toUpperCase()}
                  className='size-30 bg-muted-foreground transition-colors hover:bg-primary'
                  style={{
                    maskImage: `url(/certification/${cert}.svg)`,
                    WebkitMaskImage: `url(/certification/${cert}.svg)`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                  }}
                />
              </div>
            ))}
          </div>
        </section>
        <section className='flex flex-col items-center text-center mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384 py-16 gap-12'>
          <Title>Seguro desde o primeiro dia</Title>
          <SecurityCardGrid cards={AUTH_SECURITY_CARDS} />
        </section>
        <section className='grid grid-cols-1 gap-6 lg:grid-cols-3 mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384 py-16'>
          <div className="relative flex h-full flex-col gap-16 overflow-hidden rounded-2xl p-8 md:p-12 lg:col-span-2 bg-cover bg-center bg-no-repeat bg-[url('/web/home/bg-home.png')]">
            <Image src='/brand/logo.svg' alt='Nexo' width={100} height={45} />
            <div className='flex flex-col gap-6'>
              <div className='space-y-2 text-start'>
                <h6 className='font-medium text-lg md:whitespace-pre-line'>
                  Peça a documentação de segurança que sua empresa precisa
                </h6>
                <p className='text-base text-muted-foreground'>
                  Comece na nossa nuvem com os mesmos princípios de proteção e
                  privacidade em toda a plataforma, sem precisar gerenciar
                  infraestrutura.
                </p>
              </div>
              <div className='flex items-center gap-2.5'>
                <Link href='/talk-to-sales'>
                  <Button size='lg'>Falar com vendas</Button>
                </Link>
                <Link href='mailto:seguranca@nexo.coodee.dev'>
                  <Button variant='secondary' size='lg'>
                    Pedir documentação de segurança
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <Link
            href='/talk-to-sales'
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-8 transition-transform duration-300 hover:scale-101 bg-cover bg-center bg-no-repeat bg-[url('/web/home/bg-home.png')]"
          >
            <NexoIcon
              icon={ArrowRight02Icon}
              strokeWidth={2}
              className='self-end size-8 -rotate-45 transition-transform duration-300 group-hover:rotate-0'
            />
            <span className='self-start font-medium text-lg'>
              Fale com a gente
            </span>
          </Link>
        </section>
      </main>
      <WebFooter showBanner={false} />
    </>
  )
}
