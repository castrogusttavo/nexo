'use client'

import { Cancel01Icon } from '@hugeicons-pro/core-stroke-rounded'
import { useMemo, useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { useIssues } from '@/src/hooks/use-issue'
import {
  useCreateIssueRelation,
  useIssueRelations,
  useRemoveIssueRelation,
} from '@/src/hooks/use-issue-relation'
import type { IssueRelationTypeDTO } from '@/types/issue'
import { Combobox } from '../../ui/combobox'
import { issueRelationsIcon } from '../issue-icons'

const RELATION_TYPE_OPTIONS: Array<{
  value: IssueRelationTypeDTO
  label: string
}> = [
  { value: 'RELATES_TO', label: 'Relaciona com' },
  { value: 'IMPLEMENTS', label: 'Implementa' },
]

interface RelationsPickerProps {
  workspaceId: string
  projectSlug: string
  issueId: string
}

export function RelationsPicker({
  workspaceId,
  projectSlug,
  issueId,
}: RelationsPickerProps) {
  const { data: issues } = useIssues(workspaceId, projectSlug)
  const { data: relations } = useIssueRelations(
    workspaceId,
    projectSlug,
    issueId,
  )
  const createRelation = useCreateIssueRelation(
    workspaceId,
    projectSlug,
    issueId,
  )
  const removeRelation = useRemoveIssueRelation(
    workspaceId,
    projectSlug,
    issueId,
  )

  const [pendingType, setPendingType] = useState<
    IssueRelationTypeDTO | undefined
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
      createRelation.mutateAsync({
        targetId: pendingTargetId,
        type: pendingType,
      }),
      {
        loading: 'Adicionando relação...',
        success: 'Relação adicionada',
        error: 'Erro ao adicionar relação',
      },
    )
    setPendingType(undefined)
    setPendingTargetId(undefined)
  }

  function handleRemove(relationId: string) {
    notify.mutate(removeRelation.mutateAsync(relationId), {
      loading: 'Removendo relação...',
      success: 'Relação removida',
      error: 'Erro ao remover relação',
    })
  }

  return (
    <div className='flex flex-col gap-2'>
      {(relations ?? []).map((relation) => {
        const target = issuesById.get(relation.targetId)
        const typeLabel = RELATION_TYPE_OPTIONS.find(
          (t) => t.value === relation.type,
        )?.label
        return (
          <div
            key={relation.id}
            className='flex items-center justify-between gap-2 text-sm'
          >
            <span className='flex items-center gap-1.5'>
              <NexoIcon icon={issueRelationsIcon} strokeWidth={2} />
              {typeLabel}{' '}
              {target ? `#${target.number} ${target.title}` : relation.targetId}
            </span>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8'
              onClick={() => handleRemove(relation.id)}
            >
              <NexoIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </div>
        )
      })}

      <div className='flex items-center gap-2'>
        <Combobox
          options={RELATION_TYPE_OPTIONS}
          getValue={(option) => option.value}
          getSearchText={(option) => option.label}
          value={pendingType}
          onChange={(type) => setPendingType(type as IssueRelationTypeDTO)}
          emptyMessage='Nenhum resultado.'
          contentClassName='w-48'
          trigger={
            <Button variant='outline' size='sm' className='h-8'>
              {RELATION_TYPE_OPTIONS.find((t) => t.value === pendingType)
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
            !pendingType || !pendingTargetId || createRelation.isPending
          }
          onClick={handleAdd}
        >
          Adicionar
        </Button>
      </div>
    </div>
  )
}
