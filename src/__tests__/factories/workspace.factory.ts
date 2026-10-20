import { createId } from '@paralleldrive/cuid2'
import type { Plan, Workspace } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { WorkspaceDTO } from '@/types/workspace'
import { buildWorkspaceDTO } from './dto/workspace.dto'

export function createFakeWorkspace(overrides?: Partial<Workspace>): Workspace {
  const now = new Date()
  return {
    id: createId(),
    name: 'Test Workspace',
    slug: `ws-${createId().slice(0, 8)}`,
    activePlan: 'FREE' as Plan,
    trialEndsAt: null,
    teamSize: null,
    projectStatesEnabled: true,
    projectLabelsEnabled: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeWorkspaceDTO(
  overrides?: Partial<WorkspaceDTO>,
): WorkspaceDTO {
  const now = new Date().toISOString()
  return buildWorkspaceDTO({
    id: createId(),
    name: 'Test Workspace',
    slug: `ws-${createId().slice(0, 8)}`,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  })
}

export async function seedWorkspace(
  overrides?: Partial<
    Pick<Workspace, 'name' | 'slug' | 'activePlan' | 'trialEndsAt'>
  >,
) {
  return prisma.workspace.create({
    data: {
      name: 'Seed Workspace',
      slug: `seed-ws-${createId().slice(0, 8)}`,
      ...overrides,
    },
  })
}
