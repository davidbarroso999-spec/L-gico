/**
 * HARPIA VRP Engine Types (Vehicle Routing Problem Architecture)
 * Inspired by ORION multi-layer separation of concerns.
 */

export interface LocationPoint {
  id: string;
  index: number;
  address: string;
  lat: number;
  lon: number;
  fluvialPort?: string;
  weather?: any;
  riskScore: number;
  elevation?: number;
  activeOccurrences?: any[];
  amazonasHydrology?: any;
  invoice?: {
    key?: string;
    pdfUrl?: string;
    valor?: number;
    peso?: number;
    destinatario?: string;
    fullData?: any;
  };
}

export interface StopConstraints {
  index: number;
  address: string;
  timeWindow?: {
    start: string; // "HH:MM"
    end: string;   // "HH:MM"
  };
  serviceTimeMinutes?: number;
  demandKg?: number;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  modalRestriction?: 'all' | 'boat_only' | 'land_only';
  stopType?: 'pickup' | 'delivery';
  elevation?: number;
  riskScore?: number;
  activeOccurrences?: any[];
  amazonasHydrology?: any;
}

export interface VehicleConstraints {
  vehicle: 'car' | 'moto' | 'truck' | 'van' | 'boat';
  vesselType?: 'express_lancha' | 'voadeira' | 'regional_gaiola' | 'balsa_heavy';
  capacityKg?: number; // e.g., 500kg for van, 5000kg for truck, 100kg for moto
  maxTimeMinutes?: number;
  priorityProfile: 'speed' | 'distance' | 'economy' | 'safety' | 'balanced';
  avoidDirt: boolean;
  avoidFloods: boolean;
  avoidHills: boolean;
}

export interface RawCostMatrix {
  distances: number[][]; // N x N distance in meters
  durations: number[][]; // N x N duration in seconds
  hybridConsolidated?: boolean;
}

export interface EdgeAdjustment {
  fromIndex: number;
  toIndex: number;
  multiplier?: number;
  penaltySeconds?: number;
  penaltyMeters?: number;
  reason?: string;
}

export interface ExcludedEdge {
  fromIndex: number;
  toIndex: number;
  reason: string;
}

export interface GeminiContextAdjustments {
  edgePenalties: EdgeAdjustment[];
  excludedEdges: ExcludedEdge[];
  priorityOverrides?: { stopIndex: number; newPriority: 'urgent' | 'high' | 'medium' | 'low'; reason: string }[];
  globalMultipliers: {
    timeWeight: number;
    distanceWeight: number;
    riskWeight: number;
  };
  qualitativeSummary: string;
}

export interface AdjustedCostMatrix {
  adjustedDurations: number[][]; // N x N adjusted duration in seconds
  adjustedDistances: number[][]; // N x N adjusted distance in meters
  originalMatrix: RawCostMatrix;
  adjustmentsApplied: GeminiContextAdjustments;
}

export interface VRPSolution {
  optimizedSequenceIndices: number[]; // e.g. [0, 3, 1, 2, 4, 5]
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalLatenessMinutes: number;
  totalWaitTimeMinutes: number;
  totalCapacityUsedKg: number;
  solverMethod: string;
  solverExecutionTimeMs: number;
  searchTimedOut: boolean;
  stepDetails: {
    stopIndex: number;
    arrivalMinutes: number;
    departureMinutes: number;
    latenessMinutes: number;
    waitTimeMinutes: number;
    accumulatedKg: number;
  }[];
}
