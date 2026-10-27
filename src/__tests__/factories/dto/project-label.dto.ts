import type { ProjectLabelDTO } from '@/types/project-label'

// A ProjectLabelDTO for component and hook specs; see project.dto.ts
export function buildProjectLabelDTO(
  overrides: Partial<ProjectLabelDTO> = {},
): ProjectLabelDTO {
  return {
    id: 'plabel-1',
    name: 'Marketing',
    description: null,
    color: 'ZINC',
    workspaceId: 'ws-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}
