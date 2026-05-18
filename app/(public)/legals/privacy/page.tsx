import type { Metadata } from 'next'
import { H1 } from '@/components/typography/heading/h1'
import { H2 } from '@/components/typography/heading/h2'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { PRIVACY_VERSION } from '@/lib/legal/versions'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Nexo',
  description: 'Como o Nexo coleta, usa e protege seus dados.',
}

const SECTIONS = [
  { id: 'dados-coletados', title: 'Dados que coletamos' },
  { id: 'bases-legais', title: 'Bases legais (LGPD Art. 7)' },
  { id: 'finalidades', title: 'Finalidades de tratamento' },
  { id: 'compartilhamento', title: 'Compartilhamento com terceiros' },
  { id: 'cookies', title: 'Cookies e tecnologias semelhantes' },
  { id: 'retencao', title: 'Retenção e descarte' },
  { id: 'direitos', title: 'Direitos do titular (LGPD Art. 18)' },
  { id: 'seguranca', title: 'Segurança da informação' },
  { id: 'contato', title: 'Encarregado e contato' },
  { id: 'alteracoes', title: 'Alterações desta política' },
]

export default function PrivacyPolicyPage() {
  return (
    <main className='mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2 text-left'>
        <H1 className='text-left'>Política de Privacidade</H1>
        <Muted>Versão {PRIVACY_VERSION}</Muted>
      </header>

      <div className='rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-4'>
        <P className='mt-0 text-sm'>
          Este documento está em rascunho e pendente de revisão jurídica. O
          texto final será publicado antes da exigência de aceite em produção. A
          estrutura abaixo lista as seções planejadas.
        </P>
      </div>

      <section className='flex flex-col gap-4'>
        {SECTIONS.map(({ id, title }) => (
          <div key={id} id={id}>
            <H2>{title}</H2>
            <P>Conteúdo pendente.</P>
          </div>
        ))}
      </section>
    </main>
  )
}
