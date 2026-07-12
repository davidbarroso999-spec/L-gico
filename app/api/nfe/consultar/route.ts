import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { isValidNFeKey, OFFICIAL_DEMO_NFES } from '@/lib/nfe-validator';
import fs from 'fs';
import path from 'path';
import { parseNfeXml } from '@/lib/danfe-xml-parser';

// Shared server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { chaveAcesso, textDescription, fileBase64, fileType } = body;

    // SCENARIO 1: Extract NFe from PDF or Image (Base64) using Gemini Multi-Modal
    if (fileBase64 && fileType) {
      try {
        console.log(`Iniciando análise multimodal de arquivo com Gemini. Tipo: ${fileType}`);
        
        // Strip data URL scheme prefix if present
        const cleanBase64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;

        const prompt = `Você é uma inteligência de extração fiscal integrada no ecossistema HARPIA Logix da Amazônia.
Sua tarefa é analisar este arquivo oficial (que é um DANFE/Nota Fiscal Eletrônica) e extrair os dados estruturados reais contidos nele.

ATENÇÃO EXTREMA:
1. Extraia apenas dados REAIS e OFICIAIS presentes no documento. Não invente, não simule e não altere nenhum dado fiscal ou geográfico.
2. Extraia a Chave de Acesso de 44 dígitos numéricos exatamente como aparece (normalmente em grupos de 4 dígitos abaixo do código de barras).
3. O destinatário DEVE conter um endereço real e preciso, pois ele será plotado em um mapa de roteirização logística em Manaus (AM). Certifique-se de extrair o endereço completo (Rua, Número, Bairro, Cidade, Estado e CEP se houver).
4. Extraia o Valor Total da Nota Fiscal (número float) e o Peso Bruto Total em kg (número float).
5. Extraia um resumo curto dos principais itens em uma frase (Ex: "Monitores Gamer, Teclados e fones de ouvido").`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [
            {
              inlineData: {
                mimeType: fileType,
                data: cleanBase64
              }
            },
            prompt
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                chaveAcesso: { type: Type.STRING },
                statusNfe: { type: Type.STRING },
                dataEmissao: { type: Type.STRING },
                emitente: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    cnpj: { type: Type.STRING }
                  },
                  required: ['nome', 'cnpj']
                },
                destinatario: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    endereco: { type: Type.STRING },
                    cidade: { type: Type.STRING },
                    estado: { type: Type.STRING },
                    cep: { type: Type.STRING }
                  },
                  required: ['nome', 'endereco', 'cidade', 'estado']
                },
                valor: { type: Type.NUMBER },
                peso: { type: Type.NUMBER },
                descricao: { type: Type.STRING }
              },
              required: ['chaveAcesso', 'destinatario', 'valor', 'peso']
            }
          }
        });

        const extractedText = response.text;
        if (!extractedText) {
          throw new Error("O modelo Gemini retornou uma resposta vazia para o arquivo.");
        }

        const parsedData = JSON.parse(extractedText);
        
        // Clean and structure output
        const dados = {
          chaveAcesso: (parsedData.chaveAcesso || '').replace(/\D/g, ''),
          statusNfe: parsedData.statusNfe || 'Autorizada',
          dataEmissao: parsedData.dataEmissao || new Date().toISOString(),
          emitente: {
            nome: parsedData.emitente?.nome || 'Emitente Extraído',
            cnpj: parsedData.emitente?.cnpj || ''
          },
          destinatario: {
            nome: parsedData.destinatario?.nome || 'Destinatário Extraído',
            endereco: parsedData.destinatario?.endereco || '',
            cidade: parsedData.destinatario?.cidade || 'Manaus',
            estado: parsedData.destinatario?.estado || 'AM',
            cep: parsedData.destinatario?.cep || ''
          },
          valor: typeof parsedData.valor === 'number' ? parsedData.valor : parseFloat(parsedData.valor || '0'),
          peso: typeof parsedData.peso === 'number' ? parsedData.peso : parseFloat(parsedData.peso || '0'),
          descricao: parsedData.descricao || 'Produtos Extraídos via PDF'
        };

        return NextResponse.json({
          success: true,
          dados,
          message: "Dados fiscais oficiais extraídos com sucesso do arquivo."
        });

      } catch (fileErr: any) {
        console.error("Erro ao processar arquivo com Gemini:", fileErr);
        return NextResponse.json({
          success: false,
          error: "file_processing_failed",
          message: `Falha ao processar arquivo oficial: ${fileErr.message || fileErr}`
        }, { status: 500 });
      }
    }

    // SCENARIO 2: Extração via texto livre (Gemini Fallback)
    if (textDescription) {
      try {
        console.log("Iniciando extração inteligente de texto livre com Gemini.");
        const prompt = `Você é um analista fiscal integrado no HARPIA Logix. 
Analise a seguinte descrição de pedido ou dados fiscais em texto e extraia estritamente os campos reais fornecidos.
NÃO invente dados fiscais sem embasamento no texto.

Texto fornecido:
"""
${textDescription}
"""`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                chaveAcesso: { type: Type.STRING },
                statusNfe: { type: Type.STRING },
                dataEmissao: { type: Type.STRING },
                emitente: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    cnpj: { type: Type.STRING }
                  },
                  required: ['nome', 'cnpj']
                },
                destinatario: {
                  type: Type.OBJECT,
                  properties: {
                    nome: { type: Type.STRING },
                    endereco: { type: Type.STRING },
                    cidade: { type: Type.STRING },
                    estado: { type: Type.STRING },
                    cep: { type: Type.STRING }
                  },
                  required: ['nome', 'endereco', 'cidade', 'estado']
                },
                valor: { type: Type.NUMBER },
                peso: { type: Type.NUMBER },
                descricao: { type: Type.STRING }
              },
              required: ['destinatario', 'valor']
            }
          }
        });

        const extractedText = response.text;
        if (!extractedText) {
          throw new Error("O modelo Gemini retornou uma resposta vazia.");
        }

        const parsedData = JSON.parse(extractedText);
        
        const dados = {
          chaveAcesso: (parsedData.chaveAcesso || '').replace(/\D/g, '') || '00000000000000000000000000000000000000000000',
          statusNfe: parsedData.statusNfe || 'Autorizada',
          dataEmissao: parsedData.dataEmissao || new Date().toISOString(),
          emitente: {
            nome: parsedData.emitente?.nome || 'Emitente Extraído via Texto',
            cnpj: parsedData.emitente?.cnpj || ''
          },
          destinatario: {
            nome: parsedData.destinatario?.nome || 'Destinatário Extraído via Texto',
            endereco: parsedData.destinatario?.endereco || '',
            cidade: parsedData.destinatario?.cidade || 'Manaus',
            estado: parsedData.destinatario?.estado || 'AM',
            cep: parsedData.destinatario?.cep || ''
          },
          valor: typeof parsedData.valor === 'number' ? parsedData.valor : parseFloat(parsedData.valor || '0'),
          peso: typeof parsedData.peso === 'number' ? parsedData.peso : parseFloat(parsedData.peso || '0'),
          descricao: parsedData.descricao || 'Produtos extraídos via texto livre'
        };

        return NextResponse.json({
          success: true,
          dados,
          message: "Dados extraídos e estruturados com sucesso a partir do texto."
        });

      } catch (textErr: any) {
        console.error("Erro na extração inteligente de texto:", textErr);
        return NextResponse.json({
          success: false,
          error: "text_extraction_failed",
          message: `Falha ao interpretar texto: ${textErr.message || textErr}`
        }, { status: 500 });
      }
    }

// UF Code Map to decode Brazilian State, Capital and acronyms from the NFe 44-digit key structure
const UF_MAP: Record<string, { sigla: string; nome: string; capital: string }> = {
  "11": { sigla: "RO", nome: "Rondônia", capital: "Porto Velho" },
  "12": { sigla: "AC", nome: "Acre", capital: "Rio Branco" },
  "13": { sigla: "AM", nome: "Amazonas", capital: "Manaus" },
  "14": { sigla: "RR", nome: "Roraima", capital: "Boa Vista" },
  "15": { sigla: "PA", nome: "Pará", capital: "Belém" },
  "16": { sigla: "AP", nome: "Amapá", capital: "Macapá" },
  "17": { sigla: "TO", nome: "Tocantins", capital: "Palmas" },
  "21": { sigla: "MA", nome: "Maranhão", capital: "São Luís" },
  "22": { sigla: "PI", nome: "Piauí", capital: "Teresina" },
  "23": { sigla: "CE", nome: "Ceará", capital: "Fortaleza" },
  "24": { sigla: "RN", nome: "Rio Grande do Norte", capital: "Natal" },
  "25": { sigla: "PB", nome: "Paraíba", capital: "João Pessoa" },
  "26": { sigla: "PE", nome: "Pernambuco", capital: "Recife" },
  "27": { sigla: "AL", nome: "Alagoas", capital: "Maceió" },
  "28": { sigla: "SE", nome: "Sergipe", capital: "Aracaju" },
  "29": { sigla: "BA", nome: "Bahia", capital: "Salvador" },
  "31": { sigla: "MG", nome: "Minas Gerais", capital: "Belo Horizonte" },
  "32": { sigla: "ES", nome: "Espírito Santo", capital: "Vitória" },
  "33": { sigla: "RJ", nome: "Rio de Janeiro", capital: "Rio de Janeiro" },
  "35": { sigla: "SP", nome: "São Paulo", capital: "São Paulo" },
  "41": { sigla: "PR", nome: "Paraná", capital: "Curitiba" },
  "42": { sigla: "SC", nome: "Santa Catarina", capital: "Florianópolis" },
  "43": { sigla: "RS", nome: "Rio Grande do Sul", capital: "Porto Alegre" },
  "50": { sigla: "MS", nome: "Mato Grosso do Sul", capital: "Campo Grande" },
  "51": { sigla: "MT", nome: "Mato Grosso", capital: "Cuiabá" },
  "52": { sigla: "GO", nome: "Goiás", capital: "Goiânia" },
  "53": { sigla: "DF", nome: "Distrito Federal", capital: "Brasília" }
};

function getDeterministicMockNFe(chaveAcesso: string) {
  const cleanChave = chaveAcesso.replace(/\D/g, '');
  
  // High-precision delivery locations in Manaus, AM
  const bairros = [
    { nome: 'Adrianópolis', endereco: 'Av. Mário Ypiranga Monteiro, 1200' },
    { nome: 'Flores', endereco: 'Av. Djalma Batista, 3000' },
    { nome: 'Centro', endereco: 'Av. Sete de Setembro, 450' },
    { nome: 'Aleixo', endereco: 'Av. André Araújo, 2100' },
    { nome: 'Compensa', endereco: 'Av. Brasil, 1500' },
    { nome: 'Parque Dez de Novembro', endereco: 'Av. Tancredo Neves, 600' }
  ];
  
  let sum = 0;
  for (let i = 0; i < cleanChave.length; i++) {
    sum += parseInt(cleanChave[i] || '0');
  }
  const index = sum % bairros.length;
  const selectedBairro = bairros[index];
  
  const valor = 850 + (sum * 15.6) + (parseInt(cleanChave.slice(-4)) || 0) % 2500;
  const peso = 10 + (sum * 0.45) + (parseInt(cleanChave.slice(-2)) || 0) % 80;
  
  const emitentes = [
    "SAMSUNG ELETRONICA DA AMAZONIA LTDA",
    "AMBEV S.A.",
    "DISTRIBUIDORA DE BEBIDAS TROPICAL",
    "BRF S.A."
  ];
  const emitenteNome = emitentes[sum % emitentes.length];
  
  const destinatarios = [
    "BEMOL S/A",
    "SUPERMERCADOS DB LTDA",
    "FARMACIAS SANTO REMEDIO",
    "REDE DE POSTOS ATENAS"
  ];
  const destinatarioNome = destinatarios[(sum + 1) % destinatarios.length];

  return {
    chaveAcesso: cleanChave,
    statusNfe: 'Autorizada',
    dataEmissao: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    emitente: {
      nome: emitenteNome,
      cnpj: "04.123.456/0001-99"
    },
    destinatario: {
      nome: destinatarioNome,
      endereco: `${selectedBairro.endereco}, ${selectedBairro.nome}`,
      cidade: 'Manaus',
      estado: 'AM',
      cep: '69000-000'
    },
    valor: Math.round(valor * 100) / 100,
    peso: Math.round(peso * 10) / 10,
    descricao: "Equipamentos eletrônicos, insumos comerciais e mercadorias diversas."
  };
}

async function runNFeSimulation(chaveAcesso: string) {
  const cleanChave = chaveAcesso.replace(/\D/g, '');
  
  // Extract key elements
  const ufCode = cleanChave.slice(0, 2);
  const aa = cleanChave.slice(2, 4);
  const mm = cleanChave.slice(4, 6);
  const cnpjEmit = cleanChave.slice(6, 20);
  
  const ufInfo = UF_MAP[ufCode] || { sigla: "AM", nome: "Amazonas", capital: "Manaus" };
  const year = parseInt(aa) + 2000;
  const month = parseInt(mm) - 1; // 0-indexed month
  const dataEmissao = new Date(
    isNaN(year) || year < 2000 || year > 2035 ? 2026 : year, 
    isNaN(month) || month < 0 || month > 11 ? 5 : month, 
    15
  ).toISOString();
  
  // Formatted CNPJ
  const cnpjFormatted = cnpjEmit.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

  // Sum of digits for deterministic indexing
  let sum = 0;
  for (let i = 0; i < cleanChave.length; i++) {
    sum += parseInt(cleanChave[i] || '0');
  }

  // Realistic state-specific emitentes
  const stateEmitentes: Record<string, string[]> = {
    "13": [ // AM
      "SAMSUNG ELETRONICA DA AMAZONIA LTDA",
      "MOTO HONDA DA AMAZONIA LTDA",
      "AMBEV S.A. - FILIAL MANAUS",
      "COCA-COLA FEMSA AMAZONIA",
      "TRANSPIRENAICA TRANSPORTES LTDA"
    ],
    "35": [ // SP
      "NESTLE BRASIL LTDA",
      "ALIPERTI METAIS S/A",
      "MERCADO LIVRE ATIVIDADES DE INTERNET LTDA",
      "MAGAZINE LUIZA S/A",
      "MULTILASER INDUSTRIAL S.A."
    ],
    "33": [ // RJ
      "PETROLEO BRASILEIRO S A PETROBRAS",
      "AMBEV S.A. - RJ",
      "GLAXOSMITHKLINE BRASIL LTDA",
      "COMPANHIA SIDERURGICA NACIONAL"
    ],
    "31": [ // MG
      "FIAT AUTOMOVEIS S/A",
      "VALE S.A.",
      "CEMIG DISTRIBUICAO S.A.",
      "ITAMBE ALIMENTOS S.A."
    ],
    "41": [ // PR
      "RENAULT DO BRASIL S.A.",
      "KLABIN S.A.",
      "COPEL DISTRIBUICAO S.A.",
      "LAR COOPERATIVA AGROINDUSTRIAL"
    ],
    "43": [ // RS
      "GUERDOU METALURGICA",
      "LOJAS RENNER S.A.",
      "TRAMONTINA S/A CUTELARIA",
      "RANDON S.A. IMPLEMENTOS E PARTICIPACOES"
    ]
  };

  const defaultEmitentes = [
    `DISTRIBUIDORA DE ALIMENTOS ${ufInfo.nome} LTDA`,
    `METALURGICA ${ufInfo.capital} S.A.`,
    `COMERCIO E LOGISTICA BRASIL UF - ${ufInfo.sigla}`,
    `FABRICA DE EMBALAGENS ${ufInfo.nome}`
  ];

  const emitenteList = stateEmitentes[ufInfo.sigla] || defaultEmitentes;
  const emitenteNome = emitenteList[sum % emitenteList.length];

  // High-precision delivery locations in Manaus, AM (since Harpia routes to Manaus)
  const destinatarios = [
    { nome: "BEMOL S/A", endereco: "Rua Miranda Leão, 41, Centro, Manaus, AM", cep: "69005-040" },
    { nome: "SUPERMERCADOS DB LTDA", endereco: "Av. Noel Nutels, 1762, Cidade Nova, Manaus, AM", cep: "69090-000" },
    { nome: "FARMACIAS SANTO REMEDIO", endereco: "Av. Constantino Nery, 2525, Flores, Manaus, AM", cep: "69058-795" },
    { nome: "REDE DE POSTOS ATENAS", endereco: "Av. André Araújo, 1333, Aleixo, Manaus, AM", cep: "69060-000" },
    { nome: "LOJAS AMERICANAS S.A.", endereco: "Av. Djalma Batista, 482, Parque Dez de Novembro, Manaus, AM", cep: "69050-010" },
    { nome: "HOSPITAL ADRIANOPOLIS", endereco: "Av. Mário Ypiranga, 1200, Adrianópolis, Manaus, AM", cep: "69057-002" }
  ];

  const destIndex = (sum + (parseInt(cleanChave.slice(-1)) || 0)) % destinatarios.length;
  const dest = destinatarios[destIndex];

  // Values and weight based on the key
  const valor = 950 + (sum * 22.4) + ((parseInt(cleanChave.slice(-4)) || 0) % 3500);
  const peso = 12 + (sum * 0.65) + ((parseInt(cleanChave.slice(-2)) || 0) % 120);

  // Description depending on emitente
  let descricao = "Produtos e mercadorias diversas para fins comerciais.";
  if (emitenteNome.includes("SAMSUNG") || emitenteNome.includes("MULTILASER")) {
    descricao = "Equipamentos eletrônicos, smartphones, monitores e periféricos de informática.";
  } else if (emitenteNome.includes("HONDA") || emitenteNome.includes("MOTO")) {
    descricao = "Peças de reposição para motocicletas, engrenagens e componentes mecânicos.";
  } else if (emitenteNome.includes("AMBEV") || emitenteNome.includes("COCA-COLA") || emitenteNome.includes("BEBIDAS")) {
    descricao = "Lotes de bebidas prontas, refrigerantes em lata, águas minerais e cervejas.";
  } else if (emitenteNome.includes("NESTLE") || emitenteNome.includes("ALIMENTOS") || emitenteNome.includes("ITAMBE")) {
    descricao = "Fardos de produtos alimentícios, chocolates, laticínios e insumos de mercearia.";
  } else if (emitenteNome.includes("METALURGICA") || emitenteNome.includes("SIDERURGICA") || emitenteNome.includes("VALE") || emitenteNome.includes("METAIS")) {
    descricao = "Chapas de aço galvanizado, conexões de ferro fundido, parafusos e ferragens.";
  } else if (emitenteNome.includes("MERCADO LIVRE") || emitenteNome.includes("LOJAS") || emitenteNome.includes("LOGISTICA")) {
    descricao = "Eletrodomésticos, utilidades domésticas e caixas de mercadorias para e-commerce.";
  }

  return {
    chaveAcesso: cleanChave,
    statusNfe: "Autorizada",
    dataEmissao,
    emitente: {
      nome: emitenteNome,
      cnpj: cnpjFormatted
    },
    destinatario: {
      nome: dest.nome,
      endereco: dest.endereco,
      cidade: "Manaus",
      estado: "AM",
      cep: dest.cep
    },
    valor: Math.round(valor * 100) / 100,
    peso: Math.round(peso * 10) / 10,
    descricao
  };
}

/**
 * Saves simulated XML and PDF files to the local file system
 * so that subsequent route-engine operations or document downloads
 * function seamlessly during development fallbacks.
 */
function saveSimulationFiles(dados: any, cleanChave: string): string {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe${cleanChave}" versao="4.00">
      <ide>
        <cUF>${cleanChave.substring(0, 2)}</cUF>
        <dhEmi>${dados.dataEmissao}</dhEmi>
      </ide>
      <emit>
        <CNPJ>${dados.emitente.cnpj.replace(/\D/g, '')}</CNPJ>
        <xNome>${dados.emitente.nome}</xNome>
      </emit>
      <dest>
        <CNPJ>00000000000000</CNPJ>
        <xNome>${dados.destinatario.nome}</xNome>
        <enderDest>
          <xLgr>${dados.destinatario.endereco.split(',')[0] || ''}</xLgr>
          <xBairro>${dados.destinatario.endereco.split(',')[1]?.trim() || ''}</xBairro>
          <xMun>${dados.destinatario.cidade}</xMun>
          <UF>${dados.destinatario.estado}</UF>
          <CEP>${dados.destinatario.cep || '69000-000'}</CEP>
        </enderDest>
      </dest>
      <det nItem="1">
        <prod>
          <xProd>${dados.descricao}</xProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>${dados.valor}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <vol>
          <pesoB>${dados.peso || 0}</pesoB>
        </vol>
      </transp>
    </infNFe>
  </NFe>
</nfeProc>`;

    const pdfBase64 = `JVBERi0xLjQKMSAwIG9iagogIDw8IC9UeXBlIC9DYXRhbG9nCiAgICAgL1BhZ2VzIDIgMCBSCiAgPj4KZW5kb2JqCjIgMCBvYmoKICA8PCAvVHlwZSAvUGFnZXMKICAgICAvS2lkcyBbIDMgMCBSIF0KICAgICAvQ291bnQgMQogID4+CmVuZG9iagozIDAgb2JqCiAgPDwgL1R5cGUgL1BhZ2UKICAgICAvUGFyZW50IDIgMCBSCiAgICAgL1Jlc291cmNlcyA8PAogICAgICAgIC9Gb250IDw8CiAgICAgICAgICAgL0YxIDQgMCBSCiAgICAgICAgID4+CiAgICAgID4+CiAgICAgL01lZGlhQm94IFsgMCAwIDU5NSA4NDIgXQogICAgIC9Db250ZW50cyA1IDAgUgogID4+CmVuZG9iago0IDAgb2JqCiAgPDwgL1R5cGUgL0ZvbnQKICAgICAvU3VidHlwZSAvVHlwZTEKICAgICAvQmFzZUZvbnQgL0hlbHZldGljYQogID4+CmVuZG9iago1IDAgb2JqCiAgPDwgL0xlbmd0aCA3OCA+PgpzdHJlYW0KQlQKICAvRjEgMTIgVGYKICA3MiA3MTIgVGQKICAoREFORkUgU0lNVUxBRE8gLSBGQUxMQkFDSyBIQVJQSUMpIFRqCkUKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA3NCAwMDAwMCBuIAowMDAwMDAwMTM1IDAwMDAwIGYgCjAwMDAwMDAyOTUgMDAwMDAgbiAKMDAwMDAwMDM3NCAwMDAwMCBuIAp0cmFpbGVyCiAgPDwgL1NpemUgNgogICAgIC9Sb290IDEgMCBSCiAgPj4Kc3RhcnR4cmVmCjUwOQolJUVPRg==`;

    // Save simulation files to root folder (requested by workspace/other modules)
    fs.writeFileSync(path.join(process.cwd(), 'nfe.xml'), xmlString, 'utf-8');
    fs.writeFileSync(path.join(process.cwd(), 'danfe.pdf'), Buffer.from(pdfBase64, 'base64'));

    // Save simulation files to public folder (for direct preview via iframe)
    fs.writeFileSync(path.join(publicDir, 'nfe.xml'), xmlString, 'utf-8');
    fs.writeFileSync(path.join(publicDir, 'danfe.pdf'), Buffer.from(pdfBase64, 'base64'));

    console.log("Arquivos fiscais simulados (nfe.xml e danfe.pdf) salvos com sucesso via fallback.");
    return pdfBase64;
  } catch (fsErr: any) {
    console.error("Falha ao salvar arquivos simulados locais no servidor:", fsErr);
    return "";
  }
}

    // SCENARIO 3: Consulta oficial de chave de acesso (44 dígitos)
    if (chaveAcesso) {
      const cleanChave = chaveAcesso.replace(/\D/g, '');

      // 1. Verificar se a chave é estruturalmente válida (Modulo 11)
      if (!isValidNFeKey(cleanChave)) {
        return NextResponse.json({
          success: false,
          error: "invalid_key_checksum",
          message: "Chave de acesso inválida. O dígito verificador da SEFAZ (Modulo 11) está incorreto ou a chave possui tamanho incorreto."
        });
      }

      // 2. Verificar se pertence aos dados oficiais de demonstração (Harpia)
      if (OFFICIAL_DEMO_NFES[cleanChave]) {
        return NextResponse.json({
          success: true,
          dados: OFFICIAL_DEMO_NFES[cleanChave],
          message: "Nota Fiscal localizada na SEFAZ (Ambiente de Homologação / Demonstração Harpia)"
        });
      }

      const apiKey = process.env.DANFE_RAPIDA_API_KEY;

      // 3. Se a chave de API não estiver configurada, avisar ou rodar a simulação determinística
      if (!apiKey) {
        try {
          const dados = await runNFeSimulation(cleanChave);
          const pdfBase64 = saveSimulationFiles(dados, cleanChave);
          return NextResponse.json({
            success: true,
            dados: {
              ...dados,
              pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
              fallback: true
            },
            message: "Simulação de Nota Fiscal (Chave API DANFE_RAPIDA_API_KEY não configurada nas variáveis de ambiente)."
          });
        } catch (err: any) {
          return NextResponse.json({
            success: false,
            error: "simulation_error",
            message: `Erro ao simular dados da Nota Fiscal: ${err.message || err}`
          });
        }
      }

      // 4. Integração Real com a API do Danfe Rápida com Resiliência Avançada de Fallback
      let response;
      let attempts = 0;
      const maxAttempts = 2; // Duas tentativas rápidas para evitar demoras excessivas do usuário
      let delay = 800; 

      while (attempts < maxAttempts) {
        attempts++;
        try {
          console.log(`Iniciando tentativa ${attempts} de consulta na Danfe Rápida para chave: ${cleanChave}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout por tentativa para ser ágil

          response = await fetch(`https://api.danferapida.com.br/documents/b2b/search/${cleanChave}`, {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'Accept': 'application/json'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.status === 429) {
            console.warn(`Tentativa ${attempts}: API do Danfe Rápida retornou Rate Limit 429.`);
            if (attempts >= maxAttempts) {
              // Rate limit da API atingido. Usar fallback amigável!
              console.log("Limite de requisições excedido. Ativando fallback de simulação.");
              const dados = await runNFeSimulation(cleanChave);
              const pdfBase64 = saveSimulationFiles(dados, cleanChave);
              return NextResponse.json({
                success: true,
                dados: {
                  ...dados,
                  pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
                  fallback: true
                },
                message: "Aviso de Conexão: A API Danfe Rápida está com limite temporário excedido (Rate Limit 429). Ativamos o modo de simulação para prosseguir."
              });
            }
            const retryAfterHeader = response.headers.get('Retry-After');
            let sleepTime = delay;
            if (retryAfterHeader) {
              const parsedRetryAfter = parseInt(retryAfterHeader, 10);
              if (!isNaN(parsedRetryAfter)) {
                sleepTime = parsedRetryAfter * 1000;
              }
            }
            await new Promise(resolve => setTimeout(resolve, Math.min(sleepTime, 3000)));
            delay *= 1.5;
            continue;
          }

          break;

        } catch (fetchErr: any) {
          console.error(`Tentativa ${attempts} falhou com erro de rede ou timeout:`, fetchErr);
          if (attempts >= maxAttempts) {
            // Falha em todas as tentativas (timeout ou erro de rede). Ativar Fallback Dinâmico!
            console.log("Falha de conexão com a API Danfe Rápida. Iniciando Fallback automático de desenvolvimento.");
            const dados = await runNFeSimulation(cleanChave);
            const pdfBase64 = saveSimulationFiles(dados, cleanChave);
            return NextResponse.json({
              success: true,
              dados: {
                ...dados,
                pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
                fallback: true
              },
              message: "Fallback Inteligente: A conexão com a API Danfe Rápida expirou (Timeout) ou está inacessível de dentro do ambiente. O Harpia carregou uma nota de simulação realista para o seu teste."
            });
          }
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 1.5;
        }
      }

      if (!response) {
        // Fallback para quando não houver resposta
        const dados = await runNFeSimulation(cleanChave);
        const pdfBase64 = saveSimulationFiles(dados, cleanChave);
        return NextResponse.json({
          success: true,
          dados: {
            ...dados,
            pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
            fallback: true
          },
          message: "Fallback Inteligente: Sem resposta da API Danfe Rápida. Carregado em modo de simulação operacional."
        });
      }

      // Tratar Status de Erro Específicos com fallback amigável para manter o fluxo fluindo
      if (response.status === 401) {
        console.warn("Chave API do Danfe Rápida inválida (401). Utilizando fallback realista.");
        const dados = await runNFeSimulation(cleanChave);
        const pdfBase64 = saveSimulationFiles(dados, cleanChave);
        return NextResponse.json({
          success: true,
          dados: {
            ...dados,
            pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
            fallback: true
          },
          message: "Modo Simulação: A chave da API Danfe Rápida retornou 'Não Autorizado (401)' ou está expirada. Ativado modo de teste realista Harpia."
        });
      }

      if (response.status === 404) {
        console.warn(`Nota fiscal não localizada na base do Danfe Rápida (404) para chave: ${cleanChave}. Rodando fallback simulador.`);
        const dados = await runNFeSimulation(cleanChave);
        const pdfBase64 = saveSimulationFiles(dados, cleanChave);
        return NextResponse.json({
          success: true,
          dados: {
            ...dados,
            pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
            fallback: true
          },
          message: "Nota Não Encontrada (404) na SEFAZ Produção. O Harpia ativou o Simulador de Notas de Homologação para fins de teste operacional."
        });
      }

      if (response.status === 502 || !response.ok) {
        console.warn(`API do Danfe Rápida retornou status de erro ${response.status}. Ativando modo de simulação.`);
        const dados = await runNFeSimulation(cleanChave);
        const pdfBase64 = saveSimulationFiles(dados, cleanChave);
        return NextResponse.json({
          success: true,
          dados: {
            ...dados,
            pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
            fallback: true
          },
          message: `Sefaz Instável / Erro API (${response.status}): Danfe Rápida ou SEFAZ apresentou lentidão. Usando simulador Harpia.`
        });
      }

      // Processar Sucesso Real da API Danfe Rápida
      try {
        const bodyData = await response.json();
        const { xmlCode, base64Code, accessKey } = bodyData;

        if (!xmlCode || !base64Code) {
          // Fallback se faltar algum dado
          console.warn("Dados incompletos retornados da API Danfe Rápida. Usando simulador.");
          const dados = await runNFeSimulation(cleanChave);
          const pdfBase64 = saveSimulationFiles(dados, cleanChave);
          return NextResponse.json({
            success: true,
            dados: {
              ...dados,
              pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
              fallback: true
            },
            message: "Aviso: A API retornou dados parciais. Carregado via Simulador Harpia."
          });
        }

        // Salvar arquivos localmente no servidor
        try {
          const publicDir = path.join(process.cwd(), 'public');
          if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
          }

          // Decodificar XML caso venha em base64
          let xmlString = xmlCode;
          if (!xmlString.trim().startsWith("<")) {
            xmlString = Buffer.from(xmlString, 'base64').toString('utf-8');
          }

          // Salvar arquivos na raiz do projeto (como solicitado)
          fs.writeFileSync(path.join(process.cwd(), 'nfe.xml'), xmlString, 'utf-8');
          fs.writeFileSync(path.join(process.cwd(), 'danfe.pdf'), Buffer.from(base64Code, 'base64'));

          // Salvar arquivos na pasta public para visualização direta via URL estática
          fs.writeFileSync(path.join(publicDir, 'nfe.xml'), xmlString, 'utf-8');
          fs.writeFileSync(path.join(publicDir, 'danfe.pdf'), Buffer.from(base64Code, 'base64'));

          console.log("Arquivos fiscais (nfe.xml e danfe.pdf) salvos com sucesso a partir da API oficial.");
        } catch (fsErr: any) {
          console.error("Falha ao salvar arquivos oficiais locais no servidor:", fsErr);
        }

        // Analisar o XML para extrair os dados reais estruturados
        const parsedData = parseNfeXml(xmlCode, accessKey || cleanChave);

        // Retornar dados enriquecidos com a URL do PDF em formato base64 para carregamento instantâneo e offline do iframe
        return NextResponse.json({
          success: true,
          dados: {
            ...parsedData,
            pdfUrl: `data:application/pdf;base64,${base64Code}`
          },
          message: "Nota Fiscal oficial localizada e arquivos gerados com sucesso via Danfe Rápida!"
        });

      } catch (jsonErr: any) {
        console.error("Erro ao decodificar JSON de sucesso da API:", jsonErr);
        // Fallback em caso de falha de decodificação de sucesso
        const dados = await runNFeSimulation(cleanChave);
        const pdfBase64 = saveSimulationFiles(dados, cleanChave);
        return NextResponse.json({
          success: true,
          dados: {
            ...dados,
            pdfUrl: `data:application/pdf;base64,${pdfBase64}`,
            fallback: true
          },
          message: "Erro ao processar resposta oficial da API. Usando simulação operacional Harpia."
        });
      }
    }

    return NextResponse.json({
      success: false,
      error: "bad_request",
      message: "Requisição inválida. Informe uma chave de acesso, texto descritivo ou faça o upload de um arquivo."
    }, { status: 400 });

  } catch (err: any) {
    console.error("Erro global no endpoint de consulta NFe:", err);
    return NextResponse.json({
      success: false,
      error: "internal_error",
      message: `Erro interno no servidor: ${err.message || err}`
    }, { status: 500 });
  }
}
