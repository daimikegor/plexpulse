import { db } from '@/lib/db';
import { plexLibraryScan } from '@/db/schema';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
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

  // Return both raw rows and a human-readable summary
  const summary = rows.map((r) => ({
    id: r.id,
    mediaType: r.mediaType,
    itemCount: r.itemCount,
    lastScanAt: r.lastScanAt?.toISOString() ?? null,
    lastScanSuccess: r.lastScanSuccess,
    lastScanError: r.lastScanError,
    scanInProgress: r.scanInProgress,
    guidSample: (() => {
      try {
        const guids = JSON.parse(r.guids);
        return `${guids.length} IDs: [${guids.slice(0, 5).join(', ')}${guids.length > 5 ? ', ...' : ''}]`;
      } catch {
        return `unparseable (${r.guids.length} chars)`;
      }
    })(),
  }));

  return NextResponse.json({
    rows,
    summary,
    rowCount: rows.length,
  });
}
