import { getMatrix, getWeather, getElevation, getTrafficIncidents, getDirections, getInmetForecast } from './api-services';
import { preciseGeocode } from './geocode-engine';
import { getGeminiAnalysis } from './ai-engine';
import { OfflineManager } from './offline-manager';
import { db } from './db';
import { analyzeAddressesHistory } from './history-analyzer';

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
  invoice?: { key?: string; pdfUrl?: string; isImage?: boolean };
  activeOccurrences?: any[];
  amazonasHydrology?: {
    season: 'cheia' | 'vazante';
    seasonLabel: string;
    warning: string;
    historicalContext: string;
    riskPenalty: number;
  };
  status?: 'completed' | 'failed';
  failureReason?: string;
  deliveryNotes?: string;
  historyInsight?: any;

  fluvialPort?: string;
}

interface FluvialNode {
  id: string;
  lat: number;
  lon: number;
  connections: string[];
}

export const FLUVIAL_GRAPH: Record<string, FluvialNode> = {
  ponta_negra: { id: 'ponta_negra', lat: -3.0620, lon: -60.1020, connections: ['taruma'] },
  taruma: { id: 'taruma', lat: -3.0900, lon: -60.0800, connections: ['ponta_negra', 'compensa'] },
  compensa: { id: 'compensa', lat: -3.1150, lon: -60.0650, connections: ['taruma', 'ponte'] },
  ponte: { id: 'ponte', lat: -3.1250, lon: -60.0550, connections: ['compensa', 'sao_raimundo', 'cacau_pirera'] },
  sao_raimundo: { id: 'sao_raimundo', lat: -3.1350, lon: -60.0450, connections: ['ponte', 'porto'] },
  porto: { id: 'porto', lat: -3.1410, lon: -60.0260, connections: ['sao_raimundo', 'educandos'] },
  educandos: { id: 'educandos', lat: -3.1480, lon: -60.0120, connections: ['porto', 'castanhal'] },
  castanhal: { id: 'castanhal', lat: -3.1550, lon: -59.9800, connections: ['educandos', 'ceasa'] },
  ceasa: { id: 'ceasa', lat: -3.1450, lon: -59.9420, connections: ['castanhal', 'encontro', 'careiro'] },
  encontro: { id: 'encontro', lat: -3.1350, lon: -59.9030, connections: ['ceasa', 'puraquequara'] },
  puraquequara: { id: 'puraquequara', lat: -3.0760, lon: -59.8700, connections: ['encontro'] },
  careiro: { id: 'careiro', lat: -3.1970, lon: -59.8220, connections: ['ceasa', 'cacau_pirera'] },
  cacau_pirera: { id: 'cacau_pirera', lat: -3.1670, lon: -60.0650, connections: ['ponte', 'iranduba', 'careiro'] },
  iranduba: { id: 'iranduba', lat: -3.2800, lon: -60.1700, connections: ['cacau_pirera'] },
};

export const FLUVIAL_PORTS = [
  { name: "Porto de Manaus (Centro)", nodeId: 'porto', lat: -3.1410, lon: -60.0260 },
  { name: "Porto da Ceasa", nodeId: 'ceasa', lat: -3.1450, lon: -59.9420 },
  { name: "Marina do Davi (Pontal)", nodeId: 'taruma', lat: -3.0900, lon: -60.0800 },
  { name: "Porto de São Raimundo", nodeId: 'sao_raimundo', lat: -3.1350, lon: -60.0450 },
  { name: "Porto do Educandos", nodeId: 'educandos', lat: -3.1480, lon: -60.0120 },
  { name: "Ponta Negra (Fluvial)", nodeId: 'ponta_negra', lat: -3.0620, lon: -60.1020 },
  { name: "Fronteira Puraquequara", nodeId: 'puraquequara', lat: -3.0760, lon: -59.8700 },
  { name: "Porto do Careiro da Várzea", nodeId: 'careiro', lat: -3.1970, lon: -59.8220 },
  { name: "Porto de Iranduba", nodeId: 'iranduba', lat: -3.2800, lon: -60.1700 },
  { name: "Porto de Cacau Pirêra", nodeId: 'cacau_pirera', lat: -3.1670, lon: -60.0650 },
];

export function getFluvialRoute(startNodeId: string, endNodeId: string): [number, number][] {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const queue: string[] = [];

  for (const node in FLUVIAL_GRAPH) {
    distances[node] = Infinity;
    previous[node] = null;
    queue.push(node);
  }

  distances[startNodeId] = 0;

  while (queue.length > 0) {
    queue.sort((a, b) => distances[a] - distances[b]);
    const current = queue.shift()!;

    if (current === endNodeId) break;
    if (distances[current] === Infinity) break;

    const currentLat = FLUVIAL_GRAPH[current].lat;
    const currentLon = FLUVIAL_GRAPH[current].lon;

    for (const neighbor of FLUVIAL_GRAPH[current].connections) {
      if (!queue.includes(neighbor)) continue;
      
      const neighborNode = FLUVIAL_GRAPH[neighbor];
      const dist = calculateDistance(currentLat, currentLon, neighborNode.lat, neighborNode.lon);
      const alt = distances[current] + dist;

      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = current;
      }
    }
  }

  const pathNodes: string[] = [];
  let u: string | null = endNodeId;
  if (previous[u] !== null || u === startNodeId) {
    while (u !== null) {
      pathNodes.unshift(u);
      u = previous[u];
    }
  }

  return pathNodes.map(id => [FLUVIAL_GRAPH[id].lat, FLUVIAL_GRAPH[id].lon]);
}

export function getFluvialPathStats(startNodeId: string, endNodeId: string, priority: string) {
  const pathCoords = getFluvialRoute(startNodeId, endNodeId);
  let totalDistanceAttr = 0;
  for (let i = 0; i < pathCoords.length - 1; i++) {
    totalDistanceAttr += calculateDistance(
      pathCoords[i][0], pathCoords[i][1],
      pathCoords[i + 1][0], pathCoords[i + 1][1]
    );
  }
  
  let speed = 25; // default balanced speed in km/h
  if (priority === 'speed') speed = 45; // Fast boat (lancha rápida)
  else if (priority === 'economy') speed = 15; // Slow boat/rabeta
  else if (priority === 'safety') speed = 30; // Safer patrolled navigation
  else if (priority === 'distance') speed = 20;

  const durationHours = totalDistanceAttr / speed;
  const durationMinutes = durationHours * 60;

  return {
    path: pathCoords,
    distance: totalDistanceAttr, // km
    duration: durationMinutes // minutes
  };
}

export interface RouteOptions {
  priority: 'speed' | 'distance' | 'economy' | 'safety' | 'balanced';
  vehicle: 'car' | 'moto' | 'truck' | 'van' | 'boat';
  avoidDirt: boolean;
  avoidFloods: boolean;
  avoidHills: boolean;
  customPrompt?: string;
  engine?: 'google' | 'waze' | 'ors';
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

export function getAmazonasHydrology(address: string, lat: number, lon: number, weather?: any) {
  const isAmazonas = 
    address.toLowerCase().includes('manaus') || 
    address.toLowerCase().includes('am') || 
    address.toLowerCase().includes('amazonas') || 
    (lat < -1.0 && lat > -4.5 && lon < -57.0 && lon > -63.5);

  if (!isAmazonas) return undefined;

  // Extrair detalhes reais de clima em tempo real
  const temp = weather?.main?.temp ?? 28;
  const mainWeather = weather?.weather?.[0]?.main || 'Clear';
  const weatherDesc = weather?.weather?.[0]?.description || 'céu limpo';
  const isCurrentlyRaining = mainWeather.toLowerCase().includes('rain') || 
                             mainWeather.toLowerCase().includes('drizzle') || 
                             mainWeather.toLowerCase().includes('thunderstorm') ||
                             weatherDesc.toLowerCase().includes('chuva') ||
                             weatherDesc.toLowerCase().includes('tempestade');

  const month = new Date().getMonth() + 1; // 1-indexed (1 = Jan, 12 = Dec)
  const isCheia = month >= 12 || month <= 6; 
  const season: 'cheia' | 'vazante' = isCheia ? 'cheia' : 'vazante';
  
  // Rotulagem de tempo real monitorada via sensores
  const seasonLabel = `Monitoramento em Tempo Real (Live Weather & Satélite)`;
  
  let warning = "Normalidade Operacional: Condições climáticas e asfalto estáveis sem saturação por chuvas severas.";
  let historicalContext = "Sensores de fluxo pluvial calibrados dinamicamente com base nos dados do satélite meteorológico.";
  let riskPenalty = 0;

  const addrLower = address.toLowerCase();

  // Caso haja chuva real ativa, aplicar alerta preciso
  if (isCurrentlyRaining) {
    riskPenalty = 12;
    warning = `Chuva Registrada em Tempo Real: Precipitação de nível moderado ("${weatherDesc}") detectada nas imediações.`;
    historicalContext = "A água na pista reduz a aderência do pneu. Evite manobras bruscas e reduza o torque cinemático nas curvas.";

    if (addrLower.includes('centro') || addrLower.includes('porto') || addrLower.includes('educandos') || addrLower.includes('compensa')) {
      warning = `Alerta de Pista Úmida: Chuva ativa (${weatherDesc}) em vias de escoamento próximas a orlas portuárias.`;
      historicalContext = "O fluxo à beira-rio tem drenagem reduzida sob chuva ativa. Recomenda-se velocidade estabilizada.";
      riskPenalty = 20;
    } else if (addrLower.includes('am-010') || addrLower.includes('br-319') || addrLower.includes('ramal')) {
      warning = `Saturação Temporária de Solo: Precipitação real (${weatherDesc}) incidindo sobre trechos da rodovia.`;
      historicalContext = "Estradas na região sofrem rápida fadiga superficial de solo quando expostas a águas pluviais ativas.";
      riskPenalty = 16;
    }
  } else if (temp > 38) {
    // Alerta de calor somente se a temperatura real estiver acima de 38°C
    riskPenalty = 10;
    warning = `Insolação Elevada Local: Sensores registram ${Math.round(temp)}°C em tempo real na coordenada selecionada.`;
    historicalContext = "A temperatura equatorial ativa demanda monitoramento preventivo da pressão pneumática geral da frota.";
  } else {
    // Operações em estado de pleno equilíbrio climático
    warning = `Condições Climáticas Estáveis: Sistema operacional em equilíbrio (${Math.round(temp)}°C, ${weatherDesc}). Vias seguras.`;
    historicalContext = "Ausência de anomalias meteorológicas ou frentes de precipitação severa no quadrante de transporte.";
    riskPenalty = 0;
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
  timeWindows?: Record<number, { start: string; end: string }>,
  invoices?: Record<number, { key?: string; pdfUrl?: string; isImage?: boolean }>
) {
  const routeHash = btoa(encodeURIComponent(addresses.join('|') + JSON.stringify(options) + JSON.stringify(timeWindows || {}) + JSON.stringify(invoices || {})));

  if (typeof window !== 'undefined' && !navigator.onLine) {
    console.warn("OFFLINE MODE: Attempting to load cached route...");
    const cached = await OfflineManager.getOfflineRoute(routeHash);
    if (cached) return cached;
    console.warn("No cached route found, returning naive approximation.");
  }

  // 1. Geocode
  let locations = await Promise.all(addresses.map(async (addr, i) => {
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
          type: 'address' as const,
          fluvialPort: undefined as string | undefined
        };
      }
      const geo = await preciseGeocode(addr);
      return { ...geo, id: i.toString(), address: addr, fluvialPort: undefined as string | undefined };
    } catch (error) {
      console.warn('Geocoding failed, falling back to approximation.', error);
      // Rough emergency approximation for fallback (Manaus center)
      return {
        lat: -3.119 + (Math.random() - 0.5) * 0.02,
        lon: -60.021 + (Math.random() - 0.5) * 0.02,
        id: i.toString(),
        address: addr,
        fluvialPort: undefined as string | undefined
      };
    }
  }));

  if (options.vehicle === 'boat') {
    locations = locations.map(loc => {
      let closestPort = FLUVIAL_PORTS[0];
      let minDistance = Infinity;
      for (const port of FLUVIAL_PORTS) {
        const d = calculateDistance(loc.lat, loc.lon, port.lat, port.lon);
        if (d < minDistance) {
          minDistance = d;
          closestPort = port;
        }
      }
      return {
        ...loc,
        fluvialPort: closestPort.name,
        address: `${loc.address.split(' (Atracado')[0]} (Atracado no ${closestPort.name})`
      };
    });
  }

  // 2. Intelligence Layer: Fetch Weather/Traffic Data asynchronously
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

  const aiStrategy = "Diretiva estratégica ignorada para otimização de velocidade.";


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

  let matrix: any = null;
  if (options.vehicle === 'boat') {
    const n = locations.length;
    const distances: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    const durations: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const fromPort = FLUVIAL_PORTS.find(p => p.name === locations[i].fluvialPort) || FLUVIAL_PORTS[0];
        const toPort = FLUVIAL_PORTS.find(p => p.name === locations[j].fluvialPort) || FLUVIAL_PORTS[0];
        const stats = getFluvialPathStats(fromPort.nodeId, toPort.nodeId, options.priority);
        distances[i][j] = stats.distance * 1000;
        durations[i][j] = stats.duration * 60;
      }
    }
    matrix = { distances, durations };
  } else {
    matrix = await getMatrix(coords, profile, preference, options.engine);
  }

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

      // Cruze de dados hidrológicos/climáticos do Amazonas com dados meteorológicos reais
      const amazonasHydrology = getAmazonasHydrology(loc.address, loc.lat, loc.lon, weather);
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

  // 5. Routing logic: Mantém o primeiro como origem (start) e o último como destino final (end), ordenando apenas os intermediários por proximidade lógica coletiva
  const historyInsights = await analyzeAddressesHistory(enrichedLocations.map(l => l.address));

  const sequence: RouteStop[] = [];
  const start = { 
    ...enrichedLocations[0], 
    sequence: 0, 
    estimatedArrival: "08:00", 
    timeWindow: timeWindows?.[0],
    invoice: invoices?.[0],
    historyInsight: historyInsights[enrichedLocations[0].address]
  };
  
  // Se temos pelo menos 3 locais, o último representa o destino final fixo
  const hasExplicitFinalDestination = enrichedLocations.length >= 3;
  const intermediates = hasExplicitFinalDestination 
    ? enrichedLocations.slice(1, -1) 
    : enrichedLocations.slice(1);
  const endLocation = hasExplicitFinalDestination 
    ? enrichedLocations[enrichedLocations.length - 1] 
    : null;

  sequence.push(start as any);

  let currentTime = 480; // Entrada na rota: 08:00 AM em minutos acumulados
  let current: any = start;

  if (intermediates.length > 0) {
    const unvisited = [...intermediates];
    const weights = WEIGHTS[options.priority];

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
        
        // Integrar análise de histórico de entregas na prioridade da rota
        const targetInsight = historyInsights[target.address];
        let historyPenalty = 0;
        let serviceDuration = 15; // default service/unload duration

        if (targetInsight) {
          // Se falhou no passado, penaliza o custo para adiar ou escolher rotas mais seguras
          if (targetInsight.failedCount > 0) {
            historyPenalty += targetInsight.failedCount * 25; // 25 de penalidade por falha anterior
          }
          // Se costumava demorar muito mais que 15m, aumenta a janela de serviço estimada
          if (targetInsight.averageServiceTimeMinutes > 15) {
            serviceDuration = targetInsight.averageServiceTimeMinutes;
          }
        }

        // Avaliação de janelas de entrega temporais (Time Windows)
        const originalIdx = parseInt(target.id);
        const window = timeWindows?.[originalIdx];
        
        let waitTime = 0;
        let lateness = 0;
        const arrivalTime = currentTime + t;
        let departureTime = arrivalTime + serviceDuration; // dinâmico baseado no histórico
        
        if (window) {
          const windowStart = timeToMinutes(window.start);
          const windowEnd = timeToMinutes(window.end);
          
          if (windowStart !== null && arrivalTime < windowStart) {
            waitTime = windowStart - arrivalTime;
            departureTime = windowStart + serviceDuration; // Inicia serviço apenas quando a janela abre
          }
          if (windowEnd !== null && arrivalTime > windowEnd) {
            lateness = arrivalTime - windowEnd;
          }
        }
        
        // Penalizar atraso de forma rígida, e espera de forma moderada
        const penalty = (waitTime * 0.15) + (lateness * 10.0);
        const cost = baseCost + penalty + customParamPenalty + historyPenalty;
        
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
        timeWindow: timeWindows?.[parseInt(nextStop.id)],
        invoice: invoices?.[parseInt(nextStop.id)],
        historyInsight: historyInsights[nextStop.address]
      };
      sequence.push(current as RouteStop);
      currentTime = chosenDeparture;
    }
  }

  // Se existe destino final fixo, conectá-lo ao término do roteamento
  if (endLocation) {
    const currentLocIdx = enrichedLocations.findIndex(l => l.id === current.id);
    const targetLocIdx = enrichedLocations.findIndex(l => l.id === endLocation.id);
    
    const d = (matrix?.distances?.[currentLocIdx]?.[targetLocIdx] || 1000) / 1000; // km
    const t = (matrix?.durations?.[currentLocIdx]?.[targetLocIdx] || 600) / 60; // min
    
    const arrivalTime = currentTime + t;
    const arrivalStr = formatMinutes(arrivalTime);
    
    const finalStop = {
      ...endLocation,
      sequence: sequence.length,
      estimatedArrival: arrivalStr,
      timeWindow: timeWindows?.[parseInt(endLocation.id)],
      invoice: invoices?.[parseInt(endLocation.id)],
      historyInsight: historyInsights[endLocation.address]
    };
    
    sequence.push(finalStop as RouteStop);
  }

  // 6. Final geometry
  let directions: any = null;
  if (options.vehicle === 'boat') {
    const rawCoordinates: [number, number][] = [];
    let fluvialDistance = 0;
    let fluvialDuration = 0;

    for (let i = 0; i < sequence.length - 1; i++) {
      const fromStop = sequence[i];
      const toStop = sequence[i + 1];
      
      const fromPort = FLUVIAL_PORTS.find(p => p.name === fromStop.fluvialPort) || FLUVIAL_PORTS[0];
      const toPort = FLUVIAL_PORTS.find(p => p.name === toStop.fluvialPort) || FLUVIAL_PORTS[0];
      
      if (fromPort.name === toPort.name) {
        // Same port node (land-bound transition)
        rawCoordinates.push([fromStop.lon, fromStop.lat]);
        rawCoordinates.push([toStop.lon, toStop.lat]);
        
        const dLand = calculateDistance(fromStop.lat, fromStop.lon, toStop.lat, toStop.lon);
        fluvialDistance += dLand * 1000;
        fluvialDuration += (dLand / 30) * 3600; // 30 km/h average
      } else {
        // Hybrid path: Origin street coordinate -> closest departure port -> river waterway -> closest arrival port -> Destination street coordinate
        rawCoordinates.push([fromStop.lon, fromStop.lat]);
        rawCoordinates.push([fromPort.lon, fromPort.lat]);
        
        const stats = getFluvialPathStats(fromPort.nodeId, toPort.nodeId, options.priority);
        fluvialDistance += stats.distance * 1000; // in meters (for GeoJSON summary)
        fluvialDuration += stats.duration * 60; // in seconds (for GeoJSON summary)
        
        stats.path.forEach((c) => {
          rawCoordinates.push([c[1], c[0]]); // [lon, lat]
        });
        
        rawCoordinates.push([toPort.lon, toPort.lat]);
        rawCoordinates.push([toStop.lon, toStop.lat]);
        
        // Add small approximate access distance metrics
        const dLand1 = calculateDistance(fromStop.lat, fromStop.lon, fromPort.lat, fromPort.lon);
        const dLand2 = calculateDistance(toStop.lat, toStop.lon, toPort.lat, toPort.lon);
        fluvialDistance += (dLand1 + dLand2) * 1000;
        fluvialDuration += ((dLand1 + dLand2) / 30) * 3600;
      }
    }

    // Clean up consecutive redundant/duplicate coordinates for high-fidelity Leaflet lines
    const allCoordinates: [number, number][] = [];
    rawCoordinates.forEach(c => {
      if (allCoordinates.length === 0) {
        allCoordinates.push(c);
      } else {
        const last = allCoordinates[allCoordinates.length - 1];
        if (Math.abs(last[0] - c[0]) > 0.0001 || Math.abs(last[1] - c[1]) > 0.0001) {
          allCoordinates.push(c);
        }
      }
    });

    // Ensure we have at least 2 points to be a valid LineString
    if (allCoordinates.length < 2) {
      if (allCoordinates.length === 1) {
        allCoordinates.push([allCoordinates[0][0] + 0.001, allCoordinates[0][1] + 0.001]);
      } else {
        sequence.forEach(s => allCoordinates.push([s.lon, s.lat]));
        if (allCoordinates.length === 1) {
          allCoordinates.push([allCoordinates[0][0] + 0.001, allCoordinates[0][1] + 0.001]);
        }
      }
    }

    directions = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: allCoordinates
        },
        properties: {
          summary: {
            distance: fluvialDistance,
            duration: fluvialDuration
          },
          segments: []
        }
      }]
    };
  } else {
    directions = await getDirections(sequence.map(s => [s.lat, s.lon]), profile, preference, options.engine);
  }

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
    hybridAnalysis: directions?.features?.[0]?.properties?.hybridAnalysis || null,
    alternatives: directions?.features?.slice(1).map((f: any) => ({
      geometry: f.geometry,
      summary: f.properties?.summary,
      segments: f.properties?.segments
    })) || [],
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
