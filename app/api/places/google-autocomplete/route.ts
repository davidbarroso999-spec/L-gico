import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory cache for cross-referenced CEPs and queries
const viacepCache = new Map<string, any>();
const awesomeCache = new Map<string, any>();

function formatCep(val?: string | null): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return val;
}

// Calculates distance in kilometers between two coordinates
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Synthesizes raw AwesomeAPI CEP / Address data into clean, structured result
function synthesizeAwesomeResult(
  item: any,
  typedNumber?: string,
  typedComplement?: string,
  poiReference?: string
) {
  const street =
    item.address ||
    [item.address_type, item.address_name].filter(Boolean).join(' ') ||
    '';

  const num = typedNumber || item.number || '';
  let streetWithNum = street;
  if (num && !streetWithNum.includes(num)) {
    streetWithNum += `, ${num}`;
  }
  if (typedComplement && !streetWithNum.includes(typedComplement)) {
    streetWithNum += ` (${typedComplement})`;
  }

  let title = streetWithNum || item.address_name || 'Endereço';
  if (poiReference && !title.toLowerCase().includes(poiReference.toLowerCase())) {
    title = `${poiReference} - ${streetWithNum}`;
  }

  const district = item.district || item.bairro || '';
  const city = item.city || item.localidade || 'Manaus';
  const uf = item.state || item.uf || 'AM';
  const formattedCep = formatCep(item.cep);

  const addressParts = [
    streetWithNum,
    district,
    `${city} - ${uf}`,
    formattedCep ? `CEP ${formattedCep}` : '',
    'Brasil'
  ].filter(Boolean);

  const formattedAddress = addressParts.join(', ');

  return {
    displayName: { text: title },
    formattedAddress,
    location: {
      latitude: parseFloat(item.lat) || 0,
      longitude: parseFloat(item.lng || item.longitude) || 0
    },
    types: ['address', 'route'],
    cep: formattedCep || undefined,
    structured: {
      mainText: title,
      secondaryText: district ? `${district}, ${city} - ${uf}` : `${city} - ${uf}`,
      route: street,
      streetNumber: num || undefined,
      sublocality: district,
      locality: city,
      adminArea: uf,
      postalCode: formattedCep || undefined
    },
    source: 'awesome'
  };
}

// AwesomeAPI CEP Lookup (Aspecto 1: /json/:cep)
async function lookupAwesomeCep(
  cleanCep: string,
  apiKey?: string,
  typedNumber?: string,
  typedComplement?: string
) {
  if (awesomeCache.has(`cep:${cleanCep}`)) {
    const cached = awesomeCache.get(`cep:${cleanCep}`);
    return synthesizeAwesomeResult(cached, typedNumber, typedComplement);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const tokenParam = apiKey ? `?token=${encodeURIComponent(apiKey)}` : '';
  const url = `https://cep.awesomeapi.com.br/json/${cleanCep}${tokenParam}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.cep && !data.status) {
        awesomeCache.set(`cep:${cleanCep}`, data);
        return synthesizeAwesomeResult(data, typedNumber, typedComplement);
      }
    }
  } catch (err) {}

  return null;
}

// AwesomeAPI Comprehensive Multi-Aspect Search
// Pesquisa todos os aspectos da documentação AwesomeAPI para máxima precisão
async function searchAwesomeComprehensive(
  rawInput: string,
  cleanLogradouro: string,
  apiKey?: string,
  typedNumber?: string,
  typedComplement?: string,
  lat?: number,
  lon?: number,
  state?: string,
  poiReference?: string
) {
  const cacheKey = `comp:${rawInput.toLowerCase()}:${lat || ''}:${lon || ''}:${state || ''}`;
  if (awesomeCache.has(cacheKey)) {
    const cachedList = awesomeCache.get(cacheKey);
    return cachedList.map((item: any) =>
      synthesizeAwesomeResult(item, typedNumber, typedComplement, poiReference)
    );
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const aspectRequests: Promise<any>[] = [];

  // 1. Aspecto Combinado: Texto + Geolocalização + Raio d=50km + Ordenação por distância
  if (lat && lon) {
    const paramsComb = new URLSearchParams({
      q: rawInput.trim(),
      lat: lat.toString(),
      lng: lon.toString(),
      d: '50',
      sort: 'asc',
      limit: '10',
      format: 'json'
    });
    if (apiKey) paramsComb.set('token', apiKey);
    if (state) paramsComb.set('state', state);

    aspectRequests.push(
      fetch(`https://cep.awesomeapi.com.br/search?${paramsComb.toString()}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    // 2. Aspecto Combinado com nome limpo do logradouro (sem "av", sem número)
    if (cleanLogradouro.length >= 3 && cleanLogradouro.toLowerCase() !== rawInput.toLowerCase()) {
      const paramsCleanComb = new URLSearchParams({
        q: cleanLogradouro.trim(),
        lat: lat.toString(),
        lng: lon.toString(),
        d: '50',
        sort: 'asc',
        limit: '10',
        format: 'json'
      });
      if (apiKey) paramsCleanComb.set('token', apiKey);
      if (state) paramsCleanComb.set('state', state);

      aspectRequests.push(
        fetch(`https://cep.awesomeapi.com.br/search?${paramsCleanComb.toString()}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      );
    }
  }

  // 3. Aspecto Textual Direto com termo bruto
  const paramsText = new URLSearchParams({
    q: rawInput.trim(),
    limit: '10',
    format: 'json'
  });
  if (apiKey) paramsText.set('token', apiKey);
  if (state) paramsText.set('state', state);

  aspectRequests.push(
    fetch(`https://cep.awesomeapi.com.br/search?${paramsText.toString()}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
  );

  // 4. Aspecto Textual com nome limpo do logradouro
  if (cleanLogradouro.length >= 3 && cleanLogradouro.toLowerCase() !== rawInput.toLowerCase()) {
    const paramsCleanText = new URLSearchParams({
      q: cleanLogradouro.trim(),
      limit: '10',
      format: 'json'
    });
    if (apiKey) paramsCleanText.set('token', apiKey);
    if (state) paramsCleanText.set('state', state);

    aspectRequests.push(
      fetch(`https://cep.awesomeapi.com.br/search?${paramsCleanText.toString()}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );
  }

  try {
    const responses = await Promise.all(aspectRequests);
    const collected: any[] = [];
    const seenCepStreet = new Set<string>();

    for (const resData of responses) {
      if (resData && Array.isArray(resData.results)) {
        for (const item of resData.results) {
          const key = `${formatCep(item.cep)}|${(item.address || item.address_name || '').toLowerCase()}`;
          if (!seenCepStreet.has(key)) {
            seenCepStreet.add(key);
            collected.push(item);
          }
        }
      }
    }

    if (collected.length > 0) {
      awesomeCache.set(cacheKey, collected);
      return collected.map(item =>
        synthesizeAwesomeResult(item, typedNumber, typedComplement, poiReference)
      );
    }
  } catch (err) {}

  return [];
}

// Cross-reference CEP using Brazilian postal registries (ViaCEP + BrasilAPI)
async function crossReferenceCep(
  street?: string,
  neighborhood?: string,
  city: string = 'Manaus',
  uf: string = 'AM'
): Promise<string | undefined> {
  if (!street || street.trim().length < 3) return undefined;

  const cleanStreet = street
    .replace(/^(avenida|av|rua|r|travessa|tv|alameda|al|rodovia|rod|estrada|est|beco|praca|praça)[.\s]+/gi, '')
    .replace(/[.\s]+/g, ' ')
    .trim();

  if (cleanStreet.length < 3) return undefined;

  const cacheKey = `${uf}:${city}:${cleanStreet.toLowerCase()}`;
  if (viacepCache.has(cacheKey)) {
    const cached = viacepCache.get(cacheKey);
    if (!cached || cached.length === 0) return undefined;
    if (neighborhood) {
      const normNb = neighborhood.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const match = cached.find((item: any) =>
        item.bairro?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normNb) ||
        normNb.includes(item.bairro?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '')
      );
      if (match?.cep) return formatCep(match.cep);
    }
    return formatCep(cached[0]?.cep);
  }

  try {
    const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(city)}/${encodeURIComponent(cleanStreet)}/json/`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        viacepCache.set(cacheKey, data);
        if (neighborhood) {
          const normNb = neighborhood.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const match = data.find((item: any) =>
            item.bairro?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(normNb) ||
            normNb.includes(item.bairro?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '')
          );
          if (match?.cep) return formatCep(match.cep);
        }
        return formatCep(data[0]?.cep);
      }
    }
  } catch (err) {
    viacepCache.set(cacheKey, []);
  }

  return undefined;
}

// Fallback Direct CEP lookup via ViaCEP & BrasilAPI
async function lookupDirectCep(rawCep: string): Promise<{
  street?: string;
  neighborhood?: string;
  city?: string;
  uf?: string;
  cep: string;
} | null> {
  const clean = rawCep.replace(/\D/g, '');
  if (clean.length !== 8) return null;

  if (viacepCache.has(`direct:${clean}`)) {
    return viacepCache.get(`direct:${clean}`);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (!data.erro && data.cep) {
        const result = {
          street: data.logradouro || undefined,
          neighborhood: data.bairro || undefined,
          city: data.localidade || 'Manaus',
          uf: data.uf || 'AM',
          cep: formatCep(data.cep)
        };
        viacepCache.set(`direct:${clean}`, result);
        return result;
      }
    }
  } catch (e) {}

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.cep) {
        const result = {
          street: data.street || undefined,
          neighborhood: data.neighborhood || undefined,
          city: data.city || 'Manaus',
          uf: data.state || 'AM',
          cep: formatCep(data.cep)
        };
        viacepCache.set(`direct:${clean}`, result);
        return result;
      }
    }
  } catch (e) {}

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!input || input.trim().length === 0) {
    return NextResponse.json({ places: [] });
  }

  // Key configurations
  const awesomeApiKey =
    process.env.AWESOMEAPI_KEY ||
    process.env.AWESOMEAPI_CEP_KEY ||
    process.env.AWESOME_API_KEY ||
    '';

  const googleApiKey =
    process.env.GOOGLE_MAPS_PLATFORM_KEY ||
    process.env.GOOGLE_MAPS_API_KEY;

  try {
    const rawInput = input.trim();

    // Check if input is or contains a Brazilian Postal Code (CEP)
    const cepMatch = rawInput.match(/\b\d{5}-?\d{3}\b/) || rawInput.match(/\b\d{8}\b/);
    const isCep = Boolean(cepMatch);
    const cleanCepDigits = isCep && cepMatch ? cepMatch[0].replace(/\D/g, '') : null;

    // Extract user typed house numbers and complements
    const typedNumberMatch = rawInput.match(/(?:n[º°\.\s-]*|num[.\s]*|#|no[.\s]*)\s*(\d{1,5}[a-zA-Z]?)\b/i) || rawInput.match(/\b(\d{1,5}[a-zA-Z]?)\b/g);
    const typedNumber = Array.isArray(typedNumberMatch)
      ? typedNumberMatch.find(n => !['2023', '2024', '2025', '2026', '2027'].includes(n) && (!cepMatch || !cepMatch[0].includes(n)))
      : (typedNumberMatch ? typedNumberMatch[1] : undefined);

    const compMatch = rawInput.match(/\b(apto|apt|bloco|bl|sala|lote|lt|qd|quadra|km|casa|fundos|sobrado|galpao|galpão|andar|ap)\s*[:.-]?\s*([a-zA-Z0-9]+)\b/i);
    const typedComplement = compMatch ? `${compMatch[1].toUpperCase()} ${compMatch[2]}` : undefined;

    // Check for explicit establishment or POI reference
    const poiMatch = rawInput.match(/(?:shopping|hospital|aeroporto|posto|escola|faculdade|hotel|parque|supermercado|praca|praça|arena|teatro|centro cultural)\s+([^,]+)/i);
    const poiReference = poiMatch ? poiMatch[0] : undefined;

    // Cleaned logradouro for multi-aspect matching
    const cleanLogradouro = rawInput
      .replace(/^(avenida|av|rua|r|travessa|tv|alameda|al|rodovia|rod|estrada|est|beco|praca|praça)[.\s]+/gi, '')
      .replace(/\b(nº|n°|num|no\.|#)\b/gi, '')
      .replace(/[.\s]+/g, ' ')
      .trim();

    // Check if user is searching for a location outside Amazonas / Manaus explicitly
    const queryNorm = rawInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isSearchingOutsideAmazonas = /\b(sp|sao paulo|rj|rio de janeiro|mg|minas gerais|pr|parana|rs|rio grande do sul|sc|santa catarina|df|distrito federal|ce|ceara|pe|pernambuco|ba|bahia|pa|para|go|goias|mt|mato grosso|ms|mato grosso do sul|es|espirito santo|ac|acre|al|alagoas|ap|amapa|ma|maranhao|pb|paraiba|pi|piaui|rn|rio grande do norte|ro|rondonia|rr|roraima|se|sergipe|to|tocantins|curitiba|recife|fortaleza|salvador|brasilia|goiania|belem|rio branco|macapa|maceio|vitoria|sao luis|joao pessoa|teresina|natal|aracaju|palmas)\b/.test(queryNorm);

    // Location bias
    let biasCenter: { latitude: number; longitude: number } | null = null;
    if (lat && lon) {
      biasCenter = { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    } else if (!isSearchingOutsideAmazonas && !isCep) {
      biasCenter = { latitude: -3.1116, longitude: -60.0242 }; // Manaus center
    }

    const stateFilter = isSearchingOutsideAmazonas
      ? undefined
      : 'AM';

    const finalPlaces: any[] = [];
    const seenAddressKeys = new Set<string>();

    const addPlace = (item: any, isPrimary: boolean = false) => {
      if (!item) return;

      if (biasCenter && !isSearchingOutsideAmazonas && item.location?.latitude && item.location?.longitude) {
        const dist = getDistanceKm(biasCenter.latitude, biasCenter.longitude, item.location.latitude, item.location.longitude);
        if (dist > 600) return;
      }

      const key = (item.formattedAddress || item.displayName?.text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      if (!seenAddressKeys.has(key)) {
        seenAddressKeys.add(key);
        if (isPrimary) {
          finalPlaces.unshift(item);
        } else {
          finalPlaces.push(item);
        }
      }
    };

    // =========================================================================
    // MOTOR PRINCIPAL: AWESOMEAPI (PESQUISA EM TODOS OS ASPECTOS DA DOCUMENTAÇÃO)
    // =========================================================================

    // Aspecto 1: Busca Direta por CEP via AwesomeAPI
    if (isCep && cleanCepDigits && cleanCepDigits.length === 8) {
      const awesomeCepResult = await lookupAwesomeCep(
        cleanCepDigits,
        awesomeApiKey,
        typedNumber,
        typedComplement
      );

      if (awesomeCepResult) {
        addPlace(awesomeCepResult, true);
        return NextResponse.json({ places: finalPlaces.slice(0, 4) });
      }
    }

    // Aspectos 2, 3, 4: Busca Abrangente em Todos os Aspectos na AwesomeAPI
    const awesomeComprehensivePromise = (async () => {
      if (isCep) return [];
      try {
        const results = await searchAwesomeComprehensive(
          rawInput,
          cleanLogradouro,
          awesomeApiKey,
          typedNumber,
          typedComplement,
          biasCenter?.latitude,
          biasCenter?.longitude,
          stateFilter,
          poiReference
        );
        return results;
      } catch (e) {
        return [];
      }
    })();

    // Helper to format Google place output
    const formatAndCrossReferencePlace = async (p: any, fallbackTitle?: string, fallbackAddress?: string) => {
      const comps = p.addressComponents || [];
      const getComp = (types: string[]) =>
        comps.find((c: any) => types.some(t => c.types?.includes(t)))?.longText ||
        comps.find((c: any) => types.some(t => c.types?.includes(t)))?.long_name;

      let postalCode = getComp(['postal_code']);
      const streetNumber = getComp(['street_number']) || typedNumber;
      const route = getComp(['route']) || (fallbackAddress ? fallbackAddress.split('-')[0]?.split(',')[0]?.trim() : '');
      const sublocality = getComp(['sublocality_level_1', 'sublocality', 'neighborhood', 'bairro']) ||
        (fallbackAddress && fallbackAddress.includes('-') ? fallbackAddress.split('-')[1]?.split(',')[0]?.trim() : '');
      const locality = getComp(['locality', 'administrative_area_level_2']) || 'Manaus';
      const adminArea = getComp(['administrative_area_level_1']) || 'Amazonas';
      const uf = adminArea.length === 2 ? adminArea : (adminArea.toLowerCase().includes('amazonas') ? 'AM' : 'AM');

      let mainText = p.displayName?.text || fallbackTitle || '';
      if (streetNumber && !mainText.includes(streetNumber) && !p.types?.includes('route')) {
        mainText = `${mainText}, ${streetNumber}`;
      } else if (route && (!mainText || mainText === 'Endereço')) {
        mainText = route;
        if (streetNumber) mainText += `, ${streetNumber}`;
      }

      if (typedComplement && !mainText.includes(typedComplement)) {
        mainText = `${mainText} (${typedComplement})`;
      }

      let fullAddress = p.formattedAddress || fallbackAddress || '';
      if (typedComplement && fullAddress && !fullAddress.includes(typedComplement)) {
        fullAddress = fullAddress.replace(/, Brasil$/i, ` (${typedComplement}), Brasil`);
      }

      if (!postalCode || postalCode.endsWith('000') || postalCode.length < 8) {
        const streetToCross = route || (mainText && !p.types?.includes('establishment') ? mainText.split(',')[0] : '');
        if (streetToCross) {
          const crossCep = await crossReferenceCep(streetToCross, sublocality, locality, uf);
          if (crossCep) {
            postalCode = crossCep;
          }
        }
      }

      const formattedPostalCode = formatCep(postalCode);

      if (formattedPostalCode && !fullAddress.includes(formattedPostalCode)) {
        if (fullAddress.endsWith(', Brasil') || fullAddress.endsWith(', Brazil')) {
          fullAddress = fullAddress.replace(/, (Brasil|Brazil)$/i, `, ${formattedPostalCode}, Brasil`);
        } else {
          fullAddress = `${fullAddress}, ${formattedPostalCode}`;
        }
      }

      let latVal = p.location?.latitude ?? p.geometry?.location?.lat ?? 0;
      let lonVal = p.location?.longitude ?? p.geometry?.location?.lng ?? 0;

      if (latVal === 0 && lonVal === 0 && fullAddress) {
        try {
          const phoUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(fullAddress.replace(/,\s*Brasil$/i, ''))}&limit=1`;
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 1200);
          const pRes = await fetch(phoUrl, { signal: controller.signal });
          clearTimeout(t);
          if (pRes.ok) {
            const pData = await pRes.json();
            const coord = pData.features?.[0]?.geometry?.coordinates;
            if (Array.isArray(coord) && coord.length >= 2) {
              lonVal = coord[0];
              latVal = coord[1];
            }
          }
        } catch (e) {}
      }

      if (latVal === 0 && lonVal === 0 && biasCenter) {
        latVal = biasCenter.latitude;
        lonVal = biasCenter.longitude;
      }

      return {
        location: {
          latitude: latVal,
          longitude: lonVal
        },
        displayName: {
          text: mainText || fullAddress.split(',')[0] || 'Local'
        },
        formattedAddress: fullAddress || mainText,
        types: p.types || [],
        cep: formattedPostalCode || undefined,
        structured: {
          mainText: mainText || fullAddress.split(',')[0] || 'Local',
          secondaryText: sublocality ? `${sublocality}, ${locality || ''}` : (locality || ''),
          streetNumber,
          route,
          sublocality,
          locality,
          adminArea,
          postalCode: formattedPostalCode || undefined
        }
      };
    };

    // Fallback CEP lookup if AwesomeAPI did not return
    if (isCep && cepMatch) {
      const cepInfo = await lookupDirectCep(cepMatch[0]);
      if (cepInfo) {
        const queryText = [cepInfo.street, typedNumber, cepInfo.neighborhood, cepInfo.city, cepInfo.uf].filter(Boolean).join(', ');
        if (googleApiKey) {
          try {
            const textSearchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleApiKey,
                'X-Goog-FieldMask': 'places.location,places.displayName,places.formattedAddress,places.types,places.addressComponents'
              },
              body: JSON.stringify({
                textQuery: queryText,
                languageCode: 'pt-BR',
                ...(biasCenter ? { locationBias: { circle: { center: biasCenter, radius: 50000.0 } } } : {})
              })
            });

            if (textSearchRes.ok) {
              const data = await textSearchRes.json();
              const places = data.places || [];
              if (places.length > 0) {
                const formattedList = await Promise.all(
                  places.slice(0, 4).map((p: any) => formatAndCrossReferencePlace(p))
                );
                formattedList.forEach(item => {
                  if (!item.cep) item.cep = cepInfo.cep;
                  if (!item.formattedAddress.includes(cepInfo.cep)) {
                    item.formattedAddress = item.formattedAddress.replace(/, Brasil$/i, `, ${cepInfo.cep}, Brasil`);
                  }
                  addPlace(item, true);
                });
                return NextResponse.json({ places: finalPlaces.slice(0, 4) });
              }
            }
          } catch (err) {}
        }

        // Direct synthesize from postal registry
        const directSynthesized = {
          displayName: { text: [cepInfo.street, typedNumber].filter(Boolean).join(', ') },
          formattedAddress: [
            [cepInfo.street, typedNumber].filter(Boolean).join(', '),
            cepInfo.neighborhood,
            `${cepInfo.city} - ${cepInfo.uf}`,
            `CEP ${cepInfo.cep}`,
            'Brasil'
          ].filter(Boolean).join(', '),
          location: biasCenter ? { latitude: biasCenter.latitude, longitude: biasCenter.longitude } : { latitude: 0, longitude: 0 },
          types: ['address'],
          cep: cepInfo.cep,
          structured: {
            mainText: [cepInfo.street, typedNumber].filter(Boolean).join(', '),
            secondaryText: `${cepInfo.neighborhood}, ${cepInfo.city} - ${cepInfo.uf}`,
            route: cepInfo.street,
            streetNumber: typedNumber,
            sublocality: cepInfo.neighborhood,
            locality: cepInfo.city,
            adminArea: cepInfo.uf,
            postalCode: cepInfo.cep
          }
        };
        addPlace(directSynthesized, true);
        return NextResponse.json({ places: finalPlaces.slice(0, 4) });
      }
    }

    // Google Geolocation and Autocomplete requests
    const googlePromises = (async () => {
      if (!googleApiKey) return { acResponse: null, searchResponse: null };

      const autocompleteBody: any = {
        input: rawInput,
        includedRegionCodes: ['br'],
        languageCode: 'pt-BR'
      };
      if (biasCenter) {
        autocompleteBody.locationBias = {
          circle: { center: biasCenter, radius: 50000.0 }
        };
      }

      const textSearchBody: any = {
        textQuery: rawInput,
        languageCode: 'pt-BR'
      };
      if (biasCenter) {
        textSearchBody.locationBias = {
          circle: { center: biasCenter, radius: 50000.0 }
        };
      }

      const [acRes, searchRes] = await Promise.all([
        fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': googleApiKey },
          body: JSON.stringify(autocompleteBody)
        }).then(r => r.ok ? r.json() : null).catch(() => null),

        fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
            'X-Goog-FieldMask': 'places.location,places.displayName,places.formattedAddress,places.types,places.addressComponents'
          },
          body: JSON.stringify(textSearchBody)
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      return { acResponse: acRes, searchResponse: searchRes };
    })();

    const [awesomeResults, googleData] = await Promise.all([
      awesomeComprehensivePromise,
      googlePromises
    ]);

    // Priority 1: Add AwesomeAPI results (motor principal de máxima precisão)
    if (Array.isArray(awesomeResults) && awesomeResults.length > 0) {
      awesomeResults.forEach(item => addPlace(item, true));
    }

    // Priority 2: Complement with Google Autocomplete Predictions
    const suggestions = googleData.acResponse?.suggestions || [];
    if (Array.isArray(suggestions) && suggestions.length > 0 && finalPlaces.length < 4) {
      const topPreds = suggestions
        .map((s: any) => s.placePrediction)
        .filter(Boolean)
        .slice(0, 4);

      const predictionResolutions = await Promise.all(
        topPreds.map(async (pred: any) => {
          const predText = pred.text?.text || pred.structuredFormat?.mainText?.text;
          if (!predText) return null;

          if (googleApiKey) {
            try {
              const detailRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Goog-Api-Key': googleApiKey,
                  'X-Goog-FieldMask': 'places.location,places.displayName,places.formattedAddress,places.types,places.addressComponents'
                },
                body: JSON.stringify({
                  textQuery: predText,
                  languageCode: 'pt-BR',
                  ...(biasCenter ? { locationBias: { circle: { center: biasCenter, radius: 50000.0 } } } : {})
                })
              });

              if (detailRes.ok) {
                const dData = await detailRes.json();
                if (dData.places && dData.places[0]) {
                  return await formatAndCrossReferencePlace(
                    dData.places[0],
                    pred.structuredFormat?.mainText?.text || predText,
                    predText
                  );
                }
              }
            } catch (err) {}
          }

          const fallbackPlace = {
            displayName: { text: pred.structuredFormat?.mainText?.text || predText },
            formattedAddress: predText,
            types: pred.types || ['geocode']
          };
          return await formatAndCrossReferencePlace(fallbackPlace, pred.structuredFormat?.mainText?.text, predText);
        })
      );

      for (const res of predictionResolutions) {
        if (res) addPlace(res, false);
      }
    }

    // Priority 3: Add Google Places TextSearch items if needed to reach max 4
    if (googleData.searchResponse?.places && Array.isArray(googleData.searchResponse.places) && finalPlaces.length < 4) {
      for (const p of googleData.searchResponse.places.slice(0, 4)) {
        const formatted = await formatAndCrossReferencePlace(p);
        addPlace(formatted, false);
      }
    }

    // STRICT LIMIT: Exactly at most 4 results
    const max4Places = finalPlaces.slice(0, 4);

    return NextResponse.json({ places: max4Places });
  } catch (error: any) {
    console.error('[Autocomplete Proxy Route] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
