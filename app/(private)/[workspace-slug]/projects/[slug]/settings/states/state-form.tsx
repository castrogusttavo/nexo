'use client'

import { useState } from 'react'
import { ColorSwatchPicker } from '@/app/_components/ui/color-swatch-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useCreateState, useUpdateState } from '@/src/hooks/use-state'
import type { StateColorDTO, StateDTO, StateGroupDTO } from '@/types/state'
import {
  colorToDot,
  STATE_COLORS,
  STATE_GROUP_DEFAULT_COLOR,
} from '../../../../../../../lib/state-colors'

interface StateFormDialogProps {
  workspaceId: string
  projectSlug: string
  onClose: () => void
  group?: StateGroupDTO
  state?: StateDTO
}

export function StateForm({
  workspaceId,
  projectSlug,
  onClose,
  group,
  state,
}: StateFormDialogProps) {
  const isEditing = !!state
  const createState = useCreateState(workspaceId, projectSlug)
  const updateState = useUpdateState(workspaceId, projectSlug)

  const [name, setName] = useState(state?.name ?? '')
  const [description, setDescription] = useState(state?.description ?? '')
  const [color, setColor] = useState<StateColorDTO>(
    state?.color ?? (group ? STATE_GROUP_DEFAULT_COLOR[group] : 'ZINC'),
  )

  const isPending = createState.isPending || updateState.isPending

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()

    const promise =
      isEditing && state
        ? updateState.mutateAsync({
            stateId: state.id,
            data: { name, description, color },
          })
        : group
          ? createState.mutateAsync({ name, description, group, color })
          : null
    if (!promise) return
    try {
      await notify.mutate(promise, {
        loading: isEditing ? 'Salvando state...' : 'Criando state...',
        success: isEditing ? 'State atualizado' : 'State criado',
        error: 'Erro ao salvar state',
      })
      onClose()
    } catch {
      //
    }
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
            placeholder='Nome do state'
          />
        </div>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Descreva este state para os membros'
          className='min-h-16'
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
