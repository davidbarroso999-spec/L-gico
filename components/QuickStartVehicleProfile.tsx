'use client';

import React, { useState } from 'react';
import { Package, Bike, Truck, Briefcase, Check, Sparkles, ChevronRight, X } from 'lucide-react';

export type VehicleWorkProfile = 'packages' | 'food_delivery' | 'services' | 'sales' | 'custom';

interface QuickStartVehicleProfileProps {
  currentProfile: VehicleWorkProfile;
  onSelectProfile: (profile: VehicleWorkProfile) => void;
  onClose?: () => void;
}

export default function QuickStartVehicleProfile({
  currentProfile,
  onSelectProfile,
  onClose
}: QuickStartVehicleProfileProps) {
  const [selected, setSelected] = useState<VehicleWorkProfile>(currentProfile);

  const profiles = [
    {
      id: 'packages' as VehicleWorkProfile,
      title: 'Entrega de pacotes',
      subtitle: 'Van, Fiorino ou VUC com múltiplos volumes e entregas fracionadas.',
      badge: 'Recomendado',
      icon: (
        <div className="relative w-20 h-16 flex items-center justify-center">
          {/* Custom SVG Vehicle Illustration */}
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-amber-500/20 rounded-2xl border border-amber-500/30 flex items-center justify-center">
            <Truck className="w-9 h-9 text-amber-400" />
            <div className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full">
              📦
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'food_delivery' as VehicleWorkProfile,
      title: 'Entrega de pedidos',
      subtitle: 'Moto, Scooter ou Bike para entregas expressas de comida e farmácia.',
      badge: 'Rápido',
      icon: (
        <div className="relative w-20 h-16 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-tech/10 to-tech/20 rounded-2xl border border-tech/30 flex items-center justify-center">
            <Bike className="w-9 h-9 text-tech" />
            <div className="absolute -top-1 -right-1 bg-tech text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full">
              ⚡
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'services' as VehicleWorkProfile,
      title: 'Serviços',
      subtitle: 'Equipes técnicas, manutenção, utilitários com janelas de atendimento.',
      badge: 'Agendado',
      icon: (
        <div className="relative w-20 h-16 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-sky-500/10 to-sky-500/20 rounded-2xl border border-sky-500/30 flex items-center justify-center">
            <Package className="w-9 h-9 text-sky-400" />
            <div className="absolute -top-1 -right-1 bg-sky-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full">
              🛠️
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sales' as VehicleWorkProfile,
      title: 'Vendas',
      subtitle: 'Visitas executivas a clientes com itinerário de reuniões e roteiro diário.',
      badge: 'Prioritário',
      icon: (
        <div className="relative w-20 h-16 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-emerald-500/20 rounded-2xl border border-emerald-500/30 flex items-center justify-center">
            <Briefcase className="w-9 h-9 text-emerald-400" />
            <div className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full">
              💼
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleApply = (prof: VehicleWorkProfile) => {
    setSelected(prof);
    onSelectProfile(prof);
    if (onClose) onClose();
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-950 border border-slate-800/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative text-white animate-fadeIn">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-tech/10 border border-tech/30 text-tech text-xs font-bold font-mono">
            SETUP RÁPIDO
          </span>
          <Sparkles className="w-4 h-4 text-tech animate-pulse" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
          Início rápido
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Qual opção descreve melhor seu trabalho? Adaptaremos as restrições de trânsito e tempos de parada.
        </p>
      </div>

      {/* Grid 2x2 of Options (Matches Screenshot 3 / input_file_2.png) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
        {profiles.map((p) => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleApply(p.id)}
              className={`group relative p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-44 ${
                isSelected
                  ? 'bg-slate-900 border-tech shadow-[0_0_20px_rgba(0,242,255,0.2)]'
                  : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              {/* Badge */}
              <div className="flex items-center justify-between w-full mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-tech text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {p.badge}
                </span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-tech text-slate-950 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3px]" />
                  </div>
                )}
              </div>

              {/* Graphic Icon */}
              <div className="my-1 flex items-center justify-center">
                {p.icon}
              </div>

              {/* Title & Subtitle */}
              <div>
                <h3 className="font-bold text-sm text-white group-hover:text-tech transition-colors">
                  {p.title}
                </h3>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {p.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Secondary Button: "Nenhuma das opções acima" */}
      <button
        type="button"
        onClick={() => handleApply('custom')}
        className={`w-full py-3.5 px-4 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
          selected === 'custom'
            ? 'bg-slate-800 border-tech text-white'
            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
        }`}
      >
        <span>Nenhuma das opções acima (Modo Padrão)</span>
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}
