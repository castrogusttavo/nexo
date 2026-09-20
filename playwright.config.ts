import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

// Browser end-to-end tests. Separate layer from the vitest `e2e` project
// (`app/**/__tests__/*.e2e.test.ts`), which drives the HTTP API directly:
// these specs drive the real UI in Chromium and assert what a user sees.
// They live in `e2e/` so the vitest globs never pick them up.

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`
const IS_CI = !!process.env.CI

// The suite boots the *deployed* artifact, not `next start`: next.config.ts
// sets `output: 'standalone'`, which `next start` refuses to serve ("does not
// work with output: standalone"), and production runs `node server.js` out of
// .next/standalone the way the Dockerfile assembles it. Serving the real
// artifact is what surfaced the CSP bug that left production unable to
// hydrate. Set PLAYWRIGHT_SKIP_BUILD=true to reuse an already-built .next
// while iterating locally.
const START =
  'rm -rf .next/standalone/.next/static .next/standalone/public' +
  ' && cp -r .next/static .next/standalone/.next/' +
  ' && cp -r public .next/standalone/' +
  ' && node .next/standalone/server.js'
const COMMAND =
  process.env.PLAYWRIGHT_SKIP_BUILD === 'true'
    ? START
    : `pnpm build && ${START}`

export default defineConfig({
  testDir: './e2e',
  // Specs create their own data with unique names, so they are safe in
  // parallel. Each worker gets its own account (see e2e/fixtures/test.ts).
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 1 : 0,
  workers: IS_CI ? 2 : undefined,
  reporter: IS_CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 90_000,
  globalTimeout: 20 * 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    // No bypassCSP: the suite runs under the CSP production actually sends,
    // so a directive that breaks hydration fails here instead of in the
    // browser of whoever opens the site. See e2e/specs/csp.spec.ts.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  },

  projects: [
    {
      name: 'chromium',
      testDir: './e2e/specs',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    // A visual-regression project slots in here without restructuring:
    // its own testDir (e2e/visual), the same `use` block plus
    // `snapshotPathTemplate`, and `ignoreSnapshots: !IS_CI` if the
    // screenshots are only baselined on the runner.
  ],

  webServer: {
    command: COMMAND,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !IS_CI,
    // `pnpm build` is part of the command, so the first boot is slow.
    timeout: 10 * 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      // Same two switches CI sets for the vitest e2e job: `next start` runs in
      // production mode, where better-auth's own limiter would 429 the suite's
      // repeated sign-ups (the app keeps its own Redis limiter), and no test
      // user should ever cost a real Resend delivery.
      DISABLE_AUTH_RATE_LIMIT: 'true',
      MAIL_DRY_RUN: 'true',
      PORT: String(PORT),
      // The local .env pins NODE_ENV=development and `dotenv/config` above
      // puts it in this process, which the web server would inherit —
      // `next build` then builds a development bundle and dies while
      // prerendering (`Cannot read properties of null (reading 'useContext')`
      // on /_global-error). CI has no NODE_ENV at all, so pin the value the
      // build expects.
      NODE_ENV: 'production',
    },
  },
})
