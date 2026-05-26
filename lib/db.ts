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

export class LogixDatabase extends Dexie {
  routes!: Table<Route>;
  occurrences!: Table<Occurrence>;
  cache!: Table<CacheEntry>;

  constructor() {
    super('LogixRouteDB');
    this.version(1).stores({
      routes: '++id, date, status',
      occurrences: '++id, type, timestamp, synced',
      cache: 'key'
    });
  }
}

export const db = new LogixDatabase();
