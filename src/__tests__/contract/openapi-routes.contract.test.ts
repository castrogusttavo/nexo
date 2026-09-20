import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  formatList,
  isAuthSpecPath,
  REPO_ROOT,
  routeInventory,
  specOperations,
} from './openapi'

// Test 1 — spec vs. implementation.
//
// `servers[].url` ends in `/api`, so the spec path `/users/me` is the route
// `app/api/users/me/route.ts`. The inventory below is rebuilt from the
// filesystem on every run, which makes this the drift guard: an endpoint
// added without a spec entry (or a spec entry for a route that was deleted)
// fails here with the full list, not one assertion per path.

const AUTH_CATCH_ALL = 'app/api/auth/[...all]/route.ts'

describe('openapi: documented operations match the implemented routes', () => {
  const routes = routeInventory()
  const operations = specOperations()

  // The Better Auth surface (`/auth/**`) is documented per path but served by
  // one catch-all handler, so it can be in neither diff: the implemented side
  // has a single file and the documented side has thirteen paths. It is
  // deliberately excluded from both lists and covered by its own assertion.
  const implemented = new Set(
    routes
      .filter((route) => !route.isCatchAll)
      .flatMap((route) => route.methods.map((m) => `${m} ${route.path}`)),
  )
  const documented = new Set(
    operations.filter((op) => !isAuthSpecPath(op.path)).map((op) => op.id),
  )

  it('exports at least one HTTP method per route file', () => {
    const empty = routes.filter((route) => route.methods.length === 0)
    expect(
      empty.map((route) => route.file),
      'route files with no detected HTTP export — the detection in ' +
        'src/__tests__/contract/openapi.ts probably needs a new export form',
    ).toEqual([])
  })

  it('documents every implemented operation', () => {
    const undocumented = [...implemented]
      .filter((operation) => !documented.has(operation))
      .sort()

    expect(
      undocumented.length === 0,
      `${undocumented.length} implemented operation(s) missing from ` +
        `public/openapi.json:${formatList(undocumented)}`,
    ).toBe(true)
  })

  it('implements every documented operation', () => {
    const phantom = [...documented]
      .filter((operation) => !implemented.has(operation))
      .sort()

    expect(
      phantom.length === 0,
      `${phantom.length} documented operation(s) with no route handler ` +
        `under app/api:${formatList(phantom)}`,
    ).toBe(true)
  })

  it('serves the documented /auth paths from the catch-all handler', () => {
    const authPaths = operations.filter((op) => isAuthSpecPath(op.path))

    expect(authPaths.length).toBeGreaterThan(0)
    expect(
      existsSync(join(REPO_ROOT, AUTH_CATCH_ALL)),
      `${authPaths.length} /auth operations are documented, so ` +
        `${AUTH_CATCH_ALL} must exist to serve them`,
    ).toBe(true)

    const catchAll = routes.find((route) => route.file === AUTH_CATCH_ALL)
    const methods = new Set(catchAll?.methods ?? [])
    const unserved = authPaths
      .filter((op) => !methods.has(op.method))
      .map((op) => op.id)

    expect(
      unserved.length === 0,
      `${AUTH_CATCH_ALL} exports ${[...methods].join(', ') || 'nothing'}, ` +
        `which cannot serve:${formatList(unserved)}`,
    ).toBe(true)
  })
})
