'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { notify } from '@/lib/notify'
import {
  useCreateCareerJob,
  useUpdateCareerJob,
} from '@/src/hooks/use-career-jobs'
import {
  CAREER_EMPLOYMENT_TYPE_LABELS,
  CAREER_LOCATION_TYPE_LABELS,
} from '@/src/lib/career-labels'
import {
  CAREER_EMPLOYMENT_TYPES,
  CAREER_LOCATION_TYPES,
} from '@/src/schemas/career-job.schema'
import type { CareerJobDTO } from '@/types/career-job'

// Mirrors the toSlug() helper duplicated in workspace/project forms
// (app/onboarding/workspace-setup/workspace-form.tsx and the project
// create modal) — same rules, kept local per the existing convention.
function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

interface BulletListFieldProps {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  disabled: boolean
}

function BulletListField({
  label,
  items,
  onChange,
  disabled,
}: BulletListFieldProps) {
  // items is a plain string[] with no natural id, but every mutation here
  // (add/remove/edit) goes through this component, so ids can be tracked
  // in lockstep to give React a stable key across add/remove.
  const [ids, setIds] = useState<string[]>(() =>
    items.map(() => crypto.randomUUID()),
  )

  function updateItem(index: number, value: string) {
    const next = [...items]
    next[index] = value
    onChange(next)
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
    setIds((prev) => prev.filter((_, i) => i !== index))
  }

  function addItem() {
    onChange([...items, ''])
    setIds((prev) => [...prev, crypto.randomUUID()])
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className='flex flex-col gap-2'>
        {items.map((item, index) => (
          <div key={ids[index] ?? index} className='flex gap-2'>
            <Input
              value={item}
              disabled={disabled}
              onChange={(e) => updateItem(index, e.target.value)}
            />
            <Button
              type='button'
              variant='outline'
              disabled={disabled}
              onClick={() => removeItem(index)}
            >
              Remover
            </Button>
          </div>
        ))}
        <Button
          type='button'
          variant='outline'
          disabled={disabled}
          onClick={addItem}
        >
          Adicionar item
        </Button>
      </div>
    </Field>
  )
}

interface CareerJobFormProps {
  mode: 'create' | 'edit'
  jobId?: string
  initial?: CareerJobDTO
}

export function CareerJobForm({ mode, jobId, initial }: CareerJobFormProps) {
  const router = useRouter()
  const createJob = useCreateCareerJob()
  const updateJob = useUpdateCareerJob(jobId ?? '')

  const [title, setTitle] = useState(initial?.title ?? '')
  const [department, setDepartment] = useState(initial?.department ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [about, setAbout] = useState(initial?.content.about ?? '')
  const [responsibilities, setResponsibilities] = useState<string[]>(
    initial?.content.responsibilities ?? [],
  )
  const [requirements, setRequirements] = useState<string[]>(
    initial?.content.requirements ?? [],
  )
  const [niceToHave, setNiceToHave] = useState<string[]>(
    initial?.content.niceToHave ?? [],
  )
  const [stack, setStack] = useState<string[]>(initial?.content.stack ?? [])
  const [location, setLocation] = useState(initial?.location ?? '')
  const [locationType, setLocationType] = useState(
    initial?.locationType ?? 'ON_SITE',
  )
  const [employmentType, setEmploymentType] = useState(
    initial?.employmentType ?? 'FULL_TIME',
  )

  const saving = createJob.isPending || updateJob.isPending

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Slug is derived from the title on create and never shown to the
    // admin. On edit it's resent unchanged — recomputing it from a title
    // fix would silently break the job's public URL.
    const slug = mode === 'create' ? toSlug(title) : (initial?.slug ?? '')

    const payload = {
      slug,
      title,
      department: department || undefined,
      summary,
      content: {
        about,
        responsibilities: responsibilities.filter(Boolean),
        requirements: requirements.filter(Boolean),
        niceToHave: niceToHave.filter(Boolean),
        stack: stack.filter(Boolean),
      },
      location: location || undefined,
      locationType,
      employmentType,
    }

    try {
      if (mode === 'create') {
        await createJob.mutateAsync(payload)
      } else {
        await updateJob.mutateAsync(payload)
      }
      notify.success(mode === 'create' ? 'Vaga criada' : 'Vaga atualizada')
      router.push('/admin/careers')
    } catch (err) {
      notify.error(err, 'Não foi possível salvar a vaga')
    }
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
      <Field>
        <FieldLabel htmlFor='title'>Título</FieldLabel>
        <Input
          id='title'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={saving}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor='department'>Departamento</FieldLabel>
        <Input
          id='department'
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          disabled={saving}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor='summary'>Resumo</FieldLabel>
        <Textarea
          id='summary'
          rows={2}
          maxLength={700}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          disabled={saving}
          required
        />
        <p className='text-xs text-muted-foreground text-right'>
          {summary.length}/700
        </p>
      </Field>

      <Field>
        <FieldLabel htmlFor='about'>Sobre a vaga</FieldLabel>
        <Textarea
          id='about'
          rows={4}
          maxLength={2000}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          disabled={saving}
          required
        />
        <p className='text-xs text-muted-foreground text-right'>
          {about.length}/2000
        </p>
      </Field>

      <Field>
        <FieldLabel htmlFor='location'>Localização</FieldLabel>
        <Input
          id='location'
          placeholder='São Paulo, SP'
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={saving}
        />
      </Field>

      <Field>
        <FieldLabel>Tipo de localização</FieldLabel>
        <Select
          value={locationType}
          onValueChange={(value) => {
            if (value) setLocationType(value)
          }}
        >
          <SelectTrigger disabled={saving}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {CAREER_LOCATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {CAREER_LOCATION_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Tipo de emprego</FieldLabel>
        <Select
          value={employmentType}
          onValueChange={(value) => {
            if (value) setEmploymentType(value)
          }}
        >
          <SelectTrigger disabled={saving}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {CAREER_EMPLOYMENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {CAREER_EMPLOYMENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <BulletListField
        label='O que você vai fazer'
        items={responsibilities}
        onChange={setResponsibilities}
        disabled={saving}
      />
      <BulletListField
        label='O que buscamos'
        items={requirements}
        onChange={setRequirements}
        disabled={saving}
      />
      <BulletListField
        label='Diferenciais'
        items={niceToHave}
        onChange={setNiceToHave}
        disabled={saving}
      />
      <BulletListField
        label='Stack'
        items={stack}
        onChange={setStack}
        disabled={saving}
      />

      <Button type='submit' disabled={saving}>
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </form>
  )
}
