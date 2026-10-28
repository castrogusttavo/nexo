'use client'

import { notify } from '@/lib/notify'
import {
  useCreateIssueRelation,
  useIssueRelations,
  useRemoveIssueRelation,
} from '@/src/hooks/use-issue-relation'
import type { IssueRelationTypeDTO } from '@/types/issue'
import { issueRelationsIcon } from '../issue-icons'
import { IssueLinkPicker, type IssueLinkTypeOption } from './issue-link-picker'

const RELATION_TYPE_OPTIONS: IssueLinkTypeOption<IssueRelationTypeDTO>[] = [
  { value: 'RELATES_TO', label: 'Relaciona com', icon: issueRelationsIcon },
  { value: 'IMPLEMENTS', label: 'Implementa', icon: issueRelationsIcon },
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

  return (
    <IssueLinkPicker
      workspaceId={workspaceId}
      projectSlug={projectSlug}
      issueId={issueId}
      links={relations ?? []}
      typeOptions={RELATION_TYPE_OPTIONS}
      describe={(relation) =>
        RELATION_TYPE_OPTIONS.find((t) => t.value === relation.type)
      }
      removeLabel='Remover relação'
      adding={createRelation.isPending}
      onAdd={(type, targetId) =>
        notify.run(createRelation.mutateAsync({ targetId, type }), {
          loading: 'Adicionando relação...',
          success: 'Relação adicionada',
          error: 'Erro ao adicionar relação',
        })
      }
      onRemove={(relationId) =>
        notify.run(removeRelation.mutateAsync(relationId), {
          loading: 'Removendo relação...',
          success: 'Relação removida',
          error: 'Erro ao remover relação',
        })
      }
    />
  )
}
