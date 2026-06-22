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

export class VoieExpressDatabase extends Dexie {
  routes!: Table<Route>;
  occurrences!: Table<Occurrence>;
  cache!: Table<CacheEntry>;

  constructor() {
    super('VoieExpressDB');
    this.version(1).stores({
      routes: '++id, date, status',
      occurrences: '++id, type, timestamp, synced',
      cache: 'key'
    });
  }
}

export const db = new VoieExpressDatabase();

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
