import { createId } from '@paralleldrive/cuid2'
import { hash } from 'argon2'
import type {
  IssuePriority,
  IssueType,
  Plan,
  Prisma,
  Role,
  State,
} from '@prisma/client'
import { ARGON2_OPTIONS } from '@/src/lib/argon2-config'
import { prisma } from '@/src/lib/prisma'
import { DEFAULT_STATES } from '@/src/repositories/state.repository'

// ---------------------------------------------------------------------------
// Escala — ajuste via env antes de rodar, ex.: SEED_MAIN_ISSUES=30000 pnpm seed:load-test
// ---------------------------------------------------------------------------
const WORKSPACE_SLUG = 'load-test'
const LOAD_TEST_PASSWORD = 'LoadTest@12345678'
const ONBOARDED_USER_COUNT = Number(process.env.SEED_ONBOARDED_USERS ?? 300)
const FRESH_USER_COUNT = Number(process.env.SEED_FRESH_USERS ?? 500)
const MAIN_PROJECT_ISSUES = Number(process.env.SEED_MAIN_ISSUES ?? 15000)
const SIDE_PROJECT_ISSUE_COUNTS = [3000, 1200, 400, 80]
const BATCH_SIZE = 2000

const VERBS = [
  'Corrigir',
  'Investigar',
  'Implementar',
  'Refatorar',
  'Adicionar',
  'Remover',
  'Atualizar',
  'Revisar',
  'Otimizar',
  'Documentar',
]
const NOUNS = [
  'tela de login',
  'fluxo de checkout',
  'endpoint de billing',
  'cache do Redis',
  'webhook do Stripe',
  'painel de configurações',
  'sistema de notificações',
  'API de convites',
  'exportação de dados',
  'wizard de onboarding',
  'dashboard principal',
  'busca de issues',
  'permissões de workspace',
  'integração com GitHub',
  'fila do BullMQ',
  'upload de anexos',
  'página de status',
  'e-mail transacional',
  'autenticação de dois fatores',
  'sidebar de projetos',
]
const ISSUE_TYPE_SPECS: Array<[string, string, number]> = [
  ['Task', 'task-icon', 60],
  ['Bug', 'bug-icon', 25],
  ['Feature', 'feature-icon', 15],
]
const LABEL_NAMES = [
  'frontend',
  'backend',
  'infra',
  'design',
  'urgente',
  'tech-debt',
  'documentação',
  'segurança',
  'performance',
  'a11y',
]

function pickWeighted<T>(items: Array<[T, number]>): T {
  const total = items.reduce((sum, [, w]) => sum + w, 0)
  let roll = Math.random() * total
  for (const [value, weight] of items) {
    roll -= weight
    if (roll <= 0) return value
  }
  return items[items.length - 1][0]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomTitle(): string {
  return `${VERBS[randomInt(0, VERBS.length - 1)]} ${NOUNS[randomInt(0, NOUNS.length - 1)]}`
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

async function cleanup() {
  await prisma.workspace.deleteMany({ where: { slug: WORKSPACE_SLUG } })
  await prisma.user.deleteMany({ where: { email: { startsWith: 'loadtest-' } } })
}

async function seedUsers(passwordHash: string) {
  const onboarded = Array.from({ length: ONBOARDED_USER_COUNT }, (_, i) => ({
    id: createId(),
    name: `Load User ${i}`,
    email: `loadtest-onboarded-${i}@nexo.test`,
    username: `loadtest-onboarded-${i}`,
    emailVerified: true,
    acceptedTermsAt: new Date(),
    acceptedPrivacyAt: new Date(),
    onboardingStep: null,
  }))

  // Sem membership e com o wizard no passo inicial — cada VU do k6 "consome"
  // um desses pra andar a esteira de onboarding sem colidir com os outros.
  const fresh = Array.from({ length: FRESH_USER_COUNT }, (_, i) => ({
    id: createId(),
    name: `Load User Fresh ${i}`,
    email: `loadtest-fresh-${i}@nexo.test`,
    username: `loadtest-fresh-${i}`,
    emailVerified: true,
    acceptedTermsAt: new Date(),
    acceptedPrivacyAt: new Date(),
    onboardingStep: 'PROFILE' as const,
  }))

  const allUsers = [...onboarded, ...fresh]
  for (const batch of chunk(allUsers, BATCH_SIZE)) {
    await prisma.user.createMany({ data: batch })
  }

  const accounts = allUsers.map((u) => ({
    id: createId(),
    userId: u.id,
    accountId: u.id,
    providerId: 'credential',
    password: passwordHash,
  }))
  for (const batch of chunk(accounts, BATCH_SIZE)) {
    await prisma.account.createMany({ data: batch })
  }

  return { onboarded, fresh }
}

async function seedWorkspaceAndMembers(onboarded: Array<{ id: string }>) {
  const workspace = await prisma.workspace.create({
    data: { name: 'Load Test Workspace', slug: WORKSPACE_SLUG, activePlan: 'BUSINESS' },
  })

  const memberships: Prisma.MembershipCreateManyInput[] = onboarded.map((user, i) => ({
    id: createId(),
    userId: user.id,
    workspaceId: workspace.id,
    role: (i === 0 ? 'OWNER' : i < 6 ? 'ADMIN' : 'MEMBER') as Role,
  }))
  for (const batch of chunk(memberships, BATCH_SIZE)) {
    await prisma.membership.createMany({ data: batch })
  }

  return workspace
}

async function seedProject(
  workspaceId: string,
  leadId: string,
  memberIds: string[],
  spec: { name: string; identifier: string; issueCount: number },
) {
  const project = await prisma.project.create({
    data: {
      name: spec.name,
      slug: spec.identifier.toLowerCase(),
      identifier: spec.identifier,
      leadId,
      workspaceId,
    },
  })

  // IssueService.list só libera pra quem é lead, tem role privilegiada no
  // workspace (OWNER/ADMIN) ou é ProjectMember explícito — sem isso, os ~98%
  // dos usuários com role MEMBER tomam 403 PROJECT_FORBIDDEN em /issues.
  const projectMembers: Prisma.ProjectMemberCreateManyInput[] = memberIds.map((userId) => ({
    id: createId(),
    userId,
    projectId: project.id,
  }))
  for (const batch of chunk(projectMembers, BATCH_SIZE)) {
    await prisma.projectMember.createMany({ data: batch })
  }

  const states = await Promise.all(
    DEFAULT_STATES.map((s) => prisma.state.create({ data: { ...s, projectId: project.id } })),
  )
  const stateWeights: Array<[State, number]> = [
    [states.find((s) => s.group === 'BACKLOG') as State, 35],
    [states.find((s) => s.group === 'UNSTARTED') as State, 25],
    [states.find((s) => s.group === 'STARTED') as State, 20],
    [states.find((s) => s.group === 'COMPLETED') as State, 15],
    [states.find((s) => s.group === 'CANCELLED') as State, 5],
  ]

  const issueTypes = await Promise.all(
    ISSUE_TYPE_SPECS.map(([name, icon]) =>
      prisma.issueType.create({ data: { name, icon, projectId: project.id } }),
    ),
  )
  const typeWeights: Array<[IssueType, number]> = issueTypes.map((t, i) => [t, ISSUE_TYPE_SPECS[i][2]])

  const labels = await Promise.all(
    LABEL_NAMES.map((name) => prisma.label.create({ data: { name, projectId: project.id } })),
  )

  const cycles = await Promise.all(
    Array.from({ length: 3 }, (_, i) =>
      prisma.cycle.create({
        data: {
          name: `Sprint ${i + 1}`,
          projectId: project.id,
          leadId,
          status: i === 2 ? 'IN_PROGRESS' : 'COMPLETED',
        },
      }),
    ),
  )

  const modules = await Promise.all(
    Array.from({ length: 2 }, (_, i) =>
      prisma.module.create({
        data: { name: `Módulo ${i + 1}`, projectId: project.id, leadId, status: 'IN_PROGRESS' },
      }),
    ),
  )

  const issues: Prisma.IssueCreateManyInput[] = []
  const assignees: Prisma.IssueAssigneeCreateManyInput[] = []
  const issueLabels: Prisma.IssueLabelCreateManyInput[] = []

  for (let n = 1; n <= spec.issueCount; n++) {
    const id = createId()
    const state = pickWeighted(stateWeights)
    const type = pickWeighted(typeWeights)

    issues.push({
      id,
      number: n,
      title: randomTitle(),
      description: { type: 'doc', content: [] },
      priority: pickWeighted<IssuePriority>([
        ['NONE', 30],
        ['LOW', 25],
        ['MEDIUM', 25],
        ['HIGH', 15],
        ['URGENT', 5],
      ]),
      stateId: state.id,
      typeId: type.id,
      cycleId: Math.random() < 0.4 ? cycles[randomInt(0, cycles.length - 1)].id : null,
      moduleId: Math.random() < 0.35 ? modules[randomInt(0, modules.length - 1)].id : null,
      authorId: memberIds[randomInt(0, memberIds.length - 1)],
      projectId: project.id,
    })

    const assigneeRoll = Math.random()
    if (assigneeRoll < 0.75) {
      assignees.push({ id: createId(), issueId: id, userId: memberIds[randomInt(0, memberIds.length - 1)] })
    } else if (assigneeRoll < 0.85) {
      const picked = new Set([
        memberIds[randomInt(0, memberIds.length - 1)],
        memberIds[randomInt(0, memberIds.length - 1)],
      ])
      for (const userId of picked) assignees.push({ id: createId(), issueId: id, userId })
    }

    const labelCount = pickWeighted<number>([
      [0, 20],
      [1, 40],
      [2, 30],
      [3, 10],
    ])
    const usedLabelIds = new Set<string>()
    for (let l = 0; l < labelCount; l++) {
      const label = labels[randomInt(0, labels.length - 1)]
      if (usedLabelIds.has(label.id)) continue
      usedLabelIds.add(label.id)
      issueLabels.push({ id: createId(), issueId: id, labelId: label.id })
    }
  }

  for (const batch of chunk(issues, BATCH_SIZE)) await prisma.issue.createMany({ data: batch })
  for (const batch of chunk(assignees, BATCH_SIZE)) await prisma.issueAssignee.createMany({ data: batch })
  for (const batch of chunk(issueLabels, BATCH_SIZE)) await prisma.issueLabel.createMany({ data: batch })

  await prisma.project.update({ where: { id: project.id }, data: { issueSequence: spec.issueCount } })

  return project
}

async function main() {
  console.log('Limpando seed de carga anterior...')
  await cleanup()

  console.log('Gerando hash de senha (argon2)...')
  const passwordHash = await hash(LOAD_TEST_PASSWORD, ARGON2_OPTIONS)

  console.log(`Criando ${ONBOARDED_USER_COUNT} usuários onboarded + ${FRESH_USER_COUNT} usuários novos...`)
  const { onboarded } = await seedUsers(passwordHash)
  const memberIds = onboarded.map((u) => u.id)

  console.log('Criando workspace e memberships...')
  const workspace = await seedWorkspaceAndMembers(onboarded)

  console.log(`Criando projeto principal com ${MAIN_PROJECT_ISSUES} issues...`)
  const mainProject = await seedProject(workspace.id, onboarded[0].id, memberIds, {
    name: 'Plataforma Core',
    identifier: 'CORE',
    issueCount: MAIN_PROJECT_ISSUES,
  })

  for (const [i, count] of SIDE_PROJECT_ISSUE_COUNTS.entries()) {
    console.log(
      `Criando projeto secundário ${i + 1}/${SIDE_PROJECT_ISSUE_COUNTS.length} com ${count} issues...`,
    )
    await seedProject(workspace.id, onboarded[0].id, memberIds, {
      name: `Squad ${i + 1}`,
      identifier: `SQ${i + 1}`,
      issueCount: count,
    })
  }

  const manifest = {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    mainProjectSlug: mainProject.slug,
    password: LOAD_TEST_PASSWORD,
    onboardedUserEmailPattern: 'loadtest-onboarded-{i}@nexo.test',
    onboardedUserCount: ONBOARDED_USER_COUNT,
    freshUserEmailPattern: 'loadtest-fresh-{i}@nexo.test',
    freshUserCount: FRESH_USER_COUNT,
    mainProjectIssueCount: MAIN_PROJECT_ISSUES,
  }

  const fs = await import('node:fs/promises')
  await fs.writeFile('scripts/.load-test-manifest.json', JSON.stringify(manifest, null, 2))

  console.log('\nSeed de carga concluído:')
  console.table(manifest)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
