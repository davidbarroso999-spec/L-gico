import { NextResponse } from 'next/server';
import { buildAdjustedMatrix, solveVRPMatrix } from '@/lib/vrp-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rawMatrix, contextAdjustments, stopConstraints, vehicleConstraints, timeLimitMs } = body;

    if (!rawMatrix || !rawMatrix.distances || !rawMatrix.durations) {
      return NextResponse.json({ error: "Matriz bruta (rawMatrix) é obrigatória" }, { status: 400 });
    }

    const adjMatrix = buildAdjustedMatrix(
      rawMatrix,
      contextAdjustments || {
        edgePenalties: [],
        excludedEdges: [],
        globalMultipliers: { timeWeight: 1.0, distanceWeight: 1.0, riskWeight: 1.0 },
        qualitativeSummary: "Sem ajustes contextuais"
      },
      vehicleConstraints || {
        vehicle: 'car',
        priorityProfile: 'speed',
        avoidDirt: false,
        avoidFloods: false,
        avoidHills: false
      }
    );

    const solution = solveVRPMatrix(
      adjMatrix,
      stopConstraints || [],
      vehicleConstraints || {
        vehicle: 'car',
        priorityProfile: 'speed',
        avoidDirt: false,
        avoidFloods: false,
        avoidHills: false
      },
      timeLimitMs || 10000
    );

    return NextResponse.json({
      solution,
      adjustedMatrixSummary: {
        totalNodes: rawMatrix.distances.length,
        edgePenaltiesCount: adjMatrix.adjustmentsApplied.edgePenalties.length,
        excludedEdgesCount: adjMatrix.adjustmentsApplied.excludedEdges.length
      }
    });
  } catch (error: any) {
    console.error("Erro na API do Solver VRP:", error);
    return NextResponse.json({ error: error.message || "Falha ao executar o solver VRP" }, { status: 500 });
  }
}
