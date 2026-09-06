import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { connection } from 'next/server'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StatusService } from '@/src/services/status/status.service'
import { STATUS_META } from '@/src/services/status/status-map'
import type { IncidentSummaryDTO } from '@/types/status'

const TITLE = 'Histórico de incidentes | Nexo'
const DESCRIPTION =
  'Histórico de incidentes e disponibilidade dos serviços do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/status/history' },
  openGraph: {
    type: 'website',
    url: '/status/history',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/twitter-image'],
  },
}

const MONTH_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', MONTH_FORMAT)
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function groupByMonth(
  incidents: IncidentSummaryDTO[],
): Map<string, IncidentSummaryDTO[]> {
  const groups = new Map<string, IncidentSummaryDTO[]>()
  for (const inc of incidents) {
    const date = new Date(inc.startedAt)
    const label = formatMonthLabel(date)
    const list = groups.get(label) ?? []
    list.push(inc)
    groups.set(label, list)
  }
  return groups
}

export default async function StatusHistoryPage() {
  await connection()
  const result = await StatusService.listIncidents()

  return (
    <div className='max-w-3xl flex flex-col items-center mx-auto py-4 gap-y-8'>
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
      <div className='w-full space-y-6'>
        <h2 className='font-semibold py-4 mb:py-3'>
          <Link href='/status' className='text-muted-foreground'>
            Nexo /
          </Link>{' '}
          Histórico
        </h2>

        {!result.ok || result.value.length === 0 ? (
          <div className='w-full rounded-lg border border-zinc-800 p-6 text-center'>
            <Muted>Nenhum incidente registrado nos últimos 90 dias.</Muted>
          </div>
        ) : (
          <div className='space-y-8'>
            {Array.from(groupByMonth(result.value).entries()).map(
              ([month, items]) => (
                <div key={month} className='space-y-4'>
                  <h4 className='capitalize'>{month}</h4>
                  {items.map((inc) => {
                    const meta = STATUS_META[inc.severity]
                    const startedAt = new Date(inc.startedAt)
                    const dayNum = startedAt.toLocaleDateString('pt-BR', {
                      day: '2-digit',
                    })
                    const weekday = startedAt.toLocaleDateString('pt-BR', {
                      weekday: 'short',
                    })
                    return (
                      <div
                        key={inc.id}
                        className='w-full flex gap-x-8 border-b border-zinc-700/80 pb-8'
                      >
                        <Muted>
                          <strong className='text-primary'>{dayNum}</strong>{' '}
                          {weekday}
                        </Muted>
                        <div className='w-full flex-1 flex gap-3'>
                          <div className={cn('h-full w-1', meta.bar)} />
                          <div className='w-full'>
                            <div className='w-full flex justify-between'>
                              <Link
                                href={`/status/incident/${inc.id}`}
                                className='font-medium hover:underline'
                              >
                                {inc.title}
                              </Link>
                              <Muted>{formatTime(startedAt)}</Muted>
                            </div>
                            <Muted className='text-base'>
                              {inc.resolvedAt
                                ? `Resolvido em ${formatTime(new Date(inc.resolvedAt))} · ${inc.componentName}`
                                : `Em andamento · ${inc.componentName}`}
                            </Muted>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}
