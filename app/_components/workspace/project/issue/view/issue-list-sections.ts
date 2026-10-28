import {
  TagIcon,
  UserMultipleIcon,
  UserQuestion01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import type {
  IconType,
  ListLayoutCreateDefaults,
} from '@/components/layouts/list-layout'
import { REMOVED_USER_NAME } from '@/lib/removed-user'
import { colorToText } from '@/lib/state-colors'
import type { CycleDTO } from '@/types/cycle'
import type { IssueDTO } from '@/types/issue'
import type { LabelDTO } from '@/types/label'
import type { ModuleDTO } from '@/types/module'
import type { ProjectMemberDTO } from '@/types/project'
import type { StateDTO } from '@/types/state'
import {
  issueCyclesIcon,
  issueModulesIcon,
  issuePrioritiesIcon,
  issueStateIconMap,
  NO_STATE_LABEL,
} from '../issue-icons'
import type { IssueGroupBy } from '../layout/use-issue-list-preferences'

export interface IssueListItem {
  issue: IssueDTO
  state: StateDTO | undefined
  identifier: string
  href: string
}

export interface IssueListSection {
  id: string
  name: string
  icon?: IconType
  iconColor?: string
  iconStrokeWidth?: number
  avatar?: { image: string | null; name: string; username: string }
  items: IssueListItem[]
  createDefaults: ListLayoutCreateDefaults
}

export interface IssueListSources {
  states: StateDTO[] | undefined
  cycles: CycleDTO[] | undefined
  modules: ModuleDTO[] | undefined
  members: ProjectMemberDTO[] | undefined
  labels: LabelDTO[] | undefined
}

/** Splits the list view's issues into the sections of the chosen grouping. */
export function buildIssueListSections(
  groupBy: IssueGroupBy,
  items: IssueListItem[],
  { states, cycles, modules, members, labels }: IssueListSources,
): IssueListSection[] {
  const defaultStateId =
    (states ?? []).find((state) => state.isDefault)?.id ?? states?.[0]?.id

  if (groupBy === 'priority') {
    return issuePrioritiesIcon.map((priority) => ({
      id: priority.priority,
      name: priority.label,
      icon: priority.icon,
      iconColor: priority.color,
      iconStrokeWidth: priority.strokeWidth,
      items: items.filter((item) => item.issue.priority === priority.priority),
      createDefaults: {
        stateId: defaultStateId,
        priority: priority.priority,
      },
    }))
  }

  if (groupBy === 'cycle') {
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

  if (groupBy === 'module') {
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

  if (groupBy === 'created-by') {
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

  if (groupBy === 'labels') {
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

  if (groupBy === 'assignees') {
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

  if (groupBy === 'none') {
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
}
