import z from 'zod'

// Plan tiers - mirrors the Prisma 'Plan' enum (FREE/PRO/BUSINESS/ENTERPRISE).
export const PlanSchema = z.enum(['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'])
export type PlanTier = z.infer<typeof PlanSchema>

// Numeric caps. 'null' means unlimited.
export const PlanLimitsSchema = z.object({
  seats: z.number().int().positive().nullable(),
  aiCreditsPerSeat: z.number().int().nonnegative().nullable(),
  guestsPerSeat: z.number().int().nonnegative().nullable(),
  pageVersions: z.number().int().nonnegative().nullable(),
  pageVersionDays: z.number().int().nonnegative().nullable(),
})
export type PlanLimits = z.infer<typeof PlanLimitsSchema>
export type PlanLimitKey = keyof PlanLimits

// Graded (non-boolean) capabilities - each has per-plan levels.
export const PlanCapabilitiesSchema = z.object({
  estimates: z.enum(['basic', 'advanced']),
  views: z.enum(['basic', 'public_private']),
  bulkOps: z.enum(['none', 'all_props', 'all_props_transfers']),
  usageDashboard: z.enum(['available', 'advanced']),
  adminControls: z.enum(['none', 'basic', 'advanced']),
  customProperties: z.enum(['none', 'project', 'workspace']),
  teamspaces: z.enum(['none', 'basic', 'advanced']),
  dashboards: z.enum(['none', 'basic', 'advanced']),
  timeTracking: z.enum(['none', 'worklogs', 'worklogs_approvals']),
  workflows: z.enum(['none', 'single', 'multiple_approvals']),
  pageExports: z.enum(['none', 'basic', 'queued']),
  roles: z.enum(['basic', 'rbac', 'gac']),
  guests: z.enum(['limited', 'per_seat', 'custom']),
  supportChannels: z.enum(['basic', 'migration_implementation']),
})
export type PlanCapabilities = z.infer<typeof PlanCapabilitiesSchema>
export type PlanCapabilityKey = keyof PlanCapabilities

// Boolean feature flags - 'can(plan, key) reads these.'
export const PlanFeaturesSchema = z.object({
  // Core project management - baseline
  projects: z.boolean(),
  workItems: z.boolean(),
  comments: z.boolean(),
  cycles: z.boolean(),
  modules: z.boolean(),
  pages: z.boolean(),
  layouts: z.boolean(),
  progressOverview: z.boolean(),
  powerK: z.boolean(),
  // Core project management
  publishViews: z.boolean(),
  activeCycles: z.boolean(),
  timelineDependencies: z.boolean(),
  autoTransferCycleItems: z.boolean(),
  initiatives: z.boolean(),
  updates: z.boolean(),
  moduleOverview: z.boolean(),
  projectOverview: z.boolean(),
  projectVisibility: z.boolean(),
  projectStates: z.boolean(),
  recurringWorkItems: z.boolean(),
  milestones: z.boolean(),
  cycleManualStartStop: z.boolean(),
  autoScheduleCycles: z.boolean(),
  // Advanced project management
  workItemTypes: z.boolean(),
  workItemTemplates: z.boolean(),
  projectTemplates: z.boolean(),
  customSlas: z.boolean(),
  cycleProgressCharts: z.boolean(),
  // Workflows & automation
  triggerAndAction: z.boolean(),
  advancedPagesAnalytics: z.boolean(),
  advancedExports: z.boolean(),
  //Knowledge management
  wiki: z.boolean(),
  realtimeCollab: z.boolean(),
  workItemEmbeds: z.boolean(),
  linkToWorkItem: z.boolean(),
  pagePublish: z.boolean(),
  pageTemplates: z.boolean(),
  enhancedSearch: z.boolean(),
  nestedPages: z.boolean(),
  sharedPages: z.boolean(),
  pageComments: z.boolean(),
  wikiCollecions: z.boolean(),
  // Intake & customers
  intakeInApp: z.boolean(),
  intakeForms: z.boolean(),
  intakeEmail: z.boolean(),
  intakeResponsibility: z.boolean(),
  customers: z.boolean(),
  // Security, access & support
  saml: z.boolean(),
  oidc: z.boolean(),
  ldap: z.boolean(),
  groupSync: z.boolean(),
  sla: z.boolean(),
  // Importers
  importJira: z.boolean(),
  importLinear: z.boolean(),
  importAsana: z.boolean(),
  importClickup: z.boolean(),
  importCsv: z.boolean(),
  importMembersCsv: z.boolean(),
  importConfluence: z.boolean(),
  importNotion: z.boolean(),
  // Integrations
  github: z.boolean(),
  githubEnterprise: z.boolean(),
  gitlab: z.boolean(),
  gitlabEnterprise: z.boolean(),
  slack: z.boolean(),
  sentry: z.boolean(),
  drawio: z.boolean(),
  // Enterprise deployment & compliance
  managedDeployment: z.boolean(),
  apiAuditLogs: z.boolean(),
})
export type PlanFeatures = z.infer<typeof PlanFeaturesSchema>
export type PlanFeatureKey = keyof PlanFeatures

// Full entitlements for a single plan.
export const PlanEntitlementsSchema = z.object({
  limits: PlanLimitsSchema,
  features: PlanFeaturesSchema,
  capabilities: PlanCapabilitiesSchema,
})
export type PlanEntitlements = z.infer<typeof PlanEntitlementsSchema>

// Catalog: every tier must define a complete entitlements object
// Zod v4 'record' with an enum key enforces all 4 tiers are present.
export const PlanCatalogSchema = z.record(PlanSchema, PlanEntitlementsSchema)
export type PlanCatalog = z.infer<typeof PlanCatalogSchema>
