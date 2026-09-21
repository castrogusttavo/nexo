'use client'

import {
  ArrowUpRight03Icon,
  Briefcase02Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { buttonVariants } from '@/components/ui/button'
import { IconStack } from '@/components/ui/icon-stack'
import {
  CAREER_EMPLOYMENT_TYPE_LABELS,
  CAREER_LOCATION_TYPE_LABELS,
} from '@/src/lib/career-labels'
import {
  careerDepartmentParser,
  careerEmploymentTypeParser,
  careerLocationParser,
  careerLocationTypeParser,
} from '@/src/lib/career-params'
import type { CareerJobDTO } from '@/types/career-job'
import { Title } from '../_components/text/title'

const UNSPECIFIED_DEPARTMENT = 'Outras vagas'

interface CareersListProps {
  jobs: CareerJobDTO[]
}

export function CareersList({ jobs }: CareersListProps) {
  const [{ department, location, locationType, employmentType }] =
    useQueryStates({
      department: careerDepartmentParser,
      location: careerLocationParser,
      locationType: careerLocationTypeParser,
      employmentType: careerEmploymentTypeParser,
    })

  const filtered = useMemo(
    () =>
      jobs.filter((job) => {
        if (department && job.department !== department) return false
        if (location && job.location !== location) return false
        if (locationType && job.locationType !== locationType) return false
        if (employmentType && job.employmentType !== employmentType)
          return false
        return true
      }),
    [jobs, department, location, locationType, employmentType],
  )

  const grouped = useMemo(() => {
    const groups = new Map<string, CareerJobDTO[]>()
    for (const job of filtered) {
      const key = job.department ?? UNSPECIFIED_DEPARTMENT
      const list = groups.get(key) ?? []
      list.push(job)
      groups.set(key, list)
    }

    return [...groups.entries()].sort(([a], [b]) => {
      if (a === UNSPECIFIED_DEPARTMENT) return 1
      if (b === UNSPECIFIED_DEPARTMENT) return -1
      return a.localeCompare(b, 'pt-BR')
    })
  }, [filtered])

  if (jobs.length === 0) {
    return (
      <div className='w-full flex flex-col gap-2.5 items-center justify-center'>
        <IconStack aria-hidden='true' className='h-28 w-24'>
          <NexoIcon icon={Briefcase02Icon} className='size-6' />
        </IconStack>
        <h3 className='font-normal text-lg md:whitespace-pre-line'>
          Sem vagas no momento.
        </h3>
      </div>
    )
  }

  return (
    <div className='w-full max-w-180 flex flex-col gap-8 mx-auto items-center'>
      <div className='w-full space-y-3'>
        <Title>Vagas abertas</Title>
      </div>

      {filtered.length === 0 && (
        <Muted>Nenhuma vaga corresponde aos filtros selecionados.</Muted>
      )}

      {grouped.map(([groupName, jobInDepartment]) => (
        <div key={groupName} className='w-full flex flex-col gap-2.5'>
          <Muted className='text-base'>{groupName}</Muted>
          <div className='flex flex-col gap-4'>
            {jobInDepartment.map((job) => (
              <Link
                key={job.id}
                href={`/careers/${job.slug}`}
                className='group/job w-full rounded-lg p-4 hover:bg-accent transition-colors flex items-center justify-between'
              >
                <div className='flex items-center justify-between gap-2.5'>
                  <h3 className='font-medium text-lg md:whitespace-pre-line'>
                    {job.title}
                  </h3>
                  <span className='text-sm text-muted-foreground text-start space-y-2'>
                    {CAREER_LOCATION_TYPE_LABELS[job.locationType]}
                  </span>
                  {job.status === 'CLOSED' && (
                    <span className='text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground'>
                      Encerrada
                    </span>
                  )}
                </div>
                <div className='mt-1 flex items-center flex-wrap gap-2'>
                  <span className='text-sm text-muted-foreground text-start space-y-2'>
                    {CAREER_EMPLOYMENT_TYPE_LABELS[job.employmentType]}
                  </span>
                  {/* The whole row is the link; this only looks like a button. */}
                  <span
                    className={buttonVariants({
                      variant: 'ghost',
                      size: 'sm',
                      className: 'group-hover/job:underline',
                    })}
                  >
                    Candidatar-se{' '}
                    <NexoIcon
                      icon={ArrowUpRight03Icon}
                      strokeWidth={2}
                      className='transition-transform duration-300 group-hover/job:-translate-y-0.5'
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
