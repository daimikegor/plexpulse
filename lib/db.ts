import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';
const sqlite = createClient({
  url: process.env.DATABASE_URL || 'file:./data/plexpulse.db',
});
export const db = drizzle(sqlite, { schema });
