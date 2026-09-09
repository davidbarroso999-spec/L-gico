/**
 * Gemini AI Engine Connector
 * Responsible for Step A (Context Adjustments JSON) and Step C (Natural Language Explanation of Solver Result).
 */

import { GeminiContextAdjustments } from './vrp-types';

export async function getGeminiContextAdjustments(input: {
  locations: any[];
  vehicle: string;
  priority: string;
  customPrompt?: string;
  avoidDirt?: boolean;
  avoidFloods?: boolean;
  avoidHills?: boolean;
}): Promise<GeminiContextAdjustments> {
  const defaultAdjustments: GeminiContextAdjustments = {
    edgePenalties: [],
    excludedEdges: [],
    globalMultipliers: {
      timeWeight: input.priority === 'speed' ? 1.3 : 1.0,
      distanceWeight: input.priority === 'distance' ? 1.5 : 1.0,
      riskWeight: input.priority === 'safety' ? 1.8 : 1.0
    },
    qualitativeSummary: "Ajuste ambiental e de trânsito calibrado para a matriz de custo."
  };

  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 7000) : null;

    const res = await fetch('/api/route/gemini-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller?.signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.adjustments) return data.adjustments;
    }
    return defaultAdjustments;
  } catch (err) {
    console.warn("Falha ao consultar ajustes contextuais do Gemini (utilizando matriz calibrada):", err);
    return defaultAdjustments;
  }
}

export async function getGeminiAnalysis(input: any) {
  try {
    let prompt = "";
    
    if (input.task === "STRATEGY_ONLY") {
      prompt = `
        ### MISSÃO: PLANEJAMENTO ESTRATÉGICO HARPIA
        Analise a topologia da rota e forneça a diretriz mestre considerando os parâmetros reais:
        
        LOCAIS: ${input.locations.join(' -> ')}
        PRIORIDADE MÁXIMA: ${input.priority}
        
        DEFINIÇÕES DE PRIORIDADE:
        - Velocidade (Rápido): Economia de tempo acima de tudo, fugindo de engarrafamentos clássicos.
        - Distância Mínima (Curto): Menor trajeto matemático. Ignore variáveis externas.
        - Economia (Eco): Equilíbrio para evitar acelerações/frenagens e aclives acentuados.
        - Segurança (Seguro): Desvio de zonas de risco (alagamento, acidentes, periculosidade).
        - Equilibrado: O melhor custo-benefício combinando tempo, segurança e economia.

        OBSERVAÇÕES EM TEMPO REAL:
        - CLIMA: ${input.weather}
        - TRÂNSITO: ${input.traffic || 'Sem incidentes'}
        - RESTRICÕES: ${JSON.stringify(input.constraints)}
        
        ${input.customPrompt ? `--- DIRETRIZES PERSONALIZADAS DO USUÁRIO ---
        O usuário solicitou as seguintes regras adicionais específicas: 
        "${input.customPrompt}"
        Incorpore ESSAS DIRETRIZES DO USUÁRIO com prioridade absoluta na sua análise estratégica.` : ''}
        
        REGRAS DE RESPOSTA (MÁXIMA RETENÇÃO):
        1. Forneça o insight de orquestração em no máximo 1 ou 2 frases curtas e diretas.
        2. Use terminologia logística de alto nível (vetor de fluxo, otimização cinemática).
        3. Nunca ultrapasse 2 frases sob nenhuma hipótese.
        4. RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL.
      `;
    } else {
      const dataAtual = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      
      const solverInfo = input.solverDetails ? `
        SOLVER MATEMÁTICO VRP APLICADO:
        - Método: ${input.solverDetails.solverMethod}
        - Tempo de execução do solver: ${input.solverDetails.solverExecutionTimeMs} ms
        - Atraso total calculado em janelas de entrega: ${input.solverDetails.totalLatenessMinutes} min
        - Espera acumulada: ${input.solverDetails.totalWaitTimeMinutes} min
      ` : '';

      const contextSummary = input.contextAdjustmentsSummary ? `
        AJUSTES CONTEXTUAIS DA MATRIZ: ${input.contextAdjustmentsSummary}
      ` : '';

      prompt = `
        ### SISTEMA: HARPIA — MOTOR DE DECISÃO DE ROTAS COM IA (FASE 2: EXPLICAÇÃO DA ROTA)
        Você é a IA explicadora do HARPIA. Sua função é traduzir o resultado do cálculo matemático em linguagem natural de motorista/operador, sem jargões computacionais ou citar mecanismos internos.

        PARÂMETROS DA ROTA:
        - DATA ATUAL: ${dataAtual}
        - VEÍCULO / MODAL: ${input.vehicle || 'N/A'}
        - PRIORIDADE SOLICITADA: ${input.priority || 'N/A'}
        - DISTÂNCIA TOTAL: ${(input.summary.distance / 1000).toFixed(2)} km
        - TEMPO ESTIMADO: ${Math.round(input.summary.duration / 60)} minutos
        ${solverInfo}
        ${contextSummary}
        
        SEQUÊNCIA DE PARADAS:
        ${input.sequence.map((stop: any, idx: number) => {
          const amHydro = stop.amazonasHydrology ? ` [Hidrologia AM: Cota ${stop.amazonasHydrology.riverLevelMeters}m - Status: ${stop.amazonasHydrology.navigabilityStatus} - Alerta: ${stop.amazonasHydrology.warning || 'Nenhum'}]` : '';
          const tw = stop.timeWindow ? ` [Janela: ${stop.timeWindow.start}h às ${stop.timeWindow.end}h]` : '';
          return `* Parada #${idx + 1}: ${stop.address} (Est. Chegada: ${stop.estimatedArrival || 'N/A'})${tw} - Clima: ${stop.weather?.weather?.[0]?.description || 'Normal'} (${Math.round(stop.weather?.main?.temp || 0)}°C) - Risco: ${Math.round(stop.riskScore)}%${amHydro}`;
        }).join('\n')}
        
        ${input.customPrompt ? `DIRETRIZES DO OPERADOR: "${input.customPrompt}"` : ''}

        REGRAS DE OURO DA EXPLICAÇÃO (PROTOCOLO DE INTEGRAÇÃO HARPIA):
        1. LINGUAGEM DE MOTORISTA: Explique a razão física e prática da escolha da ordem (ex: "Sequência inicia em X para atender a janela das 09h e contorna a área sujeita a alagamento no Igarapé Y...").
        2. NUNCA CITE MECANISMOS INTERNOS: Proibido mencionar "pesos w1/w4", "vetor de risco", "matriz de custo", "algoritmo" ou "bloco VII". Traduza em fatos reais de trânsito, clima, rio ou carga.
        3. SEM HEDGING DESNECESSÁRIO: Não use aberturas como "Como você pediu velocidade...". Vá direto ao ponto físico da decisão.
        4. DESTAQUE O DIFERENCIAL HARPIA: Se a rota desviou por causa de cota de rio, restrição de carga pesada ou chuva forte, explicite isso com clareza.
        5. CONCISÃO ABSOLUTA: Máximo de 2 frases curtas. Responda em Português do Brasil.
      `;
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 7500) : null;

    const response = await fetch('/api/ai', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
      signal: controller?.signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      return "Sequência otimizada matematicamente pelo solver VRP com base na matriz de distância e janelas de entrega.";
    }

    const data = await response.json();
    return data.content || "Sequência calculada pelo solver de otimização de rotas.";
  } catch (error) {
    console.error("Gemini AI Connector Error:", error);
    return "Rota otimizada pelo solver matemático VRP com base nos dados reais de trânsito e restrições.";
  }
}

export async function fetchLiveBulletin(locations: string[], task?: string, currentRouteSummary?: string) {
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 7500) : null;

    const res = await fetch('/api/ai/live-bulletin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations, task, currentRouteSummary }),
      signal: controller?.signal
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Error fetching live bulletin:", err);
  }
  return {
    success: false,
    bulletin: "Plantão do Trânsito HARPIA: Monitoramento ativo das vias em tempo real.",
    hasIncident: false,
    groundingSources: [],
    timestamp: new Date().toISOString()
  };
}

