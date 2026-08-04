import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'nominatim'; // 'nominatim' | 'photon'
  const q = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const viewbox = searchParams.get('viewbox'); // lon-0.5,lat+0.5,lon+0.5,lat-0.5

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
  }

  const cleanText = encodeURIComponent(q);

  try {
    if (type === 'nominatim') {
      const viewboxStr = viewbox ? `&viewbox=${viewbox}` : '';
      const url = `https://nominatim.openstreetmap.org/search?q=${cleanText}&format=json&addressdetails=1&limit=10&countrycodes=br${viewboxStr}`;
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Harpia-App/1.0 (davidbarroso999@gmail.com)',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        },
        next: { revalidate: 3600 } // Cache for 1 hour on server
      });

      if (!res.ok) {
        throw new Error(`Nominatim returned status: ${res.status}`);
      }

      const data = await res.json();
      return NextResponse.json(data);
    } else if (type === 'photon') {
      const photonLocation = (lat && lon) ? `&lat=${lat}&lon=${lon}` : '';
      const url = `https://photon.komoot.io/api/?q=${cleanText}&limit=10${photonLocation}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Harpia-App/1.0 (davidbarroso999@gmail.com)',
          'Accept-Language': 'pt-BR,pt;q=0.9'
        },
        next: { revalidate: 3600 }
      });

      if (!res.ok) {
        throw new Error(`Photon returned status: ${res.status}`);
      }

      const data = await res.json();
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ error: 'Invalid provider type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`[OSM Proxy - ${type}] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
