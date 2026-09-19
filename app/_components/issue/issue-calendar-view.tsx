'use client'

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { useFilteredIssues } from '@/components/filters/use-filtered-issues'
import { NexoIcon } from '@/components/icon/icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { IssueDTO } from '@/types/issue'
import { parseIssueDate } from './issue-dates'
import { issuePrioritiesIcon } from './issue-icons'
import { IssueDetailsPanel } from './panel/issue-details-panel'

interface IssueCalendarViewProps {
  workspaceId: string
  projectSlug: string
  projectIdentifier: string
}

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function IssueCalendarView({
  workspaceId,
  projectSlug,
  projectIdentifier,
}: IssueCalendarViewProps) {
  const { data: issues } = useFilteredIssues(
    workspaceId,
    projectSlug,
    projectIdentifier,
  )
  const [month, setMonth] = useState(() => new Date())
  const [openIssueId, setOpenIssueId] = useState<string | null>(null)

  const openIssue = (issues ?? []).find((issue) => issue.id === openIssueId)

  const issuesByDay = useMemo(() => {
    const map = new Map<string, IssueDTO[]>()
    const undated: IssueDTO[] = []
    for (const issue of issues ?? []) {
      if (!issue.dueDate) {
        undated.push(issue)
        continue
      }
      const key = format(parseIssueDate(issue.dueDate), 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(issue)
      map.set(key, list)
    }
    return { map, undated }
  }, [issues])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  return (
    <>
      <div className='flex flex-col gap-4 p-4'>
        <div className='flex items-center justify-between'>
          <h2 className='font-semibold text-lg capitalize'>
            {format(month, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className='flex items-center gap-1'>
            <Button
              size='icon-sm'
              variant='secondary'
              aria-label='Mês anterior'
              onClick={() => setMonth((current) => subMonths(current, 1))}
            >
              <NexoIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            </Button>
            <Button
              size='sm'
              variant='secondary'
              onClick={() => setMonth(new Date())}
            >
              Hoje
            </Button>
            <Button
              size='icon-sm'
              variant='secondary'
              aria-label='Próximo mês'
              onClick={() => setMonth((current) => addMonths(current, 1))}
            >
              <NexoIcon icon={ArrowRight01Icon} strokeWidth={2} />
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border'>
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className='bg-muted/40 px-2 py-1.5 text-center font-medium text-muted-foreground text-xs'
            >
              {label}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayIssues = issuesByDay.map.get(key) ?? []
            const visible = dayIssues.slice(0, 3)
            const overflow = dayIssues.length - visible.length

            return (
              <div
                key={key}
                className={cn(
                  'flex min-h-24 flex-col gap-1 bg-card p-1.5',
                  !isSameMonth(day, month) &&
                    'bg-muted/20 text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-5 items-center justify-center rounded-full text-xs',
                    isToday(day) &&
                      'bg-primary font-medium text-primary-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <div className='flex flex-col gap-1'>
                  {visible.map((issue) => {
                    const priority = issuePrioritiesIcon.find(
                      (p) => p.priority === issue.priority,
                    )
                    return (
                      <button
                        key={issue.id}
                        type='button'
                        onClick={() => setOpenIssueId(issue.id)}
                        className='flex items-center gap-1 truncate rounded-sm bg-accent/40 px-1.5 py-0.5 text-left text-xs hover:bg-accent/70'
                      >
                        {priority && priority.priority !== 'NONE' && (
                          <NexoIcon
                            icon={priority.icon}
                            strokeWidth={priority.strokeWidth}
                            className={cn(priority.color, 'size-3 shrink-0')}
                          />
                        )}
                        <span className='truncate'>
                          {projectIdentifier}-{issue.number} {issue.title}
                        </span>
                      </button>
                    )
                  })}
                  {overflow > 0 && (
                    <span className='px-1.5 text-muted-foreground text-xs'>
                      +{overflow} mais
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {issuesByDay.undated.length > 0 && (
          <div className='flex flex-col gap-2 rounded-lg border border-border p-3'>
            <div className='flex items-center gap-2'>
              <h3 className='font-medium text-sm'>Sem prazo</h3>
              <Badge variant='outline'>{issuesByDay.undated.length}</Badge>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {issuesByDay.undated.map((issue) => (
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
