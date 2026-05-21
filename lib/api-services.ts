/**
 * API Services for Logix Route
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
  try {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error('Weather API returned error response');
    return await res.json();
  } catch (error) {
    console.error('getWeather proxy error:', error);
    return { main: { temp: 28 }, weather: [{ main: 'Clear', description: 'céu limpo', icon: '01d' }], wind: { speed: 5 } };
  }
}

export async function getElevation(lat: number, lon: number) {
  try {
    const res = await fetch(`/api/elevation?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error('Elevation API returned error response');
    const data = await res.json();
    return data.elevation || 25;
  } catch (error) {
    console.error('getElevation proxy error:', error);
    return 20 + Math.random() * 30; // Manaus elevation average approx
  }
}

export async function getInmetForecast(cityCode: string = '1302603') {
  try {
    const res = await fetch(`/api/inmet?cityCode=${cityCode}`);
    if (!res.ok) throw new Error('INMET API returned error response');
    return await res.json();
  } catch (error) {
    console.warn('INMET proxy error:', error);
    return null;
  }
}

export async function getTrafficIncidents(points: [number, number][]) {
  // Rough bounding box from route points
  const lats = points.map(p => p[0]);
  const lons = points.map(p => p[1]);
  const bbox = `${Math.min(...lons)},${Math.min(...lats)},${Math.max(...lons)},${Math.max(...lats)}`;
  
  try {
    const res = await fetch(`/api/traffic?bbox=${encodeURIComponent(bbox)}`);
    if (!res.ok) throw new Error('Traffic API returned error response');
    return await res.json();
  } catch (error) {
    console.error('getTrafficIncidents proxy error:', error);
    return { tm: { poi: [] } };
  }
}

export async function getMatrix(locations: [number, number][], profile: string = 'driving-car') {
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
    
    if (!res.ok) throw new Error('ORS Matrix HTTP error');
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) throw new Error('ORS Matrix non-JSON response');

    return await res.json();
  } catch (error) {
    console.warn('ORS Matrix failed, trying OSRM fallback...', error);
    try {
      const coords = locations.map(l => `${l[1]},${l[0]}`).join(';');
      const osrmRes = await fetch(`/api/osrm?type=table&coords=${encodeURIComponent(coords)}`);
      const osrmData = await osrmRes.json();
      
      if (osrmData && osrmData.code === 'Ok') {
        return {
          durations: osrmData.durations,
          distances: osrmData.distances
        };
      }
    } catch (osrmError) {
      console.error('All matrix providers failed:', osrmError);
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
  try {
    const res = await fetch('/api/ors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: `v2/directions/${profile}/geojson`,
        method: 'POST',
        body: { 
          coordinates: points.map(p => [p[1], p[0]]),
          preference: preference,
          instructions: true
        }
      })
    });
    
    if (!res.ok) throw new Error('ORS Directions HTTP error');
    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json') && !contentType?.includes('application/geo+json')) {
      throw new Error('ORS Directions non-JSON response');
    }

    return await res.json();
  } catch (error) {
    console.warn('ORS Directions failed, trying OSRM fallback...', error);
    try {
      const coords = points.map(p => `${p[1]},${p[0]}`).join(';');
      const osrmRes = await fetch(`/api/osrm?type=route&coords=${encodeURIComponent(coords)}`);
      const osrmData = await osrmRes.json();
      
      if (osrmData && osrmData.code === 'Ok' && osrmData.routes.length > 0) {
        // Map OSRM structure to match ORS expected structure
        const route = osrmData.routes[0];
        const segments = route.legs?.map((leg: any) => ({
          distance: leg.distance,
          duration: leg.duration,
          steps: leg.steps ? leg.steps.map((s: any) => ({
            distance: s.distance,
            duration: s.duration,
            instruction: s.maneuver?.type + ' ' + (s.name || ''),
          })) : []
        })) || [];

        return {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: osrmData.routes[0].geometry,
            properties: {
              summary: {
                distance: osrmData.routes[0].distance,
                duration: osrmData.routes[0].duration
              },
              segments
            }
          }]
        };
      }
    } catch (osrmError) {
      console.error('All directions providers failed:', osrmError);
    }
    return null;
  }
}
