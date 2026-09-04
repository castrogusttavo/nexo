import type { Metadata } from 'next'
import { CareerJobService } from '@/src/services/career-job.service'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'
import { CareersList } from './careers-list'

const TITLE = 'Carreiras | Nexo'
const DESCRIPTION = 'Vagas abertas no Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/careers' },
  openGraph: {
    type: 'website',
    url: '/careers',
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

export default async function CareersPage() {
  const result = await CareerJobService.listPublic()
  const jobs = result.ok ? result.value : []

  return (
    <main className='mx-auto w-full flex flex-col items-center px-4 py-3 sm:px-8 xl:max-w-336 xl:px-11 2xl:max-w-384 gap-10'>
      <div className='mx-auto w-full flex flex-col items-center gap-4 pt-20'>
        <Title>Vagas abertas</Title>
        <SubTitle>
          Time pequeno, ownership real. Veja as vagas abertas no Nexo.
        </SubTitle>
      </div>

      <CareersList jobs={jobs} />
    </main>
  )
}
