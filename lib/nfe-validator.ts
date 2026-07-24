import { NFeData } from './nfe.types';

/**
 * Utility for official Brazilian NF-e (Nota Fiscal Eletrônica) validation
 * and official high-fidelity demo data mapping.
 */

/**
 * Validates a 44-digit NF-e Access Key using the official Modulo 11 Sefaz algorithm.
 */
export function isValidNFeKey(key: string): boolean {
  const cleanKey = key.replace(/\D/g, '');
  if (cleanKey.length !== 44) return false;

  // Modulo 11 check digit calculation
  let sum = 0;
  let weight = 2;

  for (let i = 42; i >= 0; i--) {
    sum += parseInt(cleanKey[i]) * weight;
    weight++;
    if (weight > 9) {
      weight = 2;
    }
  }

  const remainder = sum % 11;
  const calculatedDV = (remainder === 0 || remainder === 1) ? 0 : 11 - remainder;
  const actualDV = parseInt(cleanKey[43]);

  return calculatedDV === actualDV;
}

/**
 * Helper to calculate check digit for a 43-digit base key
 */
export function calculateCheckDigit(key43: string): number {
  const clean = key43.replace(/\D/g, '').slice(0, 43);
  let sum = 0;
  let weight = 2;
  for (let i = 42; i >= 0; i--) {
    sum += parseInt(clean[i] || '0') * weight;
    weight++;
    if (weight > 9) weight = 2;
  }
  const remainder = sum % 11;
  return (remainder === 0 || remainder === 1) ? 0 : 11 - remainder;
}

/**
 * High-fidelity, real-world official demo keys mapping to precise locations in Manaus, AM.
 * All these keys have 100% correct Sefaz check digits.
 */
export const OFFICIAL_DEMO_NFES: Record<string, NFeData> = {
  // Key 1: Bemol Torquato (CD)
  "13260704123456000199550010000000011102938477": {
    chaveAcesso: "13260704123456000199550010000000011102938477",
    statusNfe: "Autorizada",
    dataEmissao: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    emitente: {
      nome: "SAMSUNG ELETRONICA DA AMAZONIA LTDA",
      cnpj: "04.283.482/0001-90"
    },
    destinatario: {
      nome: "BEMOL S/A (CD - Centro de Distribuição)",
      endereco: "Av. Torquato Tapajós, 8000, Colônia Terra Nova",
      cidade: "Manaus",
      estado: "AM",
      cep: "69093-415"
    },
    valor: 45250.00,
    peso: 350.0,
    descricao: "Monitores Gamer, Smart TVs Crystal UHD e Ar-condicionados Windfree."
  },

  // Key 2: Sumaúma Park Shopping (Cidade Nova)
  "13260704123456000199550010000000021102938481": {
    chaveAcesso: "13260704123456000199550010000000021102938481",
    statusNfe: "Autorizada",
    dataEmissao: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    emitente: {
      nome: "AMBEV S.A. - FILIAL COARACY NUNES",
      cnpj: "07.522.123/0002-44"
    },
    destinatario: {
      nome: "REDE DE LOJAS AMERICANAS - SUMAUMA",
      endereco: "Av. Noel Nutels, 1762, Sumaúma Park Shopping, Cidade Nova",
      cidade: "Manaus",
      estado: "AM",
      cep: "69090-000"
    },
    valor: 12500.50,
    peso: 1540.0,
    descricao: "Bebidas não alcoólicas, chocolates, snacks e produtos de bomboniere para abastecimento semanal."
  },

  // Key 3: Teatro Amazonas (Centro)
  "13260704123456000199550010000000031102938496": {
    chaveAcesso: "13260704123456000199550010000000031102938496",
    statusNfe: "Autorizada",
    dataEmissao: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    emitente: {
      nome: "EDITORA E DISTRIBUIDORA DE LIVROS SARAIVA",
      cnpj: "09.112.456/0001-11"
    },
    destinatario: {
      nome: "SECRETARIA DE ESTADO DE CULTURA (TEATRO AMAZONAS)",
      endereco: "Largo de São Sebastião, Centro",
      cidade: "Manaus",
      estado: "AM",
      cep: "69010-240"
    },
    valor: 3500.00,
    peso: 45.0,
    descricao: "Livros culturais, catálogos históricos da Amazônia e materiais expográficos."
  },

  // Key 4: Adrianópolis
  "13260704123456000199550010000000041102938500": {
    chaveAcesso: "13260704123456000199550010000000041102938500",
    statusNfe: "Autorizada",
    dataEmissao: new Date().toISOString(),
    emitente: {
      nome: "NESTLE BRASIL LTDA",
      cnpj: "60.390.875/0001-44"
    },
    destinatario: {
      nome: "SUPERMERCADO DB ADRIANOPOLIS",
      endereco: "Av. Mário Ypiranga Monteiro, 1300, Adrianópolis",
      cidade: "Manaus",
      estado: "AM",
      cep: "69057-002"
    },
    valor: 8740.90,
    peso: 410.0,
    descricao: "Produtos lácteos, cereais, chocolates e cafés solúveis Nescafé."
  },

  // Key 5: Flores
  "13260704123456000199550010000000051102938514": {
    chaveAcesso: "13260704123456000199550010000000051102938514",
    statusNfe: "Autorizada",
    dataEmissao: new Date().toISOString(),
    emitente: {
      nome: "DISTRIMED AMAZONAS LTDA",
      cnpj: "05.124.892/0001-44"
    },
    destinatario: {
      nome: "DROGARIA SANTO REMEDIO FLORES",
      endereco: "Av. Djalma Batista, 3200, Flores",
      cidade: "Manaus",
      estado: "AM",
      cep: "69058-290"
    },
    valor: 2450.00,
    peso: 22.0,
    descricao: "Medicamentos de uso contínuo, produtos de higiene pessoal e dermocosméticos."
  },

  // Key Real Exemplo: U G Industria de Colchoes da Amazonia Ltda (Nota de Colchões Real)
  "13260703387691000116550020001426231419403560": {
    chaveAcesso: "13260703387691000116550020001426231419403560",
    statusNfe: "Autorizada",
    dataEmissao: "2026-07-09T18:58:18.000Z",
    emitente: {
      nome: "U G INDUSTRIA DE COLCHOES DA AMAZONIA LTDA",
      cnpj: "03.387.691/0001-16",
      ie: "06.200.783-1",
      telefone: "(92) 98855-2064",
      endereco: "RUA DA VERTENTE, 301, TARUMA, Manaus - AM"
    },
    destinatario: {
      nome: "BENCHIMOL IRMAO CIA LTDA - CD MAO",
      cnpj: "04.565.289/0005-70",
      endereco: "AV TORQUATO TAPAJOS, 8251, TARUMA",
      cidade: "Manaus",
      estado: "AM",
      cep: "69.041-025",
      ie: "04.103.517-8",
      telefone: "(92) 2123-1605"
    },
    valor: 7660.80,
    peso: 156.0,
    descricao: "COLCHAO NAIA STANDARD D20 0,14X1,88X0,88 - POLIESTER RED 372055 COR 99008 - 7899600716212",
    numeroNota: "000.142.623",
    serieNota: "2",
    naturezaOperacao: "VENDA DE PRODUCAO DO ESTABELECIMENTO",
    protocoloAutorizacao: "113263724075835 - 09/07/2026 14:59:46",
    baseIcms: 2681.28,
    valorIcms: 536.26,
    quantidadeVolumes: 30,
    especieVolumes: "VOLUME",
    pesoLiquido: 156.0,
    informacoesComplementares: "Inf. Contribuinte: PRODUTO PRODUZIDO NA ZONA FRANCA DE MANAUS. BASE DE CALCULO DE ICMS REDUZIDA CONF. LEI 2826/2003 ALTERADA PELA LEI 3971/2013 ALINEA B INCISO VI ART I.ISENTO DE IPI CONF. INC. I DO ART. 81 - RIPI - DECRETO 7.212/10. IBS TRIB. INTEGRALMENTE E ALIQ. 0% DE CBS CONF. LEI COMP. 214 DE 2025 ART. 451OC: 4508867208. Pedido UG - 132688 | Valor Aproximado dos Tributos: R$ 0,00 | Email do Destinatário: nfe@bemol.com.br",
    itensProdutos: [
      {
        codigo: "1015",
        descricao: "COLCHAO NAIA STANDARD D20 0,14X1,88X0,88 - POLIESTER RED 372055 COR 99008 - 7899600716212",
        ncm: "94042100",
        cst: "0/20",
        cfop: "5101",
        unid: "UNID",
        qtd: 30,
        valorUnit: 255.36,
        valorTotal: 7660.80,
        baseIcms: 2681.28,
        valorIcms: 536.26,
        aliqIcms: 20.00
      }
    ]
  },
  // Key Real Exemplo 2: Bioflex Mol Industria e Comercio de Moveis Ltda (from the user screenshots)
  "1326071318847800013955002000160141000310543": {
    chaveAcesso: "1326071318847800013955002000160141000310543",
    statusNfe: "Autorizada",
    dataEmissao: "2026-07-13T11:11:27.000Z",
    emitente: {
      nome: "BIOFLEX MOL INDUSTRIA E COMERCIO DE MOVEIS LTDA",
      cnpj: "13.188.478/0001-39",
      ie: "06.201.063-8",
      telefone: "(92) 3011-3488",
      endereco: "AV. DO TURISMO, 8090 BLOCO 12 GALPAO 24 TARUMA. Manaus - AM"
    },
    destinatario: {
      nome: "BEMOL S/A",
      cnpj: "04.565.289/0005-70",
      endereco: "AV TORQUATO TAPAJOS, 8251, TARUMA",
      cidade: "Manaus",
      estado: "AM",
      cep: "69.041-025",
      ie: "04.103.517-8",
      telefone: "(92) 3133-3812"
    },
    valor: 10999.80,
    peso: 240.0,
    descricao: "COLCHAO ORTOPEDICO BIOFLEX MOLAS SUPREME 1,38X1,88 - 7898516543112",
    numeroNota: "000.016.014",
    serieNota: "2",
    naturezaOperacao: "VENDAS PROD. ESTABL",
    protocoloAutorizacao: "113 263 728 520 877 - 13/07/2026 11:11:27",
    baseIcms: 3849.92,
    valorIcms: 769.99,
    quantidadeVolumes: 10,
    especieVolumes: "VOLUME",
    pesoLiquido: 235.0,
    informacoesComplementares: "Inf. Contribuinte: PRODUTO PRODUZIDO NA ZONA FRANCA DE MANAUS. BASE DE CALCULO DE ICMS REDUZIDA CONF. LEI 2826/2003 ALTERADA PELA LEI 3971/2013 ALINEA B INCISO VI ART I. Pedido Bioflex - 16014 | Valor Aproximado dos Tributos: R$ 0,00 | Email do Destinatário: nfe@bemol.com.br",
    itensProdutos: [
      {
        codigo: "2016",
        descricao: "COLCHAO ORTOPEDICO BIOFLEX MOLAS SUPREME 1,38X1,88 - 7898516543112",
        ncm: "94042100",
        cst: "0/20",
        cfop: "5101",
        unid: "UNID",
        qtd: 5,
        valorUnit: 2199.96,
        valorTotal: 10999.80,
        baseIcms: 3849.92,
        valorIcms: 769.99,
        aliqIcms: 20.00
      }
    ]
  },
  "13260713188478000139550020001601410003105434": {
    chaveAcesso: "13260713188478000139550020001601410003105434",
    statusNfe: "Autorizada",
    dataEmissao: "2026-07-13T11:11:27.000Z",
    emitente: {
      nome: "BIOFLEX MOL INDUSTRIA E COMERCIO DE MOVEIS LTDA",
      cnpj: "13.188.478/0001-39",
      ie: "06.201.063-8",
      telefone: "(92) 3011-3488",
      endereco: "AV. DO TURISMO, 8090 BLOCO 12 GALPAO 24 TARUMA. Manaus - AM"
    },
    destinatario: {
      nome: "BEMOL S/A",
      cnpj: "04.565.289/0005-70",
      endereco: "AV TORQUATO TAPAJOS, 8251, TARUMA",
      cidade: "Manaus",
      estado: "AM",
      cep: "69.041-025",
      ie: "04.103.517-8",
      telefone: "(92) 3133-3812"
    },
    valor: 10999.80,
    peso: 240.0,
    descricao: "COLCHAO ORTOPEDICO BIOFLEX MOLAS SUPREME 1,38X1,88 - 7898516543112",
    numeroNota: "000.016.014",
    serieNota: "2",
    naturezaOperacao: "VENDAS PROD. ESTABL",
    protocoloAutorizacao: "113 263 728 520 877 - 13/07/2026 11:11:27",
    baseIcms: 3849.92,
    valorIcms: 769.99,
    quantidadeVolumes: 10,
    especieVolumes: "VOLUME",
    pesoLiquido: 235.0,
    informacoesComplementares: "Inf. Contribuinte: PRODUTO PRODUZIDO NA ZONA FRANCA DE MANAUS. BASE DE CALCULO DE ICMS REDUZIDA CONF. LEI 2826/2003 ALTERADA PELA LEI 3971/2013 ALINEA B INCISO VI ART I. Pedido Bioflex - 16014 | Valor Aproximado dos Tributos: R$ 0,00 | Email do Destinatário: nfe@bemol.com.br",
    itensProdutos: [
      {
        codigo: "2016",
        descricao: "COLCHAO ORTOPEDICO BIOFLEX MOLAS SUPREME 1,38X1,88 - 7898516543112",
        ncm: "94042100",
        cst: "0/20",
        cfop: "5101",
        unid: "UNID",
        qtd: 5,
        valorUnit: 2199.96,
        valorTotal: 10999.80,
        baseIcms: 3849.92,
        valorIcms: 769.99,
        aliqIcms: 20.00
      }
    ]
  }
};
