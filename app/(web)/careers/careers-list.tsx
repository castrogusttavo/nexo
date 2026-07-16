'use client'

import Link from 'next/link'
import { useQueryStates } from 'nuqs'
import { useMemo } from 'react'
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
import {
  CAREER_EMPLOYMENT_TYPES,
  CAREER_LOCATION_TYPES,
} from '@/src/schemas/career-job.schema'
import type { CareerJobDTO } from '@/types/career-job'

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
        <div className='w-full flex items-center justify-between'>
          <Muted>Filtros:</Muted>
          {hasActiveFilters && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() =>
                setFilters({
                  department: null,
                  location: null,
                  locationType: null,
                  employmentType: null,
                })
              }
            >
              Limpar filtros
            </Button>
          )}
        </div>
        <div className='w-full flex flex-wrap gap-3 justify-between'>
          <Select
            value={department}
            onValueChange={(value) => {
              if (!value) return
              setFilters({ department: value === ALL ? null : value })
            }}
          >
            <SelectTrigger className='w-auto min-w-40'>
              <SelectValue placeholder='Departamento' />
            </SelectTrigger>
            <SelectContent
              className='w-full'
              alignItemWithTrigger={false}
              align='start'
            >
              <SelectGroup>
                <SelectItem value={ALL}>Todos os departamentos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select<EmploymentTypeFilter>
            value={employmentType}
            onValueChange={(value) => {
              if (!value) return
              setFilters({ employmentType: value === ALL ? null : value })
            }}
          >
            <SelectTrigger className='w-auto min-w-40'>
              <SelectValue placeholder='Tipo de emprego' />
            </SelectTrigger>
            <SelectContent
              className='w-full'
              alignItemWithTrigger={false}
              align='start'
            >
              <SelectGroup>
                <SelectItem value={ALL}>Todos os tipos</SelectItem>
                {CAREER_EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem
                    key={type}
                    value={CAREER_EMPLOYMENT_TYPE_LABELS[type]}
                  >
                    {CAREER_EMPLOYMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={location}
            onValueChange={(value) => {
              if (!value) return
              setFilters({ location: value === ALL ? null : value })
            }}
          >
            <SelectTrigger className='w-auto min-w-40'>
              <SelectValue placeholder='Localização' />
            </SelectTrigger>
            <SelectContent
              className='w-full'
              alignItemWithTrigger={false}
              align='start'
            >
              <SelectGroup>
                <SelectItem value={ALL}>Todas as localizações</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select<LocationTypeFilter>
            value={locationType}
            onValueChange={(value) => {
              if (!value) return
              setFilters({ locationType: value === ALL ? null : value })
            }}
          >
            <SelectTrigger className='w-auto min-w-40'>
              <SelectValue placeholder='Tipo de localização' />
            </SelectTrigger>
            <SelectContent
              className='w-full'
              alignItemWithTrigger={false}
              align='start'
            >
              <SelectGroup>
                <SelectItem value={ALL}>Todas as localizações</SelectItem>
                {CAREER_LOCATION_TYPES.map((type) => (
                  <SelectItem
                    key={type}
                    value={CAREER_LOCATION_TYPE_LABELS[type]}
                  >
                    {CAREER_LOCATION_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 && (
        <Muted>Nenhuma vaga corresponde aos filtros selecionados.</Muted>
      )}

      {grouped.map(([groupName, jobInDepartment]) => (
        <div key={groupName} className='w-full flex flex-col gap-4'>
          <h2 className='text-lg font-medium text-muted-foreground'>
            {groupName}
          </h2>
          <div className='flex flex-col gap-4'>
            {jobInDepartment.map((job) => (
              <Link
                key={job.id}
                href={`/careers/${job.slug}`}
                className='rounded-xl px-4 py-6 hover:bg-accent transition-colors'
              >
                <div className='flex items-center justify-between'>
                  <h3 className='text-base font-medium text-branding-500'>
                    {job.title}
                  </h3>
                  {job.status === 'CLOSED' && (
                    <span className='text-xs rounded-full bg-muted px-2 py-1 text-muted-foreground'>
                      Encerrada
                    </span>
                  )}
                </div>
                <div className='mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground'>
                  <span>{groupName}</span>
                  {job.location && <span>{job.location}</span>}
                  <span>
                    · {CAREER_EMPLOYMENT_TYPE_LABELS[job.employmentType]}
                  </span>
                  <span>· {CAREER_LOCATION_TYPE_LABELS[job.locationType]}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
