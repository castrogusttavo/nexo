// OWASP argon2id preset (Password Storage Cheat Sheet): m=19MiB, t=2, p=1.
// The lib's defaults (64MB, parallelism 4) assume a single hash running
// fast on a dedicated machine — under real concurrency this saturates the
// whole server's CPU (see k6/EXPERIMENT-LOG.md). The single place that
// defines these parameters — auth.ts and scripts/seed-load-test.ts import
// from here so hashes are never generated with configs different from
// what the app actually uses.
export const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const
