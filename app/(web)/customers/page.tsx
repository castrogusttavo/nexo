import { SquareStackIcon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { WebFooter } from '../_components/footer'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'

const TITLE = 'Clientes | Nexo'
const DESCRIPTION = 'Histórias de times que usam o Nexo no dia a dia.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/customers' },
  openGraph: {
    type: 'website',
    url: '/customers',
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

interface CustomerStory {
  id: string
  industry: string
  title: string
  logo: string
  migratedFromLogo?: string
  href: string
}

const CUSTOMERS: CustomerStory[] = []

export default function CustomersPage() {
  return (
    <>
      <main className='min-h-dvh w-full flex flex-col items-center flex-1 mx-auto'>
        <section className='flex flex-col items-center text-center mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384 py-16 space-y-6'>
          <div className='space-y-4'>
            <Title>Conheça nossos clientes</Title>
            <SubTitle>
              Este espaço vai contar histórias reais de times usando o Nexo no
              dia a dia.
            </SubTitle>
          </div>
          <Link href='/sign-up'>
            <Button size='lg'>Comece grátis</Button>
          </Link>
        </section>
        <section className='flex flex-col items-center text-center mx-auto w-full xl:max-w-336 xl:px-11 2xl:max-w-384 py-10 md:py-16'>
          {CUSTOMERS.length === 0 ? (
            <div className='w-full border border-border rounded-xl flex flex-col items-center justify-center gap-4 py-20 px-6'>
              <NexoIcon
                icon={SquareStackIcon}
                strokeWidth={1.5}
                size={40}
                className='text-muted-foreground'
              />
              <div className='space-y-1.5'>
                <p className='font-medium text-lg'>
                  Ainda não temos cases pra mostrar aqui
                </p>
                <p className='text-base text-muted-foreground'>
                  Estamos no começo — quer ser um dos primeiros clientes do Nexo
                  e ajudar a escrever essa história?
                </p>
              </div>
              <Link href='/talk-to-sales'>
                <Button>Falar com vendas</Button>
              </Link>
            </div>
          ) : (
            <div className='bg-neutral-1 grid border border-neutral-300 md:grid-cols-2 [&>*]:border-neutral-300 [&>*+*]:border-t md:[&>*+*]:border-t-0 md:[&>*:nth-child(n+3)]:border-t md:[&>*:nth-child(odd)]:border-r'>
              {CUSTOMERS.map((customer) => (
                <div
                  key={customer.id}
                  className='group hover:bg-neutral-2 relative px-4 py-6 md:px-8 md:py-10'
                >
                  <div className='flex flex-col items-start gap-8 md:gap-16'>
                    <Image
                      src={customer.logo}
                      alt=''
                      width={1024}
                      height={1024}
                      className='block md:hidden'
                    />
                    <div className='flex flex-col gap-3 md:gap-4'>
                      <div className='flex flex-row flex-wrap items-start gap-3 md:items-center md:justify-between md:gap-6'>
                        <span className='hidden lg:block font-medium font-mono text-base uppercase text-muted-foreground'>
                          {customer.industry}
                        </span>
                        {customer.migratedFromLogo && (
                          <div className='flex items-center gap-1.5'>
                            <Muted>Migrou de</Muted>
                            <Image
                              src={customer.migratedFromLogo}
                              alt=''
                              width={1024}
                              height={1024}
                              className='h-4 w-fit'
                            />
                          </div>
                        )}
                      </div>
                      <Title as='h3' className='text-2xl text-start'>
                        {customer.title}
                      </Title>
                    </div>
                    <div className='w-full flex items-center justify-between'>
                      <Link href={customer.href}>
                        <Button size='lg'>Ler a história completa</Button>
                      </Link>
                      <Image
                        src={customer.logo}
                        alt=''
                        width={1024}
                        height={1024}
                        className='hidden group-hover:block h-4 w-fit'
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <WebFooter showBanner={false} />
    </>
  )
}
