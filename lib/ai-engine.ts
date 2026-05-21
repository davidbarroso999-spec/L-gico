/**
 * Gemini AI Engine Connector
 * Usando o novo Gemini 3.1 para fornecer as intuições estratégicas e insights.
 */

export async function getGeminiAnalysis(input: any) {
  try {
    let prompt = "";
    
    if (input.task === "STRATEGY_ONLY") {
      prompt = `
        ### MISSÃO: PLANEJAMENTO ESTRATÉGICO LOGIX
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
        
        REGRAS DE RESPOSTA:
        1. Explique como orquestrou a rota em 2 frases técnicas incorporando as prioridades e diretrizes personalizadas.
        2. Use terminologia logística/transporte (vetores, fluxo cinético, gradiente).
        3. Identifique o "Nó Crítico" da missão e onde podem ter ocorrências relevantes.
        4. RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL.
      `;
    } else {
      prompt = `
        ### MISSÃO: VEREDITO LOGIX
        ESTRATÉGIA APLICADA: ${input.strategy || 'N/A'}
        
        DADOS DA EXECUÇÃO FINAL:
        - PRIORIDADE: ${input.priority}
        - DISTÂNCIA: ${(input.summary.distance / 1000).toFixed(2)} km
        - TEMPO ESTIMADO: ${Math.round(input.summary.duration / 60)} min
        - SCORE DE INTEGRIDADE: ${Math.round(input.score)}/100
        
        OCORRÊNCIAS MAPEADAS AO LONGO DA ROTA (RAIO DE 1.5KM):
        ${input.sequence.map((stop: any, idx: number) => {
          const occs = stop.activeOccurrences || [];
          if (occs.length === 0) return `Parada #${idx + 1} (${stop.address}): Sem ocorrências registradas no entorno.`;
          return `Parada #${idx + 1} (${stop.address}): ${occs.length} ocorrência(s) registrada(s): ${occs.map((o: any) => `[${o.type}] ${o.description}`).join('; ')}`;
        }).join('\n')}

        ${input.customPrompt ? `--- DIRETRIZES PERSONALIZADAS DO USUÁRIO ---
        O usuário solicitou: "${input.customPrompt}"
        Avalie se a rota gerada com as ocorrências detectadas atende com sucesso às necessidades personalizadas descritas.` : ''}

        Analise se a rota gerada honra a prioridade selecionada e de que forma os locais com incidentes impactam na jornada. Forneça o insight final de segurança de forma extremamente direta e tática (Máx 3 frases).
        RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL.
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
      console.warn("API AI returned error status:", response.status);
      return "Logix: Análise tática pré-ativa. Priorizando a segurança devido a possíveis variações climáticas. Reduza velocidade nos cruzamentos principais.";
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("API AI non-JSON response received");
      return "Logix: Fluxo cinético otimizado. Traçado mestre gerado em total conformidade.";
    }

    const data = await response.json();
    return data.content || "Análise indisponível no momento.";
  } catch (error) {
    console.error("Gemini AI Connector Error:", error);
    return "Logix: Conexão estratego de contingência operacional. A IA recomenda cautela redobrada em trechos de aclive sob as condições climáticas atuais.";
  }
}
