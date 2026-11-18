'use client'

import type { Role } from '@prisma/client'
import { H3 } from '@/components/typography/heading/h3'
import { Muted } from '@/components/typography/text/muted'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notify } from '@/lib/notify'
import { useUpdateWorkspace, useWorkspace } from '@/src/hooks/use-workspace'
import type { WorkspaceDTO } from '@/types/workspace'
import { WorkspaceSettingsProjectLabelsTab } from './workspace-settings-project-labels-tab'
import { WorkspaceSettingsProjectStatesTab } from './workspace-settings-project-states-tab'

export function WorkspaceSettingsProjectConfiguration({
  workspace: initialWorkspace,
  role,
}: {
  workspace: WorkspaceDTO
  role: Role
}) {
  // The server-rendered workspace is only the starting point; see the general
  // settings form for why the screen follows the query afterwards.
  const { data: workspace } = useWorkspace(
    initialWorkspace.id,
    initialWorkspace,
  )
  const update = useUpdateWorkspace(workspace.id)
  const canConfigure = role === 'OWNER' || role === 'ADMIN'

  function handleMembersCanCreate(checked: boolean) {
    notify.run(update.mutateAsync({ membersCanCreateProjects: checked }), {
      loading: 'Salvando...',
      success: checked
        ? 'Membros podem criar projetos'
        : 'Só administradores criam projetos',
      error: 'Não foi possível salvar a configuração',
    })
  }

  return (
    <div className='py-9 w-full max-w-200 mx-auto space-y-6'>
      <div className='space-y-1'>
        <H3>Projetos</H3>
        <Muted>
          Os estados e as etiquetas definidos aqui se aplicam a todos os
          projetos deste workspace, para que todos sigam a mesma estrutura.
        </Muted>
      </div>
      <Field
        orientation='horizontal'
        className='w-full bg-accent rounded-lg justify-between px-4 py-3 flex items-center gap-4 md:gap-8'
      >
        <div className='space-y-1.5'>
          <Label id='members-can-create-projects'>
            Permitir que membros criem projetos
          </Label>
          <Muted>
            Quando ativado, os membros podem criar novos projetos, não apenas
            administradores e proprietários.
          </Muted>
        </div>
        <Switch
          aria-labelledby='members-can-create-projects'
          checked={workspace.membersCanCreateProjects}
          disabled={!canConfigure || update.isPending}
          onCheckedChange={handleMembersCanCreate}
        />
      </Field>
      <Tabs defaultValue='state-project' className='space-y-3 gap-3'>
        <TabsList variant='line'>
          <TabsTrigger value='state-project'>Estados do projeto</TabsTrigger>
          <TabsTrigger value='label-project'>Etiquetas do projeto</TabsTrigger>
        </TabsList>
        <TabsContent value='state-project' className='space-y-12'>
          <WorkspaceSettingsProjectStatesTab
            workspace={workspace}
            canConfigure={canConfigure}
          />
        </TabsContent>
        <TabsContent value='label-project' className='space-y-3'>
          <WorkspaceSettingsProjectLabelsTab
            workspaceId={workspace.id}
            canConfigure={canConfigure}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
