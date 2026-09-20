'use client'

import {
  TagIcon,
  UserMultipleIcon,
  UserQuestion01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { useMemo, useState } from 'react'
import { useFilteredIssues } from '@/components/filters/use-filtered-issues'
import {
  type IconType,
  ListLayout,
  type ListLayoutCreateDefaults,
} from '@/components/layouts/list-layout'
import {
  type IssueSortBy,
  useIssueListPreferences,
} from '@/components/layouts/use-issue-list-preferences'
import { REMOVED_USER_NAME } from '@/lib/removed-user'
import { colorToText } from '@/lib/state-colors'
import { useCycles } from '@/src/hooks/use-cycle'
import { useLabels } from '@/src/hooks/use-label'
import { useModules } from '@/src/hooks/use-module'
import { useProjectMembers } from '@/src/hooks/use-project-member'
import { useStates } from '@/src/hooks/use-state'
import type { IssueDTO, IssuePriorityDTO } from '@/types/issue'
import {
  issueCyclesIcon,
  issueModulesIcon,
  issuePrioritiesIcon,
  issueStateIconMap,
  NO_STATE_LABEL,
} from './issue-icons'

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

  const defaultStateId =
    (states ?? []).find((state) => state.isDefault)?.id ?? states?.[0]?.id

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

  type Section = {
    id: string
    name: string
    icon?: IconType
    iconColor?: string
    iconStrokeWidth?: number
    avatar?: { image: string | null; name: string; username: string }
    items: typeof items
    createDefaults: ListLayoutCreateDefaults
  }

  const sections: Section[] = useMemo(() => {
    if (preferences.groupBy === 'priority') {
      return issuePrioritiesIcon.map((priority) => ({
        id: priority.priority,
        name: priority.label,
        icon: priority.icon,
        iconColor: priority.color,
        iconStrokeWidth: priority.strokeWidth,
        items: items.filter(
          (item) => item.issue.priority === priority.priority,
        ),
        createDefaults: {
          stateId: defaultStateId,
          priority: priority.priority,
        },
      }))
    }

    if (preferences.groupBy === 'cycle') {
      return [
        ...(cycles ?? []).map((cycle) => {
          const statusIcon =
            issueCyclesIcon.find((c) => c.status === cycle.status) ??
            issueCyclesIcon[0]
          return {
            id: cycle.id,
            name: cycle.name,
            icon: statusIcon.icon,
            iconColor: statusIcon.color,
            iconStrokeWidth: statusIcon.strokeWidth,
            items: items.filter((item) => item.issue.cycleId === cycle.id),
            createDefaults: { stateId: defaultStateId, cycleId: cycle.id },
          }
        }),
        {
          id: 'no-cycle',
          name: 'Sem ciclo',
          icon: issueCyclesIcon[0].icon,
          iconColor: issueCyclesIcon[0].color,
          iconStrokeWidth: issueCyclesIcon[0].strokeWidth,
          items: items.filter((item) => !item.issue.cycleId),
          createDefaults: { stateId: defaultStateId },
        },
      ]
    }

    if (preferences.groupBy === 'module') {
      return [
        ...(modules ?? []).map((mod) => ({
          id: mod.id,
          name: mod.name,
          icon: issueModulesIcon,
          items: items.filter((item) => item.issue.moduleId === mod.id),
          createDefaults: { stateId: defaultStateId, moduleId: mod.id },
        })),
        {
          id: 'no-module',
          name: 'Sem módulo',
          icon: issueModulesIcon,
          items: items.filter((item) => !item.issue.moduleId),
          createDefaults: { stateId: defaultStateId },
        },
      ]
    }

    if (preferences.groupBy === 'created-by') {
      if (!members) return []
      const memberIds = new Set(members.map((member) => member.userId))
      // A deleted author leaves the issue behind with no authorship at all.
      const removedAuthors = items.filter((item) => !item.issue.authorId)
      // Authors who have since left the project have no member section.
      const otherAuthors = items.filter(
        (item) => !!item.issue.authorId && !memberIds.has(item.issue.authorId),
      )
      return [
        ...members.map((member) => ({
          id: member.userId,
          name: member.name,
          avatar: {
            image: member.image,
            name: member.name,
            username: member.username,
          },
          items: items.filter((item) => item.issue.authorId === member.userId),
          createDefaults: { stateId: defaultStateId },
        })),
        ...(otherAuthors.length > 0
          ? [
              {
                id: 'other-authors',
                name: 'Outros',
                icon: UserQuestion01Icon,
                items: otherAuthors,
                createDefaults: { stateId: defaultStateId },
              },
            ]
          : []),
        ...(removedAuthors.length > 0
          ? [
              {
                id: 'removed-author',
                name: REMOVED_USER_NAME,
                icon: UserQuestion01Icon,
                items: removedAuthors,
                createDefaults: { stateId: defaultStateId },
              },
            ]
          : []),
      ]
    }

    if (preferences.groupBy === 'labels') {
      return [
        ...(labels ?? []).map((label) => ({
          id: label.id,
          name: label.name,
          icon: TagIcon,
          iconColor: colorToText(label.color),
          items: items.filter((item) => item.issue.labelIds.includes(label.id)),
          createDefaults: {
            stateId: defaultStateId,
            labelIdToAttach: label.id,
          },
        })),
        {
          id: 'no-label',
          name: 'Sem etiqueta',
          icon: TagIcon,
          items: items.filter((item) => item.issue.labelIds.length === 0),
          createDefaults: { stateId: defaultStateId },
        },
      ]
    }

    if (preferences.groupBy === 'assignees') {
      return [
        ...(members ?? []).map((member) => ({
          id: member.userId,
          name: member.name,
          avatar: {
            image: member.image,
            name: member.name,
            username: member.username,
          },
          items: items.filter((item) =>
            item.issue.assigneeIds.includes(member.userId),
          ),
          createDefaults: {
            stateId: defaultStateId,
            assigneeIdToAssign: member.userId,
          },
        })),
        {
          id: 'no-assignee',
          name: 'Sem responsável',
          icon: UserMultipleIcon,
          items: items.filter((item) => item.issue.assigneeIds.length === 0),
          createDefaults: { stateId: defaultStateId },
        },
      ]
    }

    if (preferences.groupBy === 'none') {
      return [
        {
          id: 'all',
          name: 'Todas as issues',
          icon: issueStateIconMap.BACKLOG.icon,
          iconStrokeWidth: issueStateIconMap.BACKLOG.strokeWidth,
          items,
          createDefaults: { stateId: defaultStateId },
        },
      ]
    }

    if (!states) return []
    // Issues pointing at a deleted state would otherwise match no section.
    const stateless = items.filter((item) => !item.state)
    return [
      ...[...states]
        .sort((a, b) => a.order - b.order)
        .map((state) => ({
          id: state.id,
          name: state.name,
          icon: issueStateIconMap[state.group].icon,
          iconColor: colorToText(state.color),
          iconStrokeWidth: issueStateIconMap[state.group].strokeWidth,
          items: items.filter((item) => item.state?.id === state.id),
          createDefaults: { stateId: state.id },
        })),
      ...(stateless.length > 0
        ? [
            {
              id: 'no-state',
              name: NO_STATE_LABEL,
              icon: issueStateIconMap.BACKLOG.icon,
              iconStrokeWidth: issueStateIconMap.BACKLOG.strokeWidth,
              items: stateless,
              createDefaults: { stateId: defaultStateId },
            },
          ]
        : []),
    ]
  }, [
    preferences.groupBy,
    items,
    states,
    cycles,
    modules,
    members,
    labels,
    defaultStateId,
  ])

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
