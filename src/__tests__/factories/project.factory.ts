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

// Passa pelo mesmo ProjectRepository.create() usado em produção — sem isso,
// o projeto de teste ficava sem EstimateSettings, states, labels e os
// issue types de sistema (Task/Epic com isSystem: true) que a criação real
// sempre seeda, e qualquer rota que depende deles (estimate, issue-types,
// criação de issue sem typeId explícito) quebrava só em teste.
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
    throw new Error(`seedProject failed: ${result.error.code}`)
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
