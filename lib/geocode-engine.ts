export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
  name: string;
  context: string;
  confidenceScore: number;
  source: 'ors' | 'nominatim' | 'photon' | 'cache' | 'google' | 'mapbox' | 'viacep';
  type?: 'address' | 'poi' | 'landmark';
  cep?: string;
}

function formatCep(cep: any): string | undefined {
  if (!cep) return undefined;
  const str = String(cep).replace(/\D/g, '');
  if (str.length === 8) {
    return `${str.slice(0, 5)}-${str.slice(5)}`;
  }
  return String(cep);
}

const geoCache = new Map<string, GeocodeResult[]>();

// High-precision offline registry for famous Manaus neighborhoods & locations (demoroute)
const OFFLINE_REGISTRY: Record<string, { lat: number, lon: number, name: string, context: string }> = {
  'centro, manaus, am': { lat: -3.1311, lon: -60.0242, name: 'Centro', context: 'Manaus, AM, Brasil' },
  'adrianopolis, manaus, am': { lat: -3.1116, lon: -60.0121, name: 'Adrianópolis', context: 'Manaus, AM, Brasil' },
  'aleixo, manaus, am': { lat: -3.0963, lon: -59.9892, name: 'Aleixo', context: 'Manaus, AM, Brasil' },
  'cidade nova, manaus, am': { lat: -3.0298, lon: -59.9723, name: 'Cidade Nova', context: 'Manaus, AM, Brasil' },
  'flores, manaus, am': { lat: -3.0801, lon: -60.0163, name: 'Flores', context: 'Manaus, AM, Brasil' },
  'compensa, manaus, am': { lat: -3.1102, lon: -60.0468, name: 'Compensa', context: 'Manaus, AM, Brasil' },
};

/**
 * Normalizes a string for deduplication comparison.
 */
function normalizeForDedup(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/,\s*(brasil|brazil)\s*$/i, '') // Remove country suffix
    .replace(/\bavenida\b/gi, 'av')
    .replace(/\brua\b/gi, 'r')
    .replace(/\bdoutor\b/gi, 'dr')
    .replace(/\bprofessor\b/gi, 'prof')
    .replace(/\bsanta\b/gi, 'sta')
    .replace(/\bsanto\b/gi, 'sto')
    .replace(/[\s,\.\-\(\)]+/g, ' ') // Compact spacing and punctuation
    .trim();
}

export async function enhancedAutocomplete(text: string, proximity?: { lat: number, lon: number }): Promise<GeocodeResult[]> {
  if (!text || text.trim().length < 2) return [];
  const normalizedText = text.trim().toLowerCase();
  
  // 1. Check offline registry match first - resolves instantly with 0ms API cost or key
  const normalizedSearch = normalizedText.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, val] of Object.entries(OFFLINE_REGISTRY)) {
    if (normalizedSearch === key || key.includes(normalizedSearch) || normalizedSearch.includes(key)) {
      const offlineResult: GeocodeResult = {
        lat: val.lat,
        lon: val.lon,
        name: val.name,
        context: val.context,
        label: `${val.name}, ${val.context}`,
        confidenceScore: 100,
        source: 'cache',
        type: 'address'
      };
      return [offlineResult];
    }
  }

  // 2. Check Cache
  if (geoCache.has(normalizedText)) {
    return geoCache.get(normalizedText)!;
  }

  try {
    // Default fallback to Manaus, AM coord context to ensure precise local resolution if GPS is inactive
    const lat = proximity?.lat ?? -3.1116;
    const lon = proximity?.lon ?? -60.0242;
    const hasProximity = true;

    let composedQuery = text;
    let viaCepResolved = false;
    let resolvedViaCepData: any = null;

    // Detect if search query contains a Brazilian Postal Code (CEP), formatting with or without hyphen
    const cepMatch = text.match(/\b\d{5}-?\d{3}\b/) || text.match(/\b\d{8}\b/);
    if (cepMatch) {
      const cleanCep = cepMatch[0].replace('-', '');
      console.log(`[Geocode CEP] Detectou CEP: ${cepMatch[0]} em "${text}"`);
      try {
        const response = await fetch(`/api/viacep?cep=${cleanCep}`);
        if (response.ok) {
          const data = await response.json();
          if (data && !data.erro) {
            resolvedViaCepData = data;
            // Find a house number in the query (any digit group of max 5 chars that is not the CEP itself and not inside logradouro)
            const textWithoutCep = text.replace(cepMatch[0], '').replace(/,/, ' ').replace(/\s+/g, ' ').trim();
            const allNumbers = Array.from(textWithoutCep.matchAll(/\b\d{1,5}\b/g)).map(m => m[0]);
            
            let streetNumber = '';
            for (const num of allNumbers) {
              if (data.logradouro && !data.logradouro.toLowerCase().includes(num)) {
                streetNumber = num;
                break;
              }
            }
            if (!streetNumber && allNumbers.length > 0) {
              streetNumber = allNumbers[0];
            }

            const parts = [
              data.logradouro ? `${data.logradouro}${streetNumber ? ', ' + streetNumber : ''}` : '',
              data.bairro,
              data.localidade,
              data.uf,
              "Brasil"
            ].filter(Boolean);

            if (parts.length > 2) {
              composedQuery = parts.join(', ');
              viaCepResolved = true;
              console.log(`[Geocode CEP] Resolvido via ViaCEP: ${composedQuery}`);
            }
          }
        }
      } catch (err) {
        console.warn("[Geocode CEP] Erro ao buscar CEP no ViaCEP:", err);
      }
    }

    const cleanText = encodeURIComponent(composedQuery);
    const viewboxStr = `&viewbox=${lon - 0.5},${lat + 0.5},${lon + 0.5},${lat - 0.5}`;
    const photonLocation = `&lat=${lat}&lon=${lon}`;

    const results: GeocodeResult[] = [];
    const seenKeys = new Set<string>();

    const addResult = (res: GeocodeResult) => {
      // Auto-extract or assign CEP if not populated
      if (!res.cep) {
        const regexCep = /\b\d{5}-?\d{3}\b/;
        const matchLabel = res.label?.match(regexCep);
        if (matchLabel) {
          res.cep = formatCep(matchLabel[0]);
        } else if (viaCepResolved && resolvedViaCepData?.cep) {
          res.cep = resolvedViaCepData.cep;
        } else if (cepMatch) {
          res.cep = formatCep(cepMatch[0]);
        }
      } else {
        res.cep = formatCep(res.cep);
      }

      const normLabel = normalizeForDedup(res.label);
      const normName = normalizeForDedup(res.name);
      
      // Coordinate grid up to 4 decimals (~11 meters precision) provides excellent deduplication
      const latGrid = Math.floor(res.lat * 10000);
      const lonGrid = Math.floor(res.lon * 10000);
      
      const dedupKeyNameCoord = `${normName}-${latGrid},${lonGrid}`;
      const dedupKeyLabel = `label-${normLabel}`;

      if (!seenKeys.has(dedupKeyNameCoord) && !seenKeys.has(dedupKeyLabel)) {
        seenKeys.add(dedupKeyNameCoord);
        seenKeys.add(dedupKeyLabel);
        results.push(res);
      }
    };

    // Detect if search has numbers (likely a street/house number)
    const hasNumber = /\d+/.test(composedQuery);

    // Common search terms to boost POI detection
    const isCompanyOrPOI = /loja|empresa|praça|parque|hospital|restaurante|escola|shopping|supermercado|posto|banco|academia|hotel|aeroporto/i.test(composedQuery);

    const orsParams: any = {
      text: composedQuery,
      size: '10',
      'boundary.country': 'BRA'
    };
    if (hasProximity) {
        orsParams['focus.point.lat'] = lat?.toString();
        orsParams['focus.point.lon'] = lon?.toString();
    }

    const mapboxQs = new URLSearchParams({ q: composedQuery });
    if (lat && lon) {
      mapboxQs.append('lat', lat.toString());
      mapboxQs.append('lon', lon.toString());
    }

    const googleQs = new URLSearchParams({ input: composedQuery });
    if (lat && lon) {
      googleQs.append('lat', lat.toString());
      googleQs.append('lon', lon.toString());
    }

    // Parallelize search requests to all geocoding services
    const providers = [
      // 0. Google Places Autocomplete API
      fetch(`/api/places/google-autocomplete?${googleQs.toString()}`).then(r => r.ok ? r.json() : null).catch(() => null),

      // 1. Mapbox API 
      fetch(`/api/places/search?${mapboxQs.toString()}`).then(r => r.ok ? r.json() : null).catch(() => null),

      // 2. OpenRouteService 
      fetch('/api/ors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: hasNumber && !isCompanyOrPOI ? 'geocode/search' : 'geocode/autocomplete',
          params: orsParams
        })
      }).then(r => r.ok ? r.json() : null).catch(() => null),

      // 3. Nominatim (OSM online geocoder proxied to avoid client-side CORS failures)
      fetch(`/api/places/osm?type=nominatim&q=${cleanText}&viewbox=${lon - 0.5},${lat + 0.5},${lon + 0.5},${lat - 0.5}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),

      // 4. Photon (High-availability search engine proxied to avoid client-side CORS failures)
      fetch(`/api/places/osm?type=photon&q=${cleanText}&lat=${lat}&lon=${lon}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    ];

    const [googleRes, mapboxRes, orsRes, nomRes, phoRes] = await Promise.all(providers);

    // Parse Google Places API (New) Text Search
    if (googleRes && Array.isArray(googleRes.places)) {
      googleRes.places.forEach((p: any) => {
        const isPOI = p.types?.some((t: string) => ['establishment', 'point_of_interest', 'premise', 'airport', 'hospital', 'shopping_mall', 'food', 'store'].includes(t));
        const name = p.displayName?.text || '';
        const context = p.formattedAddress || '';
        addResult({
          lat: p.location?.latitude || 0,
          lon: p.location?.longitude || 0,
          name: name,
          context: context,
          label: `${name}${context ? `, ${context}` : ''}`,
          confidenceScore: 100, // Highest priority
          source: 'google',
          type: isPOI ? 'poi' : 'address'
        });
      });
    }

    // Parse Mapbox API
    if (mapboxRes?.features) {
      mapboxRes.features.forEach((f: any) => {
        const isPOI = f.place_type?.includes('poi') || f.id?.startsWith('poi.');
        const contextText = f.context ? f.context.map((c: any) => c.text).join(', ') : f.place_name.replace(`${f.text}, `, '');
        
        let score = 95; // Base high priority
        if (isPOI) score += 3;

        let name = f.text;
        if (f.address) {
          name = `${f.text}, ${f.address}`;
          score += 15; // Exact house number matched by Mapbox!
        } else if (hasNumber) {
          const matchNum = composedQuery.match(/\b\d{1,5}\b/);
          if (matchNum && (f.place_name.includes(matchNum[0]) || f.text.includes(matchNum[0]))) {
            score += 8;
            name = `${f.text}, ${matchNum[0]}`;
          }
        }

        const mapboxPc = f.context?.find((c: any) => c.id?.startsWith('postcode'))?.text;

        addResult({
          lat: f.center[1], // Mapbox uses [lon, lat]
          lon: f.center[0],
          name: name,
          context: contextText,
          label: f.place_name,
          confidenceScore: score,
          source: 'mapbox',
          type: isPOI ? 'poi' : 'address',
          cep: mapboxPc
        });
      });
    }

    // Parse OpenRouteService Geocoding/Autocomplete
    if (orsRes?.features) {
      orsRes.features.forEach((f: any) => {
        const props = f.properties;
        const details = [props.neighbourhood, props.locality, props.region].filter(Boolean).join(' - ');
        
        let score = props.confidence ? props.confidence * 100 : 85;
        const isPOI = props.layer === 'venue' || props.layer === 'poi';
        if (isPOI) score += 5;

        let name = props.name || props.label.split(',')[0];
        if (props.street && props.housenumber) {
          name = `${props.street}, ${props.housenumber}`;
          score += 20; // Verified housenumber
        } else if (props.housenumber) {
          name = `${name}, ${props.housenumber}`;
          score += 15;
        } else if (hasNumber) {
          const matchNum = composedQuery.match(/\b\d{1,5}\b/);
          if (matchNum && (props.label.includes(matchNum[0]) || props.name?.includes(matchNum[0]))) {
            score += 10;
            if (props.street) {
              name = `${props.street}, ${matchNum[0]}`;
            } else {
              name = `${name}, ${matchNum[0]}`;
            }
          }
        }

        addResult({
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          name: name,
          context: (isPOI && props.street ? `${props.street}, ${details}` : details) || props.label,
          label: props.label,
          confidenceScore: Math.min(score, 100),
          source: 'ors',
          type: isPOI ? 'poi' : 'address',
          cep: props.postalcode
        });
      });
    }

    // Parse Nominatim (OSM Geocoder)
    if (Array.isArray(nomRes)) {
      nomRes.forEach((item: any) => {
        const addr = item.address;
        const type = item.type || '';
        const osmClass = item.class || '';
        
        // osmClass amenity/shop/tourism/historic/leisure indicate POIs
        const isPOI = !['highway', 'place', 'boundary', 'house', 'building', 'street', 'administrative'].includes(type) && 
                      !['highway', 'place', 'boundary'].includes(osmClass);
        
        const details = [addr?.suburb || addr?.neighbourhood, addr?.city || addr?.town, addr?.state].filter(Boolean).join(' - ');
        
        let name = item.display_name.split(',')[0];
        let score = 80; // Baseline
        if (item.type === 'house' || item.type === 'building') {
          score = 95;
        }

        if (addr?.road) {
          if (addr.house_number) {
            name = `${addr.road}, ${addr.house_number}`;
            score += 20; // Highly precise house matching
          } else {
            name = addr.road;
            if (hasNumber) {
              const matchNum = composedQuery.match(/\b\d{1,5}\b/);
              if (matchNum && item.display_name.includes(matchNum[0])) {
                score += 10;
                name = `${addr.road}, ${matchNum[0]}`;
              }
            }
          }
        }
        
        if (isPOI) score += 8;

        addResult({
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          name: name,
          context: (isPOI && addr?.road ? `${addr.road}, ${details}` : details) || item.display_name,
          label: item.display_name,
          confidenceScore: Math.min(score, 100),
          source: 'nominatim',
          type: isPOI ? 'poi' : 'address',
          cep: addr?.postcode
        });
      });
    }

    // Parse Photon (Fast fuzzy address search server)
    if (phoRes?.features) {
      phoRes.features.forEach((f: any) => {
        const props = f.properties;
        const details = [props.district, props.city, props.state].filter(Boolean).join(' - ');
        const isPOI = !['highway', 'place', 'boundary', 'street'].includes(props.osm_key) && props.name !== props.street;
        
        let score = 70; // Baseline
        if (isPOI) score += 8;

        let name = props.name || props.street || 'Endereço';
        if (props.street && props.housenumber) {
          name = `${props.street}, ${props.housenumber}`;
          score += 15;
        } else if (hasNumber) {
          const matchNum = composedQuery.match(/\b\d{1,5}\b/);
          if (matchNum && (props.name?.includes(matchNum[0]) || props.street?.includes(matchNum[0]) || props.district?.includes(matchNum[0]))) {
            score += 10;
            if (props.street) {
              name = `${props.street}, ${matchNum[0]}`;
            }
          }
        }

        addResult({
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          name: name,
          context: details,
          label: `${name}${details ? `, ${details}` : ''}${props.country ? `, ${props.country}` : ''}`,
          confidenceScore: score,
          source: 'photon',
          type: isPOI ? 'poi' : 'address',
          cep: props.postcode
        });
      });
    }

    // Dynamic Multi-Factor Scorer and Ranking Algorithm
    // Evaluates both proximity, match similarity, coarse features, and POIs
    const tokenQuery = viaCepResolved ? composedQuery : text;
    const queryTokens = tokenQuery.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\d{5}-?\d{3}/g, "") // skip CEP
      .match(/\b\w{3,}\b/g) || [];

    const isPoiQuery = /hospital|shopping|posto|parque|restaurante|clube|escola|colégio|hotel|praça|teatro|museu|estação|terminal|aeroporto|loja|supermercado|condomínio|edifício/i.test(text);

    results.forEach(r => {
      let boost = 0;

      // 1. Keyword Similarity Boost (Token Matching)
      if (queryTokens.length > 0) {
        const rLabelNorm = r.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const rNameNorm = r.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        let matchedTokens = 0;
        queryTokens.forEach(token => {
          if (rLabelNorm.includes(token) || rNameNorm.includes(token)) {
            matchedTokens++;
          }
        });
        
        // Proportional boost up to 25 points
        boost += (matchedTokens / queryTokens.length) * 25;
      }

      // 2. POI query matching boost
      if (isPoiQuery && r.type === 'poi') {
        boost += 12;
      }

      // 3. Demote administrative or coarse results unless the user only typed city names
      const isCoarse = /state|country|region|administrative|municipality|state_district/i.test(r.type || '');
      const isSimpleCity = r.label.split(',').length <= 2;
      const textWordCount = text.trim().split(/\s+/).length;
      if (textWordCount > 2 && (isCoarse || isSimpleCity) && !text.toLowerCase().includes('brasil')) {
         boost -= 30; // Heavy penalty for coarse results when specific input was given
      }

      // 4. Proximity penalty (biases local options, but CAPPED at 15 pts to allow cross-region searches)
      if (hasProximity && lat && lon) {
        const dist = Math.sqrt(Math.pow(r.lat - lat, 2) + Math.pow(r.lon - lon, 2));
        // Distances under ~5km (0.05 degrees) get zero penalty. Above that, soft penalty capped at 15 points max.
        let proximityPenalty = 0;
        if (dist > 0.05) {
          proximityPenalty = Math.min(15, (dist - 0.05) * 4);
        }
        boost -= proximityPenalty;
      }

      // 5. Special ViaCEP accuracy matching boost
      if (viaCepResolved && resolvedViaCepData) {
        const rLabelLow = r.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const rNameLow = r.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        let matchScore = 0;

        if (resolvedViaCepData.bairro) {
          const normBairro = resolvedViaCepData.bairro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (rLabelLow.includes(normBairro) || rNameLow.includes(normBairro)) {
            matchScore += 25;
          }
        }

        if (resolvedViaCepData.logradouro) {
          const normLogradouro = resolvedViaCepData.logradouro.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const words = normLogradouro.split(/\s+/).filter((w: string) => w.length > 3 && !['rua', 'avenida', 'travessa', 'beco', 'praca', 'alameda', 'rodovia', 'estrada'].includes(w));
          let wordMatches = 0;
          words.forEach((w: string) => {
            if (rLabelLow.includes(w) || rNameLow.includes(w)) {
              wordMatches++;
            }
          });

          if (words.length > 0 && wordMatches > 0) {
            matchScore += (wordMatches / words.length) * 35;
          }
        }

        // Add matching score boost
        boost += matchScore;
      }

      // Apply the final computed boost
      r.confidenceScore = Math.max(0, Math.min(100, Math.round(r.confidenceScore + boost)));
    });

    // Sort by confidenceScore falling
    results.sort((a, b) => b.confidenceScore - a.confidenceScore);
    const finalResults = results.slice(0, 8);
    
    if (finalResults.length > 0) {
      geoCache.set(normalizedText, finalResults);
    }
    
    return finalResults;
  } catch (error) {
    console.error("Geocoding engine failed:", error);
    return [];
  }
}

export async function preciseGeocode(address: string): Promise<GeocodeResult> {
  // Try Google Geocoding API (using Places new Text Search under the hood for stability)
  try {
    const res = await fetch(`/api/places/google-geocode?address=${encodeURIComponent(address)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.places && data.places.length > 0) {
        const item = data.places[0];
        const location = item.location;
        const isPOI = item.types?.some((t: string) => ['establishment', 'point_of_interest', 'premise', 'airport', 'hospital'].includes(t));
        return {
          lat: location.latitude,
          lon: location.longitude,
          name: item.displayName?.text || address.split(',')[0],
          context: item.formattedAddress || address,
          label: address,
          confidenceScore: 100,
          source: 'google',
          type: isPOI ? 'poi' : 'address'
        };
      }
    }
  } catch (error) {
    console.warn("Google Geocoding failed, falling back to other providers...", error);
  }


  // Fallback to active geocoding providers - Filtra resultados placeholder sem coordenadas reais (0, 0)
  const results = await enhancedAutocomplete(address);
  const validResults = results.filter(r => r.lat !== 0 || r.lon !== 0);
  if (validResults.length > 0) {
    return validResults[0]; // Highest confidence result with real coordinates
  }
  throw new Error(`Não foi possível encontrar as coordenadas para: ${address}`);
}
