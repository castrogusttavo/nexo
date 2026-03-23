import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from 'next/server'
import { logger } from '@/lib/axiom/server'
import { transformMiddlewareRequest } from '@axiomhq/nextjs'

const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/api/auth']

function buildCspHeader(nonce: string): string {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.axiom.co https://va.vercel-scripts.com;
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
    process.env.NODE_ENV === 'development' &&
    (pathname === '/reference' || pathname === '/openapi.json' || pathname === '/contact' || pathname === '/testes')
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ||
    request.cookies.get('__Secure-better-auth.session_token')?.value

  if (isPublic) {
    if (sessionToken && (pathname === '/sign-in' || pathname === '/sign-up')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return withSecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      nonce,
    )
  }

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
  )
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
