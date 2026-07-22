import { cookies } from 'next/headers';
import crypto from 'crypto';
import { redis } from '@/lib/redis';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

// --- Token encryption (AES-256-GCM) ---

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENC_PREFIX = 'enc:';
const SESSION_TTL = 604800; // 7 days

let _encKey: Buffer | null | undefined;

function getEncryptionKey(): Buffer | null {
  if (_encKey !== undefined) return _encKey;

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn(
      'SESSION_SECRET not set — Plex auth tokens will be stored unencrypted in Redis. ' +
      'Set SESSION_SECRET in your environment to enable encryption.'
    );
    _encKey = null;
    return null;
  }

  // Derive a 32-byte AES-256 key from the secret via SHA-256
  _encKey = crypto.createHash('sha256').update(secret).digest();
  return _encKey;
}

function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext; // fallback: no encryption key available

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // enc:base64(iv || tag || ciphertext)
  return ENC_PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptToken(encoded: string): string {
  if (!encoded || !encoded.startsWith(ENC_PREFIX)) {
    return encoded; // legacy plaintext token (backward-compatible)
  }

  const key = getEncryptionKey();
  if (!key) {
    throw new Error(
      'SESSION_SECRET not set but encrypted session token found — cannot decrypt. ' +
      'Set SESSION_SECRET to the same value used when the session was created.'
    );
  }

  const buf = Buffer.from(encoded.slice(ENC_PREFIX.length), 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

// --- Session management ---

/**
 * Create a new session for a user, storing the (optionally encrypted) Plex
 * auth token in Redis and tracking the session in a per-user set for bulk
 * logout support. Returns the opaque session token to set as a cookie.
 */
export async function createSession(plexId: string, authToken: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const encryptedToken = encryptToken(authToken);

  await redis.set(
    `session:${sessionToken}`,
    JSON.stringify({ plexId, authToken: encryptedToken }),
    'EX',
    SESSION_TTL,
  );

  // Track all active sessions for this user so logout can kill all devices
  await redis.sadd(`user_sessions:${plexId}`, sessionToken);
  await redis.expire(`user_sessions:${plexId}`, SESSION_TTL);

  return sessionToken;
}

/**
 * Look up a session by its opaque token. Decrypts the stored Plex auth token
 * (or reads legacy plaintext tokens). On each access the TTL is refreshed
 * (sliding expiration), so active sessions stay alive while abandoned ones
 * expire naturally.
 */
export async function getSession(sessionToken: string) {
  const sessionData = await redis.get(`session:${sessionToken}`);

  if (!sessionData) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(sessionData);
    const plexId = String(parsedSession.plexId);
    const rawToken = parsedSession.authToken;
    const authToken = decryptToken(rawToken);

    // Look up user details in the database
    const user = await db.select().from(users).where(eq(users.plexId, plexId)).get();

    if (!user) {
      return null;
    }

    // Sliding TTL: refresh expiration on each access so active sessions
    // persist and idle/stolen sessions expire after 7 days of disuse.
    await redis.expire(`session:${sessionToken}`, SESSION_TTL);
    await redis.expire(`user_sessions:${plexId}`, SESSION_TTL);

    return {
      plexId,
      authToken,
      isAdmin: user.isAdmin,
      username: user.username,
      avatarUrl: user.avatarUrl,
    };
  } catch (error) {
    console.error('Error parsing session data:', error);
    return null;
  }
}

/**
 * Terminate every active session for a user — logs them out of all devices.
 * Uses the per-user session set to find and delete all tokens in one pipeline.
 */
export async function destroyAllSessions(plexId: string): Promise<void> {
  const members = await redis.smembers(`user_sessions:${plexId}`);
  if (members.length > 0) {
    const pipeline = redis.pipeline();
    members.forEach((token: string) => pipeline.del(`session:${token}`));
    pipeline.del(`user_sessions:${plexId}`);
    await pipeline.exec();
  }
}

export async function requireAuth() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;

  if (!sessionToken) {
    redirect('/');
  }

  const session = await getSession(sessionToken);

  if (!session) {
    redirect('/');
  }

  return session;
}
