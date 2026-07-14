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
        is_admin BOOLEAN DEFAULT false
      )
    `);
    await client.execute(`
      CREATE TABLE IF NOT EXISTS media_status (
        id TEXT PRIMARY KEY,
        tmdb_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'none',
        last_checked INTEGER NOT NULL
      )
    `);
    console.log('Database migration completed.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();
