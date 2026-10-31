'use client'

import { type SyntheticEvent, useState } from 'react'
import { ColorSwatchPicker } from '@/components/color-swatch-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { colorToDot, STATE_COLORS } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import {
  useCreateProjectLabel,
  useUpdateProjectLabel,
} from '@/src/hooks/use-project-label'
import type { ProjectLabelDTO } from '@/types/project-label'
import type { StateColorDTO } from '@/types/state'

// Creates a label, or edits `label` when one is given.
export function WorkspaceSettingsProjectLabelForm({
  workspaceId,
  onClose,
  label,
}: {
  workspaceId: string
  onClose: () => void
  label?: ProjectLabelDTO
}) {
  const isEditing = !!label
  const createLabel = useCreateProjectLabel(workspaceId)
  const updateLabel = useUpdateProjectLabel(workspaceId)

  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState<StateColorDTO>(label?.color ?? 'ZINC')

  const isPending = createLabel.isPending || updateLabel.isPending

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()

    const promise = label
      ? updateLabel.mutateAsync({
          labelId: label.id,
          data: { name: trimmedName, color },
        })
      : createLabel.mutateAsync({ name: trimmedName, color })

    const ok = await notify.run(promise, {
      loading: isEditing ? 'Salvando etiqueta...' : 'Criando etiqueta...',
      success: isEditing ? 'Etiqueta atualizada' : 'Etiqueta criada',
      error: 'Não foi possível salvar a etiqueta',
    })
    if (ok) onClose()
  }

  return (
    <div className='w-full flex items-center rounded-lg border border-border px-3.5 py-2 bg-accent/50'>
      <form className='w-full flex items-center gap-2' onSubmit={handleSubmit}>
        <ColorSwatchPicker
          colors={STATE_COLORS}
          value={color}
          onChange={setColor}
          trigger={
            <Button
              type='button'
              variant='outline'
              size='icon-sm'
              className='shrink-0'
              aria-label='Escolher cor'
            >
              <span
                className={cn('size-3.5 rounded-full', colorToDot(color))}
              />
            </Button>
          }
        />
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Título da etiqueta'
          aria-label='Título da etiqueta'
          maxLength={50}
          className='flex-1'
        />
        <div className='flex items-center gap-1.5'>
          <Button type='button' variant='outline' size='xs' onClick={onClose}>
            Cancelar
          </Button>
          <Button type='submit' size='xs' disabled={isPending || !name.trim()}>
            {isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
