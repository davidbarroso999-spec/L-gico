'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Clock, AlertTriangle, ChevronRight, CheckCircle2, Navigation } from 'lucide-react';
import { RouteStop } from '@/lib/route-engine';

interface SidebarProps {
  stops: RouteStop[];
  summary: { distance: number, duration: number };
  score: number;
  aiAnalysis?: string;
  onNavigate: () => void;
  isLoading: boolean;
}

export default function Sidebar({ stops, summary, score, aiAnalysis, onNavigate, isLoading }: SidebarProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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

  return (
    <div className={`flex flex-col glass overflow-hidden ${isMobile ? 'h-auto max-h-[80vh]' : 'h-full'}`}>
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
              Brain Logix (Kimi 2.6)
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
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Alt: {Math.round(stop.elevation || 0)}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Risco: {Math.round(stop.riskScore)}%
                    </span>
                  </div>

                    <div className="mt-3 py-3 px-4 bg-slate-950/50 rounded-2xl text-xs flex items-center justify-between border border-white/5 group-hover:border-tech/20 transition-colors">
                      <div className="flex items-center gap-3">
                        {stop.weather && (
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
