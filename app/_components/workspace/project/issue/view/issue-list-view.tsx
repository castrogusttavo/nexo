'use client'

import { useMemo, useState } from 'react'
import { useFilteredIssues } from '@/app/_components/workspace/project/issue/filter/use-filtered-issues'
import {
  type IssueSortBy,
  useIssueListPreferences,
} from '@/app/_components/workspace/project/issue/layout/use-issue-list-preferences'
import { ListLayout } from '@/components/layouts/list-layout'
import { useCycles } from '@/src/hooks/use-cycle'
import { useLabels } from '@/src/hooks/use-label'
import { useModules } from '@/src/hooks/use-module'
import { useProjectMembers } from '@/src/hooks/use-project-member'
import { useStates } from '@/src/hooks/use-state'
import type { IssueDTO, IssuePriorityDTO } from '@/types/issue'
import { buildIssueListSections } from './issue-list-sections'

const PRIORITY_RANK: Record<IssuePriorityDTO, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
}

function byTimestamp(
  pick: (issue: IssueDTO) => string | null,
  direction: 'asc' | 'desc',
) {
  return (a: IssueDTO, b: IssueDTO) => {
    const left = pick(a)
    const right = pick(b)
    if (left === right) return 0
    // Issues without the date always sink to the bottom.
    if (left === null) return 1
    if (right === null) return -1
    const diff = Date.parse(left) - Date.parse(right)
    return direction === 'asc' ? diff : -diff
  }
}

// `manual` keeps the API order; Array#sort is stable, so ties do too.
const ISSUE_COMPARATORS: Record<
  Exclude<IssueSortBy, 'manual'>,
  (a: IssueDTO, b: IssueDTO) => number
> = {
  'created-at': byTimestamp((issue) => issue.createdAt, 'desc'),
  'updated-at': byTimestamp((issue) => issue.updatedAt, 'desc'),
  'start-date': byTimestamp((issue) => issue.startDate, 'asc'),
  'due-date': byTimestamp((issue) => issue.dueDate, 'asc'),
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
}

interface IssueListViewProps {
  workspaceId: string
  workspaceSlug: string
  projectSlug: string
  projectIdentifier: string
}

export function IssueListView({
  workspaceId,
  workspaceSlug,
  projectSlug,
  projectIdentifier,
}: IssueListViewProps) {
  const { data: issues, ordered } = useFilteredIssues(
    workspaceId,
    projectSlug,
    projectIdentifier,
  )
  const { data: states } = useStates(workspaceId, projectSlug)
  const { data: cycles } = useCycles(workspaceId, projectSlug)
  const { data: modules } = useModules(workspaceId, projectSlug)
  const { data: members } = useProjectMembers(workspaceId, projectSlug)
  const { data: labels } = useLabels(workspaceId, projectSlug)
  const { preferences } = useIssueListPreferences()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const statesById = useMemo(
    () => new Map((states ?? []).map((state) => [state.id, state])),
    [states],
  )

  const items = useMemo(() => {
    const visible = preferences.showSubIssues
      ? [...(issues ?? [])]
      : (issues ?? []).filter((issue) => !issue.parentId)
    // A PQL order-by is an explicit request, so it wins over the preference.
    if (!ordered && preferences.sortBy !== 'manual')
      visible.sort(ISSUE_COMPARATORS[preferences.sortBy])
    return visible.map((issue) => ({
      issue,
      state: statesById.get(issue.stateId),
      identifier: `${projectIdentifier}-${issue.number}`,
      href: `/${workspaceSlug}/projects/${projectSlug}/issues/${projectIdentifier}-${issue.number}`,
    }))
  }, [
    issues,
    ordered,
    preferences.showSubIssues,
    preferences.sortBy,
    statesById,
    projectIdentifier,
    workspaceSlug,
    projectSlug,
  ])

  function toggleOne(issueId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(issueId)) next.delete(issueId)
      else next.add(issueId)
      return next
    })
  }

  function toggleGroup(issueIds: string[]) {
    setSelectedIds((current) => {
      const allSelected = issueIds.every((id) => current.has(id))
      const next = new Set(current)
      for (const id of issueIds) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  const commonProps = {
    selectedIds,
    onToggleOne: toggleOne,
    onToggleGroup: toggleGroup,
  }

  const sections = useMemo(
    () =>
      buildIssueListSections(preferences.groupBy, items, {
        states,
        cycles,
        modules,
        members,
        labels,
      }),
    [preferences.groupBy, items, states, cycles, modules, members, labels],
  )

  const visibleSections = preferences.showEmptyGroups
    ? sections
    : sections.filter((section) => section.items.length > 0)

  return (
    <>
      {visibleSections.map((section) => (
        <ListLayout
          key={section.id}
          workspaceId={workspaceId}
          projectSlug={projectSlug}
          createDefaults={section.createDefaults}
          sectionId={section.id}
          sectionIcon={section.icon}
          sectionIconColor={section.iconColor}
          sectionIconStrokeWidth={section.iconStrokeWidth}
          sectionAvatar={section.avatar}
          sectionName={section.name}
          items={section.items}
          {...commonProps}
        />
      ))}
    </>
  )
}
