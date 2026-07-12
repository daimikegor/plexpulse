import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';

const sqlite = createClient({
  url: process.env.DATABASE_URL || 'file:./data/plexpulse.db',
});
export const db = drizzle(sqlite, { schema });
import { redis } from '@/lib/redis';

export async function getTrendingContent() {
  // Try to get cached data first
  const cached = await redis.get('tmdb:trending');
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    
    if (!API_KEY) {
      throw new Error('TMDB_API_KEY is not set in environment variables');
    }
    
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/all/week?api_key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache for 2 hours (7200 seconds)
    await redis.setex('tmdb:trending', 7200, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('Error fetching trending content from TMDB:', error);
    return null;
  }
}
import { redis } from '@/lib/redis';

export async function getTrendingContent() {
  // Try to get cached data first
  const cached = await redis.get('tmdb:trending');
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  try {
    const API_KEY = process.env.TMDB_API_KEY;
    
    if (!API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return { results: [] };
    }
    
    const response = await fetch(
      `https://api.themoviedb.org/3/trending/all/week?api_key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache for 2 hours (7200 seconds)
    await redis.setex('tmdb:trending', 7200, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('Error fetching trending content from TMDB:', error);
    return { results: [] };
  }
}
