'use client'

import {
  ArrowLeft01Icon,
  Delete02Icon,
  PencilEdit01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { GripVerticalIcon } from 'lucide-react'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable'
import { notify } from '@/lib/notify'
import {
  useCreateEstimateValue,
  useDeleteEstimateValue,
  useEstimateSettings,
  useReorderEstimateValues,
  useUpdateEstimateValue,
} from '@/src/hooks/use-estimate'
import type { EstimateValueDTO } from '@/types/estimate'

interface EstimateValuesFormProps {
  workspaceId: string
  projectSlug: string
  onBack: () => void
}

export function EstimateValuesForm({
  workspaceId,
  projectSlug,
  onBack,
}: EstimateValuesFormProps) {
  const { data: settings } = useEstimateSettings(workspaceId, projectSlug)
  const createValue = useCreateEstimateValue(workspaceId, projectSlug)
  const updateValue = useUpdateEstimateValue(workspaceId, projectSlug)
  const deleteValue = useDeleteEstimateValue(workspaceId, projectSlug)
  const reorderValues = useReorderEstimateValues(workspaceId, projectSlug)

  const [newValue, setNewValue] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  function handleReorder(newOrder: EstimateValueDTO[]) {
    reorderValues.mutate(
      newOrder.map((v) => v.id),
      { onError: notify.error },
    )
  }

  async function handleAdd() {
    if (!newValue.trim()) return
    try {
      await createValue.mutateAsync({ value: newValue.trim() })
      setNewValue('')
    } catch (err) {
      notify.error(err)
    }
  }

  async function handleSaveEdit(valueId: string) {
    if (!editingValue.trim()) return
    try {
      await updateValue.mutateAsync({
        valueId,
        data: { value: editingValue.trim() },
      })
      setEditingId(null)
    } catch (err) {
      notify.error(err)
    }
  }

  function handleDelete(valueId: string) {
    deleteValue.mutate(valueId, { onError: notify.error })
  }

  return (
    <div className='space-y-6'>
      <DialogHeader className='w-full flex-row items-center h-fit'>
        <Button type='button' variant='ghost' size='icon-sm' onClick={onBack}>
          <NexoIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <DialogTitle className='text-xl font-medium'>
          Editar sistema de estimativas
        </DialogTitle>
      </DialogHeader>
      <Sortable
        value={settings?.values ?? []}
        onValueChange={handleReorder}
        getItemValue={(v: EstimateValueDTO) => v.id}
        strategy='vertical'
        className='space-y-1.5'
      >
        {(settings?.values ?? []).map((value) => (
          <SortableItem key={value.id} value={value.id}>
            <div className='flex items-center gap-2 rounded-md border border-border p-2'>
              <SortableItemHandle className='text-muted-foreground hover:text-foreground cursor-grab'>
                <GripVerticalIcon className='size-4' />
              </SortableItemHandle>
              {editingId === value.id ? (
                <Input
                  autoFocus
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={() => handleSaveEdit(value.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(value.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className='h-7 flex-1'
                />
              ) : (
                <span className='flex-1 text-sm'>{value.value}</span>
              )}
              <div className='flex items-center gap-1'>
                <Button
                  size='icon-sm'
                  variant='ghost'
                  onClick={() => {
                    setEditingId(value.id)
                    setEditingValue(value.value)
                  }}
                >
                  <NexoIcon icon={PencilEdit01Icon} strokeWidth={2} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button size='icon-sm' variant='ghost'>
                        <NexoIcon icon={Delete02Icon} strokeWidth={2} />
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>Excluir valor</AlertDialogHeader>
                    <AlertDialogDescription>
                      Esse valor deixará de estar disponível para novas
                      estimativas. Essa ação não pode ser desfeita.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        variant='destructive'
                        onClick={() => handleDelete(value.id)}
                        disabled={deleteValue.isPending}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </SortableItem>
        ))}
      </Sortable>
      <div className='flex items-center gap-2'>
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder='Novo valor'
          className='h-8 flex-1'
        />
        <Button
          size='xs'
          onClick={handleAdd}
          disabled={createValue.isPending || !newValue.trim()}
        >
          Adicionar
        </Button>
      </div>
    </div>
  )
}
