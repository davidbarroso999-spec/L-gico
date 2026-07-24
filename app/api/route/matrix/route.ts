import { NextResponse } from 'next/server';
import { getMatrix } from '@/lib/api-services';
import { FLUVIAL_PORTS, getFluvialPathStats } from '@/lib/route-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locations, vehicle, priority, vesselType, engine } = body;

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
          const fromPortName = locations[i].fluvialPort || FLUVIAL_PORTS[0].name;
          const toPortName = locations[j].fluvialPort || FLUVIAL_PORTS[0].name;
          const fromPort = FLUVIAL_PORTS.find(p => p.name === fromPortName) || FLUVIAL_PORTS[0];
          const toPort = FLUVIAL_PORTS.find(p => p.name === toPortName) || FLUVIAL_PORTS[0];

          const stats = getFluvialPathStats(fromPort.nodeId, toPort.nodeId, priority || 'speed', vesselType);
          distances[i][j] = stats.distance * 1000; // meters
          durations[i][j] = stats.duration * 60; // seconds
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
