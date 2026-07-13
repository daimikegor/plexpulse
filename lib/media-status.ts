import { db } from '@/lib/db';
import { mediaStatus } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { checkRadarrForMovie } from '@/lib/radarr';
import { checkSonarrForShow } from '@/lib/sonarr';
import { checkPlexLibrary } from '@/lib/plex-library';

export async function refreshMediaStatus(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<'none' | 'requested' | 'available'> {
  const id = `${mediaType}-${tmdbId}`;

  const inPlex = await checkPlexLibrary(tmdbId, mediaType);
  let status: 'none' | 'requested' | 'available' = 'none';

  if (inPlex) {
    status = 'available';
  } else {
    const inArr = mediaType === 'movie'
      ? await checkRadarrForMovie(tmdbId)
      : await checkSonarrForShow(tmdbId);
    if (inArr) status = 'requested';
  }

  await db.insert(mediaStatus).values({
    id,
    tmdbId,
    mediaType,
    status,
    lastChecked: new Date(),
  }).onConflictDoUpdate({
    target: mediaStatus.id,
    set: { status, lastChecked: new Date() },
  });

  return status;
}

export async function getCachedMediaStatus(tmdbId: string, mediaType: 'movie' | 'tv'): Promise<'none' | 'requested' | 'available' | null> {
  const id = `${mediaType}-${tmdbId}`;
  const result = await db.select().from(mediaStatus).where(eq(mediaStatus.id, id)).get();
  if (!result) return null;
  // Consider cache stale after 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (new Date(result.lastChecked) < oneHourAgo) return null;
  return result.status as 'none' | 'requested' | 'available';
}
