import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path, { join } from 'node:path'
import { defineConfig } from 'vitest/config'

// Backend (unit + integration) and frontend (component) coverage are measured
// separately — `pnpm test:coverage` vs `pnpm test:coverage:component` — and
// uploaded to Codecov under their own flags. Merging the ~500 client files
// into the backend include would sink its 95%+ to a number that means nothing.
const BACKEND_COVERAGE = [
  'src/services/**',
  'src/mappers/**',
  'src/schemas/**',
  'src/errors/**',
  'src/repositories/**',
  'src/cache/**',
  'src/lib/auth-session.ts',
  'src/lib/rate-limit.ts',
  'src/lib/rate-limit-helpers.ts',
  'src/lib/result.ts',
  'utils/**',
  'lib/abacatepay.ts',
  'app/api/**/route.ts',
]

// Client code with real logic: every file that ships to the browser
// ('use client') plus the hooks and pure client modules. Server Components
// are left out on purpose — Testing Library cannot render them, so counting
// them would peg the metric below 100 no matter how many tests exist (the
// e2e suite does exercise them, but v8 cannot instrument `next start`).
function clientSourceFiles(): string[] {
  const roots = ['app', 'components/hooks', 'components/filters', 'components/layouts']
  const files: string[] = []
  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue
      const path = join(entry.parentPath, entry.name)
      if (!/\.tsx?$/.test(path) || path.includes('__tests__')) continue
      // Marketing pages live under app/(web): Lighthouse and the e2e smoke
      // cover them, and component tests there buy little.
      if (path.startsWith('app/(web)') || path.startsWith('app/api')) continue
      // Inside app/, only files that ship to the browser count: the .ts
      // files there are server-side (route handlers, robots/sitemap/manifest,
      // feeds), which Testing Library cannot render. Outside app/ the roots
      // are hooks and pure client modules, so .ts files are in scope.
      const isClient = /^['"]use client['"]/.test(readFileSync(path, 'utf8'))
      if (path.startsWith('app/') ? isClient : true) files.push(path)
    }
  }
  return files
}

const FRONTEND_COVERAGE = ['src/hooks/**', ...clientSourceFiles()]

const isFrontendCoverage = process.env.COVERAGE_SCOPE === 'frontend'

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          globals: true,
          include: [
            'src/services/**/__tests__/*.test.ts',
            'src/mappers/**/__tests__/*.test.ts',
            'src/schemas/**/__tests__/*.test.ts',
            'src/errors/**/__tests__/*.test.ts',
            'src/lib/__tests__/*.test.ts',
            'utils/__tests__/*.test.ts',
            'lib/__tests__/*.test.ts',
          ],
          exclude: ['**/*.integration.test.ts', '**/*.smoke.test.ts'],
          setupFiles: [
            './src/__tests__/setup.ts',
            './src/__tests__/setup.unit.ts',
          ],
          testTimeout: 5000,
        },
      },
      {
        extends: true,
        test: {
          // Static checks of public/openapi.json against the code that
          // implements it. Pure filesystem + JSON work: no DB, no Redis, no
          // server — it stays fast enough to run on every push.
          name: 'contract',
          environment: 'node',
          globals: true,
          include: ['src/__tests__/contract/*.contract.test.ts'],
          setupFiles: ['./src/__tests__/setup.ts'],
          testTimeout: 10000,
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          environment: 'node',
          globals: true,
          include: [
            'src/repositories/**/__tests__/*.test.ts',
            'src/cache/**/__tests__/*.test.ts',
            'src/lib/**/__tests__/*.integration.test.ts',
          ],
          setupFiles: [
            './src/__tests__/setup.ts',
            './src/__tests__/setup.redis.ts',
            './src/__tests__/setup.integration.ts',
          ],
          testTimeout: 15000,
          pool: 'forks',
          maxWorkers: 1,
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          environment: 'node',
          globals: true,
          include: ['app/**/__tests__/*.e2e.test.ts'],
          setupFiles: [
            './src/__tests__/setup.ts',
            './src/__tests__/setup.redis.ts',
            './src/__tests__/setup.e2e.ts',
          ],
          testTimeout: 30000,
          pool: 'forks',
          maxWorkers: 1,
        },
      },
      {
        extends: true,
        test: {
          name: 'component',
          environment: 'jsdom',
          globals: true,
          include: [
            'app/**/__tests__/*.component.test.tsx',
            'components/**/__tests__/*.component.test.tsx',
            'src/hooks/**/__tests__/*.component.test.tsx',
          ],
          setupFiles: [
            './src/__tests__/setup.ts',
            './src/__tests__/setup.component.ts',
          ],
          testTimeout: 5000,
        },
      },
      {
        extends: true,
        test: {
          name: 'redis-tls',
          environment: 'node',
          globals: true,
          include: ['src/lib/__tests__/*.smoke.test.ts'],
          setupFiles: ['./src/__tests__/setup.ts'],
          testTimeout: 15000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: isFrontendCoverage ? FRONTEND_COVERAGE : BACKEND_COVERAGE,
      reportsDirectory: isFrontendCoverage
        ? './coverage/frontend'
        : './coverage',
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'src/generated/**',
        // Pure re-export barrel, no logic to cover; v8 also misreports it as
        // 0% when coverage is merged across the unit + integration projects.
        'src/errors/index.ts',
        '**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './src/__tests__/server-only.mock.ts'),
    },
  },
})
