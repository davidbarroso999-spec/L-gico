import { NFeData } from "./nfe.types";

/**
 * Extracts a tag value from an XML string, optionally inside a parent tag.
 */
function getTagValue(xml: string, tag: string, parentTag?: string): string {
  let targetXml = xml;
  if (parentTag) {
    const parentRegex = new RegExp(`<[^>]*:?${parentTag}[^>]*>([\\s\\S]*?)</[^>]*:?${parentTag}>`);
    const parentMatch = xml.match(parentRegex);
    if (!parentMatch) return "";
    targetXml = parentMatch[1];
  }

  const tagRegex = new RegExp(`<[^>]*:?${tag}[^>]*>([^<]*)</[^>]*:?${tag}>`);
  const match = targetXml.match(tagRegex);
  return match ? match[1].trim() : "";
}

/**
 * Parses Brazilian NFe XML content and maps it to NFeData structure.
 */
export function parseNfeXml(xmlContent: string, chaveAcesso: string): NFeData {
  let xml = xmlContent;
  
  // Detect if base64 encoded and decode
  if (!xml.trim().startsWith("<")) {
    try {
      xml = Buffer.from(xmlContent, 'base64').toString('utf-8');
    } catch (e) {
      console.warn("Falha ao decodificar base64 XML, tratando como texto puro:", e);
    }
  }

  // Extract core NFe fields using resilient regex parsing
  const emitNome = getTagValue(xml, "xNome", "emit") || "Emitente Desconhecido";
  const emitCnpj = getTagValue(xml, "CNPJ", "emit") || getTagValue(xml, "CPF", "emit") || "";
  
  const destNome = getTagValue(xml, "xNome", "dest") || "Destinatário Desconhecido";
  const destCnpj = getTagValue(xml, "CNPJ", "dest") || getTagValue(xml, "CPF", "dest") || "";

  // Address parts from dest -> enderDest
  const logradouro = getTagValue(xml, "xLgr", "enderDest");
  const numero = getTagValue(xml, "nro", "enderDest");
  const complemento = getTagValue(xml, "xCpl", "enderDest");
  const bairro = getTagValue(xml, "xBairro", "enderDest");
  const cidade = getTagValue(xml, "xMun", "enderDest") || "Manaus";
  const estado = getTagValue(xml, "UF", "enderDest") || "AM";
  const cep = getTagValue(xml, "CEP", "enderDest");

  let enderecoCompleto = `${logradouro}${numero ? ", " + numero : ""}${complemento ? " (" + complemento + ")" : ""}${bairro ? ", " + bairro : ""}`;
  if (!enderecoCompleto || enderecoCompleto.trim() === "") {
    enderecoCompleto = "Endereço não disponível no XML";
  }

  // Value total
  const valorTotalStr = getTagValue(xml, "vNF", "ICMSTot");
  const valor = valorTotalStr ? parseFloat(valorTotalStr) : 0;

  // Weight total
  const pesoStr = getTagValue(xml, "pesoB", "vol") || getTagValue(xml, "pesoL", "vol");
  const peso = pesoStr ? parseFloat(pesoStr) : 0;

  // Description / first product
  const firstProd = getTagValue(xml, "xProd", "prod");
  const descricao = firstProd || "Mercadorias Gerais";

  // Emission date (dhEmi or dEmi)
  let dataEmissao = getTagValue(xml, "dhEmi", "ide") || getTagValue(xml, "dEmi", "ide");
  if (!dataEmissao) {
    dataEmissao = new Date().toISOString();
  }

  return {
    chaveAcesso,
    statusNfe: "Autorizada",
    dataEmissao,
    emitente: {
      nome: emitNome,
      cnpj: emitCnpj
    },
    destinatario: {
      nome: destNome,
      endereco: `${enderecoCompleto}, ${cidade} - ${estado}`,
      cidade,
      estado,
      cep
    },
    valor: isNaN(valor) ? 0 : valor,
    peso: isNaN(peso) ? 0 : peso,
    descricao
  };
}
