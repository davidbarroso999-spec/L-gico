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
    // Determine if input resembles a Brazilian CEP (Postal Code)
    const cepPattern = /\b\d{5}-?\d{3}\b/g;
    const isCep = cepPattern.test(input);

    const proximityParams = (lat && lon) ? `&location=${lat},${lon}&radius=50000` : '';

    // 1. Google Places Autocomplete API (New / Legacy REST) - Provides state-of-the-art predictive auto-suggestions
    const autocompletePromise = (async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&language=pt-BR&region=br&components=country:br${proximityParams}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && Array.isArray(data.predictions)) {
            // Take the top 5 predictions and resolve their geolocations in parallel via Place ID Geocoding
            const results = await Promise.all(
              data.predictions.slice(0, 5).map(async (prediction: any) => {
                try {
                  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${prediction.place_id}&key=${apiKey}&language=pt-BR`;
                  const geoResponse = await fetch(geocodeUrl);
                  if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (geoData.status === 'OK' && Array.isArray(geoData.results) && geoData.results.length > 0) {
                      const r = geoData.results[0];
                      const comps = r.address_components || [];
                      const getComp = (types: string[]) => comps.find((c: any) => types.some(t => c.types?.includes(t)))?.long_name;
                      const postalCodeComp = getComp(['postal_code']);
                      const streetNumber = getComp(['street_number']);
                      const route = getComp(['route']);
                      const sublocality = getComp(['sublocality_level_1', 'sublocality', 'neighborhood', 'bairro']);
                      const locality = getComp(['locality', 'administrative_area_level_2']);
                      const adminArea = getComp(['administrative_area_level_1']);

                      const mainText = prediction.structured_formatting?.main_text || prediction.description.split(',')[0];
                      const secondaryText = prediction.structured_formatting?.secondary_text || '';

                      return {
                        location: {
                          latitude: r.geometry.location.lat,
                          longitude: r.geometry.location.lng
                        },
                        displayName: {
                          text: mainText
                        },
                        formattedAddress: r.formatted_address || prediction.description,
                        types: r.types || prediction.types || [],
                        cep: postalCodeComp,
                        structured: {
                          mainText,
                          secondaryText,
                          streetNumber,
                          route,
                          sublocality,
                          locality,
                          adminArea,
                          postalCode: postalCodeComp
                        }
                      };
                    }
                  }
                } catch (pe) {
                  console.error('[Google Autocomplete Proxy - Place ID resolving] Error:', pe);
                }
                return null;
              })
            );
            return results.filter(Boolean);
          }
        }
      } catch (err) {
        console.error('[Google Autocomplete Proxy - Place Autocomplete] Error:', err);
      }
      return [];
    })();

    // 2. Google Places Text Search (New) - Perfect for finding active business names, POIs, landmarks
    const placesPromise = (async () => {
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
            'X-Goog-FieldMask': 'places.location,places.displayName,places.formattedAddress,places.types,places.addressComponents'
          },
          body: JSON.stringify(body)
        });

        if (response.ok) {
          const data = await response.json();
          const items = data.places || [];
          return items.map((p: any) => {
            const comps = p.addressComponents || [];
            const getComp = (types: string[]) => comps.find((c: any) => types.some(t => c.types?.includes(t)))?.longText;
            const postalCodeComp = getComp(['postal_code']);
            const streetNumber = getComp(['street_number']);
            const route = getComp(['route']);
            const sublocality = getComp(['sublocality_level_1', 'sublocality', 'neighborhood', 'bairro']);
            const locality = getComp(['locality', 'administrative_area_level_2']);
            const adminArea = getComp(['administrative_area_level_1']);

            const mainText = p.displayName?.text || '';

            return {
              location: {
                latitude: p.location?.latitude || 0,
                longitude: p.location?.longitude || 0
              },
              displayName: {
                text: mainText
              },
              formattedAddress: p.formattedAddress || '',
              types: p.types || [],
              cep: postalCodeComp,
              structured: {
                mainText,
                streetNumber,
                route,
                sublocality,
                locality,
                adminArea,
                postalCode: postalCodeComp
              }
            };
          });
        }
      } catch (err) {
        console.error('[Google Autocomplete Proxy - places:searchText] Error:', err);
      }
      return [];
    })();

    // 3. Google Geocoding API - Solid for fallback / direct address strings & ZIP/CEP codes
    const geocodePromise = (async () => {
      try {
        const proximity = (lat && lon) ? `&location=${lat},${lon}` : '';
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&key=${apiKey}&language=pt-BR&region=br${proximity}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'OK' && Array.isArray(data.results)) {
            return data.results.map((r: any) => {
              const comps = r.address_components || [];
              const getComp = (types: string[]) => comps.find((c: any) => types.some(t => c.types?.includes(t)))?.long_name;
              const postalCodeComp = getComp(['postal_code']);
              const streetNumber = getComp(['street_number']);
              const route = getComp(['route']);
              const sublocality = getComp(['sublocality_level_1', 'sublocality', 'neighborhood', 'bairro']);
              const locality = getComp(['locality', 'administrative_area_level_2']);
              const adminArea = getComp(['administrative_area_level_1']);

              let mainText = '';
              if (route) {
                mainText = route;
                if (streetNumber) mainText += `, ${streetNumber}`;
              } else if (sublocality) {
                mainText = sublocality;
              } else {
                mainText = r.address_components?.[0]?.long_name || 'Endereço';
              }

              return {
                location: {
                  latitude: r.geometry.location.lat,
                  longitude: r.geometry.location.lng
                },
                displayName: {
                  text: mainText
                },
                formattedAddress: r.formatted_address,
                types: r.types || [],
                cep: postalCodeComp,
                structured: {
                  mainText,
                  streetNumber,
                  route,
                  sublocality,
                  locality,
                  adminArea,
                  postalCode: postalCodeComp
                }
              };
            });
          }
        }
      } catch (err) {
        console.error('[Google Autocomplete Proxy - geocode] Error:', err);
      }
      return [];
    })();

    // Run searches concurrently to achieve "SSJ God" speed and coverage
    const [autocompleteList, placesList, geocodeList] = await Promise.all([
      autocompletePromise,
      placesPromise,
      geocodePromise
    ]);

    // Unify, deduplicate based on high-precision coordinates (~1 meter precision grids), prioritizing predictions
    const unified: any[] = [];
    const seenCoords = new Set<string>();

    const addUnique = (item: any) => {
      if (!item || !item.location) return;
      const latVal = item.location.latitude || 0;
      const lonVal = item.location.longitude || 0;
      if (latVal === 0 && lonVal === 0) return; // ignore placeholder search items

      const key = `${latVal.toFixed(5)},${lonVal.toFixed(5)}`;
      if (!seenCoords.has(key)) {
        seenCoords.add(key);
        unified.push(item);
      }
    };

    // CEP requests prioritize standard geocoding, while normal queries prioritize autocomplete predictions & active venues
    if (isCep) {
      geocodeList.forEach(addUnique);
      autocompleteList.forEach(addUnique);
      placesList.forEach(addUnique);
    } else {
      autocompleteList.forEach(addUnique);
      placesList.forEach(addUnique);
      geocodeList.forEach(addUnique);
    }

    return NextResponse.json({ places: unified });
  } catch (error: any) {
    console.error('[Google Search Text] Proxy error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
