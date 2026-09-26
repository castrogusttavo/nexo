import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The bug these cover shipped for months and no test could see it, because
// `NODE_ENV === 'test'` skips the Zod parse entirely — the one condition under
// which the whole failure mode disappears. So these cases stub NODE_ENV to
// 'production' and re-import the module, which is the only way to assert what
// production actually does.
//
// What production did: `/careers`, a public page with no login, imports
// CareerJobService for the job listing; that service imported the admin env
// for one authorization check; the env validated at module scope; and
// WORKBENCH_USER has never been set in production. Every real render threw a
// ZodError mid-stream — `failed to pipe response`, a truncated page, and an
// error that reads like a network fault. The prerendered shell hid it from
// every manual check.

const ADMIN_VARS = [
  'WORKBENCH_USER',
  'WORKBENCH_PASS',
  'PLATFORM_ADMIN_EMAILS',
] as const

async function importFresh() {
  vi.resetModules()
  return import('@/lib/env/_server-admin')
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('SKIP_ENV_VALIDATION', '')
  for (const name of ADMIN_VARS) vi.stubEnv(name, '')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('admin env validation', () => {
  it('does not validate on import, even with every variable missing', async () => {
    await expect(importFresh()).resolves.toBeDefined()
  })

  it('refuses loudly when something actually asks for an admin value', async () => {
    const { getPlatformAdminEmails } = await importFresh()

    expect(() => getPlatformAdminEmails()).toThrow()
  })

  // Each surface validates only what it reads. The first lazy version used one
  // schema for all three variables, so the queue workbench — which
  // authenticates with its own pair alone — 500ed in production over a
  // missing PLATFORM_ADMIN_EMAILS it never touches.
  it('serves the workbench without the admin e-mail list', async () => {
    vi.stubEnv('WORKBENCH_USER', 'nexo-ops')
    vi.stubEnv('WORKBENCH_PASS', 'a-long-enough-password')

    const { getWorkbenchUser, getWorkbenchPass } = await importFresh()

    expect(getWorkbenchUser()).toBe('nexo-ops')
    expect(getWorkbenchPass()).toBe('a-long-enough-password')
  })

  it('serves the admin list without the workbench credentials', async () => {
    vi.stubEnv('PLATFORM_ADMIN_EMAILS', 'gusttavo@nexopm.com')

    const { getPlatformAdminEmails } = await importFresh()

    expect(getPlatformAdminEmails()).toEqual(['gusttavo@nexopm.com'])
  })

  it('still refuses the workbench when its own credentials are missing', async () => {
    vi.stubEnv('PLATFORM_ADMIN_EMAILS', 'gusttavo@nexopm.com')

    const { getWorkbenchUser } = await importFresh()

    expect(() => getWorkbenchUser()).toThrow()
  })

  it('reads the variables when they are set, lowercased and trimmed', async () => {
    vi.stubEnv('PLATFORM_ADMIN_EMAILS', ' Admin@Nexopm.com , dev@nexopm.com')
    vi.stubEnv('WORKBENCH_USER', 'workbench')
    vi.stubEnv('WORKBENCH_PASS', 'a-long-enough-password')

    const { getPlatformAdminEmails, getWorkbenchUser } = await importFresh()

    expect(getPlatformAdminEmails()).toEqual([
      'admin@nexopm.com',
      'dev@nexopm.com',
    ])
    expect(getWorkbenchUser()).toBe('workbench')
  })

  it('parses once and reuses the result', async () => {
    vi.stubEnv('PLATFORM_ADMIN_EMAILS', 'admin@nexopm.com')
    vi.stubEnv('WORKBENCH_USER', 'workbench')
    vi.stubEnv('WORKBENCH_PASS', 'a-long-enough-password')

    const { getPlatformAdminEmails } = await importFresh()
    expect(getPlatformAdminEmails()).toEqual(['admin@nexopm.com'])

    // The environment changing afterwards must not be re-read: the memoised
    // value is what every later caller in the process sees.
    vi.stubEnv('PLATFORM_ADMIN_EMAILS', 'someone-else@nexopm.com')
    expect(getPlatformAdminEmails()).toEqual(['admin@nexopm.com'])
  })
})

// The regression itself: the public path must stay importable and callable
// without any admin variable in the environment.
describe('the public careers listing', () => {
  it('lists jobs with no admin variable set', async () => {
    vi.resetModules()
    vi.doMock('@/src/repositories/career-job.repository', () => ({
      CareerJobRepository: {
        listPublic: vi.fn().mockResolvedValue({ ok: true, value: [] }),
      },
    }))

    const { CareerJobService } = await import('@/src/services/career-job.service')
    const result = await CareerJobService.listPublic()

    expect(result.ok).toBe(true)
  })
})
