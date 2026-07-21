import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { findPlexRatingKey, addToPlexWatchlist } from '@/lib/plex-watchlist';
import { db } from '@/lib/db';
import { userRequests } from '@/db/schema';
import { isTrustedOrigin } from '@/lib/origin';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['watchlist-add']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sessionToken = (await cookies()).get('session_token')?.value;
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
