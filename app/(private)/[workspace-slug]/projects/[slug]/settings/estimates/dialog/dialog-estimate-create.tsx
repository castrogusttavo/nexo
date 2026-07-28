'use client'

import { ArrowLeft01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notify } from '@/lib/notify'
import {
  useCreateEstimateValue,
  useDeleteEstimateValue,
  useEstimateSettings,
  useUpdateEstimateSettings,
} from '@/src/hooks/use-estimate'
import type { EstimateModelDTO, EstimateSystemDTO } from '@/types/estimate'

const MODELS_BY_SYSTEM: Record<
  EstimateSystemDTO,
  { value: EstimateModelDTO; label: string; preview: string[] }[]
> = {
  POINTS: [
    {
      value: 'FIBONACCI',
      label: 'Fibonacci',
      preview: ['1', '2', '3', '5', '8', '13', '21', '34', '55'],
    },
    {
      value: 'LINEAR',
      label: 'Linear',
      preview: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
    },
    {
      value: 'SQUARES',
      label: 'Squares',
      preview: ['1', '4', '9', '16', '25', '36', '49', '64', '81'],
    },
  ],
  CATEGORIES: [
    {
      value: 'T_SHIRT_SIZES',
      label: 'Tamanhos (T-shirt)',
      preview: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    },
    {
      value: 'EASY_TO_HARD',
      label: 'Fácil a difícil',
      preview: ['Fácil', 'Médio', 'Difícil', 'Muito difícil'],
    },
  ],
  TIME: [
    {
      value: 'HOURS',
      label: 'Horas',
      preview: ['1h', '2h', '4h', '8h', '16h', '40h'],
    },
  ],
}

const SYSTEM_TABS: { value: EstimateSystemDTO; label: string }[] = [
  { value: 'POINTS', label: 'Pontos' },
  { value: 'CATEGORIES', label: 'Categorias' },
  { value: 'TIME', label: 'Tempo' },
]

interface EstimateSystemFormProps {
  workspaceId: string
  projectSlug: string
  currentSystem: EstimateSystemDTO
  currentModel: EstimateModelDTO
  onBack: () => void
  onDone: () => void
}

export function EstimateSystemForm({
  workspaceId,
  projectSlug,
  currentSystem,
  currentModel,
  onBack,
  onDone,
}: EstimateSystemFormProps) {
  const [system, setSystem] = useState<EstimateSystemDTO>(currentSystem)
  const [model, setModel] = useState<EstimateModelDTO | null>(currentModel)

  const updateSettings = useUpdateEstimateSettings(workspaceId, projectSlug)
  const createValue = useCreateEstimateValue(workspaceId, projectSlug)
  const deleteValue = useDeleteEstimateValue(workspaceId, projectSlug)
  const { data: settings } = useEstimateSettings(workspaceId, projectSlug)

  const isPending =
    updateSettings.isPending || createValue.isPending || deleteValue.isPending

  async function handleConfirm() {
    if (!model) return

    const selectedModel = model
    const preset =
      MODELS_BY_SYSTEM[system].find((m) => m.value === model)?.preview ?? []
    const oldValues = settings?.values ?? []

    async function run() {
      await updateSettings.mutateAsync({ system, model: selectedModel })
      for (const value of preset) {
        await createValue.mutateAsync({ value })
      }
      for (const old of oldValues) {
        await deleteValue.mutateAsync(old.id)
      }
    }

    try {
      await notify.mutate(run(), {
        loading: 'Atualizando sistema de estimativa...',
        success: 'Sistema de estimativa atualizando',
        error: 'Erro ao atualizar sistema de estimativa',
      })
      onDone()
    } catch {
      //
    }
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
      <div className='space-y-1.5'>
        <Muted>Escolher um sistema de estimativa</Muted>
        <Tabs
          value={system}
          onValueChange={(value) => {
            if (!value) return
            setSystem(value as EstimateSystemDTO)
            setModel(null)
          }}
        >
          <TabsList className='mb-6'>
            {SYSTEM_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {SYSTEM_TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className='space-y-1.5'
            >
              <Muted>Escolher um modelo</Muted>
              <div className='grid grid-cols-2 gap-3'>
                {MODELS_BY_SYSTEM[tab.value].map((option) => (
                  <Button
                    key={option.value}
                    type='button'
                    variant={model === option.value ? 'secondary' : 'ghost'}
                    className='p-3 py-2.5 text-left rounded-md border border-border m-0 flex flex-col items-start min-h-16'
                    onClick={() => setModel(option.value)}
                  >
                    {option.label}
                    <Muted className='text-xs'>
                      {option.preview.join(', ')}
                    </Muted>
                  </Button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <DialogFooter className='m-0 border-t border-border pt-5 px-5'>
        <Button
          type='button'
          size='sm'
          disabled={!model || isPending}
          onClick={handleConfirm}
        >
          Confirmar
        </Button>
      </DialogFooter>
    </div>
  )
}
