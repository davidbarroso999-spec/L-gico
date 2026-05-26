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
  amazonasHydrology?: {
    season: 'cheia' | 'vazante';
    seasonLabel: string;
    warning: string;
    historicalContext: string;
    riskPenalty: number;
  };
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

export function getAmazonasHydrology(address: string, lat: number, lon: number) {
  const isAmazonas = 
    address.toLowerCase().includes('manaus') || 
    address.toLowerCase().includes('am') || 
    address.toLowerCase().includes('amazonas') || 
    (lat < -1.0 && lat > -4.5 && lon < -57.0 && lon > -63.5);

  if (!isAmazonas) return undefined;

  const month = new Date().getMonth() + 1; // 1-indexed (1 = Jan, 12 = Dec)
  
  // Seasonal classifications
  // Cheia: Dec (12) to Jun (6)
  // Vazante / Seca: Jul (7) to Nov (11)
  const isCheia = month >= 12 || month <= 6; 
  
  const season: 'cheia' | 'vazante' = isCheia ? 'cheia' : 'vazante';
  const seasonLabel = isCheia ? 'Cheia / Alagamento Sazonal (Dez-Jun)' : 'Vazante / Estiagem Severa (Jul-Nov)';
  
  let warning = "";
  let historicalContext = "";
  let riskPenalty = 0;

  const addrLower = address.toLowerCase();

  if (isCheia) {
    if (addrLower.includes('centro') || addrLower.includes('porto') || addrLower.includes('educandos') || addrLower.includes('compensa')) {
      warning = "Sinal de Cota Crítica: Nível do Rio Negro elevado. Vias adjacentes ao porto e pontes marginais enfrentam refluxo pluvial.";
      historicalContext = "No pico de cheias, as bacias urbanas inundam orlas do Centro e Educandos, comprometendo o fluxo cinético e a aderência.";
      riskPenalty = 25;
    } else if (addrLower.includes('am-010') || addrLower.includes('br-319')) {
      warning = "Saturação de Solos AM: Pavimento macio e riscos de desmoronamento fluvial periférico (erosão / terras caídas).";
      historicalContext = "O fluxo hidrográfico desgasta encostas de rodovias sem escoamento, demandando torque estabilizado.";
      riskPenalty = 20;
    } else {
      warning = "Inverno Amazônico Ativo: Índice pluviométrico diário elevado. Risco de buracos ocultos sob lâminas d'água.";
      historicalContext = "A alta convergência intertropical satura bueiros, reduzindo a capacidade dinâmica das vias secundárias de Manaus.";
      riskPenalty = 12;
    }
  } else {
    // Vazante / Drought Phase (Jul-Nov)
    if (addrLower.includes('ceasa') || addrLower.includes('porto') || addrLower.includes('chibatão')) {
      warning = "Efeito Assoreamento Extremado: Cota fluvial mínima restringe calado de balsas e carretas. Filas longas de transbordo.";
      historicalContext = "A seca severa isola terminais pesados, criando bancos de areia e gargalos de logística fluvial (Ferry-boat CEASA-Careiro).";
      riskPenalty = 25;
    } else if (addrLower.includes('am-010') || addrLower.includes('br-319') || addrLower.includes('ramal')) {
      warning = "Suspensão de Fumos/Poeira: Estradas de terra batônica com erosão severa e baixa visibilidade transitória por areia.";
      historicalContext = "A ausência de chuvas resseca leitos de argila, quebrando suspensões e gerando nuvens de poeira perigosas na BR-319.";
      riskPenalty = 18;
    } else {
      warning = "Parição de Calor Extremo: Temperaturas superaquecem pneu e sistemas hidráulicos (pico de até 41°C).";
      historicalContext = "A insolação equatorial na estiagem expande juntas de dilatação e fadiga metais das frotas de distribuição.";
      riskPenalty = 10;
    }
  }

  return {
    season,
    seasonLabel,
    warning,
    historicalContext,
    riskPenalty
  };
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

  // 4. Enrich database occurrences and pre-scan environmental factors for all locations
  const trafficIncidents = await getTrafficIncidents(coords);
  let localOccurrences: any[] = [];
  try {
    localOccurrences = await db.occurrences.toArray();
  } catch (err) {
    console.warn("Could not retrieve local occurrences from database:", err);
  }

  const enrichedLocations = await Promise.all(locations.map(async (loc) => {
    try {
      const weather = await getWeather(loc.lat, loc.lon);
      const elevation = await getElevation(loc.lat, loc.lon);
      
      const currentMonth = new Date().getMonth() + 1;
      const isRainySeason = currentMonth >= 12 || currentMonth <= 5;

      let risk = 0;
      if (weather?.rain?.['1h'] > 5) risk += 15;
      if (weather?.weather?.[0]?.main === 'Thunderstorm') risk += 30;
      if (isRainySeason && weather?.weather?.[0]?.main === 'Rain') risk += 10;
      
      let poiList = [];
      if (trafficIncidents && trafficIncidents.tm && Array.isArray(trafficIncidents.tm.poi)) {
        poiList = trafficIncidents.tm.poi;
      }
      const nearbyIncidents = poiList.filter((p: any) => {
          const py = p?.p?.y || 0;
          const px = p?.p?.x || 0;
          const dist = Math.sqrt(Math.pow(py - loc.lat, 2) + Math.pow(px - loc.lon, 2));
          return dist < 0.01; // Approx 1km
      });
      if (nearbyIncidents.length > 0) risk += 20;

      // Local Occurrences integration
      const activeOccurrences = localOccurrences.filter((occ: any) => {
        const dist = calculateDistance(loc.lat, loc.lon, occ.lat, occ.lon);
        return dist <= 1.5; // Within 1.5km
      });

      if (activeOccurrences.length > 0) {
        activeOccurrences.forEach((o: any) => {
          if (o.type === 'flood' || o.type === 'road_closed') risk += 35;
          else if (o.type === 'accident' || o.type === 'congestion') risk += 25;
          else risk += 15;
        });
      }

      // Cruze de dados hidrológicos/climáticos do Amazonas
      const amazonasHydrology = getAmazonasHydrology(loc.address, loc.lat, loc.lon);
      if (amazonasHydrology) {
        risk += amazonasHydrology.riskPenalty;
      }

      return {
        ...loc,
        weather,
        elevation,
        riskScore: Math.min(100, risk),
        activeOccurrences,
        amazonasHydrology
      };
    } catch (e) {
      console.warn("Failed to pre-enrich stop:", loc.address, e);
      return {
        ...loc,
        weather: { main: { temp: 25 }, weather: [{ description: "Normal" }] },
        elevation: 10,
        riskScore: 0,
        activeOccurrences: []
      };
    }
  }));

  // 5. Routing logic: Mantém o primeiro como origem e o último como destino com simulação de tempo realista (iniciando às 08:00)
  const sequence: RouteStop[] = [];
  const start = { 
    ...enrichedLocations[0], 
    sequence: 0, 
    estimatedArrival: "08:00", 
    timeWindow: timeWindows?.[0]
  };
  const end = enrichedLocations.length > 1 ? { ...enrichedLocations[enrichedLocations.length - 1] } : null;
  const intermediates = enrichedLocations.slice(1, -1);

  sequence.push(start as any);

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
      const currentLocIdx = enrichedLocations.findIndex(l => l.id === current.id);

      for (let i = 0; i < unvisited.length; i++) {
        const target = unvisited[i];
        const targetLocIdx = enrichedLocations.findIndex(l => l.id === target.id);
        
        const d = (matrix?.distances?.[currentLocIdx]?.[targetLocIdx] || 1000) / 1000; // km
        const t = (matrix?.durations?.[currentLocIdx]?.[targetLocIdx] || 600) / 60; // min
        
        // Custom Constraints Penalties
        let customParamPenalty = 0;

        // options.avoidDirt: penalize targets with general weather risk
        if (options.avoidDirt && target.riskScore > 15) {
          customParamPenalty += 30;
        }

        // options.avoidFloods: heavy restriction if target has active flood occurrence or high rain
        if (options.avoidFloods) {
          const hasFlood = target.activeOccurrences?.some((o: any) => o.type === 'flood') || target.weather?.weather?.[0]?.main === 'Thunderstorm';
          if (hasFlood) {
            customParamPenalty += 200; // major routing block
          }
        }

        // options.avoidHills: check elevation change
        if (options.avoidHills) {
          const elevDiff = Math.abs((target.elevation || 0) - (current.elevation || 0));
          if (elevDiff > 25) {
            customParamPenalty += elevDiff * 2.5; 
          }
        }

        // Economy component: fuel consumed by distance + steep climbs
        const elevDiff = Math.abs((target.elevation || 0) - (current.elevation || 0));
        const economyCost = (elevDiff > 30 ? (elevDiff / 10) : 0) + (d * 0.2);

        // Safety component: target risk score
        const safetyCost = target.riskScore || 0;

        // Combine base cost from multi-variable weights
        const baseCost = (weights.w1 * d) + (weights.w2 * t) + (weights.w3 * economyCost) + (weights.w4 * safetyCost);
        
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
        const cost = baseCost + penalty + customParamPenalty;
        
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
        estimatedArrival: arrivalStr,
        timeWindow: timeWindows?.[parseInt(nextStop.id)]
      };
      sequence.push(current as RouteStop);
      currentTime = chosenDeparture;
    }
  }

  if (end) {
    const lastStop = sequence[sequence.length - 1];
    const lastLocIdx = enrichedLocations.findIndex(l => l.id === lastStop.id);
    const endLocIdx = enrichedLocations.findIndex(l => l.id === end.id);
    const lastT = (matrix?.durations?.[lastLocIdx]?.[endLocIdx] || 600) / 60; // min
    
    const endArrivalMins = currentTime + lastT;
    const endArrivalStr = formatMinutes(endArrivalMins);
    
    sequence.push({ 
      ...end, 
      sequence: sequence.length, 
      estimatedArrival: endArrivalStr,
      timeWindow: timeWindows?.[parseInt(end.id)]
    } as RouteStop);
  }

  // 6. Final geometry
  let directions = await getDirections(sequence.map(s => [s.lat, s.lon]), profile, preference);

  if (!directions?.features?.[0]?.geometry) {
    console.error("Critical: Cannot find directions. Features array might be empty or directions is null.", directions);
    
    // Auto-generate a straight line fallback if all else fails
    const distanceFallback = sequence.length > 1 ? 5000 * (sequence.length - 1) : 0; // 5km per leg

    directions = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: sequence.map(s => [s.lon, s.lat])
        },
        properties: {
          summary: {
            distance: distanceFallback,
            duration: sequence.length * 600
          },
          segments: []
        }
      }]
    };
  }

  const baseResult = {
    sequence,
    geometry: directions?.features?.[0]?.geometry,
    summary: directions?.features?.[0]?.properties?.summary || { distance: 0, duration: 0 },
    segments: directions?.features?.[0]?.properties?.segments || [],
    score: Math.max(0, Math.min(100, 100 - (sequence.reduce((acc, s) => acc + s.riskScore, 0) / sequence.length))),
    customPrompt: options.customPrompt,
    priority: options.priority,
    vehicle: options.vehicle,
    avoidDirt: options.avoidDirt,
    avoidFloods: options.avoidFloods,
    avoidHills: options.avoidHills
  };

  // 7. Get AI Analysis - Call our reliable local/server AI engine directly
  const aiAnalysis = await getGeminiAnalysis({ ...baseResult, strategy: aiStrategy });

  const finalResult = { 
    ...baseResult, 
    sequence: sequence,
    aiAnalysis,
    supabaseUsed: false
  };
  
  // Cache the route for offline mode
  if (typeof window !== 'undefined') {
    OfflineManager.cacheRoute(routeHash, finalResult);
  }

  return finalResult;
}
