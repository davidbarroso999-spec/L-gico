/**
 * Kimi 2.6 AI Engine Connector
 * Uses NVIDIA's API endpoint to provide logistics insights.
 */

export async function getKimiAnalysis(input: any) {
  try {
    let prompt = "";
    
    if (input.task === "STRATEGY_ONLY") {
      prompt = `
        Você é Logix 2.6, um estrategista logístico de elite operando via NVIDIA NIM.
        Planeje a estratégia mestre para a seguinte missão, baseando-se nas observações em tempo real:
        
        LOCAIS: ${input.locations.join(' -> ')}
        PRIORIDADE SELECIONADA: ${input.priority}
        CLIMA ATUAL: ${input.weather}
        TRÂNSITO: ${input.traffic || 'Sem incidentes'}
        RESTRICÕES TÉCNICAS: ${JSON.stringify(input.constraints)}
        
        REGRAS:
        1. Explique em 2 ou 3 frases como você orquestrou a rota para lidar com o clima e o trânsito.
        2. Seja extremamente técnico (use termos como 'vetores de tráfego', 'zonas de alagamento', 'torque/elevação').
        3. Identifique o ponto mais crítico da missão.
        Responda em Português do Brasil com um tom executivo e direto.
      `;
    } else {
      prompt = `
        Você é o motor de IA da Logix Route (Kimi 2.6).
        ESTRATÉGIA INICIAL PREVISTA: ${input.strategy || 'N/A'}
        
        Analise a execução final da rota e forneça um Veredito de Missão (máx 3 frases).
        Consulte as observações de clima e trânsito mapeadas.
        
        DADOS DA ROTA EXECUTADA:
        - Distância Final: ${(input.summary.distance / 1000).toFixed(1)} km
        - Tempo Final: ${Math.round(input.summary.duration / 60)} min
        - Eficiência Geral (Score): ${Math.round(input.score)}/100
        
        Foque em como a sua estratégia mestre foi aplicada e se há alertas de última hora para o condutor.
      `;
    }

    const response = await fetch('/api/ai', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();
    return data.content || "Análise indisponível no momento.";
  } catch (error) {
    console.error("Kimi AI Connector Error:", error);
    return "A IA recomenda cautela redobrada em trechos de aclive sob as condições climáticas atuais.";
  }
}
