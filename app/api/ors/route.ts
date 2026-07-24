import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { endpoint, method, body, params } = await req.json();
    const ORS_KEY = process.env.ORS_KEY || process.env.NEXT_PUBLIC_ORS_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImE2MGFmMzA2YmQ5NzQ4MjQ4ODljOGNhMTgzM2Y3YjAwIiwiaCI6Im11cm11cjY0In0=';

    let url = `https://api.openrouteservice.org/${endpoint}`;
    
    // Add params to URL if provided with sanitization
    const searchParams = new URLSearchParams();
    if (params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        if (
          v !== undefined &&
          v !== null &&
          v !== 'undefined' &&
          v !== 'null' &&
          v !== 'NaN' &&
          v !== ''
        ) {
          searchParams.append(k, String(v));
        }
      }
    }
    searchParams.append('api_key', ORS_KEY);
    url += `?${searchParams.toString()}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': ORS_KEY,
    };

    // Sanitize body if it contains coordinates or locations array, or unsupported language code
    let sanitizedBody = body;
    if (body && typeof body === 'object') {
      sanitizedBody = { ...body };
      if (sanitizedBody.language === 'pt-BR' || sanitizedBody.language === 'pt_BR') {
        sanitizedBody.language = 'pt';
      }
      if (Array.isArray(sanitizedBody.coordinates)) {
        sanitizedBody.coordinates = sanitizedBody.coordinates.filter((c: any) =>
          Array.isArray(c) && c.length >= 2 &&
          typeof c[0] === 'number' && !isNaN(c[0]) &&
          typeof c[1] === 'number' && !isNaN(c[1])
        );
      }
      if (Array.isArray(sanitizedBody.locations)) {
        sanitizedBody.locations = sanitizedBody.locations.filter((c: any) =>
          Array.isArray(c) && c.length >= 2 &&
          typeof c[0] === 'number' && !isNaN(c[0]) &&
          typeof c[1] === 'number' && !isNaN(c[1])
        );
      }
    }

    const response = await fetch(url, {
      method: method || 'GET',
      headers,
      body: sanitizedBody && (method || 'GET') !== 'GET' ? JSON.stringify(sanitizedBody) : undefined,
    });

    const contentType = response.headers.get('content-type');
    let data;
    let text = "";

    if (contentType && (contentType.includes('application/json') || contentType.includes('application/geo+json'))) {
      data = await response.json();
    } else {
      text = await response.text();
      console.error("ORS Proxy received non-JSON response:", text.substring(0, 200));
      return NextResponse.json({ error: 'A API externa retornou um formato inesperado.', raw: text.substring(0, 100) }, { status: response.status });
    }

    if (!response.ok) {
      console.error("ORS Proxy Error Detail:", response.status, data || text, "Body sent:", JSON.stringify(sanitizedBody));
      return NextResponse.json(data || { error: text }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("ORS Proxy Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
