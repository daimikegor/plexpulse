import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { redis } from '@/lib/redis';
import { getSession, destroyAllSessions } from '@/lib/session';
import { isTrustedOrigin } from '@/lib/origin';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['auth-logout']);
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  if (!isTrustedOrigin(request)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (sessionToken) {
    // Look up the session to get the user's plexId, then kill ALL sessions
    // for that user (multi-device logout). Falls back to single-token delete
    // if the session is already expired or the DB user is gone.
    const session = await getSession(sessionToken);
    if (session) {
      await destroyAllSessions(session.plexId);
    } else {
      // Session expired or user removed — clean up this token at minimum
      await redis.del(`session:${sessionToken}`);
    }

    // Clear the cookie
    cookieStore.delete('session_token');
  }

  // Redirect to home page
  return redirect('/');
}
