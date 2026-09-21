import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Shared plumbing for the OpenAPI contract tests.
//
// `public/openapi.json` is hand-maintained and nothing generates it, so these
// helpers rebuild the "truth" side of every comparison from the code itself:
// the route files under `app/api`, `ERROR_CODES`, `PUBLIC_ROUTES` in
// `proxy.ts` and the envelope declared in `types/http-response.d.ts`. Nothing
// about the API is restated here — a copy would drift exactly like the spec.

export const REPO_ROOT = process.cwd()

export type SpecNode = Record<string, any>

export const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
] as const

export type HttpMethod = (typeof HTTP_METHODS)[number]

const HTTP_METHODS_UPPER = HTTP_METHODS.map((m) => m.toUpperCase())

export const spec: SpecNode = JSON.parse(
  readFileSync(join(REPO_ROOT, 'public/openapi.json'), 'utf8'),
)

/**
 * The Better Auth surface. It is documented path by path in the spec but
 * implemented by a single catch-all handler (`app/api/auth/[...all]`), so it
 * can never line up with a per-path filesystem inventory. Every check that
 * walks routes or asserts the project's own conventions skips it on purpose:
 * the shapes below belong to the `better-auth` library, not to this codebase.
 */
export const AUTH_SPEC_PREFIX = '/auth/'

export function isAuthSpecPath(path: string): boolean {
  return path.startsWith(AUTH_SPEC_PREFIX)
}

/**
 * Pointer segments that would walk off the parsed JSON and onto the object
 * machinery (`#/__proto__/...` reaches `Object.prototype`). A spec never
 * legitimately names these, so they resolve to nothing.
 */
const FORBIDDEN_POINTER_SEGMENTS = new Set([
  '__proto__',
  'constructor',
  'prototype',
])

/** Resolves a JSON pointer (`#/components/...`) against the document. */
export function resolvePointer(ref: string): SpecNode | undefined {
  if (!ref.startsWith('#/')) return undefined
  const segments = ref
    .slice(2)
    .split('/')
    .map((raw) => raw.replace(/~1/g, '/').replace(/~0/g, '~'))
  if (segments.some((segment) => FORBIDDEN_POINTER_SEGMENTS.has(segment))) {
    return undefined
  }
  // Own properties only: `in` would also follow inherited keys.
  return segments.reduce<unknown>(
    (node, segment) =>
      node !== null && typeof node === 'object' && Object.hasOwn(node, segment)
        ? (node as SpecNode)[segment]
        : undefined,
    spec,
  ) as SpecNode | undefined
}

/** Follows `$ref` chains until a concrete node is reached. */
export function deref(node: unknown): SpecNode | undefined {
  let current = node as SpecNode | undefined
  for (let hops = 0; hops < 10; hops++) {
    if (!current || typeof current !== 'object') return undefined
    if (typeof current.$ref !== 'string') return current
    current = resolvePointer(current.$ref)
  }
  return undefined
}

export interface SpecOperation {
  /** Spec path, relative to the `/api` server url — e.g. `/users/me`. */
  path: string
  method: string
  /** `GET /users/me` — the id used in every diff message. */
  id: string
  operation: SpecNode
  pathItem: SpecNode
}

export function specOperations(): SpecOperation[] {
  const operations: SpecOperation[] = []
  for (const [path, pathItem] of Object.entries(spec.paths as SpecNode)) {
    for (const [method, operation] of Object.entries(pathItem as SpecNode)) {
      if (!HTTP_METHODS.includes(method as HttpMethod)) continue
      operations.push({
        path,
        method: method.toUpperCase(),
        id: `${method.toUpperCase()} ${path}`,
        operation,
        pathItem,
      })
    }
  }
  return operations
}

export interface RouteFile {
  /** Repo-relative path of the handler file. */
  file: string
  /** Spec-style url, `/api` stripped — e.g. `/workspaces/{id}`. */
  path: string
  /** `app/api/auth/[...all]` and friends: one file, many urls. */
  isCatchAll: boolean
  /** HTTP verbs the file actually exports. */
  methods: string[]
}

function listRouteFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(join(REPO_ROOT, dir), {
    withFileTypes: true,
  })) {
    const child = `${dir}/${entry.name}`
    if (entry.isDirectory()) listRouteFiles(child, acc)
    else if (entry.name === 'route.ts') acc.push(child)
  }
  return acc
}

/**
 * Turns `app/api/(group)/workspaces/[id]/route.ts` into `/workspaces/{id}`,
 * following the App Router's own rules: route groups `(...)` contribute no
 * url segment, `[param]` is a single segment and `[...param]` a catch-all.
 */
function routePathFromFile(file: string): { path: string; catchAll: boolean } {
  const segments = file
    .replace(/^app\/api/, '')
    .replace(/\/route\.ts$/, '')
    .split('/')
    .filter((segment) => segment !== '' && !/^\(.*\)$/.test(segment))

  let catchAll = false
  const mapped = segments.map((segment) => {
    const optionalCatchAll = segment.match(/^\[\[\.\.\.(.+)\]\]$/)
    if (optionalCatchAll) {
      catchAll = true
      return `{*${optionalCatchAll[1]}}`
    }
    const rest = segment.match(/^\[\.\.\.(.+)\]$/)
    if (rest) {
      catchAll = true
      return `{*${rest[1]}}`
    }
    const dynamic = segment.match(/^\[(.+)\]$/)
    if (dynamic) return `{${dynamic[1]}}`
    return segment
  })

  return { path: `/${mapped.join('/')}`.replace(/\/$/, '') || '/', catchAll }
}

const EXPORTED_UPPERCASE_BINDING =
  /export\s+(?:const|async\s+function|function)\s+([A-Z]+)\b/g

function exportedMethods(source: string): string[] {
  const exported = new Set(
    Array.from(
      source.matchAll(EXPORTED_UPPERCASE_BINDING),
      (match) => match[1],
    ),
  )
  return HTTP_METHODS_UPPER.filter((method) => exported.has(method))
}

/** Every `app/api/**\/route.ts`, with its url and the verbs it exports. */
export function routeInventory(): RouteFile[] {
  return listRouteFiles('app/api')
    .sort()
    .map((file) => {
      const { path, catchAll } = routePathFromFile(file)
      const source = readFileSync(join(REPO_ROOT, file), 'utf8')
      return {
        file,
        path,
        isCatchAll: catchAll,
        methods: exportedMethods(source),
      }
    })
}

/**
 * `PUBLIC_ROUTES` from `proxy.ts`, read out of the source: the array is not
 * exported, and importing the module would drag in `next/server` plus the
 * Axiom transport for what is a plain list of strings.
 */
export function publicRoutes(): string[] {
  const source = readFileSync(join(REPO_ROOT, 'proxy.ts'), 'utf8')
  const block = source.match(/const PUBLIC_ROUTES\s*=\s*\[([\s\S]*?)\]/)
  if (!block) {
    throw new Error(
      'Could not read PUBLIC_ROUTES from proxy.ts — the contract test that ' +
        'derives the public surface from it needs updating.',
    )
  }
  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
}

/** True when the proxy lets a spec path through without a session cookie. */
export function isPublicSpecPath(specPath: string, routes: string[]): boolean {
  const pathname = `/api${specPath}`
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

interface TypeMember {
  name: string
  optional: boolean
  type: string
}

function braceBlock(source: string, from: number): string {
  const open = source.indexOf('{', from)
  if (open === -1) return ''
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0)
      return source.slice(open + 1, i)
  }
  return ''
}

function interfaceBody(source: string, name: string): string {
  const start = source.indexOf(`interface ${name}`)
  if (start === -1) {
    throw new Error(
      `types/http-response.d.ts no longer declares \`${name}\` — the ` +
        'envelope contract test reads the real types and must be updated.',
    )
  }
  return braceBlock(source, start)
}

function topLevelMembers(body: string): TypeMember[] {
  const members: TypeMember[] = []
  let depth = 0
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim()
    if (depth === 0) {
      const member = line.match(/^(\w+)(\??):\s*(.*)$/)
      if (member) {
        members.push({
          name: member[1],
          optional: member[2] === '?',
          type: member[3].trim(),
        })
      }
    }
    for (const char of line) {
      if (char === '{') depth++
      else if (char === '}') depth--
    }
  }
  return members
}

export interface EnvelopeContract {
  /** Keys a 2xx body must carry (`success`, `statusCode`, `data`). */
  successRequired: string[]
  /** Keys a 4xx/5xx body must carry (`success`, `statusCode`, `error`). */
  errorRequired: string[]
  /** Keys inside the error object (`code`). */
  errorObjectRequired: string[]
  /** Keys either envelope may carry (`message`). */
  optional: string[]
}

/**
 * Derives the response envelope from `types/http-response.d.ts` instead of
 * restating it: `SuccessResponse`/`ErrorResponse` narrow `HttpResponse`, and
 * a member re-declared as `never` in the narrowed interface (`error?: never`)
 * is one the envelope must not carry.
 */
export function envelopeContract(): EnvelopeContract {
  const source = readFileSync(
    join(REPO_ROOT, 'types/http-response.d.ts'),
    'utf8',
  )
  const base = topLevelMembers(interfaceBody(source, 'HttpResponse'))

  const merge = (name: string): TypeMember[] => {
    const members = new Map<string, TypeMember>()
    for (const member of base) members.set(member.name, member)
    for (const member of topLevelMembers(interfaceBody(source, name))) {
      members.set(member.name, member)
    }
    return [...members.values()].filter((member) => member.type !== 'never')
  }

  const required = (name: string) =>
    merge(name)
      .filter((member) => !member.optional)
      .map((member) => member.name)

  const errorBody = interfaceBody(source, 'ErrorResponse')
  const errorMemberStart = errorBody.search(/\berror\??:/)
  const errorObjectRequired = topLevelMembers(
    braceBlock(errorBody, errorMemberStart),
  )
    .filter((member) => !member.optional)
    .map((member) => member.name)

  return {
    successRequired: required('SuccessResponse'),
    errorRequired: required('ErrorResponse'),
    errorObjectRequired,
    optional: merge('HttpResponse')
      .filter((member) => member.optional)
      .map((member) => member.name),
  }
}

/** Flattens `allOf` chains into the property names a body actually exposes. */
export function flattenProperties(
  schema: unknown,
  accumulator: Record<string, SpecNode> = {},
  depth = 0,
): Record<string, SpecNode> {
  const node = deref(schema)
  if (!node || depth > 8) return accumulator
  for (const branch of node.allOf ?? []) {
    flattenProperties(branch, accumulator, depth + 1)
  }
  for (const [name, property] of Object.entries(node.properties ?? {})) {
    accumulator[name] = property as SpecNode
  }
  return accumulator
}

/** Sorted set difference, for readable "missing / extra" diffs. */
export function missing(expected: string[], actual: string[]): string[] {
  const present = new Set(actual)
  return expected.filter((item) => !present.has(item)).sort()
}

export function formatList(items: string[]): string {
  return items.length ? `\n  - ${items.join('\n  - ')}` : ' (none)'
}
