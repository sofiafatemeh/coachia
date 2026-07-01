import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, isValidSessionToken } from '@/lib/auth'

// Next 16 renamed the `middleware` file convention to `proxy` and runs it on the
// Node.js runtime. This gate protects every page and API route behind the
// single-user session cookie, except the login page and login endpoint.
const PUBLIC_PATHS = ['/login', '/api/auth/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (isValidSessionToken(token)) {
    return NextResponse.next()
  }

  // Unauthenticated: APIs get a 401, pages get redirected to the login screen.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Run on everything except Next internals and static image assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
}
