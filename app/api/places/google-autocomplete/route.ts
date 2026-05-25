import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!input) {
    return NextResponse.json({ places: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MISSING_API_KEY' }, { status: 401 });
  }

  try {
    const body: any = {
      textQuery: input,
      languageCode: 'pt-BR'
    };

    if (lat && lon) {
      body.locationBias = {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lon) },
          radius: 50000.0 // 50km
        }
      };
    }

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
      const errorText = await response.text();
      return NextResponse.json({ error: 'Google Places Search Text failed', details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Google Search Text] Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
