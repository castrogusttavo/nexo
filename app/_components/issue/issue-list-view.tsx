'use client'

import { TagIcon, UserMultipleIcon } from '@hugeicons-pro/core-stroke-rounded'
import { useMemo, useState } from 'react'
import {
  type IconType,
  ListLayout,
  type ListLayoutCreateDefaults,
} from '@/components/layouts/list-layout'
import { useIssueListPreferences } from '@/components/layouts/use-issue-list-preferences'
import { colorToText } from '@/lib/state-colors'
import { useCycles } from '@/src/hooks/use-cycle'
import { useIssues } from '@/src/hooks/use-issue'
import { useLabels } from '@/src/hooks/use-label'
import { useModules } from '@/src/hooks/use-module'
import { useProjectMembers } from '@/src/hooks/use-project-member'
import { useStates } from '@/src/hooks/use-state'
import {
  issueCyclesIcon,
  issueModulesIcon,
  issuePrioritiesIcon,
  issueStateIconMap,
} from './issue-icons'

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
  const { data: issues } = useIssues(workspaceId, projectSlug)
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

  const items = useMemo(
    () =>
      (issues ?? []).map((issue) => ({
        issue,
        state: statesById.get(issue.stateId),
        identifier: `${projectIdentifier}-${issue.number}`,
        href: `/${workspaceSlug}/projects/${projectSlug}/issues/${projectIdentifier}-${issue.number}`,
      })),
    [issues, statesById, projectIdentifier, workspaceSlug, projectSlug],
  )

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
      return (members ?? []).map((member) => ({
        id: member.userId,
        name: member.name,
        avatar: {
          image: member.image,
          name: member.name,
          username: member.username,
        },
        items: items.filter((item) => item.issue.authorId === member.userId),
        createDefaults: { stateId: defaultStateId },
      }))
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

    return (states ?? []).map((state) => ({
      id: state.id,
      name: state.name,
      icon: issueStateIconMap[state.group].icon,
      iconColor: colorToText(state.color),
      iconStrokeWidth: issueStateIconMap[state.group].strokeWidth,
      items: items.filter((item) => item.state?.id === state.id),
      createDefaults: { stateId: state.id },
    }))
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
