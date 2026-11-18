'use client'

import { type SyntheticEvent, useState } from 'react'
import { projectStateGroupMeta } from '@/app/_components/workspace/project/project-state-groups'
import { ColorSwatchPicker } from '@/components/color-swatch-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { colorToDot, STATE_COLORS } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import {
  useCreateProjectState,
  useUpdateProjectState,
} from '@/src/hooks/use-project-state'
import type {
  ProjectStateDTO,
  ProjectStateGroupDTO,
} from '@/types/project-state'
import type { StateColorDTO } from '@/types/state'

// Creates a state in `group`, or edits `state` (a state never changes group:
// moving one could empty the group it leaves).
export function WorkspaceSettingsProjectStateForm({
  workspaceId,
  onClose,
  group,
  state,
}: {
  workspaceId: string
  onClose: () => void
  group?: ProjectStateGroupDTO
  state?: ProjectStateDTO
}) {
  const isEditing = !!state
  const createState = useCreateProjectState(workspaceId)
  const updateState = useUpdateProjectState(workspaceId)

  const [name, setName] = useState(state?.name ?? '')
  const [description, setDescription] = useState(state?.description ?? '')
  const [color, setColor] = useState<StateColorDTO>(
    state?.color ??
      (group ? projectStateGroupMeta[group].defaultColor : 'ZINC'),
  )

  const isPending = createState.isPending || updateState.isPending

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    const promise = state
      ? updateState.mutateAsync({
          stateId: state.id,
          data: {
            name: trimmedName,
            description: trimmedDescription,
            color,
          },
        })
      : group
        ? createState.mutateAsync({
            name: trimmedName,
            ...(trimmedDescription && { description: trimmedDescription }),
            group,
            color,
          })
        : null
    if (!promise) return

    const ok = await notify.run(promise, {
      loading: isEditing ? 'Salvando estado...' : 'Criando estado...',
      success: isEditing ? 'Estado atualizado' : 'Estado criado',
      error: 'Não foi possível salvar o estado',
    })
    if (ok) onClose()
  }

  return (
    <div className='bg-accent/50 rounded-lg w-full space-y-2'>
      <form className='space-y-3 p-4' onSubmit={handleSubmit}>
        <div className='flex items-center gap-1.5'>
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
            placeholder='Nome do estado'
            aria-label='Nome do estado'
            maxLength={50}
          />
        </div>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Descreva este estado para os membros'
          aria-label='Descrição do estado'
          maxLength={280}
        />
        <div className='h-px w-full bg-border' />
        <div className='p-0 flex justify-end gap-2'>
          <Button type='button' variant='outline' size='sm' onClick={onClose}>
            Cancelar
          </Button>
          <Button type='submit' size='sm' disabled={isPending || !name.trim()}>
            {isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
