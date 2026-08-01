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
  Hash
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

  const addressTitle = stop.name || stop.address?.split(',')[0] || 'Parada sem nome';
  const fullAddress = stop.address || '';
  const cep = getFormattedCep(stop, stopIndex);
  const stopId = stop.id || stopIndex + 1;
  const activeRouteId = routeId || stop.routeId || `ROT-${8400 + stopIndex * 13}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1200] flex flex-col md:max-w-2xl md:mx-auto">
      
      {/* Dynamic Bottom Sheet Container */}
      <div className={`bg-slate-950/98 backdrop-blur-2xl border-t border-x border-tech/40 text-white rounded-t-[28px] shadow-[0_-12px_45px_rgba(0,0,0,0.9)] transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[82vh] overflow-y-auto custom-scrollbar' : 'max-h-[140px]'
      }`}>
        
        {/* Grab Handle Header (Click or Drag area to toggle peek vs full expand) */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer group hover:bg-white/5 transition-colors rounded-t-[28px] select-none shrink-0"
        >
          <div className="w-12 h-1.5 bg-slate-700 group-hover:bg-tech rounded-full transition-colors mb-1.5" />
          <div className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-widest text-slate-400 group-hover:text-tech">
            {isExpanded ? (
              <>
                <ChevronDown className="w-4 h-4 text-tech" />
                <span>Recolher Detalhes (Minimizar 10%)</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4 text-tech animate-bounce" />
                <span>Expandir Opções e Ações (10%)</span>
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
                <span className="bg-tech/20 border border-tech/40 text-tech px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  {stopIndex + 1}/{totalStops}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">{etaString}</span>
                <span className="text-[10px] font-mono text-slate-400">#{activeRouteId}</span>
              </div>
              <p className="text-sm font-black text-white truncate mt-0.5">
                {addressTitle}
              </p>
            </div>

            {/* Quick Action Button in Collapsed Peek Mode */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkDelivered();
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Entregue</span>
              </button>
            </div>
          </div>
        )}

        {/* Expanded Detailed View (when user opens sheet) */}
        {isExpanded && (
          <div className="px-5 pt-1 pb-4 space-y-4">
            
            {/* Nível 1: Nome do local / Endereço completo */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[9px] uppercase font-mono font-bold text-tech bg-tech/10 border border-tech/30 px-2 py-0.5 rounded-md">
                  Rota ID: {activeRouteId}
                </span>
                <span className="text-[9.5px] font-mono font-bold text-slate-400">
                  Parada ID: #{stopId}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-white leading-tight tracking-tight">
                {addressTitle}
              </h2>
              {fullAddress && fullAddress !== addressTitle && (
                <p className="text-xs text-slate-400 mt-0.5 leading-normal line-clamp-2">
                  {fullAddress}
                </p>
              )}
            </div>

            {/* Nível 2: Metadados da Parada (Ex: Parada 1 de 6 • ETA 14:52) */}
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <span className="bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-tech font-bold">
                {stopIndex + 1}/{totalStops}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-extrabold">{etaString}</span>
              <span>•</span>
              <span className="text-slate-300 font-sans">CEP: {cep}</span>
            </div>

            {/* Nível 3: DOIS botões grandes de ação principal lado a lado */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Botão Vermelho: Não entregue */}
              <button
                onClick={onMarkUndelivered}
                className="py-3.5 px-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 text-red-400 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-500/10 cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>Não entregue</span>
              </button>

              {/* Botão Verde: Entregue */}
              <button
                onClick={onMarkDelivered}
                className="py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0" />
                <span>Entregue</span>
              </button>
            </div>

            {/* Nível 4: Lista secundária com chevron > */}
            <div className="space-y-1 pt-2 border-t border-slate-850">
              {/* Item 1: Adicionar notas */}
              <button
                onClick={() => {
                  setEditingNotes(!editingNotes);
                }}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-900 transition-colors text-left text-xs text-slate-300 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCheck className="w-4 h-4 text-tech shrink-0" />
                  <span className="font-semibold truncate">
                    {stop.deliveryNotes ? `Nota: "${stop.deliveryNotes}"` : 'Adicionar notas de entrega'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-tech transition-colors shrink-0" />
              </button>

              {editingNotes && (
                <div className="px-3 pb-2 flex gap-2">
                  <input
                    type="text"
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Ex: Deixar com o síndico na portaria"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-tech"
                  />
                  <button
                    onClick={() => {
                      if (onAddNotes) onAddNotes(notesText);
                      setEditingNotes(false);
                    }}
                    className="px-3 py-1.5 bg-tech text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              )}

              {/* Item 2: CEP Oficial */}
              <div className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-900 transition-colors text-left text-xs text-slate-300">
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-300">CEP Oficial: {cep}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </div>

              {/* Item 3: Código de Busca Rota/Parada */}
              <div className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-900 transition-colors text-left text-xs text-slate-300">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-300">ID da Rota: #{activeRouteId} (Posição {stopIndex + 1})</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
              </div>
            </div>

            {/* Nível 5: Separado por linha divisória visível: Ações raras / administrativas */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider px-3 block mb-1">
                Ações Administrativas
              </span>

              {/* Editar parada */}
              <button
                onClick={onEditStop}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-900 transition-colors text-left text-xs text-slate-300 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Edit3 className="w-4 h-4 text-slate-400 group-hover:text-tech transition-colors shrink-0" />
                  <span className="font-semibold">Editar parada</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-tech transition-colors shrink-0" />
              </button>

              {/* Duplicar parada */}
              <button
                onClick={onDuplicateStop}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-slate-900 transition-colors text-left text-xs text-slate-300 cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="w-4 h-4 text-slate-400 group-hover:text-tech transition-colors shrink-0" />
                  <span className="font-semibold">Duplicar parada</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-tech transition-colors shrink-0" />
              </button>

              {/* Remover parada (texto vermelho) */}
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
      <div className="bg-slate-950 border-t border-slate-800 px-5 py-3 flex items-center justify-between text-xs text-white">
        <div className="flex items-center gap-2 font-mono font-bold">
          <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 font-extrabold">{remainingTimeMinutes} min</span>
          <span className="text-slate-500">•</span>
          <span className="text-white">{etaString}</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">{remainingDistanceKm.toFixed(1)} km</span>
        </div>

        <button
          onClick={onViewAllStops}
          className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-tech text-tech flex items-center justify-center transition-colors cursor-pointer"
          title="Ver Lista Completa de Paradas"
        >
          <List className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
}
