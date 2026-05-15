import { NextResponse } from 'next/server';

export async function GET() {
  const report: any = {
    kimi: { status: 'unknown', detail: '' },
    gemini: { status: 'unknown', detail: '' },
    ors: { status: 'unknown', detail: '' },
    weather: { status: 'unknown', detail: '' },
    osrm: { status: 'unknown', detail: '' },
  };

  // 1. Test Kimi (NVIDIA)
  try {
    const KIMI_KEY = (process.env.NEXT_PUBLIC_KIMI_API_KEY && process.env.NEXT_PUBLIC_KIMI_API_KEY.trim() !== "") 
      ? process.env.NEXT_PUBLIC_KIMI_API_KEY 
      : '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';
      
    const kimiRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KIMI_KEY.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "moonshotai/kimi-k2.6",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5
      }),
      signal: AbortSignal.timeout(5000)
    });
    const kimiData = await kimiRes.json();
    if (kimiRes.ok) {
      report.kimi.status = 'SUCCESS';
    } else {
      report.kimi.status = 'FAILED';
      report.kimi.detail = kimiData.detail || kimiData.error?.message || JSON.stringify(kimiData);
    }
  } catch (e: any) {
    report.kimi.status = 'ERROR';
    report.kimi.detail = e.message;
  }

  // 1b. Test Gemini (The 100% Free Fallback)
  try {
    const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      report.gemini.status = 'MISSING_KEY';
    } else {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
      });
      if (geminiRes.ok) {
        report.gemini.status = 'SUCCESS';
      } else {
        report.gemini.status = 'FAILED';
        report.gemini.detail = await geminiRes.text();
      }
    }
  } catch (e: any) {
    report.gemini.status = 'ERROR';
    report.gemini.detail = e.message;
  }

  // 2. Test ORS
  try {
    const ORS_KEY = process.env.NEXT_PUBLIC_ORS_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImE2MGFmMzA2YmQ5NzQ4MjQ4ODljOGNhMTgzM2Y3YjAwIiwiaCI6Im11cm11cjY0In0=';
    const orsRes = await fetch(`https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_KEY}&text=Manaus`, {
      method: "GET"
    });
    const orsData = await orsRes.json();
    if (orsRes.ok) {
      report.ors.status = 'SUCCESS';
    } else {
      report.ors.status = 'FAILED';
      report.ors.detail = orsData.error?.message || orsData.error || JSON.stringify(orsData);
    }
  } catch (e: any) {
    report.ors.status = 'ERROR';
    report.ors.detail = e.message;
  }

  // 3. Test Weather (OpenWeather + Open-Meteo Fallback check)
  try {
    const WEATHER_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    if (!WEATHER_KEY) {
      report.weather.status = 'USING_OPEN_METEO_FALLBACK (100% FREE)';
      const metRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=-3.119&longitude=-60.021&current_weather=true`);
      if (metRes.ok) {
        report.weather.detail = 'Open-Meteo working correctly';
      } else {
        report.weather.status = 'CRITICAL_WEATHER_FAIL';
      }
    } else {
      const weatherRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=-3.119&lon=-60.021&appid=${WEATHER_KEY}`);
      if (weatherRes.ok) {
        report.weather.status = 'SUCCESS (OpenWeather)';
      } else {
        report.weather.status = 'FAILED (OpenWeather), using Open-Meteo';
      }
    }
  } catch (e: any) {
    report.weather.status = 'ERROR';
    report.weather.detail = e.message;
  }

  return NextResponse.json(report);
}
