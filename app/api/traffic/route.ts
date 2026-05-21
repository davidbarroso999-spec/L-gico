import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get('bbox');

  if (!bbox) {
    return NextResponse.json({ error: 'Parâmetro bbox é necessário.' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_TOMTOM_KEY || 'RTvaCPgTDMD4fSaOTbGkZNdHnnFs7Q4K';

  try {
    const url = `https://api.tomtom.com/traffic/services/4/incidentDetails/s3/${bbox}/10/pt-BR.json?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TomTom Traffic returned status: ${res.status}`);
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.warn('[Server Traffic Proxy] TomTom falhou, retornando eventos vazios:', err.message);
    return NextResponse.json({ tm: { poi: [] } });
  }
}
