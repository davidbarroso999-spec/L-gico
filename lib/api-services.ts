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
        endpoint: 'geocode/autocomplete',
        params: {
          text,
          size: '5',
          'boundary.country': 'BRA',
          'focus.point.lat': MANAUS_COORDS.lat.toString(),
          'focus.point.lon': MANAUS_COORDS.lon.toString()
        }
      })
    });
    
    // Check if response is ok and if it's JSON
    const contentType = res.headers.get('content-type');
    if (!res.ok || !contentType?.includes('application/json')) {
      throw new Error('ORS Autocomplete failed, shifting to fallback');
    }

    const data = await res.json();
    if (data.features) {
      return data.features.map((f: any) => {
        const props = f.properties;
        const details = [props.neighbourhood, props.locality, props.county, props.region].filter(Boolean).join(' - ');
        return {
          label: props.name + (details ? `, ${details}` : ''),
          name: props.name,
          context: details
        };
      });
    }
    return [];
  } catch (error) {
    console.warn('ORS Autocomplete failing, using Photon fallback...');
    try {
      const fallbackRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&lat=${MANAUS_COORDS.lat}&lon=${MANAUS_COORDS.lon}&limit=5`);
      const fallbackData = await fallbackRes.json();
      return fallbackData.features.map((f: any) => {
        const props = f.properties;
        const details = [props.city || props.town, props.state].filter(Boolean).join(' - ');
        return {
          label: props.name + (details ? `, ${details}` : ''),
          name: props.name,
          context: details
        };
      });
    } catch (fallbackError) {
      console.error('All autocomplete providers failed:', fallbackError);
      return [];
    }
  }
}

export async function geocode(address: string) {
  // Regex for Brazilian CEP (00000-000 or 00000000)
  const isCEP = /^\d{5}-?\d{3}$/.test(address.trim());
  
  const params: any = {
    text: address,
    size: '3',
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
    
    const contentType = res.headers.get('content-type');
    if (!res.ok || !contentType?.includes('application/json')) {
      throw new Error('ORS Geocode failed');
    }

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
    console.warn('ORS Geocode failing, using Photon fallback for:', address);
    try {
      const fallbackRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&lat=${MANAUS_COORDS.lat}&lon=${MANAUS_COORDS.lon}&limit=1`);
      const fallbackData = await fallbackRes.json();
      if (fallbackData && fallbackData.features && fallbackData.features.length > 0) {
        const f = fallbackData.features[0];
        return {
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          label: `${f.properties.name || address}, ${f.properties.city || ''}`
        };
      }
    } catch (e) {
       console.error('Fallback geocoding also failed');
    }
    
    // Final emergency fallback (Manaus semi-random)
    return { lat: MANAUS_COORDS.lat + (Math.random() - 0.5) * 0.1, lon: MANAUS_COORDS.lon + (Math.random() - 0.5) * 0.1, label: address };
  }
}

export async function getWeather(lat: number, lon: number) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${KEYS.OPENWEATHER}&units=metric&lang=pt_br`);
    if (!res.ok) throw new Error('OpenWeather failing');
    return await res.json();
  } catch (error) {
    console.warn('OpenWeather failing, using Open-Meteo fallback...');
    try {
      // Open-Meteo is 100% free and requires no API Key
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const data = await res.json();
      const current = data.current_weather;
      
      // Map Open-Meteo structure to OpenWeather structure for compatibility
      return {
        main: { temp: current.temperature },
        weather: [{ 
          main: 'Cloudy', 
          description: 'condição local',
          icon: '03d' // Approximation
        }],
        wind: { speed: current.windspeed },
        name: 'Localização'
      };
    } catch (fallbackError) {
      return { main: { temp: 28 }, weather: [{ main: 'Clear', description: 'céu limpo', icon: '01d' }], wind: { speed: 5 } };
    }
  }
}

export async function getElevation(lat: number, lon: number) {
  try {
    const res = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lon}`);
    const data = await res.json();
    return data.results?.[0]?.elevation || 0;
  } catch (error) {
    return 20 + Math.random() * 30; // Manaus elevation average approx
  }
}

export async function getInmetForecast(cityCode: string = '1302603') {
  try {
    const res = await fetch(`https://apiprevmet3.inmet.gov.br/previsao/${cityCode}`);
    return await res.json();
  } catch (error) {
    console.warn('INMET fallback');
    return null;
  }
}

export async function getTrafficIncidents(points: [number, number][]) {
  // Rough bounding box from route points
  const lats = points.map(p => p[0]);
  const lons = points.map(p => p[1]);
  const bbox = `${Math.min(...lons)},${Math.min(...lats)},${Math.max(...lons)},${Math.max(...lats)}`;
  
  try {
    const res = await fetch(`https://api.tomtom.com/traffic/services/4/incidentDetails/s3/${bbox}/10/pt-BR.json?key=${KEYS.TOMTOM}`);
    return await res.json();
  } catch (error) {
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
      const osrmRes = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration`);
      const osrmData = await osrmRes.json();
      
      if (osrmData.code === 'Ok') {
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
      const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
      const osrmData = await osrmRes.json();
      
      if (osrmData.code === 'Ok' && osrmData.routes.length > 0) {
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
