import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Parâmetros lat e lon são necessários.' }, { status: 400 });
  }

  try {
    const url = `https://api.opentopodata.org/v1/srtm30m?locations=${lat},${lon}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OpenTopoData returned status: ${res.status}`);
    
    const data = await res.json();
    const elevation = data.results?.[0]?.elevation || 25; // Default average elevation for Manaus
    return NextResponse.json({ elevation });
  } catch (err: any) {
    console.warn('[Server Elevation Proxy] OpenTopoData falhou, gerando aproximação:', err.message);
    const mockElevation = 20 + Math.random() * 30;
    return NextResponse.json({ elevation: mockElevation });
  }
}
