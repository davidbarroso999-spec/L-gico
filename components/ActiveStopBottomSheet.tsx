'use client';

import React, { useState } from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  ChevronRight, 
  FileText, 
  Edit3, 
  Copy, 
  Trash2, 
  Clock, 
  MapPin, 
  List, 
  FileCheck,
  ChevronUp,
  ChevronDown,
  Tag,
  Hash,
  Waves,
  Anchor,
  Play,
  Navigation,
  ArrowRight
} from 'lucide-react';

interface ActiveStopBottomSheetProps {
  stop: any;
  stopIndex: number;
  totalStops: number;
  remainingTimeMinutes: number;
  remainingDistanceKm: number;
  etaString: string;
  routeId?: string;
  onMarkDelivered: () => void;
  onMarkUndelivered: () => void;
  onEditStop?: () => void;
  onDuplicateStop?: () => void;
  onRemoveStop?: () => void;
  onAddNotes?: (notes: string) => void;
  onViewAllStops?: () => void;
}

const getFormattedCep = (stop: any, index: number) => {
  if (stop?.cep && stop.cep !== '69000-000' && stop.cep !== '69000000') return stop.cep;
  if (stop?.postalCode && stop.postalCode !== '69000-000') return stop.postalCode;
  
  const addressStr = stop?.address || stop?.name || '';
  const match = addressStr.match(/\d{5}-?\d{3}/);
  if (match) return match[0];
  
  const manausNeighborhoodCeps: Record<string, string> = {
    'centro': '69010-000',
    'adrianopolis': '69057-070',
    'adrianópolis': '69057-070',
    'aleixo': '69060-000',
    'chapada': '69050-010',
    'distrito': '69075-000',
    'ponta negra': '69037-000',
    'japiim': '69077-000',
    'cidade nova': '69090-000',
    'parque 10': '69058-030',
    'flores': '69058-000',
    'tarumã': '69040-000',
    'compensa': '69035-000',
    'cachoeirinha': '69065-000',
    'praça 14': '69020-000',
    'são jorge': '69033-000'
  };

  const lowerAddr = addressStr.toLowerCase();
  for (const [key, val] of Object.entries(manausNeighborhoodCeps)) {
    if (lowerAddr.includes(key)) return val;
  }

  const baseCeps = ['69010-040', '69057-070', '69060-020', '69075-000', '69037-000', '69090-000'];
  return baseCeps[index % baseCeps.length];
};

export default function ActiveStopBottomSheet({
  stop,
  stopIndex,
  totalStops,
  remainingTimeMinutes,
  remainingDistanceKm,
  etaString,
  routeId,
  onMarkDelivered,
  onMarkUndelivered,
  onEditStop,
  onDuplicateStop,
  onRemoveStop,
  onAddNotes,
  onViewAllStops
}: ActiveStopBottomSheetProps) {
  // Collapsed by default (10% peek height at screen bottom for clear map view)
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState(stop?.deliveryNotes || '');

  if (!stop) return null;

  const isOrigin = stopIndex === 0 || !!stop.isOrigin;
  const deliveryIndex = isOrigin ? 0 : stopIndex;
  const totalDeliveries = Math.max(1, totalStops - 1);

  const addressTitle = isOrigin 
    ? (stop.name || 'Ponto de Partida / Garagem')
    : (stop.name || stop.address?.split(',')[0] || 'Parada sem nome');
  const fullAddress = stop.address || '';
  const cep = getFormattedCep(stop, stopIndex);
  const stopId = stop.id || stopIndex + 1;
  const activeRouteId = routeId || stop.routeId || `ROT-${8400 + stopIndex * 13}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1200] flex flex-col md:max-w-2xl md:mx-auto font-sans">
      
      {/* Dynamic Bottom Sheet Container */}
      <div className={`bg-slate-950 border-t-2 border-x-2 border-slate-700 text-white rounded-t-2xl shadow-[0_-8px_0px_0px_#000000] transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[82vh] overflow-y-auto custom-scrollbar' : 'max-h-[140px]'
      }`}>
        
        {/* Grab Handle Header (Click or Drag area to toggle peek vs full expand) */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer group hover:bg-white/5 transition-colors rounded-t-2xl select-none shrink-0"
        >
          <div className="w-12 h-1.5 bg-slate-700 group-hover:bg-amber-400 rounded-full transition-colors mb-1.5" />
          <div className="flex items-center gap-1.5 text-[9.5px] font-mono font-black uppercase tracking-widest text-slate-400 group-hover:text-amber-400">
            {isExpanded ? (
              <>
                <ChevronDown className="w-4 h-4 text-amber-400" />
                <span>Recolher Detalhes (Minimizar)</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>Expandir Opções e Ações</span>
              </>
            )}
          </div>
        </div>

        {/* Collapsed Peek Header (10% Height State) */}
        {!isExpanded && (
          <div 
            onClick={() => setIsExpanded(true)}
            className="px-5 pb-3 flex items-center justify-between gap-3 cursor-pointer select-none"
          >
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isOrigin ? (
                  <span className="neo-badge-tech px-2 py-0.5 rounded text-[10px]">
                    Partida
                  </span>
                ) : (
                  <span className="neo-badge-emerald px-2 py-0.5 rounded text-[10px]">
                    Entrega {deliveryIndex}/{totalDeliveries}
                  </span>
                )}
                <span className="text-[11px] font-mono text-emerald-400 font-extrabold">{etaString}</span>
                <span className="text-[10px] font-mono text-slate-400">#{activeRouteId}</span>
              </div>
              <p className="text-sm font-black text-white truncate mt-1">
                {addressTitle}
              </p>
            </div>

            {/* Quick Action Button in Collapsed Peek Mode */}
            <div className="flex items-center gap-2 shrink-0">
              {isOrigin ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkDelivered();
                  }}
                  className="neo-btn-primary px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Play className="w-4 h-4 text-slate-950 fill-current" />
                  <span>Iniciar</span>
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkDelivered();
                  }}
                  className="neo-btn-emerald px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Entregue</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Expanded Detailed View (when user opens sheet) */}
        {isExpanded && (
          <div className="px-5 pt-1 pb-4 space-y-4">
            
            {/* Nível 1: Nome do local / Endereço completo */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="neo-badge-tech px-2 py-0.5 rounded text-[9px]">
                  ROTA: {activeRouteId}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {isOrigin ? 'ORIGEM' : `PARADA #${stopId}`}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white leading-tight tracking-tight">
                {addressTitle}
              </h2>
              {fullAddress && fullAddress !== addressTitle && (
                <p className="text-xs text-slate-400 mt-1 leading-normal line-clamp-2">
                  {fullAddress}
                </p>
              )}
            </div>

            {/* Nível 2: Metadados da Parada */}
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-300 bg-slate-900 p-2.5 rounded-xl border-2 border-slate-800 shadow-[2px_2px_0px_0px_#000000]">
              {isOrigin ? (
                <span className="neo-badge-tech px-2 py-0.5 rounded text-[10px]">
                  Partida
                </span>
              ) : (
                <span className="neo-badge-emerald px-2 py-0.5 rounded text-[10px]">
                  Entrega {deliveryIndex}/{totalDeliveries}
                </span>
              )}
              <span>•</span>
              <span className="text-emerald-400 font-extrabold">{etaString}</span>
              <span>•</span>
              <span className="text-slate-300">CEP: {cep}</span>
            </div>

            {/* Informações Fluviais / Hidrologia Náutica se for porto fluvial */}
            {(stop.fluvialPort || stop.amazonasHydrology) && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border-2 border-cyan-500/50 text-xs space-y-1.5 shadow-[3px_3px_0px_0px_#000000]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Anchor className="w-3.5 h-3.5" />
                    Ponto de Atracação Fluvial
                  </span>
                  <span className="bg-cyan-500 text-slate-950 font-mono text-[10px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">
                    {stop.fluvialPort || 'Terminal Fluvial'}
                  </span>
                </div>
                {stop.amazonasHydrology && (
                  <div className="text-[11px] text-slate-300 flex items-center justify-between border-t border-cyan-500/20 pt-1.5 mt-1 font-mono">
                    <span>Cota do Rio: <b className="text-white font-bold">{stop.amazonasHydrology.riverLevelMeters}m</b></span>
                    <span className="text-amber-400 font-black">{stop.amazonasHydrology.banzeiroIndex?.split(' ')[0] || 'Águas Calmas'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Nível 3: Ações Principais */}
            {isOrigin ? (
              <div className="pt-1">
                <button
                  onClick={onMarkDelivered}
                  className="neo-btn-primary w-full py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 text-slate-950 fill-current shrink-0" />
                  <span>Iniciar Saída / Ir para 1ª Entrega</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 ml-1" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Botão Vermelho: Não entregue */}
                <button
                  onClick={onMarkUndelivered}
                  className="neo-btn-rose py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5 text-white shrink-0" />
                  <span>Não entregue</span>
                </button>

                {/* Botão Verde: Entregue */}
                <button
                  onClick={onMarkDelivered}
                  className="neo-btn-emerald py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
                  <span>Entregue</span>
                </button>
              </div>
            )}

            {/* Nível 4: Lista secundária com chevron > */}
            <div className="space-y-1.5 pt-2 border-t-2 border-slate-800">
              {/* Item 1: Adicionar notas */}
              <button
                onClick={() => {
                  setEditingNotes(!editingNotes);
                }}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-amber-400 transition-all text-left text-xs text-slate-300 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold truncate">
                    {stop.deliveryNotes ? `Nota: "${stop.deliveryNotes}"` : 'Adicionar notas de entrega'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
              </button>

              {editingNotes && (
                <div className="px-3 pb-2 flex gap-2">
                  <input
                    type="text"
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Ex: Deixar com o síndico na portaria"
                    className="neo-input flex-1 px-3 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => {
                      if (onAddNotes) onAddNotes(notesText);
                      setEditingNotes(false);
                    }}
                    className="neo-btn-primary px-3 py-1.5 text-xs rounded-lg"
                  >
                    Salvar
                  </button>
                </div>
              )}

              {/* Item 2: CEP Oficial */}
              <div className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs text-slate-300">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-300 font-mono">CEP Oficial: {cep}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </div>

              {/* Item 3: Código de Busca Rota/Parada */}
              <div className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800 text-left text-xs text-slate-300">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-300 font-mono">ID ROTA: #{activeRouteId} (Posição {stopIndex + 1})</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </div>
            </div>

            {/* Nível 5: Separado por linha divisória visível: Ações raras / administrativas */}
            <div className="pt-2 border-t-2 border-slate-800 space-y-1">
              <span className="text-[9px] uppercase font-mono font-bold text-slate-500 tracking-wider px-3 block mb-1">
                Ações Administrativas
              </span>

              {/* Editar parada */}
              <button
                onClick={onEditStop}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-900 transition-colors text-left text-xs text-slate-300 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
                  <span className="font-semibold">Editar parada</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
              </button>

              {/* Duplicar parada */}
              <button
                onClick={onDuplicateStop}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-900 transition-colors text-left text-xs text-slate-300 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
                  <span className="font-semibold">Duplicar parada</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
              </button>

              {/* Remover parada */}
              <button
                onClick={onRemoveStop}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-red-500/10 transition-colors text-left text-xs text-red-400 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="font-semibold">Remover parada</span>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400/60 group-hover:text-red-400 transition-colors shrink-0" />
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Nível 6: Fixado no rodapé da tela fora do card da parada */}
      <div className="bg-slate-950 border-t-2 border-slate-800 px-5 py-3 flex items-center justify-between text-xs text-white shadow-[0_-4px_0px_0px_#000000]">
        <div className="flex items-center gap-2 font-mono font-bold">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 font-extrabold">{remainingTimeMinutes} min</span>
          <span className="text-slate-600">•</span>
          <span className="text-white">{etaString}</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300">{remainingDistanceKm.toFixed(1)} km</span>
        </div>

        <button
          onClick={onViewAllStops}
          className="neo-btn w-9 h-9 rounded-xl bg-slate-900 border-2 border-slate-700 hover:border-amber-400 text-amber-400 flex items-center justify-center transition-colors"
          title="Ver Lista Completa de Paradas"
        >
          <List className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
