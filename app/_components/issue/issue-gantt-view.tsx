'use client'

import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isToday,
  isWeekend,
  max as maxDate,
  min as minDate,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { colorToDot } from '@/lib/state-colors'
import { useIssues } from '@/src/hooks/use-issue'
import { useStates } from '@/src/hooks/use-state'
import type { IssueDTO } from '@/types/issue'
import { IssueDetailsPanel } from './panel/issue-details-panel'

interface IssueGanttViewProps {
  workspaceId: string
  projectSlug: string
  projectIdentifier: string
}

const DAY_WIDTH = 32

interface ScheduledIssue {
  issue: IssueDTO
  start: Date
  end: Date
}

export function IssueGanttView({
  workspaceId,
  projectSlug,
  projectIdentifier,
}: IssueGanttViewProps) {
  const { data: issues } = useIssues(workspaceId, projectSlug)
  const { data: states } = useStates(workspaceId, projectSlug)
  const [openIssueId, setOpenIssueId] = useState<string | null>(null)

  const openIssue = (issues ?? []).find((issue) => issue.id === openIssueId)

  const statesById = useMemo(
    () => new Map((states ?? []).map((state) => [state.id, state])),
    [states],
  )

  const { scheduled, unscheduled, days } = useMemo(() => {
    const scheduled: ScheduledIssue[] = []
    const unscheduled: IssueDTO[] = []

    for (const issue of issues ?? []) {
      if (!issue.startDate && !issue.dueDate) {
        unscheduled.push(issue)
        continue
      }
      const start = parseISO(issue.startDate ?? issue.dueDate ?? '')
      const end = parseISO(issue.dueDate ?? issue.startDate ?? '')
      scheduled.push({
        issue,
        start: start <= end ? start : end,
        end: start <= end ? end : start,
      })
    }

    scheduled.sort((a, b) => a.start.getTime() - b.start.getTime())

    if (scheduled.length === 0) {
      return { scheduled, unscheduled, days: [] as Date[] }
    }

    const rangeStart = addDays(minDate(scheduled.map((item) => item.start)), -2)
    const rangeEnd = addDays(maxDate(scheduled.map((item) => item.end)), 2)
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })

    return { scheduled, unscheduled, days }
  }, [issues])

  if (scheduled.length === 0) {
    return (
      <div className='flex flex-col gap-2 p-6 text-muted-foreground text-sm'>
        Nenhuma issue com data de início ou prazo definida ainda.
        {unscheduled.length > 0 && (
          <span>Defina uma data para ver a issue no cronograma.</span>
        )}
      </div>
    )
  }

  const rangeStart = days[0]

  return (
    <>
      <div className='flex flex-col gap-3 p-4'>
        <div className='overflow-x-auto rounded-lg border border-border'>
          <div style={{ minWidth: days.length * DAY_WIDTH + 220 }}>
            <div className='flex border-b border-border bg-muted/40'>
              <div className='w-[220px] shrink-0 border-r border-border px-3 py-2 font-medium text-xs'>
                Issue
              </div>
              <div className='flex'>
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    style={{ width: DAY_WIDTH }}
                    className={`shrink-0 border-r border-border/60 py-2 text-center text-[11px] ${
                      isWeekend(day) ? 'bg-muted/60 text-muted-foreground' : ''
                    } ${isToday(day) ? 'font-semibold text-primary' : ''}`}
                  >
                    <div>{format(day, 'd')}</div>
                    <div className='text-[9px] text-muted-foreground uppercase'>
                      {format(day, 'EEEEE', { locale: ptBR })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {scheduled.map(({ issue, start, end }) => {
              const state = statesById.get(issue.stateId)
              const offset = differenceInCalendarDays(start, rangeStart)
              const span = differenceInCalendarDays(end, start) + 1

              return (
                <div
                  key={issue.id}
                  className='flex border-b border-border/60 last:border-b-0'
                >
                  <div className='flex w-[220px] shrink-0 items-center gap-2 border-r border-border px-3 py-2'>
                    <span className='text-muted-foreground text-xs'>
                      {projectIdentifier}-{issue.number}
                    </span>
                    <span className='truncate text-xs'>{issue.title}</span>
                  </div>
                  <div
                    className='relative'
                    style={{ width: days.length * DAY_WIDTH, height: 40 }}
                  >
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <button
                            type='button'
                            onClick={() => setOpenIssueId(issue.id)}
                            className={`absolute top-2 flex h-6 items-center truncate rounded-md px-2 text-left text-[11px] text-white shadow-xs ${state ? colorToDot(state.color) : 'bg-zinc-500'}`}
                            style={{
                              left: offset * DAY_WIDTH,
                              width: Math.max(span * DAY_WIDTH - 4, 8),
                            }}
                          >
                            {issue.title}
                          </button>
                        }
                      />
                      <TooltipContent>
                        {issue.title} · {format(start, 'dd/MM')} –{' '}
                        {format(end, 'dd/MM')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {unscheduled.length > 0 && (
          <div className='flex flex-col gap-2 rounded-lg border border-border p-3'>
            <div className='flex items-center gap-2'>
              <h3 className='font-medium text-sm'>Sem data definida</h3>
              <Badge variant='outline'>{unscheduled.length}</Badge>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {unscheduled.map((issue) => (
                <button
                  key={issue.id}
                  type='button'
                  onClick={() => setOpenIssueId(issue.id)}
                  className='rounded-sm bg-accent/40 px-1.5 py-0.5 text-xs hover:bg-accent/70'
                >
                  {projectIdentifier}-{issue.number} {issue.title}
                </button>
              ))}
            </div>
          </div>
        )}
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
