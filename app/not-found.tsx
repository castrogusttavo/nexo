import { ArrowUpRight03Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { WebFooter } from './(web)/_components/footer'
import { WebHeader } from './(web)/_components/header/web-header'
import { SubTitle } from './(web)/_components/text/sub-title'
import { Title } from './(web)/_components/text/title'

export const metadata: Metadata = {
  title: 'Página não encontrada | Nexo',
  description: 'A página que você procurava não existe ou foi movida.',
}

const CARD_CLASSNAME =
  'group pointer-events-auto flex flex-col gap-3 rounded-2xl border border-white/20 bg-black/35 p-6 text-left shadow-[0_4px_24px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition hover:border-white/30 hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

const CARDS = [
  {
    href: '/pricing',
    title: 'Planos Nexo',
    description:
      'Conheça nosso plano mais popular, pra times de qualquer tamanho.',
  },
  {
    href: '/blog',
    title: 'Blog',
    description:
      'Novidades sobre produto, preços e empresa, publicadas com frequência.',
  },
  {
    href: '/docs',
    title: 'Documentação',
    description:
      'Aprenda a tirar o máximo proveito do Nexo e encontre respostas.',
  },
  {
    href: '/status',
    title: 'Status',
    description: 'Acompanhe a disponibilidade do Nexo Cloud em tempo real.',
  },
]

export default function Page() {
  return (
    <>
      <WebHeader />
      <div className="w-full min-h-[calc(100vh-75px)] bg-cover bg-center bg-no-repeat bg-[url('/home/404.webp')] brightness-[1.1]">
        <div className='mx-auto w-full min-h-[calc(100vh-75px)] px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384 flex flex-col justify-between'>
          <div className='mb-24 flex flex-col items-center gap-6 px-4 pt-16 text-center sm:gap-4 sm:pt-20 md:mb-0'>
            <Title>Hora de respirar fundo</Title>
            <SubTitle className='text-neutral-300'>
              Essa é uma página pra sentar e dar um tempo, <br />
              porque o que você procurava não foi encontrado.
            </SubTitle>
          </div>
          <div className='mt-auto grid w-full grid-cols-1 gap-3 pb-8 pt-48 md:grid-cols-2 md:gap-4 md:pt-20 lg:grid-cols-4'>
            {CARDS.map((card) => (
              <Link key={card.href} href={card.href} className={CARD_CLASSNAME}>
                <div className='w-full flex items-center justify-between'>
                  <h2 className='font-semibold text-white'>{card.title}</h2>
                  <NexoIcon
                    icon={ArrowUpRight03Icon}
                    strokeWidth={2}
                    className='text-white/70 transition-transform duration-300 group-hover:-translate-y-0.5'
                  />
                </div>
                <Muted className='text-white/70'>{card.description}</Muted>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <WebFooter showBanner={false} />
    </>
  )
}
