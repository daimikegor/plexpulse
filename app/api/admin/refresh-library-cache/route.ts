import { NextResponse } from 'next/server';
import { invalidatePlexLibraryCache } from '@/lib/plex-library';

export async function POST() {
  await invalidatePlexLibraryCache();
  return NextResponse.json({ success: true });
}
