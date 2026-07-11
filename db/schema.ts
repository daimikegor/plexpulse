import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  plexId: text('plex_id').primaryKey(),
  username: text('username').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).default(false),
});
