import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

// Memória temporária de modelos com cota esgotada (evita requisições lentas adicionais)
const modelExhaustedCache: Record<string, number> = {};

function isModelExhausted(model: string): boolean {
  const expiry = modelExhaustedCache[model];
  if (expiry && expiry > Date.now()) {
    return true;
  }
  return false;
}

function markModelExhausted(model: string) {
  modelExhaustedCache[model] = Date.now() + 5 * 60 * 1000; // Bloqueia por 5 minutos
}

function cleanErrorMessage(err: any): string {
  if (!err) return "Erro desconhecido";
  const msg = err.message || String(err);
  try {
    if (msg.trim().startsWith('{') || msg.includes('{"error"')) {
      const startIdx = msg.indexOf('{');
      if (startIdx !== -1) {
        const potentialJson = msg.substring(startIdx);
        const parsed = JSON.parse(potentialJson);
        if (parsed.error?.message) {
          return `${parsed.error.message} (HTTP ${parsed.error.code || 429})`;
        }
      }
    }
  } catch (ex) {
    // Ignore e retorne o corte padrão
  }
  if (msg.length > 180) {
    return msg.substring(0, 180) + "...";
  }
  return msg;
}

function generateTacticalFallback(prompt: string): string {
  const isEco = prompt.toLowerCase().includes("eco") || prompt.toLowerCase().includes("economia");
  const isSafe = prompt.toLowerCase().includes("seguran") || prompt.toLowerCase().includes("seguro") || prompt.toLowerCase().includes("risk") || prompt.toLowerCase().includes("perigo");
  const isShort = prompt.toLowerCase().includes("curto") || prompt.toLowerCase().includes("dist") || prompt.toLowerCase().includes("short");
  
  if (isSafe) {
    return "Rota planejada com foco absoluto em segurança operacional e desvios de áreas de risco histórico. Recomenda-se atenção redobrada aos limites de velocidade do trecho.";
  }
  if (isEco) {
    return "Trajeto otimizado para economia de combustível, priorizando a manutenção de velocidade constante. Evite acelerações bruscas para maximizar a performance operacional.";
  }
  if (isShort) {
    return "Desenho de rota focado na menor distância física de deslocamento ponto a ponto. Verifique o asfalto nas vias secundárias para manter a eficiência tática.";
  }
  return "Análise de rota realizada em conformidade com as diretrizes táticas estabelecidas. O trajeto selecionado oferece o melhor equilíbrio de tempo e fluidez de trânsito.";
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    // O ambiente do AI Studio já injeta a GEMINI_API_KEY gratuitamente para você
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY não configurada no ambiente. Utilizando simulador tático Logix.");
      return NextResponse.json({ 
        content: generateTacticalFallback(prompt)
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    
    const config = {
      systemInstruction: `Você é Logix, o analista de transporte mais crítico do mundo.
Sua missão é otimizar rotas baseando-se RIGOROSAMENTE nestes pilares:

1. Velocidade (Rápido): Foque em economia de tempo, evite engarrafamentos, prefira fluidez mesmo com maior KM.
2. Distância Mínima (Curto): Menor trajeto matemático ponto a ponto. Ignore trânsito ou qualidade da via.
3. Economia (Eco): Evite frenagens bruscas e vias de alta aceleração. Mantenha velocidade constante para poupar combustível.
4. Segurança (Seguro): Fuja de alagamentos, cruzamentos perigosos e vias de alto risco criminal/acidente. Priorize a integridade do condutor.
5. Equilibrado: Otimização multivariável. Equilibre tempo, segurança e economia pelo melhor custo-benefício.

Ao analisar, considere endereços, paradas e destino. Seja direto, técnico e executivo.
IMPORTANTE: RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL.`,
      temperature: 0.7,
    };

    let result;
    const modelSequence = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash"
    ];
    let finalError = "";

    for (const modelName of modelSequence) {
      if (isModelExhausted(modelName)) {
        console.log(`[Gemini Bypass] Modelo "${modelName}" ignorado preventivamente devido a quota 429 ativa.`);
        continue;
      }

      try {
        result = await ai.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: prompt }] }],
          config
        });
        
        if (result && result.text) {
          return NextResponse.json({ content: result.text });
        }
      } catch (err: any) {
        const readableErr = cleanErrorMessage(err);
        console.warn(`[Gemini API] Falha no modelo "${modelName}": ${readableErr}`);
        
        // Se for erro de quota / rate-limit, marcamos no cache para evitar lentidão futura
        if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED") || err.message?.includes("quota")) {
          markModelExhausted(modelName);
          console.log(`[Gemini Monitor] Modelo "${modelName}" marcado temporariamente como esgotado (429).`);
        }
        
        finalError = readableErr;
      }
    }

    // Se todos falharam, retorna a resposta do assistente Logix local simulada para manter a UX sem travar a navegação
    console.error("Todos os modelos Gemini qualificados falharam ou estão esgotados no servidor:", finalError);
    return NextResponse.json({ 
      content: generateTacticalFallback(prompt)
    });

  } catch (error: any) {
    console.error("Erro geral no handler de IA:", error);
    return NextResponse.json({ 
      content: "Sistema de contingência operacional ativado. Rota calculada em conformidade com as diretrizes de trânsito locais." 
    });
  }
}
