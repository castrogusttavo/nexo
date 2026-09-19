import { Briefcase02Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { IconStack } from '@/components/ui/icon-stack'
import { cn } from '@/lib/utils'
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
        {CUSTOMERS.length > 0 && (
          <section className='flex flex-col items-center text-center mx-auto w-full px-4 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 py-16 space-y-6'>
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
        )}
        <section
          className={cn(
            'flex flex-col items-center text-center mx-auto w-full px-4 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384',
            CUSTOMERS.length === 0 ? 'flex-1 justify-center' : 'py-10 md:py-16',
          )}
        >
          {CUSTOMERS.length === 0 ? (
            <div className='w-full flex flex-col gap-2.5 items-center justify-center'>
              <IconStack aria-hidden='true' className='h-28 w-24'>
                <NexoIcon icon={Briefcase02Icon} className='size-6' />
              </IconStack>
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
                <Button size='lg'>Falar com vendas</Button>
              </Link>
            </div>
          ) : (
            <div
              className={cn(
                'bg-neutral-1 grid border border-neutral-300 md:grid-cols-2 [&>*]:border-neutral-300 [&>*+*]:border-t md:[&>*+*]:border-t-0',
                CUSTOMERS.length === 3
                  ? 'md:grid-flow-row-dense'
                  : 'md:[&>*:nth-child(n+3)]:border-t md:[&>*:nth-child(odd)]:border-r',
              )}
            >
              {CUSTOMERS.map((customer, index) => {
                const isThreeItemLayout = CUSTOMERS.length === 3
                const isFirst = index === 0
                const isSecond = index === 1
                const isTall = isThreeItemLayout && index === 2

                return (
                  <div
                    key={customer.id}
                    className={cn(
                      'group hover:bg-neutral-2 relative px-4 py-6 md:px-8 md:py-10',
                      isThreeItemLayout &&
                        (isFirst || isSecond) &&
                        'md:col-start-1 md:border-r',
                      isThreeItemLayout && isSecond && 'md:border-t!',
                      isTall && 'md:col-start-2 md:row-span-2 md:border-t-0',
                    )}
                  >
                    <div className='flex flex-col items-start gap-8 md:gap-16'>
                      <div className='flex flex-col gap-3 md:gap-4 w-full'>
                        <div className='flex flex-row flex-wrap items-center justify-between gap-3 md:gap-6'>
                          <span className='text-left font-medium font-mono text-base uppercase text-muted-foreground'>
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
                        <Image
                          src={customer.logo}
                          alt=''
                          width={1024}
                          height={1024}
                          className='md:hidden h-6.25 w-fit'
                        />
                        <Title
                          as='h3'
                          className='text-2xl font-light text-start'
                        >
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
                          className='hidden group-hover:block h-6.25 w-fit'
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
      <WebFooter showBanner={false} />
    </>
  )
}
