import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  
  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!apiKey) {
    return NextResponse.json({ error: 'MISSING_API_KEY' }, { status: 401 });
  }

  try {
    const proximity = (lat && lon) ? `&proximity=${lon},${lat}` : '';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=br&language=pt&autocomplete=true&limit=10${proximity}&access_token=${apiKey}`;

    const res = await fetch(url);

    if (!res.ok) {
        const errorText = await res.text();
        console.error("[Mapbox API] Route Error:", res.status, errorText);
        return NextResponse.json({ error: "Mapbox API failed", details: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("[Mapbox API] Request failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
