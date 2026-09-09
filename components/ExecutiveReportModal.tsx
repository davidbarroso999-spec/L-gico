'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Printer, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  ShieldCheck, 
  TrendingUp, 
  Clock, 
  Truck, 
  Fuel, 
  Leaf, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Building2, 
  Award,
  ArrowLeft,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { Route } from '@/lib/db';
import { generateExecutiveReportData, exportExecutiveSpreadsheet, ExecutiveReportData } from '@/lib/executive-report-generator';
import { getVehicleLabel } from '@/lib/route-history-service';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: Route[];
  reportTitle?: string;
}

export default function ExecutiveReportModal({
  isOpen,
  onClose,
  routes,
  reportTitle
}: ExecutiveReportModalProps) {
  const [activeTab, setActiveTab] = useState<'executive' | 'ledger' | 'esg'>('executive');
  const [copied, setCopied] = useState(false);

  if (!isOpen || routes.length === 0) return null;

  const data: ExecutiveReportData = generateExecutiveReportData(routes, reportTitle);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = `*HARPIA LOGÍSTICA • RELATÓRIO EXECUTIVO*\nCódigo de Auditoria: ${data.auditCode}\nRotas Auditadas: ${data.routesCount} | Paradas: ${data.totalStops}\nSLA de Pontualidade: ${data.slaPunctualityPercent}%\nScore Operacional: ${data.operationalScorePercent}%\nDistância Total: ${data.totalDistanceKm} km\nCombustível: ${data.totalFuelLiters} L (Economia estimada: ${data.estimatedFuelSavedLiters} L)\nCusto Total Combustível: R$ ${data.totalFuelCostBRL.toFixed(2)}\nCO₂ Evitado: ${data.co2AvoidedKg} kg`;
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[6500] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25 }}
          className="bg-slate-900 border border-white/10 rounded-[28px] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative text-slate-100 font-sans print:fixed print:inset-0 print:m-0 print:p-0 print:border-none print:rounded-none print:max-w-none print:max-h-none print:bg-white print:text-black print:overflow-visible print:z-[99999]"
        >
          {/* Modal Header Controls (Hidden on Print) */}
          <div className="p-4 sm:p-5 border-b border-white/10 bg-slate-950/80 flex items-center justify-between gap-3 flex-wrap print:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Voltar ao Histórico"
              >
                <ArrowLeft className="w-4 h-4 text-tech" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-tech bg-tech/15 border border-tech/30 px-2.5 py-0.5 rounded-full">
                    Auditoria & Telemetria Corporativa
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
                    {data.auditCode}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white font-display mt-0.5">
                  Relatório Executivo de Frotas & SLA
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Copiar Resumo para WhatsApp/Email"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={() => exportExecutiveSpreadsheet(data)}
                className="px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Exportar Excel Corporativo"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Excel (.CSV)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-tech text-slate-950 hover:brightness-110 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(209,160,84,0.3)] active:scale-95"
                title="Imprimir ou Salvar em PDF"
              >
                <Printer className="w-3.5 h-3.5 fill-current" />
                <span>Imprimir / Salvar PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer ml-1"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation (Hidden on Print) */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/5 bg-slate-950/40 print:hidden overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('executive')}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'executive'
                  ? 'border-tech text-tech'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Visão Executiva (C-Level)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'ledger'
                  ? 'border-tech text-tech'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Extrato Detalhado de Viagens ({data.routesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('esg')}
              className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'esg'
                  ? 'border-tech text-tech'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Sustentabilidade & ESG</span>
            </button>
          </div>

          {/* Document Content Body */}
          <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6 print:p-8 print:space-y-4 print:text-black">
            
            {/* Corporate Printable Header */}
            <div className="border-b-2 border-slate-700/80 pb-6 print:border-black flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-tech/20 border border-tech/40 flex items-center justify-center text-tech font-black text-xl tracking-tighter print:border-black print:text-black">
                  H
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white font-display uppercase tracking-tight print:text-black">
                    HARPIA TELEMETRIA & LOGÍSTICA
                  </h1>
                  <p className="text-xs text-slate-400 print:text-gray-700">
                    Sistemas Inteligentes de Roteirização Fluvial & Terrestre da Amazônia
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right text-xs text-slate-400 print:text-gray-700 space-y-0.5 font-mono">
                <div><strong className="text-slate-200 print:text-black">Autenticação:</strong> {data.auditCode}</div>
                <div><strong className="text-slate-200 print:text-black">Emissão:</strong> {data.generatedAt}</div>
                <div><strong className="text-slate-200 print:text-black">Escopo:</strong> {data.scopeTitle}</div>
              </div>
            </div>

            {/* C-Level Top KPI Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 print:grid-cols-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 print:border-gray-300 print:bg-gray-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-gray-600">SLA de Pontualidade</span>
                  <Clock className="w-4 h-4 text-tech print:text-black" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono print:text-black">
                  {data.slaPunctualityPercent}%
                </div>
                <div className="text-[10px] text-emerald-400 font-medium mt-1 print:text-emerald-700">
                  {data.timeDeviationMinutes <= 0 ? '✓ No prazo acordado' : `+${data.timeDeviationMinutes} min desvio`}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 print:border-gray-300 print:bg-gray-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-gray-600">Score Operacional</span>
                  <Award className="w-4 h-4 text-amber-400 print:text-black" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono print:text-black">
                  {data.operationalScorePercent}%
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-1 print:text-gray-600">
                  Índice de Eficiência VRP
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 print:border-gray-300 print:bg-gray-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-gray-600">Paradas & Entregas</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono print:text-black">
                  {data.completedStops} <span className="text-sm font-normal text-slate-400 print:text-gray-600">/ {data.totalStops}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-1 print:text-gray-600">
                  PODs Validados: {data.podComplianceRatePercent}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 print:border-gray-300 print:bg-gray-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider print:text-gray-600">Custo Combustível</span>
                  <Fuel className="w-4 h-4 text-blue-400 print:text-black" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white font-mono print:text-black">
                  R$ {data.totalFuelCostBRL.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-1 print:text-gray-600">
                  R$ {data.costPerStopBRL.toFixed(2)} por parada
                </div>
              </div>
            </div>

            {/* Executive Tab Content */}
            {(activeTab === 'executive' || typeof window !== 'undefined') && (
              <div className="space-y-6">
                {/* Variance & Performance Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-3 print:border-gray-300 print:bg-white">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-tech flex items-center gap-2 print:text-black">
                      <TrendingUp className="w-4 h-4" />
                      Auditoria de Deslocamento & Rotas
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-white/5 print:border-gray-200">
                        <span className="text-slate-400 print:text-gray-600">Distância Executada Total:</span>
                        <strong className="text-slate-200 font-mono print:text-black">{data.totalDistanceKm} km</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5 print:border-gray-200">
                        <span className="text-slate-400 print:text-gray-600">Tempo de Operação em Trânsito:</span>
                        <strong className="text-slate-200 font-mono print:text-black">{data.totalDurationHours} horas</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5 print:border-gray-200">
                        <span className="text-slate-400 print:text-gray-600">Rotas Terrestres / Fluviais:</span>
                        <strong className="text-slate-200 font-mono print:text-black">{data.landMilesKm} km terra / {data.fluvialMilesKm} km rio</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400 print:text-gray-600">Ocorrências & Incidentes Reportados:</span>
                        <strong className={`font-mono ${data.incidentsCount > 0 ? 'text-amber-400 print:text-amber-700' : 'text-emerald-400 print:text-emerald-700'}`}>
                          {data.incidentsCount} registros
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-3 print:border-gray-300 print:bg-white">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 print:text-black">
                      <Leaf className="w-4 h-4" />
                      Indicadores de Sustentabilidade & Eficiência
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-white/5 print:border-gray-200">
                        <span className="text-slate-400 print:text-gray-600">Combustível Consumido:</span>
                        <strong className="text-slate-200 font-mono print:text-black">{data.totalFuelLiters} Litros</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5 print:border-gray-200">
                        <span className="text-slate-400 print:text-gray-600">Economia Estimada por Otimização:</span>
                        <strong className="text-emerald-400 font-mono print:text-emerald-700">~{data.estimatedFuelSavedLiters} Litros</strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-white/5 print:border-gray-200">
                        <span className="text-slate-400 print:text-gray-600">Emissão Total de CO₂:</span>
                        <strong className="text-slate-200 font-mono print:text-black">{data.co2EmissionsKg} kg CO₂e</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400 print:text-gray-600">CO₂ Mitigado / Evitado:</span>
                        <strong className="text-emerald-400 font-mono print:text-emerald-700">~{data.co2AvoidedKg} kg CO₂e</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Route List Ledger Table */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 print:text-black">
                <Building2 className="w-4 h-4 text-tech print:text-black" />
                Demonstrativo Individual das Rotas Auditadas
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-white/10 print:border-gray-300">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px] tracking-wider print:bg-gray-100 print:text-black print:border-gray-300">
                      <th className="p-3">ID / Rota</th>
                      <th className="p-3">Veículo</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Paradas</th>
                      <th className="p-3">Distância</th>
                      <th className="p-3">Tempo Real</th>
                      <th className="p-3">SLA / Score</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-gray-200">
                    {data.routes.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                        <td className="p-3 font-bold text-white print:text-black">
                          {r.name || `Rota #${r.id || idx + 1}`}
                        </td>
                        <td className="p-3 text-slate-300 print:text-black">
                          {getVehicleLabel(r.vehicleType)}
                        </td>
                        <td className="p-3 text-slate-400 font-mono print:text-gray-700">
                          {new Date(r.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-mono text-slate-300 print:text-black">
                          {r.executionMetrics?.completedStopsCount || r.addresses.length} / {r.addresses.length}
                        </td>
                        <td className="p-3 font-mono text-slate-300 print:text-black">
                          {r.calculatedRoute?.distanceKm || r.totalDistanceKm || 0} km
                        </td>
                        <td className="p-3 font-mono text-slate-300 print:text-black">
                          {r.executionMetrics?.actualDurationMinutes || r.totalDurationMinutes || 0} min
                        </td>
                        <td className="p-3 font-mono font-bold text-tech print:text-black">
                          {r.finalScore || r.score || 95}%
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400 print:text-emerald-700'
                              : 'bg-amber-500/15 text-amber-400 print:text-amber-700'
                          }`}>
                            {r.status === 'completed' ? 'Concluída' : 'Parcial'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Corporate Compliance & Sign-off Block */}
            <div className="pt-8 border-t border-slate-700/80 print:border-black grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-400 print:text-black">
              <div className="space-y-12">
                <div className="border-b border-slate-700 print:border-black w-4/5 mx-auto" />
                <div className="font-bold text-slate-200 print:text-black">Despachante de Tráfego</div>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">Assinatura Digitalizada</div>
              </div>
              <div className="space-y-12">
                <div className="border-b border-slate-700 print:border-black w-4/5 mx-auto" />
                <div className="font-bold text-slate-200 print:text-black">Gerência de Operações</div>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">Conformidade SLA</div>
              </div>
              <div className="space-y-12">
                <div className="border-b border-slate-700 print:border-black w-4/5 mx-auto" />
                <div className="font-bold text-slate-200 print:text-black">Auditoria de Telemetria HARPIA</div>
                <div className="text-[10px] text-slate-500 print:text-gray-600 font-mono">Certificado Digital SHA-256</div>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
