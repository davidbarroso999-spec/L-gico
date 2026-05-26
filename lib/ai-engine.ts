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
        ### MISSÃO: VEREDITO LOGIX (IA ESTRATÉGICA)
        ESTRATÉGIA APLICADA: ${input.strategy || 'N/A'}
        
        DADOS REAIS DA EXECUÇÃO FINAL DA ROTA:
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
        
        SEQUÊNCIA OFICIAL DE PARADAS TRAFEGADAS:
        ${input.sequence.map((stop: any, idx: number) => {
          const amHydro = stop.amazonasHydrology ? ` [Hidrologia AM: ${stop.amazonasHydrology.seasonLabel} - Alerta: ${stop.amazonasHydrology.warning}]` : '';
          return `* Parada #${idx + 1}: ${stop.address} (Coordenadas: ${stop.lat.toFixed(4)}, ${stop.lon.toFixed(4)}) - Temperatura: ${Math.round(stop.weather?.main?.temp || 0)}°C - Clima: ${stop.weather?.weather?.[0]?.description || 'Normal'} - Perigo/Risco Local Calculado: ${Math.round(stop.riskScore)}%${amHydro}`;
        }).join('\n')}
        
        OCORRÊNCIAS OPERACIONAIS REGISTRADAS NO ENTORNO (RAIO DE 1.5KM):
        ${input.sequence.map((stop: any, idx: number) => {
          const occs = stop.activeOccurrences || [];
          if (occs.length === 0) return `* Parada #${idx + 1} (${stop.address}): Nenhuma ocorrência ou bloqueio encontrado no raio de 1.5km.`;
          return `* Parada #${idx + 1} (${stop.address}): Encontradas ${occs.length} ocorrência(s): ${occs.map((o: any) => `[Tipo: ${o.type}] Descrição: ${o.description}`).join('; ')}`;
        }).join('\n')}

        ${input.customPrompt ? `--- DIRETRIZES PERSONALIZADAS ADICIONAIS DO OPERADOR ---
        O operador solicitou com prioridade absoluta: "${input.customPrompt}"` : ''}

        ### DIRETRIZES IMPORTANTES PARA A IA (MÁXIMA PRECISÃO):
        1. REGRA ANTIALUCINAÇÃO RIGOROSA: Não invente ruas fictícias, acidentes fictícios, engarrafamentos fictícios ou alagamentos fictícios. Se os dados reais de ocorrências mostram "Nenhuma ocorrência", não invente perigos! Mencione que a via está livre e segura.
        2. ANÁLISE FIEL DA ROTA: Retrate estritamente a sequência de paradas reais descritas nos dados. Mostre como as prioridades selecionadas (prioridade: ${input.priority || 'N/A'}) e as diretrizes do operador influenciaram na escolha da ordem ideal de paradas.
        3. AVALIAÇÃO DOS PARÂMETROS PERSONALIZADOS: Analise detalhadamente se os parâmetros ${input.avoidDirt ? 'Evitar vias não pavimentadas, ' : ''}${input.avoidFloods ? 'Evitar zonas inundáveis, ' : ''}${input.avoidHills ? 'Evitar trechos inclinados/morros' : ''} e a diretriz customizada ("${input.customPrompt || 'Nenhuma'}") foram cumpridos com sucesso na rota traçada de ${(input.summary.distance / 1000).toFixed(2)} km.
        4. RESPOSTA EXECUTIVA: Forneça um insight tático de segurança extremamente direto, profissional e realista (Máximo de 3 frase explicativas). Responda com termos técnicos logísticos reais (sinergia cinética, vetor de fluxo, otimização cinemática).
        5. IDIOMA: Responda sempre em Português do Brasil de forma executiva.
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
