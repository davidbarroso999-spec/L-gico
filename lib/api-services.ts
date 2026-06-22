/**
 * API Services for Voie Express
 * Includes fallbacks for all main integrations.
 */

const KEYS = {
  ORS: process.env.NEXT_PUBLIC_ORS_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImE2MGFmMzA2YmQ5NzQ4MjQ4ODljOGNhMTgzM2Y3YjAwIiwiaCI6Im11cm11cjY0In0=',
  OPENWEATHER: process.env.NEXT_PUBLIC_OPENWEATHER_KEY || 'a46d5eac976d211d6bde3bbaf70073f9',
  VISUALCROSSING: process.env.NEXT_PUBLIC_VISUALCROSSING_KEY || 'VBC92VXW9WTHYTJMUYGSBWX78',
  TOMTOM: process.env.NEXT_PUBLIC_TOMTOM_KEY || 'RTvaCPgTDMD4fSaOTbGkZNdHnnFs7Q4K',
};

// Fallback Mocks (Manaus area)
const MANAUS_COORDS = { lat: -3.119, lon: -60.021 };

export async function autocomplete(text: string) {
  if (!text || text.length < 3) return [];
  
  try {
    const res = await fetch('/api/ors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'geocode/search',
        params: {
          text,
          size: '6',
          'boundary.country': 'BRA',
          'focus.point.lat': MANAUS_COORDS.lat.toString(),
          'focus.point.lon': MANAUS_COORDS.lon.toString()
        }
      })
    });
    
    if (!res.ok) throw new Error('ORS Search API Failed');

    const data = await res.json();
    if (data.features) {
      return data.features.map((f: any) => {
        const props = f.properties;
        const details = [props.neighbourhood, props.locality, props.county, props.region].filter(Boolean).join(' - ');
        return {
           label: props.name + (details ? `, ${details}` : ''),
           name: props.name,
           context: details,
           lat: f.geometry.coordinates[1],
           lon: f.geometry.coordinates[0]
        };
      });
    }

    return [];
  } catch (error) {
    console.error('ORS autocomplete failed:', error);
    return [];
  }
}

export async function geocode(address: string) {
  const isCEP = /^\d{5}-?\d{3}$/.test(address.trim());
  
  const params: any = {
    text: address,
    size: '1',
    'focus.point.lat': MANAUS_COORDS.lat.toString(),
    'focus.point.lon': MANAUS_COORDS.lon.toString()
  };
  
  if (isCEP || !address.toLowerCase().includes('brasil') || !address.toLowerCase().includes('brazil')) {
    params['boundary.country'] = 'BRA';
  }

  try {
    const res = await fetch('/api/ors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'geocode/search',
        params
      })
    });
    
    if (!res.ok) throw new Error('ORS Geocode failed');

    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const best = data.features[0];
      const props = best.properties;
      const details = [props.neighbourhood, props.locality, props.region].filter(Boolean).join(' - ');
      return {
        lat: best.geometry.coordinates[1],
        lon: best.geometry.coordinates[0],
        label: props.name + (details ? `, ${details}` : '')
      };
    }
    throw new Error('No results from ORS');
  } catch (error) {
    console.error('ORS Geocode failing:', error);
    // Final emergency fallback (Manaus semi-random)
    return { lat: MANAUS_COORDS.lat + (Math.random() - 0.5) * 0.1, lon: MANAUS_COORDS.lon + (Math.random() - 0.5) * 0.1, label: address };
  }
}

export async function getWeather(lat: number, lon: number) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    return { main: { temp: 28 }, weather: [{ main: 'Clear', description: 'céu limpo', icon: '01d' }], wind: { speed: 5 } };
  }

  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      return await res.json();
    }
    throw new Error(`Proxy status: ${res.status}`);
  } catch (error: any) {
    console.warn('[Client Weather] Proxy falhou, tentando Open-Meteo diretamente:', error.message);
    try {
      const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const directRes = await fetch(directUrl);
      if (directRes.ok) {
        const data = await directRes.json();
        const current = data.current_weather;
        return {
          main: { temp: current?.temperature ?? 28 },
          weather: [{ main: 'Cloudy', description: 'condição local', icon: '03d' }],
          wind: { speed: current?.windspeed ?? 5 }
        };
      }
    } catch (directErr: any) {
      console.warn('[Client Weather] Falha no Open-Meteo direto:', directErr.message);
    }
    // Final safety fallback
    return { main: { temp: 28 }, weather: [{ main: 'Clear', description: 'céu limpo', icon: '01d' }], wind: { speed: 5 } };
  }
}

export async function getElevation(lat: number, lon: number) {
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    return 25;
  }

  try {
    const res = await fetch(`/api/elevation?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.elevation === 'number') {
        return data.elevation;
      }
    }
    throw new Error(`Proxy response not valid`);
  } catch (error: any) {
    console.warn('[Client Elevation] Proxy falhou, tentando Open-Meteo diretamente:', error.message);
    try {
      const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const directRes = await fetch(directUrl);
      if (directRes.ok) {
        const data = await directRes.json();
        if (typeof data.elevation === 'number') {
          return data.elevation;
        }
      }
    } catch (directErr: any) {
      console.warn('[Client Elevation] Falha no Open-Meteo direto:', directErr.message);
    }
    return 20 + Math.random() * 30; // Manaus elevation average approx
  }
}

export async function getInmetForecast(cityCode: string = '1302603') {
  try {
    const res = await fetch(`/api/inmet?cityCode=${cityCode}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error: any) {
    console.warn('[Client INMET] Proxy falhou ou offline:', error.message);
    return null;
  }
}

export async function getTrafficIncidents(points: [number, number][]) {
  if (!points || points.length === 0) return { tm: { poi: [] } };
  
  try {
    const lats = points.map(p => p[0]);
    const lons = points.map(p => p[1]);
    if (lats.some(isNaN) || lons.some(isNaN)) {
      return { tm: { poi: [] } };
    }
    const bbox = `${Math.min(...lons)},${Math.min(...lats)},${Math.max(...lons)},${Math.max(...lats)}`;
    
    const res = await fetch(`/api/traffic?bbox=${encodeURIComponent(bbox)}`);
    if (!res.ok) return { tm: { poi: [] } };
    return await res.json();
  } catch (error: any) {
    console.warn('[Client Traffic] Proxy falhou ou offline:', error.message);
    return { tm: { poi: [] } };
  }
}

export async function getMatrix(locations: [number, number][], profile: string = 'driving-car', preference: string = 'fastest') {
  try {
    const res = await fetch('/api/gmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'matrix',
        payload: { locations, preference }
      })
    });
    
    if (!res.ok) throw new Error('Google Maps Matrix HTTP error');
    return await res.json();
  } catch (error) {
    console.warn('Google Maps Matrix failed, trying ORS fallback...', error);
    try {
      const res = await fetch('/api/ors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: `v2/matrix/${profile}`,
          method: 'POST',
          body: { 
            locations: locations.map(l => [l[1], l[0]]),
            metrics: ['distance', 'duration']
          }
        })
      });
      return await res.json();
    } catch (orsError) {
      console.error('All matrix providers failed:', orsError);
    }
    return null;
  }
}

export async function snapToRoad(points: [number, number][]): Promise<[number, number][]> {
  // Use OSRM Map Matching API to snap raw GPS coordinates to the road network
  try {
    const coords = points.map(p => `${p[1]},${p[0]}`).join(';');
    const radiuses = points.map(() => '50').join(';'); // 50 meter search radius
    const res = await fetch(`/api/osrm?type=match&coords=${encodeURIComponent(coords)}&extra=radiuses=${encodeURIComponent(radiuses)}`);
    
    if (!res.ok) throw new Error('OSRM Match API failed');
    const data = await res.json();

    if (data && data.code === 'Ok' && data.matchings && data.matchings.length > 0) {
      // The matched points are in tracepoints
      return data.tracepoints.map((tp: any, i: number) => {
        if (tp && tp.location) {
          return [tp.location[1], tp.location[0]]; // Return as [lat, lon]
        }
        return points[i]; // Fallback to original if not matched
      });
    }
  } catch (error) {
    console.warn('Snap to road failed, using raw coordinates:', error);
  }
  return points;
}

export async function getDirections(points: [number, number][], profile: string = 'driving-car', preference: string = 'fastest') {
  // Deduplicate consecutive identical/near-identical coordinates (under ~10 meters)
  const cleanPoints: [number, number][] = [];
  points.forEach(p => {
    if (cleanPoints.length === 0) {
      cleanPoints.push(p);
    } else {
      const last = cleanPoints[cleanPoints.length - 1];
      const dist = Math.sqrt(Math.pow(last[0] - p[0], 2) + Math.pow(last[1] - p[1], 2));
      if (dist > 0.0001) {
        cleanPoints.push(p);
      }
    }
  });

  // Ensure we have at least 2 distinct points to compute a valid route, otherwise repeat the point slightly offset
  if (cleanPoints.length < 2 && points.length > 0) {
    const single = points[0];
    cleanPoints.push([single[0] + 0.0001, single[1] + 0.0001]);
  }

  try {
    const res = await fetch('/api/gmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'directions',
        payload: { points: cleanPoints, preference }
      })
    });
    
    if (!res.ok) throw new Error('Google Maps Directions HTTP error');
    return await res.json();
  } catch (error) {
    console.warn('Google Maps Directions failed, trying ORS fallback...', error);
    try {
      const res = await fetch('/api/ors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: `v2/directions/${profile}/geojson`,
          method: 'POST',
          body: { 
            coordinates: cleanPoints.map(p => [p[1], p[0]]),
            preference: preference,
            instructions: true,
            language: "pt-BR"
          }
        })
      });
      return await res.json();
    } catch (orsError) {
      console.error('All directions providers failed:', orsError);
    }
    return null;
  }
}
