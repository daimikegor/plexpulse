import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';
const sqlite = createClient({
  url: process.env.DATABASE_URL || 'file:./data/plexpulse.db',
  ...(process.env.DB_ENCRYPTION_KEY
    ? { encryptionKey: process.env.DB_ENCRYPTION_KEY }
    : {}),
});
export const db = drizzle(sqlite, { schema });
