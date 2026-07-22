import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { runPlexLibraryScan } from '@/lib/plex-library';

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['admin-plex-scan']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const sessionToken = (await cookies()).get('session_token')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const session = await getSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  if (!session.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let mediaType: 'movie' | 'tv' | undefined;
  try {
    const body = await request.json();
    if (body.mediaType === 'movie' || body.mediaType === 'tv') {
      mediaType = body.mediaType;
    }
  } catch {
    // No body or invalid JSON — scan both
  }

  // Fire-and-forget: the scan runs in the background while we respond
  // immediately.  The Node.js process stays alive because the promise is
  // pending, and the scan_in_progress flag prevents concurrent scans.
  runPlexLibraryScan(mediaType).catch((err) => {
    console.error('Plex library scan failed:', err);
  });

  return NextResponse.json({ started: true }, { status: 202 });
}
