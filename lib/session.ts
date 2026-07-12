import { redis } from '@/lib/redis';
import { db } from '@/lib/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getSession(sessionToken: string) {
  // Look up the session in Redis
  const sessionData = await redis.get(`session:${sessionToken}`);
  
  if (!sessionData) {
    return null;
  }
  
  try {
    const parsedSession = JSON.parse(sessionData);
    const { plexId, authToken } = parsedSession;
    
    // Look up user details in the database
    const user = await db.select().from(users).where(eq(users.plexId, String(plexId))).get();
    
    if (!user) {
      return null;
    }
    
    return {
      plexId,
      authToken,
      isAdmin: user.isAdmin,
      username: user.username
    };
  } catch (error) {
    console.error('Error parsing session data:', error);
    return null;
  }
}
