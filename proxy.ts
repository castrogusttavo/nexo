import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from 'next/server'
import { logger } from '@/lib/axiom/server'
import { NEXT_PUBLIC_REALTIME_URL, NODE_ENV } from '@/lib/env/env'
import { transformMiddlewareRequest } from '@axiomhq/nextjs'

const PUBLIC_ROUTES = [
  '/', '/sign-in', '/sign-up', '/forget-password',
  '/reset-password', '/api/auth', '/api/status',
  '/api/payment/webhook', '/docs', '/legals',
  '/status', '/pricing', '/talk-to-sales',
  '/marketplace', '/invite', '/api/talk-to-sales',
  '/careers', '/api/careers', '/api/health', '/blog',
  '/robots.txt', '/sitemap.xml', '/opengraph-image',
  '/twitter-image', '/icon', '/apple-icon', '/manifest.webmanifest',
  '/llms.txt', '/work-trials', '/security', '/about', '/manifesto', '/switch',
  '/contact', '/customers'
]

// style-src keeps 'unsafe-inline' as a deliberate trade-off, not an
// oversight: our UI primitives (Radix/Base UI popovers, tooltips, dropdowns)
// position themselves via inline style="" attributes, and CSP has no
// nonce/hash mechanism for the style attribute (only for <style>
// elements/blocks). Dropping unsafe-inline here would break floating-UI
// positioning app-wide. Re-evaluate if/when the UI kit moves off inline
// transforms.
// script-src carries the same kind of trade-off, forced by cacheComponents:
// the shell is prerendered at build time, so neither its bootstrap
// <script src> tags nor the ~50 inline scripts Next streams per request can
// carry a per-request nonce, and the inline payload differs on every
// request, so hashes are out too. A nonce (or 'strict-dynamic', which makes
// browsers ignore 'self') blocks the whole shell and the app never
// hydrates. 'self' + 'unsafe-inline' still refuses scripts from any other
// origin and refuses eval in production, which is what this CSP is mainly
// buying us -- uploads are served from the storage subdomain, not from this
// origin. Revisit if cacheComponents is ever turned off: full dynamic
// rendering makes the nonce path work end to end.
function buildCspHeader(): string {
  return `
    default-src 'self';
    script-src 'self' 'unsafe-inline'${NODE_ENV === 'development' ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:${NODE_ENV === 'development' ? ' http://localhost:9000' : ''};
    media-src 'self' blob: https:${NODE_ENV === 'development' ? ' http://localhost:9000' : ''};
    font-src 'self';
    connect-src 'self' blob: data: https://*.axiom.co https://va.vercel-scripts.com https://cdn.jsdelivr.net ${NEXT_PUBLIC_REALTIME_URL}${NODE_ENV === 'development' ? ' ws://localhost:4444' : ''};
    frame-src https://www.figma.com https://www.loom.com https://www.youtube.com https://docs.google.com;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    object-src 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', buildCspHeader())
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  )
  return response
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  logger.info(...transformMiddlewareRequest(request))

  event.waitUntil(logger.flush())

  const { pathname } = request.nextUrl

  if (
    NODE_ENV === 'development' &&
    (pathname === '/reference' || pathname === '/openapi.json' || pathname === '/contact' || pathname === '/testes')
  ) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )

  if (isPublic) {
    return withSecurityHeaders(NextResponse.next())
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
    // Preserves the destination (path + query) to return to after login.
    const redirectTo = encodeURIComponent(pathname + request.nextUrl.search)
    return NextResponse.redirect(
      new URL(`/sign-in?redirect=${redirectTo}`, request.url),
    )
  }

  return withSecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)'],
}
