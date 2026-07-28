'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
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

    try {
      if (isEditing && state) {
        await updateState.mutateAsync({
          stateId: state.id,
          data: { name, description, color },
        })
        notify.success('State atualizado')
      } else if (group) {
        await createState.mutateAsync({ name, description, group, color })
        notify.success('State criado')
      }
      onClose()
    } catch (err) {
      notify.error(err)
    }
  }

  return (
    <div className='bg-accent/50 rounded-lg w-full space-y-2'>
      <form className='space-y-3 p-4' onSubmit={handleSubmit}>
        <div className='flex items-center gap-1.5'>
          <Popover>
            <PopoverTrigger
              render={
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
            <PopoverContent align='start' className='w-40'>
              <div className='flex flex-wrap gap-2'>
                {STATE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type='button'
                    onClick={() => setColor(c.value)}
                    className={cn(
                      'size-6 rounded-full cursor-pointer',
                      c.bg,
                      color === c.value &&
                        'ring-2 ring-primary ring-offset-2 ring-offset-background',
                    )}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
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
            {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
