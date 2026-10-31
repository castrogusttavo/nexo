import { describe, expect, it } from 'vitest'
import { DEFAULT_PROJECT_STATES } from '@/src/config/project-states'
import { ProjectStateGroupSchema } from '@/src/schemas/project-state.schema'
import {
  projectStateGroupMeta,
  projectStateGroups,
} from '../project-state-groups'

describe('projectStateGroups', () => {
  it('lists every group the API knows, once, so no state is hidden', () => {
    expect(projectStateGroups.map((g) => g.group).sort()).toEqual(
      [...ProjectStateGroupSchema.options].sort(),
    )
  })

  it('shows the lifecycle in order', () => {
    expect(projectStateGroups.map((g) => g.group)).toEqual([
      'DRAFT',
      'PLANNING',
      'EXECUTION',
      'MONITORING',
      'COMPLETED',
      'CANCELLED',
    ])
  })

  // The list promises "defaultColor matches the seeded state of each group":
  // a new state in a group starts in the colour its seeded sibling has.
  it('uses the colour each group is seeded with', () => {
    for (const seeded of DEFAULT_PROJECT_STATES) {
      expect(
        projectStateGroups.find((g) => g.group === seeded.group),
      ).toMatchObject({ defaultColor: seeded.color })
    }
  })

  it('indexes the groups by name', () => {
    expect(projectStateGroupMeta.EXECUTION.label).toBe('Execução')
  })
})
