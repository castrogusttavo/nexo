import { CheckmarkBadge02Icon, CheckmarkCircle02Icon } from '@hugeicons-pro/core-bulk-rounded'
import { Calendar04Icon } from '@hugeicons-pro/core-solid-rounded'
import { InformationCircleIcon } from '@hugeicons-pro/core-stroke-rounded'
import Image from 'next/image'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { StatusService } from '@/src/services/status/status.service'
import { STATUS_META } from '@/src/services/status/status-map'
import { HistoryBars } from './_components/history-bars'

export default async function StatusPage() {
  const result = await StatusService.getCurrentSnapshot()

  if (!result.ok) {
    return (
      <div className='max-w-3xl flex flex-col items-center mx-auto py-4 space-y-8'>
        <div className='w-full h-fit overflow-hidden flex flex-col rounded-lg border border-zinc-200'>
          <span className='flex items-center gap-2 px-3.5 py-4 text-base bg-zinc-900 text-zinc-50'>
            Não foi possível carregar o status do sistema
          </span>
          <span className='p-4 text-sm text-primary'>
            Tente novamente em alguns instantes.
          </span>
        </div>
      </div>
    )
  }

  const snapshot = result.value
  const overallMeta = STATUS_META[snapshot.overallStatus]

  return (
    <div className='max-w-3xl flex flex-col items-center mx-auto py-4 space-y-8'>
      <div className='w-full flex items-center justify-between'>
        <Image src='/brand/logo.svg' width={100} height={30} alt='Nexo' />
        <div className='flex items-center gap-2'>
          <Link href='#'>
            <Button variant='outline' size='sm'>
              Relate um problema
            </Button>
          </Link>
          <Link href='#'>
            <Button variant='default' size='sm'>
              Receba atualizações
            </Button>
          </Link>
        </div>
      </div>
      <div className='w-full h-fit overflow-hidden flex flex-col rounded-lg border border-zinc-200'>
        <span className={cn('flex items-center gap-2 px-3.5 py-4 text-base text-zinc-50', overallMeta.banner)}>
          <NexoIcon icon={CheckmarkBadge02Icon} size={20} />
          {overallMeta.headline}
        </span>
        <span className='p-4 text-sm text-primary'>
          {snapshot.overallStatus === 'OPERATIONAL'
            ? 'Não temos conhecimento de quaisquer problemas que afetam nossos sistemas.'
            : 'Estamos investigando e atualizaremos esta página assim que houver novidades.'}
        </span>
      </div>
      <div className='w-full h-fit overflow-hidden flex flex-col rounded-lg border border-zinc-800'>
        <h2 className='font-semibold p-4 md:p-3'>Status do sistema</h2>
        {snapshot.components.map((component) => {
          const meta = STATUS_META[component.currentStatus]
          return (
            <div key={component.key} className='w-full flex flex-col p-4 md:p-3 space-y-2 border-t border-zinc-800'>
              <div className='w-full flex justify-between items-center'>
                <div className='flex items-center gap-2'>
                  <NexoIcon
                    icon={CheckmarkCircle02Icon}
                    className={meta.bar.replace('bg-', 'text-')}
                    size={16}
                    strokeWidth={1}
                  />
                  <P className='font-medium mt-0!'>{component.name}</P>
                  <Tooltip>
                    <TooltipTrigger>
                      <NexoIcon icon={InformationCircleIcon} className='text-muted-foreground' strokeWidth={2} />
                    </TooltipTrigger>
                    <TooltipContent>
                      {component.description}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Muted className='text-end'>
                  {component.uptime90d > 0 ? `${component.uptime90d.toFixed(2)}% uptime` : 'Sem dados'}
                </Muted>
              </div>
              <HistoryBars history={component.history} />
            </div>
          )
        })}
      </div>
      <Link href='/status/history'>
        <Button variant='outline'>
          <NexoIcon icon={Calendar04Icon} />
          Ver histórico
        </Button>
      </Link>
    </div>
  )
}
