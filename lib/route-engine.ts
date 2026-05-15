import { geocode, getMatrix, getWeather, getElevation, getTrafficIncidents, getDirections, getInmetForecast } from './api-services';
import { getKimiAnalysis } from './ai-engine';

export interface RouteStop {
  id: string;
  address: string;
  lat: number;
  lon: number;
  sequence: number;
  weather?: any;
  elevation?: number;
  incidents?: any[];
  riskScore: number;
  estimatedArrival?: string;
}

export interface RouteOptions {
  priority: 'speed' | 'distance' | 'economy' | 'safety' | 'balanced';
  vehicle: 'car' | 'moto' | 'truck' | 'van' | 'boat';
  avoidDirt: boolean;
  avoidFloods: boolean;
  avoidHills: boolean;
}

const WEIGHTS = {
  speed: { w1: 0.2, w2: 0.5, w3: 0.2, w4: 0.1 },
  distance: { w1: 0.5, w2: 0.3, w3: 0.1, w4: 0.1 },
  economy: { w1: 0.2, w2: 0.2, w3: 0.5, w4: 0.1 },
  safety: { w1: 0.1, w2: 0.1, w3: 0.1, w4: 0.7 },
  balanced: { w1: 0.25, w2: 0.25, w3: 0.25, w4: 0.25 },
};

export async function optimizeRoute(addresses: string[], options: RouteOptions) {
  // 1. Geocode
  const locations = await Promise.all(addresses.map(async (addr, i) => {
    const geo = await geocode(addr);
    return { ...geo, id: i.toString(), address: addr };
  }));

  // 2. Intelligence Layer: Kimi 2.6 "Observations"
  let envReport = { weather: "Desconhecida", elevation: "Analizando...", traffic: "Normal" };
  try {
    const [originWeather, trafficIncidents] = await Promise.all([
      getWeather(locations[0].lat, locations[0].lon),
      getTrafficIncidents([[locations[0].lat, locations[0].lon]])
    ]);
    
    if (originWeather?.weather?.[0]?.description) {
      envReport.weather = `${originWeather.weather[0].description}, ${originWeather.main.temp}C`;
    }
    if (trafficIncidents?.tm?.poi?.length > 0) {
      envReport.traffic = "Pontos de Lentidão detectados na região";
    }
  } catch (e) {
    console.error("Kimi pre-scan failed:", e);
  }

  // Get Kimi Strategic Directive
  const aiStrategy = await getKimiAnalysis({
    task: "STRATEGY_ONLY",
    locations: locations.map(l => l.address),
    weather: envReport.weather,
    traffic: envReport.traffic,
    priority: options.priority,
    constraints: options
  });

  // 3. Matrix & Profile Calculation
  const coords: [number, number][] = locations.map(l => [l.lat, l.lon]);
  
  let profile = 'driving-car';
  if (options.vehicle === 'moto') profile = 'cycling-regular';
  if (options.vehicle === 'truck' || options.vehicle === 'van') profile = 'driving-hgv';

  let preference = 'fastest';
  if (options.priority === 'distance') preference = 'shortest';
  if (options.priority === 'economy' || options.priority === 'safety' || options.priority === 'balanced') preference = 'recommended';

  const matrix = await getMatrix(coords, profile);

  // 4. Routing logic: Mantém o primeiro como origem e o último como destino
  // As paradas intermediárias podem ser otimizadas pela IA ou pelo algoritmo
  const sequence: RouteStop[] = [];
  const start = { ...locations[0], sequence: 0, riskScore: 0 };
  const end = locations.length > 1 ? { ...locations[locations.length - 1] } : null;
  const intermediates = locations.slice(1, -1);

  sequence.push(start);

  if (intermediates.length > 0) {
    const unvisited = [...intermediates];
    const weights = WEIGHTS[options.priority];
    let current: any = start;

    while (unvisited.length > 0) {
      let bestIdx = -1;
      let minCost = Infinity;
      const currentLocIdx = locations.findIndex(l => l.id === current.id);

      for (let i = 0; i < unvisited.length; i++) {
        const target = unvisited[i];
        const targetLocIdx = locations.findIndex(l => l.id === target.id);
        
        const d = matrix?.distances?.[currentLocIdx]?.[targetLocIdx] || 1000;
        const t = (matrix?.durations?.[currentLocIdx]?.[targetLocIdx] || 600) / 60;
        
        const cost = weights.w1 * (d/1000) + weights.w2 * t;
        if (cost < minCost) {
            minCost = cost;
            bestIdx = i;
        }
      }
      const nextStop = unvisited.splice(bestIdx, 1)[0];
      current = { ...nextStop, sequence: sequence.length, riskScore: 0 };
      sequence.push(current as RouteStop);
    }
  }

  if (end) {
    sequence.push({ ...end, sequence: sequence.length, riskScore: 0 } as RouteStop);
  }

  // 4. Enrich with Environmental Data
  const trafficData = await getTrafficIncidents(coords);
  const inmetData = await getInmetForecast();

  const enrichedSequence = await Promise.all(sequence.map(async (stop, idx) => {
    const weather = await getWeather(stop.lat, stop.lon);
    const elevation = await getElevation(stop.lat, stop.lon);
    
    // Seasonal check: typically rainy season in Amazon region is Dec to May
    const currentMonth = new Date().getMonth() + 1;
    const isRainySeason = currentMonth >= 12 || currentMonth <= 5;

    // Risk calculation
    let risk = 0;
    if (weather.rain?.['1h'] > 5) risk += 15;
    if (weather.weather?.[0]?.main === 'Thunderstorm') risk += 30;
    if (isRainySeason && weather.weather?.[0]?.main === 'Rain') risk += 10;
    
    // TomTom Traffic Integration
    const nearbyIncidents = trafficData.tm?.poi?.filter((p: any) => {
        const dist = Math.sqrt(Math.pow(p.p.y - stop.lat, 2) + Math.pow(p.p.x - stop.lon, 2));
        return dist < 0.01; // Approx 1km
    }) || [];
    if (nearbyIncidents.length > 0) risk += 20;

    // Elevation risk (simplified: check incline from previous stop if exists)
    if (idx > 0) {
        const prev = sequence[idx - 1];
        const currentLocIdx = locations.findIndex(l => l.id === stop.id);
        const prevLocIdx = locations.findIndex(l => l.id === prev.id);
        
        const dist = matrix?.distances?.[prevLocIdx]?.[currentLocIdx] || 1000;
        const elevDiff = Math.abs(elevation - (prev.elevation || 0));
        if (elevDiff > 50 && dist < 1000) risk += 10;
    }

    return { ...stop, weather, elevation, riskScore: Math.min(100, risk) };
  }));

  // 5. Final geometry
  let directions = await getDirections(enrichedSequence.map(s => [s.lat, s.lon]), profile, preference);

  if (!directions?.features?.[0]?.geometry) {
    console.error("Critical: Cannot find directions. Features array might be empty or directions is null.", directions);
    
    // Auto-generate a straight line fallback if all else fails
    const distanceFallback = enrichedSequence.length > 1 ? 5000 * (enrichedSequence.length - 1) : 0; // 5km per leg

    directions = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: enrichedSequence.map(s => [s.lon, s.lat])
        },
        properties: {
          summary: {
            distance: distanceFallback,
            duration: enrichedSequence.length * 600
          },
          segments: []
        }
      }]
    };
  }

  const baseResult = {
    sequence: enrichedSequence,
    geometry: directions?.features?.[0]?.geometry,
    summary: directions?.features?.[0]?.properties?.summary || { distance: 0, duration: 0 },
    segments: directions?.features?.[0]?.properties?.segments || [],
    score: 100 - (enrichedSequence.reduce((acc, s) => acc + s.riskScore, 0) / enrichedSequence.length)
  };

  // 6. Get AI Analysis from Kimi 2.6
  const aiAnalysis = await getKimiAnalysis({ ...baseResult, strategy: aiStrategy });

  return { ...baseResult, aiAnalysis };
}
