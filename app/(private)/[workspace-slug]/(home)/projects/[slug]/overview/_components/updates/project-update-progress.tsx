import { ProgressRing } from '@/components/progress-ring'
import { Muted } from '@/components/typography/text/muted'

type ProjectUpdateProgressProps = {
  done: number
  total: number
}

export function ProjectUpdateProgress({
  done,
  total,
}: ProjectUpdateProgressProps) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className='flex items-center gap-2'>
      <div className='flex items-center gap-1.5'>
        <ProgressRing value={percent} />
        <Muted className='text-xs'>
          {done}/{total} concluídos
        </Muted>
      </div>
      <div className='size-1 rounded-full bg-muted-foreground/50' />
      <Muted className='text-xs'>{percent}% de progresso</Muted>
    </div>
  )
}
