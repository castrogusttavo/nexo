'use client'

import { H3 } from '@/components/typography/heading/h3'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Switch } from '@/components/ui/switch'
import { notify } from '@/lib/notify'
import { useEstimateSettings } from '@/src/hooks/use-estimate'
import { useProject, useUpdateProject } from '@/src/hooks/use-project'
import { DialogEstimateEditOptions } from './dialog/dialog-estimate-edit'

const SYSTEM_LABEL: Record<string, string> = {
  POINTS: 'Pontos',
  CATEGORIES: 'Categorias',
  TIME: 'Tempo',
}

const MODEL_LABEL: Record<string, string> = {
  FIBONACCI: 'Fibonacci',
  LINEAR: 'Linear',
  SQUARES: 'Squares',
  T_SHIRT_SIZES: 'Tamanhos (T-shirt)',
  EASY_TO_HARD: 'Fácil a difícil',
  HOURS: 'Horas',
}

interface ProjectEstimatesSettingsProps {
  workspaceId: string
  projectSlug: string
}

export function ProjectEstimatesSettings({
  workspaceId,
  projectSlug,
}: ProjectEstimatesSettingsProps) {
  const { data: settings } = useEstimateSettings(workspaceId, projectSlug)
  const { data: project } = useProject(workspaceId, projectSlug)
  const updateProject = useUpdateProject(workspaceId, projectSlug)

  function handleToggleEnabled(checked: boolean) {
    notify.mutate(updateProject.mutateAsync({ estimatesEnabled: checked }), {
      loading: 'Atualizando...',
      success: 'Estimativas atualizadas',
      error: 'Erro ao atualizar estimativas',
    })
  }

  return (
    <div className='py-9 w-full max-w-225 mx-auto space-y-8'>
      <div className='w-full flex items-center justify-between'>
        <div>
          <H3>Estimativas</H3>
          <Muted>
            Elas ajudam você a comunicar a complexidade e a carga de trabalho da
            equipe.
          </Muted>
        </div>
      </div>
      <div className='border border-border rounded-lg w-full bg-card px-4 py-3 flex items-center justify-between gap-8'>
        <div className='space-y-1.5'>
          <span className='text-sm'>
            Habilitar estimativas para meu projeto
          </span>
          <Muted>
            Elas ajudam você a comunicar a complexidade e a carga de trabalho da
            equipe.
          </Muted>
        </div>
        <div>
          <Switch
            checked={project?.estimatesEnabled ?? true}
            onCheckedChange={handleToggleEnabled}
            disabled={!project || updateProject.isPending}
          />
        </div>
      </div>
      <div className='space-y-2'>
        <H4 className='font-medium text-base'>Estimativa</H4>
        <div className='border border-border rounded-lg w-full bg-card px-4 py-3 flex items-center justify-between gap-8'>
          <div className='space-y-1.5'>
            <span className='text-sm'>
              {settings ? SYSTEM_LABEL[settings.system] : ''}{' '}
              <span className='text-xs font-medium'>
                ({settings ? MODEL_LABEL[settings.model] : ''})
              </span>
            </span>
            <Muted>{settings?.values.map((v) => v.value).join(', ')}</Muted>
          </div>
          {settings && (
            <DialogEstimateEditOptions
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              currentSystem={settings.system}
              currentModel={settings.model}
            />
          )}
        </div>
      </div>
    </div>
  )
}
