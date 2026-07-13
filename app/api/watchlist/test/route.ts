import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { findPlexRatingKey, addToPlexWatchlist } from '@/lib/plex-watchlist';

export async function POST(request: Request) {
  const sessionToken = cookies().get('session_token')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const session = await getSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const { title, year, mediaType } = await request.json();
  const ratingKey = await findPlexRatingKey(title, year, mediaType, session.authToken);
  if (!ratingKey) {
    return NextResponse.json({ error: 'Could not find matching Plex item', ratingKey: null });
  }
  const added = await addToPlexWatchlist(ratingKey, session.authToken);
  return NextResponse.json({ ratingKey, added });
}
