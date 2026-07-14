'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { useCareerJobs } from '@/src/hooks/use-career-jobs'

export function CareerJobsList() {
  const { data: jobs, isLoading } = useCareerJobs()

  return (
    <>
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-medium'>Vagas</h1>
        <Link href='/admin/careers/new' className={buttonVariants({})}>
          Nova vaga
        </Link>
      </div>

      <div className='mt-6 flex flex-col gap-3'>
        {isLoading && (
          <p className='text-sm text-muted-foreground'>Carregando...</p>
        )}
        {jobs?.map((job) => (
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
        {jobs?.length === 0 && (
          <p className='text-sm text-muted-foreground'>
            Nenhuma vaga cadastrada ainda.
          </p>
        )}
      </div>
    </>
  )
}
