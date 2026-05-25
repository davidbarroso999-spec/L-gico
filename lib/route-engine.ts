import { getMatrix, getWeather, getElevation, getTrafficIncidents, getDirections, getInmetForecast } from './api-services';
import { preciseGeocode } from './geocode-engine';
import { getGeminiAnalysis } from './ai-engine';
import { OfflineManager } from './offline-manager';
import { db } from './db';

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
  timeWindow?: { start: string; end: string };
  activeOccurrences?: any[];
}

export interface RouteOptions {
  priority: 'speed' | 'distance' | 'economy' | 'safety' | 'balanced';
  vehicle: 'car' | 'moto' | 'truck' | 'van' | 'boat';
  avoidDirt: boolean;
  avoidFloods: boolean;
  avoidHills: boolean;
  customPrompt?: string;
}

const WEIGHTS = {
  speed: { w1: 0.1, w2: 0.9, w3: 0.0, w4: 0.0 },     // 90% Time priority
  distance: { w1: 1.0, w2: 0.0, w3: 0.0, w4: 0.0 },  // 100% Distance priority
  economy: { w1: 0.4, w2: 0.4, w3: 0.2, w4: 0.0 },   // Balance + Eco consideration
  safety: { w1: 0.2, w2: 0.2, w3: 0.0, w4: 0.6 },    // 60% Safety weight
  balanced: { w1: 0.35, w2: 0.35, w3: 0.15, w4: 0.15 }, // Even distribution
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export async function optimizeRoute(
  addresses: string[], 
  options: RouteOptions, 
  knownCoords?: Record<string, { lat: number, lon: number }>,
  timeWindows?: Record<number, { start: string; end: string }>
) {
  const routeHash = btoa(encodeURIComponent(addresses.join('|') + JSON.stringify(options) + JSON.stringify(timeWindows || {})));

  if (typeof window !== 'undefined' && !navigator.onLine) {
    console.warn("OFFLINE MODE: Attempting to load cached route...");
    const cached = await OfflineManager.getOfflineRoute(routeHash);
    if (cached) return cached;
    console.warn("No cached route found, returning naive approximation.");
  }

  // 1. Geocode
  const locations = await Promise.all(addresses.map(async (addr, i) => {
    try {
      if (knownCoords && knownCoords[addr]) {
        return {
          lat: knownCoords[addr].lat,
          lon: knownCoords[addr].lon,
          id: i.toString(),
          address: addr,
          label: addr,
          confidenceScore: 100,
          source: 'cache' as const,
          type: 'address' as const
        };
      }
      const geo = await preciseGeocode(addr);
      return { ...geo, id: i.toString(), address: addr };
    } catch (error) {
      console.warn('Geocoding failed, falling back to approximation.', error);
      // Rough emergency approximation for fallback (Manaus center)
      return {
        lat: -3.119 + (Math.random() - 0.5) * 0.02,
        lon: -60.021 + (Math.random() - 0.5) * 0.02,
        id: i.toString(),
        address: addr
      };
    }
  }));

  // 2. Intelligence Layer: Gemini Strategic Observations
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
    console.error("AI pre-scan failed:", e);
  }

  // Get Gemini Strategic Directive
  const aiStrategy = await getGeminiAnalysis({
    task: "STRATEGY_ONLY",
    locations: locations.map(l => l.address),
    weather: envReport.weather,
    traffic: envReport.traffic,
    priority: options.priority,
    constraints: options,
    customPrompt: options.customPrompt
  });

  // 3. Matrix & Profile Calculation
  const coords: [number, number][] = locations.map(l => [l.lat, l.lon]);
  
  let profile = 'driving-car';
  if (options.vehicle === 'moto') profile = 'cycling-regular';
  if (options.vehicle === 'truck' || options.vehicle === 'van') profile = 'driving-hgv';

  // Explicitly map priorities to ORS preferences based on user request
  let preference = 'fastest';
  if (options.priority === 'speed') preference = 'fastest'; // Velocidade
  if (options.priority === 'distance') preference = 'shortest'; // Distância
  if (options.priority === 'economy' || options.priority === 'safety' || options.priority === 'balanced') {
    preference = 'recommended'; // Best balance for others
  }

  const matrix = await getMatrix(coords, profile);

  // 4. Routing logic: Mantém o primeiro como origem e o último como destino com simulação de tempo realista (iniciando às 08:00)
  const sequence: RouteStop[] = [];
  const start = { 
    ...locations[0], 
    sequence: 0, 
    riskScore: 0, 
    estimatedArrival: "08:00", 
    timeWindow: timeWindows?.[0]
  };
  const end = locations.length > 1 ? { ...locations[locations.length - 1] } : null;
  const intermediates = locations.slice(1, -1);

  sequence.push(start);

  let currentTime = 480; // Entrada na rota: 08:00 AM em minutos acumulados

  if (intermediates.length > 0) {
    const unvisited = [...intermediates];
    const weights = WEIGHTS[options.priority];
    let current: any = start;

    while (unvisited.length > 0) {
      let bestIdx = -1;
      let minCost = Infinity;
      let chosenArrival = currentTime;
      let chosenDeparture = currentTime;
      const currentLocIdx = locations.findIndex(l => l.id === current.id);

      for (let i = 0; i < unvisited.length; i++) {
        const target = unvisited[i];
        const targetLocIdx = locations.findIndex(l => l.id === target.id);
        
        const d = (matrix?.distances?.[currentLocIdx]?.[targetLocIdx] || 1000) / 1000; // km
        const t = (matrix?.durations?.[currentLocIdx]?.[targetLocIdx] || 600) / 60; // min
        
        // Custo com base em pesos da prioridade de rota
        const baseCost = (weights.w1 * d) + (weights.w2 * t);
        
        // Avaliação de janelas de entrega temporais (Time Windows)
        const originalIdx = parseInt(target.id);
        const window = timeWindows?.[originalIdx];
        
        let waitTime = 0;
        let lateness = 0;
        const arrivalTime = currentTime + t;
        let departureTime = arrivalTime + 15; // padrão: 15 minutos de tempo de descarga/serviço
        
        if (window) {
          const windowStart = timeToMinutes(window.start);
          const windowEnd = timeToMinutes(window.end);
          
          if (windowStart !== null && arrivalTime < windowStart) {
            waitTime = windowStart - arrivalTime;
            departureTime = windowStart + 15; // Inicia serviço apenas quando a janela abre
          }
          if (windowEnd !== null && arrivalTime > windowEnd) {
            lateness = arrivalTime - windowEnd;
          }
        }
        
        // Penalizar atraso de forma rígida, e espera de forma moderada
        const penalty = (waitTime * 0.15) + (lateness * 10.0);
        const cost = baseCost + penalty;
        
        if (cost < minCost) {
          minCost = cost;
          bestIdx = i;
          chosenArrival = arrivalTime;
          chosenDeparture = departureTime;
        }
      }
      
      const nextStop = unvisited.splice(bestIdx, 1)[0];
      const arrivalStr = formatMinutes(chosenArrival);
      
      current = { 
        ...nextStop, 
        sequence: sequence.length, 
        riskScore: 0,
        estimatedArrival: arrivalStr,
        timeWindow: timeWindows?.[parseInt(nextStop.id)]
      };
      sequence.push(current as RouteStop);
      currentTime = chosenDeparture;
    }
  }

  if (end) {
    const lastStop = sequence[sequence.length - 1];
    const lastLocIdx = locations.findIndex(l => l.id === lastStop.id);
    const endLocIdx = locations.findIndex(l => l.id === end.id);
    const lastT = (matrix?.durations?.[lastLocIdx]?.[endLocIdx] || 600) / 60; // min
    
    const endArrivalMins = currentTime + lastT;
    const endArrivalStr = formatMinutes(endArrivalMins);
    
    sequence.push({ 
      ...end, 
      sequence: sequence.length, 
      riskScore: 0, 
      estimatedArrival: endArrivalStr,
      timeWindow: timeWindows?.[parseInt(end.id)]
    } as RouteStop);
  }

  // 4. Enrich with Environmental Data & Local Occurrences
  const trafficData = await getTrafficIncidents(coords);
  const inmetData = await getInmetForecast();

  let localOccurrences: any[] = [];
  try {
    localOccurrences = await db.occurrences.toArray();
  } catch (err) {
    console.warn("Could not retrieve local occurrences from database:", err);
  }

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
    
    let poiList = [];
    if (trafficData && trafficData.tm && Array.isArray(trafficData.tm.poi)) {
      poiList = trafficData.tm.poi;
    }
    const nearbyIncidents = poiList.filter((p: any) => {
        const py = p?.p?.y || 0;
        const px = p?.p?.x || 0;
        const dist = Math.sqrt(Math.pow(py - stop.lat, 2) + Math.pow(px - stop.lon, 2));
        return dist < 0.01; // Approx 1km
    });
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

    // Local Occurrences integration
    const activeOccurrences = localOccurrences.filter((occ: any) => {
      const dist = calculateDistance(stop.lat, stop.lon, occ.lat, occ.lon);
      return dist <= 1.5; // Within 1.5km
    });

    if (activeOccurrences.length > 0) {
      activeOccurrences.forEach((o: any) => {
        if (o.type === 'flood' || o.type === 'road_closed') risk += 35;
        else if (o.type === 'accident' || o.type === 'congestion') risk += 25;
        else risk += 15;
      });
    }

    return { 
      ...stop, 
      weather, 
      elevation, 
      riskScore: Math.min(100, risk),
      activeOccurrences 
    };
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
    score: 100 - (enrichedSequence.reduce((acc, s) => acc + s.riskScore, 0) / enrichedSequence.length),
    customPrompt: options.customPrompt
  };

  // 6. Get AI Analysis - Call our reliable local/server AI engine directly
  const aiAnalysis = await getGeminiAnalysis({ ...baseResult, strategy: aiStrategy });

  const finalResult = { 
    ...baseResult, 
    sequence: enrichedSequence,
    aiAnalysis,
    supabaseUsed: false
  };
  
  // Cache the route for offline mode
  if (typeof window !== 'undefined') {
    OfflineManager.cacheRoute(routeHash, finalResult);
  }

  return finalResult;
}
