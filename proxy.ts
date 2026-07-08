import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from 'next/server'
import { logger } from '@/lib/axiom/server'
import { NODE_ENV } from '@/lib/env/env'
import { transformMiddlewareRequest } from '@axiomhq/nextjs'

const PUBLIC_ROUTES = [
  '/', '/sign-in', '/sign-up', '/forget-password',
  '/reset-password', '/api/auth', '/api/status',
  '/api/payment/webhook', '/docs', '/legals',
  '/status', '/pricing', '/talk-to-sales',
  '/marketplace', '/invite', '/api/talk-to-sales'
]

function buildCspHeader(nonce: string): string {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${NODE_ENV === 'development' ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    connect-src 'self' https://*.axiom.co https://va.vercel-scripts.com https://cdn.jsdelivr.net${NODE_ENV === 'development' ? ' ws://localhost:4444' : ''};
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    object-src 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function withSecurityHeaders(
  response: NextResponse,
  nonce: string,
): NextResponse {
  response.headers.set('Content-Security-Policy', buildCspHeader(nonce))
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  )
  return response
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  logger.info(...transformMiddlewareRequest(request))

  event.waitUntil(logger.flush())

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const { pathname } = request.nextUrl

  if (
    NODE_ENV === 'development' &&
    (pathname === '/reference' || pathname === '/openapi.json' || pathname === '/contact' || pathname === '/testes')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (isPublic) {
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce,
    )
  }

  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ||
    request.cookies.get('__Secure-better-auth.session_token')?.value

  if (!sessionToken) {
    // API routes should return 401, not redirect to the sign-in page.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, statusCode: 401, error: { code: 'UNAUTHORIZED' } },
        { status: 401 },
      )
    }
    // Preserva o destino (path + query) para voltar após o login.
    const redirectTo = encodeURIComponent(pathname + request.nextUrl.search)
    return NextResponse.redirect(
      new URL(`/sign-in?redirect=${redirectTo}`, request.url),
    )
  }

  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
  )
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)'],
}
