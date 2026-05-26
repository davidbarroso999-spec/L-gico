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
  MapPin,
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
  ChevronRight,
  Clock,
  Sparkles,
  Database,
  Server,
  Terminal,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import KpiDashboard from '@/components/Dashboard';
import { optimizeRoute, RouteStop, RouteOptions } from '@/lib/route-engine';
import { db } from '@/lib/db';
import { enhancedAutocomplete, preciseGeocode } from '@/lib/geocode-engine';

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

// Resolves category icons & color codes like Google Maps autocomplete
const getSuggestionIconObj = (name: string, type?: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('hospital') || lower.includes('clinica') || lower.includes('pronto socorro') || lower.includes('médico') || lower.includes('saúde') || lower.includes('upa') || lower.includes('ps ')) {
    return { icon: Shield, bg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20' };
  }
  if (lower.includes('shopping') || lower.includes('loja') || lower.includes('supermercado') || lower.includes('mercado') || lower.includes('comércio') || lower.includes('mall') || lower.includes('atacado') || lower.includes('magazine')) {
    return { icon: Package, bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
  }
  if (lower.includes('parque') || lower.includes('praça') || lower.includes('bosque') || lower.includes('floresta') || lower.includes('verde') || lower.includes('jardim')) {
    return { icon: Leaf, bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' };
  }
  if (lower.includes('posto') || lower.includes('combustível') || lower.includes('gasolina') || lower.includes('br ') || lower.includes('shell') || lower.includes('ipiranga') || lower.includes('reabastecer')) {
    return { icon: Zap, bg: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' };
  }
  if (lower.includes('aeroporto') || lower.includes('terminal') || lower.includes('porto') || lower.includes('rodoviária') || lower.includes('estação') || lower.includes('itapecuru')) {
    return { icon: ChevronRight, bg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' };
  }
  if (type === 'poi') {
    return { icon: Zap, bg: 'bg-tech/10 text-tech border border-tech/20' };
  }
  return { icon: MapPin, bg: 'bg-slate-800 text-slate-400 border border-slate-700/50' };
};

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
  const [timeWindows, setTimeWindows] = useState<Record<number, { start?: string; end?: string }>>({});
  
  // Roteiro de Apresentação / Simulador de Fluxo
  const [showDemoAssistant, setShowDemoAssistant] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoMinimized, setDemoMinimized] = useState(false);

  const [options, setOptions] = useState<RouteOptions>({
    priority: 'balanced',
    vehicle: 'van',
    avoidDirt: true,
    avoidFloods: true,
    avoidHills: false
  });
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');

  const updateTimeWindow = (idx: number, type: 'start' | 'end', val: string) => {
    setTimeWindows(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [type]: val
      }
    }));
  };

  const removeTimeWindow = (idx: number) => {
    setTimeWindows(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  };

  const [routeResult, setRouteResult] = useState<any>(null);
  const [navIndex, setNavIndex] = useState(0);
  const [isReporting, setIsReporting] = useState(false);
  const [reportType, setReportType] = useState<string>('');

  // Delivery proof modal and camera states
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = React.useRef<MediaStream | null>(null);

  const startWebcam = async () => {
    setWebcamError(null);
    setDeliveryPhoto(null);
    setIsWebcamActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Back camera preferred on mobile
        audio: false
      });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error("Error playing video:", err));
      }
    } catch (err: any) {
      console.warn("Could not access camera device:", err);
      setWebcamError("Não foi possível acessar a câmera do dispositivo. Por favor, tire a foto clicando em fazer upload.");
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      webcamStreamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setDeliveryPhoto(dataUrl);
          stopWebcam();
        }
      } catch (err) {
        console.error("Error capturing photo:", err);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDeliveryPhoto(reader.result as string);
        stopWebcam();
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup webcam stream on unmount
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resolvedCoords, setResolvedCoords] = useState<Record<string, { lat: number, lon: number }>>({
    'Centro, Manaus, AM': { lat: -3.1311, lon: -60.0242 },
    'Adrianópolis, Manaus, AM': { lat: -3.1116, lon: -60.0121 },
    'Aleixo, Manaus, AM': { lat: -3.0963, lon: -59.9892 },
    'Cidade Nova, Manaus, AM': { lat: -3.0298, lon: -59.9723 },
    'Flores, Manaus, AM': { lat: -3.0801, lon: -60.0163 },
    'Compensa, Manaus, AM': { lat: -3.1102, lon: -60.0468 }
  });
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.warn("Geolocation failed:", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  useEffect(() => {
    fetch('/api/diagnostic').then(r => r.json()).then(data => {
      setDiagnostic(data);
      const failedKeys = [];
      if (data.gemini?.status === 'FAILED' || data.gemini?.status === 'ERROR' || data.gemini?.status === 'MISSING_KEY') failedKeys.push('Google Gemini (IA Principal)');
      if (data.ors?.status === 'FAILED') failedKeys.push('OpenRouteService (Motor de Rotas)');
      if (data.weather?.status === 'FAILED') failedKeys.push('OpenWeather (Clima)');
      if (failedKeys.length > 0) {
        setApiWarning(`Aviso Diagnóstico: Falha de conexão com ${failedKeys.join(', ')}.`);
      }
    }).catch(e => console.warn('Diagnostic fetch error:', e.message));
  }, []);

  useEffect(() => {
    const activeText = activeSuggestionIdx !== null ? addresses[activeSuggestionIdx] : '';
    
    // Condição estrita para evitar cascading renders e loops infinitos
    if (activeText.length < 2) {
      setTimeout(() => {
        setSuggestions(prev => prev.length > 0 ? [] : prev);
      }, 0);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await enhancedAutocomplete(activeText, userLocation || undefined);
        setSuggestions(res);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Autocomplete error:", error);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [addresses, activeSuggestionIdx, userLocation]);

  const addAddress = () => setAddresses([...addresses, '']);
  const updateAddress = (idx: number, val: string) => {
    const next = [...addresses];
    next[idx] = val;
    setAddresses(next);
  };
  const removeAddress = (idx: number) => setAddresses(addresses.filter((_, i) => i !== idx));

  const runOptimization = async (overrideAddresses?: string[] | React.MouseEvent) => {
    // Map timeWindows correctly to validAddresses indices to prevent offset bugs
    const listToUse = Array.isArray(overrideAddresses) ? overrideAddresses : addresses;
    const validWithWindows: Record<number, { start: string; end: string }> = {};
    let validCount = 0;
    const validAddresses = listToUse.filter((a, i) => {
      const isValid = a.trim().length > 3;
      if (isValid) {
        const win = timeWindows[i];
        if (win && (win.start || win.end)) {
          validWithWindows[validCount] = {
            start: win.start || "00:00",
            end: win.end || "23:59"
          };
        }
        validCount++;
      }
      return isValid;
    });

    if (validAddresses.length < 2) return;

    setCurrentScreen('loading');
    setRouteResult(null); // Reset previous
    try {
      const result = await optimizeRoute(validAddresses, { ...options, customPrompt: aiCustomPrompt }, resolvedCoords, validWithWindows);
      setRouteResult(result);
      
      // Save to IndexedDB (safe catch)
      try {
        await db.routes.add({
          date: new Date(),
          addresses: validAddresses,
          sequence: result.sequence,
          score: result.score,
          status: 'pending'
        });
      } catch (dbErr) {
        console.warn("Could not save to IndexedDB, continuing...", dbErr);
      }

      setTimeout(() => setCurrentScreen('result'), 1500);
    } catch (error: any) {
      console.error("Optimization failed:", error);
      const errMsg = error?.message || String(error);
      const errStack = error?.stack ? ` | Detalhe Técnico: ${error.stack.split('\\n')[1]}` : "";
      setApiWarning(`Falha na rota: ${errMsg}${errStack}`);
      setCurrentScreen('home');
    }
  };

  const renderSuggestionsDropdown = (idx: number) => {
    if (!showSuggestions || activeSuggestionIdx !== idx) return null;
    return (
      <div 
        className="absolute left-0 right-0 z-[5000] mt-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] overflow-hidden max-h-[300px] flex flex-col w-full"
      >
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {suggestions.length > 0 ? (
            suggestions.map((s, sIdx) => (
              <button
                key={sIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={async () => {
                  updateAddress(idx, s.label);
                  setShowSuggestions(false);
                  setSuggestions([]);
                  setActiveSuggestionIdx(null);
                  
                  if (s.lat && s.lon) {
                    setResolvedCoords(prev => ({
                      ...prev,
                      [s.label]: { lat: s.lat, lon: s.lon }
                    }));
                  } else {
                    try {
                      const geo = await preciseGeocode(s.label);
                      if (geo && geo.lat && geo.lon) {
                        setResolvedCoords(prev => ({
                          ...prev,
                          [s.label]: { lat: geo.lat, lon: geo.lon }
                        }));
                      }
                    } catch(e) {}
                  }
                  
                  const nextIdx = idx + 1;
                  if (idx === 0 && addresses.length === 1) {
                    setAddresses([...addresses, '']);
                  }
                  setTimeout(() => inputRefs.current[nextIdx]?.focus(), 150);
                }}
                className="w-full px-4 py-3.5 text-left hover:bg-slate-800 border-b border-slate-800 last:border-0 group transition-colors flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 pr-4 flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {(() => {
                      const iconObj = getSuggestionIconObj(s.name, s.type);
                      const IconComp = iconObj.icon;
                      return (
                        <div className={`p-1.5 rounded-lg ${iconObj.bg}`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-100 group-hover:text-tech transition-colors truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-1 mt-0.5">{s.context || s.label}</p>
                  </div>
                </div>
                {s.confidenceScore && (
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    <div className={`text-[8.5px] font-black px-1.5 py-0.5 rounded shadow-sm ${s.confidenceScore >= 80 ? 'bg-tech text-slate-900' : s.confidenceScore >= 50 ? 'bg-warning text-slate-900' : 'bg-red-500 text-white'}`}>
                      {Math.max(0, Math.round(s.confidenceScore))}%
                    </div>
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="p-6 text-center bg-slate-900/50">
              <p className="text-xs font-bold text-slate-400 mb-1">Local não encontrado</p>
              <p className="text-[9px] text-slate-500 max-w-[200px] mx-auto">
                Busque pelo endereço completo.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isMobile === undefined) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-tech rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 w-full max-w-[100vw] h-full flex flex-col md:flex-row bg-slate-950 overflow-hidden font-sans`}>
      {/* API Key Warning Banner */}
      {apiWarning && (
        <div className="absolute top-0 left-0 right-0 z-[9999] bg-alert/90 text-white text-xs md:text-sm font-bold text-center py-2 px-4 shadow-lg backdrop-blur-sm animate-in slide-in-from-top flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <div className="flex-1 min-w-0 break-words">
            {apiWarning}
          </div>
          <button onClick={() => setApiWarning(null)} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

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
      <main className={`flex-1 relative h-full w-full max-w-[100vw] overflow-hidden ${(isMobile && currentScreen !== 'navigation') ? 'pb-20' : ''}`}>
        <AnimatePresence mode="wait">
          {currentScreen === 'home' && (
            <motion.div
              key="home-ui"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full w-full flex flex-col items-center max-w-4xl mx-auto px-4 sm:px-6 overflow-y-auto overflow-x-hidden custom-scrollbar ${isMobile ? 'pt-8 pb-32' : 'py-12'}`}
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
                <div className="glass p-4 xs:p-6 md:p-8 rounded-3xl md:rounded-[40px] shadow-2xl relative h-fit">
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
                              ref={el => { inputRefs.current[0] = el; }}
                              value={addresses[0] || ''}
                              onChange={(e) => updateAddress(0, e.target.value)}
                              onFocus={() => setActiveSuggestionIdx(0)}
                              onBlur={() => setTimeout(() => {
                                if (activeSuggestionIdx === 0) setShowSuggestions(false);
                              }, 200)}
                              placeholder="De onde você está saindo? (Empresa, Praça, Rua...)"
                              className="w-full bg-slate-900/80 border border-tech/30 rounded-2xl px-4 py-4 text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all pr-10"
                            />
                            <Search className="absolute right-3 top-4.5 w-4 h-4 text-slate-600" />
                            {renderSuggestionsDropdown(0)}
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
                                    ref={el => { inputRefs.current[realIdx] = el; }}
                                    value={addr}
                                    onChange={(e) => updateAddress(realIdx, e.target.value)}
                                    onFocus={() => setActiveSuggestionIdx(realIdx)}
                                    onBlur={() => setTimeout(() => {
                                      if (activeSuggestionIdx === realIdx) setShowSuggestions(false);
                                    }, 200)}
                                    placeholder="Empresa, hospital, praça ou rua..."
                                    className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-slate-600 outline-none transition-all pr-10"
                                  />
                                  <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-600" />
                                  {renderSuggestionsDropdown(realIdx)}
                                </div>
                                <button 
                                  onClick={() => removeAddress(realIdx)}
                                  className="p-3 text-slate-600 hover:text-alert transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              {/* Janela de Entrega de Parada */}
                              <div className="flex items-center gap-2 mt-1.5 px-1 pb-1">
                                <Clock className="w-3.5 h-3.5 text-slate-600 transition-colors" />
                                <span className="text-[9.5px] uppercase font-black text-slate-500 tracking-wider">Janela de Entrega:</span>
                                <div className="flex items-center gap-1.5 ml-1">
                                  <input 
                                    type="time"
                                    value={timeWindows[realIdx]?.start || ''}
                                    onChange={(e) => updateTimeWindow(realIdx, 'start', e.target.value)}
                                    className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-tech transition-all"
                                  />
                                  <span className="text-[10px] text-slate-600">até</span>
                                  <input 
                                    type="time"
                                    value={timeWindows[realIdx]?.end || ''}
                                    onChange={(e) => updateTimeWindow(realIdx, 'end', e.target.value)}
                                    className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-tech transition-all"
                                  />
                                  {(timeWindows[realIdx]?.start || timeWindows[realIdx]?.end) && (
                                    <button 
                                      onClick={() => removeTimeWindow(realIdx)}
                                      className="text-slate-500 hover:text-red-400 text-[9px] uppercase font-bold ml-1 hover:underline transition-all"
                                    >
                                      Limpar
                                    </button>
                                  )}
                                </div>
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
                              ref={el => { inputRefs.current[addresses.length - 1] = el; }}
                              value={addresses[addresses.length - 1] || ''}
                              onChange={(e) => updateAddress(addresses.length - 1, e.target.value)}
                              onFocus={() => setActiveSuggestionIdx(addresses.length - 1)}
                              onBlur={() => setTimeout(() => {
                                if (activeSuggestionIdx === addresses.length - 1) setShowSuggestions(false);
                              }, 200)}
                              placeholder="Aonde você quer chegar? (Ex: Aeroporto, Shopping...)"
                              className="w-full bg-slate-900/80 border border-alert/30 rounded-2xl px-4 py-4 text-sm focus:border-alert focus:ring-1 focus:ring-alert outline-none transition-all pr-10"
                            />
                            <Search className="absolute right-3 top-4.5 w-4 h-4 text-slate-600" />
                            {renderSuggestionsDropdown(addresses.length - 1)}
                          </div>
                        </div>
                        {/* Janela de Entrega do Destino */}
                        <div className="flex items-center gap-2 mt-1.5 px-1 pb-1">
                          <Clock className="w-3.5 h-3.5 text-slate-600 hover:text-amber-500 transition-colors" />
                          <span className="text-[9.5px] uppercase font-black text-slate-500 tracking-wider">Janela de Entrega:</span>
                          <div className="flex items-center gap-1.5 ml-1">
                            <input 
                              type="time"
                              value={timeWindows[addresses.length - 1]?.start || ''}
                              onChange={(e) => updateTimeWindow(addresses.length - 1, 'start', e.target.value)}
                              className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-tech transition-all"
                            />
                            <span className="text-[10px] text-slate-600">até</span>
                            <input 
                              type="time"
                              value={timeWindows[addresses.length - 1]?.end || ''}
                              onChange={(e) => updateTimeWindow(addresses.length - 1, 'end', e.target.value)}
                              className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-tech transition-all"
                            />
                            {(timeWindows[addresses.length - 1]?.start || timeWindows[addresses.length - 1]?.end) && (
                              <button 
                                onClick={() => removeTimeWindow(addresses.length - 1)}
                                className="text-slate-500 hover:text-red-400 text-[9px] uppercase font-bold ml-1 hover:underline transition-all"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        const next = [...addresses];
                        // Insert a new empty address BEFORE the last one
                        if (next.length > 1) {
                          next.splice(addresses.length - 1, 0, '');
                        } else {
                          next.push('');
                        }
                        setAddresses(next);
                        setTimeout(() => {
                           const focusIdx = next.length - 1;
                           inputRefs.current[focusIdx]?.focus();
                        }, 100);
                      }}
                      className="w-full py-4 border-2 border-dashed border-slate-800 hover:border-tech hover:text-tech rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      + Adicionar Parada
                    </button>
                    <div className="mt-2">
                      <button 
                        onClick={() => setAddresses(DEFAULT_ADDRESSES)}
                        className="w-full py-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all text-slate-500 hover:text-white"
                      >
                        Usar Rota Demo (Manaus)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="glass p-4 xs:p-6 md:p-8 rounded-2xl md:rounded-[40px]">
                    <h3 className="text-lg md:text-xl font-bold mb-5 font-display flex items-center gap-2">Prioridade da Rota</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3">
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
                          className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                            options.priority === p.id 
                            ? 'bg-tech/10 border-tech text-tech' 
                            : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          <p.icon className="w-4 h-4 md:w-5 md:h-5 mb-1.5 shrink-0" />
                          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-tight leading-none">{p.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 p-4 rounded-xl bg-slate-900/40 border border-slate-800/40 text-xs md:text-sm text-slate-400 leading-relaxed">
                      {options.priority === 'speed' && <p><strong className="text-white">Velocidade (Rápido):</strong> Rota que prioriza fluidez e velocidade média elevada, contornando gargalos clássicos mesmo que resulte em um trajeto ligeiramente mais longo.</p>}
                      {options.priority === 'distance' && <p><strong className="text-white">Distância Mínima (Curto):</strong> Traçado matematicamente ideal de menor metragem física secundarizando tráfego ou semáforos.</p>}
                      {options.priority === 'economy' && <p><strong className="text-white">Economia (Eco):</strong> Otimização mestre visando estabilidade, evitando arranques e aclives severos sob carga logística.</p>}
                      {options.priority === 'safety' && <p><strong className="text-white">Segurança (Seguro):</strong> Análise preventiva de integridade física. Desvia ativamente de incidências climáticas críticas e trechos de risco grave.</p>}
                      {options.priority === 'balanced' && <p><strong className="text-white">Equilibrado:</strong> Otimização unificada ponderando distâncias, tempos previstos de viagem, integridade das cargas e consumo médio.</p>}
                    </div>
                  </div>

                  {/* IA Customized Instructions Prompt */}
                  <div className="glass p-4 xs:p-6 md:p-8 rounded-2xl md:rounded-[40px]">
                    <h3 className="text-lg md:text-xl font-bold mb-3 flex items-center gap-2 font-display">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-tech animate-pulse shrink-0" />
                      Instruções da IA (Opcional)
                    </h3>
                    <p className="text-slate-400 text-xs mb-3 leading-relaxed">
                      Indique parâmetros específicos para que a inteligência artificial avalie o entorno e as paradas da sua rota na triagem estratégica.
                    </p>
                    <textarea
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Ex: 'priorizar vias bem iluminadas', 'evitar asfalto danificado', 'buscar zonas com boa sinalização de rede'..."
                      rows={2}
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-xs md:text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all resize-none text-slate-100 placeholder-slate-600 font-sans"
                    />
                  </div>

                  <button 
                    onClick={runOptimization}
                    className="w-full bg-tech text-slate-950 font-black py-4.5 rounded-2xl text-lg md:text-xl shadow-[0_15px_30px_rgba(0,212,170,0.25)] hover:bg-tech/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    CALCULAR MELHOR ROTA
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentScreen === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full flex ${isMobile ? 'relative w-full h-full overflow-hidden' : ''}`}
            >
              <div className={`${isMobile ? 'absolute inset-0 z-0' : 'flex-1 relative'}`}>
                <MapView stops={routeResult.sequence} geometry={routeResult.geometry} />
              </div>
              <div className={`${isMobile ? 'z-50' : 'w-[400px] h-full z-10 shadow-2xl shrink-0'}`}>
                <Sidebar 
                  stops={routeResult.sequence} 
                  summary={routeResult.summary}
                  score={routeResult.score}
                  aiAnalysis={routeResult.aiAnalysis}
                  onNavigate={() => setCurrentScreen('navigation')}
                  isLoading={false}
                />
              </div>
            </motion.div>
          )}

          {currentScreen === 'navigation' && routeResult && (
            <motion.div
              key="navigation"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex flex-col relative overflow-hidden"
            >
              <div className="relative flex-1">
                 <MapView stops={routeResult.sequence} geometry={routeResult.geometry} isNavigationScreen={true} />
                 
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

                {/* Delivery Photo Modal (Etapa Obrigatória ao Finalizar Rota) */}
                <AnimatePresence>
                  {showDeliveryModal && (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[2000] glass flex items-center justify-center p-4 md:p-6"
                    >
                      <motion.div 
                        initial={{ scale: 0.95, y: 15 }} 
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 15 }}
                        className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[32px] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                              <Camera className="w-5 md:w-6 h-5 md:h-6 text-tech" />
                              Comprovar Entrega
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">O motorista precisa registrar o pacote entregue.</p>
                          </div>
                          <button 
                            onClick={() => {
                              stopWebcam();
                              setShowDeliveryModal(false);
                            }} 
                            className="text-slate-405 hover:text-white transition-colors"
                          >
                            <XCircle className="w-6 h-6" />
                          </button>
                        </div>

                        {/* Camera Viewfinder / Preview Section */}
                        <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center mb-4">
                          {deliveryPhoto ? (
                            <div className="relative w-full h-full">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={deliveryPhoto} 
                                alt="Comprovante de entrega" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-3 right-3 bg-tech text-slate-950 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Foto Anexada
                              </div>
                            </div>
                          ) : isWebcamActive ? (
                            <div className="relative w-full h-full bg-black">
                              <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className="w-full h-full object-cover"
                              />
                              {/* Camera design decorations */}
                              <div className="absolute inset-4 border border-white/10 pointer-events-none rounded-lg flex items-center justify-center">
                                <div className="w-8 h-8 border-t-2 border-l-2 border-tech absolute top-0 left-0"></div>
                                <div className="w-8 h-8 border-t-2 border-r-2 border-tech absolute top-0 right-0"></div>
                                <div className="w-8 h-8 border-b-2 border-l-2 border-tech absolute bottom-0 left-0"></div>
                                <div className="w-8 h-8 border-b-2 border-r-2 border-tech absolute bottom-0 right-0"></div>
                                <div className="text-[10px] text-white/40 font-mono tracking-widest uppercase">ENQUADRE O PACOTE</div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-6 text-center flex flex-col items-center justify-center gap-3">
                              <Camera className="w-12 h-12 text-slate-700" />
                              {webcamError ? (
                                <p className="text-xs text-amber-500 max-w-[280px] leading-relaxed">{webcamError}</p>
                              ) : (
                                <p className="text-xs text-slate-500 max-w-[250px] leading-relaxed">Câmera desativada ou indisponível.</p>
                              )}
                              <button
                                type="button"
                                onClick={startWebcam}
                                className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-xs text-white font-bold transition-all mt-1"
                              >
                                Ativar Câmera Live
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Capture and Upload Actions */}
                        <div className="flex flex-col gap-2.5 mb-5 font-sans">
                          {isWebcamActive && !deliveryPhoto && (
                            <button
                              type="button"
                              onClick={capturePhoto}
                              className="w-full bg-tech text-slate-950 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(0,212,170,0.35)] hover:brightness-110 active:scale-95 transition-all text-xs uppercase cursor-pointer"
                            >
                              <Camera className="w-4 h-4 text-slate-950" />
                              Capturar Foto do Pacote
                            </button>
                          )}

                          {deliveryPhoto && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeliveryPhoto(null);
                                startWebcam();
                              }}
                              className="w-full bg-slate-800 hover:bg-slate-750 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 border border-slate-700 transition-all text-xs uppercase cursor-pointer"
                            >
                              <Camera className="w-4 h-4 text-tech" />
                              Tirar Outra Foto
                            </button>
                          )}

                          {/* Hidden input file connector */}
                          <div className="w-full">
                            <label className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-800 rounded-2xl cursor-pointer text-slate-400 hover:text-tech hover:border-tech/40 hover:bg-tech/5 transition-all text-xs font-semibold uppercase">
                              <span className="truncate">{deliveryPhoto ? "Substituir com arquivo" : "Fazer Upload / Abrir Câmera Padrão"}</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileUpload} 
                                className="hidden" 
                              />
                            </label>
                          </div>
                        </div>

                        {/* Observation / Notes panel */}
                        <div className="mb-6 flex flex-col gap-2 font-sans">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Anotações / Observações</label>
                          <textarea
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            placeholder="ex: Carga entregue nas mãos da recepcionista Maria."
                            className="w-full h-20 px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-600 outline-none focus:border-tech/40 transition-colors resize-none font-sans"
                          />
                        </div>

                        {/* Mandatory step disclaimer */}
                        {!deliveryPhoto && (
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-3 rounded-2xl flex items-center gap-2 mb-5">
                            <AlertOctagon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span className="text-[10px] font-semibold leading-relaxed">Etapa Obrigatória: Registre ou envie uma foto para comprovar a conclusão com segurança.</span>
                          </div>
                        )}

                        {/* Main Delivery Confirm Actions */}
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              stopWebcam();
                              setShowDeliveryModal(false);
                            }}
                            className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-750 text-xs font-black text-white uppercase rounded-2xl transition-all h-12"
                          >
                            Cancelar
                          </button>
                          
                          <button
                            type="button"
                            disabled={!deliveryPhoto}
                            onClick={async () => {
                              if (!deliveryPhoto) return;
                              try {
                                // Finalize route in IndexedDB with safety photo proof
                                const latest = await db.routes.toCollection().last();
                                if (latest?.id) {
                                  await db.routes.update(latest.id, { 
                                    status: 'completed',
                                    deliveryPhoto: deliveryPhoto,
                                    deliveryNotes: deliveryNotes || 'Entrega efetuada com sucesso',
                                    completedAt: new Date()
                                  });
                                }
                              } catch (err) {
                                console.error("Erro salvando foto no Dexie:", err);
                              }
                              
                              // Close webcam and return
                              stopWebcam();
                              setShowDeliveryModal(false);
                              setNavIndex(0);
                              setCurrentScreen('dashboard');
                            }}
                            className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-1 shadow-lg bg-tech text-slate-950 hover:brightness-110 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer h-12"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Finalizar
                          </button>
                        </div>
                      </motion.div>
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
                          // Abre a etapa obrigatória de comprovante de entrega (foto) ao finalizar a rota
                          setShowDeliveryModal(true);
                          setDeliveryPhoto(null);
                          setDeliveryNotes('');
                          startWebcam();
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
            <motion.div 
              key="dashboard" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full"
            >
              <KpiDashboard />
            </motion.div>
          )}

          {currentScreen === 'settings' && (
            <motion.div 
              key="settings" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar ${isMobile ? 'px-4 py-6 pb-32' : 'p-12'}`}
            >
              <div className="max-w-2xl mx-auto w-full">
                <h1 className="text-4xl font-bold font-display mb-8">Preferências</h1>
                
                <div className="space-y-8">
                  {/* 🔮 APRESENTAÇÃO TÉCNICA E TUTORIAL GUIADO */}
                  <div className="bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-tech/35 p-6 sm:p-8 rounded-[32px] shadow-[0_0_30px_rgba(0,212,170,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-tech/10 blur-3xl rounded-full pointer-events-none" />
                    
                    <div className="flex items-start gap-4 mb-5">
                      <div className="p-3 bg-tech/10 rounded-2xl text-tech shrink-0 mt-1">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black tracking-widest text-tech uppercase">Recurso de Apresentação & TCC</span>
                        <h2 className="text-xl font-bold font-display text-white mt-0.5">Roteiro Demonstrativo e Histórias de Uso</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Apresente o aplicativo Logix Route com total autoridade e clareza.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed mb-6">
                      <p>
                        Este roteiro de demonstração preenche e executa um fluxo de uso completo e realista com dados de <strong>Manaus-AM</strong>. Ele guiará você por todas as telas do aplicativo, explicando o que cada funcionalidade faz e sugerindo o melhor <em>pitch</em> comercial para investidores ou professores:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 font-sans mt-2">
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-tech font-bold">1. Input & IA</span>
                          <span>Paradas e Prompts Gemini</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-tech font-bold">2. Custos & Clima</span>
                          <span>Combustíveis e Meteorologia</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-tech font-bold">3. Telemetria GPS</span>
                          <span>Ocorrências IndexedDB</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl">
                          <span className="text-tech font-bold">4. Prova de Entrega</span>
                          <span>Comprovante e Foto Digital</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowDemoAssistant(true);
                        setDemoStep(0);
                        setDemoMinimized(false);
                        setCurrentScreen('home'); // Go to home to start the tour from the beginning
                      }}
                      className="w-full sm:w-auto bg-tech text-slate-950 font-black text-xs px-6 py-4 rounded-2xl uppercase tracking-wider hover:brightness-110 hover:shadow-[0_0_15px_rgba(0,212,170,0.3)] active:scale-95 transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Iniciar Roteiro & Tutorial Passo a Passo
                    </button>
                  </div>

                  <div className="glass p-8 rounded-[32px] border-tech/10">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-tech" />
                      Motores de Inteligência e Mapas
                    </h3>
                    <div className="space-y-4">
                      {/* Google Gemini */}
                      <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-tech/20 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-tech" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Google Gemini</p>
                            <p className="text-xs text-slate-500">Status: Conectado e Ativo</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 bg-tech/10 text-tech text-[10px] font-black rounded-full uppercase">Online</div>
                      </div>

                      {/* Google Maps Platform */}
                      <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <MapIcon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-bold text-sm">Google Maps Platform</p>
                            <p className="text-[11px] text-slate-400 break-words leading-tight mt-1">
                              {diagnostic?.googleMaps?.status === 'SUCCESS' 
                                ? 'Busca por Endereço (Autocomplete e Geocoding) ativa com qualidade máxima (idêntica ao Google Maps).'
                                : 'Busca usando fallbacks premium (Mapbox, ORS, Nominatim, Photon) para geocodificação.'}
                            </p>
                          </div>
                        </div>
                        <div className={`px-3 py-1 text-[10px] font-black rounded-full uppercase shrink-0 ${
                          diagnostic?.googleMaps?.status === 'SUCCESS'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {diagnostic?.googleMaps?.status === 'SUCCESS' ? 'Google Ativo' : 'Parceiros'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass p-4 sm:p-8 rounded-[32px]">
                    <h3 className="text-xl font-bold mb-6">Unidades e Medidas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* 🔮 ASSISTENTE INTERATIVO DE APRESENTAÇÃO / TUTORIAL DE PITCH */}
      {showDemoAssistant && demoMinimized && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          onClick={() => setDemoMinimized(false)}
          className="fixed bottom-6 right-6 z-[10000] bg-slate-950/95 border-2 border-tech hover:bg-slate-900 shadow-[0_0_25px_rgba(0,212,170,0.55)] text-white font-extrabold px-5 py-3.5 rounded-full flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-105 active:scale-95 group font-sans animate-pulse"
          title="Retomar Tutorial"
        >
          <Sparkles className="w-4 h-4 text-tech group-hover:rotate-12 transition-transform" />
          <span className="text-xs tracking-wide text-white/95">Retomar Apresentação ({demoStep + 1}/6)</span>
          <div className="bg-tech text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-mono">
            {demoStep + 1}
          </div>
        </motion.button>
      )}

      {showDemoAssistant && !demoMinimized && (
        <motion.div
          id="panel-demo-assistant"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[10000] max-w-sm sm:max-w-md w-[calc(100vw-32px)] bg-slate-950/98 backdrop-blur-md rounded-[28px] border-2 border-tech/40 shadow-[0_15px_50px_rgba(0,212,170,0.2)] p-5 flex flex-col gap-3.5 font-sans text-white transition-all max-h-[80vh] overflow-y-auto custom-scrollbar"
        >
          <div className="flex justify-between items-start border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-tech animate-bounce shrink-0" />
              <div>
                <span className="text-[9px] font-black uppercase text-tech tracking-wider block">Tutorial Guiado</span>
                <span className="text-xs text-slate-400 font-bold">Apresentação ao Vivo</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDemoMinimized(true)}
                className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full cursor-pointer"
                title="Minimizar (Ocultar para ver a tela)"
              >
                <EyeOff className="w-4 h-4 text-slate-350" />
              </button>
              <button
                onClick={() => {
                  setShowDemoAssistant(false);
                  setDemoStep(0);
                }}
                className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-full cursor-pointer"
                title="Encerrar Demo"
              >
                <XCircle className="w-4 h-4 text-slate-350" />
              </button>
            </div>
          </div>

          {demoStep === 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-black text-white">Bem-vindo ao Tour de Apresentação! 🎓</h3>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Este assistente de pitch guiará você por um <strong>fluxo de uso do Logix Route</strong>. Cada tela será explicada para que você demonstre as competências logísticas e de monitoramento ativo para a banca.
              </p>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-tech/10 text-[10px] text-slate-300">
                <p className="font-bold text-tech mb-0.5">💡 Cruze Climático e Hidrológico do Amazonas:</p>
                Roteamento autônomo baseado em janelas de tempo, cálculo de diesel e <strong>prevenção ativa de Cheias (Dez-Jun) ou Secas (Jul-Nov) no Amazonas</strong>.
              </div>
              <button
                onClick={() => {
                  setDemoStep(1);
                  setCurrentScreen('home');
                  setAddresses([
                    'CEASA, Manaus, AM',
                    'Centro, Manaus, AM',
                    'Adrianópolis, Manaus, AM',
                    'Compensa, Manaus, AM',
                    'BR-319, Manaus, AM'
                  ]);
                  setTimeWindows({
                    1: { start: '08:00', end: '11:00' },
                    2: { start: '13:00', end: '15:30' }
                  });
                  setOptions({
                    priority: 'safety',
                    vehicle: 'truck',
                    avoidDirt: true,
                    avoidFloods: true,
                    avoidHills: false
                  });
                  setAiCustomPrompt('Evitar asfalto submerso próximo ao porto devido ao período de cheias fluviais amazônicas.');
                }}
                className="w-full mt-1 bg-tech text-slate-950 font-black text-[11px] py-3 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
              >
                Carregar Cenário & Avançar
              </button>
            </div>
          )}

          {demoStep === 1 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 1 de 5</span>
                <span className="text-tech">Torre de Planejamento</span>
              </div>
              <h4 className="text-xs font-bold text-white">📍 Entrada de Endereços & Diretivas de IA</h4>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Estamos na <strong>Tela Inicial (Home)</strong>. É aqui que o operador de tráfego central inicia o dia:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>📝 Alvos Estratégicos:</strong> Foram carregados 5 pontos reais de Manaus (incluindo acessos de Porto e Rodovias).</p>
                <p><strong>🌧️ Cruze Hidrológico:</strong> O motor lê a latitude/longitude do Amazonas para cruzar com a data atual, alertando sobre inundações ou estiagens severas.</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => {
                    setDemoStep(0);
                  }}
                  className="px-3 bg-slate-900 border border-slate-850 text-slate-400 font-bold text-xs rounded-xl"
                >
                  Voltar
                </button>
                <button
                  onClick={async () => {
                    await runOptimization([
                      'CEASA, Manaus, AM',
                      'Centro, Manaus, AM',
                      'Adrianópolis, Manaus, AM',
                      'Compensa, Manaus, AM',
                      'BR-319, Manaus, AM'
                    ]);
                    setDemoStep(2);
                  }}
                  className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans text-ellipsis overflow-hidden whitespace-nowrap"
                >
                  Otimizar Rota
                </button>
              </div>
            </div>
          )}

          {demoStep === 2 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 2 de 5</span>
                <span className="text-tech">Análise de Custos & Clima</span>
              </div>
              <h4 className="text-xs font-bold text-white">📈 Diagnósticos Avançados e Custos</h4>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                O traçado ideal foi calculado e ordenado para maximizar a economia e evitar áreas de risco!
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>🌊 Hidrologia Ativa:</strong> Role o painel lateral de resultados. Cada parada associada a zonas de igarapés ou rios da região (Centro, Compensa, CEASA) possui um alerta dinâmico histórico.</p>
                <p><strong>🧠 Brain AI (Gemini):</strong> O relatório detalhado ao final incorpora esses dados para calibrar o score de integridade da carga.</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => {
                    setDemoStep(1);
                    setCurrentScreen('home');
                  }}
                  className="px-3 bg-slate-900 border border-slate-850 text-slate-400 font-bold text-xs rounded-xl"
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
                    setNavIndex(0);
                    setCurrentScreen('navigation');
                    setDemoStep(3);
                  }}
                  className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                >
                  Iniciar GPS de Viagem
                </button>
              </div>
            </div>
          )}

          {demoStep === 3 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 3 de 5</span>
                <span className="text-tech">Cockpit Operacional</span>
              </div>
              <h4 className="text-xs font-bold text-white">🚚 GPS Ativo e Ocorrências Offline</h4>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Esta é a interface que fica no celular ou tablet do motorista dentro da cabine do veículo:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>🔊 Voz & Sentido:</strong> Fornece orientações curva-a-curva com assistência de fala.</p>
                <p><strong>⚠️ Registro de Sinistros Offline:</strong> O motorista relata desmoronamento fluvial ou via alagada. Se o celular perder o sinal, os dados são salvos localmente via IndexedDB!</p>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={async () => {
                    try {
                      await db.occurrences.add({
                        type: 'flood',
                        description: 'refluxo pluvial severo na orla do Centro de Manaus',
                        lat: -3.134,
                        lon: -60.024,
                        timestamp: new Date(),
                        synced: false
                      });
                      setApiWarning("OCORRÊNCIA REGISTRADA: Alerta de transbordamento salvo localmente e reportado à central!");
                    } catch(e){}
                  }}
                  className="w-full bg-slate-900/80 border border-alert/20 text-alert hover:bg-slate-900 font-extrabold text-[10px] py-2 rounded-lg text-center cursor-pointer transition-colors"
                >
                  ⚠️ Reportar Alagamento Sazonal (Sinistro Local)
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDemoStep(2);
                      setCurrentScreen('result');
                    }}
                    className="px-3 bg-slate-900 border border-slate-850 text-slate-400 font-bold text-xs rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => {
                      setNavIndex(4); // Advance to final address
                      setDemoStep(4);
                    }}
                    className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                  >
                    Ir ao Destino Final
                  </button>
                </div>
              </div>
            </div>
          )}

          {demoStep === 4 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 4 de 5</span>
                <span className="text-tech">Prova Eletrônica</span>
              </div>
              <h4 className="text-xs font-bold text-white">📸 Comprovante de Entrega Seguro (POD)</h4>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Chegamos ao último cliente! Para auditar juridicamente a entrega e comprovar o recebimento:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>📊 Geolocalização Criptografada:</strong> Registra as coordenadas GPS de onde a foto foi tirada para evitar fraudes logísticas de carga.</p>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={() => {
                    const boxSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230f172a"/><rect x="150" y="100" width="300" height="200" rx="10" fill="%23854d0e"/><rect x="150" y="100" width="300" height="40" fill="%23a16207"/><line x1="300" y1="100" x2="300" y2="300" stroke="%23713f12" stroke-width="4"/><rect x="240" y="160" width="120" height="80" rx="4" fill="%23f1f5f9" opacity="0.9"/><rect x="260" y="180" width="80" height="8" rx="2" fill="%23020617"/><rect x="260" y="196" width="60" height="6" rx="2" fill="%23475569"/><rect x="260" y="210" width="40" height="6" rx="2" fill="%23475569"/><circle cx="340" cy="220" r="10" fill="%2322c55e"/><path d="M336 220 l3 3 l5 -5" stroke="white" stroke-width="2" fill="none"/><text x="300" y="340" fill="%2300D4AA" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">LOGIX ROUTE - COMPROVANTE SEGURO</text></svg>`;
                    setDeliveryPhoto(boxSvg);
                    setDeliveryNotes("Insumos biológicos em temperatura regulada entregues com perfeição no terminal.");
                    setShowDeliveryModal(true);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-tech font-extrabold text-[10px] py-2 rounded-lg text-center cursor-pointer transition-colors"
                >
                  📷 Simular Captação de Foto POD
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDemoStep(3);
                      setNavIndex(0);
                    }}
                    className="px-3 bg-slate-900 border border-slate-850 text-slate-400 font-bold text-xs rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={async () => {
                      const boxSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230f172a"/><rect x="150" y="100" width="300" height="200" rx="10" fill="%23854d0e"/><rect x="150" y="100" width="300" height="40" fill="%23a16207"/><line x1="300" y1="100" x2="300" y2="300" stroke="%23713f12" stroke-width="4"/><rect x="240" y="160" width="120" height="80" rx="4" fill="%23f1f5f9" opacity="0.9"/><rect x="260" y="180" width="80" height="8" rx="2" fill="%23020617"/><rect x="260" y="196" width="60" height="6" rx="2" fill="%23475569"/><rect x="260" y="210" width="40" height="6" rx="2" fill="%23475569"/><circle cx="340" cy="220" r="10" fill="%2322c55e"/><path d="M336 220 l3 3 l5 -5" stroke="white" stroke-width="2" fill="none"/><text x="300" y="340" fill="%2300D4AA" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">LOGIX ROUTE - COMPROVANTE SEGURO</text></svg>`;
                      try {
                        const finalAddresses = [
                          'CEASA, Manaus, AM',
                          'Centro, Manaus, AM',
                          'Adrianópolis, Manaus, AM',
                          'Compensa, Manaus, AM',
                          'BR-319, Manaus, AM'
                        ];
                        await db.routes.add({
                          date: new Date(),
                          addresses: finalAddresses,
                          sequence: finalAddresses.map((a, i) => ({ address: a, index: i })),
                          score: 95,
                          status: 'completed',
                          deliveryPhoto: boxSvg,
                          deliveryNotes: 'Entrega efetuada com sucesso sob inspeção em orla fluviométrica.',
                          completedAt: new Date()
                        });
                      } catch (err) {
                        console.warn(err);
                      }
                      stopWebcam();
                      setShowDeliveryModal(false);
                      setNavIndex(0);
                      setCurrentScreen('dashboard');
                      setDemoStep(5);
                    }}
                    className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                  >
                    Salvar e Concluir
                  </button>
                </div>
              </div>
            </div>
          )}

          {demoStep === 5 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 5 de 5</span>
                <span className="text-tech">Painel de Gerenciamento</span>
              </div>
              <h4 className="text-xs font-bold text-white">📊 Centro de Gerência & Controle de Carga</h4>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                Sucesso! Chegamos à torre administrativa central onde gestores monitoram frotas e regulamentos das vias terrestres e acessos fluviais:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1 font-sans">
                <p><strong>⚖️ Balança Inteligente de Peso:</strong> Localize o controle de <em>Peso da Carga</em> ao lado do ícone da balança.</p>
                <p><strong>🚨 Multas Fiscais de Excesso ANTT:</strong> Se ultrapassar o limite, o sistema calcula na hora de acordo com a resolução brasileira!</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => {
                    setShowDemoAssistant(false);
                    setDemoStep(0);
                  }}
                  className="w-full bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-115 active:scale-95 transition-all text-center cursor-pointer font-sans"
                >
                  🎉 Concluir e Voltar ao App
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
      `}</style>
    </div>
  );
}
