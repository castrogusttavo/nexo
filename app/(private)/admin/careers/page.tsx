import type { Metadata } from 'next'
import { CareerJobsList } from './_components/career-jobs-list'

export const metadata: Metadata = { title: 'Vagas | Admin Nexo' }

export default function AdminCareersPage() {
  return (
    <main className='mx-auto max-w-4xl px-6 py-10'>
      <CareerJobsList />
    </main>
  )
}
