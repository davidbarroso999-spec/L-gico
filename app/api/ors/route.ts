import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { endpoint, method, body, params } = await req.json();
    const ORS_KEY = process.env.ORS_KEY || process.env.NEXT_PUBLIC_ORS_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImE2MGFmMzA2YmQ5NzQ4MjQ4ODljOGNhMTgzM2Y3YjAwIiwiaCI6Im11cm11cjY0In0=';

    let url = `https://api.openrouteservice.org/${endpoint}`;
    
    // Add params to URL if provided
    if (params) {
      const searchParams = new URLSearchParams(params);
      searchParams.append('api_key', ORS_KEY);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // If not using api_key in URL for some endpoints that prefer header
    if (!params) {
      headers['Authorization'] = ORS_KEY;
    }

    const response = await fetch(url, {
      method: method || 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
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
      console.error("ORS Proxy Error Detail:", response.status, data || text);
      return NextResponse.json(data || { error: text }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("ORS Proxy Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
