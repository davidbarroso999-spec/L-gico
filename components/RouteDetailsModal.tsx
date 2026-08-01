'use client';

import React, { useState } from 'react';
import { X, Navigation, Clock, Flag, Coffee, Check, ChevronRight } from 'lucide-react';

interface RouteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  startAddress: string;
  onUseCurrentLocation: () => void;
  startTime: string;
  onUpdateStartTime: (time: string) => void;
  endAddress: string;
  onUpdateEndAddress: (address: string) => void;
  endTime: string;
  onUpdateEndTime: (time: string) => void;
  hasPause: boolean;
  onTogglePause: (hasPause: boolean) => void;
  pauseDurationMinutes: number;
  onUpdatePauseDuration: (minutes: number) => void;
  onSaveAsDefault: (save: boolean) => void;
}

export default function RouteDetailsModal({
  isOpen,
  onClose,
  startAddress,
  onUseCurrentLocation,
  startTime,
  onUpdateStartTime,
  endAddress,
  onUpdateEndAddress,
  endTime,
  onUpdateEndTime,
  hasPause,
  onTogglePause,
  pauseDurationMinutes,
  onUpdatePauseDuration,
  onSaveAsDefault
}: RouteDetailsModalProps) {
  const [saveDefault, setSaveDefault] = useState(true);
  const [editingStartTime, setEditingStartTime] = useState(false);
  const [editingEndTime, setEditingEndTime] = useState(false);
  const [showDestinationOptions, setShowDestinationOptions] = useState(false);

  if (!isOpen) return null;

  const handleFinish = () => {
    onSaveAsDefault(saveDefault);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-950 border-t sm:border border-slate-800/80 rounded-t-3xl sm:rounded-3xl p-5 sm:p-7 shadow-2xl relative text-white flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-850 mb-5">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-black text-white uppercase tracking-wider font-display">
            Detalhes da rota
          </h2>
          <div className="w-9" /> {/* Spacer for symmetry */}
        </div>

        <div className="space-y-6 flex-1">
          {/* SECTION 1: PARTIDA */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">
              Partida
            </span>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
              
              {/* Row 1: Usar local atual */}
              <button
                type="button"
                onClick={() => {
                  onUseCurrentLocation();
                }}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-850/80 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-tech/10 border border-tech/30 text-tech shrink-0">
                    <Navigation className="w-4 h-4 fill-tech/20" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-white block group-hover:text-tech transition-colors">
                      Usar local atual
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {startAddress || 'Buscando GPS em tempo real...'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>

              {/* Row 2: Iniciar agora mesmo */}
              <div className="w-full p-4 flex items-center justify-between hover:bg-slate-850/80 transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">
                      Iniciar agora mesmo
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      Horário programado: {startTime || 'Agora'}
                    </span>
                  </div>
                </div>
                
                {editingStartTime ? (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => onUpdateStartTime(e.target.value)}
                    onBlur={() => setEditingStartTime(false)}
                    autoFocus
                    className="bg-slate-950 border border-tech text-tech font-mono font-bold text-xs px-2.5 py-1 rounded-lg outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingStartTime(true)}
                    className="flex items-center gap-1.5 text-xs font-mono font-bold text-tech bg-tech/10 border border-tech/30 px-2.5 py-1 rounded-lg hover:bg-tech/20 cursor-pointer"
                  >
                    <span>{startTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* SECTION 2: DESTINO */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">
              Destino
            </span>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
              
              {/* Row 1: Destination Selection */}
              <button
                type="button"
                onClick={() => setShowDestinationOptions(!showDestinationOptions)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-850/80 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-white block group-hover:text-amber-400 transition-colors">
                      {endAddress ? 'Retorno ao ponto de partida' : 'Nenhum destino final fixo'}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block">
                      {endAddress || 'Termina na última parada cadastrada'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>

              {showDestinationOptions && (
                <div className="p-3 bg-slate-950/60 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateEndAddress('');
                      setShowDestinationOptions(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      !endAddress ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Nenhum destino (Encerrar na última entrega)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateEndAddress(startAddress || 'Ponto de Origem / Depósito');
                      setShowDestinationOptions(false);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      endAddress ? 'bg-amber-500/10 border-amber-500 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    Retornar ao local de partida (Garagem / Depósito)
                  </button>
                </div>
              )}

              {/* Row 2: Definir horário de término */}
              <div className="w-full p-4 flex items-center justify-between hover:bg-slate-850/80 transition-colors text-left group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-400 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">
                      Definir horário de término
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {endTime ? `Término limite: ${endTime}` : 'Sem limite de horário estipulado'}
                    </span>
                  </div>
                </div>

                {editingEndTime ? (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => onUpdateEndTime(e.target.value)}
                    onBlur={() => setEditingEndTime(false)}
                    autoFocus
                    className="bg-slate-950 border border-tech text-tech font-mono font-bold text-xs px-2.5 py-1 rounded-lg outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingEndTime(true)}
                    className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-750 cursor-pointer"
                  >
                    <span>{endTime || 'Definir'}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* SECTION 3: PAUSA */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 px-1">
              Pausa
            </span>
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-sm text-white block">
                    Adicionar pausa (Almoço / Descanso)
                  </span>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {hasPause ? `Pausa programada: ${pauseDurationMinutes} min` : 'Nenhuma pausa inserida'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasPause && (
                  <select
                    value={pauseDurationMinutes}
                    onChange={(e) => onUpdatePauseDuration(Number(e.target.value))}
                    className="bg-slate-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-2 py-1 rounded-lg outline-none cursor-pointer"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => onTogglePause(!hasPause)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    hasPause ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-slate-950 transition-transform shadow-md ${
                      hasPause ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 mt-4 border-t border-slate-850 space-y-4">
          <button
            type="button"
            onClick={handleFinish}
            className="w-full py-4 bg-tech text-slate-950 font-black text-sm uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-98 transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[3px]" />
            Concluído
          </button>

          <label className="flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={saveDefault}
              onChange={(e) => setSaveDefault(e.target.checked)}
              className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-tech focus:ring-tech cursor-pointer"
            />
            <span>Salvar como padrão para próximas rotas</span>
          </label>
        </div>

      </div>
    </div>
  );
}
