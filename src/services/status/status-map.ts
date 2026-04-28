import type { ComponentStatus } from '@prisma/client'

export interface StatusMeta {
  label: string
  bar: string
  banner: string
  border: string
  headline: string
}

export const STATUS_META: Record<ComponentStatus, StatusMeta> = {
  OPERATIONAL: {
    label: 'Operacional',
    bar: 'bg-emerald-500',
    banner: 'bg-emerald-900 text-emerald-50',
    border: 'border-emerald-200',
    headline: 'Estamos totalmente operacionais',
  },
  DEGRADED: {
    label: 'Desempenho degradado',
    bar: 'bg-amber-500',
    banner: 'bg-amber-900 text-amber-50',
    border: 'border-amber-200',
    headline: 'Alguns serviços estão com desempenho reduzido',
  },
  PARTIAL_OUTAGE: {
    label: 'Interrupção parcial',
    bar: 'bg-orange-500',
    banner: 'bg-orange-900 text-orange-50',
    border: 'border-orange-200',
    headline: 'Estamos com interrupção parcial em alguns serviços',
  },
  MAJOR_OUTAGE: {
    label: 'Interrupção total',
    bar: 'bg-red-500',
    banner: 'bg-red-900 text-red-50',
    border: 'border-red-200',
    headline: 'Estamos enfrentando uma interrupção',
  },
  MAINTENANCE: {
    label: 'Manutenção programada',
    bar: 'bg-sky-500',
    banner: 'bg-sky-900 text-sky-50',
    border: 'border-sky-200',
    headline: 'Manutenção programada em andamento',
  },
}
