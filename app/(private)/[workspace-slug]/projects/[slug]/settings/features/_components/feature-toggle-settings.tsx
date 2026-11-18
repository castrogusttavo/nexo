'use client'

import { SettingsPage } from '@/app/(private)/_components/settings-page'
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
    notify.run(updateProject.mutateAsync({ [field]: checked }), {
      loading: 'Atualizando...',
      success: 'Configuração atualizada',
      error: 'Erro ao atualizar',
    })
  }

  return (
    <SettingsPage title={title} description={description}>
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
    </SettingsPage>
  )
}
