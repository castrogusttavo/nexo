import type { IssuePriority } from '@prisma/client'
import { seedLabel } from '@/src/__tests__/factories/label.factory'
import { seedCycle } from '@/src/__tests__/factories/cycle.factory'
import { seedIssueAssignee, seedIssueLabel } from '@/src/__tests__/factories/issue.factory'
import { seedModule } from '@/src/__tests__/factories/module.factory'
import { prisma } from '@/src/lib/prisma'

const CYCLE_NAME = 'Sprint Preview'
const MODULE_NAME = 'Preview Module'
const LABEL_NAME = 'Preview'

const ISSUE_SPECS: Array<{
  title: string
  priority: IssuePriority
  stateGroup: 'BACKLOG' | 'UNSTARTED' | 'STARTED' | 'COMPLETED' | 'CANCELLED'
  withCycle: boolean
  withModule: boolean
  withLabel: boolean
  withAssignee: boolean
}> = [
  {
    title: 'Corrigir tela de login travando',
    priority: 'HIGH',
    stateGroup: 'BACKLOG',
    withCycle: false,
    withModule: false,
    withLabel: false,
    withAssignee: false,
  },
  {
    title: 'Revisar fluxo de checkout',
    priority: 'URGENT',
    stateGroup: 'STARTED',
    withCycle: true,
    withModule: false,
    withLabel: false,
    withAssignee: false,
  },
  {
    title: 'Atualizar biblioteca de ícones',
    priority: 'MEDIUM',
    stateGroup: 'UNSTARTED',
    withCycle: false,
    withModule: true,
    withLabel: false,
    withAssignee: false,
  },
  {
    title: 'Refatorar painel de configurações',
    priority: 'LOW',
    stateGroup: 'COMPLETED',
    withCycle: true,
    withModule: true,
    withLabel: true,
    withAssignee: true,
  },
  {
    title: 'Remover feature flag antiga',
    priority: 'NONE',
    stateGroup: 'CANCELLED',
    withCycle: false,
    withModule: false,
    withLabel: true,
    withAssignee: false,
  },
  {
    title: 'Investigar lentidão na busca',
    priority: 'HIGH',
    stateGroup: 'BACKLOG',
    withCycle: true,
    withModule: true,
    withLabel: false,
    withAssignee: true,
  },
]

/**
 * Popula um projeto existente com ciclo, módulo, label e issues variadas
 * (estado/prioridade/ciclo/módulo/label/responsável) para validar visualmente
 * os agrupamentos da issue list. Idempotente: remove o preview anterior (pelos
 * nomes/títulos fixos acima) antes de recriar. Uso: pnpm seed:preview [identifier]
 */
async function main() {
  const identifier = process.argv[2]

  const project = identifier
    ? await prisma.project.findFirst({ where: { identifier } })
    : await prisma.project.findFirst({
        where: { archivedAt: null },
        orderBy: { createdAt: 'asc' },
      })

  if (!project) {
    console.error(
      identifier
        ? `Nenhum projeto encontrado com identifier "${identifier}".`
        : 'Nenhum projeto encontrado. Rode "pnpm seed:preview <IDENTIFIER>" apontando pra um existente.',
    )
    process.exitCode = 1
    return
  }

  await prisma.issue.deleteMany({
    where: { projectId: project.id, title: { in: ISSUE_SPECS.map((spec) => spec.title) } },
  })
  await prisma.cycle.deleteMany({ where: { projectId: project.id, name: CYCLE_NAME } })
  await prisma.module.deleteMany({ where: { projectId: project.id, name: MODULE_NAME } })
  await prisma.label.deleteMany({ where: { projectId: project.id, name: LABEL_NAME } })

  const states = await prisma.state.findMany({ where: { projectId: project.id } })
  const stateByGroup = Object.fromEntries(states.map((state) => [state.group, state]))
  if (!stateByGroup.BACKLOG || !stateByGroup.STARTED) {
    throw new Error(`Projeto "${project.identifier}" não tem os states padrão configurados.`)
  }

  const issueType = await prisma.issueType.findFirst({
    where: { projectId: project.id, name: 'Task' },
  })
  if (!issueType) throw new Error(`Tipo "Task" não encontrado no projeto "${project.identifier}".`)

  const authorId = project.leadId

  const cycle = await seedCycle(project.id, authorId, { name: CYCLE_NAME, status: 'IN_PROGRESS' })
  const projectModule = await seedModule(project.id, authorId, {
    name: MODULE_NAME,
    status: 'IN_PROGRESS',
  })
  const label = await seedLabel(project.id, { name: LABEL_NAME, color: 'BLUE' })

  const startNumber = project.issueSequence + 1

  for (const [index, spec] of ISSUE_SPECS.entries()) {
    const state = stateByGroup[spec.stateGroup]
    if (!state) continue

    const issue = await prisma.issue.create({
      data: {
        title: spec.title,
        description: { type: 'doc', content: [] },
        number: startNumber + index,
        priority: spec.priority,
        stateId: state.id,
        typeId: issueType.id,
        cycleId: spec.withCycle ? cycle.id : null,
        moduleId: spec.withModule ? projectModule.id : null,
        authorId,
        projectId: project.id,
      },
    })

    if (spec.withLabel) await seedIssueLabel(issue.id, label.id)
    if (spec.withAssignee) await seedIssueAssignee(issue.id, authorId)
  }

  await prisma.project.update({
    where: { id: project.id },
    data: { issueSequence: startNumber + ISSUE_SPECS.length - 1 },
  })

  console.log(`Seed concluído no projeto "${project.name}" (${project.identifier}):`)
  console.log(`- 1 cycle: "${cycle.name}"`)
  console.log(`- 1 module: "${projectModule.name}"`)
  console.log(`- 1 label: "${label.name}"`)
  console.log(`- ${ISSUE_SPECS.length} issues (variando state/priority/cycle/module/label/responsável)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
