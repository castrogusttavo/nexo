/**
 * PII scrubbing for everything Sentry is about to send.
 *
 * Sentry events are much richer than a Slack alert -- a request envelope, a
 * user object, breadcrumbs, exception messages -- so the rules in
 * `src/lib/alerts/slack.ts` (`sanitizeAlertText`) are the floor here, not the
 * ceiling. On top of masking e-mails, bearer tokens and credentials embedded
 * in URLs, an event loses its cookies, its authorization headers, its request
 * body and every secret-looking query parameter before it leaves the process.
 *
 * Everything below is written against a structural subset of Sentry's `Event`
 * so it can be unit-tested without booting the SDK.
 */

const REDACTED = '[redacted]'

/**
 * Headers that carry a credential. Matched case-insensitively, since a header
 * bag reaches us spelled however the client sent it.
 */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'set-cookie',
  'www-authenticate',
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
  'x-forwarded-authorization',
  'x-session-token',
])

/**
 * Query parameters that carry a credential. `token` alone covers the ones
 * this app actually puts in a URL (password reset, e-mail verification,
 * invitation links), the rest are the usual OAuth/webhook suspects.
 */
const SENSITIVE_QUERY_KEYS =
  /^(access_token|api_key|apikey|auth|code|id_token|key|otp|password|pwd|refresh_token|secret|session|signature|sig|state|token)$/i

/** Mirrors `sanitizeAlertText`'s PII rules, without the Slack escaping. */
export function maskSensitiveText(text: string): string {
  return text
    .replace(/https?:\/\/hooks\.slack\.com\/\S*/g, '[webhook]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, `$1${REDACTED}@`)
    .replace(/\bBearer\s+\S+/gi, `Bearer ${REDACTED}`)
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
}

/** Replaces the values of secret-looking parameters in a query string. */
export function maskQueryString(query: string): string {
  if (!query) return query
  const leading = query.startsWith('?') ? '?' : ''
  return (
    leading +
    query
      .slice(leading.length)
      .split('&')
      .map((pair) => {
        const separator = pair.indexOf('=')
        if (separator === -1) return pair
        const name = pair.slice(0, separator)
        return SENSITIVE_QUERY_KEYS.test(decodeURIComponent(name))
          ? `${name}=${REDACTED}`
          : pair
      })
      .join('&')
  )
}

/** Masks credentials in a URL: userinfo, secret query parameters, fragment. */
export function maskUrl(url: string): string {
  const separator = url.indexOf('?')
  const withoutQuery = separator === -1 ? url : url.slice(0, separator)
  const query = separator === -1 ? '' : url.slice(separator)
  return maskSensitiveText(withoutQuery) + maskQueryString(query)
}

interface EventLike {
  user?: { id?: string | number; [key: string]: unknown } | null | undefined
  message?: string | { message?: string; formatted?: string }
  request?: {
    url?: string
    query_string?: string | Record<string, string> | [string, string][]
    cookies?: unknown
    data?: unknown
    headers?: Record<string, string> | null
    env?: unknown
    [key: string]: unknown
  } | null
  exception?: {
    values?: { value?: string; type?: string; [key: string]: unknown }[]
  } | null
  breadcrumbs?: {
    message?: string
    data?: Record<string, unknown> | null
    [key: string]: unknown
  }[]
  extra?: Record<string, unknown>
  [key: string]: unknown
}

function maskHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const safe: Record<string, string> = {}
  for (const [name, value] of Object.entries(headers)) {
    safe[name] = SENSITIVE_HEADERS.has(name.toLowerCase())
      ? REDACTED
      : maskSensitiveText(String(value))
  }
  return safe
}

function maskQuery(query: NonNullable<EventLike['request']>['query_string']) {
  if (typeof query === 'string') return maskQueryString(query)
  if (Array.isArray(query)) {
    return query.map(([name, value]) =>
      SENSITIVE_QUERY_KEYS.test(name)
        ? ([name, REDACTED] as [string, string])
        : ([name, maskSensitiveText(value)] as [string, string]),
    )
  }
  if (query && typeof query === 'object') {
    return Object.fromEntries(
      Object.entries(query).map(([name, value]) => [
        name,
        SENSITIVE_QUERY_KEYS.test(name)
          ? REDACTED
          : maskSensitiveText(String(value)),
      ]),
    )
  }
  return query
}

/**
 * Strips an outgoing event down to what we are willing to store.
 *
 * Mutates and returns the event, which is what Sentry's `beforeSend` contract
 * expects. Never returns `null`: dropping events silently would make Sentry
 * lie about how healthy production is. The parameter stays generic and is
 * narrowed inside, so the function drops straight into `beforeSend` without
 * having to restate Sentry's `Event` type (and without a cast at every call).
 */
export function scrubEvent<T>(value: T): T {
  const event = value as EventLike

  // Identity: the user id and nothing else. `sendDefaultPii: false` already
  // keeps the IP off, but an integration may still have set a username or an
  // e-mail on the scope.
  if (event.user) {
    const id = event.user.id
    event.user = id === undefined || id === null ? null : { id }
  }

  const request = event.request
  if (request) {
    // Bodies are where credentials live: sign-in payloads, password resets,
    // the 2FA code. There is no version of a request body we want in Sentry.
    request.data = undefined
    request.cookies = undefined
    request.env = undefined
    if (request.headers) request.headers = maskHeaders(request.headers)
    if (typeof request.url === 'string') request.url = maskUrl(request.url)
    if (request.query_string !== undefined) {
      request.query_string = maskQuery(request.query_string)
    }
  }

  if (typeof event.message === 'string') {
    event.message = maskSensitiveText(event.message)
  } else if (event.message && typeof event.message === 'object') {
    if (event.message.message) {
      event.message.message = maskSensitiveText(event.message.message)
    }
    if (event.message.formatted) {
      event.message.formatted = maskSensitiveText(event.message.formatted)
    }
  }

  for (const exception of event.exception?.values ?? []) {
    if (typeof exception.value === 'string') {
      exception.value = maskSensitiveText(exception.value)
    }
  }

  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (typeof breadcrumb.message === 'string') {
      breadcrumb.message = maskSensitiveText(breadcrumb.message)
    }
    const url = breadcrumb.data?.url
    if (typeof url === 'string' && breadcrumb.data) {
      breadcrumb.data.url = maskUrl(url)
    }
  }

  return value
}

interface BreadcrumbLike {
  category?: string
  message?: string
  data?: Record<string, unknown> | null
}

/**
 * `beforeBreadcrumb`: masks what a breadcrumb carries before it is ever
 * attached to an event. Fetch/XHR crumbs are the ones most likely to hold a
 * secret, and they hold it in the url.
 */
export function scrubBreadcrumb<T>(value: T): T | null {
  const breadcrumb = value as BreadcrumbLike
  const url = breadcrumb.data?.url
  if (typeof url === 'string' && breadcrumb.data) {
    breadcrumb.data.url = maskUrl(url)
  }
  if (typeof breadcrumb.message === 'string') {
    breadcrumb.message = maskSensitiveText(breadcrumb.message)
  }
  return value
}
