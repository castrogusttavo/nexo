import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const APP_DIR = join(process.cwd(), 'app')

function segmentPattern(segment: string): string | null {
  // Route groups `(name)` never reach the URL.
  if (/^\(.+\)$/.test(segment)) return null
  // Optional catch-all `[[...x]]` may match nothing at all.
  if (/^\[\[\.\.\..+\]\]$/.test(segment)) return '(?:/.*)?'
  // Catch-all `[...x]` needs at least one segment.
  if (/^\[\.\.\..+\]$/.test(segment)) return '/.+'
  // Dynamic `[x]` matches exactly one segment.
  if (/^\[.+\]$/.test(segment)) return '/[^/]+'
  return `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
}

function isRoutable(segment: string): boolean {
  // Private folders (`_components`) and parallel-route slots (`@modal`) are
  // not URL segments that can own a page on their own.
  return !segment.startsWith('_') && !segment.startsWith('@')
}

/**
 * Every URL the App Router can serve a page for, read from the `page.*`
 * files under `app/` — so a test asserting against it follows the
 * filesystem instead of a list someone has to keep in sync.
 */
export function appPageRoutes(): RegExp[] {
  const routes: RegExp[] = []

  for (const entry of readdirSync(APP_DIR, {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!entry.isFile() || !/^page\.(tsx|ts|jsx|js|mdx)$/.test(entry.name)) {
      continue
    }
    const dir = relative(APP_DIR, entry.parentPath)
    const segments = dir === '' ? [] : dir.split(sep)
    if (!segments.every(isRoutable)) continue

    const pattern = segments
      .map(segmentPattern)
      .filter((part): part is string => part !== null)
      .join('')
    routes.push(new RegExp(`^${pattern || '/'}$`))
  }

  return routes
}

/** Whether `href` (path only; query and hash are ignored) has a page. */
export function hasAppPage(href: string, routes = appPageRoutes()): boolean {
  const path = href.split(/[?#]/)[0].replace(/(.)\/$/, '$1')
  return routes.some((route) => route.test(path))
}
