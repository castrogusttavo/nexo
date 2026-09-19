'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useFilteredIssues } from '@/components/filters/use-filtered-issues'
import { NexoIcon } from '@/components/icon/icon'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  type KanbanCommitMeta,
  KanbanItem,
  KanbanOverlay,
} from '@/components/ui/kanban'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { colorToText } from '@/lib/state-colors'
import { issuesKey, useUpdateIssue } from '@/src/hooks/use-issue'
import { useProjectMembers } from '@/src/hooks/use-project-member'
import { useStates } from '@/src/hooks/use-state'
import type { IssueDTO } from '@/types/issue'
import type { StateDTO } from '@/types/state'
import {
  issuePrioritiesIcon,
  issueStateIconMap,
  NO_STATE_LABEL,
} from './issue-icons'
import { IssueDetailsPanel } from './panel/issue-details-panel'

interface IssueKanbanViewProps {
  workspaceId: string
  projectSlug: string
  projectIdentifier: string
}

function IssueKanbanCard({
  issue,
  identifier,
  assignees,
  onOpen,
}: {
  issue: IssueDTO
  identifier: string
  assignees: {
    userId: string
    name: string
    username: string
    image: string | null
  }[]
  onOpen: () => void
}) {
  const priority = issuePrioritiesIcon.find(
    (p) => p.priority === issue.priority,
  )

  return (
    <button
      type='button'
      onClick={onOpen}
      className='flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left shadow-xs transition-colors hover:bg-accent/25'
    >
      <div className='flex items-center justify-between gap-2'>
        <span className='text-muted-foreground font-medium text-xs'>
          {identifier}
        </span>
        {priority && priority.priority !== 'NONE' && (
          <NexoIcon
            icon={priority.icon}
            strokeWidth={priority.strokeWidth}
            className={`${priority.color} size-3.5 shrink-0`}
          />
        )}
      </div>
      <p className='line-clamp-2 text-sm'>{issue.title}</p>
      {assignees.length > 0 && (
        <div className='flex items-center -space-x-2'>
          {assignees.map((assignee) => (
            <Tooltip key={assignee.userId}>
              <TooltipTrigger
                render={
                  <Avatar size='sm' className='border-2 border-card'>
                    <AvatarImage
                      src={assignee.image ?? undefined}
                      alt={assignee.name}
                    />
                    <AvatarFallback>
                      {assignee.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                }
              />
              <TooltipContent>{assignee.name}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}
    </button>
  )
}

export function IssueKanbanView({
  workspaceId,
  projectSlug,
  projectIdentifier,
}: IssueKanbanViewProps) {
  const { data: issues } = useFilteredIssues(
    workspaceId,
    projectSlug,
    projectIdentifier,
  )
  const { data: states } = useStates(workspaceId, projectSlug)
  const { data: members } = useProjectMembers(workspaceId, projectSlug)
  const updateIssue = useUpdateIssue(workspaceId, projectSlug)
  const queryClient = useQueryClient()
  const [openIssueId, setOpenIssueId] = useState<string | null>(null)

  const orderedStates = useMemo(
    () => [...(states ?? [])].sort((a, b) => a.order - b.order),
    [states],
  )

  const membersById = useMemo(
    () => new Map((members ?? []).map((member) => [member.userId, member])),
    [members],
  )

  const { columns, stateless } = useMemo(() => {
    const grouped = new Map<string, IssueDTO[]>(
      orderedStates.map((state) => [state.id, []]),
    )
    const stateless: IssueDTO[] = []
    for (const issue of issues ?? []) {
      const column = grouped.get(issue.stateId)
      if (column) column.push(issue)
      else stateless.push(issue)
    }
    return {
      columns: Object.fromEntries(grouped) as Record<string, IssueDTO[]>,
      stateless,
    }
  }, [issues, orderedStates])

  const [localColumns, setLocalColumns] = useState<Record<
    string,
    IssueDTO[]
  > | null>(null)
  // The board is optimistic during a drag (see onValueCommit); once the
  // server round-trips, the derived `columns` above takes back over.
  const value = localColumns ?? columns

  const openIssue = (issues ?? []).find((issue) => issue.id === openIssueId)

  function handleValueCommit(
    nextValue: Record<string, IssueDTO[]>,
    meta: KanbanCommitMeta<IssueDTO>,
  ) {
    if (meta.kind !== 'item') return
    if (meta.activeContainer === meta.overContainer) return

    setLocalColumns(nextValue)
    const issueId = String(
      meta.previousValue[meta.activeContainer][meta.activeIndex].id,
    )

    updateIssue.mutate(
      { issueId, data: { stateId: meta.overContainer } },
      {
        // Wait for the refetch to land before dropping the optimistic
        // preview, otherwise the board flashes back to the pre-drag column
        // for the gap between the mutation settling and the query refreshing.
        onSettled: async () => {
          await queryClient.invalidateQueries({
            queryKey: issuesKey(workspaceId, projectSlug),
          })
          setLocalColumns(null)
        },
      },
    )
  }

  if (orderedStates.length === 0) return null

  return (
    <>
      <div className='overflow-x-auto p-4'>
        <Kanban
          value={value}
          onValueChange={setLocalColumns}
          getItemValue={(issue) => issue.id}
          onValueCommit={handleValueCommit}
          restoreOnCancel
        >
          <KanbanBoard className='grid-flow-col auto-cols-[18rem] sm:grid-cols-none'>
            {orderedStates.map((state) => (
              <IssueKanbanColumn
                key={state.id}
                state={state}
                issues={value[state.id] ?? []}
                projectIdentifier={projectIdentifier}
                membersById={membersById}
                onOpen={setOpenIssueId}
              />
            ))}
            {stateless.length > 0 && (
              <StatelessColumn
                issues={stateless}
                projectIdentifier={projectIdentifier}
                membersById={membersById}
                onOpen={setOpenIssueId}
              />
            )}
          </KanbanBoard>
          <KanbanOverlay>
            {({ value: id }) => {
              const issue = (issues ?? []).find((item) => item.id === id)
              if (!issue) return null
              return (
                <IssueKanbanCard
                  issue={issue}
                  identifier={`${projectIdentifier}-${issue.number}`}
                  assignees={assigneesOf(issue, membersById)}
                  onOpen={() => {}}
                />
              )
            }}
          </KanbanOverlay>
        </Kanban>
      </div>
      {openIssue && (
        <IssueDetailsPanel
          open={!!openIssue}
          onOpenChange={(open) => !open && setOpenIssueId(null)}
          issue={openIssue}
          workspaceId={workspaceId}
          projectSlug={projectSlug}
        />
      )}
    </>
  )
}

type MembersById = Map<
  string,
  { userId: string; name: string; username: string; image: string | null }
>

function assigneesOf(issue: IssueDTO, membersById: MembersById) {
  return issue.assigneeIds
    .map((userId) => membersById.get(userId))
    .filter((member): member is NonNullable<typeof member> => !!member)
}

/**
 * Issues whose state was deleted. Not a drop target: moving a card here
 * would have no state to patch, so these cards are only opened, and their
 * state is fixed from the details panel.
 */
function StatelessColumn({
  issues,
  projectIdentifier,
  membersById,
  onOpen,
}: {
  issues: IssueDTO[]
  projectIdentifier: string
  membersById: MembersById
  onOpen: (issueId: string) => void
}) {
  const icon = issueStateIconMap.BACKLOG

  return (
    <div
      data-slot='kanban-no-state-column'
      className='flex flex-col gap-3 rounded-lg bg-muted/40 p-3'
    >
      <div className='flex items-center gap-2 px-1'>
        <NexoIcon
          icon={icon.icon}
          strokeWidth={icon.strokeWidth}
          className='text-muted-foreground'
        />
        <h3 className='font-medium text-sm'>{NO_STATE_LABEL}</h3>
        <Badge variant='outline'>{issues.length}</Badge>
      </div>
      <div className='flex min-h-12 flex-1 flex-col gap-2'>
        {issues.map((issue) => (
          <IssueKanbanCard
            key={issue.id}
            issue={issue}
            identifier={`${projectIdentifier}-${issue.number}`}
            assignees={assigneesOf(issue, membersById)}
            onOpen={() => onOpen(issue.id)}
          />
        ))}
      </div>
    </div>
  )
}

function IssueKanbanColumn({
  state,
  issues,
  projectIdentifier,
  membersById,
  onOpen,
}: {
  state: StateDTO
  issues: IssueDTO[]
  projectIdentifier: string
  membersById: MembersById
  onOpen: (issueId: string) => void
}) {
  const stateIcon = issueStateIconMap[state.group]

  return (
    <KanbanColumn value={state.id} className='gap-3 rounded-lg bg-muted/40 p-3'>
      <div className='flex items-center gap-2 px-1'>
        <NexoIcon
          icon={stateIcon.icon}
          strokeWidth={stateIcon.strokeWidth}
          className={colorToText(state.color)}
        />
        <h3 className='font-medium text-sm'>{state.name}</h3>
        <Badge variant='outline'>{issues.length}</Badge>
      </div>
      <KanbanColumnContent value={state.id} className='min-h-12 flex-1 gap-2'>
        {issues.map((issue) => (
          <KanbanItem key={issue.id} value={issue.id}>
            <IssueKanbanCard
              issue={issue}
              identifier={`${projectIdentifier}-${issue.number}`}
              assignees={assigneesOf(issue, membersById)}
              onOpen={() => onOpen(issue.id)}
            />
          </KanbanItem>
        ))}
      </KanbanColumnContent>
    </KanbanColumn>
  )
}
