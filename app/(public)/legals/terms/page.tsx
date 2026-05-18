import type { Metadata } from 'next'
import { H1 } from '@/components/typography/heading/h1'
import { H2 } from '@/components/typography/heading/h2'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { TERMS_VERSION } from '@/lib/legal/versions'

export const metadata: Metadata = {
  title: 'Termos de Serviço | Nexo',
  description: 'Os termos que regem o uso do Nexo.',
}

const SECTIONS = [
  'Aceite e elegibilidade',
  'Conta e responsabilidades do usuário',
  'Planos, cobrança e cancelamento',
  'Uso aceitável',
  'Propriedade intelectual',
  'Suspensão e encerramento',
  'Limitação de responsabilidade',
  'Alterações destes termos',
  'Lei aplicável e foro',
]

export default function ServiceTermPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2 text-left'>
        <H1 className='text-left'>Termos de Serviço</H1>
        <Muted>Versão {TERMS_VERSION}</Muted>
      </header>

      <div className='rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4'>
        <P className='mt-0 text-sm'>
          Este documento está em rascunho e pendente de revisão jurídica. O
          texto final será publicado antes da exigência de aceite em produção. A
          estrutura abaixo lista as seções planejadas.
        </P>
      </div>

      <section className='flex flex-col gap-4'>
        {SECTIONS.map((title) => (
          <div key={title}>
            <H2>{title}</H2>
            <P>Conteúdo pendente.</P>
          </div>
        ))}
      </section>
    </main>
  )
}
