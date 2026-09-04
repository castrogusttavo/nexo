import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Muted } from '@/components/typography/text/muted'
import { TalkToSalesForm } from './talk-to-sales-form'

const TITLE = 'Falar com vendas | Nexo'
const DESCRIPTION = 'Converse com nosso time sobre o plano Enterprise do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/talk-to-sales' },
  openGraph: {
    type: 'website',
    url: '/talk-to-sales',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function TalkToSalesPage() {
  return (
    <main className='relative h-full flex overflow-hidden'>
      <div className='pointer-events-none absolute inset-y-0 left-0 z-0 w-1/2'>
        <Image
          src='/gradient.png'
          alt=''
          aria-hidden
          fill
          priority
          quality={100}
          unoptimized
          sizes='(min-width: 1024px) 50vw, 100vw'
          className='object-cover object-center'
        />
      </div>
      <div className='relative z-10 h-full flex w-full mx-46 py-11'>
        <div className='flex-1 flex items-center justify-center p-10'>
          <div className='w-full max-w-xl bg-card rounded-2xl border border-border p-10 flex flex-col gap-16'>
            <div className='flex flex-col gap-3'>
              <h2 className='text-4xl'>Fale com um humano</h2>
              <Muted>
                Obtenha preços, passe por uma demonstração ao vivo, planeje uma
                migração ou uma implantação auto-hospedada e air-gapped.
              </Muted>
            </div>
            <div>
              <Muted>Confiável por mais de 50.000 equipes</Muted>
            </div>
            <Muted className='text-xs'>
              Suporte técnico ou de produto:{' '}
              <Link href='mailto:suporte@nexo.coodee.dev'>
                <strong className='text-primary'>
                  suporte@nexo.coodee.dev
                </strong>
              </Link>{' '}
              ou veja os{' '}
              <Link href='/docs'>
                <strong className='text-primary'>documentos</strong>
              </Link>
              .
            </Muted>
          </div>
        </div>
        <div className='flex-1 flex items-center justify-center p-10'>
          <TalkToSalesForm />
        </div>
      </div>
    </main>
  )
}
