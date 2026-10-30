import type { WorkspaceDTO } from '@/types/workspace'

/** A WorkspaceDTO for component and hook specs; see project.dto.ts */
export function buildWorkspaceDTO(
  overrides: Partial<WorkspaceDTO> = {},
): WorkspaceDTO {
  return {
    id: 'ws-1',
    name: 'Acme',
    slug: 'acme',
    activePlan: 'FREE',
    trialEndsAt: null,
    image: null,
    teamSize: null,
    timezone: 'UTC',
    projectStatesEnabled: true,
    projectLabelsEnabled: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}
