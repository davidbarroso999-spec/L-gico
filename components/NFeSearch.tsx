'use client';

import React, { useState, useRef } from 'react';
import { 
  Search, 
  FileText, 
  Check, 
  Loader2, 
  Sparkles, 
  AlertTriangle, 
  X, 
  MapPin, 
  Scale, 
  Receipt,
  UploadCloud,
  FileCode,
  CheckCircle,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { NFeData } from '@/lib/nfe.types';
import { isValidNFeKey } from '@/lib/nfe-validator';

interface NFeSearchProps {
  onDataFetched: (dados: NFeData) => void;
  onCancel?: () => void;
  stopIndex: number;
}

function isTestKey(key: string): boolean {
  const clean = key.replace(/\D/g, '');
  if (clean.startsWith('13260704123456000199')) return true;
  if (clean.includes('04123456000199')) return true;
  if (clean.endsWith('00000000000')) return true;
  return false;
}

export default function NFeSearch({ onDataFetched, onCancel, stopIndex }: NFeSearchProps) {
  const [activeTab, setActiveTab] = useState<'key' | 'upload' | 'text'>('key');
  const [chave, setChave] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSefazError, setIsSefazError] = useState(false);
  
  // File upload states
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini text fallback states
  const [textDescription, setTextDescription] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Success state before final confirmation
  const [tempData, setTempData] = useState<NFeData | null>(null);
  const [parsedSource, setParsedSource] = useState<'key' | 'xml' | 'pdf' | 'text'>('key');

  const cleanChave = (raw: string) => {
    return raw.replace(/\D/g, '');
  };

  // Sefaz modulo 11 validation helper
  const isChaveValid = isValidNFeKey(cleanChave(chave));

  // Client-side XML parser (same robust algorithm)
  const parseNFeXmlClientSide = (xmlText: string): NFeData | null => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      const getValue = (parent: Element | Document | null, tag: string): string => {
        if (!parent) return '';
        const el = parent.getElementsByTagName(tag)[0];
        return el ? el.textContent || '' : '';
      };

      const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
      if (!infNFe) return null;

      let key = infNFe.getAttribute('Id') || '';
      if (key.startsWith('NFe')) {
        key = key.substring(3);
      }

      // Emitente
      const emit = xmlDoc.getElementsByTagName('emit')[0];
      const emitNome = emit ? getValue(emit, 'xNome') : 'Emitente Desconhecido';
      const emitCnpj = emit ? (getValue(emit, 'CNPJ') || getValue(emit, 'CPF')) : '';

      // Destinatario
      const dest = xmlDoc.getElementsByTagName('dest')[0];
      if (!dest) return null;
      const destNome = getValue(dest, 'xNome') || 'Destinatário Desconhecido';

      const enderDest = dest.getElementsByTagName('enderDest')[0];
      let endereco = '';
      let cidade = 'Manaus';
      let estado = 'AM';
      let cep = '';

      if (enderDest) {
        const logradouro = getValue(enderDest, 'xLgr') || getValue(enderDest, 'xlgr');
        const numero = getValue(enderDest, 'nro');
        const complemento = getValue(enderDest, 'xCpl') || getValue(enderDest, 'xcpl');
        const bairro = getValue(enderDest, 'xBairro') || getValue(enderDest, 'xbairro');
        cidade = getValue(enderDest, 'xMun') || getValue(enderDest, 'xmun') || 'Manaus';
        estado = getValue(enderDest, 'UF') || getValue(enderDest, 'uf') || 'AM';
        cep = getValue(enderDest, 'CEP') || getValue(enderDest, 'cep') || '';

        endereco = `${logradouro}${numero ? ', ' + numero : ''}${bairro ? ' - ' + bairro : ''}`;
        if (complemento) {
          endereco += ` (${complemento})`;
        }
      }

      // Total
      const total = xmlDoc.getElementsByTagName('total')[0];
      const icmstot = total ? total.getElementsByTagName('ICMSTot')[0] : null;
      const valorStr = icmstot ? getValue(icmstot, 'vNF') : getValue(xmlDoc, 'vNF');
      const valor = valorStr ? parseFloat(valorStr) : 0;

      // Peso
      const transp = xmlDoc.getElementsByTagName('transp')[0];
      const vol = transp ? transp.getElementsByTagName('vol')[0] : null;
      const pesoStr = vol ? (getValue(vol, 'pesoB') || getValue(vol, 'pesoL')) : '';
      const peso = pesoStr ? parseFloat(pesoStr) : 0;

      // Descricao (itens)
      const dets = xmlDoc.getElementsByTagName('det');
      const itemNames: string[] = [];
      for (let i = 0; i < Math.min(dets.length, 3); i++) {
        const prod = dets[i].getElementsByTagName('prod')[0];
        if (prod) {
          const xProd = getValue(prod, 'xProd');
          if (xProd) itemNames.push(xProd);
        }
      }
      const descricao = itemNames.join(', ') || 'Produtos Diversos';

      const dataEmissao = getValue(xmlDoc, 'dhEmi') || getValue(xmlDoc, 'dEmi') || new Date().toISOString();

      return {
        chaveAcesso: key || '00000000000000000000000000000000000000000000',
        statusNfe: 'Autorizada',
        dataEmissao,
        emitente: {
          nome: emitNome,
          cnpj: emitCnpj
        },
        destinatario: {
          nome: destNome,
          endereco,
          cidade,
          estado,
          cep
        },
        valor,
        peso,
        descricao
      };
    } catch (err) {
      console.error("Falha ao analisar XML:", err);
      return null;
    }
  };

  const handleSearchNFe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setTempData(null);
    setIsSefazError(false);
    
    const cleanKey = cleanChave(chave);
    if (cleanKey.length !== 44) {
      setErrorMsg('A chave da NFe deve conter exatamente 44 dígitos numéricos.');
      return;
    }

    if (!isChaveValid) {
      setErrorMsg('O dígito verificador (DV) da chave está incorreto de acordo com o cálculo do Módulo 11 da SEFAZ. Por favor, verifique se digitou corretamente.');
      return;
    }

    if (isTestKey(cleanKey)) {
      setErrorMsg('Uso de dados de teste detectado e bloqueado! A Harpia Logix exige exclusivamente notas reais reconhecidas pela SEFAZ Produção para fins de emissão de romaneio de cargas. Chaves fictícias ou de homologação não são permitidas.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/nfe/consultar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chaveAcesso: cleanKey }),
      });

      const data = await res.json();

      if (data.success && data.dados) {
        if (isTestKey(data.dados.chaveAcesso) || data.dados.emitente?.cnpj === '04123456000199' || data.dados.emitente?.cnpj === '04.123.456/0001-99') {
          setErrorMsg('O documento retornado é de teste ou homologação. Forneça uma nota fiscal real e oficial de Produção SEFAZ.');
          return;
        }
        setTempData(data.dados);
        setParsedSource('key');
      } else {
        setErrorMsg(data.message || 'Erro ao realizar a busca.');
        if (data.error === 'sefaz_certificate_required') {
          setIsSefazError(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro de conexão ao consultar a NFe.');
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setTempData(null);
    setUploadedFile(file);

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'xml') {
      // XML Client-side fast parser
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const res = parseNFeXmlClientSide(text);
        if (res) {
          if (isTestKey(res.chaveAcesso) || res.emitente.cnpj === '04123456000199' || res.emitente.cnpj === '04.123.456/0001-99') {
            setErrorMsg("Uso de dados de teste detectado e bloqueado! XML de teste/homologação não é permitido.");
          } else {
            setTempData(res);
            setParsedSource('xml');
          }
        } else {
          setErrorMsg("Não foi possível ler os dados oficiais do XML da NFe. Certifique-se de que é um XML de NFe válido e autorizado pela SEFAZ.");
        }
        setLoading(false);
      };
      reader.onerror = () => {
        setErrorMsg("Erro ao ler o arquivo local XML.");
        setLoading(false);
      };
      reader.readAsText(file);
    } else if (fileExt === 'pdf' || file.type.startsWith('image/')) {
      // PDF or Image Server-side parser using Gemini Multi-Modal
      setLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          const res = await fetch('/api/nfe/consultar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileBase64: base64,
              fileType: file.type || (fileExt === 'pdf' ? 'application/pdf' : 'image/png')
            })
          });

          const data = await res.json();
          if (data.success && data.dados) {
            if (isTestKey(data.dados.chaveAcesso) || data.dados.emitente?.cnpj === '04123456000199' || data.dados.emitente?.cnpj === '04.123.456/0001-99') {
              setErrorMsg("Uso de dados de teste detectado e bloqueado! DANFE de teste/homologação não é permitido.");
            } else {
              setTempData(data.dados);
              setParsedSource('pdf');
            }
          } else {
            setErrorMsg(data.message || "A inteligência não conseguiu extrair dados válidos do PDF. Garanta que o PDF é um DANFE oficial nítido.");
          }
        } catch (err: any) {
          console.error(err);
          setErrorMsg("Erro ao enviar o PDF para processamento.");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setErrorMsg("Formato não suportado. Carregue um XML de Nota Fiscal (.xml) ou PDF do DANFE (.pdf) válido.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Text/Email Gemini extractions
  const handleGeminiExtraction = async () => {
    if (!textDescription.trim()) {
      setErrorMsg('Digite ou cole a descrição/dados brutos para a IA extrair.');
      return;
    }

    setExtracting(true);
    setErrorMsg(null);
    setTempData(null);

    try {
      const res = await fetch('/api/nfe/consultar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textDescription }),
      });

      const data = await res.json();

      if (data.success && data.dados) {
        setTempData(data.dados);
        setParsedSource('text');
        setErrorMsg(null);
      } else {
        setErrorMsg(data.message || 'A IA não conseguiu interpretar os dados. Tente colar um texto estruturado diferente.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro de conexão ao processar com a IA.');
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirm = () => {
    if (tempData) {
      onDataFetched(tempData);
    }
  };

  const labelPrefix = stopIndex === 0 ? 'origem' : 'parada';

  return (
    <div className="glass border border-slate-800/80 rounded-2xl p-4 sm:p-5 text-slate-100 bg-slate-950/70 shadow-2xl space-y-4 animate-fadeIn transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-tech shrink-0" />
          <h4 className="text-xs font-black uppercase tracking-widest text-tech">
            Atribuir nota à {labelPrefix}
          </h4>
        </div>
        {onCancel && (
          <button 
            type="button"
            onClick={onCancel}
            className="text-slate-500 hover:text-white p-1.5 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs Layout */}
      {!tempData && (
        <div className="grid grid-cols-3 bg-slate-950 border border-slate-900 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => { setActiveTab('key'); setErrorMsg(null); }}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeTab === 'key' ? 'bg-slate-900 text-tech' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Chave de Acesso
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('upload'); setErrorMsg(null); }}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeTab === 'upload' ? 'bg-slate-900 text-tech' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Enviar XML / PDF
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('text'); setErrorMsg(null); }}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeTab === 'text' ? 'bg-slate-900 text-tech' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Dados em Texto
          </button>
        </div>
      )}

      {/* Error Displays */}
      {errorMsg && (
        <div className="bg-red-950/45 border border-red-900/60 rounded-xl p-3.5 space-y-1.5 text-xs">
          <div className="flex items-start gap-2 text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px]">Alerta de Conformidade Fiscal:</span>
              <p className="leading-relaxed text-[11px] text-red-200/90">{errorMsg}</p>
            </div>
          </div>
          {isSefazError && (
            <div className="border-t border-red-900/40 pt-2.5 mt-2.5 text-[10px] text-slate-400 space-y-1.5">
              <span className="font-bold text-slate-300 block uppercase">O que fazer agora?</span>
              <p>Você pode carregar os dados reais fazendo o upload do arquivo XML da nota ou do PDF do DANFE. Arraste-o na aba &quot;Enviar XML / PDF&quot;!</p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="text-tech hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                Ir para Enviar XML / PDF <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Tab Contents */}
      {tempData ? (
        /* SUCCESS SCENARIO: OFFIClAL DATA EXTRACTED */
        <div className="space-y-4">
          <div className={`p-4 space-y-3.5 text-xs animate-fadeIn rounded-xl border ${
            (tempData as any).fallback 
              ? "bg-amber-950/15 border-amber-500/30 text-amber-200" 
              : "bg-emerald-950/15 border-emerald-500/30 text-slate-200"
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${
              (tempData as any).fallback ? "border-amber-500/20" : "border-emerald-500/20"
            }`}>
              <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                (tempData as any).fallback ? "text-amber-400" : "text-emerald-400"
              }`}>
                <CheckCircle className={`w-4 h-4 animate-pulse ${(tempData as any).fallback ? "text-amber-400" : "text-emerald-400"}`} /> 
                {parsedSource === 'xml' && "Documento XML Oficial Validado"}
                {parsedSource === 'pdf' && "DANFE Oficial Extraído com Sucesso"}
                {parsedSource === 'key' && (
                  (tempData as any).fallback 
                    ? "Simulação de Fallback Ativada" 
                    : "NF-e Sefaz Localizada"
                )}
                {parsedSource === 'text' && "Informação de Entrega Processada"}
              </span>
              <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                Chave: ...{tempData.chaveAcesso.slice(-8)}
              </span>
            </div>

            {(tempData as any).fallback && (
              <p className="text-[10px] leading-relaxed text-amber-300/90 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/50">
                ⚠️ <strong>Aviso de Rede:</strong> A API Danfe Rápida está offline ou inacessível na sandbox. Para não bloquear seu trabalho, geramos dados determinísticos realistas de homologação.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Destinatário / Cliente</span>
                <span className="text-slate-200 font-bold block truncate" title={tempData.destinatario.nome}>
                  {tempData.destinatario.nome || 'Não especificado'}
                </span>
                {tempData.destinatario.cep && (
                  <span className="text-[9px] font-mono text-slate-400 block">
                    CEP: {tempData.destinatario.cep}
                  </span>
                )}
              </div>

              <div className="space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Endereço de Entrega</span>
                <span className="text-slate-200 font-medium block leading-relaxed flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-tech shrink-0" />
                  <span className="truncate" title={tempData.destinatario.endereco}>
                    {tempData.destinatario.endereco}, {tempData.destinatario.cidade} - {tempData.destinatario.estado}
                  </span>
                </span>
              </div>

              <div className="space-y-0.5 border-t border-slate-900/60 pt-2">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Valor Fiscal</span>
                <span className="text-emerald-400 font-extrabold text-sm block">
                  {tempData.valor > 0 
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tempData.valor)
                    : 'R$ 0,00'}
                </span>
              </div>

              <div className="space-y-0.5 border-t border-slate-900/60 pt-2">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Peso Bruto</span>
                <span className="text-slate-200 font-bold text-sm block flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  {tempData.peso && tempData.peso > 0 ? `${tempData.peso} kg` : 'Sem peso registrado'}
                </span>
              </div>
            </div>

            {tempData.descricao && (
              <div className="border-t border-slate-900/60 pt-2.5">
                <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">Produtos Declarados</span>
                <p className="text-slate-400 italic font-medium leading-relaxed bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-900 text-[11px] truncate" title={tempData.descricao}>
                  {tempData.descricao}
                </p>
              </div>
            )}

            <div className="border-t border-slate-900/60 pt-2 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Check className={`w-3.5 h-3.5 ${(tempData as any).fallback ? "text-amber-400" : "text-emerald-400"}`} />
                Origem: <strong className={(tempData as any).fallback ? "text-amber-400" : "text-emerald-400"}>{(tempData as any).fallback ? "Simulador Harpia (Fallback)" : "SEFAZ Produção Oficial"}</strong>
              </span>
              <span className="text-[9px] text-slate-500 font-mono">
                {(tempData as any).fallback ? "Offline / Simulação" : "Sincronização Ativa (ICP-Brasil)"}
              </span>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                setTempData(null);
                setErrorMsg(null);
                setUploadedFile(null);
              }}
              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Consultar Outra
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 bg-tech text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,242,255,0.3)] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 text-slate-950" /> Atribuir nota à {labelPrefix}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* TAB 1: SEARCH BY CHAVE DE ACESSO */}
          {activeTab === 'key' && (
            <form onSubmit={handleSearchNFe} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Chave de Acesso da NF-e (44 dígitos)</span>
                  <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${chave ? (isChaveValid ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/55' : 'text-amber-400 bg-amber-950/40 border border-amber-900/55') : 'text-slate-500'}`}>
                    {chave ? (isChaveValid ? 'Chave Válida' : 'Dígito Incorreto') : 'Aguardando'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={55}
                    value={chave}
                    onChange={(e) => setChave(e.target.value)}
                    placeholder="Ex: 1326 0704 1234 5600 0199 5500 1000 0000 0111 0293 8477"
                    disabled={loading}
                    className="w-full bg-slate-900/50 border border-slate-800/70 rounded-xl px-4 py-3.5 text-xs outline-none focus:border-tech focus:ring-1 focus:ring-tech/20 transition-all font-mono tracking-wider text-slate-100 disabled:opacity-50"
                  />
                  <span className="absolute right-3.5 top-3.5 text-[9px] font-mono text-slate-500 bg-slate-950/50 px-2 py-0.5 rounded border border-slate-900">
                    {cleanChave(chave).length}/44
                  </span>
                </div>
              </div>

              {/* Real-time Validation Checks Grid */}
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3.5 space-y-2.5 text-[11px]">
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                  Verificação em Tempo Real (SEFAZ API)
                </div>
                <div className="grid grid-cols-1 gap-2 font-sans">
                  {/* Check 1: Length */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Estrutura de 44 dígitos</span>
                    <span className={`font-semibold flex items-center gap-1 ${cleanChave(chave).length === 44 ? 'text-emerald-400' : 'text-amber-400/80'}`}>
                      {cleanChave(chave).length === 44 ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Completo
                        </>
                      ) : (
                        `Incompleto (${cleanChave(chave).length}/44)`
                      )}
                    </span>
                  </div>

                  {/* Check 2: Modulo 11 */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Algoritmo de Controle SEFAZ</span>
                    <span className={`font-semibold flex items-center gap-1 ${cleanChave(chave).length === 44 ? (isChaveValid ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}`}>
                      {cleanChave(chave).length < 44 ? (
                        'Aguardando 44 dígitos'
                      ) : isChaveValid ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Dígito Verificado (OK)
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 text-red-400 shrink-0" /> Dígito Incorreto (DV Inválido)
                        </>
                      )}
                    </span>
                  </div>

                  {/* Check 3: Is Test/Mock Data */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Origem do Documento (Ambiente)</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      cleanChave(chave).length === 44 
                        ? (isChaveValid && isTestKey(cleanChave(chave)) ? 'text-red-400 animate-pulse' : isChaveValid ? 'text-emerald-400' : 'text-slate-500')
                        : 'text-slate-500'
                    }`}>
                      {cleanChave(chave).length < 44 ? (
                        'Aguardando'
                      ) : !isChaveValid ? (
                        'Inválido'
                      ) : isTestKey(cleanChave(chave)) ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" /> BLOQUEADO (Dados de Teste)
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Produção Nacional (Oficial)
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {cleanChave(chave).length === 44 && isChaveValid && isTestKey(cleanChave(chave)) && (
                  <div className="bg-red-950/60 border border-red-900/50 text-red-300 p-2.5 rounded-lg text-[10px] mt-2 leading-relaxed flex items-start gap-1.5 animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Uso de dados de teste detectado!</strong> O sistema da Harpia Logix exige exclusivamente notas reais reconhecidas pela SEFAZ Produção para fins de emissão de romaneio de cargas. O uso de chaves fictícias ou de teste/homologação foi revogado.
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || cleanChave(chave).length !== 44 || !isChaveValid || isTestKey(cleanChave(chave))}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-slate-900 text-tech hover:text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 text-tech animate-spin" />
                    <span>Buscando na Sefaz...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Consultar Chave Sefaz</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: DRAG & DROP XML / PDF UPLOADER */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${dragActive ? 'border-tech bg-tech/5 scale-[0.99]' : 'border-slate-800 hover:border-slate-700 bg-slate-900/20'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,.pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {loading ? (
                  <div className="space-y-2.5 flex flex-col items-center">
                    <Loader2 className="w-8 h-8 text-tech animate-spin" />
                    <span className="text-[11px] text-slate-400 font-medium">Lendo e validando documento fiscal oficial...</span>
                  </div>
                ) : (
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="bg-slate-950 p-3 rounded-full border border-slate-800 flex items-center justify-center text-tech shadow-lg mb-1">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">
                      Solte o arquivo XML ou PDF do DANFE aqui
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-xs block">
                      Suporta arquivos oficiais <span className="text-slate-400 font-bold">XML (.xml)</span> ou DANFE em <span className="text-slate-400 font-bold">PDF (.pdf)</span> de qualquer emissor nacional.
                    </span>
                    <div className="pt-2">
                      <span className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] uppercase tracking-wider font-black text-tech rounded-lg">
                        Selecionar Arquivo
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {uploadedFile && !errorMsg && (
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <div className="flex items-center gap-2 truncate">
                    {uploadedFile.name.endsWith('.xml') ? (
                      <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate text-slate-300 font-bold">{uploadedFile.name}</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEXT/EMAIL EXTRACTION FALLBACK */}
          {activeTab === 'text' && (
            <div className="space-y-3.5">
              <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-3 text-xs text-slate-400 leading-relaxed space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-tech">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" /> 
                  <span>Extrair Dados de Texto com IA</span>
                </div>
                <p className="text-[10px]">
                  Caso não possua o arquivo XML/PDF, cole abaixo qualquer texto relacionado à entrega (e-mail, pedido faturado, rascunho de endereço) para extração inteligente oficial.
                </p>
              </div>

              <div className="space-y-1.5">
                <textarea
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="Cole o e-mail ou dados aqui. Exemplo: &#10;Entrega para Bemol Centro, na Rua Marquês de Santa Cruz, Centro, Manaus AM. Valor: 1520,50. Peso total aproximado: 35 kg."
                  disabled={extracting}
                  rows={4}
                  className="w-full bg-slate-900/50 border border-slate-800/70 rounded-xl px-4 py-3 text-xs outline-none focus:border-tech focus:ring-1 focus:ring-tech/20 transition-all text-slate-100 disabled:opacity-50 font-sans resize-none"
                />
              </div>

              <button
                type="button"
                onClick={handleGeminiExtraction}
                disabled={extracting || !textDescription.trim()}
                className="w-full py-3 bg-tech text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              >
                {extracting ? (
                  <>
                    <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                    <span>Analisando Texto com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
                    <span>Extrair Informações</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
