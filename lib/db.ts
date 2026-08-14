import Dexie, { Table } from 'dexie';

export interface Route {
  id?: number;
  date: Date;
  addresses: string[];
  sequence: any[];
  score: number;
  status: 'pending' | 'completed' | 'failed';
  deliveryPhoto?: string;
  deliveryNotes?: string;
  completedAt?: Date;
  startedAt?: Date;
  totalElapsedMs?: number;
  name?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  isFutureRoute?: boolean;
}

export interface Occurrence {
  id?: number;
  type: 'accident' | 'road_closed' | 'construction' | 'congestion' | 'flood' | 'pothole' | 'other';
  lat: number;
  lon: number;
  description: string;
  timestamp: Date;
  synced: boolean;
}

export interface CacheEntry {
  key: string;
  data: any;
  ttl: number;
}

export interface OperationalMemory {
  id?: number;
  // Core Operational Data
  date: Date;
  time: string;
  driverId: string;
  vehicleId: string;
  vehicleType: string;
  weightKg: number;
  volumeM3: number;
  distributionCenter: string;
  clientName: string;

  // Geography & Location
  lat: number;
  lon: number;
  fullAddress: string;
  neighborhood: string;
  city: string;
  state: string;

  // Performance Metrics
  predictedTimeMs: number;
  actualTimeMs: number;
  predictedDistanceKm: number;
  actualDistanceKm: number;
  idleTimeMs: number;
  averageSpeedKmH: number;
  estimatedFuelConsumptionLiters: number;

  // Outcome
  attempts: number;
  success: boolean;
  failureReason?: string;
  occurrencesIds?: number[];
  
  // Context
  weatherConditions?: string;
  connectionStatus: 'online' | 'offline';
  synced: boolean;
  syncTimestamp?: Date;
}

export class HarpiaDatabase extends Dexie {
  routes!: Table<Route>;
  occurrences!: Table<Occurrence>;
  cache!: Table<CacheEntry>;
  operationalMemory!: Table<OperationalMemory>;

  constructor() {
    super('HarpiaDB_Clean_v1');
    this.version(1).stores({
      routes: '++id, date, status',
      occurrences: '++id, type, timestamp, synced',
      cache: 'key'
    });
    
    // v2: Add operationalMemory for ML/AI
    this.version(2).stores({
      operationalMemory: '++id, date, driverId, vehicleType, neighborhood, city, success, synced'
    });
  }
}

export const db = new HarpiaDatabase();

// Elite practice: Non-blocking background Garbage Collector for expired cache entries
if (typeof window !== 'undefined') {
  setTimeout(() => {
    db.cache
      .filter(entry => entry.ttl ? entry.ttl < Date.now() : false)
      .delete()
      .then(numDeleted => {
        if (numDeleted > 0) {
          console.log(`[Cache GC] Recycled ${numDeleted} expired persistent cache entries successfully.`);
        }
      })
      .catch(err => console.warn("[Cache GC] Pruning failed in background:", err));
  }, 3000); // 3-second delay to ensure smooth main-thread hydration and page mounting
}
