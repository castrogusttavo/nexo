import type { ProjectStateDTO } from '@/types/project-state'

/**
 * A ProjectStateDTO for component and hook specs; see project.dto.ts. The
 * default is the workspace default state
 */
export function buildProjectStateDTO(
  overrides: Partial<ProjectStateDTO> = {},
): ProjectStateDTO {
  return {
    id: 'pstate-1',
    name: 'Rascunho',
    description: null,
    group: 'DRAFT',
    color: 'ZINC',
    order: 0,
    isDefault: true,
    workspaceId: 'ws-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const GROUP_DEFAULTS: Array<Pick<ProjectStateDTO, 'name' | 'group' | 'color'>> =
  [
    { name: 'Rascunho', group: 'DRAFT', color: 'ZINC' },
    { name: 'Planejamento', group: 'PLANNING', color: 'BLUE' },
    { name: 'Execução', group: 'EXECUTION', color: 'YELLOW' },
    { name: 'Monitoramento', group: 'MONITORING', color: 'PURPLE' },
    { name: 'Concluído', group: 'COMPLETED', color: 'GREEN' },
    { name: 'Cancelado', group: 'CANCELLED', color: 'RED' },
  ]

// The six states a new workspace starts with, Rascunho as the default.
export function buildDefaultProjectStateDTOs(): ProjectStateDTO[] {
  return GROUP_DEFAULTS.map((state, index) =>
    buildProjectStateDTO({
      ...state,
      id: `pstate-${index + 1}`,
      isDefault: index === 0,
    }),
  )
}
