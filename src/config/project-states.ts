import type { ProjectState } from '@prisma/client'

export const DEFAULT_PROJECT_STATES: ReadonlyArray<
  Pick<ProjectState, 'name' | 'group' | 'color' | 'order' | 'isDefault'>
> = [
  {
    name: 'Rascunho',
    group: 'DRAFT',
    color: 'ZINC',
    order: 0,
    isDefault: true,
  },
  {
    name: 'Planejamento',
    group: 'PLANNING',
    color: 'BLUE',
    order: 0,
    isDefault: true,
  },
  {
    name: 'Execução',
    group: 'EXECUTION',
    color: 'YELLOW',
    order: 0,
    isDefault: true,
  },
  {
    name: 'Monitoramento',
    group: 'MONITORING',
    color: 'PURPLE',
    order: 0,
    isDefault: true,
  },
  {
    name: 'Concluído',
    group: 'COMPLETED',
    color: 'GREEN',
    order: 0,
    isDefault: true,
  },
  {
    name: 'Cancelado',
    group: 'CANCELLED',
    color: 'RED',
    order: 0,
    isDefault: true,
  },
]
