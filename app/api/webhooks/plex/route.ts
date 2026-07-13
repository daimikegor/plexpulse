import { NextResponse } from 'next/server';
import { invalidatePlexLibraryCache } from '@/lib/plex-library';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const payloadStr = formData.get('payload');
    if (!payloadStr) {
      return NextResponse.json({ error: 'No payload' }, { status: 400 });
    }
    const payload = JSON.parse(payloadStr as string);

    if (payload.event === 'library.new' || payload.event === 'library.on.deck') {
      await invalidatePlexLibraryCache();
      console.log('Plex library cache invalidated due to webhook event:', payload.event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Plex webhook:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
