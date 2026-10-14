import type { ProjectState } from '@prisma/client'

// The states every workspace starts with, one per group. The
// 20261013122447_project_states migration seeds this same list into the
// workspaces that existed before it: keep the two in step.
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
    isDefault: false,
  },
  {
    name: 'Execução',
    group: 'EXECUTION',
    color: 'YELLOW',
    order: 0,
    isDefault: false,
  },
  {
    name: 'Monitoramento',
    group: 'MONITORING',
    color: 'PURPLE',
    order: 0,
    isDefault: false,
  },
  {
    name: 'Concluído',
    group: 'COMPLETED',
    color: 'GREEN',
    order: 0,
    isDefault: false,
  },
  {
    name: 'Cancelado',
    group: 'CANCELLED',
    color: 'RED',
    order: 0,
    isDefault: false,
  },
]
