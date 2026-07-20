import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { findPlexRatingKey, addToPlexWatchlist } from '@/lib/plex-watchlist';
import { db } from '@/lib/db';
import { userRequests } from '@/db/schema';

// Accept requests only from the trusted app origin. Refuses if env var is absent.
function isTrustedOrigin(request: Request): boolean {
  const expected = process.env.NEXT_PUBLIC_APP_URL;
  if (!expected) {
    console.warn(
      'NEXT_PUBLIC_APP_URL is not set — origin checks are disabled. ' +
        'Set this to your app URL (e.g. http://localhost:3000 or https://plexpulse.example.com).',
    );
    return false; // refuse: without a configured origin we cannot validate
  }

  // Strip trailing slash (Origin/Referer can include query strings or paths).
  const trusted = expected.replace(/\/+$/, '');
  const candidateRaw = request.headers.get('origin') || request.headers.get('referer');
  if (!candidateRaw) return false;
  const candidate = candidateRaw.split('?')[0].replace(/\/+$/, '');
  return candidate === trusted;
}

export async function POST(request: Request) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sessionToken = cookies().get('session_token')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const session = await getSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { title, year, mediaType, tmdbId, posterPath } = await request.json();
  const ratingKey = await findPlexRatingKey(title, year, mediaType, session.authToken);
  if (!ratingKey) {
    return NextResponse.json({ error: "Couldn't add automatically — ask the admin to add this one manually." }, { status: 404 });
  }
  const added = await addToPlexWatchlist(ratingKey, session.authToken);
  if (!added) {
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }

  // Insert user request record
  if (tmdbId) {
    const id = `${session.plexId}-${mediaType}-${tmdbId}`;
    await db.insert(userRequests).values({
      id,
      plexId: String(session.plexId),
      tmdbId: String(tmdbId),
      mediaType,
      title,
      posterPath: posterPath || null,
      requestedAt: new Date(),
    }).onConflictDoUpdate({
      target: userRequests.id,
      set: { requestedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true, ratingKey });
}
