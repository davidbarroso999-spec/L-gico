import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || searchParams.get('name');
  const count = searchParams.get('count') || '10';
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Sanitize and clean query for Open-Meteo Geocoding
  const cleanQuery = q
    .replace(/\b(nº|n°|num|no\.|#)\s*\d+/gi, '')
    .replace(/\b(apto|apt|bloco|bl|sala|lote|lt|qd|quadra|km|casa|fundos|sobrado|galpao|galpão|andar|ap)\s*[:.-]?\s*[a-zA-Z0-9]+/gi, '')
    .replace(/,\s*(brasil|brazil)\s*$/i, '')
    .replace(/[^\w\s\,-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const queryToUse = cleanQuery.length >= 2 ? cleanQuery : q.trim();

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryToUse)}&count=${count}&language=pt&format=json`;

    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Harpia-RouteOptimizer/2.0 (open-meteo-geocoder)'
      },
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawResults = data.results || [];

    const formattedResults = rawResults.map((item: any) => {
      const parts: string[] = [];
      if (item.name) parts.push(item.name);
      if (item.admin2 && item.admin2 !== item.name) parts.push(item.admin2);
      if (item.admin1) parts.push(item.admin1);
      if (item.country) parts.push(item.country);

      const postCode = Array.isArray(item.postcodes) && item.postcodes.length > 0 ? item.postcodes[0] : undefined;
      const fullLabel = parts.join(' - ') + (postCode ? ` - CEP ${postCode}` : '');

      return {
        id: item.id,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        elevation: item.elevation,
        country: item.country,
        countryCode: item.country_code,
        state: item.admin1,
        city: item.admin2 || item.admin3 || item.name,
        timezone: item.timezone,
        population: item.population,
        featureCode: item.feature_code,
        postcodes: item.postcodes || [],
        label: fullLabel,
        formattedAddress: parts.join(', '),
        source: 'open-meteo',
        type: 'address'
      };
    });

    // If proximity coordinates are provided, sort by distance
    if (lat && lon) {
      const uLat = parseFloat(lat);
      const uLon = parseFloat(lon);
      if (!isNaN(uLat) && !isNaN(uLon)) {
        formattedResults.sort((a: any, b: any) => {
          const distA = Math.hypot(a.latitude - uLat, a.longitude - uLon);
          const distB = Math.hypot(b.latitude - uLat, b.longitude - uLon);
          return distA - distB;
        });
      }
    }

    return NextResponse.json({
      query: q,
      results: formattedResults
    });
  } catch (err: any) {
    console.error('[Open-Meteo Geocoding API] Error:', err.message);
    return NextResponse.json({
      error: err.message,
      results: []
    }, { status: 500 });
  }
}
