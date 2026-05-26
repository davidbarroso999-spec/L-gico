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
    // Primary: Google Geocoding API for exact address parsing including streets, numbers, neighborhoods, and CEPs
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=pt-BR&region=br`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
        const parsedResults = data.results.map((r: any) => {
          const postalCodeComp = r.address_components?.find((c: any) => c.types.includes('postal_code'))?.long_name;
          const streetNumber = r.address_components?.find((c: any) => c.types.includes('street_number'))?.long_name;
          const route = r.address_components?.find((c: any) => c.types.includes('route'))?.long_name;
          const sublocality = r.address_components?.find((c: any) => c.types.includes('sublocality') || c.types.includes('sublocality_level_1'))?.long_name;

          // Build descriptive high precision display name
          let displayNameText = '';
          if (route) {
            displayNameText = route;
            if (streetNumber) displayNameText += `, ${streetNumber}`;
            if (sublocality) displayNameText += ` - ${sublocality}`;
          } else if (sublocality) {
            displayNameText = sublocality;
          } else {
            displayNameText = r.address_components?.[0]?.long_name || 'Endereço';
          }

          return {
            location: {
              latitude: r.geometry.location.lat,
              longitude: r.geometry.location.lng
            },
            displayName: {
              text: displayNameText
            },
            formattedAddress: r.formatted_address,
            types: r.types,
            cep: postalCodeComp,
            address_components: r.address_components
          };
        });

        return NextResponse.json({ places: parsedResults });
      }
    }

    // Secondary fallback: Google Places Text Search (New) for establishments, landmarks or other queries
    const body: any = {
      textQuery: address,
      languageCode: 'pt-BR'
    };

    const textSearchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location,places.displayName,places.formattedAddress,places.types'
      },
      body: JSON.stringify(body)
    });

    if (textSearchRes.ok) {
      const textSearchData = await textSearchRes.json();
      return NextResponse.json(textSearchData);
    }

    return NextResponse.json({ places: [] });
  } catch (error: any) {
    console.error('[Google Geocode proxy] Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
