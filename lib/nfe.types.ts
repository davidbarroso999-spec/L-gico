export interface NFeData {
  chaveAcesso: string;
  statusNfe: string;
  dataEmissao: string;
  emitente: {
    nome: string;
    cnpj: string;
    ie?: string;
    telefone?: string;
    endereco?: string;
  };
  destinatario: {
    nome: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep?: string;
    cnpj?: string;
    ie?: string;
    telefone?: string;
  };
  valor: number;
  peso?: number;
  descricao?: string;
  
  // Novos campos de alta fidelidade fiscal
  numeroNota?: string;
  serieNota?: string;
  naturezaOperacao?: string;
  protocoloAutorizacao?: string;
  valorIcms?: number;
  baseIcms?: number;
  quantidadeVolumes?: number;
  especieVolumes?: string;
  pesoLiquido?: number;
  informacoesComplementares?: string;
  itensProdutos?: Array<{
    codigo: string;
    descricao: string;
    ncm: string;
    cst: string;
    cfop: string;
    unid: string;
    qtd: number;
    valorUnit: number;
    valorTotal: number;
    baseIcms?: number;
    valorIcms?: number;
    aliqIcms?: number;
  }>;
}

export interface NFeConsultaResponse {
  success: boolean;
  dados?: NFeData;
  error?: string;
  message?: string;
  fallbackMode?: boolean;
}
