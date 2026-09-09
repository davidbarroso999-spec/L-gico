'use client';

import React, { useState } from 'react';
import { Shield, Camera, AlertTriangle, AlertOctagon, Car, Cone, CloudRain, Anchor, CheckCircle2, X, ChevronRight, ArrowLeft } from 'lucide-react';
import { db, Occurrence } from '@/lib/db';
import { voiceNav } from '@/lib/voice-navigation';

interface WazeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: [number, number] | null;
  onReportSaved?: (newOccurrence: Occurrence) => void;
}

type IncidentCategory = {
  id: Occurrence['type'];
  label: string;
  icon: any;
  color: string;
  subOptions?: string[];
};

const CATEGORIES: IncidentCategory[] = [
  {
    id: 'police',
    label: 'Polícia / Blitz',
    icon: Shield,
    color: 'from-blue-600 to-indigo-700 text-blue-100 border-blue-400/40',
    subOptions: ['Visível', 'Oculta', 'Do outro lado da via']
  },
  {
    id: 'speed_camera',
    label: 'Radar',
    icon: Camera,
    color: 'from-emerald-600 to-teal-700 text-emerald-100 border-emerald-400/40',
    subOptions: ['Radar Fixo (60 km/h)', 'Radar Móvel', 'Semáforo com Radar']
  },
  {
    id: 'congestion',
    label: 'Trânsito',
    icon: Car,
    color: 'from-amber-500 to-orange-600 text-amber-100 border-amber-400/40',
    subOptions: ['Moderado', 'Intenso / Parado', 'Em fila']
  },
  {
    id: 'accident',
    label: 'Acidente',
    icon: AlertOctagon,
    color: 'from-red-600 to-rose-700 text-red-100 border-red-400/40',
    subOptions: ['Pista liberada', 'Bloqueio de 1 faixa', 'Grave / Ambulância']
  },
  {
    id: 'pothole',
    label: 'Perigo na Via',
    icon: AlertTriangle,
    color: 'from-yellow-600 to-amber-700 text-yellow-100 border-yellow-400/40',
    subOptions: ['Buraco grande', 'Objeto na pista', 'Animal na pista', 'Pista escorregadia']
  },
  {
    id: 'road_closed',
    label: 'Obras / Bloqueio',
    icon: Cone,
    color: 'from-orange-600 to-red-600 text-orange-100 border-orange-400/40',
    subOptions: ['Obras na pista', 'Interdição total', 'Desvio sinalizado']
  },
  {
    id: 'flood',
    label: 'Alagamento',
    icon: CloudRain,
    color: 'from-cyan-600 to-blue-700 text-cyan-100 border-cyan-400/40',
    subOptions: ['Ponto de alagamento', 'Água cobrindo a via', 'Chuva torrencial']
  },
  {
    id: 'sandbank',
    label: 'Alerta Fluvial',
    icon: Anchor,
    color: 'from-sky-700 to-teal-800 text-sky-100 border-sky-400/40',
    subOptions: ['Banco de areia', 'Tronco flutuante', 'Pedral submerso', 'Repiquete']
  }
];

export default function WazeReportModal({ isOpen, onClose, currentCoords, onReportSaved }: WazeReportModalProps) {
  const [selectedCat, setSelectedCat] = useState<IncidentCategory | null>(null);
  const [selectedSub, setSelectedSub] = useState<string>('');
  const [direction, setDirection] = useState<'my_side' | 'opposite' | 'both'>('my_side');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectCategory = (cat: IncidentCategory) => {
    setSelectedCat(cat);
    if (cat.subOptions && cat.subOptions.length > 0) {
      setSelectedSub(cat.subOptions[0]);
    } else {
      setSelectedSub('');
    }
  };

  const handleConfirmReport = async () => {
    if (!selectedCat) return;

    setIsSaving(true);
    try {
      const lat = currentCoords ? currentCoords[0] : -3.1190;
      const lon = currentCoords ? currentCoords[1] : -60.0217;

      const newOcc: Occurrence = {
        type: selectedCat.id,
        subType: selectedSub || selectedCat.label,
        direction,
        lat,
        lon,
        description: `${selectedCat.label}: ${selectedSub || 'Informado pelo condutor em tempo real'} (${direction === 'my_side' ? 'Meu sentido' : direction === 'opposite' ? 'Sentido contrário' : 'Ambos os sentidos'})`,
        timestamp: new Date(),
        synced: false
      };

      const id = await db.occurrences.add(newOcc);
      const savedOcc = { ...newOcc, id };

      voiceNav.playChime();
      voiceNav.speak(`Reporte de ${selectedCat.label} enviado. Obrigado pela contribuição!`);

      if (onReportSaved) {
        onReportSaved(savedOcc);
      }

      setSuccessMessage('Reporte compartilhado em tempo real com todos os motoristas!');
      setTimeout(() => {
        setSuccessMessage(null);
        setSelectedCat(null);
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Erro ao salvar reporte comunitário:', err);
      alert('Não foi possível registrar o reporte no momento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3500] bg-slate-950/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh] text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="waze-report-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            {selectedCat ? (
              <button
                type="button"
                onClick={() => setSelectedCat(null)}
                className="w-9 h-9 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-400 flex items-center justify-center transition-all cursor-pointer"
                title="Voltar às Categorias"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
            )}
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">Comunidade em Tempo Real</span>
              <h3 id="waze-report-title" className="text-base sm:text-lg font-black tracking-tight text-white">
                {selectedCat ? selectedCat.label : 'Reportar Incidente'}
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

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1">
          {successMessage ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-black text-white">Reporte Registrado!</h4>
              <p className="text-sm text-slate-300 max-w-xs">{successMessage}</p>
            </div>
          ) : !selectedCat ? (
            <div>
              <p className="text-xs text-slate-400 mb-3 font-medium">
                Toque no tipo de ocorrência que você está avistando na via:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat)}
                      className={`p-3.5 rounded-2xl bg-gradient-to-br ${cat.color} border flex flex-col items-center justify-center text-center gap-2 hover:scale-[1.03] active:scale-95 transition-all shadow-md cursor-pointer`}
                    >
                      <div className="w-11 h-11 rounded-full bg-black/25 flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-black tracking-tight leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Sub-type Selection */}
              {selectedCat.subOptions && selectedCat.subOptions.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-2">
                    Detalhe da Ocorrência:
                  </label>
                  <div className="space-y-2">
                    {selectedCat.subOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSelectedSub(opt)}
                        className={`w-full p-3 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer border ${
                          selectedSub === opt
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{opt}</span>
                        {selectedSub === opt && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Direction of Incident */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">
                  Sentido da Via:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('my_side')}
                    className={`py-2 px-3 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer ${
                      direction === 'my_side'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Meu Sentido
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('opposite')}
                    className={`py-2 px-3 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer ${
                      direction === 'opposite'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Outro Lado
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('both')}
                    className={`py-2 px-3 rounded-xl text-center text-xs font-bold transition-all border cursor-pointer ${
                      direction === 'both'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Ambos
                  </button>
                </div>
              </div>

              {/* Coordinates Preview */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Localização detectada por GPS:</span>
                <span className="font-mono text-slate-300 font-bold">
                  {currentCoords ? `${currentCoords[0].toFixed(5)}, ${currentCoords[1].toFixed(5)}` : 'Posição Atual'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!successMessage && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
            {selectedCat ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedCat(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReport}
                  disabled={isSaving}
                  className="flex-1 py-2.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Enviando...' : 'Confirmar Reporte'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
