import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { getAuthSession } from '@/src/lib/auth-session'
import { CareerJobService } from '@/src/services/career-job.service'

export const metadata: Metadata = { title: 'Vagas | Admin Nexo' }

export default async function AdminCareersPage() {
  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

  const result = await CareerJobService.listAll(session.value.user.email)
  if (!result.ok) redirect('/sign-in')

  const jobs = result.value

  return (
    <main className='mx-auto max-w-4xl px-6 py-10'>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-medium'>Vagas</h1>
        <Link href='/admin/careers/new' className={buttonVariants({})}>
          Nova vaga
        </Link>
      </div>

      <div className='mt-6 flex flex-col gap-3'>
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/admin/careers/${job.id}/edit`}
            className='flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent transition-colors'
          >
            <div>
              <p className='font-medium'>{job.title}</p>
              <p className='text-sm text-muted-foreground'>/{job.slug}</p>
            </div>
            <Badge variant='outline'>{job.status}</Badge>
          </Link>
        ))}
        {jobs.length === 0 && (
          <p className='text-sm text-muted-foreground'>
            Nenhuma vaga cadastrada ainda.
          </p>
        )}
      </div>
    </main>
  )
}
