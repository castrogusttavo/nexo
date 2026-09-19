import type { Metadata } from 'next'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { WebFooter } from '../../_components/footer'
import { Title } from '../../_components/text/title'
import { linkifyLegalText } from '../linkify-legal-text'
import { SectionHeading } from '../section-heading'

const TITLE = 'Sub-processadores | Nexo'
const DESCRIPTION =
  'Os terceiros que o Nexo usa para processar dados em nome dos clientes.'
const VERSION = '2026-09-09'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/sub-processors' },
  openGraph: {
    type: 'website',
    url: '/legals/sub-processors',
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
  'Um sub-processador é um terceiro contratado pelo Nexo para tratar dados pessoais em nome dos Clientes, ao prestar parte do Serviço. Este documento lista os sub-processadores atualmente em uso, conforme exigido pela Seção 4 do nosso Aditivo de Processamento de Dados.',
]

interface SubProcessor {
  name: string
  purpose: string
  location: string
}

const SUB_PROCESSORS: SubProcessor[] = [
  {
    name: 'AbacatePay',
    purpose: 'Processamento de pagamentos',
    location: 'Brasil',
  },
  {
    name: 'Resend',
    purpose: 'Envio de e-mails transacionais',
    location: 'Estados Unidos',
  },
  {
    name: 'Amazon Web Services (S3)',
    purpose: 'Armazenamento de arquivos e anexos',
    location: 'Estados Unidos',
  },
  {
    name: 'Axiom',
    purpose: 'Logs e observabilidade',
    location: 'Estados Unidos',
  },
  {
    name: 'Google',
    purpose: 'Autenticação (login social, opcional)',
    location: 'Estados Unidos',
  },
  {
    name: 'GitHub',
    purpose: 'Autenticação (login social, opcional)',
    location: 'Estados Unidos',
  },
]

export default function SubProcessorsPage() {
  return (
    <>
      <main className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16 scroll-mt-24'>
        <header className='flex flex-col gap-2 text-left pb-12'>
          <Title className='text-left'>Sub-processadores</Title>
          <Muted>Versão {VERSION}</Muted>
        </header>

        <section className='flex flex-col gap-4'>
          {PREAMBLE.map((paragraph) => (
            <P key={paragraph}>{linkifyLegalText(paragraph)}</P>
          ))}
        </section>

        <section id='notificacao-de-mudancas' className='flex flex-col gap-4'>
          <SectionHeading
            as='h2'
            id='notificacao-de-mudancas'
            className='pt-12 pb-6'
          >
            1. Notificação de mudanças
          </SectionHeading>
          <P>
            {linkifyLegalText(
              'Notificamos o Cliente com pelo menos 30 dias de antecedência antes de contratar um novo sub-processador ou substituir um existente, conforme a Seção 4 do DPA. Para receber essas notificações por e-mail, entre em contato com juridico@nexopm.com.',
            )}
          </P>
        </section>

        <section id='lista-atual' className='flex flex-col gap-4'>
          <SectionHeading as='h2' id='lista-atual' className='pt-12 pb-6'>
            2. Lista atual de sub-processadores
          </SectionHeading>
          <div className='overflow-x-auto rounded-md border border-border'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-border bg-muted/30 text-left'>
                  <th className='p-3 font-medium'>Empresa</th>
                  <th className='p-3 font-medium'>Finalidade</th>
                  <th className='p-3 font-medium'>Localização</th>
                </tr>
              </thead>
              <tbody>
                {SUB_PROCESSORS.map((sp) => (
                  <tr
                    key={sp.name}
                    className='border-b border-border last:border-0'
                  >
                    <td className='p-3'>{sp.name}</td>
                    <td className='p-3'>{sp.purpose}</td>
                    <td className='p-3'>{sp.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <P>
            {linkifyLegalText(
              'Essa lista é atualizada conforme novos sub-processadores são contratados. Provedores de IA usados pelo Nexo AI serão adicionados aqui assim que estiverem em produção.',
            )}
          </P>
        </section>

        <section id='contato' className='flex flex-col gap-4'>
          <SectionHeading as='h2' id='contato' className='pt-12 pb-6'>
            3. Contato
          </SectionHeading>
          <P>
            {linkifyLegalText(
              'Dúvidas sobre esta lista: Nexo Software, Inc., e-mail juridico@nexopm.com.',
            )}
          </P>
        </section>
      </main>
      <WebFooter showBanner={false} />
    </>
  )
}
