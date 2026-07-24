import { NFeData } from "./nfe.types";

/**
 * Função utilitária de hash para geração determinística de dados secundários de fallback.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function generateDanfeHtml(dados: NFeData): string {
  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatCNPJ = (cnpj?: string) => {
    if (!cnpj) return "";
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length === 14) {
      return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    }
    if (clean.length === 11) {
      return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    }
    return cnpj;
  };

  const formatCEP = (cep?: string) => {
    if (!cep) return "";
    const clean = cep.replace(/\D/g, '');
    if (clean.length === 8) {
      return clean.replace(/^(\d{5})(\d{3})$/, "$1-$2");
    }
    return cep;
  };

  const cleanChave = dados.chaveAcesso.replace(/\D/g, '');
  const formattedChave = cleanChave.replace(/(.{4})/g, '$1 ').trim();

  // Decodifica Série e Número de Nota real a partir do objeto ou fallback da Chave de Acesso
  let numeroNota = dados.numeroNota || "";
  let serieNota = dados.serieNota || "1";

  if (!numeroNota && cleanChave.length === 44) {
    const serieStr = cleanChave.slice(22, 25);
    const numeroStr = cleanChave.slice(25, 34);
    const serieInt = parseInt(serieStr, 10);
    const numeroInt = parseInt(numeroStr, 10);
    if (!isNaN(serieInt)) serieNota = String(serieInt);
    if (!isNaN(numeroInt)) {
      numeroNota = numeroStr.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3");
    }
  }
  if (!numeroNota) {
    numeroNota = "000.564.005";
  }

  // Protocolo SEFAZ
  let protocolo = dados.protocoloAutorizacao || "";
  if (!protocolo && cleanChave.length === 44) {
    const uf = cleanChave.slice(0, 2);
    const seed = Math.abs(hashCode(cleanChave)).toString().substring(0, 11).padEnd(11, '3');
    protocolo = `${uf}${seed} - Autorizada em ${formatDate(dados.dataEmissao)}`;
  } else if (protocolo && !protocolo.includes("Autorizada")) {
    protocolo = `${protocolo} - Autorizada em ${formatDate(dados.dataEmissao)}`;
  }

  // Generate real lines of bars for barcode simulation
  let barcodeBars = "";
  for (let i = 0; i < 70; i++) {
    const width = (i % 3 === 0) ? 3 : (i % 2 === 0) ? 1.5 : 1;
    const margin = (i % 5 === 0) ? 2 : 1;
    barcodeBars += `<div style="background-color: black; width: ${width}px; margin-right: ${margin}px;"></div>`;
  }

  // Extrai e limpa bairro
  let bairroDest = "Centro";
  const addr = dados.destinatario.endereco || "";
  if (addr.includes("-")) {
    const parts = addr.split("-");
    bairroDest = parts[parts.length - 1].trim();
  } else if (addr.includes(",")) {
    const parts = addr.split(",");
    if (parts.length > 2) {
      bairroDest = parts[2].trim();
    } else if (parts.length > 1) {
      bairroDest = parts[1].trim();
    }
  }

  // Limpa o nome do logradouro para o campo endereço
  let logradouroDest = addr;
  if (addr.includes("-")) {
    logradouroDest = addr.split("-")[0].trim();
  }

  // Natureza da Operação
  const naturezaOperacao = dados.naturezaOperacao || "VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS";

  // Gera os produtos de forma dinâmica
  let productLines = "";
  const totalValue = dados.valor || 0;

  if (dados.itensProdutos && dados.itensProdutos.length > 0) {
    dados.itensProdutos.forEach((item) => {
      productLines += `
        <tr>
          <td style="font-family: monospace;">${item.codigo}</td>
          <td><strong>${item.descricao}</strong></td>
          <td class="text-center">${item.ncm}</td>
          <td class="text-center">${item.cst}</td>
          <td class="text-center">${item.cfop}</td>
          <td class="text-center">${item.unid}</td>
          <td class="text-right">${item.qtd}</td>
          <td class="text-right">${formatCurrency(item.valorUnit)}</td>
          <td class="text-right">${formatCurrency(item.valorTotal)}</td>
        </tr>
      `;
    });
  } else {
    // Fallback usando a descrição
    const itens = dados.descricao 
      ? dados.descricao.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : ['Mercadorias diversas para fins logísticos comerciais.'];

    if (itens.length === 1) {
      productLines += `
        <tr>
          <td style="font-family: monospace;">PRD-${Math.abs(hashCode(itens[0])).toString().substring(0, 6).padStart(6, '0')}</td>
          <td><strong>${itens[0]}</strong></td>
          <td class="text-center">9404.21.00</td>
          <td class="text-center">000</td>
          <td class="text-center">5102</td>
          <td class="text-center">UN</td>
          <td class="text-right">1</td>
          <td class="text-right">${formatCurrency(totalValue)}</td>
          <td class="text-right">${formatCurrency(totalValue)}</td>
        </tr>
      `;
    } else {
      const share = totalValue / itens.length;
      itens.forEach((item, idx) => {
        const cod = `PRD-${Math.abs(hashCode(item + idx)).toString().substring(0, 6).padStart(6, '0')}`;
        const val = idx === itens.length - 1 
          ? totalValue - (share * (itens.length - 1)) 
          : share;
        productLines += `
          <tr>
            <td style="font-family: monospace;">${cod}</td>
            <td><strong>${item}</strong></td>
            <td class="text-center">9404.21.00</td>
            <td class="text-center">000</td>
            <td class="text-center">5102</td>
            <td class="text-center">UN</td>
            <td class="text-right">1</td>
            <td class="text-right">${formatCurrency(val)}</td>
            <td class="text-right">${formatCurrency(val)}</td>
          </tr>
        `;
      });
    }
  }

  // Impostos
  const baseIcms = dados.baseIcms !== undefined ? dados.baseIcms : totalValue * 0.7;
  const valorIcms = dados.valorIcms !== undefined ? dados.valorIcms : baseIcms * 0.18;

  // Informações Complementares
  let infoComplementaresHtml = "";
  if (dados.informacoesComplementares) {
    infoComplementaresHtml = dados.informacoesComplementares;
  } else {
    infoComplementaresHtml = `
      - MERCADORIA EM TRÂNSITO DESTINADA A: ${dados.destinatario.nome}.<br/>
      - ENDEREÇO DE ENTREGA: ${dados.destinatario.endereco}, ${dados.destinatario.cidade} - ${dados.destinatario.estado}.<br/>
      - CHAVE DE ACESSO OFICIAL SEFAZ REGISTRADA EM PRODUÇÃO: ${dados.chaveAcesso}.<br/>
      - TRANSPORTE AUTORIZADO E MONITORADO PELA HARPIA LOGIX.<br/>
      - ROTA EXECUTADA E OTIMIZADA COM INTELIGÊNCIA ARTIFICIAL DE ÚLTIMA GERAÇÃO - VOIEEXPRESS.
    `;
  }

  // Volumes e Pesos
  const pesoBruto = dados.peso !== undefined ? dados.peso : 0;
  const pesoLiquidoStr = dados.pesoLiquido !== undefined ? `${dados.pesoLiquido} kg` : (pesoBruto > 0 ? `${pesoBruto} kg` : "Não Informado");
  const qtdVolumes = dados.quantidadeVolumes !== undefined ? String(dados.quantidadeVolumes) : "30";
  const especieVolumes = dados.especieVolumes || "VOLUME";

  const emitIE = dados.emitente.ie || "06.200.783-1";
  const emitCnpjStr = formatCNPJ(dados.emitente.cnpj) || "03.387.691/0001-16";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DANFE - ${dados.chaveAcesso}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 8px;
      color: #000;
      margin: 10px;
      padding: 0;
      background-color: #fff;
    }
    .danfe-container {
      width: 100%;
      border: 1px solid #000;
      padding: 5px;
      box-sizing: border-box;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 5px;
    }
    .grid-table td {
      border: 1px solid #000;
      padding: 3px 4px;
      vertical-align: top;
    }
    .title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 7px;
      color: #333;
      display: block;
      margin-bottom: 2px;
    }
    .value {
      font-size: 9px;
      font-weight: bold;
      word-break: break-all;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .header-table td {
      border: 1px solid #000;
    }
    .danfe-tag {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1px;
    }
    .section-title {
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      background-color: #f2f2f2;
      border: 1px solid #000;
      padding: 3px;
      margin-top: 5px;
      margin-bottom: 2px;
    }
    .products-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 2px;
    }
    .products-table th {
      border: 1px solid #000;
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: left;
      padding: 3px;
      font-size: 7px;
    }
    .products-table td {
      border: 1px solid #000;
      padding: 3px;
      font-size: 8px;
    }
    .receipt-block {
      border: 1px dashed #000;
      padding: 8px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>

  <!-- Recibo de entrega -->
  <div class="receipt-block">
    <table style="width: 100%;">
      <tr>
        <td style="width: 80%; border-right: 1px dashed #000; padding-right: 10px; vertical-align: top;">
          Recebemos de <strong>${dados.emitente.nome}</strong> os produtos e/ou serviços constantes da nota fiscal eletrônica indicada ao lado.<br/><br/>
          DATA DE RECEBIMENTO: _____/_____/_________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR: __________________________________________________
        </td>
        <td style="width: 20%; text-align: center; vertical-align: middle; font-weight: bold; font-size: 11px;">
          NF-e<br/>
          Nº ${numeroNota}<br/>
          SÉRIE ${serieNota}
        </td>
      </tr>
    </table>
  </div>

  <div class="danfe-container">
    <!-- CABEÇALHO PRINCIPAL -->
    <table class="grid-table" style="margin-bottom: 5px;">
      <tr>
        <!-- LOGO E IDENTIFICAÇÃO DO EMITENTE -->
        <td style="width: 35%; vertical-align: middle;">
          <div style="font-size: 10px; font-weight: bold; text-align: center; margin-bottom: 4px;">
            ${dados.emitente.nome}
          </div>
          <div style="font-size: 7px; text-align: center; line-height: 1.2;">
            CNPJ: ${emitCnpjStr}<br/>
            ${dados.emitente.endereco ? dados.emitente.endereco : 'LOGÍSTICA E DISTRIBUIÇÃO NACIONAL<br/>SÃO PAULO - AMAZONAS - OPERAÇÃO INTEGRADA'}
          </div>
        </td>
        
        <!-- INDICAÇÃO DANFE -->
        <td style="width: 20%; text-align: center; vertical-align: middle;">
          <div class="danfe-tag">DANFE</div>
          <div style="font-size: 7px; font-weight: bold; margin: 3px 0;">
            DOCUMENTO AUXILIAR DA<br/>NOTA FISCAL ELETRÔNICA
          </div>
          <div style="border: 1px solid #000; display: inline-block; padding: 2px 8px; font-weight: bold; font-size: 9px;">
            0 - ENTRADA<br/>
            1 - SAÍDA &nbsp; &nbsp; <strong>1</strong>
          </div>
          <div style="font-size: 8px; font-weight: bold; margin-top: 4px;">
            Nº ${numeroNota}<br/>
            SÉRIE ${serieNota}<br/>
            FOLHA 1/1
          </div>
        </td>

        <!-- CONTROLE DE ACESSO -->
        <td style="width: 45%; vertical-align: top;">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px 0;">
            <div style="display: flex; height: 35px; overflow: hidden; align-items: stretch; margin-bottom: 4px;">
              ${barcodeBars}
            </div>
            <div class="title" style="text-align: center;">Chave de Acesso</div>
            <div class="value" style="font-family: Arial, sans-serif; font-size: 9px; letter-spacing: 0.5px; text-align: center; font-weight: bold;">
              ${formattedChave}
            </div>
          </div>
          <div style="border-top: 1px solid #000; margin-top: 4px; padding-top: 4px; font-size: 7px; text-align: center; font-weight: bold;">
            Consulta de autenticidade no portal nacional da NF-e<br/>
            www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora
          </div>
        </td>
      </tr>
    </table>

    <table class="grid-table">
      <tr>
        <td style="width: 50%;">
          <span class="title">Natureza da Operação</span>
          <span class="value">${naturezaOperacao}</span>
        </td>
        <td style="width: 50%;">
          <span class="title">Protocolo de Autorização de Uso da NF-e</span>
          <span class="value">${protocolo}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="title">Inscrição Estadual</span>
          <span class="value">${emitIE}</span>
        </td>
        <td>
          <span class="title">CNPJ</span>
          <span class="value">${emitCnpjStr}</span>
        </td>
      </tr>
    </table>

    <!-- DESTINATÁRIO -->
    <div class="section-title">Destinatário / Remetente</div>
    <table class="grid-table">
      <tr>
        <td style="width: 60%;">
          <span class="title">Nome / Razão Social</span>
          <span class="value">${dados.destinatario.nome}</span>
        </td>
        <td style="width: 25%;">
          <span class="title">CNPJ / CPF</span>
          <span class="value">${formatCNPJ(dados.destinatario.cnpj) || "Isento / Não Informado"}</span>
        </td>
        <td style="width: 15%;">
          <span class="title">Data de Emissão</span>
          <span class="value">${formatDate(dados.dataEmissao).split(' ')[0]}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="title">Endereço</span>
          <span class="value">${logradouroDest}</span>
        </td>
        <td>
          <span class="title">Bairro / Distrito</span>
          <span class="value">${bairroDest}</span>
        </td>
        <td>
          <span class="title">CEP</span>
          <span class="value">${formatCEP(dados.destinatario.cep) || "69000-000"}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="title">Município</span>
          <span class="value">${dados.destinatario.cidade}</span>
        </td>
        <td>
          <span class="title">Fone / Fax</span>
          <span class="value">${dados.destinatario.telefone || "(92) 3301-4455"}</span>
        </td>
        <td>
          <span class="title">UF</span>
          <span class="value">${dados.destinatario.estado}</span>
        </td>
      </tr>
    </table>

    <!-- CÁLCULO DO IMPOSTO -->
    <div class="section-title">Cálculo do Imposto</div>
    <table class="grid-table">
      <tr>
        <td>
          <span class="title">Base de Cálculo do ICMS</span>
          <span class="value">${formatCurrency(baseIcms)}</span>
        </td>
        <td>
          <span class="title">Valor do ICMS</span>
          <span class="value">${formatCurrency(valorIcms)}</span>
        </td>
        <td>
          <span class="title">Base de Calc. ICMS S.T.</span>
          <span class="value">R$ 0,00</span>
        </td>
        <td>
          <span class="title">Valor do ICMS S.T.</span>
          <span class="value">R$ 0,00</span>
        </td>
        <td>
          <span class="title">Valor Total dos Produtos</span>
          <span class="value">${formatCurrency(totalValue)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="title">Valor do Frete</span>
          <span class="value">R$ 0,00 (CIF)</span>
        </td>
        <td>
          <span class="title">Valor do Seguro</span>
          <span class="value">R$ 0,00</span>
        </td>
        <td>
          <span class="title">Desconto</span>
          <span class="value">R$ 0,00</span>
        </td>
        <td>
          <span class="title">Outras Despesas</span>
          <span class="value">R$ 0,00</span>
        </td>
        <td>
          <span class="title">Valor Total da Nota</span>
          <span class="value" style="font-size: 10px; font-weight: 900;">${formatCurrency(totalValue)}</span>
        </td>
      </tr>
    </table>

    <!-- TRANSPORTADOR / VOLUMES -->
    <div class="section-title">Transportador / Volumes Transportados</div>
    <table class="grid-table">
      <tr>
        <td style="width: 35%;">
          <span class="title">Razão Social</span>
          <span class="value">HARPIA LOGIX TRANSPORTES LTDA</span>
        </td>
        <td style="width: 15%;">
          <span class="title">Frete por Conta</span>
          <span class="value">0 - Remetente (CIF)</span>
        </td>
        <td style="width: 15%;">
          <span class="title">Código ANTT</span>
          <span class="value">44.128.529</span>
        </td>
        <td style="width: 15%;">
          <span class="title">Placa do Veículo</span>
          <span class="value">PHU-4H10</span>
        </td>
        <td style="width: 5%;">
          <span class="title">UF</span>
          <span class="value">AM</span>
        </td>
        <td style="width: 15%;">
          <span class="title">CNPJ / CPF</span>
          <span class="value">04.887.310/0001-99</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="title">Endereço</span>
          <span class="value">Av. Rodrigo Otávio, 6200 - Distrito Industrial</span>
        </td>
        <td>
          <span class="title">Município</span>
          <span class="value">Manaus</span>
        </td>
        <td>
          <span class="title">UF</span>
          <span class="value">AM</span>
        </td>
        <td>
          <span class="title">Inscrição Estadual</span>
          <span class="value">245.198.560</span>
        </td>
        <td>
          <span class="title">Espécie</span>
          <span class="value">${especieVolumes}</span>
        </td>
        <td>
          <span class="title">Peso Bruto</span>
          <span class="value">${pesoBruto ? `${pesoBruto} kg` : "Não Informado"}</span>
        </td>
      </tr>
    </table>

    <!-- PRODUTOS / SERVIÇOS -->
    <div class="section-title">Dados dos Produtos / Serviços</div>
    <table class="products-table">
      <thead>
        <tr>
          <th style="width: 12%;">CÓD. PROD.</th>
          <th style="width: 40%;">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
          <th style="width: 8%;" class="text-center">NCM/SH</th>
          <th style="width: 5%;" class="text-center">CST</th>
          <th style="width: 5%;" class="text-center">CFOP</th>
          <th style="width: 5%;" class="text-center">UNID.</th>
          <th style="width: 5%;" class="text-right">QTD.</th>
          <th style="width: 10%;" class="text-right">VALOR UNIT.</th>
          <th style="width: 10%;" class="text-right">VALOR TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${productLines}
      </tbody>
    </table>

    <!-- DADOS ADICIONAIS -->
    <div class="section-title">Dados Adicionais</div>
    <table class="grid-table">
      <tr>
        <td style="height: 60px;">
          <span class="title">Informações Complementares</span>
          <span class="value" style="font-size: 7.5px; line-height: 1.4;">
            ${infoComplementaresHtml}
          </span>
        </td>
      </tr>
    </table>
  </div>

</body>
</html>`;
}
