'use client'

import { Cancel01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useMemo, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { useIssues } from '@/src/hooks/use-issue'
import {
  useCreateIssueDependency,
  useIssueDependencies,
  useRemoveIssueDependency,
} from '@/src/hooks/use-issue-dependency'
import type { IssueDependencyTypeDTO } from '@/types/issue'
import { Combobox } from '../../ui/combobox'

const DEPENDENCY_TYPE_OPTIONS: Array<{
  value: IssueDependencyTypeDTO
  label: string
}> = [
  { value: 'BLOCKS', label: 'Bloqueia' },
  { value: 'STARTS_BEFORE', label: 'Inicia antes de' },
  { value: 'FINISHES_BEFORE', label: 'Termina antes de' },
]

interface DependenciesPickerProps {
  workspaceId: string
  projectSlug: string
  issueId: string
}

export function DependenciesPicker({
  workspaceId,
  projectSlug,
  issueId,
}: DependenciesPickerProps) {
  const { data: issues } = useIssues(workspaceId, projectSlug)
  const { data: dependencies } = useIssueDependencies(
    workspaceId,
    projectSlug,
    issueId,
  )
  const createDependency = useCreateIssueDependency(
    workspaceId,
    projectSlug,
    issueId,
  )
  const removeDependency = useRemoveIssueDependency(
    workspaceId,
    projectSlug,
    issueId,
  )

  const [pendingType, setPendingType] = useState<
    IssueDependencyTypeDTO | undefined
  >(undefined)
  const [pendingTargetId, setPendingTargetId] = useState<string | undefined>(
    undefined,
  )

  const issuesById = useMemo(
    () => new Map((issues ?? []).map((issue) => [issue.id, issue])),
    [issues],
  )
  const issueOptions = (issues ?? []).filter((issue) => issue.id !== issueId)
  const pendingTarget = pendingTargetId
    ? issuesById.get(pendingTargetId)
    : undefined

  function handleAdd() {
    if (!pendingType || !pendingTargetId) return
    notify.mutate(
      createDependency.mutateAsync({
        targetId: pendingTargetId,
        type: pendingType,
      }),
      {
        loading: 'Adicionando dependência...',
        success: 'Dependência adicionada',
        error: 'Erro ao adicionar dependência',
      },
    )
    setPendingType(undefined)
    setPendingTargetId(undefined)
  }

  function handleRemove(dependencyId: string) {
    notify.mutate(removeDependency.mutateAsync(dependencyId), {
      loading: 'Removendo dependência...',
      success: 'Dependência removida',
      error: 'Erro ao remover dependência',
    })
  }

  return (
    <div className='flex flex-col gap-2'>
      {(dependencies ?? []).map((dependency) => {
        const target = issuesById.get(dependency.targetId)
        const typeLabel = DEPENDENCY_TYPE_OPTIONS.find(
          (t) => t.value === dependency.type,
        )?.label
        return (
          <div
            key={dependency.id}
            className='flex items-center justify-between gap-2 text-sm'
          >
            <span>
              {typeLabel}{' '}
              {target
                ? `#${target.number} ${target.title}`
                : dependency.targetId}
            </span>
            <Button
              variant='ghost'
              size='icon'
              className='size-8'
              onClick={() => handleRemove(dependency.id)}
            >
              <NexoIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </div>
        )
      })}
      <div className='flex items-center gap-2'>
        <Combobox
          options={DEPENDENCY_TYPE_OPTIONS}
          getValue={(option) => option.value}
          getSearchText={(option) => option.label}
          value={pendingType}
          onChange={(type) => setPendingType(type as IssueDependencyTypeDTO)}
          emptyMessage='Nenhum resultado.'
          contentClassName='w-48'
          trigger={
            <Button variant='outline' size='sm' className='h-8'>
              {DEPENDENCY_TYPE_OPTIONS.find((t) => t.value === pendingType)
                ?.label ?? 'Tipo'}
            </Button>
          }
          renderItem={(option) => option.label}
        />
        <Combobox
          options={issueOptions}
          getValue={(issue) => issue.id}
          getSearchText={(issue) => `${issue.number} ${issue.title}`}
          value={pendingTargetId}
          onChange={setPendingTargetId}
          emptyMessage='Nenhum resultado.'
          contentClassName='w-64'
          trigger={
            <Button variant='outline' size='sm' className='h-8'>
              {pendingTarget
                ? `#${pendingTarget.number} ${pendingTarget.title}`
                : 'Issue'}
            </Button>
          }
          renderItem={(issue) => `#${issue.number} ${issue.title}`}
        />
        <Button
          variant='outline'
          size='sm'
          className='h-8'
          disabled={
            !pendingType || !pendingTargetId || createDependency.isPending
          }
          onClick={handleAdd}
        >
          Adicionar
        </Button>
      </div>
    </div>
  )
}
