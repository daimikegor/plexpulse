import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { redis } from '@/lib/redis';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, RATE_LIMITS['auth-check']);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const pinId = searchParams.get('pinId');
  const nonce = searchParams.get('nonce');

  if (!pinId || !nonce) {
    return NextResponse.json({ error: 'Missing pinId or nonce' }, { status: 400 });
  }

  // Validate CSRF nonce bound to this PIN at start time
  const storedNonce = await redis.get(`pin_nonce:${pinId}`);
  if (!storedNonce || storedNonce !== nonce) {
    return NextResponse.json({ error: 'Invalid or expired nonce' }, { status: 403 });
  }
  // One-time use: delete nonce after validation
  await redis.del(`pin_nonce:${pinId}`);

  try {
    const res = await fetch(`https://plex.tv/api/v2/pins/${pinId}`, {
      headers: {
        'X-Plex-Client-Identifier': process.env.PLEX_CLIENT_ID || 'plexpulse-default-id',
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) throw new Error('Failed to check PIN status');
    const data = await res.json();

    if (data.authToken) {
      // Auth successful: fetch user profile
      const userRes = await fetch('https://plex.tv/api/v2/user', {
        headers: { 'X-Plex-Token': data.authToken, 'Accept': 'application/json' }
      });
      const userData = await userRes.json();

      // Admin check: user must be in the ADMIN_PLEX_IDS allowlist
      const adminIds = (process.env.ADMIN_PLEX_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
      const isAdmin = adminIds.includes(String(userData.id));
      if (!process.env.ADMIN_PLEX_IDS) {
        console.warn('ADMIN_PLEX_IDS not set — no users will have admin access');
      }

      // Upsert user record
      await db.insert(users).values({
        plexId: String(userData.id),
        username: userData.username || userData.title,
        isAdmin,
        avatarUrl: userData.thumb || null
      }).onConflictDoUpdate({
        target: users.plexId,
        set: { username: userData.username || userData.title, isAdmin, avatarUrl: userData.thumb || null }
      });

      // Create secure session & map to Redis for fast retrieval
      const sessionToken = crypto.randomBytes(32).toString('hex');
      await redis.set(
        `session:${sessionToken}`,
        JSON.stringify({ plexId: userData.id, authToken: data.authToken }),
        'EX', 604800 // 7 days TTL
      );

      const resObj = NextResponse.json({ authenticated: true });
      resObj.cookies.set('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.IS_HTTPS === 'true',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
      return resObj;
    }

    // Auth not yet complete — re-generate nonce for next poll (PIN still valid, but
    // the old nonce was consumed above)
    const freshNonce = crypto.randomBytes(16).toString('hex');
    await redis.set(`pin_nonce:${pinId}`, freshNonce, 'EX', 300);

    return NextResponse.json({ authenticated: false, nonce: freshNonce });
  } catch (error) {
    console.error('Auth check failed:', error);
    return NextResponse.json({ error: 'Authentication check failed' }, { status: 500 });
  }
}
