import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'FATAL: REDIS_URL is not set in production. ' +
      'Redis connections will fail. Set REDIS_URL in your environment.'
    );
  }
  console.warn('REDIS_URL not set — defaulting to redis://localhost:6379 (no auth)');
}

// ioredis enables TLS automatically for rediss:// URLs. Set REDIS_TLS=true
// when using a redis:// URL that connects through a TLS terminator or proxy.
const tlsOpts = process.env.REDIS_TLS === 'true' ? { tls: {} } : {};

export const redis = new Redis(redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  ...tlsOpts,
});
