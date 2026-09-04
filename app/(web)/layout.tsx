import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { WebHeader } from './_components/header/web-header'

const TITLE = 'Nexo — gestão de projetos nativa em IA'
const DESCRIPTION =
  'Planos, blog e vagas do Nexo, a plataforma de gestão de projetos nativa em IA.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
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

export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <div className='w-full h-dvh flex flex-col'>
      <WebHeader />
      <div className='flex-1 min-h-0'>{children}</div>
    </div>
  )
}
