import type { Metadata } from 'next'
import { CareerJobForm } from '../_components/career-job-form'

export const metadata: Metadata = { title: 'Nova vaga | Admin Nexo' }

export default function NewCareerJobPage() {
  return (
    <main className='mx-auto max-w-2xl px-6 py-10'>
      <h1 className='text-2xl font-medium'>Nova vaga</h1>
      <div className='mt-6'>
        <CareerJobForm mode='create' />
      </div>
    </main>
  )
}
