import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { redis } from '@/lib/redis';

export async function POST() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  
  if (sessionToken) {
    // Delete the session from Redis
    await redis.del(`session:${sessionToken}`);
    
    // Clear the cookie
    cookieStore.delete('session_token');
  }
  
  // Redirect to home page
  return redirect('/');
}
