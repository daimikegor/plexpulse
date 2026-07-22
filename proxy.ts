import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Global middleware — defense-in-depth layer that runs before every request.
 *
 * 1. Auth guard: verifies the session_token cookie exists for protected routes.
 *    Individual API routes and pages also enforce auth via requireAuth(), but
 *    this catch-all prevents new routes from accidentally shipping without auth.
 * 2. Security headers: belt-and-suspenders — applied here in addition to the
 *    headers() config in next.config.js (some headers only work in middleware).
 */

// Paths that do NOT require authentication
const PUBLIC_PATHS = [
  '/',
  '/api/auth/',
  '/icon.svg',
  '/_next/',
  '/favicon.ico',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // --- Security headers (belt-and-suspenders) ---
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // --- Auth guard ---
  if (!isPublic(pathname)) {
    const sessionToken = request.cookies.get('session_token')?.value;
    if (!sessionToken) {
      // API routes: return 401 so clients get a clear signal
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      // Page routes: redirect to login
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  // Apply to all routes except static assets and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
