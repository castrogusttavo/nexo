'use client'

import { useRouter } from 'next/navigation'
import { RiskActionDialog } from '@/app/_components/risck-action-dialog'
import { notify } from '@/lib/notify'
import { useDeleteWorkspace } from '@/src/hooks/use-workspace'
import type { WorkspaceDTO } from '@/types/workspace'

export function WorkspaceSettingsDeleteDialog({
  workspace,
}: {
  workspace: WorkspaceDTO
}) {
  const router = useRouter()
  const remove = useDeleteWorkspace(workspace.id)

  async function handleDelete() {
    if (remove.isPending) return

    const ok = await notify.run(remove.mutateAsync(), {
      loading: 'Excluindo workspace...',
      success: 'Workspace excluído',
      error: 'Não foi possível excluir o workspace',
    })
    // /create-workspace is where the DAL sends a user left with no membership
    if (ok) router.replace('/create-workspace')
  }

  // A paid plan or a trial has to be cancelled first; the API refuses
  // WORKSPACE_HAS_ACTIVE_PLAN too, this just says so before the request.
  if (workspace.activePlan !== 'FREE') {
    return (
      <RiskActionDialog
        trigger='Excluir'
        title='Cancele a assinatura primeiro'
        description='Este workspace tem um plano pago ou um período de teste ativo. Cancele a assinatura para poder excluí-lo.'
        action='Ir para a assinatura'
        onClick={() => router.push(`/${workspace.slug}/settings/billing`)}
      />
    )
  }

  return (
    <RiskActionDialog
      trigger='Excluir'
      title={`Excluir ${workspace.name}?`}
      description='Todos os projetos, páginas e dados de todos os membros serão apagados permanentemente. Esta ação não pode ser desfeita.'
      action='Excluir workspace'
      onClick={handleDelete}
    />
  )
}
