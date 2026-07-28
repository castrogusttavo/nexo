'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { notify } from '@/lib/notify'
import { useChangeCareerJobStatus } from '@/src/hooks/use-career-jobs'

interface Props {
  jobId: string
  status: 'DRAFT' | 'OPEN' | 'CLOSED'
}

const LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  OPEN: 'Aberta',
  CLOSED: 'Encerrada',
}

const NEXT_STATUS: Record<string, 'DRAFT' | 'OPEN' | 'CLOSED' | null> = {
  DRAFT: 'OPEN',
  OPEN: 'CLOSED',
  CLOSED: null,
}

export function StatusControl({ jobId, status }: Props) {
  const router = useRouter()
  const changeStatus = useChangeCareerJobStatus(jobId)
  const next = NEXT_STATUS[status]

  async function handleClick() {
    if (!next) return
    try {
      await notify.mutate(changeStatus.mutateAsync({ status: next }), {
        loading: 'Atualizando status...',
        success: 'Status atualizado',
        error: 'Não foi possível mudar o status',
      })
      router.refresh()
    } catch {
      //
    }
  }

  return (
    <div className='flex items-center gap-3'>
      <span className='text-sm text-muted-foreground'>
        Status atual: <strong>{LABELS[status]}</strong>
      </span>
      {next && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={changeStatus.isPending}
          onClick={handleClick}
        >
          Mover para {LABELS[next]}
        </Button>
      )}
    </div>
  )
}
