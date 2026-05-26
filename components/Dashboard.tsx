'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Package, 
  Clock, 
  ShieldAlert, 
  Navigation, 
  Camera, 
  Calendar, 
  Eye, 
  MessageSquare, 
  MapPin, 
  XCircle, 
  CheckCircle2,
  Truck,
  Scale,
  Info,
  Sparkles,
  Fuel,
  Coins,
  Save,
  Sliders,
  Database,
  Download
} from 'lucide-react';
import { db } from '@/lib/db';

export default function KpiDashboard() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [completedRoutes, setCompletedRoutes] = useState<any[]>([]);
  const [localOccurrencesCount, setLocalOccurrencesCount] = useState(0);

  // States to amplify/zoom captured package photos in the dashboard
  const [magnifiedPhoto, setMagnifiedPhoto] = useState<string | null>(null);
  const [magnifiedNotes, setMagnifiedNotes] = useState<string>('');
  const [magnifiedAddress, setMagnifiedAddress] = useState<string>('');
  const [magnifiedAt, setMagnifiedAt] = useState<string>('');

  // Vehicle Configuration States with lazy localstorage initialization (No set state in useEffect)
  const [vehicleType, setVehicleType] = useState<'van' | 'light_truck' | 'medium_truck' | 'heavy_truck'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('logix_vehicle_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.vehicleType) return parsed.vehicleType;
        }
      } catch (e) {}
    }
    return 'light_truck';
  });

  const [vehicleModel, setVehicleModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('logix_vehicle_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.vehicleModel) return parsed.vehicleModel;
        }
      } catch (e) {}
    }
    return 'Mercedes-Benz Accelo';
  });

  const [vehiclePlate, setVehiclePlate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('logix_vehicle_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.vehiclePlate) return parsed.vehiclePlate;
        }
      } catch (e) {}
    }
    return 'LOG-2026';
  });

  const [vehicleTara, setVehicleTara] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('logix_vehicle_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.vehicleTara !== undefined) return Number(parsed.vehicleTara);
        }
      } catch (e) {}
    }
    return 4100;
  });

  const [vehiclePayloadMax, setVehiclePayloadMax] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('logix_vehicle_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.vehiclePayloadMax !== undefined) return Number(parsed.vehiclePayloadMax);
        }
      } catch (e) {}
    }
    return 5000;
  });

  const [vehicleCargoWeight, setVehicleCargoWeight] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('logix_vehicle_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.vehicleCargoWeight !== undefined) return Number(parsed.vehicleCargoWeight);
        }
      } catch (e) {}
    }
    return 3800;
  });

  const [fuelPrice, setFuelPrice] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('logix_vehicle_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fuelPrice !== undefined) return Number(parsed.fuelPrice);
        }
      } catch (e) {}
    }
    return 5.85;
  });

  const [showSavedToast, setShowSavedToast] = useState(false);

  // Load metrics logic is kept intact to poll completed routes and occurrences
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
        console.warn("Falha ao carregar métricas em tempo real no Dashboard:", err);
      }
    };
    loadLogs();
    const interval = setInterval(loadLogs, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Handle vehicle type presets
  const handleVehicleTypeChange = (type: 'van' | 'light_truck' | 'medium_truck' | 'heavy_truck') => {
    setVehicleType(type);
    let tara = 4100;
    let maxPayload = 5000;
    let model = 'Mercedes-Benz Accelo';

    if (type === 'van') {
      tara = 1250;
      maxPayload = 800;
      model = 'Fiat Fiorino Cargo';
    } else if (type === 'light_truck') {
      tara = 4100;
      maxPayload = 5000;
      model = 'Mercedes-Benz Accelo';
    } else if (type === 'medium_truck') {
      tara = 7500;
      maxPayload = 14000;
      model = 'Volvo VM 270';
    } else if (type === 'heavy_truck') {
      tara = 18000;
      maxPayload = 37000;
      model = 'Volvo FH 540';
    }

    setVehicleTara(tara);
    setVehiclePayloadMax(maxPayload);
    setVehicleModel(model);

    // Keep cargo weight safe or update
    const safeCargo = vehicleCargoWeight > maxPayload ? Math.round(maxPayload * 0.8) : vehicleCargoWeight;
    setVehicleCargoWeight(safeCargo);

    // Auto-save preset
    localStorage.setItem('logix_vehicle_settings', JSON.stringify({
      vehicleType: type,
      vehicleModel: model,
      vehiclePlate,
      vehicleTara: tara,
      vehiclePayloadMax: maxPayload,
      vehicleCargoWeight: safeCargo,
      fuelPrice
    }));
  };

  const handleSaveSettings = () => {
    localStorage.setItem('logix_vehicle_settings', JSON.stringify({
      vehicleType,
      vehicleModel,
      vehiclePlate,
      vehicleTara,
      vehiclePayloadMax,
      vehicleCargoWeight,
      fuelPrice
    }));
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
    }, 2500);
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
    link.setAttribute('download', `relatorio_rotas_completadas_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real-time managerial math models
  const totalKm = 1248; // Preserved static or responsive mileage
  const cargoFillRatio = Math.round((vehicleCargoWeight / vehiclePayloadMax) * 100);
  
  // Base fuel consumption in Liters/100km depending on cargo type
  let baseFuelCoeff = 10;
  let axles = 2;
  if (vehicleType === 'van') {
    baseFuelCoeff = 8.5;
    axles = 2;
  } else if (vehicleType === 'light_truck') {
    baseFuelCoeff = 13.5;
    axles = 2;
  } else if (vehicleType === 'medium_truck') {
    baseFuelCoeff = 21.0;
    axles = 3;
  } else if (vehicleType === 'heavy_truck') {
    baseFuelCoeff = 32.0;
    axles = 6;
  }

  // Weight penalty (heavier cargo increases consumption)
  const weightPenaltyRatio = vehicleCargoWeight / vehiclePayloadMax;
  const loadConsumptionPenalty = weightPenaltyRatio * (baseFuelCoeff * 0.15); // penalidade de até 15% a mais com carga cheia
  const currentFuelConsumption = Math.round((baseFuelCoeff + loadConsumptionPenalty) * 10) / 10;

  // Totalized variables
  const estimatedFuelConsumed = Math.round((totalKm / 100) * currentFuelConsumption);
  const estimatedFuelCost = Math.round(estimatedFuelConsumed * fuelPrice);
  const co2EmissionsKg = Math.round(estimatedFuelConsumed * 2.68); // 2.68kg CO2 emitted per Liter of diesel fuel
  const tollFeeEst = axles * 14.50 * 6; // 6 toll plazas along the 1248km route

  // Weighing Scale and fines modeling
  const isOverloaded = vehicleCargoWeight > vehiclePayloadMax;
  const cargoExcessKg = Math.max(0, vehicleCargoWeight - vehiclePayloadMax);
  let estimatedWeightFine = 0;
  if (isOverloaded) {
    // Standard ANTT Brazil Overweight math: R$ 130.16 base + escalating fine per 100kg
    estimatedWeightFine = 130.16;
    if (cargoExcessKg <= 600) {
      estimatedWeightFine += (cargoExcessKg / 100) * 10.60;
    } else if (cargoExcessKg <= 1000) {
      estimatedWeightFine += 63.60 + ((cargoExcessKg - 600) / 100) * 21.20;
    } else {
      estimatedWeightFine += 148.40 + ((cargoExcessKg - 1000) / 100) * 53.20;
    }
  }

  // Weight distribution preview
  const estimatedFrontAxleWeight = Math.round((vehicleTara * 0.40) + (vehicleCargoWeight * 0.30));
  const estimatedRearAxleWeight = Math.round((vehicleTara * 0.60) + (vehicleCargoWeight * 0.70));

  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const dataValues = [85, 92, 78, 90, 95, 88, 91];

  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  const points = dataValues.map((val, idx) => {
    const x = paddingX + idx * ((width - 2 * paddingX) / (dataValues.length - 1));
    const y = height - paddingY - (val / 100) * (height - 2 * paddingY);
    return { x, y, val, label: weekdays[idx] };
  });

  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  const areaPath = linePath ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z` : '';

  const kpis = [
    { label: 'KM Total', value: '1,248', icon: TrendingUp, color: 'text-tech' },
    { label: 'Entregas', value: completedRoutes.length > 0 ? String(142 + completedRoutes.length) : '142', icon: Package, color: 'text-accent' },
    { label: 'Tempo Médio', value: '22m', icon: Clock, color: 'text-slate-400' },
    { label: 'Ocorrências', value: String(4 + localOccurrencesCount), icon: ShieldAlert, color: 'text-alert' },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar md:pb-8 pb-32">
      <header className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black tracking-widest text-tech bg-tech/10 px-3 py-1 rounded-full uppercase mb-2 inline-block">
            Módulo de Gestão de Frotas
          </span>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Painel do Gestor
          </h1>
          <p className="text-slate-400 mt-2">Veja os indicadores dinâmicos do veículo, balanças de carga e custo operacional.</p>
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
            title={completedRoutes.length > 0 ? "Exportar dados de rotas do Dexie para CSV" : "Nenhuma rota completada ainda para exportar"}
          >
            <Download className={`w-4 h-4 ${completedRoutes.length > 0 ? 'text-tech animate-pulse' : 'text-slate-600'}`} />
            <span>Exportar Relatório (CSV)</span>
          </motion.button>

          {/* Saved Alert Toast */}
          <AnimatePresence>
            {showSavedToast && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="bg-tech/15 border border-tech/30 text-tech px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 text-tech" />
                Configurações salvas localmente com sucesso!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Primordial KPIs row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -4 }}
            className="glass p-6 rounded-3xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <kpi.icon className="w-12 h-12 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className={`text-4xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-450">
              <span className="text-tech font-bold">+12%</span> em relação à semana passada
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Core Efficiency Chart Line */}
        <div className="lg:col-span-2 glass p-8 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-tech" />
                  SLA & Curva de Eficiência Diária
                </h3>
                <p className="text-xs text-slate-500 mt-1">Produtividade média de entregas programadas x realizadas</p>
              </div>
              <span className="bg-slate-800 text-[10px] text-slate-300 font-bold uppercase tracking-wider rounded-lg px-3 py-1">
                7 Dias Recentes
              </span>
            </div>
            
            <div className="h-[230px] w-full flex items-center justify-center relative">
              <svg 
                viewBox={`0 0 ${width} ${height}`} 
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Grid Lines */}
                {[25, 50, 75, 100].map((level) => {
                  const yLevel = height - paddingY - (level / 100) * (height - 2 * paddingY);
                  return (
                    <g key={level} className="opacity-20">
                      <line 
                        x1={paddingX} 
                        y1={yLevel} 
                        x2={width - paddingX} 
                        y2={yLevel} 
                        stroke="#475569" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                      />
                      <text 
                        x={paddingX - 10} 
                        y={yLevel + 4} 
                        textAnchor="end" 
                        fill="#94a3b8" 
                        className="text-[10px] font-mono"
                      >
                        {level}%
                      </text>
                    </g>
                  );
                })}

                {/* Area Under the Line */}
                {areaPath && (
                  <path 
                    d={areaPath} 
                    fill="url(#chartGradient)" 
                  />
                )}

                {/* Glow Behind the Line */}
                {linePath && (
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="#00D4AA" 
                    strokeWidth="3" 
                    opacity="0.5"
                    filter="url(#glow)"
                  />
                )}

                {/* Main Line */}
                {linePath && (
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="#00D4AA" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />
                )}

                {/* Interactive Points / Hover Triggers */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="24"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />

                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={hoveredIdx === idx ? 6 : 4}
                      fill="#0b241e"
                      stroke="#00D4AA"
                      strokeWidth={hoveredIdx === idx ? 3 : 2}
                      className="transition-all duration-200 pointer-events-none"
                      style={{ filter: hoveredIdx === idx ? 'drop-shadow(0 0 6px #00D4AA)' : 'none' }}
                    />

                    {hoveredIdx === idx && (
                      <line
                        x1={p.x}
                        y1={p.y}
                        x2={p.x}
                        y2={height - paddingY}
                        stroke="#00D4AA"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                        opacity="0.5"
                        className="pointer-events-none"
                      />
                    )}
                  </g>
                ))}

                {/* Bottom Labels (Weekdays) */}
                {points.map((p, idx) => (
                  <text
                    key={idx}
                    x={p.x}
                    y={height - 10}
                    textAnchor="middle"
                    fill={hoveredIdx === idx ? "#00D4AA" : "#64748b"}
                    className="text-[11px] font-medium transition-colors duration-200"
                  >
                    {p.label}
                  </text>
                ))}
              </svg>

              {/* Float Tooltip Overlay */}
              <AnimatePresence>
                {hoveredIdx !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center pointer-events-none z-50 text-center"
                    style={{
                      left: `${(points[hoveredIdx].x / width) * 100}%`,
                      top: `${(points[hoveredIdx].y / height) * 100 - 18}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-0.5">
                      {points[hoveredIdx].label}
                    </p>
                    <p className="text-sm font-bold text-tech">
                      {points[hoveredIdx].val}% <span className="text-[10px] text-slate-400 font-normal">Eficiência</span>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/85 pt-4 mt-4 text-xs font-mono text-slate-450">
            <div className="flex items-center gap-1.5 text-tech bg-tech/5 border border-tech/10 px-3 py-1.5 rounded-xl">
              <Info className="w-3.5 h-3.5" />
              <span>SLA Ótimo: Entrega pontual acima de 85% para toda a frota metropolitana.</span>
            </div>
            <div className="text-slate-400">
              Última atualização: <span className="text-white">Hoje, 18:30h</span>
            </div>
          </div>
        </div>

        {/* EXCLUSIVE REQUIREMENT: Vehicle Weight and Fleet Config Card (Manager controls) */}
        <div className="glass p-8 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-tech" />
                Configurar Veículo
              </h3>
              <button 
                onClick={handleSaveSettings}
                className="bg-tech hover:bg-tech/85 text-slate-950 p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px] font-black uppercase tracking-wider"
                title="Salvar Configuração"
              >
                <Save className="w-4 h-4" />
                SALVAR
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-6 font-sans leading-relaxed">
              Mude a tipologia do veículo para aplicar presets automáticos de tara e payload, ou insira o peso líquido carregado.
            </p>

            {/* Vehicle Preset Selector Buttons */}
            <div className="grid grid-cols-4 gap-1.5 mb-6">
              {(['van', 'light_truck', 'medium_truck', 'heavy_truck'] as const).map((type) => {
                const label = type === 'van' ? 'Fiorino' : type === 'light_truck' ? 'Semileve' : type === 'medium_truck' ? 'Toco' : 'BiTrem';
                const isActive = vehicleType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleVehicleTypeChange(type)}
                    className={`py-2 text-[10px] font-black uppercase rounded-xl border transition-all truncate hover:brightness-110 active:scale-95 ${
                      isActive 
                        ? 'bg-tech font-black text-slate-950 border-tech shadow-[0_2px_10px_rgba(0,212,170,0.2)]' 
                        : 'bg-slate-950 text-slate-450 border-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Grid Form Details */}
            <div className="space-y-4 font-sans text-xs">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Modelo do Veículo</label>
                <input 
                  type="text" 
                  value={vehicleModel} 
                  onChange={(e) => { setVehicleModel(e.target.value); }}
                  placeholder="Ex: Scania R450" 
                  className="w-full bg-slate-950 border border-slate-800 focus:border-tech/40 outline-none rounded-xl px-3 py-2 text-white placeholder-slate-800 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Placa ID</label>
                  <input 
                    type="text" 
                    value={vehiclePlate}
                    onChange={(e) => { setVehiclePlate(e.target.value); }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-tech/40 outline-none rounded-xl px-3 py-2 text-white font-mono uppercase transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Tara (Vazio) kg</label>
                  <input 
                    type="number" 
                    value={vehicleTara} 
                    onChange={(e) => { setVehicleTara(Number(e.target.value)); }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-tech/40 outline-none rounded-xl px-3 py-2 text-white transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Capacidade kg</label>
                  <input 
                    type="number" 
                    value={vehiclePayloadMax} 
                    onChange={(e) => { setVehiclePayloadMax(Number(e.target.value)); }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-tech/40 outline-none rounded-xl px-3 py-2 text-white font-bold transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Combustível R$/L</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={fuelPrice} 
                    onChange={(e) => { setFuelPrice(Number(e.target.value)); }}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-tech/40 outline-none rounded-xl px-3 py-2 text-white transition-colors"
                  />
                </div>
              </div>

              {/* DYNAMIC WEIGHT CONTROLLER SECTION */}
              <div className="border-t border-slate-800/80 pt-4 mt-5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Peso da Carga Carregada</span>
                  <span className={`text-xs font-mono font-black ${isOverloaded ? 'text-alert' : 'text-tech'}`}>
                    {vehicleCargoWeight.toLocaleString('pt-BR')} kg
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] text-slate-500">0</span>
                  <input 
                    type="range"
                    min="0"
                    max={String(vehiclePayloadMax * 1.3)} // allow sliding past payload limit to simulate overload fines!
                    value={vehicleCargoWeight}
                    onChange={(e) => {
                      const newWeight = Number(e.target.value);
                      setVehicleCargoWeight(newWeight);
                    }}
                    className="flex-1 accent-tech h-1 rounded-lg bg-slate-950 cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500">{(vehiclePayloadMax * 1.3).toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick weighing state visual feedback */}
          <div className={`mt-4 p-3 rounded-2xl border flex flex-col gap-1 transition-all ${
            isOverloaded 
              ? 'bg-alert/10 border-alert text-alert animate-pulse' 
              : cargoFillRatio > 85 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                : 'bg-tech/5 border-tech/20 text-tech'
          }`}>
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 shrink-0" />
                Taxa de Carregamento: {cargoFillRatio}%
              </span>
              <span className="font-bold">
                {isOverloaded ? 'Excesso de Carga' : cargoFillRatio > 85 ? 'Limite Próximo' : 'Carregado Seguro'}
              </span>
            </div>
            {isOverloaded && (
              <p className="text-[9px] text-alert/90 uppercase font-black tracking-widest mt-0.5 leading-relaxed">
                🚨 Risco de Balança! Peso máximo excedido em {cargoExcessKg.toLocaleString('pt-BR')} kg.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* REALISTIC MANAGERIAL METRICS GRID: Centro de Custo e Eco-Distribuição */}
      <div className="mb-12">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-tech" />
          Centro de Controle de Carga e Custos (Dados do Gestor)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Dynamic Fuel Estimate Consumption based on cargo weight */}
          <div className="glass p-5 rounded-[24px] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Autonomia Eficiente</span>
                <Fuel className="w-5 h-5 text-tech shrink-0" />
              </div>
              <h4 className="text-2xl font-black text-white mt-3 font-mono">
                {currentFuelConsumption} <span className="text-[13px] font-normal text-slate-500">L/100km</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-2 font-sans leading-relaxed">
                Consumo estimado afetado pelo peso líquido real. Consumo Base: <span className="text-white">{baseFuelCoeff} L</span>.
              </p>
            </div>
            <div className="border-t border-slate-850 pt-2.5 mt-4 text-[10px] text-slate-500 font-mono">
              Total combustão est: <span className="text-white font-bold">{estimatedFuelConsumed} L</span>
            </div>
          </div>

          {/* Cost prediction fuel billing */}
          <div className="glass p-5 rounded-[24px] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Custo de Viagem Est.</span>
                <Coins className="w-5 h-5 text-accent shrink-0" />
              </div>
              <h4 className="text-2xl font-black text-white mt-3 font-mono">
                R$ {estimatedFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <p className="text-[11px] text-slate-400 mt-2 font-sans leading-relaxed">
                Simulado para o trajeto metropolitan total (<span className="text-white">{totalKm} km</span>) na bomba a R$ <span className="text-white">{fuelPrice.toFixed(2)}</span>/L.
              </p>
            </div>
            <div className="border-t border-slate-850 pt-2.5 mt-4 text-[10px] text-slate-500 font-mono">
              Pedágio est. para {axles} Eixos: <span className="text-white font-bold">R$ {tollFeeEst.toFixed(2)}</span>
            </div>
          </div>

          {/* Environmental Greenhouse CO2 Metric */}
          <div className="glass p-5 rounded-[24px] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Eco Pegada Carbono</span>
                <Database className="w-5 h-5 text-slate-400 shrink-0" />
              </div>
              <h4 className="text-2xl font-black text-slate-400 mt-3 font-mono">
                {co2EmissionsKg.toLocaleString('pt-BR')} <span className="text-[13px] font-normal text-slate-500">kg CO2</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-2 font-sans leading-relaxed">
                Pegada de poluição ambiental baseada em queima média de Diesel. Padrão internacional de transporte pesado.
              </p>
            </div>
            <div className="border-t border-slate-850 pt-2.5 mt-4 text-[10px] text-slate-500 font-mono">
              Fator de queima: <span className="text-tech font-bold">2.68 kg CO2/L</span>
            </div>
          </div>

          {/* Overweight Fine Estimator & Balança Safety Status */}
          <div className="glass p-5 rounded-[24px] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Taxação & Balança ANTT</span>
                <ShieldAlert className="w-5 h-5 text-alert shrink-0" />
              </div>
              <h4 className={`text-2xl font-black mt-3 font-mono ${isOverloaded ? 'text-alert animate-bounce' : 'text-tech'}`}>
                {isOverloaded ? `R$ ${estimatedWeightFine.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'R$ 0,00'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-2 font-sans leading-relaxed">
                {isOverloaded 
                  ? `Excesso de peso detectado! Possibilidade de retenção de veículo em posto de balança fiscal federal de rodovias.`
                  : 'Nenhuma multa de excesso prevista. Carga dentro da lei regulamentar e limites por eixo.'}
              </p>
            </div>
            <div className="border-t border-slate-850 pt-2.5 mt-4 text-[10px] text-slate-500 font-mono">
              Distribuição: <span className="text-slate-350">Frente: {estimatedFrontAxleWeight}kg • Trás: {estimatedRearAxleWeight}kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprovantes de Entregas Realizadas (Novos e Persistidos localmente no Dexie) */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Camera className="w-5 h-5 text-tech animate-pulse" />
          Comprovantes de Entrega Recente (Banco Local Dexie)
        </h3>

        {completedRoutes.length === 0 ? (
          <div className="glass p-12 rounded-[32px] text-center flex flex-col items-center justify-center border border-dashed border-slate-800">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700/50">
              <Camera className="w-8 h-8 text-slate-500" />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">Aguardando comprovantes de entrega</h4>
            <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
              Planeje uma rota e conclua-a no simulador de GPS. No último ponto, tire a foto do pacote para persistir com segurança na base local e visualizá-la aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedRoutes.map((route) => {
              const formattedDate = route.completedAt 
                ? new Date(route.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                : new Date(route.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

              const formattedFullDate = route.completedAt
                ? new Date(route.completedAt).toLocaleDateString('pt-BR')
                : new Date(route.date).toLocaleDateString('pt-BR');

              const lastAddress = route.addresses[route.addresses.length - 1] || "Destino Final";

              return (
                <motion.div
                  key={route.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="glass p-5 rounded-[28px] border border-slate-800 flex flex-col gap-4 relative overflow-hidden group hover:border-tech/20 transition-all"
                >
                  {/* Photo container */}
                  <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 group-hover:border-tech/10 transition-all">
                    {route.deliveryPhoto ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={route.deliveryPhoto}
                          alt="Foto de Entrega"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <button
                          onClick={() => {
                            setMagnifiedPhoto(route.deliveryPhoto);
                            setMagnifiedNotes(route.deliveryNotes || "Sem notas");
                            setMagnifiedAddress(lastAddress);
                            setMagnifiedAt(`${formattedFullDate} às ${formattedDate}`);
                          }}
                          className="absolute inset-x-0 bottom-0 bg-slate-950/80 backdrop-blur-md text-[10px] font-bold text-tech py-2.5 text-center flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          AMPLIAR COMPROVANTE
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-650 gap-1">
                        <Camera className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-bold tracking-wider">Sem foto registrada</span>
                      </div>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-tech bg-tech/10 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3" />
                        ENTREGUE
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3" />
                        {formattedFullDate} • {formattedDate}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5 mt-1" title={lastAddress}>
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      {lastAddress}
                    </h4>

                    <div className="mt-1 bg-slate-900/40 p-3 rounded-xl border border-white/5 flex gap-2 items-start h-16 overflow-y-auto custom-scrollbar">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-400 italic leading-relaxed break-all">
                        {route.deliveryNotes || "Sem anotações adicionais."}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Magnified Image Modal Overlay */}
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
              className="bg-slate-900 border border-slate-800 p-5 rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col gap-4 relative cursor-default"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-tech" />
                    Detalhes do Comprovante de Entrega
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    {magnifiedAddress}
                  </p>
                </div>
                <button
                  onClick={() => setMagnifiedPhoto(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Large Image wrap */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={magnifiedPhoto}
                  alt="Comprovante de entrega ampliado"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Bottom detail text area */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-tech tracking-wider">Anotações do Motorista:</span>
                <p className="text-xs text-slate-300 leading-relaxed italic pr-4 max-h-24 overflow-y-auto custom-scrollbar">
                  &ldquo;{magnifiedNotes}&rdquo;
                </p>
                <div className="mt-2 text-[9px] font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest pt-2 border-t border-slate-800">
                  <Calendar className="w-3 h-3" />
                  ENTREGUE EM {magnifiedAt}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
