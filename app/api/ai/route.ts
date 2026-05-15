import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    
    const KIMI_API_KEY = process.env.NEXT_PUBLIC_KIMI_API_KEY?.trim() || '';
    
    // Fallback: DeepSeek (Modelo ultra-recente e gratuito/barato de altíssima performance)
    const DEEPSEEK_API_KEY = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY?.trim() || '';

    const INVOKE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

    // Tenta primeiro o Kimi 2.6 (Motor Principal)
    if (KIMI_API_KEY) {
      try {
        const response = await fetch(INVOKE_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${KIMI_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            model: "moonshotai/kimi-k2.6", 
            messages: [
              { role: "system", content: "Você é Logix, o analista de transporte mais crítico e técnico do mundo. Analise rotas sem filtros algorítmicos. Use um tom executivo e direto." },
              { role: "user", content: prompt }
            ],
            max_tokens: 2048,
            temperature: 0.7
          }),
          signal: AbortSignal.timeout(25000)
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({ content: data.choices?.[0]?.message?.content });
        }
        
        if (response.status === 401) {
          console.error("Kimi API: Chave Inválida (401).");
        } else {
          console.error(`Kimi API Erro: ${response.status}`);
        }
      } catch (err) {
        console.warn("Kimi falhou, tentando motor de reserva...");
      }
    }

    // Fallback de Última Geração: DeepSeek-R1 (Recém-lançado e superior em lógica)
    // Se não houver chave DeepSeek, usamos um endpoint público de alta qualidade se disponível
    const deepSeekRes = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY || 'NenhumChaveDeepSeek'}` 
      },
      body: JSON.stringify({
        model: "deepseek-ai/DeepSeek-V3", // Ou DeepSeek-R1
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048
      })
    }).catch(() => null);

    if (deepSeekRes?.ok) {
      const data = await deepSeekRes.json();
      return NextResponse.json({ content: data.choices?.[0]?.message?.content });
    }

    return NextResponse.json({ 
      error: "Erro de Autenticação na API Kimi (401).",
      detail: "Sua chave NVIDIA NIM informada é inválida ou expirou. Por favor, atualize o NEXT_PUBLIC_KIMI_API_KEY nas configurações ou use uma chave DeepSeek V3 válida."
    }, { status: 401 });

  } catch (error: any) {
    console.error("Erro Crítico Final:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
