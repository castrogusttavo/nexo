'use client'

import { Muted } from '@/components/typography/text/muted'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { notify } from '@/lib/notify'
import { useProject, useUpdateProject } from '@/src/hooks/use-project'

interface ProjectUpdatesToggleProps {
  workspaceId: string
  projectSlug: string
}

export function ProjectUpdatesToggle({
  workspaceId,
  projectSlug,
}: ProjectUpdatesToggleProps) {
  const { data: project } = useProject(workspaceId, projectSlug)
  const updateProject = useUpdateProject(workspaceId, projectSlug)

  function handleToggle(checked: boolean) {
    notify.run(updateProject.mutateAsync({ updatesEnabled: checked }), {
      loading: 'Atualizando...',
      success: checked
        ? 'Atualizações do projeto ativadads'
        : 'Atualizações do projeto desativadas',
      error: 'Erro ao atualizar',
    })
  }

  return (
    <Field
      orientation='horizontal'
      className='w-full bg-accent rounded-lg justify-between px-4 py-3 flex items-center gap-4 md:gap-8'
    >
      <div className='space-y-1.5'>
        <Label id='members-can-create-projects'>
          Habilitar atualizações do projeto
        </Label>
        <Muted>
          Permita que qualquer pessoa publique atualizações de status neste
          projeto.
        </Muted>
      </div>
      <Switch
        aria-labelledby='members-can-create-projects'
        checked={project?.updatesEnabled ?? false}
        disabled={!project || updateProject.isPending}
        onCheckedChange={handleToggle}
      />
    </Field>
  )
}
