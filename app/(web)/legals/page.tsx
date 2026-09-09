import type { Metadata } from 'next'
import Link from 'next/link'
import { WebFooter } from '../_components/footer'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'

const TITLE = 'Jurídico | Nexo'
const DESCRIPTION = 'Políticas e acordos que regem o uso do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals' },
  openGraph: {
    type: 'website',
    url: '/legals',
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

const LEGAL_LINKS = [
  { label: 'Termos de Serviço', href: '/legals/terms-and-conditions' },
  { label: 'Política de Privacidade', href: '/legals/privacy-policy' },
  {
    label: 'Política de Uso Aceitável',
    href: '/legals/acceptable-use-policy',
  },
  {
    label: 'Acordo de Nível de Serviço',
    href: '/legals/service-level-agreement',
  },
  {
    label: 'Aditivo de Processamento de Dados (DPA)',
    href: '/legals/dpa',
  },
  { label: 'Sub-processadores', href: '/legals/sub-processors' },
  { label: 'Política de Cookies', href: '/legals/cookie-policy' },
  {
    label: 'Acordo de Parceiro de Negócios (BAA)',
    href: '/legals/business-associate-agreement',
  },
  { label: 'Termos de Uso de IA', href: '/legals/ai-terms' },
  { label: 'Licença de Uso Final (EULA)', href: '/legals/eula' },
]

export default function LegalsPage() {
  return (
    <main className='w-full'>
      <div className='w-full min-h-screen mx-auto px-4 sm:px-8 xl:px-11 xl:max-w-336 2xl:max-w-384 py-20'>
        <div className='mx-auto flex max-w-3xl flex-col gap-12'>
          <div className='space-y-3'>
            <Title>Jurídico</Title>
            <SubTitle>
              As políticas e os acordos que regem o uso do Nexo.
            </SubTitle>
          </div>

          <div className='flex flex-col gap-4'>
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className='text-branding-600 dark:text-branding-400 hover:underline'
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <WebFooter showBanner={false} />
    </main>
  )
}
