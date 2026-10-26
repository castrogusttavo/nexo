import type { ProjectDTO } from '@/types/project'

/**
 * A ProjectDTO for component and hook specs. It imports no Prisma, so jsdom
 * speps can use it, and a new DTO field gets its default here once instead
 * of in every spec's local build.
 */
export function buildProjectDTO(
  overrides: Partial<ProjectDTO> = {},
): ProjectDTO {
  return {
    id: 'project-1',
    name: 'Alpha',
    slug: 'alpha',
    identifier: 'ALP',
    description: null,
    emoji: null,
    coverImage: null,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    estimatesEnabled: true,
    isFavorited: false,
    leadId: 'user-1',
    stateId: 'pstate-1',
    labelIds: [],
    workspaceId: 'ws-1',
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}
