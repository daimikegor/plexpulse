import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { redis } from '@/lib/redis';
import { isTrustedOrigin } from '@/lib/origin';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const rl = await rateLimit(request, RATE_LIMITS['auth-start']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clientID = process.env.PLEX_CLIENT_ID || 'plexpulse-default-id';

  try {
    const res = await fetch('https://plex.tv/api/v2/pins', {
      method: 'POST',
      headers: {
        'X-Plex-Client-Identifier': clientID,
        'X-Plex-Product': 'PlexPulse',
        'X-Plex-Version': '1.0',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({ strong: 'true' })
    });

    if (!res.ok) throw new Error('Failed to create PIN');
    const data = await res.json();

    // Bind a CSRF nonce to this PIN to prevent login hijacking
    const nonce = crypto.randomBytes(16).toString('hex');
    await redis.set(`pin_nonce:${data.id}`, nonce, 'EX', 300); // 5 min TTL, matches PIN lifetime

    return NextResponse.json({ pinId: data.id, code: data.code, nonce, clientID });
  } catch (error) {
    console.error('PIN creation failed:', error);
    return NextResponse.json({ error: 'Failed to initiate Plex login' }, { status: 500 });
  }
}
