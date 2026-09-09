'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  MapPin, 
  TrendingUp, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Download, 
  RotateCcw, 
  Truck, 
  Bike, 
  Ship, 
  Fuel, 
  Coins, 
  Sliders, 
  Eye, 
  Camera, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  FileText,
  ChevronDown,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Award,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { db, Route } from '@/lib/db';
import { 
  DateFilterOption, 
  RouteHistoryFilter, 
  filterRoutes, 
  computeAggregatePerformanceMetrics, 
  normalizeHistoricalRoute, 
  getVehicleLabel, 
  getPriorityLabel, 
  exportHistoryToCSV, 
  exportHistoryToJSON 
} from '@/lib/route-history-service';
import RouteHistoryDetailModal from '@/components/RouteHistoryDetailModal';
import ExecutiveReportModal from '@/components/ExecutiveReportModal';

interface RouteHistoryViewProps {
  onLoadRouteToPlanner?: (route: Route) => void;
  onNavigateToPlanner?: () => void;
}

export default function RouteHistoryView({
  onLoadRouteToPlanner,
  onNavigateToPlanner
}: RouteHistoryViewProps) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState<boolean>(false);
  const [reportModalRoutes, setReportModalRoutes] = useState<Route[]>([]);
  const [reportModalTitle, setReportModalTitle] = useState<string>('');
  const [showDeleteConfirmId, setShowDeleteConfirmId] = useState<number | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Filters State
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Load all routes from Dexie DB on mount or when refreshTrigger increments
  useEffect(() => {
    let ignore = false;

    const fetchRoutes = async () => {
      try {
        const all = await db.routes.toArray();
        // Sort newest first
        all.sort((a, b) => {
          const timeA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.date).getTime();
          const timeB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.date).getTime();
          return timeB - timeA;
        });
        if (!ignore) {
          setRoutes(all.map(normalizeHistoricalRoute));
          setIsLoading(false);
        }
      } catch (err) {
        console.warn("Falha ao carregar histórico de rotas:", err);
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchRoutes();

    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  const reloadRoutes = () => {
    setIsLoading(true);
    setRefreshTrigger(prev => prev + 1);
  };

  const triggerToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 3000);
  };

  // Delete route
  const handleDeleteRoute = async (id?: number) => {
    if (!id) return;
    try {
      await db.routes.delete(id);
      setShowDeleteConfirmId(null);
      reloadRoutes();
      triggerToast(`Rota #${id} excluída do histórico.`);
    } catch (err) {
      console.warn("Erro ao excluir rota:", err);
    }
  };

  // Filtered routes calculation
  const filterParams: RouteHistoryFilter = useMemo(() => ({
    dateFilter,
    customStartDate: customStartDate || undefined,
    customEndDate: customEndDate || undefined,
    searchQuery: searchQuery || undefined,
    vehicleType: vehicleTypeFilter,
    priority: priorityFilter,
    status: statusFilter
  }), [dateFilter, customStartDate, customEndDate, searchQuery, vehicleTypeFilter, priorityFilter, statusFilter]);

  const filteredRoutes = useMemo(() => {
    return filterRoutes(routes, filterParams);
  }, [routes, filterParams]);

  // Aggregate Metrics over filtered routes
  const metrics = useMemo(() => {
    return computeAggregatePerformanceMetrics(filteredRoutes);
  }, [filteredRoutes]);

  const getVehicleIcon = (type?: string) => {
    switch (type) {
      case 'motorcycle': return Bike;
      case 'truck':
      case 'heavy_truck': return Truck;
      case 'boat': return Ship;
      case 'van':
      default: return Truck;
    }
  };

  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-32">
      {/* Toast Notification */}
      <AnimatePresence>
        {notificationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[7000] bg-tech/95 text-slate-950 px-4 py-2.5 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2 border border-black/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{notificationToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar with Back-to-Menu Button */}
      {onNavigateToPlanner && (
        <div className="mb-6">
          <button
            type="button"
            onClick={onNavigateToPlanner}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 hover:border-tech/40 text-xs font-bold transition-all cursor-pointer shadow-sm group active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-tech group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar ao Menu Principal</span>
          </button>
        </div>
      )}

      {/* Header Section */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black tracking-widest text-tech bg-tech/10 px-3 py-1 rounded-full uppercase inline-flex items-center gap-1.5 border border-tech/20">
              <Clock className="w-3 h-3" />
              Módulo de Auditoria & Performance
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-white/5 font-mono">
              {filteredRoutes.length} {filteredRoutes.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 font-display">
            Histórico Detalhado de Rotas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Acompanhe a evolução de todas as viagens concluídas, analise desvios de tempo e distância, rastreie incidentes reportados e exporte relatórios operacionais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Executive Corporate Report Button */}
          <button
            type="button"
            onClick={() => {
              setReportModalRoutes(filteredRoutes);
              setReportModalTitle(`Auditoria Executiva de Frotas (${filteredRoutes.length} Rotas)`);
              setIsExecutiveReportOpen(true);
            }}
            disabled={filteredRoutes.length === 0}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(209,160,84,0.15)] active:scale-95 ${
              filteredRoutes.length > 0
                ? 'bg-tech text-slate-950 hover:brightness-110 cursor-pointer'
                : 'bg-tech/30 text-slate-800 border border-tech/20 cursor-not-allowed'
            }`}
            title="Gerar Relatório Executivo Completo com SLA e ESG (Padrão Samsara/Geotab)"
          >
            <Award className="w-4 h-4 fill-current" />
            <span>Relatório Executivo (PDF/Excel)</span>
          </button>

          {routes.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm("Tem certeza que deseja limpar todo o histórico de rotas?")) {
                  try {
                    const all = await db.routes.toArray();
                    for (const r of all) {
                      if (r.id) await db.routes.delete(r.id);
                    }
                    reloadRoutes();
                    triggerToast("Histórico de rotas limpo com sucesso.");
                  } catch (e) {
                    console.error(e);
                  }
                }
              }}
              className="px-3.5 py-2.5 bg-slate-900/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Excluir todas as rotas do histórico"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Histórico</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => exportHistoryToCSV(filteredRoutes)}
            disabled={filteredRoutes.length === 0}
            className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              filteredRoutes.length > 0
                ? 'bg-slate-900 hover:bg-slate-850 text-white border border-white/10 hover:border-tech/40 cursor-pointer'
                : 'bg-slate-900/40 text-slate-600 border border-white/5 cursor-not-allowed'
            }`}
            title="Exportar dados brutos em CSV"
          >
            <Download className="w-3.5 h-3.5 text-tech" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={() => exportHistoryToJSON(filteredRoutes)}
            disabled={filteredRoutes.length === 0}
            className={`px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              filteredRoutes.length > 0
                ? 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-white/10 cursor-pointer'
                : 'bg-slate-900/40 text-slate-600 border border-white/5 cursor-not-allowed'
            }`}
            title="Exportar JSON completo"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={reloadRoutes}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 rounded-2xl transition-all cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-tech' : ''}`} />
          </button>
        </div>
      </header>

      {/* Analytical KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rotas & Paradas</span>
          <p className="text-2xl font-black text-white font-mono leading-none">
            {metrics.totalRoutes} <span className="text-xs font-normal text-slate-400">/ {metrics.totalStops}</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-2 block">
            {metrics.completedStops} entregas feitas
          </span>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Taxa de Sucesso</span>
          <p className="text-2xl font-black text-emerald-400 font-mono leading-none">
            {metrics.overallSuccessRatePercent}%
          </p>
          <span className="text-[10px] text-slate-400 mt-2 block">
            {metrics.failedStops === 0 ? 'Zero falhas no período' : `${metrics.failedStops} paradas frustradas`}
          </span>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Quilometragem Total</span>
          <p className="text-2xl font-black text-tech font-mono leading-none">
            {metrics.totalDistanceKm} <span className="text-xs font-normal text-slate-400">km</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-2 block">
            Média: {metrics.averageDistanceKm} km/rota
          </span>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pontualidade & Tempo</span>
          <p className="text-2xl font-black text-slate-200 font-mono leading-none">
            {metrics.punctualityRatePercent}%
          </p>
          <span className="text-[10px] text-slate-400 mt-2 block">
            Média {metrics.averageDurationMinutes} min / rota
          </span>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Combustível Total</span>
          <p className="text-2xl font-black text-amber-400 font-mono leading-none">
            {metrics.totalFuelLiters} <span className="text-xs font-normal text-slate-400">L</span>
          </p>
          <span className="text-[10px] text-slate-400 mt-2 block">
            R$ {metrics.totalFuelCostBRL.toFixed(2)} gastos
          </span>
        </div>

        <div className="glass p-4 rounded-2xl border border-white/5 relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Incidentes & Alertas</span>
          <p className={`text-2xl font-black font-mono leading-none ${
            metrics.totalIncidentsCount > 0 ? 'text-rose-400' : 'text-slate-500'
          }`}>
            {metrics.totalIncidentsCount}
          </p>
          <span className="text-[10px] text-slate-400 mt-2 block">
            em {metrics.routesWithIncidentsCount} {metrics.routesWithIncidentsCount === 1 ? 'viagem' : 'viagens'}
          </span>
        </div>
      </div>

      {/* Visual Analytics Graphs & Distributions */}
      {filteredRoutes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Daily Delivery Trend Card */}
          <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-tech" />
                  <span>Histórico de Atividade por Data</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Últimos Registros</span>
              </div>
              
              <div className="space-y-2 mt-3">
                {metrics.dailyTrends.slice(-5).map((d) => (
                  <div key={d.date} className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs">
                    <span className="font-mono text-slate-300 text-[11px] shrink-0 font-bold">{d.displayDate}</span>
                    <div className="flex-1 max-w-[140px] bg-slate-950 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-tech h-full rounded-full" 
                        style={{ width: `${Math.min(100, Math.max(15, (d.stopsCount / (metrics.totalStops || 1)) * 100))}%` }} 
                      />
                    </div>
                    <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
                      <span className="text-white font-bold">{d.stopsCount}</span> paradas • {d.distanceKm} km
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-white/5">
              💡 Desempenho com alta conformidade nas rotas urbanas e fluviais calculadas.
            </p>
          </div>

          {/* Modal / Vehicle Breakdown */}
          <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-tech" />
                  <span>Distribuição por Tipo de Veículo</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">Frota Operante</span>
              </div>

              <div className="space-y-2.5 mt-3">
                {metrics.vehicleDistribution.map((item) => {
                  const Icon = getVehicleIcon(item.type);
                  return (
                    <div key={item.type} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Icon className="w-3.5 h-3.5 text-tech shrink-0" />
                          {item.label}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {item.count} rotas ({item.percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-tech h-full rounded-full transition-all" 
                          style={{ width: `${item.percent}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-white/5">
              Integração simultânea de rotas terrestres e navegação fluvial da Amazônia.
            </p>
          </div>

          {/* Incidents & Hotspots Radar */}
          <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Tipos de Ocorrências Históricas</span>
                </h3>
                <span className="text-[10px] text-rose-400/80 font-mono font-bold">
                  {metrics.totalIncidentsCount} eventos
                </span>
              </div>

              {metrics.incidentTypesDistribution.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-white/5 text-center flex flex-col items-center justify-center my-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mb-1" />
                  <p className="text-xs font-bold text-slate-300">Nenhuma restrição registrada</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Todas as viagens ocorreram sem imprevistos.</p>
                </div>
              ) : (
                <div className="space-y-2 mt-3">
                  {metrics.incidentTypesDistribution.map((item) => (
                    <div key={item.type} className="bg-rose-950/20 border border-rose-500/20 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-rose-300 font-bold flex items-center gap-2 truncate">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 shrink-0 font-bold">
                        {item.count} {item.count === 1 ? 'vez' : 'vezes'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-white/5">
              Incidentes alimentam automaticamente o motor de desvios proativos.
            </p>
          </div>
        </div>
      )}

      {/* Filter Control Bar */}
      <div className="glass p-4 rounded-2xl border border-white/5 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Date Range Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Período:
            </span>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'today', label: 'Hoje' },
              { id: 'yesterday', label: 'Ontem' },
              { id: 'last_7_days', label: 'Últimos 7 dias' },
              { id: 'last_30_days', label: 'Últimos 30 dias' },
              { id: 'this_month', label: 'Este Mês' },
              { id: 'custom', label: 'Personalizado' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  dateFilter === f.id
                    ? 'bg-tech text-slate-950 font-black shadow-sm'
                    : 'bg-slate-900/70 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar endereço, id, motorista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-tech transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Inputs if Custom is selected */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/5">
            <span className="text-xs text-slate-400 font-bold">De:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-tech"
            />
            <span className="text-xs text-slate-400 font-bold">Até:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-tech"
            />
            {(customStartDate || customEndDate) && (
              <button
                onClick={() => {
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-xs text-tech hover:underline ml-2"
              >
                Limpar datas
              </button>
            )}
          </div>
        )}

        {/* Dropdown filters for Vehicle, Priority, Status */}
        <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Veículo:</span>
            <select
              value={vehicleTypeFilter}
              onChange={(e) => setVehicleTypeFilter(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1 text-xs text-slate-300 focus:outline-none focus:border-tech cursor-pointer"
            >
              <option value="all">Todos os Veículos</option>
              <option value="van">Utilitário / Van</option>
              <option value="motorcycle">Moto Express</option>
              <option value="truck">Caminhão Médio</option>
              <option value="heavy_truck">Carreta Pesada</option>
              <option value="boat">Embarcação Fluvial</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Critério:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1 text-xs text-slate-300 focus:outline-none focus:border-tech cursor-pointer"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="balanced">Equilibrada</option>
              <option value="speed">Mais Rápida</option>
              <option value="economy">Econômica</option>
              <option value="distance">Menor Distância</option>
              <option value="safety">Segurança Máxima</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Filtro de Alertas:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1 text-xs text-slate-300 focus:outline-none focus:border-tech cursor-pointer"
            >
              <option value="all">Todos os Status</option>
              <option value="with_incidents">Apenas com Ocorrências</option>
              <option value="completed">Concluídas com Sucesso</option>
            </select>
          </div>
        </div>
      </div>

      {/* Route History List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="glass p-12 rounded-[28px] text-center flex flex-col items-center justify-center border border-white/5">
            <RefreshCw className="w-8 h-8 text-tech animate-spin mb-3" />
            <h4 className="text-sm font-bold text-white">Carregando histórico do banco local...</h4>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="glass p-12 rounded-[28px] text-center flex flex-col items-center justify-center border border-dashed border-white/10 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white mb-1">Nenhuma rota encontrada</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {routes.length === 0 
                  ? "Nenhuma rota foi finalizada ainda. Conclua uma rota na tela de navegação para registrar a telemetria e o histórico operacional."
                  : "Tente redefinir o período ou os termos de busca para encontrar registros anteriores."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredRoutes.map((route) => {
              const VehicleIcon = getVehicleIcon(route.vehicleType);
              const formattedDate = new Date(route.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });

              const startTimeStr = route.startedAt 
                ? new Date(route.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : '08:00';

              const endTimeStr = route.completedAt 
                ? new Date(route.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : undefined;

              const incidentsCount = (route.reportedIncidents || []).length;
              const addressesCount = route.addresses.length;
              const firstAddress = route.addresses[0] || 'Origem';
              const lastAddress = route.addresses[addressesCount - 1] || 'Destino';

              return (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass p-4 sm:p-5 rounded-2xl border border-white/5 hover:border-tech/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  {/* Left Column: Core Info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="p-3 bg-slate-900 border border-white/10 rounded-xl text-tech shrink-0 mt-1 group-hover:border-tech/40 transition-colors">
                      <VehicleIcon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-tech/15 text-tech border border-tech/30">
                          #{route.id || 'HR'}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {getVehicleLabel(route.vehicleType)}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {getPriorityLabel(route.priority)}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                          Score {route.finalScore}%
                        </span>
                        {incidentsCount > 0 && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 font-mono">
                            <AlertTriangle className="w-3 h-3" />
                            {incidentsCount} {incidentsCount === 1 ? 'Alerta' : 'Alertas'}
                          </span>
                        )}
                      </div>

                      {/* Origin ➔ Destination Breadcrumb */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 truncate">
                        <MapPin className="w-3.5 h-3.5 text-tech shrink-0" />
                        <span className="truncate font-semibold text-white">{firstAddress}</span>
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate text-slate-300">{lastAddress}</span>
                        {addressesCount > 2 && (
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            (+{addressesCount - 2} paradas)
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-sans">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formattedDate} • {startTimeStr} {endTimeStr ? `➔ ${endTimeStr}` : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-slate-500" />
                          {route.totalDistanceKm} km
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {route.executionMetrics?.actualDurationMinutes || route.totalDurationMinutes} min
                        </span>
                        {route.executionMetrics?.fuelConsumedLiters && (
                          <span className="flex items-center gap-1 text-amber-400/90 font-mono">
                            <Fuel className="w-3 h-3" />
                            {route.executionMetrics.fuelConsumedLiters}L
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Actions & Details */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Proof thumbnail preview if present */}
                    {route.deliveryPhoto && (
                      <div 
                        className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 bg-slate-950 shrink-0 cursor-pointer"
                        onClick={() => {
                          setSelectedRoute(route);
                          setIsDetailModalOpen(true);
                        }}
                        title="Ver foto do comprovante"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={route.deliveryPhoto} 
                          alt="Comprovante" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setReportModalRoutes([route]);
                        setReportModalTitle(`Dossiê Executivo da Rota #${route.id} (${route.name || 'Operacional'})`);
                        setIsExecutiveReportOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-tech hover:text-white border border-tech/30 transition-all cursor-pointer shadow-sm"
                      title="Emitir Dossiê Executivo Individual (PDF/Excel)"
                    >
                      <Award className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRoute(route);
                        setIsDetailModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-white/10 hover:border-tech/40 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-tech" />
                      <span>Auditoria & Detalhes</span>
                    </button>

                    {onLoadRouteToPlanner && (
                      <button
                        type="button"
                        onClick={() => {
                          onLoadRouteToPlanner(route);
                          triggerToast(`Rota #${route.id} carregada no planejador.`);
                        }}
                        className="p-2 rounded-xl bg-tech/15 text-tech hover:bg-tech hover:text-slate-950 transition-all cursor-pointer"
                        title="Recarregar esta rota no mapa para planejar ou navegar"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

                    {showDeleteConfirmId === route.id ? (
                      <div className="flex items-center gap-1 bg-rose-950/40 p-1 rounded-xl border border-rose-500/30">
                        <button
                          type="button"
                          onClick={() => handleDeleteRoute(route.id)}
                          className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirmId(null)}
                          className="px-1.5 py-1 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirmId(route.id || null)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                        title="Excluir rota do histórico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deep-Dive Inspection Modal */}
      <RouteHistoryDetailModal
        route={selectedRoute}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedRoute(null);
        }}
        onLoadRouteToPlanner={onLoadRouteToPlanner}
      />

      {/* Corporate Executive Report & SLA Modal */}
      <ExecutiveReportModal
        isOpen={isExecutiveReportOpen}
        onClose={() => {
          setIsExecutiveReportOpen(false);
          setReportModalRoutes([]);
          setReportModalTitle('');
        }}
        routes={reportModalRoutes.length > 0 ? reportModalRoutes : filteredRoutes}
        reportTitle={reportModalTitle || `Auditoria de Desempenho & Frotas (${filteredRoutes.length} Rotas)`}
      />
    </div>
  );
}
