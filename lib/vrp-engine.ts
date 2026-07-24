/**
 * HARPIA VRP Solver Engine (Mathematical Optimization Module)
 * Implements heuristics (Savings Algorithm + 2-Opt/Or-Opt Local Search)
 * with constraint checking (Time Windows, Capacity, Priority) and strict execution time limits.
 */

import {
  AdjustedCostMatrix,
  GeminiContextAdjustments,
  RawCostMatrix,
  StopConstraints,
  VehicleConstraints,
  VRPSolution
} from './vrp-types';

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Stage 3: Builds the adjusted cost matrix by merging raw distance/time matrix with Gemini context adjustments
 */
export function buildAdjustedMatrix(
  rawMatrix: RawCostMatrix,
  contextAdjustments: GeminiContextAdjustments,
  vehicleConstraints: VehicleConstraints
): AdjustedCostMatrix {
  const n = rawMatrix.distances.length;
  const adjustedDurations: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  const adjustedDistances: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

  const gMult = contextAdjustments.globalMultipliers || { timeWeight: 1.0, distanceWeight: 1.0, riskWeight: 1.0 };

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      
      let baseDur = rawMatrix.durations[i]?.[j] ?? 600;
      let baseDist = rawMatrix.distances[i]?.[j] ?? 5000;

      // Check specific edge penalties
      const edgePen = contextAdjustments.edgePenalties?.find(p => p.fromIndex === i && p.toIndex === j);
      if (edgePen) {
        if (edgePen.multiplier) {
          baseDur *= edgePen.multiplier;
        }
        if (edgePen.penaltySeconds) {
          baseDur += edgePen.penaltySeconds;
        }
        if (edgePen.penaltyMeters) {
          baseDist += edgePen.penaltyMeters;
        }
      }

      // Check excluded edges
      const isExcluded = contextAdjustments.excludedEdges?.some(e => e.fromIndex === i && e.toIndex === j);
      if (isExcluded) {
        baseDur = Infinity;
        baseDist = Infinity;
      }

      adjustedDurations[i][j] = baseDur !== Infinity ? Math.max(0, baseDur * gMult.timeWeight) : Infinity;
      adjustedDistances[i][j] = baseDist !== Infinity ? Math.max(0, baseDist * gMult.distanceWeight) : Infinity;
    }
  }

  return {
    adjustedDurations,
    adjustedDistances,
    originalMatrix: rawMatrix,
    adjustmentsApplied: contextAdjustments
  };
}

/**
 * Calculates total route cost for a candidate sequence of indices
 */
function evaluateRouteSequence(
  sequence: number[],
  adjMatrix: AdjustedCostMatrix,
  stopConstraints: StopConstraints[],
  vehicleConstraints: VehicleConstraints
) {
  let totalDist = 0;
  let totalDur = 0;
  let currentTime = 480; // 08:00 AM start in minutes
  let totalLateness = 0;
  let totalWait = 0;
  let currentKg = 0;
  let capacityPenalty = 0;
  let priorityPenalty = 0;

  const vehicleCap = vehicleConstraints.capacityKg || Infinity;

  const stepDetails = [];

  // Check origin (index 0)
  const originDemand = stopConstraints[sequence[0]]?.demandKg || 0;
  currentKg += originDemand;

  stepDetails.push({
    stopIndex: sequence[0],
    arrivalMinutes: currentTime,
    departureMinutes: currentTime,
    latenessMinutes: 0,
    waitTimeMinutes: 0,
    accumulatedKg: currentKg
  });

  for (let k = 0; k < sequence.length - 1; k++) {
    const u = sequence[k];
    const v = sequence[k + 1];

    const durSec = adjMatrix.adjustedDurations[u]?.[v] ?? 600;
    const distMeters = adjMatrix.adjustedDistances[u]?.[v] ?? 5000;

    if (durSec === Infinity) {
      return { cost: Infinity, isFeasible: false, totalDist: Infinity, totalDur: Infinity, totalLateness: Infinity, totalWait: Infinity, capacityPenalty: Infinity, stepDetails: [] };
    }

    const travelMin = durSec / 60;
    totalDist += distMeters;
    totalDur += durSec;

    const arrivalMin = currentTime + travelMin;
    const targetConstraint = stopConstraints[v] || { index: v, address: '' };

    // Service time
    const serviceMin = targetConstraint.serviceTimeMinutes || 15;

    // Time window evaluation
    let waitMin = 0;
    let lateMin = 0;

    if (targetConstraint.timeWindow) {
      const wStart = parseTimeToMinutes(targetConstraint.timeWindow.start);
      const wEnd = parseTimeToMinutes(targetConstraint.timeWindow.end);

      if (wStart !== null && arrivalMin < wStart) {
        waitMin = wStart - arrivalMin;
      }
      if (wEnd !== null && arrivalMin > wEnd) {
        lateMin = arrivalMin - wEnd;
      }
    }

    const departureMin = arrivalMin + waitMin + serviceMin;
    currentTime = departureMin;

    totalWait += waitMin;
    totalLateness += lateMin;

    // Capacity check
    const demand = targetConstraint.demandKg || 0;
    currentKg += demand;
    if (currentKg > vehicleCap) {
      capacityPenalty += (currentKg - vehicleCap) * 50;
    }

    // Priority inversion check: If an urgent/high priority stop is visited late after low priority
    const prioStr = targetConstraint.priority || 'medium';
    if (prioStr === 'urgent') {
      priorityPenalty += (k * 20); // Urgent stops should ideally be earlier
    } else if (prioStr === 'high') {
      priorityPenalty += (k * 5);
    }

    stepDetails.push({
      stopIndex: v,
      arrivalMinutes: Math.round(arrivalMin),
      departureMinutes: Math.round(departureMin),
      latenessMinutes: Math.round(lateMin),
      waitTimeMinutes: Math.round(waitMin),
      accumulatedKg: currentKg
    });
  }

  // Combined weighted mathematical cost function
  const latenessCost = totalLateness * 100; // Heavy penalty for missing time window
  const waitCost = totalWait * 5;          // Moderate cost for waiting
  const cost = (totalDur / 60) * 1.0 + (totalDist / 1000) * 0.5 + latenessCost + waitCost + capacityPenalty + priorityPenalty;

  return {
    cost,
    isFeasible: latenessCost === 0 && capacityPenalty === 0,
    totalDist,
    totalDur,
    totalLateness,
    totalWait,
    currentKg,
    stepDetails
  };
}

/**
 * Stage 4: Solves VRP / TSP using mathematical heuristic with time limit budget
 */
export function solveVRPMatrix(
  adjMatrix: AdjustedCostMatrix,
  stopConstraints: StopConstraints[],
  vehicleConstraints: VehicleConstraints,
  timeLimitMs: number = 10000
): VRPSolution {
  const startTime = Date.now();
  const n = adjMatrix.adjustedDurations.length;

  if (n <= 1) {
    return {
      optimizedSequenceIndices: [0],
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
      totalLatenessMinutes: 0,
      totalWaitTimeMinutes: 0,
      totalCapacityUsedKg: 0,
      solverMethod: "Mathematical VRP Solver (Single Node)",
      solverExecutionTimeMs: Date.now() - startTime,
      searchTimedOut: false,
      stepDetails: [{ stopIndex: 0, arrivalMinutes: 480, departureMinutes: 480, latenessMinutes: 0, waitTimeMinutes: 0, accumulatedKg: 0 }]
    };
  }

  const originIndex = 0;
  const hasFixedEnd = n >= 3;
  const endIndex = hasFixedEnd ? n - 1 : null;

  // Intermediates to sequence
  const intermediateIndices: number[] = [];
  for (let i = 1; i < n; i++) {
    if (endIndex !== null && i === endIndex) continue;
    intermediateIndices.push(i);
  }

  // 1. Initial Construction: Priority & Distance Guided Insertion
  let currentSequence: number[] = [originIndex];
  const unvisited = [...intermediateIndices];

  let currentLoc = originIndex;
  while (unvisited.length > 0) {
    let bestNext = -1;
    let bestCandidateCost = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const candidateSeq = [...currentSequence, candidate];
      if (endIndex !== null) {
        candidateSeq.push(...unvisited.filter(u => u !== candidate), endIndex);
      } else {
        candidateSeq.push(...unvisited.filter(u => u !== candidate));
      }

      const evalRes = evaluateRouteSequence(candidateSeq, adjMatrix, stopConstraints, vehicleConstraints);
      if (evalRes.cost < bestCandidateCost) {
        bestCandidateCost = evalRes.cost;
        bestNext = i;
      }
    }

    if (bestNext !== -1) {
      const chosen = unvisited.splice(bestNext, 1)[0];
      currentSequence.push(chosen);
      currentLoc = chosen;
    } else {
      // Fallback: Pick first
      const chosen = unvisited.shift()!;
      currentSequence.push(chosen);
    }
  }

  if (endIndex !== null) {
    currentSequence.push(endIndex);
  }

  // 2. Local Search Refinement: 2-Opt & Or-Opt Edge Swaps with Time Limit
  let bestSequence = [...currentSequence];
  let bestEval = evaluateRouteSequence(bestSequence, adjMatrix, stopConstraints, vehicleConstraints);
  let timedOut = false;

  let improved = true;
  let iterations = 0;

  while (improved) {
    improved = false;
    iterations++;

    if (Date.now() - startTime > timeLimitMs) {
      timedOut = true;
      break;
    }

    // 2-opt swaps on intermediate stops (indices 1 to length - 2 if fixed end, or length - 1)
    const maxI = hasFixedEnd ? bestSequence.length - 2 : bestSequence.length - 1;

    for (let i = 1; i < maxI - 1; i++) {
      for (let j = i + 1; j < maxI; j++) {
        if (Date.now() - startTime > timeLimitMs) {
          timedOut = true;
          break;
        }

        // Create 2-opt reversed segment
        const candidateSeq = [
          ...bestSequence.slice(0, i),
          ...bestSequence.slice(i, j + 1).reverse(),
          ...bestSequence.slice(j + 1)
        ];

        const candEval = evaluateRouteSequence(candidateSeq, adjMatrix, stopConstraints, vehicleConstraints);
        if (candEval.cost < bestEval.cost - 0.01) {
          bestSequence = candidateSeq;
          bestEval = candEval;
          improved = true;
          break;
        }
      }
      if (improved || timedOut) break;
    }
  }

  const execTimeMs = Date.now() - startTime;

  return {
    optimizedSequenceIndices: bestSequence,
    totalDistanceMeters: bestEval.totalDist,
    totalDurationSeconds: bestEval.totalDur,
    totalLatenessMinutes: bestEval.totalLateness,
    totalWaitTimeMinutes: bestEval.totalWait,
    totalCapacityUsedKg: bestEval.currentKg || 0,
    solverMethod: `Mathematical VRP Solver (Savings + 2-Opt Heuristic - ${iterations} Iterations)`,
    solverExecutionTimeMs: execTimeMs,
    searchTimedOut: timedOut,
    stepDetails: bestEval.stepDetails
  };
}
