import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cep = searchParams.get('cep');

  if (!cep) {
    return NextResponse.json({ error: 'Parâmetro cep é necessário.' }, { status: 400 });
  }

  const cleanCep = cep.replace(/\D/g, '');

  try {
    const url = `https://viacep.com.br/ws/${cleanCep}/json/`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ViaCEP returned status: ${res.status}`);
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Server ViaCEP Proxy] Erro:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
