'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  AlertTriangle,
  Volume2,
  VolumeX,
  LocateFixed,
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
  EyeOff,
  Truck,
  Bike,
  Car,
  Droplets,
  Menu,
  X,
  FileText,
  Upload,
  Download,
  FileCheck,
  RefreshCw
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import KpiDashboard from '@/components/Dashboard';
import { optimizeRoute, RouteStop, RouteOptions } from '@/lib/route-engine';
import { db } from '@/lib/db';
import { enhancedAutocomplete, preciseGeocode } from '@/lib/geocode-engine';
import InfoTooltip from '@/components/InfoTooltip';
import RotatingEarth from '@/components/ui/wireframe-dotted-globe';
import TruckLoader from '@/components/TruckLoader';
import { HarpiaTextEffect } from '@/components/ui/text-effect';

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

const NavItem = ({ icon: Icon, label, isActive, onClick, isMobile, isExpanded }: any) => (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl transition-all relative group flex items-center gap-3 ${
        isExpanded ? 'w-full px-4 py-3 justify-start' : 'justify-center'
      } ${
        isActive ? (isMobile ? 'text-tech' : 'bg-tech text-slate-950') : 'text-slate-500 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className={isMobile ? "w-6 h-6" : "w-5 h-5 shrink-0"} />
      {!isMobile && isExpanded && (
        <span className="text-xs font-black uppercase tracking-wider font-sans truncate">
          {label}
        </span>
      )}
      {!isMobile && !isExpanded && (
        <span className="absolute left-14 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </span>
      )}
    </button>
);

import { useIsMobile } from '@/hooks/use-mobile';

export default function VoieExpressApp() {
  const isMobile = useIsMobile();
  const [isMenuBallOpen, setIsMenuBallOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'loading' | 'result' | 'navigation' | 'dashboard' | 'settings'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavbarExpanded, setIsNavbarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [addresses, setAddresses] = useState<string[]>(['']);
  const [timeWindows, setTimeWindows] = useState<Record<number, { start?: string; end?: string }>>({});
  const [invoiceData, setInvoiceData] = useState<Record<number, { key?: string; pdfUrl?: string; isFetching?: boolean; isImage?: boolean }>>({});
  const [previewInvoice, setPreviewInvoice] = useState<{ url: string; isImage?: boolean } | null>(null);
  
  const updateInvoiceKey = useCallback((idx: number, key: string) => {
    setInvoiceData(prev => ({
      ...prev,
      [idx]: { ...prev[idx], key }
    }));
  }, []);

  const fetchInvoicePdf = async (idx: number) => {
    const key = invoiceData[idx]?.key;
    if (!key || key.length < 5) return;
    setInvoiceData(prev => ({ ...prev, [idx]: { ...prev[idx], isFetching: true } }));
    
    // Simulate fetching from "Meu Danfe" or SEFAZ
    setTimeout(() => {
      setInvoiceData(prev => ({
        ...prev,
        [idx]: {
          ...prev[idx],
          isFetching: false,
          pdfUrl: `https://mock-nfe.com/danfe/${key}.pdf`,
          isImage: false
        }
      }));
    }, 1500);
  };

  const triggerFileUpload = useCallback((idx: number) => {
    const el = document.getElementById(`nfe-upload-${idx}`);
    if (el) el.click();
  }, []);

  const handleNfeUpload = useCallback((idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fakeUrl = URL.createObjectURL(file);
      const isImage = file.type.startsWith('image/');
      setInvoiceData(prev => ({
        ...prev,
        [idx]: { ...prev[idx], pdfUrl: fakeUrl, key: file.name, isImage }
      }));
    }
  }, []);

  // Roteiro de Apresentação / Simulador de Fluxo
  const [showDemoAssistant, setShowDemoAssistant] = useState(false);
  const [logoDrawn, setLogoDrawn] = useState(false);
  const [showPlanet, setShowPlanet] = useState(false);
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

  const updateTimeWindow = useCallback((idx: number, type: 'start' | 'end', val: string) => {
    setTimeWindows(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [type]: val
      }
    }));
  }, []);

  const removeTimeWindow = useCallback((idx: number) => {
    setTimeWindows(prev => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
  }, []);

  const [routeResult, setRouteResult] = useState<any>(null);

  // Simulation Mode states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedResults, setSimulatedResults] = useState<Record<string, any>>({});
  const [isCalculatingSim, setIsCalculatingSim] = useState<string | null>(null);
  const [activeSimProfile, setActiveSimProfile] = useState<string | null>(null);

  const [navIndex, setNavIndex] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportType, setReportType] = useState<string>('');

  // Delivery proof modal and camera states
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureReason, setFailureReason] = useState<string>('');
  const [failureNotes, setFailureNotes] = useState<string>('');
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
      const hasAi = data.openai?.status === 'SUCCESS' || data.gemini?.status === 'SUCCESS' || data.anyapi?.status === 'SUCCESS' || data.anyapi?.status === 'FALLBACK_NEEDED';
      if (!hasAi) {
        failedKeys.push('Motor de Inteligência (OpenAI / Gemini / AnyAPI)');
      }
      if (data.ors?.status === 'FAILED') failedKeys.push('OpenRouteService (Motor de Rotas)');
      if (data.weather?.status === 'FAILED') failedKeys.push('OpenWeather (Clima)');
      if (failedKeys.length > 0) {
        setApiWarning(`Aviso Diagnóstico: Falha de conexão com ${failedKeys.join(', ')}.`);
      }
    }).catch(e => console.warn('Diagnostic fetch error:', e.message));
  }, []);

  const currentActiveText = (activeSuggestionIdx !== null && activeSuggestionIdx !== undefined && activeSuggestionIdx < addresses.length) 
    ? (addresses[activeSuggestionIdx] || '') 
    : '';

  useEffect(() => {
    // Condição estrita para evitar cascading renders e loops infinitos
    if (currentActiveText.length < 2) {
      const t = setTimeout(() => {
        setSuggestions([]);
      }, 0);
      return () => clearTimeout(t);
    }

    const timer = setTimeout(async () => {
      try {
        const res = await enhancedAutocomplete(currentActiveText, userLocation || undefined);
        setSuggestions(res);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Autocomplete error:", error);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [currentActiveText, activeSuggestionIdx, userLocation]);

  const addAddress = useCallback(() => setAddresses(prev => [...prev, '']), []);
  const updateAddress = useCallback((idx: number, val: string) => {
    setAddresses(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }, []);
  const removeAddress = useCallback((idx: number) => {
    setAddresses(prev => prev.filter((_, i) => i !== idx));

    // Shift timeWindows keys left
    setTimeWindows(prev => {
      const next: Record<number, { start?: string; end?: string }> = {};
      Object.keys(prev).forEach(keyStr => {
        const k = parseInt(keyStr);
        if (k < idx) {
          next[k] = prev[k];
        } else if (k > idx) {
          next[k - 1] = prev[k];
        }
      });
      return next;
    });

    // Shift invoiceData keys left
    setInvoiceData(prev => {
      const next: Record<number, { key?: string; pdfUrl?: string; isFetching?: boolean; isImage?: boolean }> = {};
      Object.keys(prev).forEach(keyStr => {
        const k = parseInt(keyStr);
        if (k < idx) {
          next[k] = prev[k];
        } else if (k > idx) {
          next[k - 1] = prev[k];
        }
      });
      return next;
    });
  }, []);

  const runOptimization = async (overrideAddresses?: string[] | React.MouseEvent) => {
    // Map timeWindows and invoices correctly to validAddresses indices to prevent offset bugs
    const listToUse = Array.isArray(overrideAddresses) ? overrideAddresses : addresses;
    const validWithWindows: Record<number, { start: string; end: string }> = {};
    const validWithInvoices: Record<number, { key?: string; pdfUrl?: string; isImage?: boolean }> = {};
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
        const inv = invoiceData[i];
        if (inv && (inv.key || inv.pdfUrl)) {
          validWithInvoices[validCount] = {
            key: inv.key,
            pdfUrl: inv.pdfUrl,
            isImage: inv.isImage
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
      const result = await optimizeRoute(validAddresses, { ...options, customPrompt: aiCustomPrompt }, resolvedCoords, validWithWindows, validWithInvoices);
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

      setCurrentScreen('result');
    } catch (error: any) {
      console.error("Optimization failed:", error);
      const errMsg = error?.message || String(error);
      const errStack = error?.stack ? ` | Detalhe Técnico: ${error.stack.split('\\n')[1]}` : "";
      setApiWarning(`Falha na rota: ${errMsg}${errStack}`);
      setCurrentScreen('home');
    }
  };

  const handleStartSimulation = async () => {
    setIsSimulating(true);
    if (routeResult) {
      const currentPriority = options.priority || 'balanced';
      setSimulatedResults({
        [currentPriority]: routeResult
      });
      setActiveSimProfile(currentPriority);
    } else {
      setActiveSimProfile('balanced');
    }
  };

  const handleStopSimulation = () => {
    setIsSimulating(false);
    setActiveSimProfile(null);
    setIsCalculatingSim(null);
  };

  const handleSimulateProfile = async (profile: 'speed' | 'distance' | 'economy' | 'safety' | 'balanced') => {
    setActiveSimProfile(profile);
    if (simulatedResults[profile]) {
      return;
    }

    const listToUse = Array.isArray(addresses) ? addresses : [];
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

    setIsCalculatingSim(profile);
    try {
      const simOptions = {
        ...options,
        priority: profile
      };
      const result = await optimizeRoute(validAddresses, simOptions, resolvedCoords, validWithWindows);
      
      setSimulatedResults(prev => ({
        ...prev,
        [profile]: result
      }));
    } catch (err) {
      console.error("Simulation optimization failed for profile:", profile, err);
    } finally {
      setIsCalculatingSim(null);
    }
  };

  const handleApplySimulatedRoute = (simulatedRoute: any) => {
    if (simulatedRoute) {
      setRouteResult(simulatedRoute);
      if (simulatedRoute.priority) {
        setOptions(prev => ({ ...prev, priority: simulatedRoute.priority }));
      }
      setIsSimulating(false);
      setActiveSimProfile(null);
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
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={async () => {
                  try {
                    // IMMEDIATELY BLUR to prevent native mobile horizontal scroll bug
                    // when setting a VERY long address text value.
                    try {
                      inputRefs.current[idx]?.blur();
                    } catch(e) {}

                    const updatedAddresses = [...addresses];
                    updatedAddresses[idx] = s.label;
                    
                    if (idx === 0 && updatedAddresses.length === 1) {
                      updatedAddresses.push('');
                    }
                    
                    setAddresses(updatedAddresses);
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
                    
                    setTimeout(() => {
                      try {
                        // Rescroll any potential container scroll
                        const container = document.querySelector('.overflow-y-auto');
                        if (container) {
                          container.scrollLeft = 0;
                        }
                        window.scrollTo({ left: 0, top: 0, behavior: 'instant' });

                        if (idx + 1 < updatedAddresses.length) {
                          inputRefs.current[idx + 1]?.focus({ preventScroll: true });
                        }
                      } catch (e) {}
                    }, 10);
                  } catch (err) {
                    console.error("Error choosing suggestion:", err);
                  }
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
                    <p className="text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-1 mt-0.5">{s.label}</p>
                  </div>
                </div>
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

  const enteredAddresses = addresses.filter(a => a.trim().length >= 3);
  const hasTwoOrMoreAddresses = enteredAddresses.length >= 2;

  if (isMobile === undefined) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-slate-800 border-t-tech rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 w-full h-full max-w-[100vw] overflow-x-hidden flex flex-col md:flex-row bg-slate-950 overflow-hidden font-sans`}>
      {/* Cinematic noise texture overlay to remove color banding */}
      <div className="noise-overlay" />

      {/* Floating high-fidelity responsive ambient blobs to create extensive depth (Three.js stylization) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[15%] left-[10%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] rounded-full bg-tech/5 filter blur-[100px] md:blur-[140px] animate-orb-1 opacity-60" />
        <div className="absolute bottom-[20%] right-[5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full bg-[#1e1e1c]/10 filter blur-[90px] md:blur-[120px] animate-orb-2 opacity-50" />
        <div className="absolute top-[60%] left-[45%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full bg-amber-500/3 filter blur-[100px] md:blur-[130px] animate-orb-1 opacity-30" />
      </div>

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

      {/* Dynamic Floating Menu Ball Navigation System - Unified for Desktop & Mobile */}
      <div className="fixed top-6 left-6 z-[5000] flex flex-col items-start">
        {/* The Menu Ball itself */}
        <motion.button
          onClick={() => setIsMenuBallOpen(!isMenuBallOpen)}
          className="w-16 h-16 rounded-full bg-slate-900/95 border-2 border-tech/80 text-[#D1A054] hover:text-white shadow-[0_0_25px_rgba(209,160,84,0.3)] hover:shadow-[0_0_35px_rgba(209,160,84,0.5)] flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-300 hover:scale-105 active:scale-95 group relative overflow-hidden"
          whileTap={{ scale: 0.92 }}
        >
          {/* Animated Background ripple effect */}
          <div className="absolute inset-0 bg-tech/5 group-hover:bg-tech/10 transition-colors" />
          <motion.div 
            className="font-mono text-[9px] font-black tracking-widest leading-none z-10 flex flex-col items-center justify-center gap-1"
            animate={{ rotate: isMenuBallOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {isMenuBallOpen ? (
              <X className="w-5 h-5 text-tech" />
            ) : (
              <>
                <Menu className="w-4 h-4 text-tech group-hover:scale-110 transition-transform" />
                <span className="text-[8px] tracking-widest text-[#D1A054]">MENU</span>
              </>
            )}
          </motion.div>
        </motion.button>

        {/* Expanded Rectangular Tabs container */}
        <AnimatePresence>
          {isMenuBallOpen && (
            <motion.div
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={{
                expanded: { transition: { staggerChildren: 0.08 } },
                collapsed: { transition: { staggerChildren: 0.04, staggerDirection: -1 } }
              }}
              className="flex flex-col gap-3 mt-4 w-56 p-1.5 bg-slate-950/80 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-[2005]"
            >
              {[
                { id: 'home', label: 'Planejamento', icon: MapIcon, desc: 'Inserir e Alterar Cidades' },
                ...(routeResult ? [
                  { id: 'result', label: 'Resumo Rota', icon: RouteIcon, desc: 'Resumos e Alternativas' },
                  { id: 'navigation', label: 'Rota Ativa', icon: NavIcon, desc: 'Navegação GPS em Tempo Real' }
                ] : []),
                { id: 'dashboard', label: 'Métricas', icon: LayoutDashboard, desc: 'Desempenho e Logística' },
                { id: 'settings', label: 'Configurações', icon: Settings, desc: 'Ajustes Finos do Sistema' },
              ].map((tab) => {
                const isActive = currentScreen === tab.id;
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.id}
                    variants={{
                      collapsed: { x: -30, opacity: 0, scale: 0.95 },
                      expanded: { x: 0, opacity: 1, scale: 1 }
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    onClick={() => {
                      setCurrentScreen(tab.id as any);
                      setIsMenuBallOpen(false);
                    }}
                    className={`w-full p-3 border text-left flex items-center gap-3 transition-all cursor-pointer relative group ${
                      isActive 
                        ? 'bg-tech text-slate-950 border-tech shadow-[0_0_20px_rgba(209,160,84,0.25)] font-black' 
                        : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80 text-slate-300 hover:text-white hover:border-tech/40'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-slate-950/10' : 'bg-slate-950/50 group-hover:bg-tech/10 group-hover:text-tech transition-colors'}`}>
                      <Icon className="w-5 h-5 shrink-0" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[11px] uppercase tracking-wider font-extrabold leading-none ${isActive ? 'text-slate-950' : 'text-slate-200'}`}>
                        {tab.label}
                      </span>
                      <span className={`text-[8.5px] truncate mt-0.5 font-medium ${isActive ? 'text-slate-900/70' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        {tab.desc}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative h-full w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {currentScreen === 'home' && (
            <motion.div
              key="home-ui"
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 100, damping: 20 }}
              className={`h-full w-full flex flex-col items-center max-w-6xl mx-auto px-4 sm:px-6 overflow-y-auto overflow-x-hidden custom-scrollbar ${isMobile ? 'pt-20 pb-16' : 'py-12'}`}
            >
              <div className="w-full flex-shrink-0 flex flex-col items-center justify-center mb-4 sm:mb-8 md:mb-12 relative min-h-[min(90vw,400px)] md:min-h-[500px] overflow-visible">
                <AnimatePresence>
                  {showPlanet && (
                    <motion.div 
                      className="absolute inset-0 flex items-center justify-center -z-10 opacity-60 mix-blend-screen pointer-events-none"
                      initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                      animate={{ opacity: 0.6, scale: 1, rotate: 0 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                    >
                      <RotatingEarth width={600} height={600} className="w-full max-w-[450px] md:max-w-[600px] absolute" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <h1 className="font-bold font-display text-center flex flex-col items-center justify-center leading-none relative z-10 w-full px-1.5 sm:px-4 py-4 sm:py-8">
                  <div className="flex flex-col items-center w-full max-w-full px-1 sm:px-2">
                    <div className="relative w-[90vw] max-w-[400px] sm:max-w-[500px] md:max-w-[650px] lg:max-w-[800px] xl:max-w-[950px] mx-auto aspect-square @container">
                      <HarpiaTextEffect 
                        speed={1.4} 
                        className="w-full h-auto text-white drop-shadow-[0_0_15px_rgba(209,160,84,0.4)] z-10" 
                        onAnimationComplete={() => {
                          setLogoDrawn(true);
                          setTimeout(() => setShowPlanet(true), 800);
                        }} 
                      />
                      
                      <AnimatePresence>
                        {logoDrawn && (
                          <motion.div 
                            className="absolute z-20 text-center pointer-events-none"
                            style={{ 
                              left: '11.8%', 
                              width: '70%', 
                              top: '60%', // Exactly beneath the baseline of the HARPIA letters
                            }}
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          >
                            <p 
                              className="font-medium text-[#D1A054] uppercase text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none whitespace-nowrap" 
                              style={{ 
                                fontSize: '1.7cqw', 
                                letterSpacing: '0.08em',
                              }}
                            >
                              Hórus Amazônico de Rotas e Planejamento com Inteligência Artificial
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </h1>
              </div>

              <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-12">
                {/* Left Column: Itinerary inputs (Spans 7 columns on desktop) */}
                <div className="lg:col-span-7 glass p-4 xs:p-6 md:p-8 rounded-3xl md:rounded-[40px] shadow-2xl relative h-fit flex flex-col border border-slate-800/40">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <MapIcon className="w-32 h-32" />
                  </div>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2.5 font-display border-b border-slate-850 pb-4 flex-wrap">
                    <div className="w-2.5 h-2.5 rounded-full bg-tech shadow-[0_0_10px_rgba(209,160,84,0.5)] shrink-0" />
                    <span>
                      Paradas de Entrega
                      <InfoTooltip text="Adicione o local de partida e as paradas desejadas. A plataforma traçará no mapa o melhor trajeto conectando esses pontos." />
                    </span>
                  </h3>
                  
                  <div className="space-y-5 mb-8 relative">
                    {/* Vertical Connecting Itinerary Line */}
                    <div className="absolute left-6 top-8 bottom-8 w-0.5 border-l-2 border-dashed border-slate-800 pointer-events-none" />

                    {/* Starting Point */}
                    <div className="relative flex gap-4 items-start">
                      <div className="w-4 h-4 rounded-full bg-tech text-slate-950 font-black flex items-center justify-center text-[10px] mt-4.5 z-10 shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                        A
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <label className="text-[10px] text-tech font-black uppercase tracking-widest px-1 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-tech animate-pulse" />
                          Ponto de Partida (Origem)
                        </label>
                        <div className="relative">
                          <input
                            ref={el => { inputRefs.current[0] = el; }}
                            value={addresses[0] || ''}
                            onChange={(e) => updateAddress(0, e.target.value)}
                            onFocus={() => setActiveSuggestionIdx(0)}
                            onBlur={() => setTimeout(() => {
                              if (activeSuggestionIdx === 0) setShowSuggestions(false);
                            }, 200)}
                            placeholder="De onde você está saindo? (Empresa, Praça, Rua...)"
                            className="w-full bg-slate-900/80 border border-tech/30 rounded-2xl px-4 py-4 text-sm focus:border-tech focus:ring-1 focus:ring-tech outline-none transition-all pr-10 hover:border-slate-700 font-sans"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              setActiveSuggestionIdx(0);
                              const text = addresses[0];
                              if (text && text.length >= 2) {
                                const res = await enhancedAutocomplete(text, userLocation || undefined);
                                setSuggestions(res);
                                setShowSuggestions(true);
                              }
                            }}
                            className="absolute right-3.5 top-4 text-slate-500 hover:text-tech transition-colors cursor-pointer z-10"
                            title="Pesquisar local"
                          >
                            <Search className="w-5 h-5 text-slate-600 hover:text-tech" />
                          </button>
                          {renderSuggestionsDropdown(0)}
                        </div>
                      </div>
                    </div>

                    {/* Intermediate Stops */}
                    {addresses.length > 2 && (
                      <div className="space-y-5 pl-10">
                        {addresses.slice(1, -1).map((addr, idx) => {
                          const realIdx = idx + 1;
                          return (
                            <div key={realIdx} className="space-y-2 relative">
                              <div className="absolute -left-10 top-3 w-4 h-4 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[9px] z-10 border border-slate-750">
                                {idx + 1}
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest px-1">
                                  Parada {idx + 1}
                                </label>
                                <div className="flex gap-2 relative">
                                  <div className="flex-1 min-w-0 relative">
                                    <input
                                      ref={el => { inputRefs.current[realIdx] = el; }}
                                      value={addr}
                                      onChange={(e) => updateAddress(realIdx, e.target.value)}
                                      onFocus={() => setActiveSuggestionIdx(realIdx)}
                                      onBlur={() => setTimeout(() => {
                                        if (activeSuggestionIdx === realIdx) setShowSuggestions(false);
                                      }, 200)}
                                      placeholder="Empresa, hospital, praça ou rua..."
                                      className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl px-4 py-3 text-sm focus:border-slate-600 outline-none transition-all pr-10 hover:border-slate-700/60 font-sans"
                                    />
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setActiveSuggestionIdx(realIdx);
                                        const text = addr;
                                        if (text && text.length >= 2) {
                                          const res = await enhancedAutocomplete(text, userLocation || undefined);
                                          setSuggestions(res);
                                          setShowSuggestions(true);
                                        }
                                      }}
                                      className="absolute right-3.5 top-3 text-slate-500 hover:text-tech transition-colors cursor-pointer z-10"
                                      title="Pesquisar local"
                                    >
                                      <Search className="w-4 h-4 text-slate-600 hover:text-tech" />
                                    </button>
                                    {renderSuggestionsDropdown(realIdx)}
                                  </div>
                                  <button 
                                    onClick={() => removeAddress(realIdx)}
                                    className="p-3 text-slate-600 hover:text-alert hover:bg-slate-950/40 rounded-xl transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                {/* Stop Delivery Time Window */}
                                <div className="flex flex-wrap items-center gap-2 mt-2 px-1 pb-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-650 shrink-0" />
                                  <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">Janela de Entrega:</span>
                                  <div className="flex flex-wrap items-center gap-1.5 ml-1">
                                    <input 
                                      type="time"
                                      value={timeWindows[realIdx]?.start || ''}
                                      onChange={(e) => updateTimeWindow(realIdx, 'start', e.target.value)}
                                      className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-tech focus:ring-1 focus:ring-tech/30 transition-all font-mono"
                                    />
                                    <span className="text-[10px] text-slate-600">até</span>
                                    <input 
                                      type="time"
                                      value={timeWindows[realIdx]?.end || ''}
                                      onChange={(e) => updateTimeWindow(realIdx, 'end', e.target.value)}
                                      className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-tech focus:ring-1 focus:ring-tech/30 transition-all font-mono"
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
                                {/* NFe / Upload */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-1 pb-2">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-tech/70 shrink-0" />
                                    <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">NFe / DANFE:</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden focus-within:border-tech focus-within:ring-1 focus-within:ring-tech/30 transition-all w-full sm:w-auto">
                                      <input 
                                        type="text"
                                        placeholder="Chave de Acesso (44 dígitos)..."
                                        value={invoiceData[realIdx]?.key || ''}
                                        onChange={(e) => updateInvoiceKey(realIdx, e.target.value)}
                                        className="bg-transparent text-[11px] text-slate-300 px-3 py-1 outline-none w-full sm:w-48 font-mono placeholder:text-slate-600"
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => fetchInvoicePdf(realIdx)}
                                        disabled={invoiceData[realIdx]?.isFetching || !invoiceData[realIdx]?.key}
                                        className="bg-slate-800/80 hover:bg-slate-700 disabled:opacity-50 px-2 py-1 flex items-center justify-center transition-colors border-l border-slate-700"
                                      >
                                        {invoiceData[realIdx]?.isFetching ? <RefreshCw className="w-3 h-3 text-tech animate-spin" /> : <Search className="w-3 h-3 text-slate-400" />}
                                      </button>
                                    </div>
                                    <input 
                                      type="file" 
                                      id={`nfe-upload-${realIdx}`} 
                                      className="hidden" 
                                      accept=".pdf,image/*" 
                                      onChange={(e) => handleNfeUpload(realIdx, e)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => triggerFileUpload(realIdx)}
                                      className="text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg px-2 py-1 text-[10px] flex items-center gap-1.5 transition-colors"
                                    >
                                      <Upload className="w-3 h-3" /> Upload PDF
                                    </button>
                                    {invoiceData[realIdx]?.pdfUrl && (
                                      <div className="flex items-center gap-1">
                                        <div className="flex items-center gap-1.5 text-tech text-[10px] px-2 py-1 bg-tech/10 rounded-lg border border-tech/20">
                                          <FileCheck className="w-3 h-3" /> Anexada
                                        </div>
                                        <button 
                                          type="button"
                                          onClick={() => setPreviewInvoice(invoiceData[realIdx]?.pdfUrl ? { url: invoiceData[realIdx].pdfUrl!, isImage: invoiceData[realIdx].isImage } : null)}
                                          className="text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg px-2 py-1 text-[10px] flex items-center gap-1.5 transition-colors"
                                        >
                                          <FileText className="w-3 h-3" /> Visualizar
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Final Destination */}
                    {addresses.length >= 2 && (
                       <div className="relative flex gap-4 items-start">
                        <div className="w-4 h-4 rounded-full bg-alert text-white font-black flex items-center justify-center text-[10px] mt-4.5 z-10 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                          B
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <label className="text-[10px] text-alert font-black uppercase tracking-widest px-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-alert" />
                            Destino Final
                          </label>
                          <div className="relative">
                            <input
                              ref={el => { inputRefs.current[addresses.length - 1] = el; }}
                              value={addresses[addresses.length - 1] || ''}
                              onChange={(e) => updateAddress(addresses.length - 1, e.target.value)}
                              onFocus={() => setActiveSuggestionIdx(addresses.length - 1)}
                              onBlur={() => setTimeout(() => {
                                if (activeSuggestionIdx === addresses.length - 1) setShowSuggestions(false);
                              }, 200)}
                              placeholder="Aonde você quer chegar? (Ex: Aeroporto, Shopping...)"
                              className="w-full bg-slate-900/80 border border-alert/30 rounded-2xl px-4 py-4 text-sm focus:border-alert focus:ring-1 focus:ring-alert outline-none transition-all pr-10 hover:border-slate-705 font-sans"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const lastIdx = addresses.length - 1;
                                setActiveSuggestionIdx(lastIdx);
                                const text = addresses[lastIdx];
                                if (text && text.length >= 2) {
                                  const res = await enhancedAutocomplete(text, userLocation || undefined);
                                  setSuggestions(res);
                                  setShowSuggestions(true);
                                }
                              }}
                              className="absolute right-3.5 top-4 text-slate-500 hover:text-tech transition-colors cursor-pointer z-10"
                              title="Pesquisar local"
                            >
                              <Search className="w-5 h-5 text-slate-600 hover:text-tech" />
                            </button>
                            {renderSuggestionsDropdown(addresses.length - 1)}
                          </div>
                          {/* Final Destination Time Window */}
                          <div className="flex flex-wrap items-center gap-2 mt-2 px-1 pb-1">
                            <Clock className="w-3.5 h-3.5 text-slate-650 shrink-0" />
                            <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">Janela de Entrega:</span>
                            <div className="flex flex-wrap items-center gap-1.5 ml-1">
                              <input 
                                type="time"
                                value={timeWindows[addresses.length - 1]?.start || ''}
                                onChange={(e) => updateTimeWindow(addresses.length - 1, 'start', e.target.value)}
                                className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-tech focus:ring-1 focus:ring-tech/30 transition-all font-mono"
                              />
                              <span className="text-[10px] text-slate-600">até</span>
                              <input 
                                type="time"
                                value={timeWindows[addresses.length - 1]?.end || ''}
                                onChange={(e) => updateTimeWindow(addresses.length - 1, 'end', e.target.value)}
                                className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-tech focus:ring-1 focus:ring-tech/30 transition-all font-mono"
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
                          {/* NFe / Upload */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-1 pb-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-tech/70 shrink-0" />
                              <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider">NFe / DANFE:</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex bg-slate-950/80 border border-slate-800 rounded-lg overflow-hidden focus-within:border-tech focus-within:ring-1 focus-within:ring-tech/30 transition-all w-full sm:w-auto">
                                <input 
                                  type="text"
                                  placeholder="Chave de Acesso (44 dígitos)..."
                                  value={invoiceData[addresses.length - 1]?.key || ''}
                                  onChange={(e) => updateInvoiceKey(addresses.length - 1, e.target.value)}
                                  className="bg-transparent text-[11px] text-slate-300 px-3 py-1 outline-none w-full sm:w-48 font-mono placeholder:text-slate-600"
                                />
                                <button 
                                  type="button"
                                  onClick={() => fetchInvoicePdf(addresses.length - 1)}
                                  disabled={invoiceData[addresses.length - 1]?.isFetching || !invoiceData[addresses.length - 1]?.key}
                                  className="bg-slate-800/80 hover:bg-slate-700 disabled:opacity-50 px-2 py-1 flex items-center justify-center transition-colors border-l border-slate-700"
                                >
                                  {invoiceData[addresses.length - 1]?.isFetching ? <RefreshCw className="w-3 h-3 text-tech animate-spin" /> : <Search className="w-3 h-3 text-slate-400" />}
                                </button>
                              </div>
                              <input 
                                type="file" 
                                id={`nfe-upload-${addresses.length - 1}`} 
                                className="hidden" 
                                accept=".pdf,image/*" 
                                onChange={(e) => handleNfeUpload(addresses.length - 1, e)}
                              />
                              <button
                                type="button"
                                onClick={() => triggerFileUpload(addresses.length - 1)}
                                className="text-slate-400 hover:text-white bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg px-2 py-1 text-[10px] flex items-center gap-1.5 transition-colors"
                              >
                                <Upload className="w-3 h-3" /> Upload PDF
                              </button>
                              {invoiceData[addresses.length - 1]?.pdfUrl && (
                                <div className="flex items-center gap-1">
                                  <div className="flex items-center gap-1.5 text-tech text-[10px] px-2 py-1 bg-tech/10 rounded-lg border border-tech/20">
                                    <FileCheck className="w-3 h-3" /> Anexada
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => setPreviewInvoice(invoiceData[addresses.length - 1]?.pdfUrl ? { url: invoiceData[addresses.length - 1].pdfUrl!, isImage: invoiceData[addresses.length - 1].isImage } : null)}
                                    className="text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg px-2 py-1 text-[10px] flex items-center gap-1.5 transition-colors"
                                  >
                                    <FileText className="w-3 h-3" /> Visualizar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3.5 mt-auto">
                    <button 
                      onClick={() => {
                        const next = [...addresses];
                        if (next.length > 1) {
                          next.splice(addresses.length - 1, 0, '');
                        } else {
                          next.push('');
                        }
                        setAddresses(next);
                        setTimeout(() => {
                           const focusIdx = next.length - 1;
                           inputRefs.current[focusIdx]?.focus({ preventScroll: true });
                        }, 100);
                      }}
                      className="w-full py-4 border border-dashed border-slate-800 hover:border-tech hover:bg-tech/5 hover:text-tech rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
                    >
                      + Adicionar Parada Intermediária
                    </button>
                    <div>
                      <button 
                        onClick={() => setAddresses(DEFAULT_ADDRESSES)}
                        className="w-full py-3 bg-slate-950/30 hover:bg-slate-800/40 border border-slate-800/40 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all text-slate-500 hover:text-white"
                      >
                        Usar Rota de Laboratório Demo (Manaus / AM)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Dynamic Logistics Configuration Bento Box List (Spans 5 columns on desktop) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  {/* Bento Box 1: Vehicle selection */}
                  <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                      <Truck className="w-4 h-4 shrink-0" />
                      <span>
                        Perfil de Transporte
                        <InfoTooltip text="Selecione o tipo de veículo usado. O roteador adaptará o cálculo de tempo e viabilidade de ruas automaticamente." />
                      </span>
                    </h3>
                    <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                      {[
                        { id: 'moto', icon: Bike, label: 'Moto' },
                        { id: 'van', icon: Car, label: 'Van' },
                        { id: 'truck', icon: Truck, label: 'Caminhão' },
                        { id: 'boat', icon: MapIcon, label: 'Barco' },
                      ].map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setOptions({ ...options, vehicle: v.id as any })}
                          className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all cursor-pointer ${
                            options.vehicle === v.id
                              ? 'bg-tech/10 border-tech text-tech shadow-[0_0_15px_rgba(0,242,255,0.06)]'
                              : 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                          }`}
                        >
                          <v.icon className="w-5 h-5 mb-1.5" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bento Box 2: Route optimization priority */}
                  <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                      <Zap className="w-4 h-4 shrink-0" />
                      <span>
                        Algoritmo de Prioridade
                        <InfoTooltip text="Escolha entre Tempo e Distância. Roteiros mais rápidos podem usar vias expressas, mas nem sempre são o caminho mais curto." />
                      </span>
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                            options.priority === p.id 
                            ? 'bg-tech/10 border-tech text-tech shadow-[0_0_15px_rgba(0,242,255,0.06)]' 
                            : 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                          }`}
                        >
                          <p.icon className="w-4 h-4 mb-1 shrink-0" />
                          <span className="text-[9px] font-black uppercase tracking-tight leading-none">{p.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 p-3.5 rounded-xl bg-slate-950/40 border border-slate-900 text-xs text-slate-400 leading-relaxed font-sans">
                      {options.priority === 'speed' && <p><strong className="text-white">Velocidade (Rápido):</strong> Evita congestionamentos em avenidas principais e privilegia fluxos ágeis, reduzindo tempo total de trajeto.</p>}
                      {options.priority === 'distance' && <p><strong className="text-white">Distância Mínima:</strong> Traçado seco com menor metragem absoluta, secundarizando congestionamento ou semáforos.</p>}
                      {options.priority === 'economy' && <p><strong className="text-white">Economia (Eco):</strong> Trajeto plano visando estabilidade, evitando desgaste operacional e acelerações sob declives pesados.</p>}
                      {options.priority === 'safety' && <p><strong className="text-white">Segurança (Seguro):</strong> Prevenção de risco. Desvia de zonas com alertas de acidentes, vias perigosas ou ocorrências climáticas.</p>}
                      {options.priority === 'balanced' && <p><strong className="text-white">Equilibrado:</strong> Algoritmo heurístico que pondera tempo, consumo médio, tipo de carga e integridade operacional.</p>}
                    </div>
                  </div>

                  {/* Bento Box 3: Land & Soil constraints options (The Avoid parameters) */}
                  <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>
                        Restrições de Via
                        <InfoTooltip text="Peça para evitar rodovias, pedágios ou balsas para rotas com restrições orçamentárias ou de tipo de veículo." />
                      </span>
                    </h3>
                    <div className="flex flex-col gap-2.5">
                      {[
                        { 
                          id: 'avoidDirt', 
                          icon: Leaf, 
                          label: 'Evitar Não Pavimentado', 
                          desc: 'Desvia de estradas de terra e vias sem asfalto' 
                        },
                        { 
                          id: 'avoidFloods', 
                          icon: Droplets, 
                          label: 'Evitar Zonas de Alagamento', 
                          desc: 'Evita áreas com histórico ou alerta de inundação' 
                        },
                        { 
                          id: 'avoidHills', 
                          icon: BarChart4, 
                          label: 'Evitar Trechos com Declive', 
                          desc: 'Contorna ruas com inclinações severas/morros' 
                        },
                      ].map((item) => {
                        const active = (options as any)[item.id];
                        return (
                          <button
                            key={item.id}
                            onClick={() => setOptions({ ...options, [item.id]: !active })}
                            className={`flex items-center gap-3.5 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              active
                                ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                                : 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:text-slate-400 hover:border-slate-800'
                            }`}
                          >
                            <div className={`p-2 rounded-xl shrink-0 ${active ? 'bg-amber-500/10' : 'bg-slate-900'}`}>
                              <item.icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold leading-tight ${active ? 'text-amber-500 font-black' : 'text-slate-300'}`}>
                                {item.label}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.desc}</p>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              active ? 'border-amber-500 bg-amber-500' : 'border-slate-800 bg-slate-950'
                            }`}>
                              {active && <span className="text-[9px] text-slate-950 font-black">✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bento Box 4: AI Custom Prompts */}
                  <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#D1A054] mb-2.5 font-display flex items-center gap-2 flex-wrap">
                      <Sparkles className="w-4 h-4 text-[#D1A054] animate-pulse shrink-0" />
                      <span>
                        Instruções da IA
                        <InfoTooltip text="Regras e restrições semânticas. Ex: 'Chegar até às 15h, caminhão pesado não sobe ladeira'." />
                      </span>
                    </h3>
                    <p className="text-slate-400 text-xs mb-3.5 leading-relaxed font-sans">
                      Adicione diretrizes customizadas para que o cérebro artificial analise a segurança física da sua equipe e do trajeto.
                    </p>
                    <textarea
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Ex: 'priorizar vias com boa iluminação pública', 'informar rotas transitáveis por carretas', 'checar incidências climáticas recentes'..."
                      rows={2}
                      className="w-full bg-slate-950/60 border border-slate-850 rounded-2xl px-4 py-3 text-xs md:text-sm focus:border-[#D1A054] focus:ring-1 focus:ring-[#D1A054]/30 outline-none transition-all resize-none text-slate-100 placeholder-slate-650 font-sans"
                    />
                  </div>

                  {/* Ultimate Execution Button */}
                  {!hasTwoOrMoreAddresses ? (
                    <button 
                      onClick={runOptimization}
                      className="w-full bg-tech text-slate-950 font-black py-4.5 rounded-2xl text-lg md:text-xl shadow-[0_15px_30px_rgba(209,160,84,0.25)] hover:bg-tech/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      CALCULAR MELHOR ROTA
                    </button>
                  ) : (
                    <>
                      {/* Generous bottom spacing so form content doesn't get hidden behind the fixed bar */}
                      <div className="h-32 w-full" />
                      <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
                        className="fixed bottom-0 left-0 right-0 z-[1200] bg-slate-950/95 border-t border-tech/30 p-4 md:p-6 shadow-[0_-10px_35px_rgba(209,160,84,0.15)] flex items-center justify-center backdrop-blur-xl"
                      >
                        <div className="w-full max-w-2xl flex items-center justify-between gap-4">
                          <div className="hidden sm:flex flex-col text-left">
                            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest leading-none">Roteamento Ativo</span>
                            <span className="text-sm font-black text-white mt-1.5 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-tech animate-pulse" />
                              {enteredAddresses.length} endereços inseridos
                            </span>
                          </div>
                          
                          <button 
                            onClick={runOptimization}
                            className="w-full sm:w-auto px-8 py-3.5 bg-tech text-slate-950 font-black rounded-xl text-sm md:text-base shadow-[0_4px_20px_rgba(209,160,84,0.3)] hover:shadow-[0_4px_25px_rgba(209,160,84,0.45)] hover:bg-tech/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider shrink-0"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            CALCULAR MELHOR ROTA
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {currentScreen === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 120, damping: 20 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <TruckLoader />
            </motion.div>
          )}

          {currentScreen === 'result' && routeResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.7, type: 'spring', stiffness: 90, damping: 20 }}
              className={`h-full flex ${isMobile ? 'relative w-full h-full overflow-hidden' : ''}`}
            >
              <div className={`${isMobile ? 'absolute inset-0 z-0' : 'flex-1 relative'}`}>
                <MapView stops={routeResult.sequence} geometry={routeResult.geometry} alternatives={routeResult.alternatives || []} />
              </div>
              <div 
                className={`${
                  isMobile 
                    ? 'z-50' 
                    : 'relative h-full z-10 shadow-2xl shrink-0 transition-all duration-300 ease-in-out'
                }`}
                style={isMobile ? undefined : { width: isSidebarOpen ? '400px' : '0px' }}
              >
                {!isMobile && (
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    style={{ left: '-32px' }}
                    className="absolute top-1/2 -translate-y-1/2 w-8 h-12 bg-slate-950 border border-slate-800 border-r-0 rounded-l-xl z-20 flex items-center justify-center text-tech hover:text-white transition-colors shadow-lg cursor-pointer"
                    title={isSidebarOpen ? "Recolher Painel" : "Expandir Painel"}
                  >
                    <ChevronRight 
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isSidebarOpen ? 'rotate-0' : 'rotate-180'
                      }`} 
                    />
                  </button>
                )}
                <div 
                  className={`h-full ${isMobile ? '' : 'overflow-hidden transition-all duration-300'}`} 
                  style={isMobile ? undefined : { 
                    width: '400px', 
                    visibility: isSidebarOpen ? 'visible' : 'hidden', 
                    opacity: isSidebarOpen ? 1 : 0 
                  }}
                >
                  <Sidebar 
                    stops={routeResult.sequence} 
                    summary={routeResult.summary}
                    score={routeResult.score}
                    aiAnalysis={routeResult.aiAnalysis}
                    onNavigate={() => setCurrentScreen('navigation')}
                    isLoading={false}
                    isSimulating={isSimulating}
                    onStartSimulation={handleStartSimulation}
                    onStopSimulation={handleStopSimulation}
                    simulatedResults={simulatedResults}
                    isCalculatingSim={isCalculatingSim}
                    activeSimProfile={activeSimProfile}
                    onSimulateProfile={handleSimulateProfile}
                    onApplyRoute={handleApplySimulatedRoute}
                  />
                </div>
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
                 <MapView stops={routeResult.sequence} geometry={routeResult.geometry} alternatives={routeResult.alternatives || []} isNavigationScreen={true} navIndex={navIndex} />
                 
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
                              className="w-full bg-tech text-slate-950 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(209,160,84,0.35)] hover:brightness-110 active:scale-95 transition-all text-xs uppercase cursor-pointer"
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
                                  const updatedSequence = [...routeResult.sequence];
                                  updatedSequence[navIndex] = {
                                    ...updatedSequence[navIndex],
                                    status: 'completed',
                                    deliveryNotes: deliveryNotes || 'Entrega efetuada com sucesso'
                                  };
                                  await db.routes.update(latest.id, { 
                                    status: 'completed',
                                    sequence: updatedSequence,
                                    deliveryPhoto: deliveryPhoto,
                                    deliveryNotes: deliveryNotes || 'Entrega efetuada com sucesso',
                                    completedAt: new Date()
                                  });
                                  setRouteResult((prev: any) => ({
                                    ...prev,
                                    sequence: updatedSequence
                                  }));
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

                 <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-slate-950/95 backdrop-blur-xl border-t border-tech/30 text-white rounded-t-[32px] shadow-[0_-15px_50px_rgba(209,160,84,0.15)] md:max-w-2xl md:mx-auto">
                    {/* Floating Controls above bottom bar */}
                    <div className="absolute right-4 -top-40 flex flex-col gap-3">
                      {/* Sound Toggle Button */}
                      <button 
                        onClick={() => setSoundMuted(!soundMuted)}
                        className={`w-12 h-12 border rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all outline-none ${soundMuted ? 'bg-alert/10 border-alert/30 text-alert' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                        title={soundMuted ? "Ativar som" : "Desativar som"}
                      >
                        {soundMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>

                      {/* Recenter Map Button */}
                      <button 
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('recenter-map'));
                        }}
                        className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.4)] flex items-center justify-center text-tech hover:scale-105 active:scale-95 transition-all outline-none"
                        title="Centralizar"
                      >
                        <LocateFixed className="w-5 h-5" />
                      </button>

                      {/* Report Button */}
                      <button 
                        onClick={() => {
                          setIsReporting(true);
                        }}
                        className="w-14 h-14 bg-alert rounded-full shadow-[0_10px_20px_rgba(239,68,68,0.4)] flex items-center justify-center text-white hover:scale-105 hover:bg-red-400 active:scale-95 transition-all outline-none mt-2"
                        title="Reportar Ocorrência"
                      >
                        <AlertTriangle className="w-7 h-7" />
                      </button>
                    </div>

                    <div className="px-6 pt-5 pb-8 flex items-center justify-between">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2">
                          {/* Mock ETA */}
                          <p className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                            15:30
                          </p>
                          <p className="text-sm font-bold text-tech">15 min</p>
                        </div>
                        <p className="text-sm font-bold text-slate-400 mt-1">
                          {Math.round(routeResult.segments?.[Math.max(navIndex - 1, 0)]?.distance / 1000) || 2.5} km • {routeResult.sequence[navIndex]?.address?.split(',')[0]}
                        </p>
                        {routeResult.sequence[navIndex]?.invoice?.pdfUrl && (
                          <div className="mt-1">
                             <button 
                               onClick={() => setPreviewInvoice(routeResult.sequence[navIndex]?.invoice?.pdfUrl ? { url: routeResult.sequence[navIndex].invoice.pdfUrl, isImage: routeResult.sequence[navIndex].invoice.isImage } : null)}
                               className="inline-flex items-center gap-1.5 px-2 py-1 bg-tech/10 border border-tech/30 text-tech rounded uppercase font-bold text-[10px] tracking-wider hover:bg-tech/20 transition-all"
                             >
                                <FileText className="w-3.5 h-3.5" />
                                NFe: {routeResult.sequence[navIndex]?.invoice?.key?.substring(0,8)}... Anexada
                             </button>
                          </div>
                        )}
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setFailureReason('Destinatário Ausente');
                            setFailureNotes('');
                            setShowFailureModal(true);
                          }}
                          className="w-12 h-12 bg-alert/20 border border-alert/30 rounded-full flex items-center justify-center text-alert hover:bg-alert hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        >
                          <XCircle className="w-6 h-6" />
                        </button>

                        <button 
                          onClick={async () => {
                            if (navIndex < routeResult.sequence.length - 1) {
                              const updatedSequence = [...routeResult.sequence];
                              updatedSequence[navIndex] = {
                                ...updatedSequence[navIndex],
                                status: 'completed'
                              };
                              setRouteResult((prev: any) => ({
                                ...prev,
                                sequence: updatedSequence
                              }));
                              setNavIndex(navIndex + 1);
                            } else {
                              setShowDeliveryModal(true);
                              setDeliveryPhoto(null);
                              setDeliveryNotes('');
                              startWebcam();
                            }
                          }}
                          className={`px-6 h-12 ${navIndex === 0 ? 'bg-blue-600 px-8' : 'bg-blue-600'} text-white rounded-full font-black uppercase text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all`}
                        >
                          {navIndex === 0 ? 'Começar' : (navIndex < routeResult.sequence.length - 1 ? 'Cheguei' : 'Finalizar')}
                        </button>
                      </div>
                    </div>
                 </div>
               </div>

               {/* Mock Exit Button */}
               <button 
                 onClick={() => setCurrentScreen('result')}
                 className="absolute top-6 right-6 z-[1002] w-10 h-10 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/40 transition-colors"
               >
                 <XCircle className="w-6 h-6" />
               </button>

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

                       <div className="grid grid-cols-3 gap-4 mb-8">
                         {[
                           { type: 'Trânsito', icon: <Car className="w-6 h-6" />, color: 'bg-red-500' },
                           { type: 'Acidente', icon: <AlertTriangle className="w-6 h-6" />, color: 'bg-amber-500' },
                           { type: 'Polícia', icon: <Shield className="w-6 h-6" />, color: 'bg-blue-500' },
                           { type: 'Perigo', icon: <AlertOctagon className="w-6 h-6" />, color: 'bg-orange-500' },
                           { type: 'Buraco', icon: <MapIcon className="w-6 h-6" />, color: 'bg-slate-500' },
                           { type: 'Bloqueio', icon: <XCircle className="w-6 h-6" />, color: 'bg-red-700' },
                         ].map(item => (
                           <button 
                             key={item.type}
                             onClick={() => setReportType(item.type)}
                             className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                               reportType === item.type ? 'bg-slate-800 scale-105 shadow-xl' : 'hover:bg-slate-800/50'
                             }`}
                           >
                             <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${item.color} shadow-lg shadow-${item.color}/20`}>
                               {item.icon}
                             </div>
                             <span className={`text-[10px] font-bold uppercase tracking-wider ${reportType === item.type ? 'text-white' : 'text-slate-400'}`}>
                               {item.type}
                             </span>
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
                          window.dispatchEvent(new CustomEvent('occurrence-reported'));
                          setIsReporting(false);
                        }}
                        className="w-full bg-tech text-slate-950 font-black py-4 rounded-2xl shadow-[0_5px_20px_rgba(209,160,84,0.3)] hover:brightness-110 active:scale-95 transition-all"
                       >
                         ENVIAR REPORTE
                       </button>
                     </motion.div>
                   </motion.div>
                 )}
               </AnimatePresence>

               {/* Preview Invoice Modal */}
               <AnimatePresence>
                 {previewInvoice && (
                   <motion.div 
                     initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                     className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 sm:p-6"
                   >
                     <motion.div
                       initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                       className="bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                     >
                       <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-800/20">
                         <h3 className="text-white font-medium flex items-center gap-2 text-sm sm:text-base">
                           <FileText className="w-4 h-4 text-tech" /> Pré-visualização do Documento
                         </h3>
                         <button 
                           onClick={() => setPreviewInvoice(null)}
                           className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-colors"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                       
                       <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center overflow-auto p-4 sm:p-8 min-h-[50vh] gap-4">
                         {previewInvoice?.isImage ? (
                           <div className="flex-1 max-w-full flex items-center justify-center relative rounded overflow-hidden">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img 
                               src={previewInvoice?.url} 
                               alt="Visualização do Documento" 
                               className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-xl"
                             />
                           </div>
                         ) : (
                           <iframe 
                             src={previewInvoice?.url} 
                             className="w-full h-[65vh] rounded shadow-lg border border-slate-800 bg-white" 
                             title="Visualização da NFe"
                           />
                         )}
                         <a 
                           href={previewInvoice?.url}
                           target="_blank"
                           download="documento-anexado"
                           className="bg-tech/20 text-tech hover:bg-tech/30 px-6 py-2.5 rounded-full font-bold uppercase tracking-wider text-xs transition-all flex items-center gap-2"
                         >
                           <Download className="w-4 h-4" /> Baixar ou Abrir em Nova Guia
                         </a>
                       </div>
                     </motion.div>
                   </motion.div>
                 )}
               </AnimatePresence>

               {/* Failure Registration Modal */}
               <AnimatePresence>
                 {showFailureModal && (
                   <motion.div 
                     initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                     className="absolute inset-0 z-[2000] glass flex items-center justify-center p-6"
                   >
                     <motion.div 
                       initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                       className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[40px] w-full max-w-md shadow-2xl flex flex-col"
                     >
                       <div className="flex justify-between items-center mb-5">
                         <div>
                           <h2 className="text-xl font-bold text-white uppercase tracking-wider">Registrar Falha</h2>
                           <p className="text-xs text-slate-400">Selecione o motivo da falha de entrega</p>
                         </div>
                         <button onClick={() => setShowFailureModal(false)} className="text-slate-500 hover:text-white transition-colors">
                           <XCircle className="w-6 h-6" />
                         </button>
                       </div>

                       <div className="grid grid-cols-1 gap-2.5 mb-6">
                         {[
                           'Destinatário Ausente',
                           'Estabelecimento Fechado',
                           'Recusado pelo Recebedor',
                           'Endereço Não Localizado',
                           'Problemas Operacionais'
                         ].map(reason => (
                           <button 
                             key={reason}
                             onClick={() => setFailureReason(reason)}
                             className={`px-4 py-3 rounded-xl border text-left text-xs font-bold transition-all ${
                               failureReason === reason 
                                 ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)]' 
                                 : 'border-slate-800 text-slate-400 hover:border-slate-700/80 hover:text-slate-200'
                             }`}
                           >
                             {reason}
                           </button>
                         ))}
                       </div>

                       <div className="mb-6 flex flex-col gap-2">
                         <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Observações Opcionais</label>
                         <textarea
                           value={failureNotes}
                           onChange={(e) => setFailureNotes(e.target.value)}
                           placeholder="Descreva detalhes ou observações sobre o problema de entrega..."
                           className="w-full h-16 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 outline-none focus:border-amber-550/45 transition-colors resize-none"
                         />
                       </div>

                       <div className="flex gap-3 mt-1 font-sans">
                         <button 
                           onClick={() => setShowFailureModal(false)}
                           className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-xs font-black text-white hover:text-slate-200 uppercase rounded-xl transition-all"
                         >
                           Cancelar
                         </button>
                         <button 
                           onClick={async () => {
                             const updatedSequence = [...routeResult.sequence];
                             updatedSequence[navIndex] = {
                               ...updatedSequence[navIndex],
                               status: 'failed',
                               failureReason: failureReason || 'Outro',
                               deliveryNotes: failureNotes
                             };
                             
                             setRouteResult((prev: any) => ({
                               ...prev,
                               sequence: updatedSequence
                             }));

                             if (navIndex < routeResult.sequence.length - 1) {
                               setNavIndex(navIndex + 1);
                             } else {
                               try {
                                 const latest = await db.routes.toCollection().last();
                                 if (latest?.id) {
                                   await db.routes.update(latest.id, {
                                     status: 'completed',
                                     sequence: updatedSequence,
                                     completedAt: new Date()
                                   });
                                 }
                               } catch (err) {
                                 console.error("Erro salvando falha final no Dexie:", err);
                               }
                               setNavIndex(0);
                               setCurrentScreen('dashboard');
                             }
                             setShowFailureModal(false);
                           }}
                           className="flex-1 bg-amber-500 text-slate-950 font-black py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all text-xs uppercase"
                         >
                           Registrar Falha
                         </button>
                       </div>
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
              <KpiDashboard activeRoute={routeResult} />
            </motion.div>
          )}

          {currentScreen === 'settings' && (
            <motion.div 
              key="settings" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar ${isMobile ? 'px-4 pt-20 pb-16' : 'p-12'}`}
            >
              <div className="max-w-2xl mx-auto w-full">
                <h1 className="text-4xl font-bold font-display mb-8">Preferências</h1>
                
                <div className="space-y-8">
                  {/* 🔮 APRESENTAÇÃO TÉCNICA E TUTORIAL GUIADO */}
                  <div className="bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-tech/35 p-6 sm:p-8 rounded-[32px] shadow-[0_0_30px_rgba(209,160,84,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-tech/10 blur-3xl rounded-full pointer-events-none" />
                    
                    <div className="flex items-start gap-4 mb-5">
                      <div className="p-3 bg-tech/10 rounded-2xl text-tech shrink-0 mt-1">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black tracking-widest text-tech uppercase">Recurso de Apresentação & TCC</span>
                        <h2 className="text-xl font-bold font-display text-white mt-0.5">Roteiro Demonstrativo e Histórias de Uso</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Apresente o aplicativo Voie Express com total autoridade e clareza.
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
                      className="w-full sm:w-auto bg-tech text-slate-950 font-black text-xs px-6 py-4 rounded-2xl uppercase tracking-wider hover:brightness-110 hover:shadow-[0_0_15px_rgba(209,160,84,0.3)] active:scale-95 transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Iniciar Roteiro & Tutorial Passo a Passo
                    </button>
                  </div>

                  <div className="glass p-8 rounded-[32px] border-tech/10">
                    <h3 className="text-xl font-bold mb-5 flex items-center gap-2 flex-wrap">
                      <HelpCircle className="w-5 h-5 text-tech shrink-0" />
                      <span>O que é o HARPIA?</span>
                    </h3>
                    <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      <p>
                        O <strong>HARPIA</strong> (Hórus Amazônico de Rotas e Planejamento com Inteligência Artificial) é um sistema inteligente de planejamento e otimização de rotas logísticas desenvolvido para simplificar o dia a dia de entregas e transportes. Pensado especialmente para empresas e pequenos empreendimentos, o aplicativo funciona como uma torre de controle digital, ajudando a traçar os caminhos mais eficientes nas cidades, economizando combustível e reduzindo o tempo de viagem com a ajuda de inteligência artificial de última geração.
                      </p>
                      <p>
                        Na prática, você só precisa informar os endereços das suas paradas. O HARPIA cruza essas informações de forma automática com dados de satélite, dados meteorológicos e as preferências selecionadas (como caminhos mais curtos, mais rápidos ou focados em segurança), reorganizando toda a sequência de entregas de maneira ideal. Além disso, o motor de inteligência artificial analisa as particularidades de cada trajeto e gera insights táticos diretos em linguagem simples para que qualquer motorista ou gestor tome as melhores decisões sem precisar de conhecimentos computacionais avançados.
                      </p>
                    </div>
                  </div>

                  <div className="glass p-8 rounded-[32px]">
                    <h3 className="text-xl font-bold mb-5 flex items-center flex-wrap">
                      <span>
                        Segurança dos Dados
                        <InfoTooltip text="Informações sobre a persistência dos dados e chaves do sistema." />
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Todas as chaves de API fornecidas estão integradas nativamente ao motor tático do HARPIA. 
                      Os dados de navegação e ocorrências são armazenados localmente e sincronizados de ponta-a-ponta para sua máxima privacidade e resiliência offline.
                    </p>
                  </div>
                </div>

                {/* Rodapé de Crédito / Projeto Integrador */}
                <div className="mt-12 pt-6 border-t border-white/5 text-center px-4">
                  <p className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    © 2026 HARPIA
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-normal leading-relaxed mt-1 max-w-lg mx-auto">
                    App produzido pela Turma 2025.3.289 de Aprendizagem Profissional de Qualificação em serviços e operações Logísticas
                  </p>
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
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[10000] bg-slate-950/95 border-2 border-tech hover:bg-slate-900 shadow-[0_0_25px_rgba(209,160,84,0.55)] text-white font-extrabold px-5 py-3.5 rounded-full flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-105 active:scale-95 group font-sans animate-pulse"
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
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[10000] md:w-[400px] bg-slate-950/98 backdrop-blur-md rounded-[28px] border-2 border-tech/40 shadow-[0_15px_50px_rgba(209,160,84,0.2)] p-5 flex flex-col gap-3.5 font-sans text-white transition-all max-h-[80vh] overflow-y-auto custom-scrollbar"
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
                Este assistente de pitch guiará você por um <strong>fluxo de uso do Voie Express</strong>. Cada tela será explicada para que você demonstre as competências logísticas e de monitoramento ativo para a banca.
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
                <p><strong>🧠 Análise de Rota (IA)</strong> O relatório detalhado ao final incorpora esses dados para calibrar o score de integridade da carga.</p>
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
                    const boxSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230f172a"/><rect x="150" y="100" width="300" height="200" rx="10" fill="%23854d0e"/><rect x="150" y="100" width="300" height="40" fill="%23a16207"/><line x1="300" y1="100" x2="300" y2="300" stroke="%23713f12" stroke-width="4"/><rect x="240" y="160" width="120" height="80" rx="4" fill="%23f1f5f9" opacity="0.9"/><rect x="260" y="180" width="80" height="8" rx="2" fill="%23020617"/><rect x="260" y="196" width="60" height="6" rx="2" fill="%23475569"/><rect x="260" y="210" width="40" height="6" rx="2" fill="%23475569"/><circle cx="340" cy="220" r="10" fill="%2322c55e"/><path d="M336 220 l3 3 l5 -5" stroke="white" stroke-width="2" fill="none"/><text x="300" y="340" fill="%2300D4AA" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">HARPIA - COMPROVANTE SEGURO</text></svg>`;
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
                      const boxSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230f172a"/><rect x="150" y="100" width="300" height="200" rx="10" fill="%23854d0e"/><rect x="150" y="100" width="300" height="40" fill="%23a16207"/><line x1="300" y1="100" x2="300" y2="300" stroke="%23713f12" stroke-width="4"/><rect x="240" y="160" width="120" height="80" rx="4" fill="%23f1f5f9" opacity="0.9"/><rect x="260" y="180" width="80" height="8" rx="2" fill="%23020617"/><rect x="260" y="196" width="60" height="6" rx="2" fill="%23475569"/><rect x="260" y="210" width="40" height="6" rx="2" fill="%23475569"/><circle cx="340" cy="220" r="10" fill="%2322c55e"/><path d="M336 220 l3 3 l5 -5" stroke="white" stroke-width="2" fill="none"/><text x="300" y="340" fill="%2300D4AA" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">HARPIA - COMPROVANTE SEGURO</text></svg>`;
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
