'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCycles } from '@/src/hooks/use-cycle'
import { useIssues } from '@/src/hooks/use-issue'
import { useIssueTypes } from '@/src/hooks/use-issue-type'
import { useLabels } from '@/src/hooks/use-label'
import { useModules } from '@/src/hooks/use-module'
import { useProjectMembers } from '@/src/hooks/use-project-member'
import { useStates } from '@/src/hooks/use-state'
import { authClient } from '@/src/lib/auth-client'
import {
  applyIssueFilters,
  isIssueFilterActive,
  usesCurrentUser,
} from './apply-issue-filters'
import { useIssueFilters } from './use-issue-filters'

/**
 * `useIssues` narrowed by the filters in the URL (`mode`, `filters`, `pql`).
 * Same shape as `useIssues`, plus what the filter UI needs to report.
 */
export function useFilteredIssues(
  workspaceId: string,
  projectSlug: string,
  projectIdentifier?: string,
) {
  const issuesQuery = useIssues(workspaceId, projectSlug)
  const [filterState] = useIssueFilters()

  // The lookups resolve names, state groups and `me`; an empty workspace id
  // keeps them disabled while nothing is filtered.
  const active = isIssueFilterActive(filterState)
  const lookupWorkspaceId = active ? workspaceId : ''
  const { data: states } = useStates(lookupWorkspaceId, projectSlug)
  const { data: types } = useIssueTypes(lookupWorkspaceId, projectSlug)
  const { data: labels } = useLabels(lookupWorkspaceId, projectSlug)
  const { data: cycles } = useCycles(lookupWorkspaceId, projectSlug)
  const { data: modules } = useModules(lookupWorkspaceId, projectSlug)
  const { data: members } = useProjectMembers(lookupWorkspaceId, projectSlug)
  const { data: currentUserId } = useQuery({
    queryKey: ['session-user-id'],
    queryFn: async () => {
      const { data } = await authClient.getSession()
      return data?.user.id ?? null
    },
    enabled: usesCurrentUser(filterState),
    staleTime: 5 * 60 * 1000,
  })

  const issues = issuesQuery.data
  const result = useMemo(
    () =>
      applyIssueFilters(issues ?? [], filterState, {
        states,
        types,
        labels,
        cycles,
        modules,
        members,
        currentUserId,
        projectIdentifier,
      }),
    [
      issues,
      filterState,
      states,
      types,
      labels,
      cycles,
      modules,
      members,
      currentUserId,
      projectIdentifier,
    ],
  )

  return {
    ...issuesQuery,
    data: issues ? result.issues : undefined,
    unsupported: result.unsupported,
    // Not `error`: that stays the query's fetch error.
    filterError: result.error,
    ordered: result.ordered,
    active: result.active,
  }
}
