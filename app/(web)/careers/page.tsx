import type { Metadata } from 'next'
import { CareerJobService } from '@/src/services/career-job.service'
import { SubTitle } from '../_components/text/sub-title'
import { Title } from '../_components/text/title'
import { CareersList } from './careers-list'

export const metadata: Metadata = {
  title: 'Carreiras | Nexo',
  description: 'Vagas abertas no Nexo.',
  alternates: { canonical: '/careers' },
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
