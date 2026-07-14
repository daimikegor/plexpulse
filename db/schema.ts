import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  plexId: text('plex_id').primaryKey(),
  username: text('username').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).default(false),
  avatarUrl: text('avatar_url'),
});

export const mediaStatus = sqliteTable('media_status', {
  id: text('id').primaryKey(), // format: `${mediaType}-${tmdbId}`, e.g. "movie-12345"
  tmdbId: text('tmdb_id').notNull(),
  mediaType: text('media_type').notNull(), // 'movie' | 'tv'
  status: text('status').notNull().default('none'), // 'none' | 'requested' | 'available'
  lastChecked: integer('last_checked', { mode: 'timestamp' }).notNull(),
});

export const userRequests = sqliteTable('user_requests', {
  id: text('id').primaryKey(), // format: `${plexId}-${mediaType}-${tmdbId}`
  plexId: text('plex_id').notNull(),
  tmdbId: text('tmdb_id').notNull(),
  mediaType: text('media_type').notNull(),
  title: text('title').notNull(),
  posterPath: text('poster_path'),
  requestedAt: integer('requested_at', { mode: 'timestamp' }).notNull(),
});
