import { db, Route, RouteIncident, RouteWaypoint, RouteOriginalParameters, RouteCalculatedData, RouteExecutionMetrics } from './db';

export type DateFilterOption = 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom';

export interface RouteHistoryFilter {
  dateFilter: DateFilterOption;
  customStartDate?: string;
  customEndDate?: string;
  searchQuery?: string;
  vehicleType?: string; // 'all' | 'van' | 'motorcycle' | 'truck' | 'heavy_truck' | 'boat'
  priority?: string; // 'all' | 'speed' | 'economy' | 'distance' | 'safety' | 'balanced'
  status?: string; // 'all' | 'completed' | 'partial' | 'failed' | 'with_incidents'
}

export interface AggregatePerformanceMetrics {
  totalRoutes: number;
  totalStops: number;
  completedStops: number;
  failedStops: number;
  overallSuccessRatePercent: number;
  totalDistanceKm: number;
  averageDistanceKm: number;
  totalDurationMinutes: number;
  averageDurationMinutes: number;
  averageOptimizationScore: number;
  totalIncidentsCount: number;
  routesWithIncidentsCount: number;
  totalFuelLiters: number;
  totalFuelCostBRL: number;
  punctualityRatePercent: number;
  averageTimeDeviationMinutes: number; // actual - planned (+ delay, - ahead)
  vehicleDistribution: {
    type: string;
    label: string;
    count: number;
    percent: number;
    distanceKm: number;
  }[];
  incidentTypesDistribution: {
    type: string;
    label: string;
    count: number;
  }[];
  priorityDistribution: {
    priority: string;
    label: string;
    count: number;
  }[];
  dailyTrends: {
    date: string;
    displayDate: string;
    routesCount: number;
    stopsCount: number;
    distanceKm: number;
    successRate: number;
  }[];
}

/**
 * Normalizes a Route object to guarantee all modern detailed history fields exist
 * even if the record was created previously with older schema versions.
 */
export function normalizeHistoricalRoute(route: Route): Route {
  const dateObj = new Date(route.date || Date.now());
  const completedAtObj = route.completedAt ? new Date(route.completedAt) : undefined;
  const startedAtObj = route.startedAt ? new Date(route.startedAt) : (completedAtObj ? new Date(completedAtObj.getTime() - 45 * 60000) : undefined);

  // Extract addresses list
  const addresses = route.addresses && route.addresses.length > 0 
    ? route.addresses 
    : (route.sequence ? route.sequence.map((s: any) => s.address || 'Parada').filter(Boolean) : []);

  // Determine vehicle
  const detectedVehicle = route.vehicleType || 
    route.originalParameters?.vehicleType || 
    (route.sequence?.some((s: any) => s.fluvialPort || s.address?.toLowerCase().includes('porto')) ? 'boat' : 'van');

  // Determine priority
  const detectedPriority = route.priority || route.originalParameters?.priority || 'balanced';

  // Build sequential waypoints
  const waypoints: RouteWaypoint[] = (route.sequence || []).map((s: any, idx: number) => {
    return {
      address: s.address || addresses[idx] || `Parada #${idx + 1}`,
      lat: s.lat || 0,
      lng: s.lng || s.lon || 0,
      stopIndex: idx,
      stopType: s.stopType || (idx === 0 ? 'pickup' : 'delivery'),
      status: s.status || (route.status === 'completed' ? 'completed' : 'pending'),
      failureReason: s.failureReason,
      deliveryPhoto: s.deliveryPhoto || (idx === (route.sequence.length - 1) ? route.deliveryPhoto : undefined),
      deliveryNotes: s.deliveryNotes || (idx === (route.sequence.length - 1) ? route.deliveryNotes : undefined),
      plannedArrivalTime: s.plannedArrivalTime || `${8 + Math.floor(idx * 0.5)}:${(idx % 2 === 0 ? '00' : '30')}`,
      actualArrivalTime: s.actualArrivalTime || (s.status === 'completed' ? `${8 + Math.floor(idx * 0.6)}:${(idx % 2 === 0 ? '15' : '45')}` : undefined),
      serviceDurationMinutes: s.serviceDurationMinutes || 15,
      fluvialPort: s.fluvialPort,
      neighborhood: s.neighborhood,
      cep: s.cep
    };
  });

  // Calculate distance & duration fallbacks
  const calcDistKm = route.totalDistanceKm || 
    route.calculatedRoute?.distanceKm || 
    (addresses.length > 1 ? Math.round((addresses.length * 4.8 + 6.2) * 10) / 10 : 12.5);

  const calcDurMin = route.totalDurationMinutes || 
    route.calculatedRoute?.durationMinutes || 
    Math.round(calcDistKm * 2.3 + addresses.length * 8);

  const elapsedMs = route.totalElapsedMs || (startedAtObj && completedAtObj ? completedAtObj.getTime() - startedAtObj.getTime() : calcDurMin * 60000);
  const actualMin = Math.round(elapsedMs / 60000);

  const completedCount = waypoints.filter(w => w.status === 'completed').length || (route.status === 'completed' ? waypoints.length : 0);
  const failedCount = waypoints.filter(w => w.status === 'failed').length;
  const totalStops = waypoints.length || addresses.length || 1;
  const completionRate = Math.round((completedCount / totalStops) * 100);

  // Original Parameters
  const originalParameters: RouteOriginalParameters = {
    addresses,
    priority: detectedPriority as any,
    vehicleType: detectedVehicle as any,
    vehicleName: getVehicleLabel(detectedVehicle),
    timeWindows: route.originalParameters?.timeWindows || {},
    stopTypes: route.originalParameters?.stopTypes || {},
    customPrompt: route.originalParameters?.customPrompt
  };

  // Fuel consumption calculation based on vehicle
  const kml = detectedVehicle === 'motorcycle' ? 40.0 : detectedVehicle === 'truck' ? 9.0 : detectedVehicle === 'heavy_truck' ? 4.2 : detectedVehicle === 'boat' ? 3.5 : 14.0;
  const estimatedFuelLiters = Math.round((calcDistKm / kml) * 10) / 10;
  const estimatedFuelCost = Math.round(estimatedFuelLiters * 6.15 * 100) / 100;

  // Calculated Route Data
  const calculatedRoute: RouteCalculatedData = {
    waypoints,
    distanceMeters: Math.round(calcDistKm * 1000),
    distanceKm: calcDistKm,
    durationSeconds: calcDurMin * 60,
    durationMinutes: calcDurMin,
    estimatedFuelLiters,
    estimatedFuelCost,
    isFluvial: detectedVehicle === 'boat'
  };

  // Execution Metrics
  const executionMetrics: RouteExecutionMetrics = {
    startedAt: startedAtObj,
    completedAt: completedAtObj,
    totalElapsedMs: elapsedMs,
    actualDurationMinutes: actualMin,
    actualDistanceKm: calcDistKm,
    completedStopsCount: completedCount,
    failedStopsCount: failedCount,
    totalStopsCount: totalStops,
    completionRatePercent: completionRate,
    punctualityRatePercent: actualMin <= calcDurMin * 1.15 ? 100 : Math.max(50, Math.round((1 - (actualMin - calcDurMin) / calcDurMin) * 100)),
    timeDeviationMinutes: actualMin - calcDurMin,
    fuelConsumedLiters: estimatedFuelLiters,
    fuelCostTotal: estimatedFuelCost
  };

  return {
    ...route,
    date: dateObj,
    startedAt: startedAtObj,
    completedAt: completedAtObj,
    addresses,
    sequence: waypoints,
    score: route.score || route.finalScore || 95,
    finalScore: route.score || route.finalScore || 95,
    status: route.status || 'completed',
    vehicleType: detectedVehicle as any,
    priority: detectedPriority as any,
    totalDistanceKm: calcDistKm,
    totalDurationMinutes: calcDurMin,
    originalParameters: route.originalParameters || originalParameters,
    calculatedRoute: route.calculatedRoute || calculatedRoute,
    executionMetrics: route.executionMetrics || executionMetrics,
    reportedIncidents: route.reportedIncidents || []
  };
}

export function getVehicleLabel(vehicle?: string): string {
  switch (vehicle) {
    case 'motorcycle': return 'Moto Express';
    case 'truck': return 'Caminhão Médio';
    case 'heavy_truck': return 'Carreta Pesada';
    case 'boat': return 'Embarcação Fluvial';
    case 'van':
    default:
      return 'Utilitário / Van';
  }
}

export function getPriorityLabel(priority?: string): string {
  switch (priority) {
    case 'speed': return 'Mais Rápida';
    case 'distance': return 'Menor Distância';
    case 'economy': return 'Econômica';
    case 'safety': return 'Segurança Máxima';
    case 'balanced':
    default:
      return 'Equilibrada';
  }
}

/**
 * Filters a list of routes based on date range and filter criteria
 */
export function filterRoutes(routes: Route[], filter: RouteHistoryFilter): Route[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = todayStart - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = todayStart - 30 * 24 * 60 * 60 * 1000;
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  return routes.filter(route => {
    const routeDate = new Date(route.date || route.completedAt || now).getTime();

    // 1. Date Filter
    if (filter.dateFilter === 'today') {
      if (routeDate < todayStart) return false;
    } else if (filter.dateFilter === 'yesterday') {
      if (routeDate < yesterdayStart || routeDate >= todayStart) return false;
    } else if (filter.dateFilter === 'last_7_days') {
      if (routeDate < sevenDaysAgo) return false;
    } else if (filter.dateFilter === 'last_30_days') {
      if (routeDate < thirtyDaysAgo) return false;
    } else if (filter.dateFilter === 'this_month') {
      if (routeDate < thisMonthStart) return false;
    } else if (filter.dateFilter === 'custom') {
      if (filter.customStartDate) {
        const start = new Date(filter.customStartDate).getTime();
        if (routeDate < start) return false;
      }
      if (filter.customEndDate) {
        const end = new Date(filter.customEndDate).getTime() + 24 * 60 * 60 * 1000; // end of day
        if (routeDate > end) return false;
      }
    }

    // 2. Vehicle Filter
    if (filter.vehicleType && filter.vehicleType !== 'all') {
      const v = route.vehicleType || route.originalParameters?.vehicleType;
      if (v !== filter.vehicleType) return false;
    }

    // 3. Priority Filter
    if (filter.priority && filter.priority !== 'all') {
      const p = route.priority || route.originalParameters?.priority;
      if (p !== filter.priority) return false;
    }

    // 4. Status Filter
    if (filter.status && filter.status !== 'all') {
      if (filter.status === 'with_incidents') {
        const incidentsCount = (route.reportedIncidents || []).length;
        if (incidentsCount === 0) return false;
      } else if (filter.status === 'completed') {
        if (route.status !== 'completed') return false;
      } else if (filter.status === 'failed') {
        if (route.status !== 'failed') return false;
      }
    }

    // 5. Search Query Filter
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchId = String(route.id || '').includes(q);
      const matchName = (route.name || '').toLowerCase().includes(q);
      const matchNotes = (route.deliveryNotes || '').toLowerCase().includes(q);
      const matchAddress = (route.addresses || []).some(a => a.toLowerCase().includes(q));
      const matchIncidents = (route.reportedIncidents || []).some(inc => 
        inc.description.toLowerCase().includes(q) || inc.type.toLowerCase().includes(q)
      );

      if (!matchId && !matchName && !matchNotes && !matchAddress && !matchIncidents) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Computes comprehensive operational and analytical metrics over a filtered set of routes
 */
export function computeAggregatePerformanceMetrics(routes: Route[]): AggregatePerformanceMetrics {
  const normalized = routes.map(normalizeHistoricalRoute);
  
  const totalRoutes = normalized.length;
  let totalStops = 0;
  let completedStops = 0;
  let failedStops = 0;
  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;
  let totalScores = 0;
  let totalIncidentsCount = 0;
  let routesWithIncidentsCount = 0;
  let totalFuelLiters = 0;
  let totalFuelCostBRL = 0;
  let totalPunctualityScore = 0;
  let totalTimeDeviations = 0;

  const vehicleMap: Record<string, { count: number; distanceKm: number }> = {};
  const incidentMap: Record<string, number> = {};
  const priorityMap: Record<string, number> = {};
  const dailyMap: Record<string, { routes: number; stops: number; distanceKm: number; completedStops: number }> = {};

  normalized.forEach(r => {
    const stopsCount = r.calculatedRoute?.waypoints.length || r.addresses?.length || 1;
    totalStops += stopsCount;

    const comp = r.executionMetrics?.completedStopsCount ?? stopsCount;
    const fail = r.executionMetrics?.failedStopsCount ?? 0;
    completedStops += comp;
    failedStops += fail;

    const dist = r.totalDistanceKm || r.calculatedRoute?.distanceKm || 0;
    totalDistanceKm += dist;

    const dur = r.executionMetrics?.actualDurationMinutes || r.totalDurationMinutes || 0;
    totalDurationMinutes += dur;

    totalScores += (r.finalScore || r.score || 95);

    const incidents = r.reportedIncidents || [];
    totalIncidentsCount += incidents.length;
    if (incidents.length > 0) {
      routesWithIncidentsCount++;
      incidents.forEach(inc => {
        incidentMap[inc.type] = (incidentMap[inc.type] || 0) + 1;
      });
    }

    const fuelL = r.executionMetrics?.fuelConsumedLiters || r.calculatedRoute?.estimatedFuelLiters || 0;
    const fuelCost = r.executionMetrics?.fuelCostTotal || r.calculatedRoute?.estimatedFuelCost || 0;
    totalFuelLiters += fuelL;
    totalFuelCostBRL += fuelCost;

    const punctuality = r.executionMetrics?.punctualityRatePercent ?? 95;
    totalPunctualityScore += punctuality;

    const dev = r.executionMetrics?.timeDeviationMinutes ?? 0;
    totalTimeDeviations += dev;

    // Vehicle Map
    const vType = r.vehicleType || 'van';
    if (!vehicleMap[vType]) {
      vehicleMap[vType] = { count: 0, distanceKm: 0 };
    }
    vehicleMap[vType].count += 1;
    vehicleMap[vType].distanceKm += dist;

    // Priority Map
    const pType = r.priority || 'balanced';
    priorityMap[pType] = (priorityMap[pType] || 0) + 1;

    // Daily trends map
    const dateKey = new Date(r.date).toISOString().slice(0, 10);
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { routes: 0, stops: 0, distanceKm: 0, completedStops: 0 };
    }
    dailyMap[dateKey].routes += 1;
    dailyMap[dateKey].stops += stopsCount;
    dailyMap[dateKey].distanceKm += dist;
    dailyMap[dateKey].completedStops += comp;
  });

  const overallSuccessRatePercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 100;
  const averageDistanceKm = totalRoutes > 0 ? Math.round((totalDistanceKm / totalRoutes) * 10) / 10 : 0;
  const averageDurationMinutes = totalRoutes > 0 ? Math.round(totalDurationMinutes / totalRoutes) : 0;
  const averageOptimizationScore = totalRoutes > 0 ? Math.round(totalScores / totalRoutes) : 0;
  const punctualityRatePercent = totalRoutes > 0 ? Math.round(totalPunctualityScore / totalRoutes) : 100;
  const averageTimeDeviationMinutes = totalRoutes > 0 ? Math.round((totalTimeDeviations / totalRoutes) * 10) / 10 : 0;

  // Vehicle Distribution Array
  const vehicleDistribution = Object.keys(vehicleMap).map(type => ({
    type,
    label: getVehicleLabel(type),
    count: vehicleMap[type].count,
    percent: totalRoutes > 0 ? Math.round((vehicleMap[type].count / totalRoutes) * 100) : 0,
    distanceKm: Math.round(vehicleMap[type].distanceKm * 10) / 10
  })).sort((a, b) => b.count - a.count);

  // Incident Types Distribution
  const incidentLabels: Record<string, string> = {
    sandbank: 'Banco de Areia Fluvial',
    repiquete: 'Queda Abrupta de Cota (Repiquete)',
    congestion: 'Congestionamento Severo',
    accident: 'Acidente de Trânsito',
    flood: 'Alagamento / Pista Inundada',
    road_closed: 'Bloqueio / Via Interditada',
    pothole: 'Erosão / Buraco Crítico',
    other: 'Outras Ocorrências'
  };

  const incidentTypesDistribution = Object.keys(incidentMap).map(type => ({
    type,
    label: incidentLabels[type] || type,
    count: incidentMap[type]
  })).sort((a, b) => b.count - a.count);

  // Priority Distribution
  const priorityDistribution = Object.keys(priorityMap).map(priority => ({
    priority,
    label: getPriorityLabel(priority),
    count: priorityMap[priority]
  })).sort((a, b) => b.count - a.count);

  // Daily Trends sorted chronologically
  const dailyTrends = Object.keys(dailyMap).sort().map(date => {
    const item = dailyMap[date];
    const parts = date.split('-');
    const displayDate = `${parts[2]}/${parts[1]}`;
    return {
      date,
      displayDate,
      routesCount: item.routes,
      stopsCount: item.stops,
      distanceKm: Math.round(item.distanceKm * 10) / 10,
      successRate: item.stops > 0 ? Math.round((item.completedStops / item.stops) * 100) : 100
    };
  });

  return {
    totalRoutes,
    totalStops,
    completedStops,
    failedStops,
    overallSuccessRatePercent,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    averageDistanceKm,
    totalDurationMinutes,
    averageDurationMinutes,
    averageOptimizationScore,
    totalIncidentsCount,
    routesWithIncidentsCount,
    totalFuelLiters: Math.round(totalFuelLiters * 10) / 10,
    totalFuelCostBRL: Math.round(totalFuelCostBRL * 100) / 100,
    punctualityRatePercent,
    averageTimeDeviationMinutes,
    vehicleDistribution,
    incidentTypesDistribution,
    priorityDistribution,
    dailyTrends
  };
}

/**
 * Constant list of simulated demo route names for clean identification
 */
export const DEMO_ROUTE_TITLES = [
  'Distrito Industrial ➔ Centro & Adrianópolis',
  'Porto de Manaus ➔ Praia da Lua & Marina do Davi',
  'Zona Norte ➔ Manauara Shopping & Ponta Negra',
  'Polo Industrial de Manaus, Distrito II',
  'Polo Industrial de Manaus, Distrito II ➔ São José & Cidade Nova',
  'CEASA, Manaus, AM ➔ Centro',
  'Rota Demo (Manaus / AM)',
  'Rota Demo'
];

/**
 * Completely purges all simulated/sample routes and incidents from IndexedDB
 * to ensure the user's workspace starts 100% clean.
 */
export async function purgeAllSimulatedData(): Promise<number> {
  let deletedCount = 0;
  try {
    const allRoutes = await db.routes.toArray();

    for (const r of allRoutes) {
      const isDemo = 
        (r as any).isSimulated === true ||
        (r as any).isDemo === true ||
        DEMO_ROUTE_TITLES.some(title => r.name?.includes(title)) ||
        (r.name && r.name.toLowerCase().includes('demo')) ||
        (r.deliveryNotes && r.deliveryNotes.includes('Recebido pelo gerente de operações com conferência')) ||
        (r.deliveryNotes && r.deliveryNotes.includes('Carga de suprimentos médicos atracada na Praia da Lua')) ||
        (r.deliveryNotes && r.deliveryNotes.includes('Mercadoria entregue em perfeito estado sob fiscalização')) ||
        (r.deliveryNotes && r.deliveryNotes.includes('Entrega concluída com comprovante digital seguro')) ||
        (typeof r.deliveryPhoto === 'string' && r.deliveryPhoto.includes('HARPIA LOGÍSTICA • PROTOCOLO DIGITAL')) ||
        (typeof r.deliveryPhoto === 'string' && r.deliveryPhoto.includes('HARPIA - COMPROVANTE SEGURO')) ||
        (r.reportedIncidents && r.reportedIncidents.some(inc => inc.id === 'inc-01' || inc.id === 'inc-truck-01'));

      if (isDemo && r.id) {
        await db.routes.delete(r.id);
        deletedCount++;
      }
    }

    // Also purge demo occurrences from occurrences table
    const allOccurrences = await db.occurrences.toArray();
    for (const occ of allOccurrences) {
      if (
        occ.description?.includes('reportado via GPS') || 
        occ.description?.includes('Alagamento em via de acesso reportado via GPS')
      ) {
        if (occ.id) await db.occurrences.delete(occ.id);
      }
    }
  } catch (err) {
    console.warn("[Route History] Could not purge simulated data:", err);
  }
  return deletedCount;
}

/**
 * Seeds realistic Amazonas & Manaus routes into the database ONLY if explicitly forced.
 * Never runs automatically on clean startup.
 */
export async function seedRealisticHistoryIfEmpty(forceSeed = false) {
  if (!forceSeed) return;

  try {
    const baseBoxSvg = (title: string, color: string) => `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%23090d16"/><rect x="140" y="90" width="320" height="220" rx="14" fill="%231e293b" stroke="%23334155" stroke-width="2"/><rect x="140" y="90" width="320" height="45" rx="14" fill="%23334155"/><line x1="300" y1="90" x2="300" y2="310" stroke="%23475569" stroke-width="3"/><rect x="230" y="160" width="140" height="90" rx="6" fill="%230f172a" stroke="%23${color}" stroke-width="2"/><circle cx="300" cy="205" r="16" fill="%23${color}"/><path d="M294 205 l4 4 l8 -8" stroke="white" stroke-width="2.5" fill="none"/><text x="300" y="275" fill="white" font-family="sans-serif" font-size="12" text-anchor="middle" font-weight="bold">${title}</text><text x="300" y="350" fill="%23${color}" font-family="monospace" font-size="11" text-anchor="middle" font-weight="bold">HARPIA LOGÍSTICA • PROTOCOLO DIGITAL</text></svg>`;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const sampleRoutes: Route[] = [
      // 1. Rota Urbana Centro / Adrianópolis (Van - Hoje)
      {
        date: new Date(now - 3 * 3600 * 1000),
        startedAt: new Date(now - 3 * 3600 * 1000),
        completedAt: new Date(now - 1.8 * 3600 * 1000),
        totalElapsedMs: 1.2 * 3600 * 1000,
        name: 'Distrito Industrial ➔ Centro & Adrianópolis',
        addresses: [
          'Centro de Distribuição Ceasa, Manaus, AM',
          'Av. Eduardo Ribeiro, 520, Centro, Manaus, AM',
          'Av. Mário Ypiranga, 1300, Adrianópolis, Manaus, AM',
          'Rua Salvador, 440, Adrianópolis, Manaus, AM',
          'Av. Djalma Batista, 482, Flores, Manaus, AM'
        ],
        vehicleType: 'van',
        priority: 'balanced',
        score: 98,
        finalScore: 98,
        status: 'completed',
        totalDistanceKm: 22.4,
        totalDurationMinutes: 72,
        deliveryPhoto: baseBoxSvg('ENTREGA CONCLUÍDA - ADRIANÓPOLIS', '22c55e'),
        deliveryNotes: 'Recebido pelo gerente de operações com conferência de nota fiscal.',
        originalParameters: {
          addresses: [
            'Centro de Distribuição Ceasa, Manaus, AM',
            'Av. Eduardo Ribeiro, 520, Centro, Manaus, AM',
            'Av. Mário Ypiranga, 1300, Adrianópolis, Manaus, AM',
            'Rua Salvador, 440, Adrianópolis, Manaus, AM',
            'Av. Djalma Batista, 482, Flores, Manaus, AM'
          ],
          priority: 'balanced',
          vehicleType: 'van',
          vehicleName: 'Van Refrigerada Mercedes Sprinter'
        },
        calculatedRoute: {
          waypoints: [
            { address: 'Centro de Distribuição Ceasa, Manaus, AM', lat: -3.1250, lng: -59.9880, stopIndex: 0, stopType: 'pickup', status: 'completed', plannedArrivalTime: '08:00', actualArrivalTime: '08:00', serviceDurationMinutes: 20 },
            { address: 'Av. Eduardo Ribeiro, 520, Centro, Manaus, AM', lat: -3.1310, lng: -60.0240, stopIndex: 1, stopType: 'delivery', status: 'completed', plannedArrivalTime: '08:25', actualArrivalTime: '08:23', serviceDurationMinutes: 12 },
            { address: 'Av. Mário Ypiranga, 1300, Adrianópolis, Manaus, AM', lat: -3.1120, lng: -60.0130, stopIndex: 2, stopType: 'delivery', status: 'completed', plannedArrivalTime: '08:45', actualArrivalTime: '08:48', serviceDurationMinutes: 15 },
            { address: 'Rua Salvador, 440, Adrianópolis, Manaus, AM', lat: -3.1090, lng: -60.0110, stopIndex: 3, stopType: 'delivery', status: 'completed', plannedArrivalTime: '09:05', actualArrivalTime: '09:02', serviceDurationMinutes: 10 },
            { address: 'Av. Djalma Batista, 482, Flores, Manaus, AM', lat: -3.0980, lng: -60.0220, stopIndex: 4, stopType: 'delivery', status: 'completed', plannedArrivalTime: '09:20', actualArrivalTime: '09:12', serviceDurationMinutes: 15, deliveryNotes: 'Finalizada sem divergências.' }
          ],
          distanceMeters: 22400,
          distanceKm: 22.4,
          durationSeconds: 4320,
          durationMinutes: 72,
          estimatedFuelLiters: 1.6,
          estimatedFuelCost: 9.84,
          isFluvial: false
        },
        executionMetrics: {
          startedAt: new Date(now - 3 * 3600 * 1000),
          completedAt: new Date(now - 1.8 * 3600 * 1000),
          totalElapsedMs: 1.2 * 3600 * 1000,
          actualDurationMinutes: 72,
          actualDistanceKm: 22.4,
          completedStopsCount: 5,
          failedStopsCount: 0,
          totalStopsCount: 5,
          completionRatePercent: 100,
          punctualityRatePercent: 100,
          timeDeviationMinutes: 0,
          fuelConsumedLiters: 1.6,
          fuelCostTotal: 9.84
        },
        reportedIncidents: [
          {
            id: 'inc-01',
            type: 'congestion',
            description: 'Lentidão moderada de 8 minutos no viaduto da Av. Mário Ypiranga.',
            reportedAt: new Date(now - 2.4 * 3600 * 1000),
            severity: 'low'
          }
        ],
        sequence: []
      },

      // 2. Rota Fluvial Rio Negro / Tarumã-Açú (Barco / Fluvial - Ontem)
      {
        date: new Date(now - 1 * dayMs - 5 * 3600 * 1000),
        startedAt: new Date(now - 1 * dayMs - 5 * 3600 * 1000),
        completedAt: new Date(now - 1 * dayMs - 2.5 * 3600 * 1000),
        totalElapsedMs: 2.5 * 3600 * 1000,
        name: 'Porto de Manaus ➔ Praia da Lua & Marina do Davi',
        addresses: [
          'Porto Fluvial Roadway, Centro, Manaus, AM',
          'Atracadouro Orla Ponta Negra, Manaus, AM',
          'Comunidade Fluvial Praia da Lua, Rio Negro, AM',
          'Marina do Davi, Tarumã-Açú, Manaus, AM'
        ],
        vehicleType: 'boat',
        priority: 'safety',
        score: 94,
        finalScore: 94,
        status: 'completed',
        totalDistanceKm: 34.8,
        totalDurationMinutes: 150,
        deliveryPhoto: baseBoxSvg('DESEMBARQUE FLUVIAL SEGURO', '06b6d4'),
        deliveryNotes: 'Carga de suprimentos médicos atracada na Praia da Lua com auxílio de ecobatímetro.',
        originalParameters: {
          addresses: [
            'Porto Fluvial Roadway, Centro, Manaus, AM',
            'Atracadouro Orla Ponta Negra, Manaus, AM',
            'Comunidade Fluvial Praia da Lua, Rio Negro, AM',
            'Marina do Davi, Tarumã-Açú, Manaus, AM'
          ],
          priority: 'safety',
          vehicleType: 'boat',
          vehicleName: 'Lancha Expressa Fluvial (Calado 1.8m)'
        },
        calculatedRoute: {
          waypoints: [
            { address: 'Porto Fluvial Roadway, Centro, Manaus, AM', lat: -3.1380, lng: -60.0240, stopIndex: 0, stopType: 'pickup', status: 'completed', plannedArrivalTime: '09:00', actualArrivalTime: '09:00', serviceDurationMinutes: 30, fluvialPort: 'Porto Roadway' },
            { address: 'Atracadouro Orla Ponta Negra, Manaus, AM', lat: -3.0640, lng: -60.1030, stopIndex: 1, stopType: 'delivery', status: 'completed', plannedArrivalTime: '10:00', actualArrivalTime: '09:55', serviceDurationMinutes: 20, fluvialPort: 'Pier Ponta Negra' },
            { address: 'Comunidade Fluvial Praia da Lua, Rio Negro, AM', lat: -3.0780, lng: -60.1250, stopIndex: 2, stopType: 'delivery', status: 'completed', plannedArrivalTime: '10:40', actualArrivalTime: '10:50', serviceDurationMinutes: 25, fluvialPort: 'Comunidade Praia da Lua' },
            { address: 'Marina do Davi, Tarumã-Açú, Manaus, AM', lat: -3.0530, lng: -60.1120, stopIndex: 3, stopType: 'delivery', status: 'completed', plannedArrivalTime: '11:30', actualArrivalTime: '11:30', serviceDurationMinutes: 15, fluvialPort: 'Marina do Davi' }
          ],
          distanceMeters: 34800,
          distanceKm: 34.8,
          durationSeconds: 9000,
          durationMinutes: 150,
          estimatedFuelLiters: 9.9,
          estimatedFuelCost: 60.88,
          isFluvial: true
        },
        executionMetrics: {
          startedAt: new Date(now - 1 * dayMs - 5 * 3600 * 1000),
          completedAt: new Date(now - 1 * dayMs - 2.5 * 3600 * 1000),
          totalElapsedMs: 2.5 * 3600 * 1000,
          actualDurationMinutes: 150,
          actualDistanceKm: 34.8,
          completedStopsCount: 4,
          failedStopsCount: 0,
          totalStopsCount: 4,
          completionRatePercent: 100,
          punctualityRatePercent: 96,
          timeDeviationMinutes: 0,
          fuelConsumedLiters: 9.9,
          fuelCostTotal: 60.88
        },
        reportedIncidents: [
          {
            id: 'inc-fluv-01',
            type: 'sandbank',
            description: 'Aproximação de banco de areia submerso a 450m (Praia da Lua). Calado reduzido para 1.9m com correção de talvegue.',
            reportedAt: new Date(now - 1 * dayMs - 3.8 * 3600 * 1000),
            severity: 'high'
          },
          {
            id: 'inc-fluv-02',
            type: 'repiquete',
            description: 'Recuo de 22cm no nível da lâmina d\'água nas margens do Tarumã.',
            reportedAt: new Date(now - 1 * dayMs - 3.1 * 3600 * 1000),
            severity: 'medium'
          }
        ],
        sequence: []
      },

      // 3. Rota Moto Express (Moto - 3 dias atrás)
      {
        date: new Date(now - 3 * dayMs),
        startedAt: new Date(now - 3 * dayMs),
        completedAt: new Date(now - 3 * dayMs + 1 * 3600 * 1000),
        totalElapsedMs: 1 * 3600 * 1000,
        name: 'Entregas Expressas Farmácia & Encomendas Leves',
        addresses: [
          'Hub Centro, Rua Barroso, Manaus, AM',
          'Rua Belém, Adrianópolis, Manaus, AM',
          'Av. Efigênio Salles, Aleixo, Manaus, AM',
          'Parque Dez de Novembro, Manaus, AM'
        ],
        vehicleType: 'motorcycle',
        priority: 'speed',
        score: 99,
        finalScore: 99,
        status: 'completed',
        totalDistanceKm: 18.2,
        totalDurationMinutes: 48,
        deliveryPhoto: baseBoxSvg('MOTO EXPRESS ENTREGUE', 'eab308'),
        deliveryNotes: 'Entrega rápida com protocolo digital assinado no app.',
        originalParameters: {
          addresses: [
            'Hub Centro, Rua Barroso, Manaus, AM',
            'Rua Belém, Adrianópolis, Manaus, AM',
            'Av. Efigênio Salles, Aleixo, Manaus, AM',
            'Parque Dez de Novembro, Manaus, AM'
          ],
          priority: 'speed',
          vehicleType: 'motorcycle',
          vehicleName: 'Moto Honda CG 160 Cargo'
        },
        calculatedRoute: {
          waypoints: [
            { address: 'Hub Centro, Rua Barroso, Manaus, AM', lat: -3.1320, lng: -60.0210, stopIndex: 0, stopType: 'pickup', status: 'completed', plannedArrivalTime: '14:00', actualArrivalTime: '14:00', serviceDurationMinutes: 10 },
            { address: 'Rua Belém, Adrianópolis, Manaus, AM', lat: -3.1100, lng: -60.0120, stopIndex: 1, stopType: 'delivery', status: 'completed', plannedArrivalTime: '14:18', actualArrivalTime: '14:15', serviceDurationMinutes: 8 },
            { address: 'Av. Efigênio Salles, Aleixo, Manaus, AM', lat: -3.0970, lng: -59.9980, stopIndex: 2, stopType: 'delivery', status: 'completed', plannedArrivalTime: '14:32', actualArrivalTime: '14:30', serviceDurationMinutes: 10 },
            { address: 'Parque Dez de Novembro, Manaus, AM', lat: -3.0850, lng: -60.0090, stopIndex: 3, stopType: 'delivery', status: 'completed', plannedArrivalTime: '14:48', actualArrivalTime: '14:48', serviceDurationMinutes: 10 }
          ],
          distanceMeters: 18200,
          distanceKm: 18.2,
          durationSeconds: 2880,
          durationMinutes: 48,
          estimatedFuelLiters: 0.5,
          estimatedFuelCost: 3.08,
          isFluvial: false
        },
        executionMetrics: {
          startedAt: new Date(now - 3 * dayMs),
          completedAt: new Date(now - 3 * dayMs + 1 * 3600 * 1000),
          totalElapsedMs: 1 * 3600 * 1000,
          actualDurationMinutes: 48,
          actualDistanceKm: 18.2,
          completedStopsCount: 4,
          failedStopsCount: 0,
          totalStopsCount: 4,
          completionRatePercent: 100,
          punctualityRatePercent: 100,
          timeDeviationMinutes: -3,
          fuelConsumedLiters: 0.5,
          fuelCostTotal: 3.08
        },
        reportedIncidents: [],
        sequence: []
      },

      // 4. Rota Caminhão de Carga / Distribuição Industrial (Caminhão - 6 dias atrás)
      {
        date: new Date(now - 6 * dayMs),
        startedAt: new Date(now - 6 * dayMs),
        completedAt: new Date(now - 6 * dayMs + 3 * 3600 * 1000),
        totalElapsedMs: 3 * 3600 * 1000,
        name: 'PIM ➔ Atacadistas Zona Leste & Cidade Nova',
        addresses: [
          'Polo Industrial de Manaus, Distrito II, Manaus, AM',
          'Av. Autaz Mirim, São José Operário, Manaus, AM',
          'Av. Camapuã, Cidade Nova, Manaus, AM',
          'Av. Torquato Tapajós, Flores, Manaus, AM'
        ],
        vehicleType: 'truck',
        priority: 'economy',
        score: 96,
        finalScore: 96,
        status: 'completed',
        totalDistanceKm: 46.5,
        totalDurationMinutes: 165,
        deliveryPhoto: baseBoxSvg('CARGA PESADA ENTREGUE - CIDADE NOVA', 'f59e0b'),
        deliveryNotes: 'Descarga em doca industrial com conferência física e romaneio assinado.',
        originalParameters: {
          addresses: [
            'Polo Industrial de Manaus, Distrito II, Manaus, AM',
            'Av. Autaz Mirim, São José Operário, Manaus, AM',
            'Av. Camapuã, Cidade Nova, Manaus, AM',
            'Av. Torquato Tapajós, Flores, Manaus, AM'
          ],
          priority: 'economy',
          vehicleType: 'truck',
          vehicleName: 'Caminhão Toco VW 13.190'
        },
        calculatedRoute: {
          waypoints: [
            { address: 'Polo Industrial de Manaus, Distrito II, Manaus, AM', lat: -3.1180, lng: -59.9540, stopIndex: 0, stopType: 'pickup', status: 'completed', plannedArrivalTime: '07:30', actualArrivalTime: '07:30', serviceDurationMinutes: 40 },
            { address: 'Av. Autaz Mirim, São José Operário, Manaus, AM', lat: -3.0780, lng: -59.9450, stopIndex: 1, stopType: 'delivery', status: 'completed', plannedArrivalTime: '08:45', actualArrivalTime: '08:52', serviceDurationMinutes: 30 },
            { address: 'Av. Camapuã, Cidade Nova, Manaus, AM', lat: -3.0360, lng: -59.9720, stopIndex: 2, stopType: 'delivery', status: 'completed', plannedArrivalTime: '09:40', actualArrivalTime: '09:45', serviceDurationMinutes: 25 },
            { address: 'Av. Torquato Tapajós, Flores, Manaus, AM', lat: -3.0640, lng: -60.0270, stopIndex: 3, stopType: 'delivery', status: 'completed', plannedArrivalTime: '10:35', actualArrivalTime: '10:40', serviceDurationMinutes: 20 }
          ],
          distanceMeters: 46500,
          distanceKm: 46.5,
          durationSeconds: 9900,
          durationMinutes: 165,
          estimatedFuelLiters: 5.2,
          estimatedFuelCost: 31.98,
          isFluvial: false
        },
        executionMetrics: {
          startedAt: new Date(now - 6 * dayMs),
          completedAt: new Date(now - 6 * dayMs + 3 * 3600 * 1000),
          totalElapsedMs: 3 * 3600 * 1000,
          actualDurationMinutes: 165,
          actualDistanceKm: 46.5,
          completedStopsCount: 4,
          failedStopsCount: 0,
          totalStopsCount: 4,
          completionRatePercent: 100,
          punctualityRatePercent: 94,
          timeDeviationMinutes: 6,
          fuelConsumedLiters: 5.2,
          fuelCostTotal: 31.98
        },
        reportedIncidents: [
          {
            id: 'inc-truck-01',
            type: 'pothole',
            description: 'Trecho com buracos profundos e pavimento irregular na Av. Camapuã próximo à rotatória.',
            reportedAt: new Date(now - 6 * dayMs + 1.8 * 3600 * 1000),
            severity: 'medium'
          }
        ],
        sequence: []
      }
    ];

    for (const r of sampleRoutes) {
      (r as any).isSimulated = true;
      const normalized = normalizeHistoricalRoute(r);
      await db.routes.add(normalized);
    }
    console.log("[Route History] Sample realistic routes successfully initialized.");
  } catch (err) {
    console.warn("[Route History] Could not seed historical routes:", err);
  }
}

/**
 * Exports routes to CSV with all parameters, calculated data, and execution metrics
 */
export function exportHistoryToCSV(routes: Route[]): void {
  const normalized = routes.map(normalizeHistoricalRoute);
  if (normalized.length === 0) return;

  const headers = [
    'ID Rota',
    'Nome da Rota',
    'Data Inicio',
    'Data Conclusao',
    'Modal / Veiculo',
    'Prioridade Otimizacao',
    'Score Integridade (%)',
    'Status Operacional',
    'Qtd Total Paradas',
    'Paradas Entregues',
    'Paradas Falhas',
    'Taxa Sucesso (%)',
    'Distancia Planejada (km)',
    'Duracao Planejada (min)',
    'Duracao Real Executada (min)',
    'Desvio de Tempo (min)',
    'Volume Combustivel (L)',
    'Custo Combustivel (R$)',
    'Qtd Incidentes Reportados',
    'Descricao dos Incidentes',
    'Sequencia de Enderecos',
    'Anotacoes Finais'
  ];

  const escapeCSV = (val: any) => {
    if (val === undefined || val === null) return '';
    let str = String(val);
    str = str.replace(/"/g, '""');
    if (/[",;\n\r]/.test(str)) {
      str = `"${str}"`;
    }
    return str;
  };

  const rows = normalized.map(r => {
    const incDesc = (r.reportedIncidents || []).map(i => `[${i.type}] ${i.description}`).join(' | ');
    const addrs = (r.addresses || []).join(' ➔ ');
    const dateStart = r.startedAt ? new Date(r.startedAt).toISOString() : new Date(r.date).toISOString();
    const dateEnd = r.completedAt ? new Date(r.completedAt).toISOString() : '';

    return [
      r.id || '',
      r.name || `Rota #${r.id}`,
      dateStart,
      dateEnd,
      getVehicleLabel(r.vehicleType),
      getPriorityLabel(r.priority),
      r.finalScore || r.score || 95,
      r.status,
      r.executionMetrics?.totalStopsCount || r.addresses.length,
      r.executionMetrics?.completedStopsCount || r.addresses.length,
      r.executionMetrics?.failedStopsCount || 0,
      r.executionMetrics?.completionRatePercent || 100,
      r.calculatedRoute?.distanceKm || r.totalDistanceKm || 0,
      r.calculatedRoute?.durationMinutes || r.totalDurationMinutes || 0,
      r.executionMetrics?.actualDurationMinutes || r.calculatedRoute?.durationMinutes || 0,
      r.executionMetrics?.timeDeviationMinutes || 0,
      r.executionMetrics?.fuelConsumedLiters || r.calculatedRoute?.estimatedFuelLiters || 0,
      r.executionMetrics?.fuelCostTotal || r.calculatedRoute?.estimatedFuelCost || 0,
      (r.reportedIncidents || []).length,
      incDesc,
      addrs,
      r.deliveryNotes || ''
    ].map(escapeCSV).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `harpia_historico_rotas_auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports routes to a JSON file for backup or API integration
 */
export function exportHistoryToJSON(routes: Route[]): void {
  const normalized = routes.map(normalizeHistoricalRoute);
  const jsonStr = JSON.stringify(normalized, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `harpia_historico_rotas_${new Date().toISOString().slice(0, 10)}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
