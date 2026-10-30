'use client'

import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
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

  const trigger = (
    <Button variant='destructive' size='sm'>
      Excluir
    </Button>
  )

  async function handleDelete() {
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
      <ConfirmDialog
        trigger={trigger}
        title='Cancele a assinatura primeiro'
        description='Este workspace tem um plano pago ou um período de teste ativo. Cancele a assinatura para poder excluí-lo.'
        confirmLabel='Ir para a assinatura'
        onConfirm={() => router.push(`/${workspace.slug}/settings/billing`)}
      />
    )
  }

  return (
    <ConfirmDialog
      trigger={trigger}
      title={`Excluir ${workspace.name}?`}
      description='Todos os projetos, páginas e dados de todos os membros serão apagados permanentemente. Esta ação não pode ser desfeita.'
      confirmLabel='Excluir workspace'
      pendingLabel='Excluindo...'
      destructive
      pending={remove.isPending}
      onConfirm={handleDelete}
    />
  )
}
