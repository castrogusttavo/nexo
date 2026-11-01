import { describe, expect, it } from 'vitest'
import {
  backendLayer,
  buildEvents,
  conclusionOf,
  formatSlack,
  jobResultsFromNeeds,
  layerFromFileName,
  parseCoverage,
  parsePlaywright,
  parseVitest,
  type RunContext,
  SLOW_TEST_MS,
  summarize,
  type TestRecord,
} from '@/scripts/test-report'

const ctx: RunContext = {
  runId: '42',
  runAttempt: 1,
  repository: 'org/nexo',
  branch: 'main',
  sha: '4d23bf01abcdef',
  actor: 'dev',
  event: 'push',
  commitMessage: 'feat: <x> & y',
  runStartedAt: '2026-11-01T12:00:00.000Z',
  serverUrl: 'https://github.com',
}

const record = (over: Partial<TestRecord>): TestRecord => ({
  layer: 'unit',
  file: 'a.test.ts',
  name: 'a test',
  status: 'passed',
  durationMs: 10,
  ...over,
})

describe('layerFromFileName', () => {
  it('maps the report file names the workflow writes', () => {
    expect(layerFromFileName('vitest-backend.json')).toBe('backend')
    expect(layerFromFileName('vitest-component-2.json')).toBe('component')
    expect(layerFromFileName('playwright-browser.json')).toBe('browser')
    expect(layerFromFileName('coverage-backend.json')).toBeNull()
    expect(layerFromFileName('vitest-unknown.json')).toBeNull()
  })
})

describe('backendLayer', () => {
  it('tells repository and cache tests from the mocked ones', () => {
    expect(backendLayer('src/repositories/__tests__/x.test.ts')).toBe('integration')
    expect(backendLayer('src/cache/__tests__/x.test.ts')).toBe('integration')
    expect(backendLayer('src/lib/foo.integration.test.ts')).toBe('integration')
    expect(backendLayer('src/services/__tests__/x.test.ts')).toBe('unit')
  })
})

describe('parseVitest', () => {
  const report = {
    testResults: [
      {
        name: '/repo/src/services/__tests__/a.test.ts',
        assertionResults: [
          { fullName: 'ok', status: 'passed', duration: 12.4, failureMessages: [] },
          {
            fullName: 'bad',
            status: 'failed',
            duration: 3,
            failureMessages: ['AssertionError: nope\n    at x'],
          },
          { fullName: 'later', status: 'todo', duration: 0, failureMessages: [] },
        ],
      },
    ],
  }

  it('maps status, rounds duration and keeps only the first error line', () => {
    const records = parseVitest(report, 'backend', '/repo')
    expect(records.map((r) => [r.name, r.status, r.durationMs])).toEqual([
      ['ok', 'passed', 12],
      ['bad', 'failed', 3],
      ['later', 'skipped', 0],
    ])
    expect(records[1].error).toBe('AssertionError: nope')
    expect(records[0].file).toBe('src/services/__tests__/a.test.ts')
    expect(records[0].layer).toBe('unit')
  })

  it('survives a malformed report', () => {
    expect(parseVitest(null, 'unit', '/repo')).toEqual([])
    expect(parseVitest({ testResults: [{}] }, 'unit', '/repo')).toEqual([])
  })
})

describe('parsePlaywright', () => {
  const report = {
    suites: [
      {
        title: 'auth.spec.ts',
        file: 'specs/auth.spec.ts',
        suites: [
          {
            title: 'sign in',
            specs: [
              {
                title: 'works',
                file: 'specs/auth.spec.ts',
                tests: [
                  { status: 'flaky', results: [{ duration: 100, error: { message: 'x' } }, { duration: 50 }] },
                ],
              },
              {
                title: 'breaks',
                file: 'specs/auth.spec.ts',
                tests: [
                  {
                    status: 'unexpected',
                    results: [{ duration: 200, error: { message: '\u001b[31mTimeout\u001b[39m\nmore' } }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }

  it('walks nested suites, sums retries and strips ANSI from the error', () => {
    const records = parsePlaywright(report, 'browser')
    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({ name: 'sign in works', status: 'flaky', durationMs: 150 })
    expect(records[1]).toMatchObject({
      status: 'failed',
      error: 'Timeout',
      file: 'e2e/specs/auth.spec.ts',
    })
  })
})

describe('summarize and conclusion', () => {
  it('counts per layer and overall', () => {
    const { layers, totals } = summarize([
      record({}),
      record({ status: 'failed' }),
      record({ layer: 'browser', status: 'flaky', durationMs: 5 }),
    ])
    expect(totals).toMatchObject({ total: 3, passed: 1, failed: 1, flaky: 1, durationMs: 25 })
    expect(layers.unit?.total).toBe(2)
    expect(layers.browser?.flaky).toBe(1)
  })

  it('is a failure when any job failed or was cancelled', () => {
    expect(conclusionOf({ a: 'success', b: 'skipped' })).toBe('success')
    expect(conclusionOf({ a: 'success', b: 'failure' })).toBe('failure')
    expect(conclusionOf({ a: 'cancelled' })).toBe('failure')
  })
})

describe('jobResultsFromNeeds', () => {
  it('reads the results out of toJSON(needs)', () => {
    expect(jobResultsFromNeeds('{"lint":{"result":"success","outputs":{}}}')).toEqual({
      lint: 'success',
    })
    expect(jobResultsFromNeeds('not json')).toEqual({})
    expect(jobResultsFromNeeds(undefined)).toEqual({})
  })
})

describe('parseCoverage', () => {
  it('reads the json-summary totals and rejects anything else', () => {
    expect(
      parseCoverage({
        total: {
          lines: { pct: 91.2 },
          statements: { pct: 90 },
          functions: { pct: 80 },
          branches: { pct: 70 },
        },
      }),
    ).toEqual({ lines: 91.2, statements: 90, functions: 80, branches: 70 })
    expect(parseCoverage({})).toBeNull()
  })
})

describe('buildEvents', () => {
  const now = new Date('2026-11-01T12:10:00.000Z')

  it('emits one run event plus only the notable tests', () => {
    const events = buildEvents(
      ctx,
      [
        record({ name: 'fast ok' }),
        record({ name: 'slow ok', durationMs: SLOW_TEST_MS }),
        record({ name: 'bad', status: 'failed', error: 'boom' }),
      ],
      { lint: 'success' },
      null,
      now,
    )
    expect(events.map((e) => e.kind)).toEqual(['run', 'test', 'test'])
    expect(events[0]).toMatchObject({
      conclusion: 'success',
      wallClockMs: 10 * 60_000,
      runId: '42',
    })
    expect(events[0]).not.toHaveProperty('coverage')
    expect(events[2]).toMatchObject({ name: 'bad', error: 'boom', status: 'failed' })
  })

  it('leaves the wall clock empty when the start is unknown', () => {
    const [run] = buildEvents({ ...ctx, runStartedAt: null }, [], {}, null, now)
    expect(run.wallClockMs).toBeNull()
  })
})

describe('formatSlack', () => {
  const text = (payload: Record<string, unknown>) =>
    JSON.stringify(payload.attachments)

  it('is green and escapes mrkdwn control characters', () => {
    const payload = formatSlack(ctx, [record({})], { lint: 'success' }, null)
    expect(payload.text).toBe('CI passou: main')
    expect(text(payload)).toContain('#16a34a')
    expect(text(payload)).toContain('feat: &lt;x&gt; &amp; y')
  })

  it('is red, names the failed jobs and lists the failing tests', () => {
    const payload = formatSlack(
      ctx,
      [record({ name: 'bad one', status: 'failed', error: 'boom' })],
      { 'e2e-tests': 'failure' },
      { lines: 88.04, statements: 0, functions: 0, branches: 70 },
    )
    const body = text(payload)
    expect(payload.text).toBe('CI falhou: main')
    expect(body).toContain('#dc2626')
    expect(body).toContain('e2e-tests')
    expect(body).toContain('bad one')
    expect(body).toContain('88.0%')
  })
})
