import path from 'node:path'
import { defineConfig } from 'vitest/config'

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
          include: ['app/**/__tests__/*.component.test.tsx'],
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
      include: [
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
      ],
      exclude: [
        'node_modules/**',
        'src/__tests__/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'src/generated/**',
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
