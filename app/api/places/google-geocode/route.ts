import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  if (!address || address.trim().length === 0) {
    return NextResponse.json({ places: [] });
  }

  const rawQuery = address.trim();

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'MISSING_API_KEY' }, { status: 401 });
  }

  try {
    const norm = rawQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Strict check for explicit outside state: only match if formatted as a state indicator (e.g. ", SP", "- RJ", "em São Paulo", "São Paulo - SP")
    // This ensures streets like "Rua Maceió", "Rua Salvador", "Rua Pará", "Av. Brasil", "Rua São Paulo" in Manaus are NOT falsely treated as other states!
    const isExplicitOutsideState = /(?:,\s*|-\s*|\bem\s+)(sp|sao paulo|rj|rio de janeiro|mg|minas gerais|pr|parana|rs|sc|df|brasilia|ce|ceara|pe|pernambuco|ba|bahia|pa|para|go|goias|mt|ms|es|ac|al|ap|ma|pb|pi|rn|ro|rr|se|to)\b/i.test(norm)
      || /\b(sao paulo|rio de janeiro|belo horizonte|curitiba|porto alegre|salvador|fortaleza|recife|brasilia|goiania|belem|campinas|guarulhos|santos)\s*-\s*[a-z]{2}\b/i.test(norm);

    // Determine location bias center (Default to Manaus -3.119, -60.021 if in AM context)
    let biasLat = -3.119;
    let biasLng = -60.021;
    if (latParam && lngParam) {
      const parsedLat = parseFloat(latParam);
      const parsedLng = parseFloat(lngParam);
      if (!isNaN(parsedLat) && !isNaN(parsedLng) && (parsedLat !== 0 || parsedLng !== 0)) {
        biasLat = parsedLat;
        biasLng = parsedLng;
      }
    }

    // Determine optimal search query
    let queryToUse = rawQuery;
    const hasManausContext = norm.includes('manaus') || norm.includes('amazonas') || norm.includes('am -') || norm.includes('am-') || /,\s*am\b/.test(norm);
    if (!hasManausContext && !isExplicitOutsideState) {
      queryToUse = `${rawQuery}, Manaus - AM`;
    }

    // Google Places Text Search (New) - High accuracy across addresses, landmarks, POIs and streets
    const body: any = {
      textQuery: queryToUse,
      languageCode: 'pt-BR'
    };

    if (!isExplicitOutsideState) {
      body.locationBias = {
        circle: {
          center: { latitude: biasLat, longitude: biasLng },
          radius: 50000.0 // Google Places requires max 50000.0 meters
        }
      };
    }

    const textSearchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location,places.displayName,places.formattedAddress,places.types,places.addressComponents'
      },
      body: JSON.stringify(body)
    });

    if (textSearchRes.ok) {
      const textSearchData = await textSearchRes.json();
      if (Array.isArray(textSearchData.places) && textSearchData.places.length > 0) {
        // Filter out any results that might have drifted outside Brazil
        let filteredPlaces = textSearchData.places.filter((p: any) => {
          const formatted = (p.formattedAddress || '').toLowerCase();
          const lat = p.location?.latitude ?? 0;
          const lon = p.location?.longitude ?? 0;

          // Reject if in North America / Oregon container region (lat > 10)
          if (lat > 10 || lon > -30 || lon < -80) return false;

          // If AM context, ensure it's in Brazil
          return formatted.includes('brasil') || formatted.includes('brazil') || (lat < 5 && lat > -35);
        });

        // If in local/Amazonas context, sort by distance to biasLat, biasLng to guarantee closest regional match
        if (!isExplicitOutsideState && filteredPlaces.length > 1) {
          filteredPlaces.sort((a: any, b: any) => {
            const latA = a.location?.latitude ?? 0;
            const lonA = a.location?.longitude ?? 0;
            const latB = b.location?.latitude ?? 0;
            const lonB = b.location?.longitude ?? 0;
            const distA = Math.hypot(latA - biasLat, lonA - biasLng);
            const distB = Math.hypot(latB - biasLat, lonB - biasLng);
            return distA - distB;
          });
        }

        if (filteredPlaces.length > 0) {
          const parsed = filteredPlaces.map((item: any) => {
            const comps = item.addressComponents || [];
            const getComp = (types: string[]) => comps.find((c: any) => types.some(t => c.types?.includes(t)))?.longText;
            const postalCode = getComp(['postal_code']);
            const streetNumber = getComp(['street_number']);
            const route = getComp(['route']);
            const sublocality = getComp(['sublocality_level_1', 'sublocality', 'neighborhood', 'bairro']);

            let displayNameText = item.displayName?.text || '';
            if (route && streetNumber && !displayNameText.includes(streetNumber)) {
              displayNameText = `${route}, ${streetNumber}`;
            }

            return {
              location: {
                latitude: item.location.latitude,
                longitude: item.location.longitude
              },
              displayName: {
                text: displayNameText || item.formattedAddress?.split(',')[0] || rawQuery
              },
              formattedAddress: item.formattedAddress,
              types: item.types,
              cep: postalCode,
              address_components: comps
            };
          });

          return NextResponse.json({ places: parsed });
        }
      }
    }

    // Fallback: If query with suffix failed, try raw query with location bias
    if (queryToUse !== rawQuery) {
      const fallbackBody: any = {
        textQuery: rawQuery,
        languageCode: 'pt-BR',
        locationBias: {
          circle: {
            center: { latitude: biasLat, longitude: biasLng },
            radius: 50000.0
          }
        }
      };

      const fallbackRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.location,places.displayName,places.formattedAddress,places.types'
        },
        body: JSON.stringify(fallbackBody)
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (Array.isArray(fallbackData.places) && fallbackData.places.length > 0) {
          const valid = fallbackData.places.filter((p: any) => {
            const lat = p.location?.latitude ?? 0;
            return lat < 10 && lat > -35;
          });
          if (valid.length > 0) {
            return NextResponse.json({ places: valid });
          }
        }
      }
    }

    return NextResponse.json({ places: [] });
  } catch (error: any) {
    console.error('[Google Geocode proxy] Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
