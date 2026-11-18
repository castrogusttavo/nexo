'use client'
import { issueStateIconMap } from '@/app/_components/workspace/project/issue/issue-icons'
import { Muted } from '@/components/typography/text/muted'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useProjectProgress } from '@/src/hooks/use-project-progress'

export function ProjectProgressView({
  workspaceId,
  projectSlug,
}: {
  workspaceId: string
  projectSlug: string
}) {
  const { data: progress } = useProjectProgress(workspaceId, projectSlug)

  if (!progress) return null

  return (
    <div className='pb-6 border-b border-border flex flex-col gap-3'>
      <Muted className='text-lg font-semibold text-primary/80'>Progresso</Muted>
      <div className='flex flex-col gap-4'>
        <div className='w-full bg-transparent flex gap-0.5 rounded-sm p-0 h-3.5'>
          {progress.groups
            .filter((g) => g.count > 0)
            .map((g) => {
              const meta = issueStateIconMap[g.group]
              return (
                <Tooltip key={g.group}>
                  <TooltipTrigger
                    render={
                      <div
                        className={cn(SEGMENT_COLOR[g.group], 'rounded-xs')}
                        style={{ flexGrow: g.count, flexBasis: 0 }}
                      />
                    }
                  />
                  <TooltipContent>
                    {meta.label} · {g.count}
                  </TooltipContent>
                </Tooltip>
              )
            })}
        </div>
        <div className='flex justify-between gap-4 flex-wrap'>
          {progress.groups.map((g) => {
            const meta = issueStateIconMap[g.group]
            return (
              <div key={g.group} className='text-primary/90'>
                <div className='flex items-center gap-2'>
                  <div
                    className={cn(
                      SEGMENT_COLOR[g.group],
                      'size-2.5 rounded-xs shrink-0',
                    )}
                  />
                  <Muted className='text-primary/90'>{meta.label}</Muted>
                </div>
                <div className='flex gap-3'>
                  <Muted>{g.count}</Muted>
                  <Muted>{g.percentage}%</Muted>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const SEGMENT_COLOR = {
  BACKLOG: 'bg-white',
  UNSTARTED: 'bg-zinc-700',
  STARTED: 'bg-orange-900',
  COMPLETED: 'bg-green-900',
  CANCELLED: 'bg-red-900',
} as const
