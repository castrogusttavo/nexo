/**
 * CI test report: reads the JSON the test runners wrote, ships one summary per
 * run (and one record per notable test) to the Axiom `ci-runs` dataset and
 * posts a formatted message to Slack, green or red.
 *
 * Runs on the bare Node of the CI job (type stripping, no install step), so it
 * imports nothing and uses only erasable TypeScript syntax. The pure functions
 * are exported for `lib/__tests__/ci-test-report.test.ts`; `main` runs only
 * when the file is the entry point.
 *
 *   node scripts/test-report.ts reports
 *
 * Input files, all inside the reports directory:
 *   vitest-<name>.json       Vitest JSON reporter (`backend` mixes unit and
 *                            integration, told apart by path)
 *   playwright-<name>.json   Playwright JSON reporter
 *   coverage-backend.json    Istanbul `json-summary` of the backend run
 *
 * The report never fails the build: a broken ingest or Slack call is logged
 * and the job still ends green, because it runs after the tests and must not
 * turn a good CI red.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

export type Layer =
  | 'unit'
  | 'integration'
  | 'component'
  | 'contract'
  | 'e2e'
  | 'browser'
  | 'visual'

export type TestStatus = 'passed' | 'failed' | 'skipped' | 'flaky'

export interface TestRecord {
  layer: Layer
  file: string
  name: string
  status: TestStatus
  durationMs: number
  error?: string
}

export interface LayerTotals {
  total: number
  passed: number
  failed: number
  skipped: number
  flaky: number
  /** Sum of the individual test durations, not wall-clock time. */
  durationMs: number
}

export interface Coverage {
  lines: number
  statements: number
  functions: number
  branches: number
}

export interface RunContext {
  runId: string
  runAttempt: number
  repository: string
  branch: string
  sha: string
  actor: string
  event: string
  commitMessage: string
  runStartedAt: string | null
  serverUrl: string
}

export type JobResults = Record<string, string>

/** Tests at least this slow are kept in the dataset even when they pass. */
export const SLOW_TEST_MS = 500
const ERROR_MAX_CHARS = 300
const SLOW_LIST_SIZE = 5
const FAILED_LIST_SIZE = 10

const LAYER_ORDER: Layer[] = [
  'unit',
  'integration',
  'component',
  'contract',
  'e2e',
  'browser',
  'visual',
]

// ---------------------------------------------------------------- parsing --

type Json = Record<string, unknown>

function asRecord(value: unknown): Json {
  return typeof value === 'object' && value !== null ? (value as Json) : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function firstLine(text: string): string {
  return text.split('\n')[0].slice(0, ERROR_MAX_CHARS)
}

/** Repositories and caches hit the real database; the rest of the backend run is mocked. */
export function backendLayer(file: string): Layer {
  return /(^|\/)src\/(repositories|cache)\//.test(file) ||
    file.endsWith('.integration.test.ts')
    ? 'integration'
    : 'unit'
}

export function layerFromFileName(fileName: string): Layer | 'backend' | null {
  const match = fileName.match(/^(?:vitest|playwright)-([a-z]+)(?:-\d+)?\.json$/)
  switch (match?.[1]) {
    case 'backend':
      return 'backend'
    case 'component':
    case 'contract':
    case 'e2e':
    case 'browser':
    case 'visual':
      return match[1]
    default:
      return null
  }
}

function vitestStatus(status: string): TestStatus {
  if (status === 'passed') return 'passed'
  if (status === 'failed') return 'failed'
  return 'skipped'
}

export function parseVitest(
  report: unknown,
  layer: Layer | 'backend',
  cwd: string,
): TestRecord[] {
  const records: TestRecord[] = []
  for (const suite of asArray(asRecord(report).testResults)) {
    const suiteRecord = asRecord(suite)
    const file = relative(cwd, asString(suiteRecord.name)) || asString(suiteRecord.name)
    for (const item of asArray(suiteRecord.assertionResults)) {
      const test = asRecord(item)
      const failures = asArray(test.failureMessages).map(asString)
      records.push({
        layer: layer === 'backend' ? backendLayer(file) : layer,
        file,
        name: asString(test.fullName) || asString(test.title),
        status: vitestStatus(asString(test.status)),
        durationMs: Math.round(asNumber(test.duration)),
        ...(failures.length > 0 && { error: firstLine(failures[0]) }),
      })
    }
  }
  return records
}

function playwrightStatus(status: string): TestStatus {
  if (status === 'expected') return 'passed'
  if (status === 'unexpected') return 'failed'
  if (status === 'flaky') return 'flaky'
  return 'skipped'
}

export function parsePlaywright(
  report: unknown,
  layer: Layer,
  testDir = 'e2e',
): TestRecord[] {
  const records: TestRecord[] = []

  const walk = (suite: Json, titles: string[]) => {
    const here = suite.title ? [...titles, asString(suite.title)] : titles
    for (const spec of asArray(suite.specs)) {
      const specRecord = asRecord(spec)
      for (const item of asArray(specRecord.tests)) {
        const test = asRecord(item)
        const results = asArray(test.results).map(asRecord)
        const failed = results.find((r) => asRecord(r.error).message)
        const message = asString(asRecord(failed?.error).message)
        records.push({
          layer,
          file: `${testDir}/${asString(specRecord.file)}`,
          name: [...here.slice(1), asString(specRecord.title)].join(' '),
          status: playwrightStatus(asString(test.status)),
          durationMs: Math.round(
            results.reduce((sum, r) => sum + asNumber(r.duration), 0),
          ),
          ...(message && { error: firstLine(message.replace(/\u001b\[[0-9;]*m/g, '')) }),
        })
      }
    }
    for (const child of asArray(suite.suites)) walk(asRecord(child), here)
  }

  for (const suite of asArray(asRecord(report).suites)) walk(asRecord(suite), [])
  return records
}

export function parseCoverage(summary: unknown): Coverage | null {
  const total = asRecord(asRecord(summary).total)
  const pct = (key: string) => asNumber(asRecord(total[key]).pct)
  if (!total.lines) return null
  return {
    lines: pct('lines'),
    statements: pct('statements'),
    functions: pct('functions'),
    branches: pct('branches'),
  }
}

// ------------------------------------------------------------ aggregation --

function emptyTotals(): LayerTotals {
  return { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0, durationMs: 0 }
}

export function summarize(records: TestRecord[]): {
  layers: Partial<Record<Layer, LayerTotals>>
  totals: LayerTotals
} {
  const layers: Partial<Record<Layer, LayerTotals>> = {}
  const totals = emptyTotals()
  for (const record of records) {
    const layer = layers[record.layer] ?? emptyTotals()
    layers[record.layer] = layer
    for (const target of [layer, totals]) {
      target.total += 1
      target[record.status] += 1
      target.durationMs += record.durationMs
    }
  }
  return { layers, totals }
}

export function conclusionOf(jobs: JobResults): 'success' | 'failure' {
  return Object.values(jobs).some((r) => r === 'failure' || r === 'cancelled')
    ? 'failure'
    : 'success'
}

function slowest(records: TestRecord[]): TestRecord[] {
  return [...records]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, SLOW_LIST_SIZE)
}

// ----------------------------------------------------------------- events --

export function buildEvents(
  ctx: RunContext,
  records: TestRecord[],
  jobs: JobResults,
  coverage: Coverage | null,
  now: Date,
): Record<string, unknown>[] {
  const { layers, totals } = summarize(records)
  const conclusion = conclusionOf(jobs)
  const startedAt = ctx.runStartedAt ? Date.parse(ctx.runStartedAt) : Number.NaN
  const base = {
    runId: ctx.runId,
    runAttempt: ctx.runAttempt,
    repository: ctx.repository,
    branch: ctx.branch,
    sha: ctx.sha,
    event: ctx.event,
  }

  const run = {
    _time: now.toISOString(),
    kind: 'run',
    ...base,
    actor: ctx.actor,
    commitMessage: ctx.commitMessage,
    conclusion,
    wallClockMs: Number.isNaN(startedAt) ? null : now.getTime() - startedAt,
    tests: totals,
    layers,
    jobs,
    ...(coverage && { coverage }),
  }

  const notable = records
    .filter((r) => r.status !== 'passed' || r.durationMs >= SLOW_TEST_MS)
    .map((r) => ({
      _time: now.toISOString(),
      kind: 'test',
      ...base,
      layer: r.layer,
      file: r.file,
      name: r.name,
      status: r.status,
      durationMs: r.durationMs,
      ...(r.error && { error: r.error }),
    }))

  return [run, ...notable]
}

// ------------------------------------------------------------------ slack --

function escapeMrkdwn(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m${String(Math.round(seconds % 60)).padStart(2, '0')}s`
}

export function formatSlack(
  ctx: RunContext,
  records: TestRecord[],
  jobs: JobResults,
  coverage: Coverage | null,
): Record<string, unknown> {
  const { layers, totals } = summarize(records)
  const conclusion = conclusionOf(jobs)
  const ok = conclusion === 'success'
  const failedJobs = Object.entries(jobs)
    .filter(([, result]) => result === 'failure' || result === 'cancelled')
    .map(([name]) => name)

  const rows = LAYER_ORDER.filter((layer) => layers[layer]).map((layer) => {
    const t = layers[layer] as LayerTotals
    return `${layer.padEnd(12)}${String(t.total).padStart(6)}${String(t.failed).padStart(8)}${String(t.flaky).padStart(7)}${String(t.skipped).padStart(9)}${formatMs(t.durationMs).padStart(10)}`
  })
  const table = [
    `${'camada'.padEnd(12)}${'total'.padStart(6)}${'falhas'.padStart(8)}${'flaky'.padStart(7)}${'skipped'.padStart(9)}${'tempo'.padStart(10)}`,
    ...rows,
  ].join('\n')

  const failures = records.filter((r) => r.status === 'failed')
  const flaky = records.filter((r) => r.status === 'flaky')

  const sections: string[] = [
    `*${ok ? 'CI passou' : 'CI falhou'}* em \`${escapeMrkdwn(ctx.branch)}\` (<${ctx.serverUrl}/${ctx.repository}/commit/${ctx.sha}|\`${ctx.sha.slice(0, 7)}\`>) por ${escapeMrkdwn(ctx.actor)}`,
    escapeMrkdwn(ctx.commitMessage),
    `*Testes:* ${totals.total} no total, ${totals.passed} ok, ${totals.failed} com falha, ${totals.flaky} flaky, ${totals.skipped} ignorados`,
    `\`\`\`${table}\`\`\``,
  ]
  if (coverage) {
    sections.push(
      `*Cobertura backend:* ${coverage.lines.toFixed(1)}% linhas, ${coverage.branches.toFixed(1)}% branches`,
    )
  }
  if (failedJobs.length > 0) {
    sections.push(`*Jobs com problema:* ${failedJobs.map((j) => `\`${j}\``).join(', ')}`)
  }
  if (failures.length > 0) {
    const list = failures
      .slice(0, FAILED_LIST_SIZE)
      .map((r) => `• \`${r.layer}\` ${escapeMrkdwn(r.name)}${r.error ? `\n    ${escapeMrkdwn(r.error)}` : ''}`)
    const rest = failures.length - FAILED_LIST_SIZE
    sections.push(
      `*Testes que falharam:*\n${list.join('\n')}${rest > 0 ? `\n…e mais ${rest}` : ''}`,
    )
  }
  if (flaky.length > 0) {
    sections.push(
      `*Flaky (passaram só no retry):*\n${flaky
        .slice(0, FAILED_LIST_SIZE)
        .map((r) => `• \`${r.layer}\` ${escapeMrkdwn(r.name)}`)
        .join('\n')}`,
    )
  }
  const slow = slowest(records)
  if (slow.length > 0) {
    sections.push(
      `*Mais lentos:*\n${slow
        .map((r) => `• ${formatMs(r.durationMs)} \`${r.layer}\` ${escapeMrkdwn(r.name)}`)
        .join('\n')}`,
    )
  }

  return {
    text: `${ok ? 'CI passou' : 'CI falhou'}: ${ctx.branch}`,
    attachments: [
      {
        color: ok ? '#16a34a' : '#dc2626',
        fallback: `${ok ? 'CI passou' : 'CI falhou'} em ${ctx.branch}`,
        blocks: [
          ...sections.map((text) => ({
            type: 'section',
            text: { type: 'mrkdwn', text },
          })),
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Abrir execução' },
                url: `${ctx.serverUrl}/${ctx.repository}/actions/runs/${ctx.runId}`,
              },
            ],
          },
        ],
      },
    ],
  }
}

// ------------------------------------------------------------------- I/O --

export function loadRecords(dir: string, cwd: string): TestRecord[] {
  const records: TestRecord[] = []
  for (const fileName of readdirSync(dir).sort()) {
    const layer = layerFromFileName(fileName)
    if (!layer) continue
    let report: unknown
    try {
      report = JSON.parse(readFileSync(join(dir, fileName), 'utf8'))
    } catch (error) {
      console.warn(`test-report: skipped unreadable ${fileName}: ${String(error)}`)
      continue
    }
    records.push(
      ...(fileName.startsWith('playwright-')
        ? parsePlaywright(report, layer as Layer)
        : parseVitest(report, layer, cwd)),
    )
  }
  return records
}

function loadCoverage(dir: string): Coverage | null {
  const path = join(dir, 'coverage-backend.json')
  if (!existsSync(path)) return null
  try {
    return parseCoverage(JSON.parse(readFileSync(path, 'utf8')))
  } catch {
    return null
  }
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      console.warn(`test-report: ${new URL(url).host} answered ${response.status}`)
    }
    return response.ok
  } catch (error) {
    console.warn(`test-report: ${new URL(url).host} unreachable: ${String(error)}`)
    return false
  }
}

function contextFromEnv(env: NodeJS.ProcessEnv): RunContext {
  return {
    runId: env.GITHUB_RUN_ID ?? 'local',
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT ?? 1),
    repository: env.GITHUB_REPOSITORY ?? 'local/local',
    branch: env.REPORT_BRANCH ?? env.GITHUB_REF_NAME ?? 'local',
    sha: env.GITHUB_SHA ?? '0000000',
    actor: env.GITHUB_ACTOR ?? 'local',
    event: env.GITHUB_EVENT_NAME ?? 'local',
    commitMessage: firstLine(env.COMMIT_MESSAGE ?? ''),
    runStartedAt: env.RUN_STARTED_AT || null,
    serverUrl: env.GITHUB_SERVER_URL ?? 'https://github.com',
  }
}

/** `toJSON(needs)` -> `{ job: result }`. */
export function jobResultsFromNeeds(raw: string | undefined): JobResults {
  if (!raw) return {}
  try {
    const needs = asRecord(JSON.parse(raw))
    return Object.fromEntries(
      Object.entries(needs).map(([job, value]) => [
        job,
        asString(asRecord(value).result),
      ]),
    )
  } catch {
    return {}
  }
}

export async function main(argv: string[], env: NodeJS.ProcessEnv): Promise<void> {
  const dir = argv[0] ?? 'reports'
  if (!existsSync(dir)) {
    console.warn(`test-report: ${dir} does not exist, nothing to report`)
    return
  }
  const cwd = process.cwd()
  const ctx = contextFromEnv(env)
  const records = loadRecords(dir, cwd)
  const jobs = jobResultsFromNeeds(env.JOBS_JSON)
  const coverage = loadCoverage(dir)
  const events = buildEvents(ctx, records, jobs, coverage, new Date())
  const slack = formatSlack(ctx, records, jobs, coverage)
  const dryRun = env.REPORT_DRY_RUN === 'true'

  console.log(
    `test-report: ${records.length} tests, ${events.length} events, conclusion ${conclusionOf(jobs)}`,
  )

  if (dryRun) {
    console.log(JSON.stringify({ run: events[0], slack }, null, 2))
    return
  }

  if (env.AXIOM_CI_TOKEN) {
    await postJson('https://api.axiom.co/v1/datasets/ci-runs/ingest', events, {
      Authorization: `Bearer ${env.AXIOM_CI_TOKEN}`,
    })
  } else {
    console.warn('test-report: AXIOM_CI_TOKEN is not set, skipping Axiom')
  }

  // A green pull request is noise; main is the record, and any red run is news.
  const worthPosting =
    env.GITHUB_EVENT_NAME !== 'pull_request' || conclusionOf(jobs) === 'failure'
  if (env.SLACK_WEBHOOK_URL && worthPosting) {
    await postJson(env.SLACK_WEBHOOK_URL, slack, {})
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2), process.env).catch((error) => {
    console.warn(`test-report: failed: ${String(error)}`)
  })
}
