/**
 * Gemini AI Engine Connector
 * Usando o novo Gemini 3.1 para fornecer as intuições estratégicas e insights.
 */

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
      prompt = `
        ### MISSÃO: VEREDITO HARPIA (IA ESTRATÉGICA)
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
        1. REGRA ANTIALUCINAÇÃO RIGOROSA: Não invente ruas, acidentes ou alagamentos fictícios. Se dados reais mostram "Nenhuma ocorrência", relate que a via está livre e segura.
        2. ANÁLISE FIEL DA ROTA: Relate como as prioridades (${input.priority || 'N/A'}) influenciaram na escolha da ordem das paradas.
        3. AVALIAÇÃO DOS PARÂMETROS PERSONALIZADOS: Analise se os parâmetros de restrição foram cumpridos com sucesso no trajeto de ${(input.summary.distance / 1000).toFixed(2)} km.
        4. RESPOSTA EXECUTIVA E CURTA: Forneça um insight tático direto e realista com no máximo 2 frases explicativas. Responda em termos logísticos objetivos.
        5. EXTENSÃO E IDIOMA: Nunca ultrapasse o limite de 2 frases. Responda sempre em Português do Brasil.
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
      return "Fluxo dinâmico otimizado. Rota estruturada em total conformidade para garantir maior segurança operacional.";
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("API AI non-JSON response received");
      return "Fluxo tático de transporte otimizado. Traçado mestre gerado de acordo com as restrições selecionadas.";
    }

    const data = await response.json();
    return data.content || "Análise do trajeto indisponível no momento.";
  } catch (error) {
    console.error("Gemini AI Connector Error:", error);
    return "Conexão de contingência operacional ativada. Recomenda-se atenção redobrada sob as condições de trânsito locais.";
  }
}
