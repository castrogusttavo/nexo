import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { CareerJobService } from '@/src/services/career-job.service'
import { CareerJobForm } from '../../_components/career-job-form'
import { StatusControl } from './status-control'

export const metadata: Metadata = { title: 'Editar vaga | Admin Nexo' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditCareerJobPage({ params }: Props) {
  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

  const { id } = await params
  const result = await CareerJobService.getById(session.value.user.email, id)
  if (!result.ok) notFound()

  const job = result.value

  return (
    <main className='mx-auto max-w-2xl px-6 py-10'>
      <h1 className='text-2xl font-medium'>Editar vaga</h1>
      <div className='mt-6'>
        <StatusControl jobId={job.id} status={job.status} />
      </div>
      <div className='mt-6'>
        <CareerJobForm mode='edit' jobId={job.id} initial={job} />
      </div>
    </main>
  )
}
