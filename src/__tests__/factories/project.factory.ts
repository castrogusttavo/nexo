import { createId } from '@paralleldrive/cuid2'
import type { Project, ProjectMember } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { ProjectDTO } from '@/types/project'

export function createFakeProject(overrides?: Partial<Project>): Project {
  const now = new Date()
  return {
    id: createId(),
    name: 'Text Project',
    slug: `proj-${createId().slice(0, 8)}`,
    identifier: null,
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
    identifier: null,
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
      workspaceId,
      leadId,
      ...overrides,
    },
  })
}

export async function seedProjectMember(data: {
  userId: string
  projectId: string
}): Promise<ProjectMember> {
  return prisma.projectMember.create({ data })
}
