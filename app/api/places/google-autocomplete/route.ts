import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!input) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MISSING_API_KEY' }, { status: 401 });
  }

  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${apiKey}&language=pt-BR&components=country:br`;

    if (lat && lon) {
      url += `&location=${lat},${lon}&radius=50000`; // 50km bias
    }

    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Google Places Autocomplete failed' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Google Autocomplete] Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
