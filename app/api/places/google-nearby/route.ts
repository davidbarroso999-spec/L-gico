import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');
  const radius = parseInt(searchParams.get('radius') || '1000', 10);

  if (!latStr || !lngStr) {
    return NextResponse.json({ places: [] }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MISSING_API_KEY', places: [] }, { status: 401 });
  }

  try {
    // 1. Try Google Places New API nearby search
    const nearbyBody = {
      includedTypes: [
        'supermarket',
        'convenience_store',
        'gas_station',
        'bakery',
        'pharmacy',
        'school',
        'shopping_mall',
        'bank',
        'hospital',
        'store'
      ],
      maxResultCount: 8,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radius
        }
      },
      languageCode: 'pt-BR'
    };

    const newPlacesRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.types'
      },
      body: JSON.stringify(nearbyBody)
    });

    if (newPlacesRes.ok) {
      const data = await newPlacesRes.json();
      if (data.places && Array.isArray(data.places)) {
        const places = data.places.map((p: any) => ({
          name: p.displayName?.text || 'Ponto de Referência',
          type: p.primaryTypeDisplayName?.text || 'Estabelecimento Local',
          address: p.formattedAddress || '',
          location: {
            lat: p.location?.latitude || lat,
            lng: p.location?.longitude || lng
          },
          types: p.types || []
        }));
        return NextResponse.json({ places });
      }
    }

    // Fallback: Google Places Legacy Nearby Search API
    const legacyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&key=${apiKey}&language=pt-BR`;
    const legacyRes = await fetch(legacyUrl);
    if (legacyRes.ok) {
      const legacyData = await legacyRes.json();
      if (legacyData.results && Array.isArray(legacyData.results)) {
        const places = legacyData.results.slice(0, 8).map((p: any) => ({
          name: p.name,
          type: 'Ponto de Referência',
          address: p.vicinity || '',
          location: {
            lat: p.geometry?.location?.lat || lat,
            lng: p.geometry?.location?.lng || lng
          },
          types: p.types || []
        }));
        return NextResponse.json({ places });
      }
    }

    return NextResponse.json({ places: [] });
  } catch (error: any) {
    console.error('[Google Nearby Places] Error:', error);
    return NextResponse.json({ error: error.message, places: [] }, { status: 500 });
  }
}
