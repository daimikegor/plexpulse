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
    return NextResponse.json({ error: 'No match found' }, { status: 404 });
  }
  const added = await addToPlexWatchlist(ratingKey, session.authToken);
  if (!added) {
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
  }
  return NextResponse.json({ success: true, ratingKey });
}
