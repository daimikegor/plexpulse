const { createClient } = require('@libsql/client');

(async () => {
  try {
    const client = createClient({
      url: process.env.DATABASE_URL || 'file:./data/plexpulse.db',
    });

    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        plexId TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        isAdmin BOOLEAN DEFAULT false
      )
    `);

    console.log('Database migration completed.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
})();
