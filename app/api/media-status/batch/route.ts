import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import {
  getCachedMediaStatusBatch,
  refreshMediaStatusBatch,
  makeKey,
  MediaStatusKey,
} from '@/lib/media-status';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const MAX_BATCH_SIZE = 100;

interface BatchRequestItem {
  tmdbId: string;
  mediaType: 'movie' | 'tv';
}

export async function POST(request: Request) {
  // Rate limit — one batch counts as one request
  const rl = await rateLimit(request, RATE_LIMITS['media-status']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  // Auth
  const sessionToken = (await cookies()).get('session_token')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const session = await getSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // Parse body
  let body: { items?: BatchRequestItem[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.items || !Array.isArray(body.items)) {
    return NextResponse.json(
      { error: 'Missing "items" array in request body' },
      { status: 400 },
    );
  }

  if (body.items.length === 0) {
    return NextResponse.json({ results: [] });
  }

  if (body.items.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE}` },
      { status: 400 },
    );
  }

  // Validate each item
  for (const item of body.items) {
    if (
      !item.tmdbId ||
      (item.mediaType !== 'movie' && item.mediaType !== 'tv')
    ) {
      return NextResponse.json(
        { error: `Invalid item: ${JSON.stringify(item)}` },
        { status: 400 },
      );
    }
  }

  // Deduplicate by composite key (keep first occurrence)
  const seen = new Set<MediaStatusKey>();
  const unique: BatchRequestItem[] = [];
  for (const item of body.items) {
    const key = makeKey(item.mediaType, item.tmdbId);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  // Phase 1: check SQLite cache for all items in one query
  const cached = await getCachedMediaStatusBatch(unique);

  // Phase 2: collect items that need a refresh (cache miss)
  const missing: BatchRequestItem[] = [];
  for (const item of unique) {
    const key = makeKey(item.mediaType, item.tmdbId);
    if (cached.get(key) === null) {
      missing.push(item);
    }
  }

  // Phase 3: refresh missing items in parallel
  let refreshed: Map<MediaStatusKey, 'none' | 'requested' | 'available'> =
    new Map();
  if (missing.length > 0) {
    refreshed = await refreshMediaStatusBatch(missing);
  }

  // Build response (maintain original order, including duplicates)
  const results = body.items.map(item => {
    const key = makeKey(item.mediaType, item.tmdbId);
    const status =
      cached.get(key) ??
      refreshed.get(key) ??
      'none';
    return { tmdbId: item.tmdbId, mediaType: item.mediaType, status };
  });

  return NextResponse.json({ results });
}
