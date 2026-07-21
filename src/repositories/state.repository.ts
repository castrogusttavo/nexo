import type { State } from '@prisma/client'
import { stateNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export const StateRepository = {
  async findById(id: string): Promise<Result<State>> {
    try {
      const state = await prisma.state.findUnique({ where: { id } })
      if (!state) return err(stateNotFound())
      return ok(state)
    } catch (error) {
      return err(dbError('Failed to find state by id', error))
    }
  },

  async listByProject(projectId: string): Promise<Result<State[]>> {
    try {
      const states = await prisma.state.findMany({
        where: { projectId },
        orderBy: [{ group: 'asc' }, { order: 'asc' }],
      })
      return ok(states)
    } catch (error) {
      return err(dbError('Failed to list states', error))
    }
  },

  async countByGroup(
    projectId: string,
    group: State['group'],
  ): Promise<Result<number>> {
    try {
      const count = await prisma.state.count({ where: { projectId, group } })
      return ok(count)
    } catch (error) {
      return err(dbError('Failed to count states bu group', error))
    }
  },

  async create(data: {
    name: string
    description?: string
    group: State['group']
    color?: State['color']
    projectId: string
  }): Promise<Result<State>> {
    try {
      const state = await prisma.state.create({ data })
      return ok(state)
    } catch (error) {
      return err(dbError('Failed to create state', error))
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      description?: string | null
      color?: State['color']
      order?: number
    },
  ): Promise<Result<State>> {
    try {
      const state = await prisma.state.update({ where: { id }, data })
      return ok(state)
    } catch (error) {
      return err(dbError('Failed to update state', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.state.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to delete state', error))
    }
  },

  async setDefault(id: string, projectId: string): Promise<Result<State>> {
    try {
      const [, state] = await prisma.$transaction([
        prisma.state.updateMany({
          where: { projectId, isDefault: true },
          data: { isDefault: false },
        }),
        prisma.state.update({ where: { id }, data: { isDefault: true } }),
      ])
      return ok(state)
    } catch (error) {
      return err(dbError('Failed to set default state', error))
    }
  },
}
