import type { Metadata } from 'next'
import Link from 'next/link'
import { Muted } from '@/components/typography/text/muted'
import { CareerJobService } from '@/src/services/career-job.service'

export const metadata: Metadata = {
  title: 'Carreiras | Nexo',
  description: 'Vagas abertas no Nexo.',
}

export default async function CareersPage() {
  const result = await CareerJobService.listPublic()
  const jobs = result.ok ? result.value : []

  return (
    <main className='mx-auto max-w-3xl px-6 py-20'>
      <h1 className='text-4xl font-medium'>Carreiras</h1>
      <Muted className='mt-2'>
        Time pequeno, ownership real. Veja as vagas abertas no Nexo.
      </Muted>

      <div className='mt-10 flex flex-col gap-4'>
        {jobs.length === 0 && <Muted>Nenhuma vaga aberta no momento.</Muted>}
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/careers/${job.slug}`}
            className='rounded-xl border border-border p-6 hover:bg-accent transition-colors'
          >
            <div className='flex items-center justify-between'>
              <h2 className='text-xl font-medium'>{job.title}</h2>
              {job.status === 'CLOSED' && (
                <span className='text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground'>
                  Encerrada
                </span>
              )}
            </div>
            {job.department && (
              <Muted className='text-sm'>{job.department}</Muted>
            )}
            <p className='mt-2 text-sm text-muted-foreground line-clamp-2'>
              {job.summary}
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}
