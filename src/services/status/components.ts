import type { ComponentStatus } from '@prisma/client'

export type ComponentKey =
  | 'app'
  | 'database'
  | 'cache'
  | 'auth'
  | 'payment'
  | 'email'
  | 'storage'

export type ComponentTier = 'core' | 'peripheral'

export interface ComponentDefinition {
  key: ComponentKey
  name: string
  description: string
  tier: ComponentTier
}

export const COMPONENTS = [
  {
    key: 'app',
    name: 'Aplicação',
    description: 'Servidor web',
    tier: 'core',
  },
  {
    key: 'database',
    name: 'Banco de dados',
    description: 'PostgreSQL principal',
    tier: 'core',
  },
  {
    key: 'cache',
    name: 'Cache (Redis)',
    description: 'Cache e filas Redis',
    tier: 'core',
  },
  {
    key: 'auth',
    name: 'Autenticação',
    description: 'Better Auth',
    tier: 'core',
  },
  {
    key: 'payment',
    name: 'Assinatura',
    description: 'Pagamentos via AbacatePay',
    tier: 'peripheral',
  },
  {
    key: 'email',
    name: 'Envio de e-mail (Resend)',
    description: 'Entrega transacional de e-mail',
    tier: 'peripheral',
  },
  {
    key: 'storage',
    name: 'Armazenamento (AWS S3)',
    description: 'Armazenamento de objetos',
    tier: 'peripheral',
  },
] as const satisfies ReadonlyArray<ComponentDefinition>

export const COMPONENT_KEYS = COMPONENTS.map(
  (c) => c.key,
) as ReadonlyArray<ComponentKey>

export const COMPONENTS_BY_KEY: Record<ComponentKey, ComponentDefinition> =
  Object.fromEntries(COMPONENTS.map((c) => [c.key, c])) as Record<
    ComponentKey,
    ComponentDefinition
  >

export const STATUS_RANK: Record<ComponentStatus, number> = {
  OPERATIONAL: 0,
  MAINTENANCE: 1,
  DEGRADED: 2,
  PARTIAL_OUTAGE: 3,
  MAJOR_OUTAGE: 4,
}

export function worstStatus(statuses: ComponentStatus[]): ComponentStatus {
  if (statuses.length === 0) return 'OPERATIONAL'
  return statuses.reduce((acc, s) =>
    STATUS_RANK[s] > STATUS_RANK[acc] ? s : acc,
  )
}

export function isComponentKey(value: string): value is ComponentKey {
  return (COMPONENT_KEYS as ReadonlyArray<string>).includes(value)
}
