import { db } from '@/lib/db';
import { plexLibraryScan } from '@/db/schema';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['admin-plex-scan-status']);
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

  const rows = await db.select().from(plexLibraryScan).all();

  const scanData: Record<string, any> = {
    movie: null,
    tv: null,
  };

  for (const row of rows) {
    scanData[row.mediaType] = {
      lastScanAt: row.lastScanAt?.toISOString() ?? null,
      lastScanSuccess: row.lastScanSuccess,
      lastScanError: row.lastScanError,
      itemCount: row.itemCount,
      scanInProgress: row.scanInProgress,
    };
  }

  return NextResponse.json(scanData);
}
