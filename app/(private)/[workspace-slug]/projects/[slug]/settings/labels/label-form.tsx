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
import { colorToDot, STATE_COLORS } from '@/lib/state-colors'
import { cn } from '@/lib/utils'
import { useCreateLabel, useUpdateLabel } from '@/src/hooks/use-label'
import type { LabelColorDTO, LabelDTO } from '@/types/label'

interface LabelFormProps {
  workspaceId: string
  projectSlug: string
  onClose: () => void
  label?: LabelDTO
}

export function LabelForm({
  workspaceId,
  projectSlug,
  onClose,
  label,
}: LabelFormProps) {
  const isEditing = !!label
  const createLabel = useCreateLabel(workspaceId, projectSlug)
  const updateLabel = useUpdateLabel(workspaceId, projectSlug)

  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState<LabelColorDTO>(label?.color ?? 'ZINC')

  const isPending = createLabel.isPending || updateLabel.isPending

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()

    try {
      if (isEditing && label) {
        await updateLabel.mutateAsync({
          labelId: label.id,
          data: { name, color },
        })
        notify.success('Etiqueta atualizada')
      } else {
        await createLabel.mutateAsync({ name, color })
        notify.success('Etiqueta criada')
      }
      onClose()
    } catch (err) {
      notify.error(err)
    }
  }

  return (
    <div className='w-full flex items-center rounded-sm border border-border px-3.5 py-2 my-2'>
      <form className='w-full flex items-center gap-2' onSubmit={handleSubmit}>
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
                <Button
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
          placeholder='Título da etiqueta'
          className='flex-1'
        />
        <div className='flex items-center gap-1.5'>
          <Button variant='outline' size='xs' onClick={onClose}>
            Cancelar
          </Button>
          <Button type='submit' size='xs' disabled={isPending || !name.trim()}>
            {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
