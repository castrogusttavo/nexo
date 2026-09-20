import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Dedicated config for Stryker (`stryker.config.mjs`). The Stryker vitest
// runner has no `--project` switch: it boots vitest with a config file and
// runs every project it finds. Pointing it at the root `vite.config.ts` would
// therefore drag in `integration`, `e2e`, `component` and `redis-tls` — the
// first three need a live Postgres/Redis or a running `next start`, which
// would make every one of the thousands of mutant runs slow and flaky.
//
// So this file flattens the `unit` project from `vite.config.ts` into a
// single-project config. Keep the two in sync: if the unit project's
// `include`, `setupFiles` or `alias` change there, mirror them here.
//
// The name is deliberately NOT `vitest.config.ts`: that would shadow
// `vite.config.ts` for every plain `pnpm vitest` invocation.
export default defineConfig({
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
    setupFiles: ['./src/__tests__/setup.ts', './src/__tests__/setup.unit.ts'],
    // Higher than the 5s of the unit project: a mutant that pushes a loop or a
    // retry one step further is still a *survivor* to be reported, not a test
    // that should blow up on the test framework's own timeout.
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(
        __dirname,
        './src/__tests__/server-only.mock.ts',
      ),
    },
  },
})
