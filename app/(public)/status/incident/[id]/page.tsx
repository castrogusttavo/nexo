import { ArrowLeft01Icon } from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StatusService } from '@/src/services/status/status.service'
import { STATUS_META } from '@/src/services/status/status-map'
import type { IncidentUpdateDTO } from '@/types/status'

interface IncidentMetadataProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: IncidentMetadataProps): Promise<Metadata> {
  const { id } = await params
  const title = 'Incidente | Nexo'
  const description = 'Detalhes e atualizações do incidente.'

  return {
    title,
    description,
    alternates: { canonical: `/status/incident/${id}` },
    openGraph: {
      type: 'website',
      url: `/status/incident/${id}`,
      title,
      description,
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const EVENT_LABEL: Record<IncidentUpdateDTO['event'], string> = {
  INVESTIGATING: 'Investigando',
  IDENTIFIED: 'Identificado',
  MONITORING: 'Monitorando',
  RESOLVED: 'Resolvido',
}

const EVENT_COLOR: Record<IncidentUpdateDTO['event'], string> = {
  INVESTIGATING: 'bg-yellow-500',
  IDENTIFIED: 'bg-orange-500',
  MONITORING: 'bg-sky-500',
  RESOLVED: 'bg-emerald-500',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `(${minutes} min atrás)`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `(${hours}h atrás)`
  const days = Math.floor(hours / 24)
  if (days < 30) return `(${days} ${days === 1 ? 'dia' : 'dias'} atrás)`
  const months = Math.floor(days / 30)
  return `(${months} ${months === 1 ? 'mês' : 'meses'} atrás)`
}

interface IncidentPageProps {
  params: Promise<{ id: string }>
}

export default async function IncidentPage({ params }: IncidentPageProps) {
  const { id } = await params
  const result = await StatusService.getIncident(id)

  if (!result.ok) {
    if (result.error.code === 'RESOURCE_NOT_FOUND') notFound()
    throw new Error(result.error.message)
  }

  const incident = result.value
  const meta = STATUS_META[incident.severity]
  const resolvedAt = incident.resolvedAt
  const headerDate = resolvedAt ?? incident.startedAt

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
      <div
        className={cn(
          'w-full h-fit overflow-hidden flex flex-col rounded-lg border',
          meta.border,
        )}
      >
        <span
          className={cn(
            'flex items-center gap-2 px-3.5 py-4 text-base text-zinc-50',
            meta.banner,
          )}
        >
          <Link href='/status'>
            <NexoIcon icon={ArrowLeft01Icon} size={20} />
          </Link>
          {incident.title}
        </span>
        <div>
          <div className='flex items-center px-4 py-3 gap-2'>
            <span className='text-primary'>
              {resolvedAt ? 'Resolvido' : 'Em andamento'}
            </span>
            <span>·</span>
            <span className='text-primary'>{meta.label}</span>
            <span>·</span>
            <span className='text-primary'>{incident.componentName}</span>
          </div>
          <div className='h-px w-full bg-zinc-800' />
          <div className='flex flex-col px-4 pt-2 pb-4 gap-2'>
            <span className='text-primary'>
              {resolvedAt
                ? `Incidente iniciado em ${formatDateTime(incident.startedAt)} e resolvido em ${formatDateTime(resolvedAt)}.`
                : `Incidente em andamento desde ${formatDateTime(incident.startedAt)}.`}
            </span>
            <div className='flex gap-2'>
              <Muted>{formatDateTime(headerDate)}</Muted>
              <Muted>{formatRelative(headerDate)}</Muted>
            </div>
          </div>
        </div>
      </div>
      <div className='w-full h-fit overflow-hidden flex flex-col rounded-lg border border-zinc-800'>
        <h2 className='font-semibold p-4 md:p-3 border-b border-zinc-800'>
          Atualizações
        </h2>
        <div className='p-4 md:p-3'>
          {incident.updates.map((update, index) => (
            <div key={update.id} className='flex gap-4'>
              <div className='w-4 flex flex-none flex-col items-center gap-2 mt-2'>
                <div
                  className={cn(
                    'size-2 rounded-full',
                    EVENT_COLOR[update.event],
                  )}
                />
                {index < incident.updates.length - 1 && (
                  <div
                    className={cn('w-px flex-1', EVENT_COLOR[update.event])}
                  />
                )}
              </div>
              <div className='space-y-2 pb-8'>
                <Muted className='font-semibold text-primary'>
                  {EVENT_LABEL[update.event]}
                </Muted>
                <P className='mt-0!'>{update.message}</P>
                <Muted>{formatDateTime(update.postedAt)}</Muted>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
