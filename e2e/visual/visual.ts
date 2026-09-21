import { readFileSync } from 'node:fs'
import type { APIRequestContext, Page } from '@playwright/test'
import { test as base, expect, request } from '@playwright/test'
import { createClient } from 'redis'
import { db, finishOnboarding, markEmailVerified } from '../fixtures/db'
import { uniqueClientIp } from '../fixtures/test'

export { expect }

// Visual regression fixtures. A behavioural spec asserts what the app *does*;
// these specs assert what it *looks like*, so everything the camera can see
// has to be pinned: the identity, the data, the clock, the motion and the
// rasteriser. The rasteriser is pinned outside the test runner, by the docker
// image e2e/visual/run-in-docker.sh boots (see that script).

/** 2026-03-12 14:30 in America/Sao_Paulo — the timezone the config sets. */
export const FROZEN_NOW = new Date('2026-03-12T17:30:00.000Z')

/** The date the members table renders in its "Entrou em" column. */
export const JOINED_AT = new Date('2026-01-08T12:00:00.000Z')

/** The date the project settings form renders as "Criado em". */
export const PROJECT_CREATED_AT = new Date('2026-01-09T12:00:00.000Z')

/**
 * One fixed identity for the whole suite. The e-mail and the name are printed
 * on screen (members table, account modal, avatar initials), so they cannot
 * carry the per-run suffix the behavioural fixtures use. That is also why the
 * project runs on a single worker: two workers would need two e-mails, and
 * the members table would render a different one on every run.
 */
export const IDENTITY = {
  name: 'Ana Souza',
  username: 'ana.souza',
  email: 'visual@example.com',
  password: 'Test@12345678',
  workspaceName: 'Acme',
  workspaceSlug: 'acme-visual',
} as const

export const DESKTOP = { width: 1440, height: 900 } as const
export const MOBILE = { width: 390, height: 844 } as const

export type VisualTheme = 'light' | 'dark'

interface Variant {
  id: string
  theme: VisualTheme
  viewport: { width: number; height: number }
  /** Desktop-only screens skip themselves with this. */
  isMobile: boolean
}

export const VARIANTS: Variant[] = [
  { id: 'desktop-light', theme: 'light', viewport: DESKTOP, isMobile: false },
  { id: 'desktop-dark', theme: 'dark', viewport: DESKTOP, isMobile: false },
  { id: 'mobile-light', theme: 'light', viewport: MOBILE, isMobile: true },
  { id: 'mobile-dark', theme: 'dark', viewport: MOBILE, isMobile: true },
]

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

/**
 * `animations: 'disabled'` on the screenshot call only finishes CSS animations
 * that are already running at capture time. It does nothing about a transition
 * that starts *because* of the capture, about the text caret, or about
 * smooth scrolling, so the freeze is also injected as a stylesheet at
 * document start — before the app paints anything.
 */
const FREEZE_CSS = `
*, *::before, *::after, *::view-transition-group(*) {
  animation-delay: -1ms !important;
  animation-duration: 1ms !important;
  animation-iteration-count: 1 !important;
  transition-delay: -1ms !important;
  transition-duration: 1ms !important;
  scroll-behavior: auto !important;
  caret-color: transparent !important;
}
`

const FREEZE_SCRIPT = `(() => {
  const inject = () => {
    if (document.getElementById('nx-visual-freeze')) return
    const root = document.head ?? document.documentElement
    if (!root) return
    const style = document.createElement('style')
    style.id = 'nx-visual-freeze'
    style.textContent = ${JSON.stringify(FREEZE_CSS)}
    root.appendChild(style)
  }
  inject()
  document.addEventListener('DOMContentLoaded', inject)
})()`

// ---------------------------------------------------------------------------
// Identity and data
// ---------------------------------------------------------------------------

export interface VisualAccount {
  id: string
  workspaceId: string
  storageState: Awaited<ReturnType<APIRequestContext['storageState']>>
}

/**
 * Drops whatever a crashed run left behind. The identity is fixed, so a
 * leftover user would make the next sign-up fail on the unique e-mail.
 */
async function resetIdentity(): Promise<void> {
  await db.workspace.deleteMany({ where: { slug: IDENTITY.workspaceSlug } })
  await db.user.deleteMany({ where: { email: IDENTITY.email } })
}

async function createVisualAccount(baseURL: string): Promise<VisualAccount> {
  await resetIdentity()

  const ctx = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Origin: baseURL,
      'x-forwarded-for': uniqueClientIp(),
    },
  })

  const now = new Date().toISOString()
  const signUp = await ctx.post('/api/auth/sign-up/email', {
    data: {
      name: IDENTITY.name,
      email: IDENTITY.email,
      password: IDENTITY.password,
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
    },
  })
  if (!signUp.ok()) {
    throw new Error(
      `sign-up failed (${signUp.status()}): ${await signUp.text()}`,
    )
  }

  const id = await markEmailVerified(IDENTITY.email)
  await finishOnboarding(id)
  // The username column of the members table renders whatever sign-up left
  // here, which is null for an e-mail account: pin it too.
  await db.user.update({
    where: { id },
    data: { username: IDENTITY.username },
  })

  const signIn = await ctx.post('/api/auth/sign-in/email', {
    data: { email: IDENTITY.email, password: IDENTITY.password },
  })
  if (!signIn.ok()) {
    throw new Error(
      `sign-in failed (${signIn.status()}): ${await signIn.text()}`,
    )
  }

  const workspace = await ctx.post('/api/workspaces', {
    data: { name: IDENTITY.workspaceName, slug: IDENTITY.workspaceSlug },
  })
  if (!workspace.ok()) {
    throw new Error(
      `workspace create failed (${workspace.status()}): ${await workspace.text()}`,
    )
  }
  const workspaceId = (await workspace.json()).data.id as string

  // "Entrou em" is a real date formatted in the browser. Pinning the row is
  // better than masking the cell: the column keeps being asserted.
  await db.membership.updateMany({
    where: { workspaceId },
    data: { createdAt: JOINED_AT },
  })

  const storageState = await ctx.storageState()
  await ctx.dispose()
  storageState.cookies.push(consentCookie(baseURL))

  return { id, workspaceId, storageState }
}

/**
 * Undecided cookie consent puts a fixed panel over the bottom of every page.
 * Deciding it up front keeps the screenshots about the screen underneath.
 */
function consentCookie(baseURL: string) {
  return {
    name: 'nx_cookie_consent',
    value: 'rejected',
    domain: new URL(baseURL).hostname,
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }
}

/**
 * The app resolves its theme from the `nexo.theme` cookie in a blocking script
 * in <head> (app/layout.tsx), then ThemeSync re-applies the value stored in
 * the database once the session query resolves. The suite drives both, plus
 * the OS preference the SYSTEM value falls back to — forcing the `dark` class
 * would paint a state the app can never actually be in.
 */
function themeCookie(baseURL: string, theme: VisualTheme) {
  return {
    name: 'nexo.theme',
    value: theme === 'dark' ? 'DARK' : 'LIGHT',
    domain: new URL(baseURL).hostname,
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }
}

export interface Showcase {
  workspaceSlug: string
  /** The project every issue screen is taken from. */
  projectSlug: string
}

const PROJECTS = [
  {
    name: 'Plataforma',
    slug: 'plataforma',
    description: 'Núcleo do produto, APIs públicas e infraestrutura.',
  },
  {
    name: 'Aplicativo móvel',
    slug: 'aplicativo-movel',
    description: 'Clientes iOS e Android e a camada de sincronização.',
  },
  {
    name: 'Design System',
    slug: 'design-system',
    description: 'Componentes, tokens e documentação compartilhados.',
  },
] as const

/** Fixed titles in a fixed order, so the rows never shuffle between runs. */
const ISSUES = [
  { title: 'Migrar o pipeline de importação', state: 'Backlog' },
  { title: 'Revisar a política de retenção de dados', state: 'Backlog' },
  { title: 'Desenhar o fluxo de convite por e-mail', state: 'Pendente' },
  { title: 'Reescrever o seletor de estimativas', state: 'Em progresso' },
  { title: 'Publicar a página de status', state: 'Concluído' },
] as const

async function seedShowcase(
  api: APIRequestContext,
  workspaceId: string,
): Promise<Showcase> {
  for (const [index, project] of PROJECTS.entries()) {
    const created = await api.post(`/api/workspaces/${workspaceId}/projects`, {
      data: project,
    })
    if (!created.ok()) {
      throw new Error(
        `project ${project.slug} failed (${created.status()}): ${await created.text()}`,
      )
    }
    // The general settings form prints "Criado em <date>": left at the real
    // clock, the baseline only matches on the day it was recorded. A minute
    // apart per project keeps any creation-ordered list in seed order.
    await db.project.update({
      where: { workspaceId_slug: { workspaceId, slug: project.slug } },
      data: {
        createdAt: new Date(PROJECT_CREATED_AT.getTime() + index * 60_000),
      },
    })
  }

  const projectSlug = PROJECTS[0].slug
  const statesResponse = await api.get(
    `/api/workspaces/${workspaceId}/projects/${projectSlug}/states`,
  )
  if (!statesResponse.ok()) {
    throw new Error(`states failed (${statesResponse.status()})`)
  }
  const states = (await statesResponse.json()).data as {
    id: string
    name: string
  }[]

  // Sequential on purpose: the list and the board order issues by creation,
  // so a Promise.all here would be a different picture every run.
  for (const issue of ISSUES) {
    const state = states.find((candidate) => candidate.name === issue.state)
    if (!state) throw new Error(`project has no "${issue.state}" state`)
    const created = await api.post(
      `/api/workspaces/${workspaceId}/projects/${projectSlug}/issues`,
      { data: { title: issue.title, description: [], stateId: state.id } },
    )
    if (!created.ok()) {
      throw new Error(
        `issue "${issue.title}" failed (${created.status()}): ${await created.text()}`,
      )
    }
  }

  return { workspaceSlug: IDENTITY.workspaceSlug, projectSlug }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface VisualOptions {
  theme: VisualTheme
}

/**
 * Shared by both the signed-in and the signed-out test: the theme option, the
 * OS preference derived from it, the frozen clock and the motion freeze.
 */
const visualBase = base.extend<VisualOptions>({
  theme: ['light', { option: true }],

  // Derived, not configured: a variant sets `theme` and the OS preference
  // follows, so a SYSTEM fallback can never disagree with the cookie.
  colorScheme: async ({ theme }, use) => {
    await use(theme)
  },

  page: async ({ page }, use) => {
    // Before the first navigation, so both apply to the very first document.
    await page.clock.setFixedTime(FROZEN_NOW)
    await page.addInitScript(FREEZE_SCRIPT)
    await use(page)
  },
})

/**
 * `workerIndex` is not the right number to check: Playwright hands a restarted
 * worker a fresh index, so a single failure would turn into "you used too many
 * workers". The configured count is what actually has to be one.
 */
function assertSingleWorker(configuredWorkers: number): void {
  if (configuredWorkers !== 1) {
    throw new Error(
      `The visual project must run with --workers=1 (got ${configuredWorkers}): ` +
        'the screenshots carry a single fixed identity (see IDENTITY in ' +
        'e2e/visual/visual.ts). Use e2e/visual/run-in-docker.sh, which passes it.',
    )
  }
}

/**
 * Signed-in visual test. The account and the showcase data are created once
 * per worker and reused by every variant, so the four pictures of a screen are
 * four pictures of the same rows.
 */
export const test = visualBase.extend<
  { api: APIRequestContext; themedPreference: undefined },
  { account: VisualAccount; showcase: Showcase }
>({
  account: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright resolves fixture dependencies from the destructuring pattern.
    async ({}, use, workerInfo) => {
      assertSingleWorker(workerInfo.config.workers)
      const baseURL = workerInfo.project.use.baseURL ?? 'http://localhost:3000'
      const account = await createVisualAccount(baseURL)
      await use(account)
      await resetIdentity()
    },
    { scope: 'worker', timeout: 120_000 },
  ],

  showcase: [
    async ({ account }, use, workerInfo) => {
      const baseURL = workerInfo.project.use.baseURL ?? 'http://localhost:3000'
      const ctx = await request.newContext({
        baseURL,
        storageState: account.storageState,
        extraHTTPHeaders: { Origin: baseURL },
      })
      const showcase = await seedShowcase(ctx, account.workspaceId)
      await ctx.dispose()
      await use(showcase)
    },
    { scope: 'worker', timeout: 120_000 },
  ],

  api: async ({ playwright, baseURL, account }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      storageState: account.storageState,
      extraHTTPHeaders: { Origin: baseURL ?? '' },
    })
    await use(ctx)
    await ctx.dispose()
  },

  storageState: async ({ account, baseURL, theme }, use) => {
    const state = structuredClone(account.storageState)
    state.cookies.push(themeCookie(baseURL ?? 'http://localhost:3000', theme))
    await use(state)
  },

  // Auto: ThemeSync overwrites the cookie's decision with the value stored in
  // the database as soon as the preferences query resolves, so the row has to
  // agree with the cookie or the page would repaint mid-screenshot.
  themedPreference: [
    async ({ api, account, theme }, use) => {
      await resetApiRateLimit(account.id)
      const response = await api.patch('/api/users/me/preferences', {
        data: { theme: theme === 'dark' ? 'DARK' : 'LIGHT' },
      })
      if (!response.ok()) {
        throw new Error(`preference patch failed (${response.status()})`)
      }
      await use(undefined)
      // Again on the way out: the test itself spent the budget, and the next
      // one starts with a page load, not with a fixture that could clear it.
      await resetApiRateLimit(account.id)
    },
    { auto: true },
  ],
})

/** Signed-out visual test, for the public screens. */
export const anonTest = visualBase.extend({
  storageState: async ({ baseURL, theme }, use) => {
    const url = baseURL ?? 'http://localhost:3000'
    await use({
      cookies: [consentCookie(url), themeCookie(url, theme)],
      origins: [],
    })
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright resolves fixture dependencies from the destructuring pattern.
  extraHTTPHeaders: async ({}, use) => {
    await use({ 'x-forwarded-for': uniqueClientIp() })
  },
})

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

/**
 * Everything that has to have happened before the shutter opens: web fonts
 * decoded (Geist is self-hosted through next/font, so a cold load reflows the
 * first paint), images settled, the page scrolled back to the top and two
 * frames rendered so React has flushed its last effect.
 */
export async function stabilise(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  // next/image below the fold is lazy, and a lazy image that never enters the
  // viewport never becomes `complete` — a full-page screenshot would then be
  // taken over a hole, or the wait below would hang. Sweeping the page once
  // asks every IntersectionObserver the question it is waiting for.
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight, 1)
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await frame()
    }
    window.scrollTo(0, 0)
  })
  // Only the images that are actually laid out matter. The marketing shell
  // around /status keeps a few behind `hidden md:block`, and a display:none
  // lazy image is never requested at all, so `complete` stays false forever —
  // waiting on those hung the mobile variants for the full timeout.
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (image) => image.complete || image.getClientRects().length === 0,
    ),
  )
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
}

/** The snapshot path of a screen, as `<area>/<screen>/<variant>.png`. */
export function shotName(
  area: string,
  screen: string,
  variantId: string,
): string[] {
  return [area, screen, `${variantId}.png`]
}

// ---------------------------------------------------------------------------
// Status page data
// ---------------------------------------------------------------------------

const STATUS_COMPONENTS = [
  'app',
  'database',
  'cache',
  'auth',
  'payment',
  'email',
  'storage',
]

const HISTORY_DAYS = 90
/** One degraded day, so the history bars are asserted in colour, not only grey. */
const DEGRADED_COMPONENT = 'email'
const DEGRADED_DAY_OFFSET = 30

function utcDay(offset: number): Date {
  const day = new Date()
  day.setUTCHours(0, 0, 0, 0)
  day.setUTCDate(day.getUTCDate() - offset)
  return day
}

/**
 * The status page reads whatever the probes last wrote, which is nothing in a
 * fresh database and something different on every developer machine. Seeding
 * the full 90-day window relative to today keeps the picture identical from
 * one day to the next: 90 bars, one of them degraded, one uptime figure.
 */
export async function seedStatus(): Promise<void> {
  await db.healthCheck.deleteMany({
    where: { componentKey: { in: STATUS_COMPONENTS } },
  })
  await db.componentDaily.deleteMany({
    where: { componentKey: { in: STATUS_COMPONENTS } },
  })

  const checkedAt = new Date()
  await db.healthCheck.createMany({
    data: STATUS_COMPONENTS.map((componentKey) => ({
      componentKey,
      status: 'OPERATIONAL' as const,
      latencyMs: 12,
      checkedAt,
    })),
  })

  const dailies = []
  for (const componentKey of STATUS_COMPONENTS) {
    for (let offset = HISTORY_DAYS - 1; offset >= 0; offset--) {
      const degraded =
        componentKey === DEGRADED_COMPONENT && offset === DEGRADED_DAY_OFFSET
      dailies.push({
        componentKey,
        day: utcDay(offset),
        worstStatus: degraded
          ? ('DEGRADED' as const)
          : ('OPERATIONAL' as const),
        totalChecks: 288,
        upChecks: degraded ? 281 : 288,
        uptimePct: degraded ? 97.5 : 100,
        avgLatencyMs: 12,
      })
    }
  }
  await db.componentDaily.createMany({ data: dailies })

  await invalidateStatusCache()
}

export async function clearStatus(): Promise<void> {
  await db.healthCheck.deleteMany({
    where: { componentKey: { in: STATUS_COMPONENTS } },
  })
  await db.componentDaily.deleteMany({
    where: { componentKey: { in: STATUS_COMPONENTS } },
  })
  await invalidateStatusCache()
}

/**
 * StatusService caches the snapshot in Redis for 30s, so the seeded rows would
 * only show up on the next minute otherwise. Same key as src/cache/status.cache.ts.
 */
async function invalidateStatusCache(): Promise<void> {
  await withRedis((client) => client.del('status:snapshot:v1'))
}

/**
 * Opens the same Redis the app uses (TLS and CA included, since the local
 * compose file serves rediss://) for the two keys this suite has to reach.
 */
async function withRedis(
  run: (client: ReturnType<typeof createClient>) => Promise<unknown>,
): Promise<void> {
  const url = process.env.REDIS_URL
  if (!url) return
  const ca =
    process.env.REDIS_TLS_ENABLED === 'true' && process.env.REDIS_TLS_CA_PATH
      ? readFileSync(process.env.REDIS_TLS_CA_PATH)
      : undefined
  const client = createClient({
    url,
    socket: ca ? { tls: true, ca } : undefined,
  })
  client.on('error', () => {})
  await client.connect()
  await run(client)
  await client.destroy()
}

/**
 * The API limiter allows 100 requests per minute *per user*, and the whole
 * suite shares one fixed identity, so around the fortieth screenshot the
 * member and project queries start coming back 429 — which the hooks render
 * as an empty table rather than as an error. That is a picture of the
 * limiter, not of the screen. Emptying the user's bucket between tests keeps
 * every screenshot a first request, and touches no app code: the key is the
 * one `consume(apiLimiter, \`user:${id}\`)` writes.
 */
export async function resetApiRateLimit(userId: string): Promise<void> {
  await withRedis((client) => client.del(`rl:api:user:${userId}`))
}
