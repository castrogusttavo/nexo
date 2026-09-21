import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { stripCdnFallback } = require('../excalidraw/cdn-fallback-loader.cjs') as {
  stripCdnFallback: (source: string, assetPath: string) => string
}

// The installed package's own browser chunks, so a release that reshapes the
// fallback line fails here before it fails in a browser.
const dist = path.join(
  path.dirname(require.resolve('@excalidraw/excalidraw')),
  '..',
)

function chunkDefiningFallback(flavour: 'prod' | 'dev'): string {
  const dir = path.join(dist, flavour)
  const file = readdirSync(dir).find(
    (name) =>
      name.endsWith('.js') &&
      readFileSync(path.join(dir, name), 'utf8').includes('"ASSETS_FALLBACK_URL"'),
  )
  if (!file) throw new Error(`no chunk defines ASSETS_FALLBACK_URL in ${dir}`)
  return readFileSync(path.join(dir, file), 'utf8')
}

describe('cdn-fallback-loader', () => {
  it.each(['prod', 'dev'] as const)(
    'drops the esm.sh font fallback from the %s build',
    (flavour) => {
      const out = stripCdnFallback(
        chunkDefiningFallback(flavour),
        '/static/excalidraw/',
      )
      expect(out).not.toContain('https://esm.sh/')
      expect(out).toContain(
        'new URL("/static/excalidraw/", window.location.origin).href',
      )
    },
  )

  it('throws when the fallback line no longer has the expected shape', () => {
    expect(() =>
      stripCdnFallback('P(x,"ASSETS_FALLBACK_URL","https://cdn.example/")', '/'),
    ).toThrow(/no longer matches/)
  })
})
