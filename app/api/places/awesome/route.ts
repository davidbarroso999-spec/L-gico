import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function formatCep(val?: string | null): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return val;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || searchParams.get('input') || '';
  const cepParam = searchParams.get('cep');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon') || searchParams.get('lng');
  const state = searchParams.get('state');
  const radius = searchParams.get('d') || '50';

  const apiKey =
    process.env.AWESOMEAPI_KEY ||
    process.env.AWESOMEAPI_CEP_KEY ||
    process.env.AWESOME_API_KEY ||
    '';

  const headers: Record<string, string> = {
    Accept: 'application/json'
  };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const rawInput = q.trim();

    // Extração de número e complemento digitados
    const typedNumberMatch = rawInput.match(/(?:n[º°\.\s-]*|num[.\s]*|#|no[.\s]*)\s*(\d{1,5}[a-zA-Z]?)\b/i) || rawInput.match(/\b(\d{1,5}[a-zA-Z]?)\b/g);
    const typedNumber = Array.isArray(typedNumberMatch) ? typedNumberMatch.find(n => !['2023','2024','2025','2026','2027'].includes(n)) : (typedNumberMatch ? typedNumberMatch[1] : undefined);
    
    const compMatch = rawInput.match(/\b(apto|apt|bloco|bl|sala|lote|lt|qd|quadra|km|casa|fundos|sobrado|galpao|galpão|andar|ap)\s*[:.-]?\s*([a-zA-Z0-9]+)\b/i);
    const typedComplement = compMatch ? `${compMatch[1].toUpperCase()} ${compMatch[2]}` : undefined;

    const poiMatch = rawInput.match(/(?:shopping|hospital|aeroporto|posto|escola|faculdade|hotel|parque|supermercado|praca|praça|arena|teatro|centro cultural)\s+([^,]+)/i);
    const poiReference = poiMatch ? poiMatch[0] : undefined;

    // Helper de síntese de item da AwesomeAPI
    const synthesize = (item: any) => {
      const street = item.address || [item.address_type, item.address_name].filter(Boolean).join(' ') || '';
      const num = typedNumber || item.number || '';
      let streetWithNum = street;
      if (num && !streetWithNum.includes(num)) {
        streetWithNum += `, ${num}`;
      }
      if (typedComplement && !streetWithNum.includes(typedComplement)) {
        streetWithNum += ` (${typedComplement})`;
      }

      let mainTitle = streetWithNum || item.address_name || 'Endereço';
      if (poiReference && !mainTitle.toLowerCase().includes(poiReference.toLowerCase())) {
        mainTitle = `${poiReference} - ${streetWithNum}`;
      }

      const district = item.district || item.bairro || '';
      const city = item.city || item.localidade || '';
      const uf = item.state || item.uf || '';
      const formattedCep = formatCep(item.cep);

      const fullAddress = [
        streetWithNum,
        district,
        `${city} - ${uf}`,
        formattedCep ? `CEP ${formattedCep}` : '',
        'Brasil'
      ].filter(Boolean).join(', ');

      return {
        displayName: { text: mainTitle },
        formattedAddress: fullAddress,
        location: {
          latitude: parseFloat(item.lat) || 0,
          longitude: parseFloat(item.lng || item.longitude) || 0
        },
        types: ['address', 'route'],
        cep: formattedCep || undefined,
        structured: {
          mainText: mainTitle,
          secondaryText: district ? `${district}, ${city} - ${uf}` : `${city} - ${uf}`,
          route: street,
          streetNumber: num || undefined,
          sublocality: district,
          locality: city,
          adminArea: uf,
          postalCode: formattedCep || undefined
        },
        distanceKm: item.distance_km,
        raw: item
      };
    };

    const results: any[] = [];
    const seenCepsAndStreets = new Set<string>();

    const addUnique = (item: any) => {
      if (!item) return;
      const key = `${formatCep(item.cep)}|${(item.address || item.address_name || '').toLowerCase()}`;
      if (!seenCepsAndStreets.has(key)) {
        seenCepsAndStreets.add(key);
        results.push(synthesize(item));
      }
    };

    // =========================================================================
    // ASPECTO 1: Busca Direta por CEP (/json/:cep)
    // =========================================================================
    const rawCep = cepParam || (rawInput && rawInput.replace(/\D/g, '').length === 8 ? rawInput.replace(/\D/g, '') : null);
    if (rawCep && rawCep.length === 8) {
      const tokenParam = apiKey ? `?token=${encodeURIComponent(apiKey)}` : '';
      const cepUrl = `https://cep.awesomeapi.com.br/json/${rawCep}${tokenParam}`;

      try {
        const res = await fetch(cepUrl, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.cep) {
            addUnique(data);
            return NextResponse.json({ results: results.slice(0, 4) });
          }
        }
      } catch (err) {}
    }

    if (!rawInput || rawInput.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // =========================================================================
    // ASPECTOS 2, 3, 4: Busca Combinada, Texto Puro e Filtro de Estado
    // =========================================================================
    const cleanLogradouro = rawInput
      .replace(/^(avenida|av|rua|r|travessa|tv|alameda|al|rodovia|rod|estrada|est|beco|praca|praça)[.\s]+/gi, '')
      .replace(/\b(nº|n°|num|no\.|#)\b/gi, '')
      .replace(/[.\s]+/g, ' ')
      .trim();

    // Monta queries simultâneas para máxima precisão
    const aspectRequests: Promise<any>[] = [];

    // Aspecto 2: Busca Combinada (Texto + Geolocalização + Raio d + Ordenação por distância)
    if (lat && lon) {
      const paramsComb = new URLSearchParams({
        q: rawInput,
        lat,
        lng: lon,
        d: radius,
        sort: 'asc',
        limit: '10',
        format: 'json'
      });
      if (apiKey) paramsComb.set('token', apiKey);
      if (state) paramsComb.set('state', state);

      aspectRequests.push(
        fetch(`https://cep.awesomeapi.com.br/search?${paramsComb.toString()}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      );

      // Se o termo limpo for diferente, busca combinada com termo limpo também
      if (cleanLogradouro.length >= 3 && cleanLogradouro.toLowerCase() !== rawInput.toLowerCase()) {
        const paramsClean = new URLSearchParams({
          q: cleanLogradouro,
          lat,
          lng: lon,
          d: radius,
          sort: 'asc',
          limit: '10',
          format: 'json'
        });
        if (apiKey) paramsClean.set('token', apiKey);
        if (state) paramsClean.set('state', state);

        aspectRequests.push(
          fetch(`https://cep.awesomeapi.com.br/search?${paramsClean.toString()}`, { headers })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        );
      }
    }

    // Aspecto 3: Busca Textual Simples com termo bruto
    const paramsTextRaw = new URLSearchParams({
      q: rawInput,
      limit: '10',
      format: 'json'
    });
    if (apiKey) paramsTextRaw.set('token', apiKey);
    if (state) paramsTextRaw.set('state', state);

    aspectRequests.push(
      fetch(`https://cep.awesomeapi.com.br/search?${paramsTextRaw.toString()}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    // Aspecto 4: Busca com termo de logradouro limpo
    if (cleanLogradouro.length >= 3 && cleanLogradouro.toLowerCase() !== rawInput.toLowerCase()) {
      const paramsTextClean = new URLSearchParams({
        q: cleanLogradouro,
        limit: '10',
        format: 'json'
      });
      if (apiKey) paramsTextClean.set('token', apiKey);
      if (state) paramsTextClean.set('state', state);

      aspectRequests.push(
        fetch(`https://cep.awesomeapi.com.br/search?${paramsTextClean.toString()}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      );
    }

    // Executa todos os aspectos em paralelo
    const responses = await Promise.all(aspectRequests);

    for (const resData of responses) {
      if (resData && Array.isArray(resData.results)) {
        resData.results.forEach(addUnique);
      }
    }

    // Retorna os resultados sintetizados limitados a no máximo 4
    return NextResponse.json({ results: results.slice(0, 4) });
  } catch (error: any) {
    console.error('[AwesomeAPI Search Proxy] Error:', error);
    return NextResponse.json({ error: error.message, results: [] }, { status: 500 });
  }
}
