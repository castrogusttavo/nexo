import type {
  Project,
  ProjectFavorite,
  ProjectMember,
  User,
} from '@prisma/client'
import {
  projectMemberAlreadyExists,
  projectMemberNotFound,
  projectNotFound,
  projectSlugConflict,
} from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

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
    } catch (error) {
      return err(dbError('Failed to find project by id', error))
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
    } catch (error) {
      return err(dbError('Failed to find project by slug', error))
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
    } catch (error) {
      return err(dbError('Failed to list projects', error))
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
    } catch (error) {
      return err(dbError('Failed to list project members', error))
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
      return err(dbError('Failed to add project member', error))
    }
  },

  async removeMember(userId: string, projectId: string): Promise<Result<void>> {
    try {
      const res = await prisma.projectMember.deleteMany({
        where: { userId, projectId },
      })
      if (res.count === 0) return err(projectMemberNotFound())
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to remove project member', error))
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

      return err(dbError('Failed to create project', error))
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

      return err(dbError('Failed to update project', error))
    }
  },

  async archive(id: string): Promise<Result<Project>> {
    try {
      const project = await prisma.project.update({
        where: { id },
        data: { archivedAt: new Date() },
      })
      return ok(project)
    } catch (error) {
      return err(dbError('Failed to archive project', error))
    }
  },

  async restore(id: string): Promise<Result<Project>> {
    try {
      const project = await prisma.project.update({
        where: { id },
        data: { archivedAt: null },
      })
      return ok(project)
    } catch (error) {
      return err(dbError('Failed to archive project', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.project.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to delete project', error))
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
    } catch (error) {
      return err(dbError('Failed to add favorite', error))
    }
  },

  async removeFavorite(
    userId: string,
    projectId: string,
  ): Promise<Result<void>> {
    try {
      await prisma.projectFavorite.deleteMany({ where: { userId, projectId } })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to remove favorite', error))
    }
  },
}
