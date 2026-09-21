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

// The wiki's rich editor only mounts its body once Yjs has synced with the
// realtime server (Hocuspocus, realtime/index.ts), so the suite boots that too.
// Same reasoning as above: it runs the bundle production runs
// (`node dist/realtime.cjs`, see the Dockerfile and docker-compose.yml's
// nexo-realtime). esbuild takes a couple of seconds, so it is rebuilt on every
// run even with PLAYWRIGHT_SKIP_BUILD — a stale bundle would test old code.
// The browser connects to NEXT_PUBLIC_REALTIME_URL, which is inlined into the
// client bundle at build time, so the server listens on that URL's port.
const REALTIME_URL = new URL(
  process.env.NEXT_PUBLIC_REALTIME_URL ?? 'ws://localhost:1234',
)
const REALTIME_PORT = REALTIME_URL.port || '1234'
// The visual project runs inside the Playwright image, which has no pnpm and
// photographs no wiki page; e2e/visual/run-in-docker.sh turns this off.
const WITH_REALTIME = process.env.PLAYWRIGHT_REALTIME !== 'false'

// Same two switches CI sets for the vitest e2e job: `next start` runs in
// production mode, where better-auth's own limiter would 429 the suite's
// repeated sign-ups (the app keeps its own Redis limiter), and no test user
// should ever cost a real Resend delivery.
//
// The local .env pins NODE_ENV=development and `dotenv/config` above puts it
// in this process, which the servers would inherit — `next build` then builds
// a development bundle and dies while prerendering (`Cannot read properties
// of null (reading 'useContext')` on /_global-error). CI has no NODE_ENV at
// all, so pin the value the build expects.
const SERVER_ENV = {
  DISABLE_AUTH_RATE_LIMIT: 'true',
  MAIL_DRY_RUN: 'true',
  NODE_ENV: 'production',
}

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
    // Visual regression. Same server, same fixtures shape, different question:
    // the chromium project asserts behaviour, this one asserts the picture.
    //
    // It is meant to be run through e2e/visual/run-in-docker.sh, which boots
    // the official Playwright image so the baselines are rasterised by the
    // same fonts and the same compositor here and on the runner. Nothing in
    // the path template encodes the platform, on purpose: a run outside that
    // image must fail loudly on a diff instead of quietly writing a second
    // tree of baselines nobody reviews.
    {
      name: 'visual',
      testDir: './e2e/visual',
      // One worker, one fixed identity (the e-mail and the name are printed
      // on screen), and the specs write shared rows for /status.
      fullyParallel: false,
      // No retries: a screenshot that only matches on the second attempt is
      // the exact flake this suite exists to not have.
      retries: 0,
      snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
      use: {
        ...devices['Desktop Chrome'],
        // The variants override the viewport; this is only the fallback.
        viewport: { width: 1440, height: 900 },
        // Driven as a real preference, not as a CSS override: the `motion`
        // components and the app's own transitions honour it.
        reducedMotion: 'reduce',
        launchOptions: {
          // Pinning the image pins the fonts and the Chromium build, but not
          // the CPU: Skia picks SIMD paths at runtime, so the same page
          // rasterises a shade differently on a machine with other
          // instruction sets. That cost one pixel of a blue heading between
          // this laptop and the CI runner. These flags take the decision away
          // from the hardware instead of buying silence with a tolerance.
          args: [
            '--disable-skia-runtime-opts',
            '--disable-lcd-text',
            '--disable-font-subpixel-positioning',
            '--font-render-hinting=none',
            '--force-color-profile=srgb',
            '--disable-partial-raster',
            '--disable-gpu',
          ],
        },
      },
      expect: {
        // A project-level `expect` replaces the top-level one rather than
        // merging into it, so the 10s from above has to be repeated here —
        // the client-side queries behind the members table need more than
        // the 5s default on a cold context.
        timeout: 15_000,
        toHaveScreenshot: {
          // Strict on purpose. A blanket 1% tolerance hides a whole row of
          // shifted text. Nothing has needed to relax it yet; if something
          // ever does, relax it on that single call with a comment naming
          // the element.
          //
          // Not one pixel may differ, and a pixel counts as different as soon
          // as it moves ~2% in colour. Inside the pinned image the pictures
          // come out byte-identical, so the tolerance is only insurance
          // against the runner's software rasteriser landing a level or two
          // away; it is still tight enough to fail on a #fff -> #f5f5f4 token
          // slip, which the default 0.2 lets through unnoticed.
          maxDiffPixelRatio: 0,
          threshold: 0.02,
          animations: 'disabled',
          caret: 'hide',
          // CSS pixels, so a device-scale change never rewrites every file.
          scale: 'css',
        },
      },
    },
  ],

  webServer: [
    {
      command: COMMAND,
      url: `${BASE_URL}/api/health`,
      reuseExistingServer: !IS_CI,
      // `pnpm build` is part of the command, so the first boot is slow.
      timeout: 10 * 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: { ...SERVER_ENV, PORT: String(PORT) },
    },
    ...(WITH_REALTIME
      ? [
          {
            command: 'pnpm realtime:build && node dist/realtime.cjs',
            // Hocuspocus answers plain HTTP on its WebSocket port, so a GET
            // is a real readiness check: it only answers once listen() ran.
            url: `http://${REALTIME_URL.hostname}:${REALTIME_PORT}`,
            reuseExistingServer: !IS_CI,
            timeout: 2 * 60_000,
            stdout: 'ignore' as const,
            stderr: 'pipe' as const,
            env: { ...SERVER_ENV, REALTIME_PORT },
          },
        ]
      : []),
  ],
})
