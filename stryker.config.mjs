// Mutation testing for the backend logic.
//
// Line coverage sits above 95%, which only proves those lines ran. Stryker
// answers the question that actually matters: if a line were subtly wrong,
// would a test go red? Scope is the code where a surviving mutant is a real
// hole — services (business rules + authorization), mappers (the API
// contract), the error registry, the Result helpers, rate limiting, the
// queue layer and the HTTP envelope helpers.
//
// Run: `pnpm test:mutation`. A full run is ~25 min on 4 cores; `incremental`
// makes subsequent runs re-test only what changed.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'pnpm',
  testRunner: 'vitest',

  // Named explicitly. Stryker's default plugin discovery globs
  // `node_modules/@stryker-mutator/*`, which does not follow pnpm's symlinked
  // store layout — without this it reports "no TestRunner plugins were
  // loaded" even though the runner is installed.
  plugins: ['@stryker-mutator/vitest-runner'],

  // Stryker's vitest runner boots every project it finds in the config it is
  // given, and has no `--project` switch. `vitest.stryker.config.ts` is the
  // `unit` project flattened into a single-project config, so mutant runs
  // never touch the integration/e2e/component projects (live Postgres, Redis
  // and a running `next start` — slow and flaky, multiplied by every mutant).
  vitest: { configFile: 'vitest.stryker.config.ts' },

  mutate: [
    'src/services/**/*.ts',
    'src/mappers/**/*.ts',
    'src/errors/**/*.ts',
    'src/lib/result.ts',
    'src/lib/rate-limit.ts',
    'src/lib/queue/**/*.ts',
    'utils/**/*.ts',
    // Tests, fixtures and ambient types are not production behaviour.
    '!**/__tests__/**',
    '!**/*.test.ts',
    '!**/*.d.ts',
    // Pure re-export barrel: every mutant in it is either a no-op or an
    // import error, never a behaviour change a test could meaningfully catch.
    '!src/errors/index.ts',
  ],

  // Only run the tests that actually covered the mutated line. Without this
  // every mutant would re-run the whole unit suite.
  coverageAnalysis: 'perTest',

  // Mutants in module-level (static) initialisation cannot be re-tested per
  // test — the module is only evaluated once per worker, so Stryker would
  // have to reload the whole environment for each one. This scope is full of
  // module-level const tables (ERROR_CODES, RetentionWindowMs, the limiter
  // definitions), so ignoring them keeps the run tractable; they are covered
  // by the assertions on the values they feed instead.
  ignoreStatic: true,

  // 4-core machine; each Stryker worker runs its own vitest with maxWorkers 1.
  // 3 leaves a core for the OS and the coordinating process.
  concurrency: 3,

  // A cold-ish mutant run on this suite is ~1-3s. 30s of headroom plus a
  // generous factor means a merely slow mutant is reported as SURVIVED (a
  // real gap) instead of being silently written off as a TIMEOUT (a kill).
  timeoutMS: 30000,
  timeoutFactor: 2.5,

  // Re-runs after the first one only re-test mutants whose file or covering
  // tests changed. The cache lives in a gitignored directory.
  incremental: true,
  incrementalFile: '.stryker/incremental.json',
  tempDirName: '.stryker-tmp',
  cleanTempDir: true,

  // Stryker strips type annotations itself; running tsc per mutant would
  // multiply the runtime for no extra signal.
  disableTypeChecks: true,

  mutator: {
    excludedMutations: [
      // String-literal mutants rewrite every string in the scope, and the vast
      // majority of them here are Axiom log event names, audit action names
      // and human-readable error `message` fields — none of which any test
      // asserts on, nor should: they are diagnostics, not behaviour. Keeping
      // them on produced hundreds of unkillable mutants that drowned out the
      // real findings.
      //
      // The behaviour that *is* carried by strings is checked elsewhere and is
      // not weakened by this: `ErrorCode` values, queue/job names and DTO keys
      // are `as const` object members (mutated as ObjectLiteral, still on) or
      // asserted structurally by the contract and mapper suites.
      'StringLiteral',
    ],
    // NOT excluded, on purpose: `ObjectLiteral`. Roughly 250 of its survivors
    // are `auditMutation({...})` / `logger.x('event', {...})` payloads being
    // emptied — diagnostics nobody asserts, in the same family as the strings
    // above. But the same mutator also empties repository call arguments
    // (`Repository.create({...})`, `prisma.x.findMany({ where })`), where a
    // survivor is a genuine gap. Turning it off would hide those, so it stays
    // on and the audit-payload noise is priced into the thresholds below
    // rather than silenced. Don't chase those; do chase the repo-argument ones.
  },

  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: { fileName: '.stryker/reports/mutation.html' },
  jsonReporter: { fileName: '.stryker/reports/mutation.json' },
  clearTextReporter: {
    allowColor: false,
    maxTestsToLog: 1,
    reportTests: false,
  },
  logLevel: 'info',

  // Measured score at the time of writing: 72.35% (up from 70.34% before the
  // first round of gap-closing tests — see .stryker/reports). `break` sits a
  // couple of points under that so CI fails on a genuine regression without
  // tripping over the handful of mutants whose verdict shifts run to run.
  // `high`/`low` are the colour bands in the HTML report and the direction of
  // travel, not a gate: raise `break` as the score climbs.
  thresholds: { high: 85, low: 65, break: 70 },
}
