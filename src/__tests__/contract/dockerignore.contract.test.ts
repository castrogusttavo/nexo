import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// `.dockerignore` decides what the production image is built from, and a
// missing file there fails silently: the build succeeds and the feature is
// simply gone. proxy.ts sat in this list under "Dev tools & config" — the
// name reads like tooling — so every deployed image shipped without the
// middleware: no CSP, no HSTS, and no auth gate in front of private pages.
// Nothing in CI noticed, because CI never builds the image and then asks it
// for a header.

const RUNTIME_FILES = [
  'proxy.ts',
  'next.config.ts',
  'package.json',
  'tsconfig.json',
  'app',
  'components',
  'src',
  'lib',
  'utils',
  'prisma',
  'public',
  'worker',
]

function ignorePatterns(): string[] {
  return readFileSync('.dockerignore', 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

/** Docker's ignore syntax, limited to the forms this file actually uses. */
function matches(pattern: string, target: string): boolean {
  const negated = pattern.startsWith('!')
  if (negated) return false

  const normalized = pattern.replace(/\/$/, '')
  if (normalized === target) return true

  // `**/foo` and `foo/**` both cover a root-level `foo`.
  if (normalized === `**/${target}`) return true
  if (normalized === `${target}/**`) return true

  return false
}

describe('dockerignore: the image keeps what production runs', () => {
  it('excludes none of the files the server needs', () => {
    const patterns = ignorePatterns()

    const excluded = RUNTIME_FILES.filter((file) =>
      patterns.some((pattern) => matches(pattern, file)),
    )

    expect(
      excluded,
      `.dockerignore drops ${excluded.join(', ')} from the build context, ` +
        'so the deployed image runs without it',
    ).toEqual([])
  })
})
