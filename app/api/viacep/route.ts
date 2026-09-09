import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cep = searchParams.get('cep');

  if (!cep) {
    return NextResponse.json({ error: 'Parâmetro cep é necessário.' }, { status: 400 });
  }

  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return NextResponse.json({ error: 'CEP deve conter 8 dígitos numéricos.' }, { status: 400 });
  }

  // 1. Try BrasilAPI v2 (returns street, neighborhood, city, state and direct geographic coordinates!)
  const fetchBrasilApi = async () => {
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.errors) {
          const lat = data.location?.coordinates?.latitude ? Number(data.location.coordinates.latitude) : undefined;
          const lon = data.location?.coordinates?.longitude ? Number(data.location.coordinates.longitude) : undefined;

          return {
            cep: data.cep,
            logradouro: data.street || '',
            bairro: data.neighborhood || '',
            localidade: data.city || '',
            uf: data.state || '',
            lat,
            lon,
            source: 'brasilapi'
          };
        }
      }
    } catch (e) {
      // ignore and fallback
    }
    return null;
  };

  // 2. Try ViaCEP
  const fetchViaCep = async () => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.erro) {
          return {
            cep: data.cep,
            logradouro: data.logradouro || '',
            complemento: data.complemento || '',
            bairro: data.bairro || '',
            localidade: data.localidade || '',
            uf: data.uf || '',
            ibge: data.ibge,
            ddd: data.ddd,
            source: 'viacep'
          };
        }
      }
    } catch (e) {
      // ignore and fallback
    }
    return null;
  };

  // 3. Try OpenCEP
  const fetchOpenCep = async () => {
    try {
      const res = await fetch(`https://opencep.com/v1/${cleanCep}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          return {
            cep: data.cep,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            localidade: data.localidade || '',
            uf: data.uf || '',
            ibge: data.ibge,
            source: 'opencep'
          };
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  try {
    // Run BrasilAPI and ViaCEP in parallel for maximum speed and precision
    const [brasilData, viaData] = await Promise.all([fetchBrasilApi(), fetchViaCep()]);

    if (brasilData && viaData) {
      // Merge: BrasilAPI coordinates with ViaCEP richness
      return NextResponse.json({
        ...viaData,
        lat: brasilData.lat || undefined,
        lon: brasilData.lon || undefined,
        logradouro: viaData.logradouro || brasilData.logradouro,
        bairro: viaData.bairro || brasilData.bairro,
        localidade: viaData.localidade || brasilData.localidade,
        uf: viaData.uf || brasilData.uf
      });
    }

    if (brasilData) {
      return NextResponse.json(brasilData);
    }

    if (viaData) {
      return NextResponse.json(viaData);
    }

    // Fallback to OpenCEP
    const openData = await fetchOpenCep();
    if (openData) {
      return NextResponse.json(openData);
    }

    return NextResponse.json({ error: 'CEP não encontrado nas bases dos Correios e bases nacionais.' }, { status: 404 });
  } catch (err: any) {
    console.error('[Server CEP Multi-Resolver] Erro:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
