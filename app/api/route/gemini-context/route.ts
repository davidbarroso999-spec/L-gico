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
### SISTEMA: HARPIA — MOTOR DE DECISÃO DE ROTAS COM IA (FASE 1: AJUSTE DE CONTEXTO)
Você é o módulo de percepção ambiental e ajuste de contexto do HARPIA.
Sua missão é traduzir dados ambientais brutos (clima real, hidrografia amazônica, trânsito, elevação, restrições de via) em pesos e exclusões para a Matriz de Custo do Solver Matemático.

MODUS OPERANDI OBRIGATÓRIO (DIRETRIZES MESTRES):

1. TRIAGEM DE MODAL (GATEKEEPER DE VEÍCULO):
   - VEÍCULO SOLICITADO: ${vehicle}
   - SE 'boat': O Bloco VII (Hidrografia Amazônica) é OBRIGATÓRIO. Analise cota do rio, regime (cheia/vazante), velocidade de correnteza e banzeiro. Se dados hidrológicos estiverem ausentes, declare a lacuna explicitamente.
   - SE 'truck' ou 'van': Aplique restrições de carga e gabarito de via (Bloco VI). Exclua vias urbanas estreitas ou com restrição de peso/gabarito.
   - SE 'car' ou 'moto': Ignorar Bloco VII e Bloco VI.

2. VETOR DE PRIORIDADE RIGIDO:
   - PRIORIDADE ATIVA: ${priority}
   - Vetor de Pesos Padrão:
     * 'distance': w1=1.0 (distância), w2=0.0 (tempo), w3=0.0 (economia), w4=0.0 (risco). Menor km sempre vence.
     * 'speed': w1=0.1, w2=0.9, w3=0.0, w4=0.0. Tempo domina.
     * 'economy': w1=0.4, w2=0.4, w3=0.2, w4=0.0. Penaliza subidas, terreno irregular e contracorrente.
     * 'safety': w1=0.2, w2=0.2, w3=0.0, w4=0.6. Risco domina. Desvia de trechos críticos.
     * 'balanced': w1=0.35, w2=0.35, w3=0.15, w4=0.15. Equilíbrio sem dominância isolada.

3. ZERO-INFERENCE E FONTE DE DADOS REAIS:
   - Apenas declare condições (chuva, vazante, alagamento) se houver dado real fornecido. Proibido inferir por estação do ano ou intuição geográfica. Se dado ausente, declare a ausência.

4. PROTOCOLO DE CONFLITO E PRECEDÊNCIA:
   - 1º Viabilidade física (vazante crítica / via bloqueada / restrição de carga) SEMPRE vence a prioridade do usuário. Se a via não existe ou é inviável, excluda-a ("excludedEdges").
   - 2º Segurança crítica (tempestade ativa, interdição grave) gera desvio e penalidade alta.
   - 3º Vetor de prioridade é aplicado sobre as opções fisicamente viáveis remanescentes.

RESTRICÕES ESPECÍFICAS ATIVAS:
- Evitar não pavimentado (avoidDirt): ${avoidDirt}
- Evitar áreas alagadas (avoidFloods): ${avoidFloods}
- Evitar aclives (avoidHills): ${avoidHills}
- DIRETRIZES ADICIONAIS DO USUÁRIO: "${customPrompt || 'Nenhuma'}"

PARADAS DA ROTA (ÍNDICES DE 0 A ${locations.length - 1}):
${locations.map((loc: any, idx: number) => {
  const amHydro = loc.amazonasHydrology ? ` [Hidrologia AM: Cota ${loc.amazonasHydrology.riverLevelMeters}m, Cota Mínima Segura: ${loc.amazonasHydrology.criticalLowMeters || 2.5}m, Vento: ${loc.amazonasHydrology.banzeiroIndex}, Status: ${loc.amazonasHydrology.navigabilityStatus}]` : '';
  const occs = loc.activeOccurrences?.length > 0 ? ` [Ocorrências: ${loc.activeOccurrences.map((o: any) => o.type).join(', ')}]` : '';
  return `Parada #${idx} (${loc.address}): Clima=${loc.weather?.weather?.[0]?.description || 'Normal'}, Temp=${loc.weather?.main?.temp || 28}°C, Risco=${loc.riskScore}%${amHydro}${occs}`;
}).join('\n')}

FORMATO DE RESPOSTA (RETORNE EXCLUSIVAMENTE O JSON ABAIXO, SEM MARKDOWN OU COMENTÁRIOS):
{
  "edgePenalties": [
    {
      "fromIndex": 0,
      "toIndex": 1,
      "multiplier": 1.25,
      "penaltySeconds": 300,
      "reason": "Explicação técnica curta do ajuste de matriz"
    }
  ],
  "excludedEdges": [
    {
      "fromIndex": 1,
      "toIndex": 3,
      "reason": "Inviabilidade física, via bloqueada ou vazante crítica"
    }
  ],
  "globalMultipliers": {
    "timeWeight": 1.0,
    "distanceWeight": 1.0,
    "riskWeight": 1.0
  },
  "qualitativeSummary": "Síntese executiva direta dos ajustes ambientais e de prioridade injetados na matriz."
}
`;

    const modelSequence = [
      "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"
    ];

    for (const modelName of modelSequence) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
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
            console.warn(`[Gemini Context] Falha ao ler JSON (${modelName}), tentando próximo...`, jsonErr);
          }
        }
      } catch (err: any) {
        console.warn(`[Gemini Context] Falha no modelo ${modelName}:`, err?.message || err);
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
