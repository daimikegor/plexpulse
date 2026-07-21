import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { redis } from '@/lib/redis';
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
    // Delete the session from Redis
    await redis.del(`session:${sessionToken}`);

    // Clear the cookie
    cookieStore.delete('session_token');
  }

  // Redirect to home page
  return redirect('/');
}
