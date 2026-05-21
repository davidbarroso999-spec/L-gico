import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'route'; // 'route' | 'table' | 'match'
  const coords = searchParams.get('coords');
  const extra = searchParams.get('extra') || '';

  if (!coords) {
    return NextResponse.json({ error: 'Parâmetro coords é necessário.' }, { status: 400 });
  }

  try {
    let url = '';
    if (type === 'route') {
      url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&${extra}`;
    } else if (type === 'table') {
      url = `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance,duration&${extra}`;
    } else if (type === 'match') {
      url = `https://router.project-osrm.org/match/v1/driving/${coords}?geometries=geojson&overview=simplified&${extra}`;
    } else {
      return NextResponse.json({ error: 'Tipo OSRM inválido.' }, { status: 400 });
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM Router returned status: ${res.status}`);
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Server OSRM Proxy] Erro:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
