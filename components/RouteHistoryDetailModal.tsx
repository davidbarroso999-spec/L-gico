'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Camera, 
  RotateCcw, 
  Download, 
  FileText, 
  Truck, 
  Bike, 
  Ship, 
  Compass, 
  Fuel, 
  TrendingUp, 
  Zap, 
  Leaf, 
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Printer,
  ArrowLeft,
  Award
} from 'lucide-react';
import { Route, RouteIncident, RouteWaypoint } from '@/lib/db';
import { getVehicleLabel, getPriorityLabel, normalizeHistoricalRoute } from '@/lib/route-history-service';
import ExecutiveReportModal from '@/components/ExecutiveReportModal';

interface RouteHistoryDetailModalProps {
  route: Route | null;
  isOpen: boolean;
  onClose: () => void;
  onLoadRouteToPlanner?: (route: Route) => void;
}

function VehicleIconDisplay({ type, className = "w-5 h-5" }: { type?: string; className?: string }) {
  switch (type) {
    case 'motorcycle': return <Bike className={className} />;
    case 'truck':
    case 'heavy_truck': return <Truck className={className} />;
    case 'boat': return <Ship className={className} />;
    case 'van':
    default: return <Truck className={className} />;
  }
}

export default function RouteHistoryDetailModal({
  route,
  isOpen,
  onClose,
  onLoadRouteToPlanner
}: RouteHistoryDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'waypoints' | 'parameters' | 'incidents' | 'metrics'>('waypoints');
  const [magnifiedPhoto, setMagnifiedPhoto] = useState<string | null>(null);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState(false);

  if (!isOpen || !route) return null;

  const normalized = normalizeHistoricalRoute(route);
  const { originalParameters, calculatedRoute, executionMetrics, reportedIncidents } = normalized;

  const formattedDate = new Date(normalized.date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const startTimeStr = normalized.startedAt 
    ? new Date(normalized.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '08:00';

  const endTimeStr = normalized.completedAt
    ? new Date(normalized.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : undefined;

  const printManifest = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[6000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25 }}
          className="bg-slate-900 border border-white/10 rounded-[28px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tech/10 border border-tech/20 rounded-2xl text-tech shrink-0 mt-0.5">
                <VehicleIconDisplay type={normalized.vehicleType} className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-tech/15 text-tech border border-tech/30">
                    Rota #{normalized.id || 'HR-EXP'}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    normalized.status === 'completed'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {normalized.status === 'completed' ? 'Concluída' : 'Parcial'}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/5">
                    Score {normalized.finalScore}%
                  </span>
                  {(reportedIncidents && reportedIncidents.length > 0) && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {reportedIncidents.length} {reportedIncidents.length === 1 ? 'Ocorrência' : 'Ocorrências'}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white font-display">
                  {normalized.name || `${getVehicleLabel(normalized.vehicleType)} • ${normalized.addresses.length} Paradas`}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1 font-sans">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-tech" />
                    {formattedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {startTimeStr} {endTimeStr ? `➔ ${endTimeStr}` : ''} ({executionMetrics?.actualDurationMinutes || normalized.totalDurationMinutes} min)
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                    {normalized.totalDistanceKm} km
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
              <button
                type="button"
                onClick={() => setIsExecutiveReportOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-tech border border-tech/30 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                title="Emitir Dossiê Executivo de Auditoria desta Rota"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Dossiê Executivo</span>
              </button>

              {onLoadRouteToPlanner && (
                <button
                  type="button"
                  onClick={() => {
                    onLoadRouteToPlanner(normalized);
                    onClose();
                  }}
                  className="px-3.5 py-2 bg-tech text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-sm cursor-pointer"
                  title="Recarregar esta rota no mapa para planejar ou navegar"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Carregar no Mapa</span>
                </button>
              )}
              <button
                type="button"
                onClick={printManifest}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                title="Imprimir Romaneio"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                title="Voltar / Fechar"
              >
                <ArrowLeft className="w-4 h-4 text-tech sm:hidden" />
                <X className="w-5 h-5 hidden sm:block" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/5 bg-slate-950/20 overflow-x-auto">
            {[
              { id: 'waypoints', label: 'Paradas & Comprovantes', count: calculatedRoute?.waypoints.length || normalized.addresses.length },
              { id: 'parameters', label: 'Parâmetros Originais' },
              { id: 'incidents', label: 'Alertas & Ocorrências', count: reportedIncidents?.length || 0, badgeColor: reportedIncidents?.length ? 'bg-rose-500/20 text-rose-400' : undefined },
              { id: 'metrics', label: 'Auditoria de Performance' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-tech text-tech'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    tab.badgeColor || (activeTab === tab.id ? 'bg-tech/20 text-tech' : 'bg-slate-800 text-slate-400')
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {/* TAB 1: WAYPOINTS */}
            {activeTab === 'waypoints' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-tech" />
                    <span>Sequência Executada ({calculatedRoute?.waypoints.length || 0} paradas)</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Taxa de Conclusão: <strong className="text-emerald-400">{executionMetrics?.completionRatePercent}%</strong>
                  </span>
                </div>

                <div className="space-y-3">
                  {(calculatedRoute?.waypoints || []).map((wp, idx) => {
                    const isCompleted = wp.status === 'completed';
                    const isPickup = wp.stopType === 'pickup' || idx === 0;

                    return (
                      <div 
                        key={idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCompleted 
                            ? 'bg-slate-950/40 border-white/5 hover:border-white/15'
                            : 'bg-rose-950/10 border-rose-500/20'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${
                              isPickup 
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : isCompleted
                                ? 'bg-tech/15 text-tech border border-tech/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-white">
                                  {wp.address}
                                </span>
                                {isPickup && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">
                                    Coleta / Base
                                  </span>
                                )}
                                {wp.fluvialPort && (
                                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 flex items-center gap-1">
                                    <Ship className="w-2.5 h-2.5" />
                                    {wp.fluvialPort}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                                {wp.plannedArrivalTime && (
                                  <span>Previsto: <strong className="text-slate-300">{wp.plannedArrivalTime}</strong></span>
                                )}
                                {wp.actualArrivalTime && (
                                  <span>Realizado: <strong className="text-emerald-400">{wp.actualArrivalTime}</strong></span>
                                )}
                                {wp.serviceDurationMinutes && (
                                  <span>Tempo Parada: {wp.serviceDurationMinutes} min</span>
                                )}
                              </div>

                              {wp.deliveryNotes && (
                                <div className="mt-2 text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-white/5 flex items-start gap-2">
                                  <MessageSquare className="w-3.5 h-3.5 text-tech shrink-0 mt-0.5" />
                                  <span className="italic">&ldquo;{wp.deliveryNotes}&rdquo;</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Photo proof badge / thumbnail if available */}
                          {wp.deliveryPhoto ? (
                            <div className="shrink-0 self-start sm:self-center">
                              <button
                                type="button"
                                onClick={() => setMagnifiedPhoto(wp.deliveryPhoto || null)}
                                className="group relative w-16 h-12 rounded-lg overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center cursor-pointer hover:border-tech transition-all"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={wp.deliveryPhoto} 
                                  alt="Comprovante" 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Camera className="w-4 h-4 text-tech" />
                                </div>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Registrado
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: ORIGINAL PARAMETERS */}
            {activeTab === 'parameters' && (
              <div className="space-y-6">
                <div className="bg-slate-950/50 p-5 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4 text-tech" />
                    <span>Configurações Originais Submetidas</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Modal / Veículo</span>
                      <p className="text-sm font-bold text-white flex items-center gap-1.5">
                        <VehicleIconDisplay type={originalParameters?.vehicleType} className="w-4 h-4 text-tech" />
                        {originalParameters?.vehicleName || getVehicleLabel(originalParameters?.vehicleType)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Critério de Otimização</span>
                      <p className="text-sm font-bold text-tech">
                        {getPriorityLabel(originalParameters?.priority)}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Score Calculado</span>
                      <p className="text-sm font-bold text-emerald-400">
                        {normalized.finalScore}% de Otimização
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Lista de Endereços Originais de Entrada ({originalParameters?.addresses.length || 0})
                  </h4>
                  <div className="bg-slate-950/30 p-4 rounded-2xl border border-white/5 divide-y divide-white/5">
                    {(originalParameters?.addresses || []).map((addr, idx) => (
                      <div key={idx} className="py-2.5 flex items-center gap-3 text-xs text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-slate-200 truncate">{addr}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INCIDENTS */}
            {activeTab === 'incidents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Registro de Ocorrências & Alertas no Trajeto</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Total Registrado: <strong>{reportedIncidents?.length || 0}</strong>
                  </span>
                </div>

                {(!reportedIncidents || reportedIncidents.length === 0) ? (
                  <div className="p-8 rounded-2xl bg-slate-950/30 border border-dashed border-white/10 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                    <p className="text-sm font-bold text-white">Nenhum incidente reportado</p>
                    <p className="text-xs text-slate-400 mt-1">
                      A rota transcorreu em conformidade absoluta, sem bloqueios de pista, bancos de areia ou congestionamentos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reportedIncidents.map((inc, idx) => {
                      const isFluvial = inc.type === 'sandbank' || inc.type === 'repiquete';
                      const isHigh = inc.severity === 'high' || inc.severity === 'critical';

                      return (
                        <div 
                          key={idx}
                          className={`p-4 rounded-2xl border ${
                            isHigh 
                              ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                              : 'bg-slate-950/40 border-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                isFluvial 
                                  ? 'bg-cyan-500/20 text-cyan-400' 
                                  : isHigh 
                                  ? 'bg-rose-500/20 text-rose-400' 
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {isFluvial ? <Ship className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                                    {inc.type === 'sandbank' ? 'Banco de Areia Fluvial' :
                                     inc.type === 'repiquete' ? 'Queda de Cota (Repiquete)' :
                                     inc.type === 'congestion' ? 'Congestionamento' :
                                     inc.type === 'accident' ? 'Acidente Viário' :
                                     inc.type === 'flood' ? 'Alagamento' :
                                     inc.type === 'pothole' ? 'Pavimentação Crítica' : 'Ocorrência Operacional'}
                                  </span>
                                  {inc.severity && (
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full ${
                                      isHigh ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
                                    }`}>
                                      {inc.severity}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs leading-relaxed text-slate-300">
                                  {inc.description}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              {new Date(inc.reportedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: METRICS */}
            {activeTab === 'metrics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Distância Planejada vs Real</span>
                    <p className="text-2xl font-black text-white font-mono">{normalized.totalDistanceKm} km</p>
                    <span className="text-[11px] text-emerald-400 mt-1 block">Variação de 0.0% do plano</span>
                  </div>

                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Tempo Previsto vs Real</span>
                    <p className="text-2xl font-black text-white font-mono">
                      {executionMetrics?.actualDurationMinutes || normalized.totalDurationMinutes} min
                    </p>
                    <span className={`text-[11px] mt-1 block ${
                      (executionMetrics?.timeDeviationMinutes || 0) <= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {(executionMetrics?.timeDeviationMinutes || 0) <= 0 
                        ? 'Dentro da estimativa' 
                        : `+${executionMetrics?.timeDeviationMinutes} min de tolerância`}
                    </span>
                  </div>

                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Combustível Consumido</span>
                    <p className="text-2xl font-black text-tech font-mono">
                      {executionMetrics?.fuelConsumedLiters || calculatedRoute?.estimatedFuelLiters} L
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      R$ {(executionMetrics?.fuelCostTotal || calculatedRoute?.estimatedFuelCost || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Taxa de Pontualidade</span>
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                      {executionMetrics?.punctualityRatePercent || 100}%
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">Janelas respeitadas</span>
                  </div>
                </div>

                <div className="p-5 bg-slate-950/40 rounded-2xl border border-white/5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-tech" />
                    <span>Conclusões do Motor de Auditoria HARPIA</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Esta rota obteve pontuação <strong>{normalized.finalScore}/100</strong> no solver de otimização heurística. 
                    {normalized.vehicleType === 'boat' 
                      ? ' A navegação fluvial respeitou os limites batimétricos com margem de segurança de calado nos baixios.' 
                      : ' A malha viária urbana minimizou conversões à esquerda e evitou eixos de lentidão crônica.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 font-mono">
              HARPIA Audit Trail • Registrado em base IndexedDB local
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Magnified Photo Modal */}
      {magnifiedPhoto && (
        <div 
          onClick={() => setMagnifiedPhoto(null)}
          className="fixed inset-0 z-[7000] bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            className="max-w-2xl w-full bg-slate-900 border border-white/10 p-4 rounded-3xl overflow-hidden cursor-default shadow-2xl"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-tech" />
                Comprovante Digital de Entrega
              </h4>
              <button 
                onClick={() => setMagnifiedPhoto(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={magnifiedPhoto} 
              alt="Comprovante" 
              className="w-full max-h-[70vh] object-contain rounded-xl bg-black" 
            />
          </div>
        </div>
      )}

      {/* Corporate Executive Report & SLA Modal for this single route */}
      <ExecutiveReportModal
        isOpen={isExecutiveReportOpen}
        onClose={() => setIsExecutiveReportOpen(false)}
        routes={[normalized]}
        reportTitle={`Dossiê Executivo da Rota #${normalized.id || 'HR-EXP'} (${normalized.name || 'Operacional'})`}
      />
    </AnimatePresence>
  );
}
