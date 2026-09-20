import { randomInt } from 'node:crypto'
import type { APIRequestContext, Page } from '@playwright/test'
import { test as base, expect, request } from '@playwright/test'
import { dropAccount, finishOnboarding, markEmailVerified } from './db'

export { expect }

export const TEST_PASSWORD = 'Test@12345678'

/**
 * The auth limiter buckets by `${ip}:${pathname}` (10 attempts / 15 min, then
 * a 30 min block). A fixed client IP would make the second run of the suite
 * fail on a block left behind by the first, so every context that touches an
 * auth route gets its own synthetic IP — the same trick the vitest e2e
 * helpers use.
 */
export function uniqueClientIp(): string {
  const octet = () => randomInt(10, 250)
  return `${octet()}.${octet()}.${octet()}.${octet()}`
}

/** Unique-per-run suffix, so nothing collides with data a previous run left. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${randomInt(1000, 9999)}`
}

export interface Account {
  id: string
  name: string
  email: string
  password: string
  workspaceId: string
  workspaceSlug: string
  storageState: StorageState
}

type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>

async function createOnboardedAccount(
  baseURL: string,
  label: string,
): Promise<Account> {
  const suffix = `${label}-${uniqueSuffix()}`
  const email = `pw-${suffix}@example.com`
  const name = `PW ${suffix}`
  const now = new Date().toISOString()

  const ctx = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Origin: baseURL,
      'x-forwarded-for': uniqueClientIp(),
    },
  })

  const signUp = await ctx.post('/api/auth/sign-up/email', {
    data: {
      name,
      email,
      password: TEST_PASSWORD,
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
    },
  })
  if (!signUp.ok()) {
    throw new Error(
      `sign-up failed (${signUp.status()}): ${await signUp.text()}`,
    )
  }

  // requireEmailVerification is on and the OTP mail is a dry run in tests, so
  // the account is verified straight in the database. The full sign-up → OTP
  // journey is covered through the UI in specs/sign-up-onboarding.spec.ts.
  const id = await markEmailVerified(email)
  await finishOnboarding(id)

  const signIn = await ctx.post('/api/auth/sign-in/email', {
    data: { email, password: TEST_PASSWORD },
  })
  if (!signIn.ok()) {
    throw new Error(
      `sign-in failed (${signIn.status()}): ${await signIn.text()}`,
    )
  }

  const workspaceSlug = `ws-${suffix}`
  const workspace = await ctx.post('/api/workspaces', {
    data: { name: `WS ${suffix}`, slug: workspaceSlug },
  })
  if (!workspace.ok()) {
    throw new Error(
      `workspace create failed (${workspace.status()}): ${await workspace.text()}`,
    )
  }
  const workspaceId = (await workspace.json()).data.id as string

  const storageState = await ctx.storageState()
  await ctx.dispose()

  // Decide the cookie banner up front: undecided means a fixed panel sits over
  // the bottom of every page and swallows clicks there.
  storageState.cookies.push({
    name: 'nx_cookie_consent',
    value: 'rejected',
    domain: new URL(baseURL).hostname,
    path: '/',
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  })

  return {
    id,
    name,
    email,
    password: TEST_PASSWORD,
    workspaceId,
    workspaceSlug,
    storageState,
  }
}

interface WorkerFixtures {
  account: Account
}

interface TestFixtures {
  /** Signed-in HTTP client, for arranging data the spec does not exercise. */
  api: APIRequestContext
}

/**
 * Signed-in test. One account (user + workspace) per worker, not per spec:
 * a sign-up is paid once per worker, and the per-user API rate limit
 * (100 req/min) is never shared between parallel specs.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  account: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires the destructuring pattern to resolve fixture dependencies.
    async ({}, use, workerInfo) => {
      const account = await createOnboardedAccount(
        workerInfo.project.use.baseURL ?? 'http://localhost:3000',
        `w${workerInfo.workerIndex}`,
      )
      await use(account)
      await dropAccount(account.id, account.workspaceId)
    },
    { scope: 'worker' },
  ],

  storageState: async ({ account }, use) => {
    await use(account.storageState)
  },

  api: async ({ playwright, baseURL, account }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL,
      storageState: account.storageState,
      extraHTTPHeaders: { Origin: baseURL ?? '' },
    })
    await use(ctx)
    await ctx.dispose()
  },
})

/** Signed-out test, with its own client IP so auth limits stay per-spec. */
export const anonTest = base.extend<{ clientIp: string }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires the destructuring pattern to resolve fixture dependencies.
  clientIp: async ({}, use) => {
    await use(uniqueClientIp())
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires the destructuring pattern to resolve fixture dependencies.
  storageState: async ({}, use) => {
    await use({ cookies: [], origins: [] })
  },
  extraHTTPHeaders: async ({ clientIp }, use) => {
    await use({ 'x-forwarded-for': clientIp })
  },
})

/**
 * Signed-out browser, but the worker account still exists — for the specs that
 * need real credentials to sign in with.
 */
export const signedOutTest = test.extend({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires the destructuring pattern to resolve fixture dependencies.
  storageState: async ({}, use) => {
    await use({ cookies: [], origins: [] })
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright requires the destructuring pattern to resolve fixture dependencies.
  extraHTTPHeaders: async ({}, use) => {
    await use({ 'x-forwarded-for': uniqueClientIp() })
  },
})

/** The avatar button that opens the profile menu is named after the initial. */
export function profileMenuTrigger(page: Page, account: Account) {
  return page.getByRole('button', {
    name: account.name.charAt(0).toUpperCase(),
    exact: true,
  })
}
