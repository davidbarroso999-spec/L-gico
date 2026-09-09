import { NextResponse } from 'next/server';
import { getMatrix } from '@/lib/api-services';
import { calculateFluvialPath, findClosestFluvialNode, calculateDistanceKm, FLUVIAL_PORTS } from '@/lib/fluvial-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locations, vehicle, priority, vesselType, travelMonth, engine } = body;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json({ error: "Parâmetro 'locations' é obrigatório" }, { status: 400 });
    }

    const n = locations.length;
    const coords: [number, number][] = locations.map((l: any) => [l.lat, l.lon]);

    if (vehicle === 'boat') {
      const distances: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
      const durations: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));

      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const fromNode = findClosestFluvialNode(locations[i].lat, locations[i].lon);
          const toNode = findClosestFluvialNode(locations[j].lat, locations[j].lon);

          const stats = calculateFluvialPath(
            fromNode.nodeId,
            toNode.nodeId,
            (priority as any) || 'speed',
            (vesselType as any) || 'express_lancha',
            travelMonth
          );

          let distMeters = stats.distanceKm * 1000;
          let durSeconds = stats.durationMinutes * 60;

          if (fromNode.nodeId === toNode.nodeId) {
            const directKm = calculateDistanceKm(locations[i].lat, locations[i].lon, locations[j].lat, locations[j].lon);
            distMeters = Math.max(250, directKm * 1000);
            durSeconds = Math.max(120, (distMeters / 1000 / 25) * 3600);
          }

          distances[i][j] = Math.round(distMeters);
          durations[i][j] = Math.round(durSeconds);
        }
      }

      return NextResponse.json({
        matrix: { distances, durations, hybridConsolidated: true },
        vehicle: 'boat'
      });
    }

    let profile = 'driving-car';
    if (vehicle === 'moto') profile = 'cycling-regular';
    if (vehicle === 'truck' || vehicle === 'van') profile = 'driving-hgv';

    let preference = 'fastest';
    if (priority === 'speed') preference = 'fastest';
    if (priority === 'distance') preference = 'shortest';
    if (priority === 'economy' || priority === 'safety' || priority === 'balanced') preference = 'recommended';

    const matrix = await getMatrix(coords, profile, preference, engine);

    return NextResponse.json({
      matrix,
      vehicle,
      profile,
      preference
    });
  } catch (error: any) {
    console.error("Erro na API de Matriz de Distância:", error);
    return NextResponse.json({ error: error.message || "Falha ao gerar matriz" }, { status: 500 });
  }
}
