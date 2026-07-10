import { PLAN_CATALOG } from '@/src/config/plans'
import {
  type PlanCapabilities,
  PlanCapabilitiesSchema,
  type PlanCapabilityKey,
  type PlanFeatureKey,
  PlanFeaturesSchema,
  type PlanLimitKey,
  PlanLimitsSchema,
  type PlanTier,
} from '@/src/schemas/plan.schema'

export type PricingRow =
  | { kind: 'feature'; key: PlanFeatureKey; label: string; tooltip: string }
  | {
      kind: 'capability'
      key: PlanCapabilityKey
      label: string
      tooltip: string
    }
  | { kind: 'limit'; key: PlanLimitKey; label: string; tooltip: string }

export interface PricingGroup {
  title: string
  rows: PricingRow[]
}

const feat = (
  key: PlanFeatureKey,
  label: string,
  tooltip: string,
): PricingRow => ({ kind: 'feature', key, label, tooltip })

const cap = (
  key: PlanCapabilityKey,
  label: string,
  tooltip: string,
): PricingRow => ({ kind: 'capability', key, label, tooltip })

const lim = (
  key: PlanLimitKey,
  label: string,
  tooltip: string,
): PricingRow => ({ kind: 'limit', key, label, tooltip })

type CapabilityLevels = {
  [K in PlanCapabilityKey]: Record<PlanCapabilities[K], string>
}

const CAPABILITY_LEVELS: CapabilityLevels = {
  estimates: { basic: 'Básico', advanced: 'Avançado' },
  views: { basic: 'Básico', public_private: 'Público e privado' },
  bulkOps: {
    none: '—',
    all_props: 'Todas as propriedades',
    all_props_transfers: 'Propriedades + transferências',
  },
  usageDashboard: { available: 'Disponível', advanced: 'Avançado' },
  adminControls: { none: '—', basic: 'Básico', advanced: 'Avançado' },
  customProperties: {
    none: '—',
    project: 'Por projeto',
    workspace: 'Por workspace',
  },
  teamspaces: { none: '—', basic: 'Básico', advanced: 'Avançado' },
  dashboards: { none: '—', basic: 'Básico', advanced: 'Avançado' },
  timeTracking: {
    none: '—',
    worklogs: 'Registros de trabalho',
    worklogs_approvals: 'Registros + aprovações',
  },
  workflows: {
    none: '—',
    single: 'Fluxo único',
    multiple_approvals: 'Múltiplos + aprovações',
  },
  pageExports: { none: '—', basic: 'Básico', queued: 'Em fila' },
  roles: { basic: 'Básico', rbac: 'RBAC', gac: 'Granular (GAC)' },
  guests: {
    limited: 'Limitado',
    per_seat: '1 a cada 5 assentos',
    custom: 'Personalizado',
  },
  supportChannels: {
    basic: 'Básico',
    migration_implementation: 'Migração e implementação',
  },
}

function formatLimit(key: PlanLimitKey, value: number | null): PricingCell {
  if (value === null) return { kind: 'text', text: 'Ilimitado' }
  if (value === 0) return { kind: 'dash' }

  switch (key) {
    case 'aiCreditsPerSeat':
      return { kind: 'text', text: `${value.toLocaleString('pt-BR')}/assento` }
    case 'guestsPerSeat':
      return { kind: 'text', text: `${value}/assento` }
    case 'pageVersionDays':
      return { kind: 'text', text: `${value} dias` }
    case 'seats':
    case 'pageVersions':
      return { kind: 'text', text: String(value) }
  }
}

export type PricingCell =
  | { kind: 'check' }
  | { kind: 'dash' }
  | { kind: 'text'; text: string }

export function resolvePricingCell(
  row: PricingRow,
  plan: PlanTier,
): PricingCell {
  const entry = PLAN_CATALOG[plan]

  switch (row.kind) {
    case 'feature':
      return entry.features[row.key] ? { kind: 'check' } : { kind: 'dash' }
    case 'capability': {
      const value = entry.capabilities[row.key]
      if (value === 'none') return { kind: 'dash' }
      const levels = CAPABILITY_LEVELS[row.key] as Record<string, string>
      return { kind: 'text', text: levels[value] }
    }
    case 'limit':
      return formatLimit(row.key, entry.limits[row.key])
  }
}

export const PRICING_GROUPS: PricingGroup[] = [
  {
    title: 'Gerenciamento de projetos principais',
    rows: [
      feat(
        'projects',
        'Projetos',
        'Entregue projetos com itens de trabalho ricos e fáceis de usar.',
      ),
      feat(
        'workItems',
        'Itens de trabalho',
        'Crie, atribua e acompanhe itens de trabalho detalhados.',
      ),
      feat(
        'comments',
        'Comentários',
        'Discuta e alinhe diretamente nos itens de trabalho.',
      ),
      feat('cycles', 'Ciclos', 'Defina timeboxes para o trabalho da equipe.'),
      feat(
        'modules',
        'Módulos',
        'Divida o trabalho em blocos repetíveis com poucos cliques.',
      ),
      feat(
        'pages',
        'Páginas de projeto',
        'Documente tudo sobre o seu trabalho sem trocar de interface.',
      ),
      feat(
        'layouts',
        'Layouts e visualizações',
        'Cinco layouts, visualizações ilimitadas e flexibilidade para todos.',
      ),
      feat(
        'progressOverview',
        'Visão geral de progresso',
        'Acompanhe o avanço de projetos e ciclos em um só lugar.',
      ),
      feat(
        'powerK',
        'Power-K (comando rápido)',
        'Navegue e execute ações por teclado em qualquer tela.',
      ),
      cap(
        'estimates',
        'Estimativas',
        'Meça o esforço em pontos em um sistema que funciona para você.',
      ),
      cap(
        'views',
        'Visualizações',
        'Tipos de visualização disponíveis por plano.',
      ),
      feat(
        'publishViews',
        'Publicar visualizações',
        'Compartilhe visualizações publicamente com links.',
      ),
      feat(
        'activeCycles',
        'Ciclos ativos',
        'Acompanhe múltiplos ciclos em andamento.',
      ),
      feat(
        'cycleManualStartStop',
        'Início/fim manual de ciclos',
        'Controle manualmente quando cada ciclo começa e termina.',
      ),
      feat(
        'timelineDependencies',
        'Dependências na timeline',
        'Relacione itens e visualize bloqueios na linha do tempo.',
      ),
      feat(
        'milestones',
        'Marcos (milestones)',
        'Marque entregas-chave ao longo do projeto.',
      ),
      feat(
        'initiatives',
        'Iniciativas',
        'Codifique sua missão e seus objetivos com facilidade.',
      ),
      feat(
        'updates',
        'Atualizações (updates)',
        'Publique status e novidades por projeto e iniciativa.',
      ),
      feat(
        'moduleOverview',
        'Visão geral de módulos',
        'Resumo de progresso por módulo.',
      ),
      feat(
        'projectOverview',
        'Visão geral de projetos',
        'Painel de status por projeto.',
      ),
      feat(
        'projectVisibility',
        'Visibilidade de projetos',
        'Controle quem enxerga cada projeto.',
      ),
      feat(
        'projectStates',
        'Estados de projeto',
        'Defina estados personalizados para o ciclo de vida do projeto.',
      ),
    ],
  },
  {
    title: 'Gestão avançada de projetos',
    rows: [
      feat(
        'workItemTypes',
        'Tipos de itens personalizados',
        'Personalize aparências e propriedades por tipo de item.',
      ),
      feat(
        'workItemTemplates',
        'Modelos de itens',
        'Replique seus itens de trabalho padrão sem dor de cabeça.',
      ),
      feat(
        'projectTemplates',
        'Modelos de projeto',
        'Dimensione fluxos de trabalho comprovados entre as equipes.',
      ),
      feat(
        'cycleProgressCharts',
        'Gráficos de progresso de ciclo',
        'Burndown e gráficos de evolução por ciclo.',
      ),
      feat(
        'recurringWorkItems',
        'Itens de trabalho recorrentes',
        'Automatize o trabalho cíclico sem esquecer nem duplicar.',
      ),
      feat(
        'autoTransferCycleItems',
        'Transferência automática de itens',
        'Itens não concluídos passam automaticamente para o próximo ciclo.',
      ),
      feat(
        'autoScheduleCycles',
        'Agendamento automático de ciclos',
        'Gere e agende ciclos automaticamente.',
      ),
      feat(
        'customSlas',
        'SLAs personalizados',
        'Defina acordos de nível de serviço sob medida.',
      ),
      cap(
        'customProperties',
        'Propriedades personalizadas',
        'Campos sob medida para itens de trabalho.',
      ),
      cap(
        'bulkOps',
        'Operações em massa',
        'Edite várias propriedades de vários itens de uma vez.',
      ),
      cap(
        'timeTracking',
        'Controle de tempo',
        'Acompanhe o tempo por item, com relatórios e edições.',
      ),
      cap(
        'dashboards',
        'Dashboards',
        'Visualize seus dados de trabalho em painéis.',
      ),
      cap(
        'usageDashboard',
        'Painel de uso',
        'Acompanhe o consumo do workspace.',
      ),
      cap(
        'teamspaces',
        'Espaços de equipe (Teamspaces)',
        'Áreas dedicadas e personalizáveis por equipe.',
      ),
    ],
  },
  {
    title: 'Fluxos de trabalho & automação',
    rows: [
      cap(
        'workflows',
        'Fluxos de trabalho',
        'Controle como os itens se movem entre estados.',
      ),
      feat(
        'triggerAndAction',
        'Gatilhos e ações',
        'Automatize fluxos com regras de gatilho e ação.',
      ),
      feat(
        'advancedPagesAnalytics',
        'Analytics avançado de páginas',
        'Métricas detalhadas de uso das páginas.',
      ),
      feat(
        'advancedExports',
        'Exportações avançadas',
        'Baixe relatórios completos em formatos avançados.',
      ),
    ],
  },
  {
    title: 'Gestão de conhecimento',
    rows: [
      feat(
        'wiki',
        'Wiki do workspace',
        'Conhecimento por tópico e por equipe para toda a empresa.',
      ),
      feat(
        'wikiCollecions',
        'Coleções de wiki',
        'Organize a wiki em coleções temáticas.',
      ),
      feat(
        'realtimeCollab',
        'Colaboração em tempo real',
        'Edite páginas simultaneamente com a equipe.',
      ),
      feat(
        'nestedPages',
        'Páginas aninhadas',
        'Registre o conhecimento progressivamente em hierarquia.',
      ),
      feat(
        'sharedPages',
        'Páginas compartilhadas',
        'Compartilhe páginas entre equipes e projetos.',
      ),
      feat(
        'pageComments',
        'Comentários em páginas',
        'Discuta diretamente no conteúdo das páginas.',
      ),
      feat(
        'pageTemplates',
        'Modelos de páginas',
        'Reaproveite estruturas de página padronizadas.',
      ),
      feat(
        'pagePublish',
        'Publicar páginas',
        'Publique páginas com link público.',
      ),
      feat(
        'workItemEmbeds',
        'Incorporações em itens',
        'Traga contexto rico de outras fontes para os itens.',
      ),
      feat(
        'linkToWorkItem',
        'Vincular a itens de trabalho',
        'Conecte páginas e conteúdos aos itens de trabalho.',
      ),
      feat(
        'enhancedSearch',
        'Busca aprimorada',
        'Encontre qualquer conteúdo com busca avançada.',
      ),
      cap(
        'pageExports',
        'Exportação de páginas',
        'Baixe páginas em outros formatos.',
      ),
    ],
  },
  {
    title: 'Intake & clientes',
    rows: [
      feat(
        'intakeInApp',
        'Intake no app',
        'Capture solicitações diretamente no Nexo.',
      ),
      feat(
        'intakeForms',
        'Formulários de intake',
        'Transforme envios de formulários em itens triageáveis.',
      ),
      feat(
        'intakeEmail',
        'Intake por e-mail',
        'Converta e-mails externos em itens de trabalho.',
      ),
      feat(
        'intakeResponsibility',
        'Responsáveis por intake',
        'Direcione solicitações ao responsável certo.',
      ),
      feat(
        'customers',
        'Clientes',
        'Perfis dedicados de clientes com solicitações vinculadas.',
      ),
      feat(
        'sla',
        'SLA de atendimento',
        'Acordo de nível de serviço para solicitações.',
      ),
    ],
  },
  {
    title: 'Segurança, acesso & suporte',
    rows: [
      cap('roles', 'Papéis e permissões', 'Controle de acesso por papel.'),
      cap(
        'adminControls',
        'Controles de administração',
        'Ferramentas de gestão para administradores.',
      ),
      cap('guests', 'Convidados', 'Colaboradores externos no workspace.'),
      feat('saml', 'SSO via SAML', 'Autenticação única com SAML.'),
      feat('oidc', 'SSO via OIDC', 'Autenticação única com OpenID Connect.'),
      feat(
        'ldap',
        'Suporte a LDAP',
        'Autentique, autorize e sincronize grupos com seu diretório LDAP.',
      ),
      feat(
        'groupSync',
        'Sincronização de grupos',
        'Mantenha grupos em sincronia com seu diretório.',
      ),
      cap('supportChannels', 'Suporte', 'Canais de atendimento disponíveis.'),
    ],
  },
  {
    title: 'Importadores',
    rows: [
      feat('importJira', 'Importar do Jira', 'Migre projetos e itens do Jira.'),
      feat('importLinear', 'Importar do Linear', 'Migre dados do Linear.'),
      feat('importAsana', 'Importar do Asana', 'Migre dados do Asana.'),
      feat('importClickup', 'Importar do ClickUp', 'Migre dados do ClickUp.'),
      feat(
        'importCsv',
        'Importar de CSV',
        'Importe itens de trabalho por CSV.',
      ),
      feat(
        'importMembersCsv',
        'Importar membros por CSV',
        'Adicione membros em massa via CSV.',
      ),
      feat(
        'importConfluence',
        'Importar do Confluence',
        'Migre páginas do Confluence.',
      ),
      feat('importNotion', 'Importar do Notion', 'Migre páginas do Notion.'),
    ],
  },
  {
    title: 'Integrações',
    rows: [
      feat('github', 'GitHub', 'Conecte repositórios e vincule PRs a itens.'),
      feat(
        'githubEnterprise',
        'GitHub Enterprise',
        'Integração com GitHub Enterprise.',
      ),
      feat('gitlab', 'GitLab', 'Conecte repositórios do GitLab.'),
      feat(
        'gitlabEnterprise',
        'GitLab Enterprise',
        'Integração com GitLab Enterprise.',
      ),
      feat('slack', 'Slack', 'Receba e aja sobre notificações no Slack.'),
      feat('sentry', 'Sentry', 'Vincule erros do Sentry a itens de trabalho.'),
      feat('drawio', 'draw.io', 'Incorpore diagramas do draw.io.'),
    ],
  },
  {
    title: 'Implantação & conformidade',
    rows: [
      feat(
        'managedDeployment',
        'Implantação gerenciada',
        'Plano como serviço, personalizado e totalmente gerenciado.',
      ),
      feat(
        'apiAuditLogs',
        'Logs de auditoria via API',
        'Rastreie programaticamente quem fez o quê e quando.',
      ),
    ],
  },
  {
    title: 'Limites & créditos',
    rows: [
      lim(
        'seats',
        'Assentos (usuários)',
        'Membros que podem colaborar no workspace.',
      ),
      lim(
        'aiCreditsPerSeat',
        'Créditos de IA por assento',
        'Créditos de IA emitidos por assento.',
      ),
      lim(
        'guestsPerSeat',
        'Convidados por assento',
        'Convidados externos permitidos por assento.',
      ),
      lim(
        'pageVersions',
        'Versões de página',
        'Histórico de versões guardado por página.',
      ),
      lim(
        'pageVersionDays',
        'Retenção de versões',
        'Por quanto tempo o histórico de páginas é mantido.',
      ),
    ],
  },
]

// Load-time guard: every catalog key must have exactly one row. If the catalog
// gains a feature/capability/limit without a row here, this throws on import.
const coveredKeys = PRICING_GROUPS.flatMap((group) =>
  group.rows.map((row) => row.key),
)
const allKeys = [
  ...Object.keys(PlanFeaturesSchema.shape),
  ...Object.keys(PlanCapabilitiesSchema.shape),
  ...Object.keys(PlanLimitsSchema.shape),
]
const coveredSet = new Set<string>(coveredKeys)
const missing = allKeys.filter((key) => !coveredSet.has(key))
const duplicates = coveredKeys.filter(
  (key, i) => coveredKeys.indexOf(key) !== i,
)

if (missing.length > 0 || duplicates.length > 0) {
  throw new Error(
    `pricing-table-data: missing rows [${missing.join(', ')}]; ` +
      `duplicated rows [${duplicates.join(', ')}]`,
  )
}
