'use client';

import React, { useState } from 'react';
import { Fuel, Coffee, Wrench, Pill, Anchor, Plus, X, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { voiceNav } from '@/lib/voice-navigation';

interface QuickStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: [number, number] | null;
  onAddQuickStop: (stop: { name: string; address: string; lat: number; lon: number; stopType: 'delivery' | 'pickup' }) => void;
}

interface QuickOption {
  id: string;
  category: string;
  name: string;
  address: string;
  detourMinutes: number;
  distanceMeters: number;
  lat: number;
  lon: number;
  icon: any;
  color: string;
}

export default function QuickStopModal({ isOpen, onClose, currentCoords, onAddQuickStop }: QuickStopModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'fuel' | 'food' | 'mechanic' | 'pharmacy' | 'fluvial'>('fuel');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const baseLat = currentCoords ? currentCoords[0] : -3.1190;
  const baseLon = currentCoords ? currentCoords[1] : -60.0217;

  // Generate realistic nearby stops around current coords
  const nearbyStops: Record<string, QuickOption[]> = {
    fuel: [
      {
        id: 'f1',
        category: 'Posto de Combustível',
        name: 'Posto Shell Select 24h',
        address: 'Av. Constantino Nery, 1420 - Manaus',
        detourMinutes: 2,
        distanceMeters: 450,
        lat: baseLat + 0.0035,
        lon: baseLon + 0.0020,
        icon: Fuel,
        color: 'from-amber-600 to-yellow-600'
      },
      {
        id: 'f2',
        category: 'Posto de Combustível',
        name: 'Posto Petrobras BR Mania',
        address: 'Av. Djalma Batista, 980 - Manaus',
        detourMinutes: 4,
        distanceMeters: 920,
        lat: baseLat - 0.0040,
        lon: baseLon + 0.0030,
        icon: Fuel,
        color: 'from-emerald-600 to-teal-600'
      },
      {
        id: 'f3',
        category: 'Posto de Combustível',
        name: 'Posto Ipiranga RodoRede',
        address: 'Av. Torquato Tapajós, 2100 - Manaus',
        detourMinutes: 5,
        distanceMeters: 1400,
        lat: baseLat + 0.0070,
        lon: baseLon - 0.0035,
        icon: Fuel,
        color: 'from-blue-600 to-indigo-600'
      }
    ],
    food: [
      {
        id: 'fd1',
        category: 'Alimentação',
        name: 'Café Regional & Lanches Prático',
        address: 'Av. Brasil, 450 - Manaus',
        detourMinutes: 3,
        distanceMeters: 600,
        lat: baseLat + 0.0025,
        lon: baseLon - 0.0015,
        icon: Coffee,
        color: 'from-orange-600 to-amber-600'
      },
      {
        id: 'fd2',
        category: 'Alimentação',
        name: 'Restaurante & Buffet Rápido',
        address: 'Rua Maceió, 310 - Adrianópolis',
        detourMinutes: 6,
        distanceMeters: 1200,
        lat: baseLat - 0.0050,
        lon: baseLon + 0.0045,
        icon: Coffee,
        color: 'from-rose-600 to-red-600'
      }
    ],
    mechanic: [
      {
        id: 'm1',
        category: 'Oficina / Borracharia',
        name: 'Borracharia Express 24h & Pneus',
        address: 'Av. Grande Circular, 880 - Manaus',
        detourMinutes: 3,
        distanceMeters: 750,
        lat: baseLat + 0.0045,
        lon: baseLon + 0.0035,
        icon: Wrench,
        color: 'from-slate-700 to-slate-900'
      },
      {
        id: 'm2',
        category: 'Oficina / Borracharia',
        name: 'Auto Elétrica & SOS Veicular',
        address: 'Av. Rodrigo Otávio, 120 - Japiim',
        detourMinutes: 7,
        distanceMeters: 1600,
        lat: baseLat - 0.0060,
        lon: baseLon - 0.0020,
        icon: Wrench,
        color: 'from-amber-700 to-orange-800'
      }
    ],
    pharmacy: [
      {
        id: 'p1',
        category: 'Farmácia',
        name: 'Drogaria Pacheco / Santo Remédio',
        address: 'Av. Getúlio Vargas, 610 - Centro',
        detourMinutes: 2,
        distanceMeters: 380,
        lat: baseLat + 0.0018,
        lon: baseLon + 0.0012,
        icon: Pill,
        color: 'from-teal-600 to-emerald-600'
      }
    ],
    fluvial: [
      {
        id: 'fl1',
        category: 'Fluvial',
        name: 'Pontão de Abastecimento Fluvial Manaus',
        address: 'Margem do Rio Negro - Balsa de Combustível',
        detourMinutes: 5,
        distanceMeters: 800,
        lat: baseLat - 0.0040,
        lon: baseLon - 0.0060,
        icon: Anchor,
        color: 'from-cyan-700 to-blue-800'
      }
    ]
  };

  const currentList = nearbyStops[selectedCategory] || [];

  const handleSelectStop = (stop: QuickOption) => {
    setIsAdding(true);
    voiceNav.playChime();
    voiceNav.speak(`Adicionando parada rápida em ${stop.name}. Calculando novo trajeto.`);

    setTimeout(() => {
      onAddQuickStop({
        name: stop.name,
        address: stop.address,
        lat: stop.lat,
        lon: stop.lon,
        stopType: 'delivery'
      });
      setIsAdding(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[3600] bg-slate-950/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh] text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-stop-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              <Plus className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 block">Parada na Rota</span>
              <h3 id="quick-stop-title" className="text-base sm:text-lg font-black tracking-tight text-white">
                Adicionar Parada Rápida
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto custom-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('fuel')}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
              selectedCategory === 'fuel'
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            <Fuel className="w-4 h-4" />
            Postos
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('food')}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
              selectedCategory === 'food'
                ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            <Coffee className="w-4 h-4" />
            Lanches
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('mechanic')}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
              selectedCategory === 'mechanic'
                ? 'bg-slate-700/60 border-slate-500 text-slate-200'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Oficina
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('pharmacy')}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
              selectedCategory === 'pharmacy'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            <Pill className="w-4 h-4" />
            Farmácia
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('fluvial')}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
              selectedCategory === 'fluvial'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
            }`}
          >
            <Anchor className="w-4 h-4" />
            Fluvial
          </button>
        </div>

        {/* List of Options */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
          <p className="text-xs text-slate-400 font-medium">
            Locais encontrados com menor desvio em relação ao seu traçado atual:
          </p>

          <div className="space-y-2.5">
            {currentList.map((stop) => {
              const Icon = stop.icon;
              return (
                <div
                  key={stop.id}
                  className="p-3.5 rounded-2xl bg-slate-850/80 border border-slate-700/60 hover:border-cyan-500/50 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stop.color} flex items-center justify-center shrink-0 shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-white truncate">{stop.name}</h4>
                        <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0">
                          +{stop.detourMinutes} min
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        {stop.address}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectStop(stop)}
                    disabled={isAdding}
                    className="py-2 px-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-cyan-600/20 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            O desvio será calculado instantaneamente
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
