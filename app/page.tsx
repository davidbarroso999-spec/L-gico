'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Map as MapIcon, 
  Settings, 
  LayoutDashboard, 
  Plus, 
  Play, 
  Trash2, 
  Search,
  Route as RouteIcon,
  Zap,
  Shield,
  Leaf,
  BarChart4,
  CloudRain,
  Navigation as NavIcon,
  AlertOctagon,
  XCircle,
  Camera,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import KpiDashboard from '@/components/Dashboard';
import { optimizeRoute, RouteStop, RouteOptions } from '@/lib/route-engine';
import { db } from '@/lib/db';
import { autocomplete } from '@/lib/api-services';

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center">Carregando Mapa...</div>
});

const DEFAULT_ADDRESSES = [
  'Centro, Manaus, AM',
  'Adrianópolis, Manaus, AM',
  'Aleixo, Manaus, AM',
  'Cidade Nova, Manaus, AM',
  'Flores, Manaus, AM',
  'Compensa, Manaus, AM'
];

const NavItem = ({ icon: Icon, label, isActive, onClick, isMobile }: any) => (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl transition-all relative group ${
        isActive ? (isMobile ? 'text-tech' : 'bg-tech text-slate-950') : 'text-slate-500 hover:text-white'
      }`}
    >
      <Icon className={isMobile ? "w-6 h-6" : "w-5 h-5"} />
      {!isMobile && (
        <span className="absolute left-14 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </span>
      )}
    </button>
);

import { useIsMobile } from '@/hooks/use-mobile';

export default function LogixApp() {
  const isMobile = useIsMobile();
  const [currentScreen, setCurrentScreen] = useState<'home' | 'loading' | 'result' | 'navigation' | 'dashboard' | 'settings'>('home');
  const [addresses, setAddresses] = useState<string[]>(['']);
  const [options, setOptions] = useState<RouteOptions>({
    priority: 'balanced',
    vehicle: 'van',
    avoidDirt: true,
    avoidFloods: true,
    avoidHills: false
  });

  const [routeResult, setRouteResult] = useState<any>(null);
  const [navIndex, setNavIndex] = useState(0);
  const [isReporting, setIsReporting] = useState(false);
  const [reportType, setReportType] = useState<string>('');

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const activeText = activeSuggestionIdx !== null ? addresses[activeSuggestionIdx] : '';
    
    // Condição estrita para evitar cascading renders e loops infinitos
    if (activeText.length < 3) {
      setSuggestions(prev => prev.length > 0 ? [] : prev);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await autocomplete(activeText);
        setSuggestions(res);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Autocomplete error:", error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [addresses, activeSuggestionIdx, suggestions.length]);

  const addAddress = () => setAddresses([...addresses, '']);
  const updateAddress = (idx: number, val: string) => {
    const next = [...addresses];
    next[idx] = val;
    setAddresses(next);
  };
  const removeAddress = (idx: number) => setAddresses(addresses.filter((_, i) => i !== idx));

  const runOptimization = async () => {
    const validAddresses = addresses.filter(a => a.trim().length > 3);
    if (validAddresses.length < 2) return;

    setCurrentScreen('loading');
    setRouteResult(null); // Reset previous
    try {
      const result = await optimizeRoute(validAddresses, options);
      setRouteResult(result);
      
      // Save to IndexedDB
      await db.routes.add({
        date: new Date(),
        addresses: validAddresses,
        sequence: result.sequence,
        score: result.score,
        status: 'pending'
      });

      setTimeout(() => setCurrentScreen('result'), 1500);
    } catch (error) {
      console.error(error);
      setCurrentScreen('home');
    }
  };

  return (
    <div className={`flex flex-col md:flex-row h-full w-full bg-slate-950 overflow-hidden font-sans`}>
      {/* Desktop Sidebar Nav */}
      {!isMobile && (
        <nav className="w-20 border-r border-slate-800 flex flex-col items-center py-8 gap-8 z-50 bg-slate-950">
          <div className="w-12 h-12 bg-tech rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(0,212,170,0.3)]">
            <RouteIcon className="w-7 h-7 text-slate-950" />
          </div>
          
          <div className="flex flex-col gap-4">
            <NavItem 
              icon={MapIcon} 
              id="home" 
              label="Planejamento" 
              isActive={currentScreen === 'home'} 
              onClick={() => setCurrentScreen('home')} 
            />
            <NavItem 
              icon={LayoutDashboard} 
              id="dashboard" 
              label="Métricas" 
              isActive={currentScreen === 'dashboard'} 
              onClick={() => setCurrentScreen('dashboard')} 
            />
            <NavItem 
              icon={Settings} 
              id="settings" 
              label="Configurações" 
              isActive={currentScreen === 'settings'} 
              onClick={() => setCurrentScreen('settings')} 
            />
          </div>
        </nav>
      )}

      {/* Mobile Bottom Nav */}
      {isMobile && currentScreen !== 'navigation' && (
        <nav className="fixed bottom-0 left-0 right-0 h-20 glass z-[2000] flex justify-around items-center px-6 border-t border-white/5 pb-safe">
          <NavItem 
            icon={MapIcon} 
            label="Home" 
            isActive={currentScreen === 'home'} 
            onClick={() => setCurrentScreen('home')} 
            isMobile={isMobile}
          />
          <NavItem 
            icon={LayoutDashboard} 
            label="KPIs" 
            isActive={currentScreen === 'dashboard'} 
            onClick={() => setCurrentScreen('dashboard')} 
            isMobile={isMobile}
          />
          <NavItem 
            icon={Settings} 
            label="Ajustes" 
            isActive={currentScreen === 'settings'} 
            onClick={() => setCurrentScreen('settings')} 
            isMobile={isMobile}
          />
        </nav>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 relative h-full overflow-hidden ${(isMobile && currentScreen !== 'navigation') ? 'pb-20' : ''}`}>
        <AnimatePresence mode="wait">
          {currentScreen === 'home' && (
            <motion.div
              key="home-ui"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`h-full w-full flex flex-col items-center max-w-4xl mx-auto p-6 overflow-y-auto custom-scrollbar ${isMobile ? 'pt-8 pb-32' : 'py-12'}`}
            >
              <div className="w-full flex-shrink-0 flex flex-col items-center mb-12">
                <motion.h1 
                  className="text-4xl md:text-6xl font-bold font-display mb-4 tracking-tighter text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Logix <span className="text-tech">Route</span>
                </motion.h1>
                <p className="text-slate-400 text-sm md:text-lg text-center">Otimização inteligente para entregas sem filtros.</p>
              </div>

              <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                <div className="glass p-8 rounded-[40px] shadow-2xl relative overflow-hidden h-fit">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <MapIcon className="w-32 h-32" />
                  </div>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-tech" />
                    Paradas de Entrega
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    {/* Ponto de Partida */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-tech font-black uppercase tracking-widest px-1 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-tech animate-pulse" />
                        Ponto de Partida (Origem)
                      </label>
                      <div className="flex gap-2 relative">
                        <div className="flex-1 relative">
                          <input
                            value={addresses[0] || ''}
                            onChange={(e) => updateAddress(0, e.target.value)}
                            onFocus={() => setActiveSuggestionIdx(0)}
                            onBlur={() => setTimeout(() => {
                              if (activeSuggestionIdx === 0) setShowSuggestions(false);
                            }, 200)}
                            placeholder="De onde você está saindo?"
                            className="w-full bg-slate-900/80 border border-tech/30 rounded-2xl px-4 py-4 text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all pr-10"
                          />
                          <Search className="absolute right-3 top-4.5 w-4 h-4 text-slate-600" />
                        </div>
                      </div>
                    </div>

                    {/* Paradas Intermediárias */}
                    {addresses.length > 2 && (
                      <div className="space-y-3 pl-4 border-l-2 border-slate-800 ml-4 py-2">
                        {addresses.slice(1, -1).map((addr, idx) => {
                          const realIdx = idx + 1;
                          return (
                            <div key={realIdx} className="space-y-1">
                              <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest px-1">
                                Parada {idx + 1}
                              </label>
                              <div className="flex gap-2 relative">
                                <div className="flex-1 relative">
                                  <input
                                    value={addr}
                                    onChange={(e) => updateAddress(realIdx, e.target.value)}
                                    onFocus={() => setActiveSuggestionIdx(realIdx)}
                                    onBlur={() => setTimeout(() => {
                                      if (activeSuggestionIdx === realIdx) setShowSuggestions(false);
                                    }, 200)}
                                    placeholder="Endereço da parada..."
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-slate-600 outline-none transition-all pr-10"
                                  />
                                  <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-600" />
                                </div>
                                <button 
                                  onClick={() => removeAddress(realIdx)}
                                  className="p-3 text-slate-600 hover:text-alert transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Destino Final */}
                    {addresses.length >= 2 && (
                       <div className="space-y-1">
                        <label className="text-[10px] text-alert font-black uppercase tracking-widest px-1 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-alert" />
                          Destino Final
                        </label>
                        <div className="flex gap-2 relative">
                          <div className="flex-1 relative">
                            <input
                              value={addresses[addresses.length - 1] || ''}
                              onChange={(e) => updateAddress(addresses.length - 1, e.target.value)}
                              onFocus={() => setActiveSuggestionIdx(addresses.length - 1)}
                              onBlur={() => setTimeout(() => {
                                if (activeSuggestionIdx === addresses.length - 1) setShowSuggestions(false);
                              }, 200)}
                              placeholder="Onde a viagem termina?"
                              className="w-full bg-slate-900/80 border border-alert/30 rounded-2xl px-4 py-4 text-sm focus:border-alert focus:ring-1 focus:ring-alert outline-none transition-all pr-10"
                            />
                            <Search className="absolute right-3 top-4.5 w-4 h-4 text-slate-600" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Suggestions Content Overlay */}
                    <AnimatePresence>
                      {showSuggestions && activeSuggestionIdx !== null && suggestions.length > 0 && (
                        <motion.div 
                          className="absolute left-12 right-12 z-[5000] bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          {suggestions.map((s, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => {
                                updateAddress(activeSuggestionIdx!, s.label);
                                setShowSuggestions(false);
                              }}
                              className="w-full px-5 py-4 text-left hover:bg-slate-800 border-b border-slate-800 last:border-0"
                            >
                              <p className="text-sm font-bold text-slate-100">{s.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{s.context || s.label}</p>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const next = [...addresses];
                        // Insert a new empty address BEFORE the last one
                        next.splice(addresses.length - 1, 0, '');
                        setAddresses(next);
                      }}
                      className="flex-1 py-4 border-2 border-dashed border-slate-800 hover:border-tech hover:text-tech rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      + Adicionar Parada
                    </button>
                    {addresses.length < 2 && (
                       <button 
                        onClick={() => setAddresses([...addresses, ''])}
                        className="flex-1 py-4 bg-slate-800 rounded-2xl text-xs font-bold"
                       >
                         Definir Destino
                       </button>
                    )}
                  </div>
                  <div className="mt-4">
                    <button 
                      onClick={() => setAddresses(DEFAULT_ADDRESSES)}
                      className="w-full py-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all text-slate-500 hover:text-white"
                    >
                      Usar Rota Demo (Manaus)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="glass p-8 rounded-[40px]">
                    <h3 className="text-xl font-bold mb-6">Prioridade da Rota</h3>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: 'speed', icon: Zap, label: 'Rápido' },
                        { id: 'distance', icon: MapIcon, label: 'Curto' },
                        { id: 'economy', icon: Leaf, label: 'Eco' },
                        { id: 'safety', icon: Shield, label: 'Seguro' },
                        { id: 'balanced', icon: BarChart4, label: 'Equil.' },
                      ].map((p: any) => (
                        <button
                          key={p.id}
                          onClick={() => setOptions({ ...options, priority: p.id })}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                            options.priority === p.id 
                            ? 'bg-tech/10 border-tech text-tech' 
                            : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          <p.icon className="w-5 h-5 mb-2" />
                          <span className="text-[10px] font-bold uppercase">{p.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-sm text-slate-400">
                      {options.priority === 'speed' && <p><strong className="text-white">Velocidade (Rápido):</strong> A IA buscará caminhos que economizam tempo. Considera horários de pico, fugindo de engarrafamentos clássicos para te entregar a alternativa mais fluida, mesmo que seja um pouco mais longa na quilometragem.</p>}
                      {options.priority === 'distance' && <p><strong className="text-white">Distância Mínima (Curto):</strong> Privilegia a rota matematicamente mais curta. Não se importa com a quantidade de sinais, trânsito ou qualidade da via, apenas o menor trajeto de A a B.</p>}
                      {options.priority === 'economy' && <p><strong className="text-white">Economia (Eco):</strong> Busca o equilíbrio entre evitar frenagens bruscas, vias que exigem muita aceleração e caminhos que gastam menos combustível, mantendo velocidade constante.</p>}
                      {options.priority === 'safety' && <p><strong className="text-white">Segurança (Seguro):</strong> Sugere a rota mais segura considerando as variáveis do dia (condições de chuva no momento, alagamentos, cruzamentos de alto índice de acidentes e vias perigosas). Ideal para dias tensos.</p>}
                      {options.priority === 'balanced' && <p><strong className="text-white">Equilibrado:</strong> A IA analisa todas as métricas em tempo real e calcula o melhor "custo-benefício" da viagem geral, combinando tempo razoável com segurança e economia.</p>}
                    </div>
                  </div>

                  <div className="glass p-8 rounded-[40px] flex-1">
                    <h3 className="text-xl font-bold mb-4">Restrições</h3>
                    <div className="space-y-3">
                      {[
                        { id: 'avoidDirt', label: 'Evitar ruas de terra' },
                        { id: 'avoidFloods', label: 'Evitar alagamentos' },
                        { id: 'avoidHills', label: 'Evitar ladeiras íngremes' },
                      ].map(check => (
                        <label key={check.id} className="flex items-center gap-3 cursor-pointer group">
                          <div 
                            onClick={() => setOptions({ ...options, [check.id]: !((options as any)[check.id]) })}
                            className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                              (options as any)[check.id] ? 'bg-tech border-tech' : 'border-slate-700 group-hover:border-slate-600'
                            }`}
                          >
                            {(options as any)[check.id] && <div className="w-2.5 h-2.5 bg-slate-950 rounded-sm" />}
                          </div>
                          <span className="text-sm text-slate-300">{check.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={runOptimization}
                    className="w-full bg-tech text-slate-950 font-black py-5 rounded-[24px] text-xl shadow-[0_20px_40px_rgba(0,212,170,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    CALCULAR MELHOR ROTA
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentScreen === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <div className="relative w-32 h-32 mb-8">
                <motion.div 
                  className="absolute inset-0 border-4 border-tech/20 rounded-full"
                />
                <motion.div 
                  className="absolute inset-0 border-4 border-t-tech rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <RouteIcon className="w-12 h-12 text-tech animate-pulse" />
                </div>
              </div>
              <p className="text-slate-400 text-sm tracking-widest uppercase font-bold animate-pulse">
                Otimizando Sequência Logística...
              </p>
            </motion.div>
          )}

          {currentScreen === 'result' && routeResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`h-full flex ${isMobile ? 'flex-col overflow-y-auto' : ''}`}
            >
              <div className={`${isMobile ? 'order-2 h-auto' : 'w-[400px] h-full'} z-10 shadow-2xl`}>
                <Sidebar 
                  stops={routeResult.sequence} 
                  summary={routeResult.summary}
                  score={routeResult.score}
                  aiAnalysis={routeResult.aiAnalysis}
                  onNavigate={() => setCurrentScreen('navigation')}
                  isLoading={false}
                />
              </div>
              <div className={`relative ${isMobile ? 'order-1 h-[300px] shrink-0' : 'flex-1'}`}>
                <MapView stops={routeResult.sequence} geometry={routeResult.geometry} />
              </div>
            </motion.div>
          )}

          {currentScreen === 'navigation' && routeResult && (
            <motion.div
              key="navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col relative overflow-hidden"
            >
              <div className="relative flex-1">
                 <MapView stops={routeResult.sequence} geometry={routeResult.geometry} />
                 
                 {/* Alerta de Clima em tempo real */}
                 <AnimatePresence>
                   {routeResult.sequence[navIndex].weather?.main?.temp > 30 && (
                     <motion.div 
                       initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
                       className="absolute top-40 right-6 z-[1000] glass p-4 rounded-2xl border-warning/30 flex items-center gap-3"
                     >
                       <Zap className="w-6 h-6 text-warning" />
                       <div>
                         <p className="text-xs font-bold text-warning uppercase">Calor Extremo</p>
                         <p className="text-[10px] text-slate-400">Considere hidratar-se</p>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>

                 <div className="absolute top-10 md:top-6 left-1/2 -translate-x-1/2 w-full max-w-md z-[1000] px-4 flex flex-col gap-2">
                    <button 
                      onClick={() => setCurrentScreen('result')}
                      className="w-fit glass px-4 py-2 rounded-full text-[10px] font-bold text-slate-400 flex items-center gap-2 hover:text-white transition-colors mb-2"
                    >
                      <ChevronRight className="w-3 h-3 rotate-180" />
                      SAIR DA NAVEGAÇÃO
                    </button>
                    <div className="glass p-4 md:p-6 rounded-3xl shadow-2xl flex items-center gap-4 md:gap-6 border border-tech/50 bg-slate-900/80">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-tech flex items-center justify-center text-slate-950 font-black text-xl md:text-2xl shadow-[0_0_20px_rgba(0,212,170,0.4)]">
                        {navIndex + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] md:text-[10px] uppercase font-black text-tech tracking-widest mb-0.5 md:mb-1">
                          {navIndex === 0 ? 'Ponto de Partida' : 'Próximo Destino'}
                        </p>
                        <p className="text-sm md:text-lg font-bold leading-tight truncate text-white">{routeResult.sequence[navIndex].address}</p>
                        {/* Passo a Passo */}
                        {navIndex > 0 && routeResult.segments?.[navIndex - 1]?.steps && (
                           <div className="mt-3 flex flex-col gap-1 border-t border-slate-700/50 pt-2">
                             {routeResult.segments[navIndex - 1].steps.slice(0, 2).map((s: any, i: number) => (
                               <p key={i} className="text-xs text-slate-300 flex items-center gap-2">
                                 <NavIcon className="w-3 h-3 text-tech" />
                                 <span className="truncate">{s.instruction}</span>
                                 <span className="text-[9px] text-slate-500 font-bold ml-auto">{Math.round(s.distance)}m</span>
                               </p>
                             ))}
                           </div>
                        )}
                      </div>
                    </div>
                 </div>

                 <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 md:gap-4 z-[1000] w-full max-w-lg px-4 md:px-6">
                    {navIndex > 0 && (
                      <button 
                        onClick={() => setIsReporting(true)}
                        className="flex-1 glass py-3 md:py-4 rounded-2xl text-alert flex flex-col items-center gap-1 border-alert/20 font-bold text-[10px] md:text-xs"
                      >
                        <AlertOctagon className="w-4 h-4 md:w-5 md:h-5" />
                        REPORTE
                      </button>
                    )}

                    <button 
                      onClick={async () => {
                        if (navIndex < routeResult.sequence.length - 1) {
                          setNavIndex(navIndex + 1);
                        } else {
                          // Finalize route in DB
                          const latest = await db.routes.toCollection().last();
                          if (latest?.id) {
                            await db.routes.update(latest.id, { status: 'completed' });
                          }
                          setCurrentScreen('dashboard');
                          setNavIndex(0);
                        }
                      }}
                      className={`${navIndex === 0 ? 'w-48 h-16 rounded-full' : 'w-20 h-20 md:w-24 md:h-24 rounded-full'} bg-tech text-slate-950 flex ${navIndex === 0 ? 'flex-row' : 'flex-col'} items-center justify-center shadow-[0_10px_30px_rgba(0,212,170,0.4)] active:scale-95 transition-all font-black text-[9px] md:text-[10px] text-center hover:brightness-110`}
                    >
                      {navIndex === 0 ? (
                        <>
                          INICIAR ROTA
                          <ChevronRight className="w-5 h-5 ml-1" />
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 mb-1" />
                          {navIndex < routeResult.sequence.length - 1 ? 'CHEGUEI' : 'FINALIZAR'}
                        </>
                      )}
                    </button>

                    {navIndex > 0 && (
                      <button 
                        onClick={() => {}} // Could open failure modal
                        className="flex-1 glass py-3 md:py-4 rounded-2xl text-warning flex flex-col items-center gap-1 border-warning/20 font-bold text-[10px] md:text-xs"
                      >
                        <XCircle className="w-4 h-4 md:w-5 md:h-5" />
                        FALHA
                      </button>
                    )}
                 </div>
               </div>

               {/* Report Modal */}
               <AnimatePresence>
                 {isReporting && (
                   <motion.div 
                     initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                     className="absolute inset-0 z-[2000] glass flex items-center justify-center p-6"
                   >
                     <motion.div 
                       initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                       className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] w-full max-w-md shadow-2xl"
                     >
                       <div className="flex justify-between items-center mb-6">
                         <h2 className="text-2xl font-bold">Ocorrência</h2>
                         <button onClick={() => setIsReporting(false)} className="text-slate-500">
                           <XCircle className="w-6 h-6" />
                         </button>
                       </div>

                       <div className="grid grid-cols-2 gap-4 mb-8">
                         {['Alagamento', 'Acidente', 'Bloqueio', 'Buraco'].map(type => (
                           <button 
                             key={type}
                             onClick={() => setReportType(type)}
                             className={`p-4 rounded-2xl border text-sm font-medium transition-all ${
                               reportType === type ? 'bg-tech/10 border-tech text-tech' : 'border-slate-800 text-slate-400'
                             }`}
                           >
                             {type}
                           </button>
                         ))}
                       </div>

                       <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl mb-8 flex flex-col items-center gap-2 text-slate-500 hover:text-tech hover:border-tech/50 cursor-pointer transition-all">
                         <Camera className="w-8 h-8" />
                         <span className="text-xs font-bold uppercase tracking-wider">Tirar Foto</span>
                       </div>

                       <button 
                        onClick={() => {
                          // Save occurrence to Dexie
                          db.occurrences.add({
                            type: 'other',
                            lat: routeResult.sequence[navIndex].lat,
                            lon: routeResult.sequence[navIndex].lon,
                            description: reportType,
                            timestamp: new Date(),
                            synced: false
                          });
                          setIsReporting(false);
                        }}
                        className="w-full bg-tech text-slate-950 font-black py-4 rounded-2xl"
                       >
                         ENVIAR REPORTE
                       </button>
                     </motion.div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </motion.div>
          )}

          {currentScreen === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full w-full">
              <KpiDashboard />
            </motion.div>
          )}

          {currentScreen === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`h-full overflow-y-auto custom-scrollbar ${isMobile ? 'p-6 pb-32' : 'p-12'}`}>
              <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold font-display mb-8">Preferências</h1>
                
                <div className="space-y-8">
                  <div className="glass p-8 rounded-[32px] border-tech/10">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-tech" />
                      Motor de Inteligência
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-tech/20 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-tech" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Kimi 2.6 (NVIDIA)</p>
                          <p className="text-xs text-slate-500">Status: Conectado e Ativo</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-tech/10 text-tech text-[10px] font-black rounded-full uppercase">Online</div>
                    </div>
                  </div>

                  <div className="glass p-8 rounded-[32px]">
                    <h3 className="text-xl font-bold mb-6">Unidades e Medidas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button className="p-4 rounded-xl bg-tech text-slate-950 font-bold text-sm">Métrico (km, m, °C)</button>
                      <button className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-bold text-sm">Imperial (mi, ft, °F)</button>
                    </div>
                  </div>

                  <div className="glass p-8 rounded-[32px]">
                    <h3 className="text-xl font-bold mb-6">Segurança dos Dados</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Todas as chaves de API fornecidas estão integradas nativamente ao motor do Logix Route. 
                      Os dados de navegação e ocorrências são armazenados localmente e sincronizados de ponta-a-ponta.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
      `}</style>
    </div>
  );
}
