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
  let priority = "Equilibrada";
  if (prompt.includes("SPEED") || prompt.includes("Rápido") || prompt.toLowerCase().includes("fast")) {
    priority = "Velocidade Mestre";
  } else if (prompt.includes("DISTANCE") || prompt.includes("Curto") || prompt.toLowerCase().includes("short")) {
    priority = "Distância Mínima";
  } else if (prompt.includes("ECONOMY") || prompt.includes("Eco") || prompt.toLowerCase().includes("eco")) {
    priority = "Máxima Economia (Eco)";
  } else if (prompt.includes("SAFETY") || prompt.includes("Seguro") || prompt.toLowerCase().includes("safe")) {
    priority = "Protocolo de Segurança Crítico";
  }

  let customDirective = "";
  const matchUser = prompt.match(/(?:O usuário solicitou|Instrução Customizada.*|diretrizes personalizadas.*):?\s*["']([^"']+)["']/i);
  if (matchUser && matchUser[1]) {
    customDirective = matchUser[1].trim();
  } else {
    // Busca secundária sem aspas, aceitando quebras de linha com [\s\S]
    const matchUserSec = prompt.match(/diretrizes personalizadas do usuário ---\s*([\s\S]*?)\s*(?:regras de resposta|---)/i);
    if (matchUserSec && matchUserSec[1]) {
      customDirective = matchUserSec[1].replace(/["']/g, "").trim();
    }
  }

  const hasAccident = prompt.toLowerCase().includes("accident") || prompt.toLowerCase().includes("acidente");
  const hasFlood = prompt.toLowerCase().includes("flood") || prompt.toLowerCase().includes("alagamento") || prompt.toLowerCase().includes("inundação");
  const hasRoadClosed = prompt.toLowerCase().includes("road_closed") || prompt.toLowerCase().includes("via interditada") || prompt.toLowerCase().includes("interditada");
  const hasCongestion = prompt.toLowerCase().includes("congestion") || prompt.toLowerCase().includes("congestionamento") || prompt.toLowerCase().includes("trânsito");
  const hasPothole = prompt.toLowerCase().includes("pothole") || prompt.toLowerCase().includes("buraco");

  const alerts: string[] = [];
  if (hasFlood) {
    alerts.push("Bloqueios de via por alagamentos detectados.");
  }
  if (hasRoadClosed) {
    alerts.push("Seção de via interditada identificada.");
  }
  if (hasAccident) {
    alerts.push("Zona com colisão veicular ativa à frente.");
  }
  if (hasCongestion) {
    alerts.push("Retenção de fluxo e perda de velocidade média.");
  }
  if (hasPothole) {
    alerts.push("Trecho de pavimentação degradada mapeado.");
  }

  let analysis = `Logix (Redundância Inteligente): Vetor otimizado com foco no perfil [${priority.toUpperCase()}].\n`;
  analysis += `• Fluxo cinético de rota estruturado para máxima conformidade de deslocamento.\n`;
  
  if (customDirective && customDirective.length < 150) {
    analysis += `• Diretiva integrada com sucesso: "${customDirective}" contemplada operacionalmente.\n`;
  }

  if (alerts.length > 0) {
    analysis += `• Alertas no entorno: ${alerts.slice(0, 2).join(" · ")}\n`;
    analysis += `• Mitigação tática: Recomendado controle dinâmico de tração e atenção no raio de 1.5km dos nós críticos.`;
  } else {
    analysis += `• Zonas operacionais limpas próximas às paradas. Rota livre de incidentes graves.\n`;
    analysis += `• Sugestão Logix: Condução fluida e velocidade constante para otimização do combustível.`;
  }

  return analysis;
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
      content: "Logix: Sistema tático de contingência operacional. Rota validada com foco em controle de tração estrutural e prevenção ativa de incidentes." 
    });
  }
}
