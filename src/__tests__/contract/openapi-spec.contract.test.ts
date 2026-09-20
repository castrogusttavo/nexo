import { Ajv2020 } from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'
import { ERROR_CODES } from '@/src/errors/codes'
import {
  deref,
  envelopeContract,
  flattenProperties,
  formatList,
  isAuthSpecPath,
  isPublicSpecPath,
  publicRoutes,
  type SpecNode,
  spec,
  specOperations,
} from './openapi'

// Test 2 — invariants of the document itself: refs that resolve, bodies that
// use the project envelope, error codes that exist at the status they are
// documented under, auth declared exactly where the proxy demands a session,
// and path parameters that match the path template.

/**
 * Operations whose body is deliberately not the `{ success, statusCode, ... }`
 * envelope. Each one answers a caller that never sees the rest of the API, so
 * the shape is part of that caller's contract, not ours.
 */
const NON_ENVELOPE_OPERATIONS: Record<string, string> = {
  // AbacatePay posts here and only reads the status code; the handler answers
  // with `{ received }` / `{ error }` and a flat 500 so 5xx triggers a retry.
  'POST /payment/webhook': 'external webhook — AbacatePay payload contract',
  // Liveness probe for the infrastructure (`{ status: "ok" }` / 503).
  'GET /health': 'infrastructure liveness probe, not a product endpoint',
}

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/

function isErrorStatus(status: string): boolean {
  return /^\d{3}$/.test(status) && Number(status) >= 400
}

describe('openapi: every $ref resolves', () => {
  it('has no dangling pointer', () => {
    const dangling: string[] = []

    const walk = (node: unknown, pointer: string) => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, `${pointer}/${index}`))
        return
      }
      if (!node || typeof node !== 'object') return
      const ref = (node as SpecNode).$ref
      if (typeof ref === 'string' && deref(node) === undefined) {
        dangling.push(`${pointer} -> ${ref}`)
      }
      for (const [key, value] of Object.entries(node as SpecNode)) {
        walk(value, `${pointer}/${key}`)
      }
    }

    walk(spec, '#')

    expect(
      dangling.length === 0,
      `${dangling.length} unresolvable $ref(s):${formatList(dangling)}`,
    ).toBe(true)
  })
})

describe('openapi: schemas are valid JSON Schema 2020-12', () => {
  it('compiles every component schema', () => {
    // OpenAPI 3.1 schemas *are* JSON Schema 2020-12, so ajv's 2020 build is
    // the reference implementation for them. `strict: false` allows the
    // OpenAPI-only annotations (`example`, `discriminator`, `xml`); anything
    // ajv still rejects is a genuine defect, e.g. the 3.0-only `nullable`
    // used without a `type` (which 3.1 silently ignores).
    const ajv = new Ajv2020({ strict: false, allErrors: true })
    addFormats(ajv)
    ajv.addSchema({ $id: 'openapi', components: spec.components }, 'openapi')

    const failures: string[] = []
    for (const name of Object.keys(spec.components.schemas as SpecNode)) {
      try {
        ajv.compile({ $ref: `openapi#/components/schemas/${name}` })
      } catch (error) {
        failures.push(`${name}: ${(error as Error).message}`)
      }
    }

    expect(
      failures.length === 0,
      `${failures.length} component schema(s) are not valid JSON Schema ` +
        `2020-12:${formatList(failures)}`,
    ).toBe(true)
  })

  it('uses no OpenAPI 3.0 `nullable` keyword', () => {
    // `nullable: true` is 3.0 only. A 3.1 reader ignores it outright, so a
    // field written that way is published as non-nullable — silently wrong.
    // The 3.1 spelling is `"type": ["string", "null"]`.
    const offenders: string[] = []

    const walk = (node: unknown, pointer: string) => {
      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, `${pointer}/${index}`))
        return
      }
      if (!node || typeof node !== 'object') return
      if ((node as SpecNode).nullable !== undefined) offenders.push(pointer)
      for (const [key, value] of Object.entries(node as SpecNode)) {
        walk(value, `${pointer}/${key}`)
      }
    }

    walk(spec, '#')

    expect(
      offenders.length === 0,
      `${offenders.length} schema(s) still use \`nullable\`; use ` +
        `\`"type": [..., "null"]\` instead:${formatList(offenders)}`,
    ).toBe(true)
  })
})

describe('openapi: response bodies use the project envelope', () => {
  it('matches types/http-response.d.ts on every documented response', () => {
    const envelope = envelopeContract()
    const violations: string[] = []

    for (const { id, path, operation } of specOperations()) {
      // Better Auth owns the `/auth/**` response shapes; they are the
      // library's, not this codebase's envelope.
      if (isAuthSpecPath(path)) continue
      if (id in NON_ENVELOPE_OPERATIONS) continue

      for (const [status, node] of Object.entries(
        (operation.responses ?? {}) as SpecNode,
      )) {
        const response = deref(node)
        const json = response?.content?.['application/json']
        // 204/302 carry no body, and a binary body (an image, an export
        // file) is not JSON to begin with.
        if (!json) continue

        const properties = flattenProperties(json.schema)
        const expected = isErrorStatus(status)
          ? envelope.errorRequired
          : envelope.successRequired
        const absent = expected.filter((key) => !(key in properties))
        if (absent.length > 0) {
          violations.push(
            `${id} [${status}] is missing ${absent.join(', ')} ` +
              `(has: ${Object.keys(properties).join(', ') || 'nothing'})`,
          )
        }

        if (!isErrorStatus(status)) continue
        const error = deref(properties.error)
        const errorKeys = Object.keys(error?.properties ?? {})
        const absentInError = envelope.errorObjectRequired.filter(
          (key) => !errorKeys.includes(key),
        )
        if (absentInError.length > 0) {
          violations.push(
            `${id} [${status}] error object is missing ` +
              `${absentInError.join(', ')}`,
          )
        }
      }
    }

    expect(
      violations.length === 0,
      `${violations.length} response(s) do not use the envelope from ` +
        `types/http-response.d.ts:${formatList(violations)}`,
    ).toBe(true)
  })

  it('keeps the non-envelope allowlist honest', () => {
    const documented = new Set(specOperations().map((op) => op.id))
    const stale = Object.keys(NON_ENVELOPE_OPERATIONS).filter(
      (id) => !documented.has(id),
    )

    expect(
      stale.length === 0,
      'NON_ENVELOPE_OPERATIONS lists operation(s) the spec no longer ' +
        `documents:${formatList(stale)}`,
    ).toBe(true)
  })
})

describe('openapi: error codes match the ERROR_CODES registry', () => {
  it('names only registered codes, at their registered status', () => {
    const problems: string[] = []

    for (const { id, operation } of specOperations()) {
      for (const [status, node] of Object.entries(
        (operation.responses ?? {}) as SpecNode,
      )) {
        if (!isErrorStatus(status)) continue
        const response = deref(node)
        if (!response) continue

        const codes = new Set<string>()

        const fromExample = (value: unknown) => {
          const code = (value as SpecNode)?.error?.code
          if (typeof code === 'string') codes.add(code)
        }

        const json = response.content?.['application/json']
        if (json) {
          fromExample(json.example)
          for (const example of Object.values(
            (json.examples ?? {}) as SpecNode,
          )) {
            fromExample((example as SpecNode)?.value)
          }

          const errorSchema = deref(flattenProperties(json.schema).error)
          const codeSchema = deref(errorSchema?.properties?.code)
          for (const candidate of [codeSchema?.const, codeSchema?.example]) {
            if (typeof candidate === 'string') codes.add(candidate)
          }
          for (const candidate of codeSchema?.enum ?? []) {
            if (typeof candidate === 'string') codes.add(candidate)
          }
        }

        // Several responses document their domain codes in prose, in
        // backticks — e.g. "Cupom inválido (`COUPON_INVALID`)".
        const description: string =
          (node as SpecNode).description ?? response.description ?? ''
        for (const match of description.matchAll(/`([A-Z][A-Z0-9_]+)`/g)) {
          if (ERROR_CODE_PATTERN.test(match[1])) codes.add(match[1])
        }

        for (const code of codes) {
          const registered = ERROR_CODES[code as keyof typeof ERROR_CODES]
          if (!registered) {
            problems.push(
              `${id} [${status}] names \`${code}\`, which is not in ` +
                'ERROR_CODES (src/errors/codes.ts)',
            )
          } else if (registered.status !== Number(status)) {
            problems.push(
              `${id} documents \`${code}\` under ${status}, but ` +
                `ERROR_CODES registers it as ${registered.status}`,
            )
          }
        }
      }
    }

    expect(
      problems.length === 0,
      `${problems.length} error code mismatch(es):${formatList(problems)}`,
    ).toBe(true)
  })

  // The check above only sees a code where a response names it, so a shared
  // `$ref` response hides the pairing. Operation prose spells it out —
  // "Falha com `MODULE_MEMBER_ALREADY_EXISTS` (409) se..." — and that is
  // where the registry's 405 for that code stayed invisible.
  it('agrees with the statuses its prose promises', () => {
    const problems: string[] = []

    for (const { id, operation } of specOperations()) {
      const prose = `${operation.summary ?? ''}\n${operation.description ?? ''}`

      for (const [, code, status] of prose.matchAll(
        /`([A-Z][A-Z0-9_]+)`\s*\((\d{3})\)/g,
      )) {
        if (!ERROR_CODE_PATTERN.test(code)) continue

        const registered = ERROR_CODES[code as keyof typeof ERROR_CODES]
        if (!registered) {
          problems.push(
            `${id} describes \`${code}\`, which is not in ERROR_CODES ` +
              '(src/errors/codes.ts)',
          )
          continue
        }

        if (registered.status !== Number(status)) {
          problems.push(
            `${id} promises \`${code}\` as ${status}, but ERROR_CODES ` +
              `registers it as ${registered.status}`,
          )
        }

        if (!(status in (operation.responses ?? {}))) {
          problems.push(
            `${id} describes \`${code}\` as ${status} but documents no ` +
              `${status} response`,
          )
        }
      }
    }

    expect(
      problems.length === 0,
      `${problems.length} documented status mismatch(es):${formatList(problems)}`,
    ).toBe(true)
  })
})

describe('openapi: security matches the proxy gate', () => {
  it('declares cookieAuth on exactly the non-public operations', () => {
    const routes = publicRoutes()
    const problems: string[] = []

    for (const { id, path, operation } of specOperations()) {
      // `/api/auth` is public to the proxy because Better Auth does its own
      // session handling: `/auth/get-session`, `/auth/sign-out` and the
      // two-factor routes genuinely need a session even though the proxy
      // never checks for one. PUBLIC_ROUTES cannot express that split, so
      // the auth surface is out of this check.
      if (isAuthSpecPath(path)) continue

      const schemes = ((operation.security ?? []) as SpecNode[]).flatMap(
        (requirement) => Object.keys(requirement),
      )
      const declaresCookie = schemes.includes('cookieAuth')
      const isPublic = isPublicSpecPath(path, routes)

      if (isPublic && declaresCookie) {
        problems.push(
          `${id} declares cookieAuth but PUBLIC_ROUTES lets it through ` +
            'without a session',
        )
      }
      if (!isPublic && !declaresCookie) {
        problems.push(
          `${id} needs a session (not in PUBLIC_ROUTES) but declares ` +
            `${schemes.length ? schemes.join(', ') : 'no security'}`,
        )
      }
    }

    expect(
      problems.length === 0,
      `${problems.length} operation(s) disagree with PUBLIC_ROUTES in ` +
        `proxy.ts:${formatList(problems)}`,
    ).toBe(true)
  })

  it('references only declared security schemes', () => {
    const declared = new Set(
      Object.keys((spec.components.securitySchemes ?? {}) as SpecNode),
    )
    const unknown = new Set<string>()

    for (const { id, operation } of specOperations()) {
      for (const requirement of (operation.security ?? []) as SpecNode[]) {
        for (const scheme of Object.keys(requirement)) {
          if (!declared.has(scheme)) unknown.add(`${id} -> ${scheme}`)
        }
      }
    }

    expect([...unknown].sort()).toEqual([])
  })
})

describe('openapi: path parameters match the path template', () => {
  it('declares every {param}, and declares no parameter the path lacks', () => {
    const problems: string[] = []

    for (const [path, pathItem] of Object.entries(spec.paths as SpecNode)) {
      const templated = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1])
      const shared = ((pathItem as SpecNode).parameters ?? []) as SpecNode[]

      for (const { id, operation } of specOperations().filter(
        (op) => op.path === path,
      )) {
        const own = (operation.parameters ?? []) as SpecNode[]
        const pathParams = [...shared, ...own].filter((p) => p.in === 'path')
        const names = pathParams.map((p) => p.name as string)

        const undeclared = templated.filter((name) => !names.includes(name))
        if (undeclared.length > 0) {
          problems.push(`${id} does not declare ${undeclared.join(', ')}`)
        }

        const phantom = names.filter((name) => !templated.includes(name))
        if (phantom.length > 0) {
          problems.push(
            `${id} declares path parameter(s) the path has no ` +
              `placeholder for: ${phantom.join(', ')}`,
          )
        }

        const notRequired = pathParams
          .filter((p) => p.required !== true)
          .map((p) => p.name as string)
        if (notRequired.length > 0) {
          problems.push(
            `${id} declares ${notRequired.join(', ')} without ` +
              '`required: true` (path parameters are always required)',
          )
        }
      }
    }

    expect(
      problems.length === 0,
      `${problems.length} path parameter problem(s):${formatList(problems)}`,
    ).toBe(true)
  })
})
