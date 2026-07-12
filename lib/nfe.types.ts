export interface NFeData {
  chaveAcesso: string;
  statusNfe: string;
  dataEmissao: string;
  emitente: {
    nome: string;
    cnpj: string;
  };
  destinatario: {
    nome: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep?: string;
    cnpj?: string;
  };
  valor: number;
  peso?: number;
  descricao?: string;
}

export interface NFeConsultaResponse {
  success: boolean;
  dados?: NFeData;
  error?: string;
  message?: string;
  fallbackMode?: boolean;
}
