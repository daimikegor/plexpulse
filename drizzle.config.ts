import type { Config } from 'drizzle-kit'

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  driver: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/plexpulse.db',
  },
} satisfies Config
