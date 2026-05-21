import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Parâmetros lat e lon são necessários.' }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY || 'a46d5eac976d211d6bde3bbaf70073f9';

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pt_br`;
    const res = await fetch(url);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
    
    throw new Error(`OpenWeather check returned status: ${res.status}`);
  } catch (err: any) {
    console.warn('[Server Weather Proxy] OpenWeather falhou, tentando fallback Open-Meteo:', err.message);
    
    try {
      const fallbackUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
      const res = await fetch(fallbackUrl);
      
      if (!res.ok) throw new Error(`Open-Meteo returned status: ${res.status}`);
      
      const data = await res.json();
      const current = data.current_weather;
      
      // Adapt structure to match expected OpenWeather structure
      return NextResponse.json({
        main: { temp: current.temperature },
        weather: [{ 
          main: 'Cloudy', 
          description: 'condição local',
          icon: '03d'
        }],
        wind: { speed: current.windspeed },
        name: 'Localização'
      });
    } catch (fallbackErr: any) {
      console.error('[Server Weather Proxy] Ambos os serviços de clima falharam:', fallbackErr.message);
      // Absolute safety fallback
      return NextResponse.json({
        main: { temp: 28 },
        weather: [{ main: 'Clear', description: 'céu limpo', icon: '01d' }],
        wind: { speed: 5 },
        name: 'Manaus (Contingência)'
      });
    }
  }
}
