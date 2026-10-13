import { describe, expect, it } from 'vitest'
import {
  CreateProjectStateSchema,
  ProjectStateGroupSchema,
  UpdateProjectStateSchema,
} from '../project-state.schema'

describe('ProjectStateGroupSchema', () => {
  it('accepts every declared group', () => {
    for (const group of [
      'DRAFT',
      'PLANNING',
      'EXECUTION',
      'MONITORING',
      'COMPLETED',
      'CANCELLED',
    ]) {
      expect(ProjectStateGroupSchema.safeParse(group).success).toBe(true)
    }
  })

  it('rejects an issue state group', () => {
    expect(ProjectStateGroupSchema.safeParse('BACKLOG').success).toBe(false)
  })
})

describe('CreateProjectStateSchema', () => {
  it('accepts a minimal valid payload and defaultsa color', () => {
    const result = CreateProjectStateSchema.safeParse({
      name: 'Em revisão',
      group: 'MONITORING',
    })
    expect(result.success && result.data.color).toBe('ZINC')
  })

  it('accepts a full payload', () => {
    expect(
      CreateProjectStateSchema.safeParse({
        name: 'Em revisão',
        description: 'Aguardando o aceite do cliente',
        group: 'MONITORING',
        color: 'PURPLE',
      }).success,
    ).toBe(true)
  })

  it('requires a group', () => {
    expect(
      CreateProjectStateSchema.safeParse({ name: 'Em revisão' }).success,
    ).toBe(false)
  })

  it('reject an empty name', () => {
    expect(
      CreateProjectStateSchema.safeParse({ name: '', group: 'DRAFT' }).success,
    ).toBe(false)
  })

  it('rejects a name longer than 50 characters', () => {
    expect(
      CreateProjectStateSchema.safeParse({
        name: 'x'.repeat(51),
        group: 'DRAFT',
      }).success,
    ).toBe(false)
  })

  it('rejects a description longer than 280 characters', () => {
    expect(
      CreateProjectStateSchema.safeParse({
        name: 'Em revisão',
        group: 'DRAFT',
        description: 'x'.repeat(281),
      }).success,
    ).toBe(false)
  })

  it('reject an invalid color', () => {
    expect(
      CreateProjectStateSchema.safeParse({
        name: 'Em revisão',
        group: 'DRAFT',
        color: 'ORANGE',
      }).success,
    ).toBe(false)
  })
})

describe('UpdateProjectStateSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    expect(UpdateProjectStateSchema.safeParse({}).success).toBe(true)
  })

  it('accepts a new order', () => {
    expect(UpdateProjectStateSchema.safeParse({ order: 3 }).success).toBe(true)
  })

  it('rejects a fractional order', () => {
    expect(UpdateProjectStateSchema.safeParse({ order: 1.5 }).success).toBe(
      false,
    )
  })

  // A state keeps its group; moving it could empty a group behind the
  // last-in-group rule's back.
  it('drops a group', () => {
    const result = UpdateProjectStateSchema.safeParse({ group: 'COMPLETED' })
    expect(result.success && 'group' in result.data).toBe(false)
  })
})
