'use client'

import { useState } from 'react'
import { ColorSwatchPicker } from '@/app/_components/ui/color-swatch-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

    const promise =
      isEditing && label
        ? updateLabel.mutateAsync({ labelId: label.id, data: { name, color } })
        : createLabel.mutateAsync({ name, color })

    try {
      await notify.mutate(promise, {
        loading: isEditing ? 'Salvando etiqueta...' : 'Criando etiqueta...',
        success: isEditing ? 'Etiqueta atualizada' : 'Etiqueta criada',
        error: 'Erro ao salvar etiqueta',
      })
      onClose()
    } catch {
      //
    }
  }

  return (
    <div className='w-full flex items-center rounded-sm border border-border px-3.5 py-2 my-2'>
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
          className='flex-1'
        />
        <div className='flex items-center gap-1.5'>
          <Button variant='outline' size='xs' onClick={onClose}>
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
