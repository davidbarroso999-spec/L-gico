'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { MapPin, Clock, AlertTriangle, ChevronRight, CheckCircle2, Navigation } from 'lucide-react';
import { RouteStop } from '@/lib/route-engine';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarProps {
  stops: RouteStop[];
  summary: { distance: number, duration: number };
  score: number;
  aiAnalysis?: string;
  onNavigate: () => void;
  isLoading: boolean;
}

export default function Sidebar({ stops, summary, score, aiAnalysis, onNavigate, isLoading }: SidebarProps) {
  const isMobile = useIsMobile();
  const [isMobileExpanded, setIsMobileExpanded] = React.useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    return hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
  };

  const getScoreColor = (s: number) => {
    if (s > 80) return 'text-tech';
    if (s > 50) return 'text-warning';
    return 'text-alert';
  };

  const dragControls = useDragControls();

  if (isMobile) {
    return (
      <motion.div 
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, info) => {
          if (info.offset.y < -30) setIsMobileExpanded(true);
          if (info.offset.y > 30) setIsMobileExpanded(false);
        }}
        initial={false}
        animate={{ y: isMobileExpanded ? 0 : 'calc(100% - 170px)' }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-[2000] flex flex-col bg-slate-950/95 border-t border-slate-800/80 rounded-t-[32px] backdrop-blur-xl shadow-[0_-15px_30px_rgba(0,0,0,0.6)] h-[75vh] md:h-[80vh]"
      >
        {/* Mobile Header indicator & touch drag handle */}
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="flex flex-col items-center py-3 cursor-grab active:cursor-grabbing select-none touch-none shrink-0"
        >
          <div className="w-12 h-1.5 rounded-full bg-slate-700/80 mb-3" />
          <div className="flex justify-between items-center w-full px-6">
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              Resumo da Rota 
              <span className={`text-[9px] px-1.5 py-0.5 rounded bg-tech/15 text-tech font-bold font-mono`}>
                Score: {Math.round(score)}
              </span>
            </h2>
            <span className="text-xs text-tech font-bold font-mono">
              {(summary.distance / 1000).toFixed(1)} km · {formatTime(summary.duration)}
            </span>
          </div>
        </div>

        {/* Content list when expanded OR collapsed. We will keep it rendered but conditionally visible or scrollable. */}
        {/* Floating Start Navigation button when collapsed */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
          <AnimatePresence>
            {!isMobileExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 pb-6 pt-1 shrink-0 absolute top-0 left-0 w-full z-10"
              >
                <button 
                  onClick={onNavigate}
                  className="w-full bg-tech hover:bg-tech/80 active:scale-95 transition-all text-slate-950 font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(0,212,170,0.2)]"
                  disabled={stops.length === 0}
                >
                  <Navigation className="w-4 h-4 fill-current" />
                  Iniciar Navegação
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            className="flex-1 overflow-hidden flex flex-col min-h-0 relative h-full bg-slate-950/50"
            animate={{ opacity: isMobileExpanded ? 1 : 0, pointerEvents: isMobileExpanded ? 'auto' : 'none' }}
          >
            {/* AI analysis inside */}
            {aiAnalysis && (
              <div className="px-6 pb-2 shrink-0">
                <div className="p-3 bg-tech/5 border border-tech/10 rounded-xl relative overflow-hidden">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-tech mb-1 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-tech animate-pulse" />
                    Análise Logix (IA)
                  </p>
                  <p className="text-[10px] text-slate-300 leading-relaxed italic">
                    &quot;{aiAnalysis}&quot;
                  </p>
                </div>
              </div>
            )}

            {/* Stops list on mobile */}
            <div className="flex-1 overflow-y-auto px-6 pb-24 custom-scrollbar">
              <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest mt-1">Mapeamento das Paradas</p>
              <AnimatePresence mode="popLayout">
                {stops.map((stop, idx) => (
                  <motion.div
                    key={stop.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl"
                  >
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black border border-slate-700 text-slate-300 shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5 gap-2">
                          <p className="font-bold text-slate-100 text-xs truncate leading-tight">{stop.address}</p>
                          {stop.riskScore > 20 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap mt-1">
                          <span className="flex items-center gap-0.5">Alt: {Math.round(stop.elevation || 0)}m</span>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 text-amber-500 font-medium">Risco: {Math.round(stop.riskScore)}%</span>
                          {stop.estimatedArrival && (
                            <>
                              <span>·</span>
                              <span className="text-tech font-bold font-mono">ETA: {stop.estimatedArrival}</span>
                            </>
                          )}
                        </div>

                        {/* Event / Occurrences warning */}
                        {stop.activeOccurrences && stop.activeOccurrences.length > 0 && (
                          <div className="mt-2 py-1.5 px-2 bg-red-950/20 border border-red-500/20 rounded-lg text-[9px] text-red-400">
                            <strong>{stop.activeOccurrences.length} Incidentes no entorno:</strong>
                            <ul className="list-disc pl-3 mt-1 space-y-0.5">
                              {stop.activeOccurrences.map((occ: any, oIdx: number) => (
                                <li key={oIdx} className="capitalize">
                                  {occ.type === 'flood' ? 'Alagamento' : occ.type === 'accident' ? 'Acidente' : occ.type}: {occ.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Amazonas Hydrology Warning (Mobile) */}
                        {stop.amazonasHydrology && (
                          <div className="mt-2 text-[9px] py-1.5 px-2.5 rounded-xl border flex flex-col gap-0.5 bg-sky-950/25 border-sky-500/20 text-sky-300">
                            <span className="font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                              Climatologia AM: {stop.amazonasHydrology.seasonLabel}
                            </span>
                            <p className="text-[9px] text-slate-350 leading-relaxed font-sans">{stop.amazonasHydrology.warning}</p>
                          </div>
                        )}

                        {/* Weather inside stops info for mobile */}
                        <div className="mt-2 py-1 px-2.5 bg-slate-950/40 rounded-lg flex items-center justify-between border border-white/5">
                          <div className="flex items-center gap-1.5">
                            {stop.weather && (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                src={`https://openweathermap.org/img/wn/${stop.weather.weather[0].icon}.png`}
                                alt={stop.weather.weather[0].description}
                                className="w-5 h-5"
                              />
                            )}
                            <span className="capitalize font-medium text-[9px] text-slate-400">
                              {stop.weather?.weather[0].description || 'N/A'}
                            </span>
                          </div>
                          <span className="text-[9px] font-black text-white bg-tech/5 px-1.5 py-0.2 rounded border border-tech/10">
                            {Math.round(stop.weather?.main.temp || 0)}°C
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Start Navigation Floating Trigger at bottom of scrollable area */}
            <div className="px-6 py-4 border-t border-slate-900 bg-slate-950 shrink-0 absolute bottom-0 left-0 right-0 z-10">
              <button 
                onClick={onNavigate}
                className="w-full bg-tech hover:bg-tech/85 active:scale-[0.98] transition-all text-slate-950 font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(0,212,170,0.3)]"
              >
                <Navigation className="w-4 h-4 fill-current" />
                Iniciar Rota ({stops.length} Paradas)
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col glass overflow-hidden h-full">
      {/* Header Summary */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/30 shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Resumo da Rota</h2>
            <p className="text-slate-400 text-xs md:text-sm">Calculado para hoje</p>
          </div>
          <div className={`text-3xl md:text-4xl font-black ${getScoreColor(score)}`}>
            {Math.round(score)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Distância</p>
            <p className="text-base md:text-lg font-medium leading-none">{(summary.distance / 1000).toFixed(1)} km</p>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Duração</p>
            <p className="text-base md:text-lg font-medium leading-none">{formatTime(summary.duration)}</p>
          </div>
        </div>

        {aiAnalysis && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 md:mt-6 p-4 bg-tech/5 border border-tech/20 rounded-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 className="w-8 h-8 text-tech" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-tech mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tech animate-pulse" />
              Brain Logix (IA)
            </p>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              &quot;{aiAnalysis}&quot;
            </p>
          </motion.div>
        )}

        <button 
          onClick={onNavigate}
          className="w-full mt-4 md:mt-6 bg-tech hover:bg-tech/80 active:scale-95 transition-all text-slate-950 font-bold py-3 md:py-4 rounded-2xl flex items-center justify-center gap-2 group shadow-[0_10px_30px_rgba(0,212,170,0.3)]"
          disabled={stops.length === 0}
        >
          <Navigation className="w-5 h-5 fill-current" />
          Iniciar Navegação
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Stop List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {stops.map((stop, idx) => (
            <motion.div
              key={stop.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              className="group mb-4 bg-slate-900/50 border border-slate-800 hover:border-tech/40 p-4 rounded-2xl transition-all"
            >
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-700">
                    {idx + 1}
                  </div>
                  {idx < stops.length - 1 && (
                    <div className="w-0.5 h-full bg-slate-800 my-1 min-h-[20px]" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-slate-100 leading-tight pr-4 truncate">{stop.address}</p>
                    {stop.riskScore > 20 && (
                      <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Alt: {Math.round(stop.elevation || 0)}m
                    </span>
                    <span className="flex items-center gap-1 text-amber-500">
                      <AlertTriangle className="w-3 h-3" />
                      Risco: {Math.round(stop.riskScore)}%
                    </span>
                    {stop.estimatedArrival && (
                      <span className="flex items-center gap-1 text-tech font-bold font-mono">
                        <Clock className="w-3" />
                        ETA: {stop.estimatedArrival}
                      </span>
                    )}
                    {stop.timeWindow && (
                      <span className="font-mono text-[9px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded border-dashed">
                        Janela: {stop.timeWindow.start} - {stop.timeWindow.end}
                      </span>
                    )}
                  </div>

                  {/* Near Incident Occurrences warning for desktop */}
                  {stop.activeOccurrences && stop.activeOccurrences.length > 0 && (
                    <div className="mt-3 py-2 px-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-300">
                      <strong>Incidentes mapeados no entorno:</strong>
                      <ul className="list-disc pl-4 mt-1 space-y-1">
                        {stop.activeOccurrences.map((occ: any, oIdx: number) => (
                          <li key={oIdx} className="capitalize">
                            {occ.type === 'flood' ? 'Alagamento' : occ.type === 'accident' ? 'Acidente' : occ.type}: {occ.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Amazonas Hydrology Warning (Desktop) */}
                  {stop.amazonasHydrology && (
                    <div className="mt-3 py-2.5 px-3.5 rounded-2xl border flex flex-col gap-1 bg-sky-950/25 border-sky-500/20 text-sky-300 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-sky-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                        Hidrologia AM: {stop.amazonasHydrology.seasonLabel}
                      </div>
                      <p className="text-[11px] text-slate-350 leading-normal font-sans">{stop.amazonasHydrology.warning}</p>
                      <p className="text-[10px] text-slate-450 italic leading-normal font-sans mt-0.5 border-t border-sky-500/10 pt-1">
                        <strong>Histórico:</strong> {stop.amazonasHydrology.historicalContext}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 py-3 px-4 bg-slate-950/50 rounded-2xl text-xs flex items-center justify-between border border-white/5 group-hover:border-tech/20 transition-colors">
                    <div className="flex items-center gap-3">
                      {stop.weather && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                          src={`https://openweathermap.org/img/wn/${stop.weather.weather[0].icon}@2x.png`}
                          alt={stop.weather.weather[0].description}
                          className="w-10 h-10 -ml-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-black letter tracking-tighter">Condição</span>
                        <span className="capitalize font-bold text-slate-300">
                          {stop.weather?.weather[0].description || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Temp</span>
                      <span className="text-sm font-black text-white bg-tech/10 px-2 py-0.5 rounded-lg border border-tech/20">
                        {Math.round(stop.weather?.main.temp || 0)}°C
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
