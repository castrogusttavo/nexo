import {
  type PlanCapabilities,
  PlanCatalogSchema,
  type PlanFeatureKey,
  type PlanFeatures,
  type PlanLimits,
  type PlanTier,
} from '../schemas/plan.schema'

const TIERS = ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'] as const
const rank = (tier: PlanTier) => TIERS.indexOf(tier)

// Minimum tier that unlocks each boolean feature
// (features are monotonic: once unlocked on a tier,
// they stay unlocked on every higher tier.)
const FEATURE_MIN_TIER: Record<PlanFeatureKey, PlanTier> = {
  // Baseline - available on every plan
  projects: 'FREE',
  workItems: 'FREE',
  comments: 'FREE',
  cycles: 'FREE',
  modules: 'FREE',
  pages: 'FREE',
  layouts: 'FREE',
  progressOverview: 'FREE',
  powerK: 'FREE',
  importJira: 'FREE',
  importLinear: 'FREE',
  importAsana: 'FREE',
  importClickup: 'FREE',
  importCsv: 'FREE',
  // Pro and up
  publishViews: 'PRO',
  activeCycles: 'PRO',
  timelineDependencies: 'PRO',
  initiatives: 'PRO',
  updates: 'PRO',
  moduleOverview: 'PRO',
  projectOverview: 'PRO',
  projectVisibility: 'PRO',
  projectStates: 'PRO',
  milestones: 'PRO',
  cycleManualStartStop: 'PRO',
  workItemTypes: 'PRO',
  workItemTemplates: 'PRO',
  cycleProgressCharts: 'PRO',
  advancedPagesAnalytics: 'PRO',
  advancedExports: 'PRO',
  wiki: 'PRO',
  realtimeCollab: 'PRO',
  workItemEmbeds: 'PRO',
  linkToWorkItem: 'PRO',
  pagePublish: 'PRO',
  pageTemplates: 'PRO',
  enhancedSearch: 'PRO',
  wikiCollecions: 'PRO',
  intakeInApp: 'PRO',
  sla: 'PRO',
  importMembersCsv: 'PRO',
  github: 'PRO',
  githubEnterprise: 'PRO',
  gitlab: 'PRO',
  gitlabEnterprise: 'PRO',
  slack: 'PRO',
  sentry: 'PRO',
  drawio: 'PRO',
  // Business and up
  autoTransferCycleItems: 'BUSINESS',
  recurringWorkItems: 'BUSINESS',
  autoScheduleCycles: 'BUSINESS',
  projectTemplates: 'BUSINESS',
  triggerAndAction: 'BUSINESS',
  nestedPages: 'BUSINESS',
  sharedPages: 'BUSINESS',
  pageComments: 'BUSINESS',
  intakeForms: 'BUSINESS',
  intakeEmail: 'BUSINESS',
  intakeResponsibility: 'BUSINESS',
  customers: 'BUSINESS',
  saml: 'BUSINESS',
  oidc: 'BUSINESS',
  importConfluence: 'BUSINESS',
  importNotion: 'BUSINESS',
  // Enterprise only
  customSlas: 'ENTERPRISE',
  ldap: 'ENTERPRISE',
  groupSync: 'ENTERPRISE',
  managedDeployment: 'ENTERPRISE',
  apiAuditLogs: 'ENTERPRISE',
}

const LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    seats: 12,
    aiCreditsPerSeat: 500,
    guestsPerSeat: 0,
    pageVersions: 0,
    pageVersionDays: 0,
  },
  PRO: {
    seats: null,
    aiCreditsPerSeat: 1000,
    guestsPerSeat: 5,
    pageVersions: 20,
    pageVersionDays: 30,
  },
  BUSINESS: {
    seats: 12,
    aiCreditsPerSeat: 2000,
    guestsPerSeat: 5,
    pageVersions: 60,
    pageVersionDays: 90,
  },
  ENTERPRISE: {
    seats: null,
    aiCreditsPerSeat: null,
    guestsPerSeat: null,
    pageVersions: null,
    pageVersionDays: null,
  },
}

const CAPABILITIES: Record<PlanTier, PlanCapabilities> = {
  FREE: {
    estimates: 'basic',
    views: 'basic',
    bulkOps: 'none',
    usageDashboard: 'available',
    adminControls: 'none',
    customProperties: 'none',
    teamspaces: 'none',
    dashboards: 'none',
    timeTracking: 'none',
    workflows: 'none',
    pageExports: 'none',
    roles: 'basic',
    guests: 'limited',
    supportChannels: 'basic',
  },
  PRO: {
    estimates: 'advanced',
    views: 'public_private',
    bulkOps: 'all_props',
    usageDashboard: 'available',
    adminControls: 'basic',
    customProperties: 'project',
    teamspaces: 'basic',
    dashboards: 'basic',
    timeTracking: 'worklogs',
    workflows: 'none',
    pageExports: 'basic',
    roles: 'rbac',
    guests: 'per_seat',
    supportChannels: 'basic',
  },
  BUSINESS: {
    estimates: 'advanced',
    views: 'public_private',
    bulkOps: 'all_props_transfers',
    usageDashboard: 'available',
    adminControls: 'advanced',
    customProperties: 'project',
    teamspaces: 'advanced',
    dashboards: 'advanced',
    timeTracking: 'worklogs_approvals',
    workflows: 'single',
    pageExports: 'queued',
    roles: 'rbac',
    guests: 'per_seat',
    supportChannels: 'migration_implementation',
  },
  ENTERPRISE: {
    estimates: 'advanced',
    views: 'public_private',
    bulkOps: 'all_props_transfers',
    usageDashboard: 'available',
    adminControls: 'advanced',
    customProperties: 'workspace',
    teamspaces: 'advanced',
    dashboards: 'advanced',
    timeTracking: 'worklogs_approvals',
    workflows: 'multiple_approvals',
    pageExports: 'queued',
    roles: 'gac',
    guests: 'custom',
    supportChannels: 'migration_implementation',
  },
}

function featuresFor(tier: PlanTier): PlanFeatures {
  const entries = Object.entries(FEATURE_MIN_TIER) as [
    PlanFeatureKey,
    PlanTier,
  ][]
  return Object.fromEntries(
    entries.map(([key, min]) => [key, rank(tier) >= rank(min)]),
  ) as PlanFeatures
}

// Validated at module load - a missing/missplled key throws immediately
export const PLAN_CATALOG = PlanCatalogSchema.parse(
  Object.fromEntries(
    TIERS.map((tier) => [
      tier,
      {
        limits: LIMITS[tier],
        features: featuresFor(tier),
        capabilities: CAPABILITIES[tier],
      },
    ]),
  ),
)
