'use client'

import { MoreHorizontalIcon } from '@hugeicons-pro/core-solid-rounded'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { issuesKey, useUpdateIssue } from '@/src/hooks/use-issue'
import {
  useAssignIssue,
  useUnassignIssue,
} from '@/src/hooks/use-issue-assignee'
import {
  useAddIssueLabel,
  useRemoveIssueLabel,
} from '@/src/hooks/use-issue-label'
import type { IssueDTO } from '@/types/issue'
import { IssueDetailsPanel } from './panel/issue-details-panel'
import { AssigneesPicker } from './picker/assignees-picker'
import { CyclePicker } from './picker/cycle-picker'
import { DateRangePicker } from './picker/date-range-picker'
import { LabelPicker } from './picker/label-picker'
import { ModulePicker } from './picker/module-picker'
import { PriorityPicker } from './picker/priority-picker'
import { StatePicker } from './picker/state-picker'

interface IssueCardListProps {
  workspaceId: string
  projectSlug: string
  issue: IssueDTO
  identifier: string
  selected: boolean
  onToggleSelected: () => void
}

export function IssueCardList({
  workspaceId,
  projectSlug,
  issue,
  identifier,
  selected,
  onToggleSelected,
}: IssueCardListProps) {
  const queryClient = useQueryClient()
  const updateIssue = useUpdateIssue(workspaceId, projectSlug)
  const addLabel = useAddIssueLabel(workspaceId, projectSlug, issue.id)
  const removeLabel = useRemoveIssueLabel(workspaceId, projectSlug, issue.id)
  const assignIssue = useAssignIssue(workspaceId, projectSlug, issue.id)
  const unassignIssue = useUnassignIssue(workspaceId, projectSlug, issue.id)
  const [detailsOpen, setDetailsOpen] = useState(false)

  async function handleLabelsChange(nextLabelIds: string[]) {
    const added = nextLabelIds.filter((id) => !issue.labelIds.includes(id))
    const removed = issue.labelIds.filter((id) => !nextLabelIds.includes(id))
    await Promise.all([
      ...added.map((id) => addLabel.mutateAsync(id)),
      ...removed.map((id) => removeLabel.mutateAsync(id)),
    ])
    queryClient.invalidateQueries({
      queryKey: issuesKey(workspaceId, projectSlug),
    })
  }

  async function handleAssigneesChange(nextUserIds: string[]) {
    const added = nextUserIds.filter((id) => !issue.assigneeIds.includes(id))
    const removed = issue.assigneeIds.filter((id) => !nextUserIds.includes(id))
    await Promise.all([
      ...added.map((id) => assignIssue.mutateAsync(id)),
      ...removed.map((id) => unassignIssue.mutateAsync(id)),
    ])
    queryClient.invalidateQueries({
      queryKey: issuesKey(workspaceId, projectSlug),
    })
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          className='w-full flex items-center justify-between gap-2 px-5 py-3 hover:bg-accent/25 border-b border-border cursor-pointer'
          onClick={() => setDetailsOpen(true)}
        >
          <div className='flex items-center gap-4'>
            <div
              className='flex items-center gap-1.5'
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Checkbox checked={selected} onCheckedChange={onToggleSelected} />
              <span className='text-muted-foreground font-medium text-xs'>
                {identifier}
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger>{issue.title}</TooltipTrigger>
              <TooltipContent>{issue.title}</TooltipContent>
            </Tooltip>
          </div>
          <div
            className='flex items-center gap-1.5'
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <StatePicker
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              value={issue.stateId}
              onChange={(stateId) =>
                updateIssue.mutate({ issueId: issue.id, data: { stateId } })
              }
            />
            <PriorityPicker
              value={issue.priority}
              onChange={(priority) =>
                updateIssue.mutate({ issueId: issue.id, data: { priority } })
              }
            />
            <DateRangePicker
              startDate={issue.startDate}
              dueDate={issue.dueDate}
              onChange={({ startDate, dueDate }) =>
                updateIssue.mutate({
                  issueId: issue.id,
                  data: { startDate, dueDate },
                })
              }
            />
            <AssigneesPicker
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              value={issue.assigneeIds}
              onChange={handleAssigneesChange}
            />
            <ModulePicker
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              value={issue.moduleId ?? undefined}
              onChange={(moduleId) =>
                updateIssue.mutate({
                  issueId: issue.id,
                  data: { moduleId: moduleId ?? null },
                })
              }
            />
            <CyclePicker
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              value={issue.cycleId ?? undefined}
              onChange={(cycleId) =>
                updateIssue.mutate({
                  issueId: issue.id,
                  data: { cycleId: cycleId ?? null },
                })
              }
            />
            <LabelPicker
              workspaceId={workspaceId}
              projectSlug={projectSlug}
              value={issue.labelIds}
              onChange={handleLabelsChange}
            />
            <Button size='icon-xs' variant='ghost'>
              <NexoIcon icon={MoreHorizontalIcon} />
            </Button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>bla bla bla</ContextMenuContent>
      </ContextMenu>
      <IssueDetailsPanel open={detailsOpen} onOpenChange={setDetailsOpen} />
    </>
  )
}

// export function IssueCardKanban() {
//   return (

//   )
// }
// export function IssueCardCalendar() {
//   return (

//   )
// }

// export function IssueCardTable() {
//   return (

//   )
// }

// export function IssueCardTimeline() {
//   return (

//   )
// }
