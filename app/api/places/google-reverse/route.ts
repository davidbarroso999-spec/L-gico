import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat or lng parameter' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MISSING_API_KEY' }, { status: 401 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=pt-BR&region=br`;
    const res = await fetch(url);
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Google Geocoding API request failed' }, { status: res.status });
    }

    const data = await res.json();
    if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
      const topResult = data.results[0];
      const comps = topResult.address_components || [];

      const streetNumber = comps.find((c: any) => c.types.includes('street_number'))?.long_name || '';
      const route = comps.find((c: any) => c.types.includes('route'))?.long_name || '';
      const suburb = comps.find((c: any) => c.types.includes('sublocality') || c.types.includes('sublocality_level_1') || c.types.includes('neighborhood'))?.long_name || '';
      const city = comps.find((c: any) => c.types.includes('locality'))?.long_name || comps.find((c: any) => c.types.includes('administrative_area_level_2'))?.long_name || 'Manaus';
      const state = comps.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name || 'AM';
      const postalCode = comps.find((c: any) => c.types.includes('postal_code'))?.long_name || '';

      return NextResponse.json({
        formattedAddress: topResult.formatted_address,
        road: route,
        number: streetNumber,
        suburb,
        city,
        state,
        postalCode,
        placeId: topResult.place_id,
        results: data.results.slice(0, 3)
      });
    }

    return NextResponse.json({ error: 'No results found', results: [] });
  } catch (error: any) {
    console.error('[Google Reverse Geocode] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
