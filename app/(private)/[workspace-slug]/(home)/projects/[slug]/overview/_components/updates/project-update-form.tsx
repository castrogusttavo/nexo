'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ProjectUpdateHealth } from '../../_lib/project-update-health'
import { ProjectUpdateHealthPicker } from './project-update-health-picker'

type Values = { status: ProjectUpdateHealth; content: string }

type ProjectUpdateFormProps = {
  /** Present when editing: the button then waits for a change. */
  initial?: Values
  submitLabel?: string
  pending?: boolean
  /** Resolves to whether it worked; the toast already said what failed. */
  onSubmit: (values: Values) => Promise<boolean>
  placeholder?: string
  onCancel?: () => void
}

export function ProjectUpdateForm({
  initial,
  submitLabel = 'Adicionar atualização',
  pending = false,
  onSubmit,
  placeholder,
  onCancel,
}: ProjectUpdateFormProps) {
  const base = initial ?? { status: 'ON_TRACK' as const, content: '' }
  const [health, setHealth] = useState<ProjectUpdateHealth>(base.status)
  const [content, setContent] = useState(base.content)

  const dirty = health !== base.status || content.trim() !== base.content.trim()

  async function submit() {
    if (pending) return
    const ok = await onSubmit({ status: health, content: content.trim() })
    if (ok && !initial) {
      setContent('')
      setHealth('ON_TRACK')
    }
  }

  return (
    <div className='bg-app flex flex-col items-start rounded-xl border border-border w-full'>
      <div className='space-y-2.5 p-3 w-full border-b border-border'>
        <ProjectUpdateHealthPicker value={health} onChange={setHealth} />
        <Textarea
          value={content}
          maxLength={2000}
          rows={2}
          placeholder={placeholder ?? 'Adicione uma atualização'}
          onChange={(e) => setContent(e.target.value)}
          className='border-none bg-transparent! shadow-none focus-visible:border-transparent focus-visible:ring-0 w-full resize-none'
        />
      </div>
      <div className='flex items-center justify-end w-full py-1 px-1.5 gap-1'>
        {onCancel && (
          <Button size='xs' variant='ghost' onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          size='xs'
          variant='outline'
          disabled={pending || (!!initial && !dirty)}
          onClick={submit}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}
