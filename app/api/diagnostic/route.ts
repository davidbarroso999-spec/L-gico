import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function GET() {
  const report: any = {
    anyapi: { status: 'disabled', detail: 'Chave ANYAPI_API_KEY não configurada.' },
    gemini: { status: 'unknown', detail: '' },
    openai: { status: 'disabled', detail: 'Chave OPENAI_API_KEY não configurada.' },
    ors: { status: 'unknown', detail: '' },
    weather: { status: 'unknown', detail: '' },
    osrm: { status: 'unknown', detail: '' },
    mapbox: { status: 'unknown', detail: '' }
  };

  // 0. Test AnyAPI
  try {
    const ANYAPI_KEY = process.env.ANYAPI_API_KEY;
    if (ANYAPI_KEY) {
      const baseUrl = process.env.ANYAPI_BASE_URL || "https://api.anyapi.ai/v1";
      const anyapiUrl = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
      
      const res = await fetch(anyapiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ANYAPI_KEY}`
        },
        body: JSON.stringify({
          model: "anthropic/claude-sonnet-4.5",
          messages: [{ role: "user", content: "Olá" }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        report.anyapi.status = 'SUCCESS';
        report.anyapi.detail = 'AnyAPI (Claude Sonnet 3.5 proxy via OpenAI format) está ativo e operacional!';
      } else {
        const errText = await res.text();
        if (errText.includes("anthropic") || ANYAPI_KEY.startsWith("sk-ant")) {
           report.anyapi.status = 'FALLBACK_NEEDED';
           report.anyapi.detail = 'AnyAPI usando o formato Anthropic direto.';
        } else {
           report.anyapi.status = 'FAILED';
           report.anyapi.detail = `Erro AnyAPI (HTTP ${res.status}): ${errText.substring(0, 100)}`;
        }
      }
    }
  } catch (e: any) {
    report.anyapi.status = 'ERROR';
    report.anyapi.detail = e.message || String(e);
  }

  // 1. Test Gemini (The 100% Free AI Engine)
  try {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      report.gemini.status = 'MISSING_KEY';
      report.gemini.detail = 'GEMINI_API_KEY não foi encontrada.';
    } else {
      const ai = new GoogleGenAI({
        apiKey: GEMINI_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      let result;
      const modelSequence = ["gemini-2.5-flash"];
      let lastReportErr = "";

      for (const mName of modelSequence) {
        try {
          result = await ai.models.generateContent({
            model: mName,
            contents: [{ parts: [{ text: "Olá, teste rápido." }] }],
          });
          if (result && result.text) {
            report.gemini.status = 'SUCCESS';
            report.gemini.detail = `Funcionando via ${mName}`;
            break;
          }
        } catch (err: any) {
          lastReportErr = err.message || String(err);
        }
      }
      
      if (report.gemini.status !== 'SUCCESS') {
        report.gemini.status = 'FAILED';
        report.gemini.detail = `Todos os modelos falharam. Último erro: ${lastReportErr.substring(0, 150)}`;
      }
    }
  } catch (e: any) {
    report.gemini.status = 'ERROR';
    report.gemini.detail = e.message;
  }

  // 1b. Test OpenAI
  try {
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    const isMockKey = OPENAI_KEY && (OPENAI_KEY.includes("abcde") || OPENAI_KEY.startsWith("sk-abcde") || OPENAI_KEY.length < 20);
    if (OPENAI_KEY && !isMockKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Olá" }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        report.openai.status = 'SUCCESS';
        report.openai.detail = 'OpenAI gpt-4o-mini ativa e operacional!';
      } else {
        const errText = await res.text();
        report.openai.status = 'FAILED';
        report.openai.detail = `Erro OpenAI (HTTP ${res.status}): ${errText.substring(0, 100)}`;
      }
    }
  } catch (e: any) {
    report.openai.status = 'ERROR';
    report.openai.detail = e.message || String(e);
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

  // 4. Test Mapbox
  try {
    const MAPBOX_KEY = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!MAPBOX_KEY) {
      report.mapbox.status = 'MISSING_KEY';
      report.mapbox.detail = 'NEXT_PUBLIC_MAPBOX_TOKEN não encontrada.';
    } else {
      const mapboxRes = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/manaus.json?access_token=${MAPBOX_KEY}&limit=1`);
      const mapboxData = await mapboxRes.json();
      if (mapboxRes.ok) {
        report.mapbox.status = 'SUCCESS';
      } else {
        report.mapbox.status = 'FAILED';
        report.mapbox.detail = mapboxData.message || JSON.stringify(mapboxData);
      }
    }
  } catch (e: any) {
    report.mapbox.status = 'ERROR';
    report.mapbox.detail = e.message;
  }

  // 5. Test Google Maps Platform
  try {
    const GOOGLE_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_KEY) {
      report.googleMaps = { status: 'MISSING_KEY', detail: 'Chave GOOGLE_MAPS_PLATFORM_KEY não encontrada.' };
    } else {
      const googleRes = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': 'places.displayName'
        },
        body: JSON.stringify({ textQuery: 'manaus', languageCode: 'pt-BR' })
      });
      if (googleRes.ok) {
        const googleData = await googleRes.json();
        if (googleData.places) {
          report.googleMaps = { status: 'SUCCESS', detail: 'Google Maps Autocomplete & Geocoding ativo (Places API New) e operacional!' };
        } else {
          report.googleMaps = { status: 'FAILED', detail: 'Google Places API retornou OK mas sem lugares.' };
        }
      } else {
        const text = await googleRes.text();
        report.googleMaps = { status: 'FAILED', detail: `Google API Error: ${text.substring(0, 100)}` };
      }
    }
  } catch (e: any) {
    report.googleMaps = { status: 'ERROR', detail: e.message };
  }

  return NextResponse.json(report);
}
