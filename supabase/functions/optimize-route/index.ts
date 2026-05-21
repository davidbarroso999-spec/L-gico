// Supabase Edge Function: optimize-route
// Runtime: Deno (TypeScript)
// Descrição: Inteligência Logix para análise tática, triagem geoespacial de ocorrências e otimização cognitiva de rotas.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Configuração de CORS para permitir acesso de qualquer cliente (ex: App Web Sem Filtro / Logix)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Interface para as Paradas (Stops) da rota
interface Stop {
  id?: string | number;
  lat: number;
  lon: number;
  address?: string;
  description?: string;
}

// Interface para as Ocorrências cadastradas
interface Occurrence {
  id?: string | number;
  type: 'accident' | 'road_closed' | 'construction' | 'congestion' | 'flood' | 'pothole' | 'other';
  lat: number;
  lon: number;
  description: string;
  timestamp?: string;
}

// Payload de entrada esperado pela Edge Function
interface RequestPayload {
  stops: Stop[];
  occurrences: Occurrence[];
  preference: 'fast' | 'short' | 'eco' | 'safe' | 'balanced';
  influenceRadiusKm?: number; // Raio em KM para detectar ocorrências próximas aos pontos. Padrão: 1.5
  customPrompt?: string;
}

// Fórmula de Haversine para calcular a distância entre duas coordenadas geográficas em KM
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Mapeamento de tipos de ocorrências para termos amigáveis em português
const occurrenceTypeNames: Record<string, string> = {
  accident: "Acidente de Trânsito",
  road_closed: "Via Interditada",
  construction: "Obras na Pista",
  congestion: "Congestionamento Crítico",
  flood: "Alagamento / Inundação",
  pothole: "Buraco / Via Danificada",
  other: "Incidente Adicional"
};

serve(async (req) => {
  // Resposta para a requisição de preflight CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Validar Método
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Apenas requisições do tipo POST são permitidas." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parsar o Body da Requisição
    const payload: RequestPayload = await req.json();
    const { stops = [], occurrences = [], preference = "balanced", influenceRadiusKm = 1.5, customPrompt = "" } = payload;

    if (stops.length === 0) {
      return new Response(
        JSON.stringify({ error: "Lista de paradas ('stops') vazia ou inválida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Triagem Geoespacial de Ocorrências Críticas (Cálculo de Haversine em Deno)
    // Filtramos apenas as ocorrências reais que estão próximas o suficiente de alguma parada da rota
    const nearOccurrences: { occurrence: Occurrence; distanceKm: number; nearStopIndex: number }[] = [];

    occurrences.forEach((occ) => {
      let minDistance = Infinity;
      let nearestStopIdx = -1;

      stops.forEach((stop, idx) => {
        const dist = calculateDistanceKm(stop.lat, stop.lon, occ.lat, occ.lon);
        if (dist < minDistance) {
          minDistance = dist;
          nearestStopIdx = idx;
        }
      });

      if (minDistance <= influenceRadiusKm) {
        nearOccurrences.push({
          occurrence: occ,
          distanceKm: parseFloat(minDistance.toFixed(2)),
          nearStopIndex: nearestStopIdx
        });
      }
    });

    // 4. Obter a Chave do Gemini do ambiente do Supabase (configurado via 'supabase secrets set')
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("SUPABASE_GEMINI_API_KEY");

    // Inicializar variáveis de resposta da inteligência
    let aiAnalysisText = "";
    let systemStatus = "INTELLIGENCE_OK";
    let scoreMultiplier = 1.0;

    // Se preferência por segurança, aumentamos o rigor de mitigação
    if (preference === "safe") scoreMultiplier = 1.8;
    else if (preference === "fast") scoreMultiplier = 1.2;

    if (!GEMINI_API_KEY) {
      console.warn("Chave GEMINI_API_KEY não encontrada nas variáveis de ambiente. Usando contingência offline.");
      systemStatus = "OFFLINE_CONTINGENCY_ACTIVE";
      
      // Contingência offline baseada em cálculo matemático preciso das ocorrências coletadas
      aiAnalysisText = `[Logix Backup] Análise gerada pelo Co-Piloto Tático offline.
- Perfil selecionado: ${preference.toUpperCase()}
- Análise de vias: Foram interceptadas ${nearOccurrences.length} ocorrências críticas no raio de influência de ${influenceRadiusKm}km das paradas.
${nearOccurrences.length > 0 
  ? nearOccurrences.map(n => `  * Alerta de ${occurrenceTypeNames[n.occurrence.type] || n.occurrence.type} a ${n.distanceKm}km da parada #${n.nearStopIndex + 1} (${n.occurrence.description}).`).join("\n")
  : "  * Nenhum incidente registrado bloqueando ou impactando diretamente o percurso das coordenadas fornecidas."
}
- Recomendação: Mantenha a velocidade recomendada e preste atenção às indicações do painel em tempo real.`;

    } else {
      // 5. Chamar a API Oficial da Gemini usando requisição nativa REST (leve, segura e compatível com Deno sandbox)
      const model = "gemini-2.5-flash"; // Usando o modelo clássico de alto desempenho do SDK padrão de IA
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      // Montamos o contexto enriquecido para o Gemini analisar
      const prompt = `Você é o Logix, o analista tático de roteamento e segurança operacional mais avançado e direto do mundo.
Analise a seguinte rota e os incidentes mapeados ao longo do percurso para criar uma otimização cognitiva e tática.

--- INFORMAÇÕES DE PREFERÊNCIA DO CONDUTOR ---
Perfil de Direção Escolhido: ${preference.toUpperCase()} (fast = focar em velocidade/tempo, short = trajeto mais curto, eco = economia constante, safe = máxima segurança e evasão de perigos, balanced = equilíbrio perfeito)
${customPrompt ? `Instrução Customizada / Parâmetro Adicional do Usuário: "${customPrompt}"` : ""}

--- DADOS DA ROTA ---
Paradas planejadas (${stops.length} pontos):
${stops.map((stop, i) => `Parada #${i + 1}: Lat ${stop.lat}, Lon ${stop.lon}${stop.address ? ` (${stop.address})` : ""}`).join("\n")}

--- OCORRÊNCIAS/ALERTAS PROXIMAIS DETECTADOS (Raio de ${influenceRadiusKm}km) ---
Total de ocorrências georreferenciadas que interceptam a rota: ${nearOccurrences.length}
${nearOccurrences.length > 0 
  ? nearOccurrences.map((no, idx) => `Alerta #${idx + 1}: Tipo: "${occurrenceTypeNames[no.occurrence.type] || no.occurrence.type}" localizado a apenas ${no.distanceKm}km da Parada #${no.nearStopIndex + 1}. Descrição do incidente: "${no.occurrence.description}"`).join("\n")
  : "NENHUM INCIDENTE CRÍTICO DETECTADO NO ENTORNO DOS PONTOS."
}

--- INSTRUÇÕES DE RESPOSTA ---
1. Analise o impacto direto das ocorrências sobre a preferência selecionada (${preference.toUpperCase()}).
${customPrompt ? `2. DÊ ATENÇÃO ESPECIAL ÀS DIRETIVAS DO USUÁRIO, adaptando o plano de mitigação para satisfazê-las.` : ""}
3. Forneça um boletim tático executivo com até 4 tópicos em português (muito direto, sem enrolação ou formalidades poéticas).
4. Seja crítico, preciso e use termos táticos profissionais como "raio de influência", "desvio cognitivo", "ponto crítico", "mitigação de velocidade".
5. Caso a preferência seja "SAFE" ou "FAST" e existam ocorrências perigosas próximas (como Alagamentos ou Via Interditada), sugira claramente qual parada requer maior atenção operacional.
`;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3, // Menor criatividade, maior foco técnico e assertividade
              maxOutputTokens: 1000,
            }
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erro na API do Gemini (HTTP ${response.status}): ${errText}`);
        }

        const data = await response.json();
        aiAnalysisText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Análise tática concluída sem observações específicas.";

      } catch (geminiError) {
        console.error("Falha ao comunicar com a API do Gemini:", geminiError);
        systemStatus = "GEMINI_FALLBACK_ACTIVE";
        
        // Fallback dinâmico detalhado em caso de erro da chamada HTTP
        aiAnalysisText = `[Logix Inteligência de Contingência] Rota analisada com sucesso.
- Perfil Ativo: ${preference.toUpperCase()}
- Resumo de Risco: Foram identificadas ${nearOccurrences.length} situações de atenção ao longo das paradas.
${nearOccurrences.map(n => `  * [Prevenção Ativa] Alerta de ${occurrenceTypeNames[n.occurrence.type]} a ${n.distanceKm}km da parada #${n.nearStopIndex + 1}. Reduzir aceleração e aumentar distância do veículo à frente.`).join("\n")}
- Recomendação operacional: Rotinas de bordo configuradas para modo de observação tática.`;
      }
    }

    // 6. Calcular Índices de Risco (RiskScore) Dinâmicos por Parada para o Frontend usar nos Pins e Popups
    const enrichedStops = stops.map((stop, idx) => {
      // Começamos com risco base baixo
      let riskScore = 10;
      const associatedAlerts: string[] = [];

      // Procurar todos os alertas próximos a esta parada específica
      nearOccurrences.forEach((no) => {
        if (no.nearStopIndex === idx) {
          // Peso do risco varia de acordo com o tipo de ocorrência
          let severity = 20; // Padrão
          const type = no.occurrence.type;
          
          if (type === "road_closed" || type === "flood") severity = 55; // Altíssimo risco/impedimento
          else if (type === "accident" || type === "congestion") severity = 35; // Médio
          else if (type === "pothole" || type === "construction") severity = 25; // Leve

          // Se a distância for muito menor, o risco aumenta exponencialmente
          const distanceFactor = Math.max(0.2, 1 - (no.distanceKm / influenceRadiusKm));
          riskScore += (severity * distanceFactor) * scoreMultiplier;
          
          associatedAlerts.push(`${occurrenceTypeNames[type] || type}: ${no.occurrence.description} (${no.distanceKm}km)`);
        }
      });

      // Garantir limite inferior e superior de segurança entre 5 e 99
      riskScore = Math.min(99, Math.max(5, Math.round(riskScore)));

      // Classificação nominal do risco de segurança por parada
      let safetyLevel: 'safe' | 'warning' | 'critical' = 'safe';
      if (riskScore > 50) safetyLevel = 'critical';
      else if (riskScore > 25) safetyLevel = 'warning';

      return {
        ...stop,
        riskScore,
        safetyLevel,
        alerts: associatedAlerts
      };
    });

    // 7. Preparar os Metadados Finais de Telemetria Logix
    const responsePayload = {
      status: systemStatus,
      preference,
      totalStops: stops.length,
      nearOccurrencesCount: nearOccurrences.length,
      influenceRadiusKm,
      analysis: aiAnalysisText,
      stops: enrichedStops, // Paradas enriquecidas com riskScore e safetyLevel dinâmicos gerados
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(responsePayload),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Erro interno no processamento do servidor:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor.", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
