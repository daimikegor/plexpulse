import { NextResponse } from 'next/server';

export async function POST() {
  const clientID = process.env.NEXT_PUBLIC_PLEX_CLIENT_ID || 'plexpulse-default-id';
  
  try {
    const res = await fetch('https://plex.tv/api/v2/pins', {
      method: 'POST',
      headers: {
        'X-Plex-Client-Identifier': clientID,
        'X-Plex-Product': 'PlexPulse',
        'X-Plex-Version': '1.0',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({ strong: 'true' })
    });

    if (!res.ok) throw new Error('Failed to create PIN');
    const data = await res.json();
    
    return NextResponse.json({ pinId: data.id, code: data.code });
  } catch (error) {
    console.error('PIN creation failed:', error);
    return NextResponse.json({ error: 'Failed to initiate Plex login' }, { status: 500 });
  }
}
