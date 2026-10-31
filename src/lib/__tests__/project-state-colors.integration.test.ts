import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { seedWorkspace } from '@/src/__tests__/factories/workspace.factory'
import { prisma } from '@/src/lib/prisma'

const MIGRATION = readFileSync(
  join(
    process.cwd(),
    'prisma/migrations/20261031120000_project_state_colors/migration.sql',
  ),
  'utf8',
)

async function state(
  workspaceId: string,
  group: 'PLANNING' | 'MONITORING' | 'CANCELLED',
  name: string,
  color: 'ZINC' | 'BLUE' | 'PURPLE' | 'RED' | 'GREEN',
) {
  return prisma.projectState.create({
    data: { workspaceId, group, name, color, order: 0 },
  })
}

// Prisma runs a multi-statement string only through the unsafe raw API, one
// statement at a time.
async function runMigration() {
  for (const statement of MIGRATION.split(/;\s*\n/).map((s) => s.trim())) {
    const sql = statement
      .split('\n')
      .filter((line) => !line.startsWith('--'))
      .join('\n')
      .trim()
    if (sql) await prisma.$executeRawUnsafe(sql)
  }
}

const colorOf = async (id: string) =>
  (await prisma.projectState.findUniqueOrThrow({ where: { id } })).color

describe('20261031120000_project_state_colors', () => {
  it('moves the three seeded states that still have their old colour', async () => {
    const ws = await seedWorkspace()
    const planning = await state(ws.id, 'PLANNING', 'Planejamento', 'BLUE')
    const monitoring = await state(
      ws.id,
      'MONITORING',
      'Monitoramento',
      'PURPLE',
    )
    const cancelled = await state(ws.id, 'CANCELLED', 'Cancelado', 'RED')

    await runMigration()

    expect(await colorOf(planning.id)).toBe('ZINC')
    expect(await colorOf(monitoring.id)).toBe('BLUE')
    expect(await colorOf(cancelled.id)).toBe('ZINC')
  })

  it('leaves a state the admin recoloured alone', async () => {
    const ws = await seedWorkspace()
    const planning = await state(ws.id, 'PLANNING', 'Planejamento', 'GREEN')

    await runMigration()

    expect(await colorOf(planning.id)).toBe('GREEN')
  })

  it('leaves a state the admin renamed alone, even with the old colour', async () => {
    const ws = await seedWorkspace()
    const renamed = await state(ws.id, 'CANCELLED', 'Descartado', 'RED')

    await runMigration()

    expect(await colorOf(renamed.id)).toBe('RED')
  })

  it('does not touch the groups it does not mention', async () => {
    const ws = await seedWorkspace()
    const other = await prisma.projectState.create({
      data: {
        workspaceId: ws.id,
        group: 'COMPLETED',
        name: 'Concluído',
        color: 'GREEN',
        order: 0,
      },
    })

    await runMigration()

    expect(await colorOf(other.id)).toBe('GREEN')
  })

  it('is safe to run twice', async () => {
    const ws = await seedWorkspace()
    const planning = await state(ws.id, 'PLANNING', 'Planejamento', 'BLUE')

    await runMigration()
    await runMigration()

    expect(await colorOf(planning.id)).toBe('ZINC')
  })
})
