'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Package, 
  Clock, 
  ShieldAlert, 
  Camera, 
  Calendar, 
  Eye, 
  MessageSquare, 
  MapPin, 
  XCircle, 
  CheckCircle2,
  Truck,
  HelpCircle,
  Download,
  Fuel,
  Coins,
  BookOpen,
  Bike
} from 'lucide-react';
import { db } from '@/lib/db';
import InfoTooltip from '@/components/InfoTooltip';

interface KpiDashboardProps {
  activeRoute?: any;
}

export default function KpiDashboard({ activeRoute }: KpiDashboardProps = {}) {
  const [completedRoutes, setCompletedRoutes] = useState<any[]>([]);
  const [localOccurrencesCount, setLocalOccurrencesCount] = useState(0);

  // States for expanding and viewing package receipts
  const [magnifiedPhoto, setMagnifiedPhoto] = useState<string | null>(null);
  const [magnifiedNotes, setMagnifiedNotes] = useState<string>('');
  const [magnifiedAddress, setMagnifiedAddress] = useState<string>('');
  const [magnifiedAt, setMagnifiedAt] = useState<string>('');

  // Simplified and intuitive vehicle settings
  const [vehicleType, setVehicleType] = useState<'motorcycle' | 'van' | 'truck' | 'heavy_truck'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('harpia_vehicle_settings_simple');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.vehicleType) return parsed.vehicleType;
        }
      } catch (e) {}
    }
    return 'van';
  });

  const [kmPerLiter, setKmPerLiter] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('harpia_vehicle_settings_simple');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.kmPerLiter !== undefined) return Number(parsed.kmPerLiter);
        }
      } catch (e) {}
    }
    return 14.5;
  });

  const [fuelPrice, setFuelPrice] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('harpia_vehicle_settings_simple');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fuelPrice !== undefined) return Number(parsed.fuelPrice);
        }
      } catch (e) {}
    }
    return 5.85;
  });

  const [showSavedToast, setShowSavedToast] = useState(false);
  const [manualDistance, setManualDistance] = useState<number | null>(null);

  // Poll completed routes and occurrences from Dexie local database
  useEffect(() => {
    let active = true;
    const loadLogs = async () => {
      try {
        const routes = await db.routes.where('status').equals('completed').toArray();
        routes.sort((a, b) => {
          const tA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.date).getTime();
          const tB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.date).getTime();
          return tB - tA;
        });
        const cnt = await db.occurrences.count();
        if (active) {
          setCompletedRoutes(routes);
          setLocalOccurrencesCount(cnt);
        }
      } catch (err) {
        console.warn("Falha ao sincronizar métricas:", err);
      }
    };
    loadLogs();
    const interval = setInterval(loadLogs, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Save configurations locally on change
  const saveConfig = (type: 'motorcycle' | 'van' | 'truck' | 'heavy_truck', kml: number, price: number) => {
    setVehicleType(type);
    setKmPerLiter(kml);
    setFuelPrice(price);
    
    localStorage.setItem('harpia_vehicle_settings_simple', JSON.stringify({
      vehicleType: type,
      kmPerLiter: kml,
      fuelPrice: price
    }));
  };

  // Pre-load default values for each vehicle type preset
  const handleVehicleTypePreset = (type: 'motorcycle' | 'van' | 'truck' | 'heavy_truck') => {
    let defaultKml = 14.5;
    if (type === 'motorcycle') defaultKml = 42.0;
    if (type === 'van') defaultKml = 14.5;
    if (type === 'truck') defaultKml = 9.2;
    if (type === 'heavy_truck') defaultKml = 4.1;

    saveConfig(type, defaultKml, fuelPrice);
    
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const exportToCSV = () => {
    if (completedRoutes.length === 0) return;

    const headers = [
      'ID Rota',
      'Data Inicio',
      'Data Conclusao',
      'Qtd Paradas',
      'Score Integridade (%)',
      'Enderecos (Sequencia)',
      'Anotacoes de Entrega',
      'Status'
    ];

    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return '';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (/[",;\n\r]/.test(str)) {
        str = `"${str}"`;
      }
      return str;
    };

    const rows = completedRoutes.map(route => {
      const addressesStr = (route.addresses || []).join(' -> ');
      const dateStart = route.date ? new Date(route.date).toISOString() : '';
      const dateEnd = route.completedAt ? new Date(route.completedAt).toISOString() : '';
      
      return [
        route.id || '',
        dateStart,
        dateEnd,
        (route.addresses || []).length,
        route.score || '',
        addressesStr,
        route.deliveryNotes || '',
        route.status || ''
      ].map(escapeCSV).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_de_entregas_harpia_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Core Math - Using manual override if set, activeRoute summary distance if active, or base completed routes + fallback
  const activeRouteDistance = (activeRoute && activeRoute.summary?.distance)
    ? (activeRoute.summary.distance / 1000)
    : completedRoutes.reduce((acc, route) => acc + (route.totalDistanceKm || 15.4), 124.8);

  const roundedKm = manualDistance !== null ? manualDistance : Math.round(activeRouteDistance * 10) / 10;

  // Crucial Simplified Business Math:
  // Fuel consumed in liters = overall km / (how many km the car makes with 1 Liter)
  const safeKml = kmPerLiter > 0 ? kmPerLiter : 1;
  const estimatedLiters = Math.round((roundedKm / safeKml) * 10) / 10;
  const estimatedFuelTotalCost = Math.round(estimatedLiters * fuelPrice * 100) / 100;

  // Simple Key Perfomance Cards
  const kpis = [
    { 
      label: 'Quilometragem Planejada', 
      value: `${roundedKm.toLocaleString('pt-BR')} km`, 
      icon: TrendingUp, 
      color: 'text-tech', 
      description: 'Distância simulada e monitorada das rotas.' 
    },
    { 
      label: 'Entregas Concluídas', 
      value: completedRoutes.length > 0 ? String(completedRoutes.length) : '0', 
      icon: Package, 
      color: 'text-accent', 
      description: 'Encomendas integradas e finalizadas com sucesso.' 
    },
    { 
      label: 'Média por Entrega', 
      value: '18 min', 
      icon: Clock, 
      color: 'text-slate-300', 
      description: 'Tempo aproximado entre cada endereço atendido.' 
    },
    { 
      label: 'Ocorrências Registradas', 
      value: String(localOccurrencesCount), 
      icon: ShieldAlert, 
      color: localOccurrencesCount > 0 ? 'text-red-400' : 'text-slate-500', 
      description: 'Alertas inseridos no trajeto pelos motoristas.' 
    },
  ];

  return (
    <div className="p-4 md:p-8 pt-20 md:pt-8 h-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-16 md:pb-8">
      
      {/* Header section in the dashboard modal/screen */}
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black tracking-widest text-tech bg-tech/10 px-3 py-1 rounded-full uppercase mb-2 inline-block">
            Módulo de Entregas e Simulação
          </span>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Painel de Controle Simplificado
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Seus principais indicadores logísticos detalhados de maneira simples de ler e entender.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <motion.button
            whileHover={completedRoutes.length > 0 ? { scale: 1.02 } : {}}
            whileTap={completedRoutes.length > 0 ? { scale: 0.98 } : {}}
            onClick={exportToCSV}
            disabled={completedRoutes.length === 0}
            className={`font-bold text-xs px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md text-center shrink-0 ${
              completedRoutes.length > 0
                ? 'bg-slate-900 hover:bg-slate-850 text-white border border-slate-800 hover:border-tech/30 cursor-pointer'
                : 'bg-slate-900/40 text-slate-600 border border-slate-900/50 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4 text-tech" />
            <span>Baixar Relatório (Excel/CSV)</span>
          </motion.button>

          {/* Toast feedback floating */}
          <AnimatePresence>
            {showSavedToast && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                className="bg-tech/10 border border-tech/30 text-tech px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                Configurações atualizadas!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Visual KPI Board Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass p-5 rounded-2xl relative overflow-hidden group border border-white/5"
          >
            <div className="absolute top-4 right-4 text-slate-700 group-hover:text-slate-600 transition-colors">
              <kpi.icon className="w-8 h-8 opacity-60" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className={`text-3xl font-bold tracking-tight ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-slate-450 leading-relaxed mt-2.5">
              {kpi.description}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
        
        {/* Visual interactive vehicle configurations container (Layman friendly) */}
        <div className="lg:col-span-2 glass p-6 sm:p-8 rounded-[32px] border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-tech shrink-0" />
                <span>Simulador de Custos de Viagem</span>
              </h3>
              <InfoTooltip text="Escolha seu veículo para saber exatamente quantos litros de combustível serão gastos e o custo total." />
            </div>

            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              Diferente de sistemas complexos, aqui você escolhe o seu veículo e diz qual é o consumo médio direto dele em <strong>km/L</strong> para saber os custos exatos da rota planejada.
            </p>

            {/* Flat easy selection presets for vehicles */}
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2.5">
              1. Qual o tipo de veículo utilizado?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              {(['motorcycle', 'van', 'truck', 'heavy_truck'] as const).map((type) => {
                const label = type === 'motorcycle' ? 'Moto' : type === 'van' ? 'Utilitário (ex: Fiorino)' : type === 'truck' ? 'Caminhão Médio' : 'Caminhão Pesado';
                const isActive = vehicleType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleVehicleTypePreset(type)}
                    className={`py-3 px-2 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-tech/10 text-tech border-tech' 
                        : 'bg-slate-900/50 text-slate-400 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {type === 'motorcycle' && <Bike className="w-4 h-4" />}
                    {(type === 'van' || type === 'truck' || type === 'heavy_truck') && <Truck className="w-4 h-4" />}
                    <span className="text-center leading-tight truncate w-full">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Slider direct inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Distance Slider */}
              <div className="bg-slate-900/35 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Distância da Rota</span>
                    <span className="text-xs font-bold text-white">{roundedKm} km</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="1000"
                    step="1"
                    value={roundedKm}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setManualDistance(val);
                    }}
                    className="w-full accent-white cursor-pointer h-1.5 rounded-full"
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-2 block">
                  Simule o tamanho da rota.
                </span>
              </div>

              <div className="bg-slate-900/35 border border-white/5 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-slate-400 font-bold uppercase">Consumo do Veículo</span>
                  <span className="text-xs font-bold text-tech">{kmPerLiter} km / L</span>
                </div>
                <input 
                  type="range"
                  min="2"
                  max={vehicleType === 'motorcycle' ? "60" : "30"}
                  step="0.5"
                  value={kmPerLiter}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    saveConfig(vehicleType, val, fuelPrice);
                  }}
                  className="w-full accent-tech cursor-pointer h-1.5 rounded-full"
                />
                <span className="text-[9px] text-slate-500 mt-1 block">
                  Quantos km o veículo faz com 1 litro.
                </span>
              </div>

              <div className="bg-slate-900/35 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-slate-400 font-bold uppercase">Preço do Combustível</span>
                    <span className="text-xs font-bold text-accent">R$ {fuelPrice.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range"
                    min="3.50"
                    max="9.00"
                    step="0.05"
                    value={fuelPrice}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      saveConfig(vehicleType, kmPerLiter, val);
                    }}
                    className="w-full accent-accent cursor-pointer h-1.5 rounded-full"
                  />
                </div>
                <span className="text-[9px] text-slate-500 mt-2 block">
                  Preço real cobrado nos postos da sua cidade.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-550">
            <span className="flex items-center gap-1.5 text-[11px] bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5">
              💡 Diferente de sistemas complexos, as atualizações financeiras acima ocorrem em tempo real!
            </span>
          </div>
        </div>

        {/* Layman guide and math education card */}
        <div className="glass p-6 sm:p-8 rounded-[32px] border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
              <BookOpen className="w-5 h-5 text-tech shrink-0" />
              <h3 className="text-lg font-bold text-white">Como é Calculada a Viagem?</h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-350 leading-relaxed mb-4">
              Muitos se assustam com a logística pelos nomes difíceis, mas o cálculo por trás de uma entrega eficiente é muito simples e se baseia em uma pergunta essencial:
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-white/5 mb-4 font-mono text-[11px] leading-relaxed text-slate-300">
              <p className="font-bold text-tech text-xs uppercase tracking-wider mb-2">Fórmula Educacional:</p>
              <div className="space-y-1">
                <p className="text-white">1. Verifique a distância (<span className="text-tech">{roundedKm} km</span>)</p>
                <p className="text-white">2. Divida pelo consumo (<span className="text-tech">{kmPerLiter} km/L</span>)</p>
                <p className="text-white">3. Multiplique pelo preço do Litro (<span className="text-accent">R$ {fuelPrice.toFixed(2)}</span>)</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Ao dividir a distância total planejada pela quantidade de quilômetros que seu carro faz com cada litro obtivemos <strong>{estimatedLiters} Litros</strong> consumidos. Multiplicando pelo valor, descobrimos o custo do percurso.
            </p>
          </div>

          <div className="bg-tech/5 border border-tech/15 rounded-xl p-3.5 mt-4 text-[11px] text-tech leading-relaxed">
            🌿 <strong>Curiosidade Ecológica:</strong> Menos combustível gasto significa um trajeto mais puro e sustentável para as pessoas e o meio ambiente!
          </div>
        </div>
      </div>

      {/* Realistic simple visual indicators based on custom mathematical output */}
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Coins className="w-5 h-5 text-tech shrink-0" />
        <span>Previsão Dinâmica de Recursos e Custo</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        
        {/* litters consumed */}
        <div className="glass p-5 rounded-2xl border border-white/5">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Volume Gasto</span>
            <Fuel className="w-5 h-5 text-tech" />
          </div>
          <h4 className="text-3xl font-black text-white font-mono leading-none">
            {estimatedLiters.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-400">Litros</span>
          </h4>
          <p className="text-xs text-slate-400 mt-2.5">
            Combustível necessário para completar {roundedKm} km considerando um rendimento de {kmPerLiter} km/L.
          </p>
        </div>

        {/* overall price predicted */}
        <div className="glass p-5 rounded-2xl border border-white/5">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Investimento Estimado</span>
            <Coins className="w-5 h-5 text-accent" />
          </div>
          <h4 className="text-3xl font-black text-accent font-mono leading-none">
            R$ {estimatedFuelTotalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h4>
          <p className="text-xs text-slate-400 mt-2.5">
            Valor financeiro bruto do combustível no percurso com base no preço configurado de R$ {fuelPrice.toFixed(2)} por litro.
          </p>
        </div>

        {/* general status layout */}
        <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Modo Operacional</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-lg font-bold text-white leading-tight">
              {kmPerLiter > 25 ? 'Máxima Economia' : kmPerLiter > 12 ? 'Eficiência Urbana' : 'Operação de Carga'}
            </h4>
            <p className="text-xs text-slate-400 mt-2.5">
              Veículo operando de forma regulamentada. Perfeito para pequenos e médios empreendimentos locais.
            </p>
          </div>
        </div>
      </div>

      {/* Comprovantes de Entregas Realizadas de base local (FOTOS / ANOTAÇÕES) */}
      <div className="mt-12">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Camera className="w-5 h-5 text-tech animate-pulse shrink-0" />
          <span>Histórico de Pacotes Entregues (Comprovação Local)</span>
        </h3>

        {completedRoutes.length === 0 ? (
          <div className="glass p-10 rounded-[32px] text-center flex flex-col items-center justify-center border border-dashed border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-3.5">
              <Camera className="w-7 h-7 text-slate-500" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Aguardando comprovações de entrega</h4>
            <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
              Inicie uma simulação de rotas a partir da tela inicial. No destino final do percurso simulado no GPS, use a câmera para capturar o comprovante para exibição aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedRoutes.map((route) => {
              const formattedDate = route.completedAt 
                ? new Date(route.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : new Date(route.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              const formattedFullDate = route.completedAt
                ? new Date(route.completedAt).toLocaleDateString('pt-BR')
                : new Date(route.date).toLocaleDateString('pt-BR');

              const lastStop = route.stops?.[route.stops.length - 1];
              const isLastPickup = lastStop?.stopType === 'pickup';
              const lastAddress = route.addresses[route.addresses.length - 1] || (isLastPickup ? "Ponto de Coleta" : "Destino Final");

              return (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass p-5 rounded-[22px] border border-white/5 flex flex-col gap-4 relative overflow-hidden group hover:border-tech/20 transition-all"
                >
                  {/* Photo cover display block component */}
                  <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-white/5">
                    {route.deliveryPhoto ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={route.deliveryPhoto}
                          alt="Foto do pacote comprovante"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <button
                          onClick={() => {
                            setMagnifiedPhoto(route.deliveryPhoto);
                            setMagnifiedNotes(route.deliveryNotes || "Sem anotações");
                            setMagnifiedAddress(lastAddress);
                            setMagnifiedAt(`${formattedFullDate} às ${formattedDate}`);
                          }}
                          className="absolute inset-x-0 bottom-0 bg-slate-950/85 backdrop-blur-sm text-[10px] font-bold text-tech py-2.5 text-center flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          AMPLIAR FOTO COMPROVANTE
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-650 gap-1 bg-slate-900/40">
                        <Camera className="w-6 h-6 text-slate-600" />
                        <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Foto não incluída</span>
                      </div>
                    )}
                  </div>

                  {/* Complete detailed text rows */}
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-tech bg-tech/10 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3" />
                        ENTREGUE MAIS
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3" />
                        {formattedFullDate} às {formattedDate}
                      </span>
                    </div>

                    {route.totalElapsedMs ? (
                      <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono font-bold">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Tempo Total:</span>
                        <span className="text-white font-black">
                          {(() => {
                            const secs = Math.floor(route.totalElapsedMs / 1000);
                            const h = Math.floor(secs / 3600);
                            const m = Math.floor((secs % 3600) / 60);
                            const s = secs % 60;
                            if (h > 0) return `${h}h ${m}m ${s}s`;
                            if (m > 0) return `${m}m ${s}s`;
                            return `${s}s`;
                          })()}
                        </span>
                      </div>
                    ) : null}

                    <h4 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5 mt-1" title={lastAddress}>
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      {lastAddress}
                    </h4>

                    <div className="mt-1 bg-slate-900/40 p-3 rounded-xl border border-white/5 flex gap-2 items-start h-16 overflow-y-auto custom-scrollbar">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 italic leading-relaxed break-words">
                        {route.deliveryNotes || "Sem anotações complementares registradas."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded receipts dialog popup */}
      <AnimatePresence>
        {magnifiedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMagnifiedPhoto(null)}
            className="fixed inset-0 z-[5000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 p-5 rounded-[32px] w-full max-w-xl shadow-2xl flex flex-col gap-4 relative cursor-default"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-tech" />
                    Comprovante Ampliado
                  </h3>
                  <p className="text-xs text-slate-450 mt-1 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    {magnifiedAddress}
                  </p>
                </div>
                <button
                  onClick={() => setMagnifiedPhoto(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <XCircle className="w-6 h-6 border-none" />
                </button>
              </div>

              {/* Picture item container block inline style */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={magnifiedPhoto}
                  alt="Comprovante de entrega"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Bottom metadata tags */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase text-tech tracking-wider">Anotações inseridas pelo condutor:</span>
                <p className="text-xs text-slate-300 leading-relaxed italic pr-4 max-h-24 overflow-y-auto custom-scrollbar">
                  &ldquo;{magnifiedNotes}&rdquo;
                </p>
                <div className="mt-2 text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest pt-2 border-t border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-tech" />
                  Sincronizado em {magnifiedAt}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
