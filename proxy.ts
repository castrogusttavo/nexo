import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent
} from 'next/server'
import { logger } from "@/lib/axiom/server";
import { transformMiddlewareRequest } from "@axiomhq/nextjs";

const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/api/auth']

export function proxy(request: NextRequest, event: NextFetchEvent) {
  logger.info(...transformMiddlewareRequest(request));

  event.waitUntil(logger.flush());

  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ||
    request.cookies.get('__Secure-better-auth.session_token')?.value

  if (isPublic) {
    if (sessionToken && (pathname === '/sign-in' || pathname === '/sign-up')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (!sessionToken) {
    const signInUrl = new URL('/sign-in', request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
