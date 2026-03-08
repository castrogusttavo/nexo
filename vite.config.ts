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
          ],
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
          include: ['src/repositories/**/__tests__/*.test.ts'],
          setupFiles: [
            './src/__tests__/setup.ts',
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
            './src/__tests__/setup.e2e.ts',
          ],
          testTimeout: 30000,
          pool: 'forks',
          maxWorkers: 1,
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
        'src/lib/result.ts',
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
    },
  },
})
