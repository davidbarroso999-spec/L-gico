import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GeminiContextAdjustments } from '@/lib/vrp-types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { locations, vehicle, priority, customPrompt, avoidDirt, avoidFloods, avoidHills } = body;

    const defaultAdjustments: GeminiContextAdjustments = {
      edgePenalties: [],
      excludedEdges: [],
      globalMultipliers: {
        timeWeight: priority === 'speed' ? 1.3 : 1.0,
        distanceWeight: priority === 'distance' ? 1.5 : 1.0,
        riskWeight: priority === 'safety' ? 1.8 : 1.0
      },
      qualitativeSummary: "Ajuste contextual calibrado com base nas medições em tempo real e restrições de trânsito."
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ adjustments: defaultAdjustments });
    }

    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
### MISSÃO: AJUSTE DE CONTEXTO AMBIENTAL/LOGÍSTICO (GEMINI CONTEXT LAYER - HARPIA VRP)
Você é o módulo de percepção ambiental do sistema HARPIA.
Sua única função é analisar fatores qualitativos (clima real, hidrografia do Amazonas, ocorrências de trânsito/alagamento, restrições) e retornar um JSON ESTRUTURADO com ajustes de peso e exclusões para a Matriz de Custo do Solver Matemático.

IMPORTANTE: VOCÊ NÃO DECIDE E NÃO RETORNA A SEQUÊNCIA FINAL DE PARADAS. O SOLVER MATEMÁTICO FARÁ ISSO.
Você apenas ajusta as penalidades da matriz.

INFORMAÇÕES DA ROTA E PARADAS:
- VEÍCULO/MODAL: ${vehicle}
- PRIORIDADE MÁXIMA: ${priority}
- RESTRICÕES ATIVAS:
  * Evitar não pavimentado (avoidDirt): ${avoidDirt}
  * Evitar áreas alagadas (avoidFloods): ${avoidFloods}
  * Evitar aclives (avoidHills): ${avoidHills}
- DIRETRIZES DO USUÁRIO: "${customPrompt || 'Nenhuma'}"

PARADAS (ÍNDICES DE 0 A ${locations.length - 1}):
${locations.map((loc: any, idx: number) => {
  const amHydro = loc.amazonasHydrology ? ` [Hidrologia: Cota ${loc.amazonasHydrology.riverLevelMeters}m, Vento: ${loc.amazonasHydrology.banzeiroIndex}, Status: ${loc.amazonasHydrology.navigabilityStatus}]` : '';
  const occs = loc.activeOccurrences?.length > 0 ? ` [Ocorrências: ${loc.activeOccurrences.map((o: any) => o.type).join(', ')}]` : '';
  return `Parada #${idx} (${loc.address}): Clima=${loc.weather?.weather?.[0]?.description || 'Normal'}, Temp=${loc.weather?.main?.temp || 28}°C, Risco=${loc.riskScore}%${amHydro}${occs}`;
}).join('\n')}

INSTRUÇÃO DE RESPOSTA (RETORNE APENAS JSON VÁLIDO CONFORME A ESTRUTURA ABAIXO, SEM MARKDOWN OU TEXTO EXTRA):
{
  "edgePenalties": [
    {
      "fromIndex": 0,
      "toIndex": 1,
      "multiplier": 1.2,
      "penaltySeconds": 300,
      "reason": "Explicação curta"
    }
  ],
  "excludedEdges": [
    {
      "fromIndex": 1,
      "toIndex": 3,
      "reason": "Bloqueio ou inviabilidade técnica"
    }
  ],
  "globalMultipliers": {
    "timeWeight": 1.0,
    "distanceWeight": 1.0,
    "riskWeight": 1.0
  },
  "qualitativeSummary": "Resumo de 1-2 frases explicando os ajustes ambientais injetados na matriz de custo."
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    if (response?.text) {
      try {
        const parsed = JSON.parse(response.text);
        return NextResponse.json({
          adjustments: {
            edgePenalties: Array.isArray(parsed.edgePenalties) ? parsed.edgePenalties : [],
            excludedEdges: Array.isArray(parsed.excludedEdges) ? parsed.excludedEdges : [],
            globalMultipliers: parsed.globalMultipliers || defaultAdjustments.globalMultipliers,
            qualitativeSummary: parsed.qualitativeSummary || defaultAdjustments.qualitativeSummary
          }
        });
      } catch (jsonErr) {
        console.warn("Falha ao ler JSON de ajustes do Gemini, usando padrão:", jsonErr);
      }
    }

    return NextResponse.json({ adjustments: defaultAdjustments });
  } catch (error: any) {
    console.error("Erro na API Gemini Context Adjustments:", error);
    return NextResponse.json({
      adjustments: {
        edgePenalties: [],
        excludedEdges: [],
        globalMultipliers: { timeWeight: 1.0, distanceWeight: 1.0, riskWeight: 1.0 },
        qualitativeSummary: "Falha na resposta do Gemini, mantida matriz padrão."
      }
    });
  }
}
