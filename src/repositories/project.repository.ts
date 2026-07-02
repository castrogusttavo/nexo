import type {
  Project,
  ProjectFavorite,
  ProjectMember,
  User,
} from '@prisma/client'
import {
  databaseError,
  projectMemberAlreadyExists,
  projectMemberNotFound,
  projectNotFound,
  projectSlugConflict,
} from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'

export type ProjectWithDetails = Project & {
  members: Pick<ProjectMember, 'userId'>[]
  favourites: Pick<ProjectFavorite, 'id'>[]
}

export type ProjectMemberWithUser = ProjectMember & {
  user: Pick<User, 'id' | 'name' | 'username' | 'image'>
}

const memberUserSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const

export const ProjectRepository = {
  async findById(id: string): Promise<Result<Project>> {
    try {
      const project = await prisma.project.findUnique({ where: { id } })
      if (!project) return err(projectNotFound())
      return ok(project)
    } catch {
      return err(databaseError('Failed to find project by id'))
    }
  },

  async findByWorkspaceAndSlug(
    workspaceId: string,
    slug: string,
    actorId: string,
  ): Promise<Result<ProjectWithDetails>> {
    try {
      const project = await prisma.project.findUnique({
        where: { workspaceId_slug: { workspaceId, slug } },
        include: {
          members: { select: { userId: true } },
          favourites: { where: { userId: actorId }, select: { id: true } },
        },
      })
      if (!project) return err(projectNotFound())
      return ok(project)
    } catch {
      return err(databaseError('Failed to find project by slug'))
    }
  },

  async listByWorkspace(
    workspaceId: string,
    actorId: string,
    isPrivileged: boolean,
    options: { archived: boolean },
  ): Promise<Result<ProjectWithDetails[]>> {
    try {
      const projects = await prisma.project.findMany({
        where: {
          workspaceId,
          archivedAt: options.archived ? { not: null } : null,
          ...(isPrivileged
            ? {}
            : {
                OR: [
                  { isPublic: true },
                  { leadId: actorId },
                  { members: { some: { userId: actorId } } },
                ],
              }),
        },
        include: {
          members: { select: { userId: true } },
          favourites: { where: { userId: actorId }, select: { id: true } },
        },
        orderBy: { updatedAt: 'desc' },
      })
      return ok(projects)
    } catch {
      return err(databaseError('Failed to list projects'))
    }
  },

  async listMembers(
    projectId: string,
  ): Promise<Result<ProjectMemberWithUser[]>> {
    try {
      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: { user: memberUserSelect },
        orderBy: { createdAt: 'asc' },
      })
      return ok(members)
    } catch {
      return err(databaseError('Failed to list project members'))
    }
  },

  async addMember(
    userId: string,
    projectId: string,
  ): Promise<Result<ProjectMemberWithUser>> {
    try {
      const member = await prisma.projectMember.create({
        data: { userId, projectId },
        include: { user: memberUserSelect },
      })
      return ok(member)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(projectMemberAlreadyExists())
      }
      return err(databaseError('Failed to add project member'))
    }
  },

  async removeMember(userId: string, projectId: string): Promise<Result<void>> {
    try {
      const res = await prisma.projectMember.deleteMany({
        where: { userId, projectId },
      })
      if (res.count === 0) return err(projectMemberNotFound())
      return ok(undefined)
    } catch {
      return err(databaseError('Failed to remove project member'))
    }
  },

  async create(data: {
    name: string
    slug: string
    description?: string
    emoji?: string
    coverImage?: string
    isPublic: boolean
    leadId: string
    workspaceId: string
  }): Promise<Result<Project>> {
    try {
      const project = await prisma.$transaction(async (tx) => {
        const p = await tx.project.create({ data })
        await tx.projectMember.create({
          data: { userId: data.leadId, projectId: p.id },
        })
        return p
      })
      return ok(project)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(projectSlugConflict())
      }

      return err(databaseError('Failed to create project'))
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      slug?: string
      description?: string | null
      emoji?: string | null
      coverImage?: string | null
      isPublic?: boolean
      leadId?: string
    },
  ): Promise<Result<Project>> {
    try {
      const project = await prisma.project.update({ where: { id }, data })
      return ok(project)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(projectSlugConflict())
      }

      return err(databaseError('Failed to update project'))
    }
  },

  async archive(id: string): Promise<Result<Project>> {
    try {
      const project = await prisma.project.update({
        where: { id },
        data: { archivedAt: new Date() },
      })
      return ok(project)
    } catch {
      return err(databaseError('Failed to archive project'))
    }
  },

  async restore(id: string): Promise<Result<Project>> {
    try {
      const project = await prisma.project.update({
        where: { id },
        data: { archivedAt: null },
      })
      return ok(project)
    } catch {
      return err(databaseError('Failed to archive project'))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.project.delete({ where: { id } })
      return ok(undefined)
    } catch {
      return err(databaseError('Failed to delete project'))
    }
  },

  async addFavorite(userId: string, projectId: string): Promise<Result<void>> {
    try {
      await prisma.projectFavorite.upsert({
        where: { userId_projectId: { userId, projectId } },
        create: { userId, projectId },
        update: {},
      })
      return ok(undefined)
    } catch {
      return err(databaseError('Failed to add favorite'))
    }
  },

  async removeFavorite(
    userId: string,
    projectId: string,
  ): Promise<Result<void>> {
    try {
      await prisma.projectFavorite.deleteMany({ where: { userId, projectId } })
      return ok(undefined)
    } catch {
      return err(databaseError('Failed to remove favorite'))
    }
  },
}
