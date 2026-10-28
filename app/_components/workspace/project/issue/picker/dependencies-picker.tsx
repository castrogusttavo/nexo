'use client'

import { notify } from '@/lib/notify'
import {
  useCreateIssueDependency,
  useIssueDependencies,
  useRemoveIssueDependency,
} from '@/src/hooks/use-issue-dependency'
import {
  ISSUE_DEPENDENCY_DISPLAY_TO_DB,
  ISSUE_DEPENDENCY_OUTBOUND_TYPES,
  type IssueDependencyDisplayType,
  issueDependenciesIcon,
  resolveDependencyDisplayType,
} from '../issue-icons'
import { IssueLinkPicker, type IssueLinkTypeOption } from './issue-link-picker'

const DEPENDENCY_TYPES: IssueLinkTypeOption<IssueDependencyDisplayType>[] =
  issueDependenciesIcon.map(({ type, ...option }) => ({
    value: type,
    ...option,
  }))

// A new dependency is always written from this issue's side.
const OUTBOUND_TYPES = DEPENDENCY_TYPES.filter((option) =>
  ISSUE_DEPENDENCY_OUTBOUND_TYPES.includes(option.value),
)

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

  return (
    <IssueLinkPicker
      workspaceId={workspaceId}
      projectSlug={projectSlug}
      issueId={issueId}
      links={dependencies ?? []}
      typeOptions={OUTBOUND_TYPES}
      describe={(dependency) => {
        const displayType = resolveDependencyDisplayType(dependency, issueId)
        return DEPENDENCY_TYPES.find((option) => option.value === displayType)
      }}
      removeLabel='Remover dependência'
      adding={createDependency.isPending}
      onAdd={(type, targetId) =>
        notify.run(
          createDependency.mutateAsync({
            targetId,
            type: ISSUE_DEPENDENCY_DISPLAY_TO_DB[type],
          }),
          {
            loading: 'Adicionando dependência...',
            success: 'Dependência adicionada',
            error: 'Erro ao adicionar dependência',
          },
        )
      }
      onRemove={(dependencyId) =>
        notify.run(removeDependency.mutateAsync(dependencyId), {
          loading: 'Removendo dependência...',
          success: 'Dependência removida',
          error: 'Erro ao remover dependência',
        })
      }
    />
  )
}
