import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cityCode = searchParams.get('cityCode') || '1302603'; // Default to Manaus

  try {
    const url = `https://apiprevmet3.inmet.gov.br/previsao/${cityCode}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`INMET returned status: ${res.status}`);
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.warn('[Server INMET Proxy] INMET falhou, retornando nulo:', err.message);
    return NextResponse.json(null);
  }
}
