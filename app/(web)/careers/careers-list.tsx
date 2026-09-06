'use client'

import { ArrowUpRight03Icon } from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import type {
  CAREER_EMPLOYMENT_TYPES,
  CAREER_LOCATION_TYPES,
} from '@/src/schemas/career-job.schema'
import type { CareerJobDTO } from '@/types/career-job'
import { Title } from '../_components/text/title'

const ALL = 'all'
const UNSPECIFIED_DEPARTMENT = 'Outras vagas'

type EmploymentTypeFilter =
  | (typeof CAREER_EMPLOYMENT_TYPES)[number]
  | typeof ALL
type LocationTypeFilter = (typeof CAREER_LOCATION_TYPES)[number] | typeof ALL

interface CareersListProps {
  jobs: CareerJobDTO[]
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export function CareersList({ jobs }: CareersListProps) {
  const [{ department, location, locationType, employmentType }, setFilters] =
    useQueryStates({
      department: careerDepartmentParser,
      location: careerLocationParser,
      locationType: careerLocationTypeParser,
      employmentType: careerEmploymentTypeParser,
    })

  const departments = useMemo(
    () =>
      uniqueSorted(jobs.map((job) => job.department).filter((v) => v !== null)),
    [jobs],
  )
  const locations = useMemo(
    () =>
      uniqueSorted(jobs.map((job) => job.location).filter((v) => v !== null)),
    [jobs],
  )

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

  const hasActiveFilters = Boolean(
    department || location || locationType || employmentType,
  )

  if (jobs.length === 0) {
    return <Muted>Nenhuma vaga aberta no momento.</Muted>
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
                  <Button
                    variant='ghost'
                    size='sm'
                    className='group-hover/job:underline'
                  >
                    Candidatar-se{' '}
                    <NexoIcon
                      icon={ArrowUpRight03Icon}
                      strokeWidth={2}
                      className='transition-transform duration-300 group-hover/job:-translate-y-0.5'
                    />
                  </Button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
