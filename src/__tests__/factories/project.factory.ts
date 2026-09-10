import { createId } from '@paralleldrive/cuid2'
import type { Project, ProjectMember } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import { ProjectRepository } from '@/src/repositories/project.repository'
import type { ProjectDTO } from '@/types/project'

export function createFakeProject(overrides?: Partial<Project>): Project {
  const now = new Date()
  return {
    id: createId(),
    name: 'Text Project',
    slug: `proj-${createId().slice(0, 8)}`,
    identifier: createId().slice(0, 6).toUpperCase(),
    description: null,
    emoji: null,
    coverImage: null,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    estimatesEnabled: true,
    issueSequence: 0,
    leadId: createId(),
    workspaceId: createId(),
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeProjectDTO(
  overrides?: Partial<ProjectDTO>,
): ProjectDTO {
  const now = new Date().toISOString()
  return {
    id: createId(),
    name: 'Text Project',
    slug: `proj-${createId().slice(0, 8)}`,
    identifier: createId().slice(0, 6).toUpperCase(),
    description: null,
    emoji: null,
    coverImage: null,
    isPublic: false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    estimatesEnabled: true,
    isFavorited: false,
    leadId: createId(),
    workspaceId: createId(),
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedProject(
  workspaceId: string,
  leadId: string,
  overrides?: Partial<
    Pick<
      Project,
      | 'name'
      | 'slug'
      | 'identifier'
      | 'description'
      | 'emoji'
      | 'coverImage'
      | 'isPublic'
      | 'archivedAt'
    >
  >,
) {
  const slug = `proj-${createId().slice(0, 8)}`
  return prisma.project.create({
    data: {
      name: 'Seed Project',
      slug,
      identifier: createId().slice(0, 6).toUpperCase(),
      workspaceId,
      leadId,
      ...overrides,
    },
  })
}

// The real creation (ProjectRepository.create()) always seeds EstimateSettings,
// states, labels and the system issue types (Task/Epic, isSystem: true)
// in a transaction. seedProject() above is deliberately without that — it's
// used by ~40 repository specs that build their own precise fixtures and
// would collide with these defaults (unique constraint on EstimateSettings.
// projectId, states/labels/types counts, etc.). Use this variant only
// when the test needs the production defaults to actually exist
// (estimate routes, issue-types listing, issue creation without an
// explicit typeId, ...).
export async function seedProjectWithDefaults(
  workspaceId: string,
  leadId: string,
  overrides?: Partial<
    Pick<
      Project,
      | 'name'
      | 'slug'
      | 'identifier'
      | 'description'
      | 'emoji'
      | 'coverImage'
      | 'isPublic'
      | 'archivedAt'
    >
  >,
): Promise<Project> {
  const slug = overrides?.slug ?? `proj-${createId().slice(0, 8)}`

  const result = await ProjectRepository.create({
    name: overrides?.name ?? 'Seed Project',
    slug,
    identifier: overrides?.identifier ?? createId().slice(0, 6).toUpperCase(),
    description: overrides?.description ?? undefined,
    emoji: overrides?.emoji ?? undefined,
    coverImage: overrides?.coverImage ?? undefined,
    isPublic: overrides?.isPublic ?? false,
    issueTypesEnabled: true,
    modulesEnabled: true,
    cyclesEnabled: true,
    estimatesEnabled: true,
    leadId,
    workspaceId,
  })

  if (!result.ok) {
    throw new Error(`seedProjectWithDefaults failed: ${result.error.code}`)
  }

  if (overrides?.archivedAt !== undefined) {
    return prisma.project.update({
      where: { id: result.value.id },
      data: { archivedAt: overrides.archivedAt },
    })
  }

  return result.value
}

export async function seedProjectMember(data: {
  userId: string
  projectId: string
}): Promise<ProjectMember> {
  return prisma.projectMember.create({ data })
}
