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
    
    const anyApiKey = process.env.ANYAPI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    let skipClaudeAndOpenAI = false;
    if (anyApiKey && geminiApiKey) {
      if (Math.random() < 0.5) {
        console.log("[AI Load Balancer] Sorteio 50/50: Escalonando para GEMINI para poupar tokens.");
        skipClaudeAndOpenAI = true;
      } else {
        console.log("[AI Load Balancer] Sorteio 50/50: Escalonando para CLAUDE (AnyAPI).");
      }
    }
    
    // 0. Tenta AnyAPI (Anthropic Claude Sonnet 4.5 proxy via formato OpenAI)
    if (anyApiKey && !skipClaudeAndOpenAI && !isModelExhausted("anyapi")) {
      console.log("[AI Engine] Chave AnyAPI encontrada. Tentando utilizar Claude Sonnet via AnyAPI.");
      try {
        const baseUrl = process.env.ANYAPI_BASE_URL || "https://api.anyapi.ai/v1";
        const anyapiUrl = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
        
        const response = await fetch(anyapiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anyApiKey}`
          },
          body: JSON.stringify({
            model: "anthropic/claude-sonnet-4.5", // Refletindo o modelo exato do dashboard do AnyAPI
            messages: [
              {
                role: "system",
                content: `Você é o motor de inteligência e explicação de rotas do HARPIA. Responda em linguagem natural, objetiva e executiva em Português do Brasil, explicando os fatos do trajeto sem nunca citar mecanismos computacionais internos.`
              },
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 150,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.choices?.[0]?.message?.content) {
            console.log("[AI Engine] Resposta bem-sucedida do AnyAPI (Claude).");
            return NextResponse.json({ content: data.choices[0].message.content });
          }
        } else {
          const text = await response.text();
          if (response.status === 402 || text.includes("budget_exceeded") || text.includes("team_budget_exceeded")) {
            console.warn("[AI Engine] Cota de saldo do AnyAPI esgotada (Status 402). Alternando permanentemente para Gemini.");
            markModelExhausted("anyapi");
          } else {
            console.warn(`[AI Engine] Falha na chamada AnyAPI Status ${response.status}. Alternando para Gemini.`);
          }
        }
      } catch (err) {
        console.warn("[AI Engine] Erro ao conectar com a AnyAPI, tentando próximos...", err);
      }
    }

    // 1. Tenta OpenAI caso a chave esteja configurada
    const isMockKey = openaiApiKey && (openaiApiKey.includes("abcde") || openaiApiKey.startsWith("sk-abcde") || openaiApiKey.length < 20);
    if (openaiApiKey && !isMockKey && !skipClaudeAndOpenAI) {
      console.log("[AI Engine] Chave OpenAI encontrada. Utilizando OpenAI GPT-4o-mini.");
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Você é o motor de inteligência e explicação de rotas do HARPIA. Responda em linguagem natural, objetiva e executiva em Português do Brasil, explicando os fatos do trajeto sem nunca citar mecanismos computacionais internos.`
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.choices?.[0]?.message?.content) {
            console.log("[AI Engine] Resposta bem-sucedida do OpenAI.");
            return NextResponse.json({ content: data.choices[0].message.content });
          }
        } else {
          const text = await response.text();
          console.error(`[AI Engine] Falha na chamada da OpenAI (Status ${response.status}): ${text}`);
        }
      } catch (err) {
        console.error("[AI Engine] Erro ao conectar com a OpenAI, tentando Gemini como fallback:", err);
      }
    }

    // 2. Fallback para Google Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("Nenhuma chave de IA (Gemini ou OpenAI) configurada no ambiente. Utilizando simulador tático HARPIA.");
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
      systemInstruction: `Você é o motor de inteligência e explicação de rotas do HARPIA. Responda em linguagem natural, objetiva e executiva em Português do Brasil, explicando os fatos do trajeto sem nunca citar mecanismos computacionais internos (pesos, matrizes ou algoritmos).`,
      temperature: 0.7,
      maxOutputTokens: 150,
    };

    let result;
    const modelSequence = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite"
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

    // Se todos falharam, retorna a resposta do assistente HARPIA local simulada para manter a UX sem travar a navegação
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
