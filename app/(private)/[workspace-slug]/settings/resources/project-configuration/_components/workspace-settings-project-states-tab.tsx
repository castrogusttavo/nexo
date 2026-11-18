'use client'

import { CircleDotIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { H4 } from '@/components/typography/heading/h4'
import { Muted } from '@/components/typography/text/muted'
import { Field } from '@/components/ui/field'
import { IconStack } from '@/components/ui/icon-stack'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { notify } from '@/lib/notify'
import { useUpdateWorkspace } from '@/src/hooks/use-workspace'
import type { WorkspaceDTO } from '@/types/workspace'
import { WorkspaceSettingsProjectStatesList } from './workspace-settings-project-states-list'

export function WorkspaceSettingsProjectStatesTab({
  workspace,
  canConfigure,
}: {
  workspace: WorkspaceDTO
  canConfigure: boolean
}) {
  const update = useUpdateWorkspace(workspace.id)

  function handleToggle(checked: boolean) {
    notify.run(update.mutateAsync({ projectStatesEnabled: checked }), {
      loading: 'Salvando...',
      success: checked
        ? 'Estados do projeto ativados'
        : 'Estados do projeto desativados',
      error: 'Não foi possível salvar a configuração',
    })
  }

  return (
    <>
      <Field
        orientation='horizontal'
        className='w-full bg-secondary rounded-lg justify-between px-4 py-3 flex items-center gap-4 md:gap-8'
      >
        <div className='space-y-1.5'>
          <Label id='project-states-enabled'>Ativar estados do projeto</Label>
          <Muted>
            Acompanhe o progresso de todos os seus projetos por qualquer
            propriedade do projeto.
          </Muted>
        </div>
        <Switch
          aria-labelledby='project-states-enabled'
          checked={workspace.projectStatesEnabled}
          disabled={!canConfigure || update.isPending}
          onCheckedChange={handleToggle}
        />
      </Field>
      <div className='space-y-3'>
        <div className='space-y-1'>
          <H4>Estados</H4>
          <Muted>
            Personalize os estados usados para acompanhar o progresso dos
            projetos deste workspace.
          </Muted>
        </div>
        {workspace.projectStatesEnabled ? (
          <WorkspaceSettingsProjectStatesList
            workspaceId={workspace.id}
            canConfigure={canConfigure}
          />
        ) : (
          <div className='w-full border border-border flex justify-center items-center py-10 rounded-lg'>
            <div className='max-w-100 space-y-3 text-center flex flex-col items-center justify-center'>
              <IconStack className='flex items-center justify-center size-8 h-22 w-20'>
                <NexoIcon
                  icon={CircleDotIcon}
                  strokeWidth={2}
                  className='size-6'
                />
              </IconStack>
              <div className='space-y-4'>
                <H4>Ativar estados do projeto</H4>
                <Muted>
                  Os gerentes de projeto agora podem ver o progresso geral de
                  todos os projetos em uma única tela. Ative os estados do
                  projeto acima, defina estados para seus projetos e comece a
                  acompanhar o progresso.
                </Muted>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
