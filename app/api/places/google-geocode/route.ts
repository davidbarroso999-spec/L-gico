import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ places: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MISSING_API_KEY' }, { status: 401 });
  }

  try {
    const body: any = {
      textQuery: address,
      languageCode: 'pt-BR'
    };

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location,places.displayName,places.formattedAddress,places.types'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Google Places Search Text failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Google Geocode proxy] Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
