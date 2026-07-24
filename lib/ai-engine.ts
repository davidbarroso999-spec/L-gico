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
    const res = await fetch('/api/route/gemini-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.adjustments) return data.adjustments;
    }
    return defaultAdjustments;
  } catch (err) {
    console.warn("Falha ao consultar ajustes contextuais do Gemini:", err);
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
        ### MISSÃO: EXPLICAÇÃO EXECUTIVA DA ROTA CALCULADA PELO SOLVER (HARPIA ORION)
        DATA ATUAL PARA REFERÊNCIA DE SAZONALIDADE/CLIMA: ${dataAtual}
        
        DADOS DA ROTA CALCULADA MATEMATICAMENTE PELO SOLVER DE VRP:
        - PRIORIDADE DA ROTA: ${input.priority || 'N/A'}
        - VEÍCULO SELECIONADO: ${input.vehicle || 'N/A'}
        - PARÂMETROS PERSONALIZADOS ATIVOS:
          * Evitar vias não pavimentadas (avoidDirt): ${input.avoidDirt ? 'ATIVADO' : 'DESACTIVADO'}
          * Evitar zonas inundáveis (avoidFloods): ${input.avoidFloods ? 'ATIVADO' : 'DESACTIVADO'}
          * Evitar trechos inclinados/morros (avoidHills): ${input.avoidHills ? 'ATIVADO' : 'DESACTIVADO'}
        - DISTÂNCIAS E TEMPOS TÁTICOS:
          * Distância total calculada: ${(input.summary.distance / 1000).toFixed(2)} km
          * Tempo total estimado: ${Math.round(input.summary.duration / 60)} minutos
          * Score de integridade operacional do trajeto: ${Math.round(input.score)}/100
        ${solverInfo}
        ${contextSummary}
        
        SEQUÊNCIA DE PARADAS CALCULADA PELO SOLVER:
        ${input.sequence.map((stop: any, idx: number) => {
          const amHydro = stop.amazonasHydrology ? ` [Hidrologia AM: ${stop.amazonasHydrology.seasonLabel} - Alerta: ${stop.amazonasHydrology.warning}]` : '';
          const tw = stop.timeWindow ? ` [Janela de Entrega: ${stop.timeWindow.start}h às ${stop.timeWindow.end}h]` : '';
          return `* Parada #${idx + 1}: ${stop.address} (Chegada Estimada: ${stop.estimatedArrival || 'N/A'})${tw} - Temp: ${Math.round(stop.weather?.main?.temp || 0)}°C - Clima: ${stop.weather?.weather?.[0]?.description || 'Normal'} - Perigo/Risco: ${Math.round(stop.riskScore)}%${amHydro}`;
        }).join('\n')}
        
        ${input.customPrompt ? `--- DIRETRIZES PERSONALIZADAS DO OPERADOR ---
        O operador solicitou: "${input.customPrompt}"` : ''}

        ### DIRETRIZES IMPORTANTES PARA A EXPLICAÇÃO (TIPO ORION):
        1. Explique em linguagem simples e executiva POR QUE o solver escolheu essa ordem específica de paradas (por exemplo: "O solver definiu a sequência iniciando por X para cumprir a janela das 09h, contornando o trecho com risco de inundação em Y...").
        2. Destaque o papel do Solver Matemático de VRP e o ganho de eficiência do trajeto.
        3. RESPOSTA EXECUTIVA E CURTA: No máximo 2 frases explicativas. Responda em Português do Brasil.
      `;
    }

    const response = await fetch('/api/ai', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt })
    });

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
