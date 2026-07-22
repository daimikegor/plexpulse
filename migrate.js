const { createClient } = require('@libsql/client');
(async () => {
  try {
    const client = createClient({
      url: process.env.DATABASE_URL || 'file:./data/plexpulse.db',
    });
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        plex_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        avatar_url TEXT
      )
    `);
    try {
      await client.execute(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
    } catch (err) {
      // Ignore error if column already exists (SQLite throws "duplicate column
      // name" in that case, which is expected on repeat runs)
    }
    await client.execute(`
      CREATE TABLE IF NOT EXISTS media_status (
        id TEXT PRIMARY KEY,
        tmdb_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'none',
        last_checked INTEGER NOT NULL
      )
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS user_requests (
        id TEXT PRIMARY KEY,
        plex_id TEXT NOT NULL,
        tmdb_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        title TEXT NOT NULL,
        poster_path TEXT,
        requested_at INTEGER NOT NULL
      )
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS plex_library_scan (
        id TEXT PRIMARY KEY,
        media_type TEXT NOT NULL,
        guids TEXT NOT NULL DEFAULT '[]',
        item_count INTEGER NOT NULL DEFAULT 0,
        last_scan_at INTEGER NOT NULL DEFAULT 0,
        last_scan_success BOOLEAN NOT NULL DEFAULT 0,
        last_scan_error TEXT,
        scan_in_progress BOOLEAN NOT NULL DEFAULT 0
      )
    `);
    console.log('Database migration completed.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();
