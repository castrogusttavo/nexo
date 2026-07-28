'use client'

import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import { Switch } from '@/components/ui/switch'
import { notify } from '@/lib/notify'
import { useProject, useUpdateProject } from '@/src/hooks/use-project'

interface FeatureToggleSettingsProps {
  workspaceId: string
  projectSlug: string
  field: 'cyclesEnabled' | 'modulesEnabled'
  title: string
  description: string
  toggleLabel: string
  toggleDescription: string
}

export function FeatureToggleSettings({
  workspaceId,
  projectSlug,
  field,
  title,
  description,
  toggleLabel,
  toggleDescription,
}: FeatureToggleSettingsProps) {
  const { data: project } = useProject(workspaceId, projectSlug)
  const updateProject = useUpdateProject(workspaceId, projectSlug)

  function handleToggle(checked: boolean) {
    notify.mutate(updateProject.mutateAsync({ [field]: checked }), {
      loading: 'Atualizando...',
      success: 'Configuração atualizada',
      error: 'Erro ao atualizar',
    })
  }

  return (
    <div className='py-9 w-full max-w-225 mx-auto space-y-8'>
      <div className='w-full flex items-center justify-between'>
        <div>
          <H3>{title}</H3>
          <Muted>{description}</Muted>
        </div>
      </div>
      <div className='border border-border rounded-lg w-full bg-card px-4 py-3 flex items-center justify-between gap-8'>
        <div className='space-y-1.5'>
          <span className='text-sm'>{toggleLabel}</span>
          <Muted>{toggleDescription}</Muted>
        </div>
        <div>
          <Switch
            checked={project?.[field] ?? true}
            onCheckedChange={handleToggle}
            disabled={!project || updateProject.isPending}
          />
        </div>
      </div>
    </div>
  )
}
