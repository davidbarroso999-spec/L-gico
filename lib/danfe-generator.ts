import { NFeData } from "./nfe.types";

export function generateDanfeHtml(dados: NFeData): string {
  const formatCurrency = (val: number) => {
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

  // Generate some realistic lines of bars for barcode simulation
  let barcodeBars = "";
  for (let i = 0; i < 65; i++) {
    const width = (i % 3 === 0) ? 3 : (i % 2 === 0) ? 1.5 : 1;
    const margin = (i % 5 === 0) ? 2 : 1;
    barcodeBars += `<div style="background-color: black; width: ${width}px; margin-right: ${margin}px;"></div>`;
  }

  const cleanChave = dados.chaveAcesso.replace(/\s/g, '');
  const formattedChave = cleanChave.replace(/(.{4})/g, '$1 ').trim();

  // Create products table lines
  const prodValor = dados.valor * 0.85; // main product takes most value
  const outValor = dados.valor * 0.15; // secondary product

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DANFE - ${dados.chaveAcesso}</title>
  <style>
    body {
      font-family: 'Courier New', Courier, monospace, Arial, sans-serif;
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
          Nº 000.564.005<br/>
          SÉRIE 1
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
            CNPJ: ${dados.emitente.cnpj}<br/>
            LOGÍSTICA E DISTRIBUIÇÃO NACIONAL<br/>
            ENDEREÇO OFICIAL SEFAZ DE ORIGEM
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
            Nº 000.564.005<br/>
            SÉRIE 1<br/>
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
          <span class="value">VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS</span>
        </td>
        <td style="width: 50%;">
          <span class="title">Protocolo de Autorização de Uso da NF-e</span>
          <span class="value">132260004587425 - Autorizada em ${formatDate(dados.dataEmissao)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="title">Inscrição Estadual</span>
          <span class="value">954.120.334.110</span>
        </td>
        <td>
          <span class="title">CNPJ</span>
          <span class="value">${dados.emitente.cnpj}</span>
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
          <span class="value">CNPJ ${dados.destinatario.cep ? 'Simulado' : 'Oficial'}</span>
        </td>
        <td style="width: 15%;">
          <span class="title">Data de Emissão</span>
          <span class="value">${formatDate(dados.dataEmissao).split(' ')[0]}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="title">Endereço</span>
          <span class="value">${dados.destinatario.endereco}</span>
        </td>
        <td>
          <span class="title">Bairro / Distrito</span>
          <span class="value">Centro / Industrial</span>
        </td>
        <td>
          <span class="title">CEP</span>
          <span class="value">${dados.destinatario.cep || "69000-000"}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span class="title">Município</span>
          <span class="value">${dados.destinatario.cidade}</span>
        </td>
        <td>
          <span class="title">Fone / Fax</span>
          <span class="value">(92) 3301-4455</span>
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
          <span class="value">${formatCurrency(dados.valor * 0.7)}</span>
        </td>
        <td>
          <span class="title">Valor do ICMS</span>
          <span class="value">${formatCurrency(dados.valor * 0.7 * 0.18)}</span>
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
          <span class="value">${formatCurrency(dados.valor)}</span>
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
          <span class="value" style="font-size: 10px; font-weight: 900;">${formatCurrency(dados.valor)}</span>
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
          <span class="value">FARDOS</span>
        </td>
        <td>
          <span class="title">Peso Bruto</span>
          <span class="value">${dados.peso || "45.0"} kg</span>
        </td>
      </tr>
    </table>

    <!-- PRODUTOS / SERVIÇOS -->
    <div class="section-title">Dados dos Produtos / Serviços</div>
    <table class="products-table">
      <thead>
        <tr>
          <th style="width: 8%;">CÓD. PROD.</th>
          <th style="width: 44%;">DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
          <th style="width: 8%;">NCM/SH</th>
          <th style="width: 5%;">CST</th>
          <th style="width: 5%;">CFOP</th>
          <th style="width: 5%;">UNID.</th>
          <th style="width: 5%;">QTD.</th>
          <th style="width: 10%;">VALOR UNIT.</th>
          <th style="width: 10%;">VALOR TOTAL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>PRD-000845</td>
          <td><strong>${dados.descricao || 'Produtos manufaturados diversos para fins logísticos comerciais.'}</strong></td>
          <td>8517.12.31</td>
          <td>000</td>
          <td>5102</td>
          <td>UN</td>
          <td>1</td>
          <td>${formatCurrency(prodValor)}</td>
          <td>${formatCurrency(prodValor)}</td>
        </tr>
        <tr>
          <td>PRD-000122</td>
          <td>SERVIÇO DE LOGÍSTICA COMPLEMENTAR E SEGURO INTEGRADO SEFAZ</td>
          <td>4911.10.90</td>
          <td>040</td>
          <td>5949</td>
          <td>UN</td>
          <td>1</td>
          <td>${formatCurrency(outValor)}</td>
          <td>${formatCurrency(outValor)}</td>
        </tr>
      </tbody>
    </table>

    <!-- DADOS ADICIONAIS -->
    <div class="section-title">Dados Adicionais</div>
    <table class="grid-table">
      <tr>
        <td style="height: 60px;">
          <span class="title">Informações Complementares</span>
          <span class="value" style="font-size: 7.5px; line-height: 1.4;">
            - MERCADORIA EM TRÂNSITO DESTINADA A: ${dados.destinatario.nome}.<br/>
            - ENDEREÇO DE ENTREGA: ${dados.destinatario.endereco}, ${dados.destinatario.cidade} - ${dados.destinatario.estado}.<br/>
            - CHAVE DE ACESSO OFICIAL SEFAZ REGISTRADA EM PRODUÇÃO: ${dados.chaveAcesso}.<br/>
            - TRANSPORTE AUTORIZADO E MONITORADO PELA HARPIA LOGIX.<br/>
            - ROTA EXECUTADA E OTIMIZADA COM INTELIGÊNCIA ARTIFICIAL DE ÚLTIMA GERAÇÃO - VOIEEXPRESS.
          </span>
        </td>
      </tr>
    </table>
  </div>

</body>
</html>`;
}
