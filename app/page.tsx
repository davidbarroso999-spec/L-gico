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
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Check,
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
  RefreshCw,
  Brain,
  Printer,
  Code,
  Share2,
  Calendar,
  Anchor,
  Waves,
  Compass,
  Navigation,
  Layers,
  ShoppingBag,
  Store,
  Building2,
  PackageCheck
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import KpiDashboard from '@/components/Dashboard';
import { optimizeRoute, RouteStop, RouteOptions } from '@/lib/route-engine';
import { db } from '@/lib/db';
import { seedHistoryIfEmpty } from '@/lib/history-analyzer';
import { enhancedAutocomplete, preciseGeocode, reverseGeocode, getNearestReferencePoint } from '@/lib/geocode-engine';
import InfoTooltip from '@/components/InfoTooltip';
import RotatingEarth from '@/components/ui/wireframe-dotted-globe';
import TruckLoader from '@/components/TruckLoader';
import { HarpiaTextEffect } from '@/components/ui/text-effect';

// Pre-configured E-Commerce Pickup Hubs & Logistics Base Points (Temu, Shopee, Mercado Livre, Motoboys)
const ECOMMERCE_PICKUP_HUBS = [
  {
    id: 'shopee-zs',
    name: 'Hub Shopee - Zona Sul (Cachoeirinha)',
    platform: 'Shopee',
    address: 'Av. Castelo Branco, 1420 - Cachoeirinha, Manaus - AM',
    lat: -3.1250,
    lon: -60.0120,
    type: 'Hub de Coleta / Last-Mile',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  },
  {
    id: 'temu-centro',
    name: 'Hub Temu & Express Logistics - Centro',
    platform: 'Temu',
    address: 'Rua Marechal Deodoro, 310 - Centro, Manaus - AM',
    lat: -3.1380,
    lon: -60.0270,
    type: 'Ponto de Apoio & Triagem E-Commerce',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  {
    id: 'meli-distrito',
    name: 'CD Mercado Livre & Magalu - Distrito Industrial I',
    platform: 'Mercado Livre',
    address: 'Av. Ministro João Gonçalves de Souza, 500 - Distrito Industrial I, Manaus - AM',
    lat: -3.1180,
    lon: -59.9750,
    type: 'Centro de Distribuição Principal',
    badgeColor: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
  },
  {
    id: 'aliexpress-parque10',
    name: 'Hub AliExpress & Cainiao - Parque 10',
    platform: 'AliExpress',
    address: 'Av. Tfe, 880 - Parque 10 de Novembro, Manaus - AM',
    lat: -3.0850,
    lon: -60.0100,
    type: 'Ponto de Coleta e Consolidação',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/20'
  },
  {
    id: 'motoboy-p10',
    name: 'Ponto de Apoio Motoboys & Entregadores - Flores/P10',
    platform: 'Motoboys / Express',
    address: 'Av. Professor Nilton Lins, 3200 - Flores, Manaus - AM',
    lat: -3.0780,
    lon: -60.0150,
    type: 'Estação de Transbordo Motoboy/Bike',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
  {
    id: 'coleta-cnova',
    name: 'Ponto de Coleta Integrado Zona Norte (Cidade Nova)',
    platform: 'Multi-Plataforma (Temu/Shopee/Meli)',
    address: 'Av. Noel Nutels, 1050 - Cidade Nova, Manaus - AM',
    lat: -3.0320,
    lon: -59.9710,
    type: 'Hub Bairro Norte',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  }
];

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center">Carregando Mapa...</div>
});

import NFeSearch from '@/components/NFeSearch';
import { NFeData } from '@/lib/nfe.types';
import { generateDanfeHtml } from '@/lib/danfe-generator';

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
  const [stopTypes, setStopTypes] = useState<Record<number, 'delivery' | 'pickup'>>({});
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [sheetPosition, setSheetPosition] = useState<'peek' | 'expanded' | 'collapsed'>('peek');
  const [timeWindows, setTimeWindows] = useState<Record<number, { start?: string; end?: string }>>({});
  const [invoiceData, setInvoiceData] = useState<Record<number, { key?: string; pdfUrl?: string; isFetching?: boolean; isImage?: boolean; filename?: string; valor?: number; peso?: number; destinatario?: string; dataEmissao?: string; descricao?: string; fullData?: NFeData }>>({});
  const [previewInvoice, setPreviewInvoice] = useState<{
    url: string;
    isImage?: boolean;
    htmlContent?: string;
    filename?: string;
    chave?: string;
    fullData?: NFeData;
  } | null>(null);
  const [activeInvoiceTab, setActiveInvoiceTab] = useState<'danfe' | 'data'>('danfe');
  const [activeNFeSearchIdx, setActiveNFeSearchIdx] = useState<number | null>(null);
  
  const handleShowInvoice = useCallback((idx: number) => {
    const inv = invoiceData[idx];
    if (!inv) return;
    
    let htmlContent = "";
    if (inv.fullData) {
      htmlContent = generateDanfeHtml(inv.fullData);
    }
    
    setPreviewInvoice({
      url: inv.pdfUrl || "",
      isImage: inv.isImage,
      htmlContent: htmlContent || undefined,
      filename: inv.filename || `NFe_${inv.key || idx}`,
      chave: inv.key,
      fullData: inv.fullData
    });
  }, [invoiceData]);

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

  const handleNFeDataFetched = useCallback((idx: number, dados: NFeData) => {
    // 1. Update address
    const fullAddress = `${dados.destinatario.endereco}, ${dados.destinatario.cidade}, ${dados.destinatario.estado}`;
    setAddresses(prev => {
      const next = [...prev];
      next[idx] = fullAddress;
      return next;
    });

    // 2. Update invoice data
    setInvoiceData(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        key: dados.chaveAcesso,
        valor: dados.valor,
        peso: dados.peso,
        destinatario: dados.destinatario.nome,
        dataEmissao: dados.dataEmissao,
        descricao: dados.descricao,
        filename: `NFe_${dados.chaveAcesso.slice(-8)}.json`,
        fullData: dados
      }
    }));

    // 3. Clear active search panel
    setActiveNFeSearchIdx(null);
  }, []);

  // Roteiro de Apresentação / Intro Hero State
  const [showDemoAssistant, setShowDemoAssistant] = useState(false);
  const [showSlogan, setShowSlogan] = useState(false);
  const [showPlanet, setShowPlanet] = useState(false);
  const [showAppContent, setShowAppContent] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoMinimized, setDemoMinimized] = useState(false);

  const triggerImmediateReveal = () => {
    setShowSlogan(true);
    setShowPlanet(true);
    setShowAppContent(true);
  };

  const [options, setOptions] = useState<RouteOptions>({
    priority: 'balanced',
    vehicle: 'van',
    vesselType: 'express_lancha',
    avoidDirt: true,
    avoidFloods: true,
    avoidHills: false,
    engine: 'google'
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

  // Future Routing & Scheduling States
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledName, setScheduledName] = useState('');
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);
  const [copiedRouteId, setCopiedRouteId] = useState<number | null>(null);

  const loadSavedRoutes = useCallback(async () => {
    try {
      const allRoutes = await db.routes.toArray();
      allRoutes.sort((a: any, b: any) => {
        const aTime = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const bTime = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        if (aTime !== bTime) {
          return bTime - aTime;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setSavedRoutes(allRoutes);
    } catch (err) {
      console.error("Erro ao carregar rotas salvas:", err);
    }
  }, []);

  const handleSaveFutureRoute = async () => {
    const validAddresses = addresses.filter(a => a.trim().length > 3);
    if (validAddresses.length < 2) {
      setApiWarning("Aviso: Adicione pelo menos 2 endereços válidos para salvar uma rota.");
      return;
    }

    try {
      const name = scheduledName.trim() || `Rota para ${scheduledDate || 'o Futuro'}`;
      await db.routes.add({
        date: new Date(),
        addresses: validAddresses,
        sequence: validAddresses.map((addr, idx) => ({
          address: addr,
          lat: resolvedCoords[addr]?.lat || 0,
          lng: resolvedCoords[addr]?.lon || 0,
          stopIndex: idx,
        })),
        score: 100,
        status: 'pending',
        name: name,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        isFutureRoute: true
      });

      setApiWarning(`Sucesso: Rota "${name}" salva com sucesso!`);
      setScheduledName('');
      setScheduledDate('');
      setScheduledTime('');
      loadSavedRoutes();
    } catch (err) {
      console.error("Erro ao agendar rota:", err);
      setApiWarning("Erro: Não foi possível salvar a rota no banco de dados.");
    }
  };

  const handleLoadSavedRoute = (route: any) => {
    if (route.addresses && route.addresses.length > 0) {
      setAddresses(route.addresses);
      if (route.sequence) {
        const newCoords: Record<string, { lat: number, lon: number }> = {};
        route.sequence.forEach((stop: any) => {
          const lat = stop.lat || 0;
          const lon = stop.lng || stop.lon || 0;
          if (lat && lon && stop.address) {
            newCoords[stop.address] = { lat, lon };
          }
        });
        setResolvedCoords(prev => ({ ...prev, ...newCoords }));
      }
      setApiWarning(`Rota "${route.name || 'Sem nome'}" carregada no planejador.`);
    }
  };

  const handleDeleteSavedRoute = async (id: number) => {
    try {
      await db.routes.delete(id);
      setApiWarning("Rota excluída com sucesso.");
      loadSavedRoutes();
    } catch (err) {
      console.error("Erro ao excluir rota:", err);
      setApiWarning("Erro ao excluir rota.");
    }
  };

  const handleShareRoute = (route: any) => {
    try {
      const shareData = {
        name: route.name || "Rota Compartilhada",
        addresses: route.addresses,
        options: options,
        aiCustomPrompt: aiCustomPrompt || ""
      };
      
      const jsonStr = JSON.stringify(shareData);
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      const binaryStr = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
      const base64 = btoa(binaryStr);
      const origin = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'))
        ? window.location.origin
        : 'https://useharpia.vercel.app';
      const shareUrl = `${origin}${window.location.pathname}?share=${encodeURIComponent(base64)}`;
      
      navigator.clipboard.writeText(shareUrl);
      setCopiedRouteId(route.id || 99999);
      setApiWarning(`Link de compartilhamento copiado! Envie para quem quiser.`);
      setTimeout(() => setCopiedRouteId(null), 3000);
    } catch (err) {
      console.error("Erro ao compartilhar rota:", err);
      setApiWarning("Erro ao gerar link de compartilhamento.");
    }
  };

  const [routeResult, setRouteResult] = useState<any>(null);

  const recordToOperationalMemory = async (stopIndex: number, isSuccess: boolean, reason?: string) => {
    if (!routeResult || !routeResult.sequence || !routeResult.sequence[stopIndex]) return;
    
    try {
      const stop = routeResult.sequence[stopIndex];
      const lat = stop.lat || 0;
      const lon = stop.lng || stop.lon || 0;
      const addressStr = stop.address || 'Desconhecido';
      
      let neighborhood = 'Desconhecido';
      const parts = addressStr.split(',');
      if (parts.length >= 2) {
        neighborhood = parts[1].trim();
      }

      const predictedTime = 15 + Math.random() * 20; // fallback mock
      const actualTime = isSuccess ? predictedTime * (0.8 + Math.random() * 0.4) : predictedTime * (1.2 + Math.random() * 0.8);
      
      const memoryData = {
        date: new Date(),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        driverId: 'DRV-Atual',
        vehicleId: 'VHC-Principal',
        vehicleType: 'van' as any,
        weightKg: Math.random() * 50 + 10,
        volumeM3: Math.random() * 0.5 + 0.1,
        distributionCenter: routeResult.sequence[0]?.address || 'CD Principal',
        clientName: `Cliente ${stopIndex}`,
        lat: lat,
        lon: lon,
        fullAddress: addressStr,
        neighborhood: neighborhood,
        city: 'Manaus',
        state: 'AM',
        predictedTimeMs: predictedTime * 60 * 1000,
        actualTimeMs: actualTime * 60 * 1000,
        predictedDistanceKm: predictedTime / 3,
        actualDistanceKm: (predictedTime / 3) * (isSuccess ? 0.9 : 1.1),
        idleTimeMs: Math.random() * 5 * 60 * 1000,
        averageSpeedKmH: 25 + Math.random() * 15,
        estimatedFuelConsumptionLiters: Math.random() * 2 + 0.5,
        attempts: 1,
        success: isSuccess,
        failureReason: reason,
        connectionStatus: (navigator.onLine ? 'online' : 'offline') as 'online' | 'offline',
        synced: false,
        syncTimestamp: new Date()
      };
      
      await db.operationalMemory.add(memoryData);
    } catch (err) {
      console.error("Erro ao gravar na MOI", err);
    }
  };

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

  // Pickup Hubs & Location Mismatch States
  const [locationMismatchDismissed, setLocationMismatchDismissed] = useState<string | null>(null);
  const [showPickupHubModal, setShowPickupHubModal] = useState<boolean>(false);
  const [customHubSearch, setCustomHubSearch] = useState<string>('');
  const [isLocatingGps, setIsLocatingGps] = useState<boolean>(false);
  const [nearbyRefPoints, setNearbyRefPoints] = useState<Array<{
    name: string;
    type: string;
    distanceMeters: number;
    address: string;
    fullLabel: string;
    lat: number;
    lon: number;
  }>>([]);

  const handleUseCurrentGpsAsOrigin = async () => {
    setIsLocatingGps(true);

    const processCoords = async (lat: number, lon: number) => {
      try {
        const refResult = await getNearestReferencePoint(lat, lon);
        const addressLabel = refResult.fullLabel;

        if (refResult.nearbyRecommendations && refResult.nearbyRecommendations.length > 0) {
          setNearbyRefPoints(refResult.nearbyRecommendations);
        }

        setAddresses(prev => {
          const next = [...prev];
          next[0] = addressLabel;
          return next;
        });

        setResolvedCoords(prev => ({
          ...prev,
          [addressLabel]: { lat, lon }
        }));

        setUserLocation({ lat, lon });
        setLocationMismatchDismissed(addressLabel);
        setApiWarning(`GPS Tempo Real: Partida atribuída ao ponto de referência "${refResult.landmarkName}" (${refResult.streetAddress})`);
      } catch (err) {
        console.error("GPS Reverse Geocode Error:", err);
        setApiWarning("Erro ao estimar o ponto de referência do GPS.");
      } finally {
        setIsLocatingGps(false);
      }
    };

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          processCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn("High accuracy GPS request failed/timeout, fallback to current userLocation:", err);
          if (userLocation) {
            processCoords(userLocation.lat, userLocation.lon);
          } else {
            alert("Localização GPS em tempo real não foi detectada. Verifique se o GPS está ativado e permitido no seu navegador.");
            setIsLocatingGps(false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 }
      );
    } else if (userLocation) {
      processCoords(userLocation.lat, userLocation.lon);
    } else {
      alert("Seu navegador não possui suporte a geolocalização.");
      setIsLocatingGps(false);
    }
  };

  // Auto pre-fill departure address with GPS reference point if departure is empty
  useEffect(() => {
    if (!userLocation) return;
    if (addresses[0] && addresses[0].trim().length > 0) return;

    let isMounted = true;
    getNearestReferencePoint(userLocation.lat, userLocation.lon).then(refResult => {
      if (isMounted) {
        if (refResult.nearbyRecommendations && refResult.nearbyRecommendations.length > 0) {
          setNearbyRefPoints(refResult.nearbyRecommendations);
        }
        setAddresses(prev => {
          if (prev[0] && prev[0].trim().length > 0) return prev;
          const next = [...prev];
          next[0] = refResult.fullLabel;
          return next;
        });
        setResolvedCoords(prev => ({
          ...prev,
          [refResult.fullLabel]: { lat: userLocation.lat, lon: userLocation.lon }
        }));
        setLocationMismatchDismissed(refResult.fullLabel);
      }
    }).catch(e => console.warn("Auto GPS prefill error:", e));

    return () => { isMounted = false; };
  }, [userLocation, addresses]);

  // Continuous High-Precision Geolocation Watcher
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        console.warn("Geolocation watch error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Auto-geocode departure address to compute GPS mismatch in real-time
  useEffect(() => {
    const originAddr = addresses[0];
    if (!originAddr || originAddr.trim().length < 4 || resolvedCoords[originAddr]) return;

    const timer = setTimeout(async () => {
      try {
        const res = await enhancedAutocomplete(originAddr, userLocation?.lat, userLocation?.lon);
        if (res && res.length > 0 && res[0].lat !== 0) {
          setResolvedCoords(prev => ({
            ...prev,
            [originAddr]: { lat: res[0].lat, lon: res[0].lon }
          }));
        }
      } catch (e) {
        console.warn("Auto-geocode departure failed:", e);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [addresses, userLocation, resolvedCoords]);

  const getDistanceBetweenUserAndOrigin = () => {
    if (!userLocation || !addresses[0] || addresses[0].trim().length < 3) return null;
    const resolved = resolvedCoords[addresses[0]];
    if (!resolved || (resolved.lat === 0 && resolved.lon === 0)) return null;

    const R = 6371000;
    const dLat = (resolved.lat - userLocation.lat) * Math.PI / 180;
    const dLon = (resolved.lon - userLocation.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(resolved.lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const meters = R * c;

    if (meters < 350) return null; // Under 350 meters is considered close enough
    const kmStr = meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
    return { meters, kmStr, resolved };
  };

  const locationMismatch = getDistanceBetweenUserAndOrigin();
  const isMismatchActive = locationMismatch && locationMismatchDismissed !== addresses[0];

  const handleSelectPickupHub = (hub: typeof ECOMMERCE_PICKUP_HUBS[0], asOrigin: boolean) => {
    const hubLabel = `${hub.name} (${hub.platform})`;
    setResolvedCoords(prev => ({
      ...prev,
      [hubLabel]: { lat: hub.lat, lon: hub.lon },
      [hub.address]: { lat: hub.lat, lon: hub.lon }
    }));

    if (asOrigin) {
      const updated = [...addresses];
      updated[0] = hubLabel;
      if (updated.length === 1) updated.push('');
      setAddresses(updated);
      setLocationMismatchDismissed(hubLabel);
    } else {
      const updated = [...addresses];
      if (updated.length > 1) {
        updated.splice(1, 0, hubLabel);
      } else {
        updated.push(hubLabel);
      }
      setAddresses(updated);
    }
    setShowPickupHubModal(false);
  };


  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      try {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          (err) => console.warn("Geolocation non-critical fallback:", err.message || err),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      } catch (e) {
        console.warn("Geolocation access restricted:", e);
      }
    }
  }, []);

  useEffect(() => {
    seedHistoryIfEmpty();
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
    }, 180);

    return () => clearTimeout(timer);
  }, [currentActiveText, activeSuggestionIdx, userLocation]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.autocomplete-container') && !target.closest('input[data-autocomplete]')) {
        setShowSuggestions(false);
        setSuggestions([]);
        setActiveSuggestionIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      const next: Record<number, { key?: string; pdfUrl?: string; isFetching?: boolean; isImage?: boolean; filename?: string; valor?: number; peso?: number; destinatario?: string; dataEmissao?: string; descricao?: string }> = {};
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
    const validWithInvoices: Record<number, { key?: string; pdfUrl?: string; isImage?: boolean; valor?: number; peso?: number; destinatario?: string; dataEmissao?: string; descricao?: string; fullData?: any }> = {};
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
            isImage: inv.isImage,
            valor: inv.valor,
            peso: inv.peso,
            destinatario: inv.destinatario,
            dataEmissao: inv.dataEmissao,
            descricao: inv.descricao,
            fullData: inv.fullData
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

      setNavIndex(0);
      setCurrentScreen('navigation');
    } catch (error: any) {
      console.error("Optimization failed:", error);
      const errMsg = error?.message || String(error);
      const errStack = error?.stack ? ` | Detalhe Técnico: ${error.stack.split('\\n')[1]}` : "";
      setApiWarning(`Falha na rota: ${errMsg}${errStack}`);
      setCurrentScreen('home');
    }
  };

  // Load saved routes and check for share link on mount
  useEffect(() => {
    Promise.resolve().then(() => {
      loadSavedRoutes();
    });
  }, [loadSavedRoutes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const shareParam = urlParams.get('share');
      if (shareParam) {
        // Clear param from URL address bar silently
        try {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } catch (e) {}

        Promise.resolve().then(() => {
          try {
            const decodedBinary = atob(decodeURIComponent(shareParam));
            const utf8Bytes = new Uint8Array(decodedBinary.length);
            for (let i = 0; i < decodedBinary.length; i++) {
              utf8Bytes[i] = decodedBinary.charCodeAt(i);
            }
            const jsonStr = new TextDecoder().decode(utf8Bytes);
            const data = JSON.parse(jsonStr);

            if (data && data.addresses && Array.isArray(data.addresses)) {
              setAddresses(data.addresses);
              if (data.options) {
                setOptions(prev => ({ ...prev, ...data.options }));
              }
              if (data.aiCustomPrompt) {
                setAiCustomPrompt(data.aiCustomPrompt);
              }
              
              setApiWarning(`Sucesso: Rota compartilhada "${data.name || 'Sem nome'}" carregada! Iniciando otimização...`);
              
              // Automatically optimize after state updates
              setTimeout(() => {
                runOptimization(data.addresses);
              }, 1200);
            }
          } catch (err) {
            console.error("Erro ao decodificar link de rota compartilhada:", err);
            setApiWarning("Erro: O link de rota compartilhada está corrompido ou é inválido.");
          }
        });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!showSuggestions || activeSuggestionIdx !== idx || suggestions.length === 0) return null;
    
    // Safety deduplication by normalized label
    const uniqueSuggestions: any[] = [];
    const seen = new Set<string>();
    for (const item of suggestions) {
      const key = (item.label || item.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueSuggestions.push(item);
      }
    }

    return (
      <div 
        className="autocomplete-container absolute left-0 right-0 z-[5000] mt-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.7)] overflow-hidden max-h-[300px] flex flex-col w-full"
      >
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {uniqueSuggestions.length > 0 ? (
            uniqueSuggestions.map((s, sIdx) => (
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
                      (document.activeElement as HTMLElement)?.blur();
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
                          const nextInput = document.querySelectorAll('input[data-autocomplete]')[idx + 1] as HTMLElement;
                          nextInput?.focus({ preventScroll: true });
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
                    <p className="text-xs font-bold text-slate-100 group-hover:text-tech transition-colors truncate" title={s.label}>
                      {s.label}
                    </p>
                    {s.name && s.name !== s.label && (
                      <p className="text-[9px] text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-1 mt-0.5 flex items-center gap-1.5">
                        <span className="text-tech font-mono bg-tech/10 border border-tech/20 px-1 py-0.2 rounded text-[7.5px] uppercase tracking-wider shrink-0">
                          {s.type === 'poi' ? 'Ponto de Interesse' : 'Local'}
                        </span>
                        <span className="truncate">{s.name}</span>
                      </p>
                    )}
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

      {/* Real-time GPS vs Departure Address Mismatch Global Notification Banner */}
      <AnimatePresence>
        {isMismatchActive && locationMismatch && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9000] w-[92%] max-w-lg bg-slate-950/95 backdrop-blur-2xl border-2 border-amber-500/70 text-white rounded-2xl p-4 shadow-[0_15px_50px_rgba(245,158,11,0.4)] flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0 mt-0.5">
                  <Navigation className="w-5 h-5 animate-bounce text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    ⚠️ Ponto de Partida Diferente do seu GPS (~{locationMismatch.kmStr})
                  </h4>
                  <p className="text-[11px] text-amber-100/90 mt-1 leading-snug">
                    Você inseriu &quot;{addresses[0]}&quot;, mas seu GPS indica que você está em outro local. Deseja usar sua localização em tempo real ou integrar um Ponto de Coleta (Shopee / Temu / Motoboy)?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocationMismatchDismissed(addresses[0])}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg transition-colors cursor-pointer"
                title="Ignorar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-amber-500/30">
              <button
                type="button"
                onClick={handleUseCurrentGpsAsOrigin}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Navigation className="w-3.5 h-3.5 fill-current" />
                Usar GPS Atual em Tempo Real
              </button>

              <button
                type="button"
                onClick={() => setShowPickupHubModal(true)}
                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                Ponto de Coleta (Hub)
              </button>

              <button
                type="button"
                onClick={() => setLocationMismatchDismissed(addresses[0])}
                className="px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-700 text-slate-300 font-medium text-xs transition-all cursor-pointer"
              >
                Manter Partida Digitada
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Floating Menu Ball Navigation System - Unified for Desktop & Mobile */}
      <AnimatePresence>
        {showAppContent && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed top-6 left-6 z-[5000] flex flex-col items-start"
          >
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
                      { id: 'navigation', label: 'Rota Ativa', icon: NavIcon, desc: 'Navegação GPS em Tempo Real' }
                    ] : []),
                    { id: 'coleta', label: 'Pontos de Coleta', icon: ShoppingBag, desc: 'Hubs Temu, Shopee, Meli, Motoboy' },
                    { id: 'dashboard', label: 'Métricas', icon: LayoutDashboard, desc: 'Desempenho e Logística' },
                    { id: 'settings', label: 'Configurações', icon: Settings, desc: 'Ajustes Finos do Sistema' },
                    { id: 'tutorial', label: 'Tutorial Guiado', icon: Sparkles, desc: 'Aprenda todas as funções' },
                  ].map((tab) => {
                    const isActive = tab.id === 'tutorial' ? showDemoAssistant && !demoMinimized : currentScreen === tab.id;
                    const Icon = tab.icon;

                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => {
                          if (tab.id === 'coleta') {
                            setShowPickupHubModal(true);
                            setIsMenuBallOpen(false);
                          } else if (tab.id === 'tutorial') {
                            setShowDemoAssistant(true);
                            setDemoStep(0);
                            setDemoMinimized(false);
                            setIsMenuBallOpen(false);
                            setCurrentScreen('home');
                          } else {
                            setCurrentScreen(tab.id as any);
                            setIsMenuBallOpen(false);
                          }
                        }}
                        variants={{
                          collapsed: { x: -30, opacity: 0, scale: 0.95 },
                          expanded: { x: 0, opacity: 1, scale: 1 }
                        }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
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
          </motion.div>
        )}
      </AnimatePresence>

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
              {/* Hero Logo Animation Section */}
              <motion.div 
                layout="position"
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full flex-shrink-0 flex flex-col items-center justify-center relative overflow-visible ${!showAppContent ? 'min-h-[82vh] sm:min-h-[88vh] my-auto' : 'min-h-[340px] md:min-h-[480px] mb-4 sm:mb-8 md:mb-12'}`}
              >
                <AnimatePresence>
                  {showPlanet && (
                    <motion.div 
                      className="absolute inset-0 flex items-center justify-center -z-10 opacity-60 mix-blend-screen pointer-events-none"
                      initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                      animate={{ opacity: 0.6, scale: 1, rotate: 0 }}
                      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <RotatingEarth width={600} height={600} className="w-full max-w-[450px] md:max-w-[600px] absolute" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <h1 
                  className="font-bold font-display text-center flex flex-col items-center justify-center leading-none relative z-10 w-full px-1.5 sm:px-4 py-4 sm:py-8 cursor-pointer" 
                  onClick={triggerImmediateReveal}
                >
                  <div className="flex flex-col items-center w-full max-w-full px-1 sm:px-2">
                    <div className="relative w-[90vw] max-w-[400px] sm:max-w-[500px] md:max-w-[650px] lg:max-w-[800px] xl:max-w-[950px] mx-auto aspect-square @container">
                      <HarpiaTextEffect 
                        speed={1.4} 
                        className="w-full h-auto text-white drop-shadow-[0_0_15px_rgba(209,160,84,0.4)] z-10" 
                        onAnimationComplete={() => {
                          // Step 1: Reveal Slogan & Globe while centered
                          setShowSlogan(true);
                          setShowPlanet(true);
                          // Step 2: Delay 1.5s (1500ms) before shifting layout & revealing menus/app options
                          setTimeout(() => {
                            setShowAppContent(true);
                          }, 1500);
                        }} 
                      />
                      
                      <AnimatePresence>
                        {showSlogan && (
                          <motion.div 
                            className="absolute z-20 text-center pointer-events-none"
                            style={{ 
                              left: '11.8%', 
                              width: '70%', 
                              top: '60%', // Exactly beneath the baseline of the HARPIA letters
                            }}
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
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

                {!showAppContent && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0.8, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onClick={triggerImmediateReveal}
                    className="mt-2 px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 hover:text-tech transition-colors cursor-pointer font-mono tracking-wider"
                  >
                    Clique aqui ou aguarde para ver as opções
                  </motion.button>
                )}
              </motion.div>

              {/* Functional App Options & Route Grid - Revealed after Logo Animation */}
              <AnimatePresence>
                {showAppContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mb-12"
                  >
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
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <label className="text-[10px] text-tech font-black uppercase tracking-widest px-1 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-tech animate-pulse" />
                            Ponto de Partida (Origem)
                          </label>
                          {invoiceData[0] && (invoiceData[0].key || invoiceData[0].pdfUrl) ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleShowInvoice(0)}
                                className="text-[10px] uppercase font-black tracking-wider text-tech hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-tech shrink-0" /> Exibir nota
                              </button>
                              <span className="text-slate-700 text-[10px]">|</span>
                              <button
                                type="button"
                                onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === 0 ? null : 0)}
                                className="text-[10px] uppercase font-black tracking-wider text-slate-400 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                Alterar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === 0 ? null : 0)}
                              className="text-[10px] uppercase font-black tracking-wider text-tech hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-tech shrink-0" /> Atribuir nota
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            ref={el => { inputRefs.current[0] = el; }}
                            data-autocomplete="true"
                            value={addresses[0] || ''}
                            onChange={(e) => {
                              updateAddress(0, e.target.value);
                              setActiveSuggestionIdx(0);
                              if (e.target.value.trim().length >= 2) {
                                setShowSuggestions(true);
                              } else {
                                setShowSuggestions(false);
                                setSuggestions([]);
                              }
                            }}
                            onFocus={() => {
                              setActiveSuggestionIdx(0);
                              if ((addresses[0] || '').trim().length >= 2) {
                                setShowSuggestions(true);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (showSuggestions && suggestions.length > 0) {
                                  const top = suggestions[0];
                                  const updated = [...addresses];
                                  updated[0] = top.label;
                                  setAddresses(updated);
                                }
                                setShowSuggestions(false);
                                setSuggestions([]);
                                setActiveSuggestionIdx(null);
                                (e.target as HTMLElement).blur();
                              } else if (e.key === 'Escape' || e.key === 'Tab') {
                                setShowSuggestions(false);
                                setSuggestions([]);
                                setActiveSuggestionIdx(null);
                              }
                            }}
                            onBlur={(e) => {
                              if (!e.relatedTarget || !(e.relatedTarget as HTMLElement).closest('.autocomplete-container')) {
                                setShowSuggestions(false);
                                setSuggestions([]);
                                setActiveSuggestionIdx(null);
                              }
                            }}
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

                        {/* Quick Action Toolbar for Departure Point */}
                        <div className="flex items-center gap-2 flex-wrap pt-1.5 pb-1">
                          <button
                            type="button"
                            onClick={handleUseCurrentGpsAsOrigin}
                            disabled={isLocatingGps}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-tech hover:border-tech/40 text-[10.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Definir ponto de partida com base no GPS em tempo real e ponto de referência mais próximo"
                          >
                            <Navigation className={`w-3 h-3 text-tech shrink-0 ${isLocatingGps ? 'animate-spin' : ''}`} />
                            {isLocatingGps ? 'Estimando Ponto de Referência...' : 'Usar GPS Tempo Real'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowPickupHubModal(true)}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-[10.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Integrar Hubs de Coleta Temu, Shopee, Mercado Livre, AliExpress ou Motoboys"
                          >
                            <ShoppingBag className="w-3 h-3 text-amber-400 shrink-0" />
                            Integrar Ponto de Coleta (E-Commerce / Motoboy)
                          </button>
                        </div>

                        {/* Recommended Reference Points Bar (Mercadinhos, Postos, Padarias, Hubs) */}
                        {nearbyRefPoints.length > 0 && (
                          <div className="mt-2.5 p-3 rounded-2xl bg-slate-900/90 border border-tech/30 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-tech tracking-wider flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-tech animate-pulse" />
                                Pontos de Referência Recomendados para Partida:
                              </span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase">Mais Próximos</span>
                            </div>

                            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
                              {nearbyRefPoints.map((refItem, rIdx) => {
                                const distStr = refItem.distanceMeters >= 1000 
                                  ? `${(refItem.distanceMeters / 1000).toFixed(1)} km` 
                                  : `${Math.round(refItem.distanceMeters)}m`;

                                return (
                                  <button
                                    key={rIdx}
                                    type="button"
                                    onClick={() => {
                                      setAddresses(prev => {
                                        const next = [...prev];
                                        next[0] = refItem.fullLabel;
                                        return next;
                                      });
                                      setResolvedCoords(prev => ({
                                        ...prev,
                                        [refItem.fullLabel]: { lat: refItem.lat, lon: refItem.lon }
                                      }));
                                      setLocationMismatchDismissed(refItem.fullLabel);
                                      setApiWarning(`Partida definida no Ponto de Referência: "${refItem.name}" (${refItem.type})`);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-tech/60 hover:bg-tech/10 text-slate-200 text-[10.5px] font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm"
                                  >
                                    <span className="text-amber-400">🏪</span>
                                    <div className="flex flex-col text-left">
                                      <span className="text-white font-bold leading-tight">{refItem.name}</span>
                                      <span className="text-[9px] text-slate-400 font-medium">{refItem.type} • a {distStr}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Location Mismatch Warning Banner */}
                        {isMismatchActive && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2.5 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 shadow-lg flex flex-col gap-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                                  <MapPin className="w-4 h-4 animate-bounce" />
                                </div>
                                <div>
                                  <h4 className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                                    Você não está neste ponto de partida (~{locationMismatch?.kmStr} do seu GPS)
                                  </h4>
                                  <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                                    Seu GPS atual indica que você está em outro endereço. Deseja definir sua localização real como partida ou integrar um Ponto de Coleta (Hub Temu/Shopee/Meli)?
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLocationMismatchDismissed(addresses[0])}
                                className="text-slate-500 hover:text-white text-xs font-bold px-1"
                                title="Ignorar aviso"
                              >
                                ✕
                              </button>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              <button
                                type="button"
                                onClick={handleUseCurrentGpsAsOrigin}
                                disabled={isLocatingGps}
                                className="px-3 py-1.5 rounded-xl bg-tech text-slate-950 font-black text-[10px] hover:bg-amber-300 transition-colors flex items-center gap-1 cursor-pointer shadow-md disabled:opacity-50"
                              >
                                <Navigation className={`w-3 h-3 ${isLocatingGps ? 'animate-spin' : ''}`} />
                                {isLocatingGps ? 'Estimando GPS...' : 'Usar GPS Real como Partida'}
                              </button>

                              <button
                                type="button"
                                onClick={() => setShowPickupHubModal(true)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <ShoppingBag className="w-3 h-3" />
                                Integrar Hub de Coleta
                              </button>

                              <button
                                type="button"
                                onClick={() => setLocationMismatchDismissed(addresses[0])}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 font-medium text-[10px] hover:text-white transition-colors cursor-pointer"
                              >
                                Manter Endereço Digitado
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {activeNFeSearchIdx === 0 && (
                          <div className="mt-3 animate-fadeIn">
                            <NFeSearch 
                              stopIndex={0} 
                              onDataFetched={(dados) => handleNFeDataFetched(0, dados)}
                              onCancel={() => setActiveNFeSearchIdx(null)}
                            />
                          </div>
                        )}
                        {invoiceData[0] && (invoiceData[0].key || invoiceData[0].pdfUrl) && (
                          <div className="flex flex-col gap-1.5 mt-2.5 bg-slate-900/30 border border-slate-800/40 p-3 rounded-xl">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <div className="flex items-center gap-1.5">
                                <FileCheck className="w-3.5 h-3.5 text-tech animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-tech tracking-wider">
                                  {invoiceData[0]?.valor ? 'NFe Vinculada via API' : 'DANFE Anexada'}
                                </span>
                              </div>
                              {invoiceData[0]?.valor !== undefined && (
                                <span className="text-[10px] font-bold text-emerald-400 font-mono">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoiceData[0]?.valor || 0)}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 font-medium">
                              {invoiceData[0]?.destinatario ? `Destinatário: ${invoiceData[0]?.destinatario}` : `Chave: ${invoiceData[0]?.key}`}
                            </div>
                            {invoiceData[0]?.peso !== undefined && (invoiceData[0]?.peso ?? 0) > 0 && (
                              <div className="text-[9.5px] text-slate-500 font-mono">
                                Peso: {invoiceData[0]?.peso} kg
                              </div>
                            )}
                          </div>
                        )}
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
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                  <div className="flex items-center gap-2">
                                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-widest px-1">
                                      Parada {idx + 1}
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStopTypes(prev => ({
                                          ...prev,
                                          [realIdx]: prev[realIdx] === 'pickup' ? 'delivery' : 'pickup'
                                        }));
                                      }}
                                      className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border ${
                                        stopTypes[realIdx] === 'pickup'
                                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                      }`}
                                      title="Alternar entre Ponto de Coleta e Destino de Entrega"
                                    >
                                      {stopTypes[realIdx] === 'pickup' ? (
                                        <>
                                          <ShoppingBag className="w-3 h-3 text-amber-400 shrink-0" />
                                          <span>Coleta (Não é entrega)</span>
                                        </>
                                      ) : (
                                        <>
                                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                                          <span>Entrega</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  {invoiceData[realIdx] && (invoiceData[realIdx].key || invoiceData[realIdx].pdfUrl) ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleShowInvoice(realIdx)}
                                        className="text-[9px] uppercase font-black tracking-wider text-tech hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-tech shrink-0" /> Exibir nota
                                      </button>
                                      <span className="text-slate-700 text-[9px]">|</span>
                                      <button
                                        type="button"
                                        onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === realIdx ? null : realIdx)}
                                        className="text-[9px] uppercase font-black tracking-wider text-slate-400 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        Alterar
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === realIdx ? null : realIdx)}
                                      className="text-[9px] uppercase font-black tracking-wider text-tech hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-tech shrink-0" /> Atribuir nota
                                    </button>
                                  )}
                                </div>
                                <div className="flex gap-2 relative">
                                  <div className="flex-1 min-w-0 relative">
                                    <input
                                      ref={el => { inputRefs.current[realIdx] = el; }}
                                      data-autocomplete="true"
                                      value={addr}
                                      onChange={(e) => {
                                        updateAddress(realIdx, e.target.value);
                                        setActiveSuggestionIdx(realIdx);
                                        if (e.target.value.trim().length >= 2) {
                                          setShowSuggestions(true);
                                        } else {
                                          setShowSuggestions(false);
                                          setSuggestions([]);
                                        }
                                      }}
                                      onFocus={() => {
                                        setActiveSuggestionIdx(realIdx);
                                        if ((addr || '').trim().length >= 2) {
                                          setShowSuggestions(true);
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (showSuggestions && suggestions.length > 0) {
                                            const top = suggestions[0];
                                            const updated = [...addresses];
                                            updated[realIdx] = top.label;
                                            setAddresses(updated);
                                          }
                                          setShowSuggestions(false);
                                          setSuggestions([]);
                                          setActiveSuggestionIdx(null);
                                          (e.target as HTMLElement).blur();
                                        } else if (e.key === 'Escape' || e.key === 'Tab') {
                                          setShowSuggestions(false);
                                          setSuggestions([]);
                                          setActiveSuggestionIdx(null);
                                        }
                                      }}
                                      onBlur={(e) => {
                                        if (!e.relatedTarget || !(e.relatedTarget as HTMLElement).closest('.autocomplete-container')) {
                                          setShowSuggestions(false);
                                          setSuggestions([]);
                                          setActiveSuggestionIdx(null);
                                        }
                                      }}
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
                                {activeNFeSearchIdx === realIdx && (
                                  <div className="mt-2.5 animate-fadeIn">
                                    <NFeSearch 
                                      stopIndex={realIdx} 
                                      onDataFetched={(dados) => handleNFeDataFetched(realIdx, dados)}
                                      onCancel={() => setActiveNFeSearchIdx(null)}
                                    />
                                  </div>
                                )}
                                {invoiceData[realIdx] && (invoiceData[realIdx].key || invoiceData[realIdx].pdfUrl) && (
                                  <div className="flex flex-col gap-1.5 mt-2 bg-slate-900/30 border border-slate-800/40 p-2.5 rounded-xl">
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <FileCheck className="w-3.5 h-3.5 text-tech animate-pulse" />
                                        <span className="text-[10px] font-black uppercase text-tech tracking-wider">
                                          {invoiceData[realIdx]?.valor ? 'NFe Vinculada via API' : 'DANFE Anexada'}
                                        </span>
                                      </div>
                                      {invoiceData[realIdx]?.valor !== undefined && (
                                        <span className="text-[10px] font-bold text-emerald-400 font-mono">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoiceData[realIdx]?.valor || 0)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[9.5px] text-slate-400 line-clamp-1 font-medium">
                                      {invoiceData[realIdx]?.destinatario ? `Destinatário: ${invoiceData[realIdx]?.destinatario}` : `Chave: ${invoiceData[realIdx]?.key}`}
                                    </div>
                                    {invoiceData[realIdx]?.peso !== undefined && (invoiceData[realIdx]?.peso ?? 0) > 0 && (
                                      <div className="text-[9px] text-slate-500 font-mono">
                                        Peso: {invoiceData[realIdx]?.peso} kg
                                      </div>
                                    )}
                                  </div>
                                )}
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
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <label className="text-[10px] text-alert font-black uppercase tracking-widest px-1 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-alert" />
                              Destino Final
                            </label>
                             {invoiceData[addresses.length - 1] && (invoiceData[addresses.length - 1].key || invoiceData[addresses.length - 1].pdfUrl) ? (
                               <div className="flex items-center gap-2">
                                 <button
                                   type="button"
                                   onClick={() => handleShowInvoice(addresses.length - 1)}
                                   className="text-[9px] uppercase font-black tracking-wider text-tech hover:underline flex items-center gap-1 cursor-pointer"
                                 >
                                   <Eye className="w-3.5 h-3.5 text-tech shrink-0" /> Exibir nota
                                 </button>
                                 <span className="text-slate-700 text-[9px]">|</span>
                                 <button
                                   type="button"
                                   onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === addresses.length - 1 ? null : addresses.length - 1)}
                                   className="text-[9px] uppercase font-black tracking-wider text-slate-400 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                                 >
                                   Alterar
                                 </button>
                               </div>
                             ) : (
                               <button
                                 type="button"
                                 onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === addresses.length - 1 ? null : addresses.length - 1)}
                                 className="text-[9px] uppercase font-black tracking-wider text-tech hover:underline flex items-center gap-1 cursor-pointer"
                               >
                                 <FileText className="w-3.5 h-3.5 text-tech shrink-0" /> Atribuir nota
                               </button>
                             )}
                          </div>
                          <div className="relative">
                            <input
                              ref={el => { inputRefs.current[addresses.length - 1] = el; }}
                              data-autocomplete="true"
                              value={addresses[addresses.length - 1] || ''}
                              onChange={(e) => {
                                updateAddress(addresses.length - 1, e.target.value);
                                setActiveSuggestionIdx(addresses.length - 1);
                                if (e.target.value.trim().length >= 2) {
                                  setShowSuggestions(true);
                                } else {
                                  setShowSuggestions(false);
                                  setSuggestions([]);
                                }
                              }}
                              onFocus={() => {
                                const lastIdx = addresses.length - 1;
                                setActiveSuggestionIdx(lastIdx);
                                if ((addresses[lastIdx] || '').trim().length >= 2) {
                                  setShowSuggestions(true);
                                }
                              }}
                              onKeyDown={(e) => {
                                const lastIdx = addresses.length - 1;
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (showSuggestions && suggestions.length > 0) {
                                    const top = suggestions[0];
                                    const updated = [...addresses];
                                    updated[lastIdx] = top.label;
                                    setAddresses(updated);
                                  }
                                  setShowSuggestions(false);
                                  setSuggestions([]);
                                  setActiveSuggestionIdx(null);
                                  (e.target as HTMLElement).blur();
                                } else if (e.key === 'Escape' || e.key === 'Tab') {
                                  setShowSuggestions(false);
                                  setSuggestions([]);
                                  setActiveSuggestionIdx(null);
                                }
                              }}
                              onBlur={(e) => {
                                if (!e.relatedTarget || !(e.relatedTarget as HTMLElement).closest('.autocomplete-container')) {
                                  setShowSuggestions(false);
                                  setSuggestions([]);
                                  setActiveSuggestionIdx(null);
                                }
                              }}
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
                          {activeNFeSearchIdx === addresses.length - 1 && (
                            <div className="mt-2.5 animate-fadeIn">
                              <NFeSearch 
                                stopIndex={addresses.length - 1} 
                                onDataFetched={(dados) => handleNFeDataFetched(addresses.length - 1, dados)}
                                onCancel={() => setActiveNFeSearchIdx(null)}
                              />
                            </div>
                          )}
                          {invoiceData[addresses.length - 1] && (invoiceData[addresses.length - 1].key || invoiceData[addresses.length - 1].pdfUrl) && (
                            <div className="flex flex-col gap-1.5 mt-2.5 bg-slate-900/30 border border-slate-800/40 p-3 rounded-xl">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <div className="flex items-center gap-1.5">
                                  <FileCheck className="w-3.5 h-3.5 text-tech animate-pulse" />
                                  <span className="text-[10px] font-black uppercase text-tech tracking-wider">
                                    {invoiceData[addresses.length - 1]?.valor ? 'NFe Vinculada via API' : 'DANFE Anexada'}
                                  </span>
                                </div>
                                {invoiceData[addresses.length - 1]?.valor !== undefined && (
                                  <span className="text-[10px] font-bold text-emerald-400 font-mono">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoiceData[addresses.length - 1]?.valor || 0)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 line-clamp-1 font-medium">
                                {invoiceData[addresses.length - 1]?.destinatario ? `Destinatário: ${invoiceData[addresses.length - 1]?.destinatario}` : `Chave: ${invoiceData[addresses.length - 1]?.key}`}
                              </div>
                              {invoiceData[addresses.length - 1]?.peso !== undefined && (invoiceData[addresses.length - 1]?.peso ?? 0) > 0 && (
                                <div className="text-[9.5px] text-slate-500 font-mono">
                                  Peso: {invoiceData[addresses.length - 1]?.peso} kg
                                </div>
                              )}
                            </div>
                          )}
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

                    {/* Subpanel de Rota Fluvial & Embarcação quando 'boat' está ativo */}
                    {options.vehicle === 'boat' && (
                      <div className="mt-4 pt-4 border-t border-slate-800/60 animate-fadeIn space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                            <Anchor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            Tipo de Embarcação & Calado
                          </label>
                          <span className="text-[9px] font-bold text-slate-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                            Matriz Fluvial Amazônica
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'express_lancha', label: 'Lancha Express', desc: '48 km/h • Calado 0.8m', icon: Zap },
                            { id: 'voadeira', label: 'Voadeira Apoio', desc: '36 km/h • Calado 0.4m', icon: Navigation },
                            { id: 'regional_gaiola', label: 'Barco Gaiola', desc: '18 km/h • Calado 2.2m', icon: Compass },
                            { id: 'balsa_heavy', label: 'Balsa / Carga', desc: '14 km/h • Calado 3.5m', icon: Layers },
                          ].map(vessel => (
                            <button
                              key={vessel.id}
                              type="button"
                              onClick={() => setOptions({ ...options, vesselType: vessel.id as any })}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                (options.vesselType || 'express_lancha') === vessel.id
                                  ? 'bg-cyan-950/40 border-cyan-500/80 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                                  : 'bg-slate-950/60 border-slate-850 text-slate-400 hover:border-slate-750 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <vessel.icon className={`w-3.5 h-3.5 ${ (options.vesselType || 'express_lancha') === vessel.id ? 'text-cyan-400' : 'text-slate-500' }`} />
                                <span className="text-[10px] font-black uppercase tracking-tight">{vessel.label}</span>
                              </div>
                              <p className="text-[8.5px] text-slate-400 font-mono leading-none">{vessel.desc}</p>
                            </button>
                          ))}
                        </div>

                        <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-2xl text-[10.5px] text-slate-300 space-y-1 font-sans">
                          <p className="font-bold text-cyan-300 flex items-center gap-1.5 text-[11px]">
                            <Waves className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                            Diferencial de Hidrovia Ativo:
                          </p>
                          <p className="text-slate-400 text-[10px] leading-relaxed">
                            A rota calcula automaticamente a velocidade da correnteza a favor ou contra o fluxo do rio, profundidade dos canais (talvegue), risco de banzeiro por ventos e cota hidrológica da bacia.
                          </p>
                        </div>
                      </div>
                    )}
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

                  {/* Bento Box 5: Future Routing & Scheduling */}
                  <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-2.5 font-display flex items-center gap-2 flex-wrap">
                      <Calendar className="w-4 h-4 text-tech shrink-0" />
                      <span>
                        Agendar Rota para o Futuro
                        <InfoTooltip text="Programe e salve rotas para dias ou horários futuros no sistema. Você poderá recarregá-las a qualquer momento." />
                      </span>
                    </h3>
                    <p className="text-slate-400 text-xs mb-4 leading-relaxed font-sans">
                      Preencha os detalhes abaixo para salvar a lista de endereços atual para uso futuro.
                    </p>
                    
                    <div className="space-y-3 font-sans">
                      <div>
                        <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block mb-1">Nome da Rota</label>
                        <input
                          type="text"
                          value={scheduledName}
                          onChange={(e) => setScheduledName(e.target.value)}
                          placeholder="Ex: Rota Zona Sul - Manhã"
                          className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:border-[#D1A054] focus:ring-1 focus:ring-[#D1A054]/30 outline-none transition-all text-slate-100 placeholder-slate-700"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block mb-1">Data Agendada</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:border-[#D1A054] focus:ring-1 focus:ring-[#D1A054]/30 outline-none transition-all text-slate-100 placeholder-slate-700 [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block mb-1">Horário de Saída</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="w-full bg-slate-950/60 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:border-[#D1A054] focus:ring-1 focus:ring-[#D1A054]/30 outline-none transition-all text-slate-100 placeholder-slate-700 [color-scheme:dark]"
                          />
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleSaveFutureRoute}
                        disabled={addresses.filter(a => a.trim().length > 3).length < 2}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-tech/40 text-tech disabled:text-slate-600 disabled:border-slate-900 disabled:bg-slate-950/20 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Salvar e Agendar Rota
                      </button>
                    </div>
                  </div>

                  {/* Bento Box 6: Saved & Shared Routes List */}
                  <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#D1A054] mb-2.5 font-display flex items-center gap-2 flex-wrap">
                      <RouteIcon className="w-4 h-4 text-[#D1A054] shrink-0" />
                      <span>
                        Rotas Salvas e Agendadas
                        <InfoTooltip text="Todas as suas rotas salvas ou agendadas no sistema. Carregue-as no planejador com um clique ou compartilhe-as via link." />
                      </span>
                    </h3>
                    
                    {savedRoutes.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-850 rounded-2xl bg-slate-950/20 font-sans">
                        <RouteIcon className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-bold">Nenhuma rota programada</p>
                        <p className="text-[10px] text-slate-600 mt-0.5 max-w-[200px] mx-auto leading-relaxed">As rotas que você planejar e agendar aparecerão aqui.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar font-sans pr-1">
                        {savedRoutes.map((route: any) => {
                          const isCopied = copiedRouteId === route.id;
                          return (
                            <div 
                              key={route.id} 
                              className="p-3 rounded-xl bg-slate-950/40 border border-slate-900/80 hover:border-slate-800 transition-all space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-bold text-slate-150 truncate leading-tight" title={route.name || 'Rota Sem Nome'}>
                                    {route.name || 'Rota Sem Nome'}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    <span className="text-[9px] font-mono font-bold text-tech bg-tech/10 border border-tech/20 px-1 py-0.2 rounded leading-none shrink-0">
                                      {route.addresses.length} Paradas
                                    </span>
                                    {route.scheduledDate && (
                                      <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1 leading-none">
                                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                        {new Date(route.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                        {route.scheduledTime ? ` às ${route.scheduledTime}` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSavedRoute(route.id)}
                                  className="text-slate-600 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                                  title="Excluir Rota"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              
                              <div className="flex gap-2 pt-1 border-t border-slate-900/50">
                                <button
                                  type="button"
                                  onClick={() => handleLoadSavedRoute(route)}
                                  className="flex-1 py-1.5 bg-tech/10 border border-tech/20 hover:bg-tech/20 hover:border-tech/40 text-tech text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center cursor-pointer"
                                >
                                  Carregar
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => handleShareRoute(route)}
                                  className={`flex-1 py-1.5 border text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                                    isCopied 
                                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                                      : 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 text-indigo-400'
                                  }`}
                                >
                                  <Share2 className="w-3 h-3 shrink-0" />
                                  {isCopied ? 'Copiado!' : 'Compartilhar'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
              </motion.div>
            )}
          </AnimatePresence>
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
                <MapView stops={routeResult.sequence} geometry={routeResult.geometry} routeSegments={routeResult.segments} alternatives={routeResult.alternatives || []} onRouteRecalculated={setRouteResult} />
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
                    hybridAnalysis={routeResult.hybridAnalysis}
                    onNavigate={() => setCurrentScreen('navigation')}
                    isLoading={false}
                    onShowInvoice={handleShowInvoice}
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
                 <MapView stops={routeResult.sequence} geometry={routeResult.geometry} routeSegments={routeResult.segments} alternatives={routeResult.alternatives || []} isNavigationScreen={true} navIndex={navIndex} onRouteRecalculated={setRouteResult} />
                 
                 {/* Top-Left Retractable Drawer Toggle Button ("Menu Ioiô") */}
                 <button
                   type="button"
                   onClick={() => setIsNavDrawerOpen(!isNavDrawerOpen)}
                   className="absolute top-4 left-4 z-[1500] w-12 h-12 rounded-2xl bg-slate-950/95 border border-tech/40 text-tech hover:text-white hover:border-tech shadow-[0_8px_25px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer group"
                   title={isNavDrawerOpen ? "Recolher Menu de Navegação" : "Abrir Menu de Navegação"}
                 >
                   {isNavDrawerOpen ? (
                     <ChevronLeft className="w-6 h-6 text-tech transition-transform group-hover:-translate-x-0.5" />
                   ) : (
                     <ChevronRight className="w-6 h-6 text-tech transition-transform group-hover:translate-x-0.5 animate-pulse" />
                   )}
                 </button>

                 {/* Retractable Navigation Drawer */}
                 <AnimatePresence>
                   {isNavDrawerOpen && (
                     <motion.div
                       initial={{ x: '-100%', opacity: 0 }}
                       animate={{ x: 0, opacity: 1 }}
                       exit={{ x: '-100%', opacity: 0 }}
                       transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                       className="absolute top-0 left-0 bottom-0 z-[1400] w-80 md:w-96 bg-slate-950/95 backdrop-blur-2xl border-r border-tech/30 p-6 flex flex-col shadow-[10px_0_40px_rgba(0,0,0,0.8)] text-white"
                     >
                       <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                         <div className="flex items-center gap-2.5">
                           <Navigation className="w-5 h-5 text-tech animate-pulse" />
                           <h3 className="font-display font-black text-base text-white uppercase tracking-wider">Painel da Rota</h3>
                         </div>
                         <button 
                           onClick={() => setIsNavDrawerOpen(false)}
                           className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all cursor-pointer"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>

                       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                         <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                           <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Progresso do Roteiro</span>
                           <p className="text-sm font-black text-white mt-1">Parada {navIndex + 1} de {routeResult.sequence.length}</p>
                           <p className="text-xs text-slate-400 mt-0.5">{routeResult.sequence[navIndex]?.address}</p>
                         </div>

                         <div className="space-y-2">
                           <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest px-1 block">Próximas Paradas</span>
                           {routeResult.sequence.map((stop: any, idx: number) => (
                             <div 
                               key={idx}
                               className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                                 idx === navIndex 
                                   ? 'bg-tech/15 border-tech/40 text-white font-bold' 
                                   : idx < navIndex 
                                   ? 'bg-slate-900/30 border-slate-800 text-slate-500 line-through' 
                                   : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                               }`}
                             >
                               <div className="flex items-center gap-2.5 min-w-0">
                                 <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                   idx === navIndex ? 'bg-tech text-slate-950' : 'bg-slate-800 text-slate-400'
                                 }`}>
                                   {idx + 1}
                                 </span>
                                 <span className="truncate">{stop.name || stop.address?.split(',')[0]}</span>
                               </div>
                               {idx < navIndex && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                             </div>
                           ))}
                         </div>
                       </div>

                       <div className="pt-4 border-t border-white/10 mt-auto space-y-2">
                         <button
                           onClick={() => {
                             setIsNavDrawerOpen(false);
                             setCurrentScreen('result');
                           }}
                           className="w-full py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                         >
                           <ChevronLeft className="w-4 h-4 text-tech" />
                           <span>Voltar ao Planejador</span>
                         </button>
                       </div>
                     </motion.div>
                   )}
                 </AnimatePresence>
                 
                 {/* Alerta de Clima em tempo real */}
                 <AnimatePresence>
                   {routeResult.sequence[navIndex]?.amazonasHydrology && (
                     <motion.div 
                       initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                       className="absolute top-20 right-4 z-[1000] bg-slate-950/90 backdrop-blur-md p-3.5 rounded-2xl border border-cyan-500/40 shadow-[0_10px_30px_rgba(6,182,212,0.2)] max-w-[280px] font-sans text-white space-y-2"
                     >
                       <div className="flex items-center justify-between border-b border-cyan-900/40 pb-1.5">
                         <div className="flex items-center gap-1.5 text-cyan-400 font-extrabold text-[10px] uppercase tracking-wider">
                           <Anchor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                           <span>Monitor Fluvial Amazônico</span>
                         </div>
                         <span className="text-[9px] bg-cyan-950 text-cyan-300 font-bold px-1.5 py-0.5 rounded-md border border-cyan-800/40">
                           {routeResult.sequence[navIndex].amazonasHydrology.season === 'cheia' ? 'Cheia Plena' : 'Vazante'}
                         </span>
                       </div>

                       <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
                         <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                           <span className="text-slate-400 text-[8px] uppercase block">Cota Hidrológica</span>
                           <span className="font-mono font-bold text-cyan-300">{routeResult.sequence[navIndex].amazonasHydrology.riverLevelMeters || 26.2} m</span>
                         </div>
                         <div className="bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
                           <span className="text-slate-400 text-[8px] uppercase block">Correnteza</span>
                           <span className="font-mono font-bold text-cyan-300">{routeResult.sequence[navIndex].amazonasHydrology.currentSpeedKnots || 3.8} nós</span>
                         </div>
                       </div>

                       <div className="text-[9.5px] text-slate-300 leading-tight bg-cyan-950/30 p-2 rounded-xl border border-cyan-900/30">
                         <span className="font-bold text-cyan-300 block mb-0.5">Previsão 24h & Talvegue:</span>
                         <p className="text-[9px] text-slate-300">{routeResult.sequence[navIndex].amazonasHydrology.forecast24h}</p>
                       </div>
                     </motion.div>
                   )}

                   {routeResult.sequence[navIndex].weather?.main?.temp > 38 && (
                     <motion.div 
                       initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
                       className="absolute top-48 right-4 z-[1000] glass p-3 rounded-2xl border-amber-500/30 flex items-center gap-2.5 max-w-[260px]"
                     >
                       <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                       <div>
                         <p className="text-[10px] font-bold text-amber-400 uppercase">Calor Extremo ({Math.round(routeResult.sequence[navIndex].weather?.main?.temp)}°C)</p>
                         <p className="text-[9px] text-slate-400">Monitore pressão pneumática e hidratação da equipe.</p>
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
                                // Finalize stop or entire route in IndexedDB with safety photo proof
                                const latest = await db.routes.toCollection().last();
                                if (latest?.id) {
                                  const updatedSequence = [...routeResult.sequence];
                                  updatedSequence[navIndex] = {
                                    ...updatedSequence[navIndex],
                                    status: 'completed',
                                    deliveryNotes: deliveryNotes || 'Entrega efetuada com sucesso',
                                    deliveryPhoto: deliveryPhoto
                                  };
                                  
                                  const isLastStop = navIndex === routeResult.sequence.length - 1;
                                  
                                  await db.routes.update(latest.id, { 
                                    status: isLastStop ? 'completed' : 'pending',
                                    sequence: updatedSequence,
                                    deliveryPhoto: deliveryPhoto,
                                    deliveryNotes: deliveryNotes || 'Entrega efetuada com sucesso',
                                    completedAt: isLastStop ? new Date() : undefined
                                  });
                                  
                                  setRouteResult((prev: any) => ({
                                    ...prev,
                                    sequence: updatedSequence
                                  }));
                                  
                                  if (navIndex > 0) {
                                    await recordToOperationalMemory(navIndex, true, deliveryNotes);
                                  }

                                  // Close webcam and return or proceed
                                  stopWebcam();
                                  setShowDeliveryModal(false);

                                  if (isLastStop) {
                                    setNavIndex(0);
                                    setCurrentScreen('dashboard');
                                  } else {
                                    setNavIndex(navIndex + 1);
                                  }
                                }
                              } catch (err) {
                                console.error("Erro salvando foto no Dexie:", err);
                              }
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

                 <div className={`absolute bottom-0 left-0 right-0 z-[1000] bg-slate-950/98 backdrop-blur-2xl border-t border-tech/30 text-white rounded-t-[32px] shadow-[0_-15px_50px_rgba(0,0,0,0.8)] md:max-w-2xl md:mx-auto transition-all duration-300 ease-in-out flex flex-col ${
                   sheetPosition === 'collapsed' 
                     ? 'h-[76px] overflow-hidden' 
                     : sheetPosition === 'expanded' 
                     ? 'h-[80vh] overflow-y-auto custom-scrollbar' 
                     : 'max-h-[380px] overflow-y-auto custom-scrollbar'
                 }`}>
                    {/* Drag Handle Bar with 3-state Cycle */}
                    <div 
                      onClick={() => {
                        setSheetPosition(prev => prev === 'collapsed' ? 'peek' : prev === 'peek' ? 'expanded' : 'collapsed');
                      }}
                      className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-pointer group hover:bg-white/5 transition-colors rounded-t-[32px] select-none shrink-0"
                    >
                      <div className="w-12 h-1.5 bg-slate-700 group-hover:bg-tech rounded-full transition-colors mb-1" />
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-tech">
                        {sheetPosition === 'collapsed' && (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 text-tech" />
                            <span>Expandir Painel (A caminho de...)</span>
                          </>
                        )}
                        {sheetPosition === 'peek' && (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 text-tech" />
                            <span>Toque p/ Expandir Tudo | Clique p/ Minimizar</span>
                            <ChevronDown className="w-3.5 h-3.5 text-tech" />
                          </>
                        )}
                        {sheetPosition === 'expanded' && (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 text-tech" />
                            <span>Recolher Painel</span>
                          </>
                        )}
                      </div>
                    </div>
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

                    <div className="px-6 pt-6 pb-9 flex flex-col md:flex-row md:items-center justify-between gap-5">
                      <div className="flex flex-col flex-1 min-w-0">
                        {/* Dynamic, Highly Legible ETA & Stats Block */}
                        <div className="flex items-baseline gap-2.5">
                          {/* Dynamic ETA based on actual segment duration */}
                          <p className="text-4xl font-extrabold tracking-tight text-emerald-400 drop-shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
                            {(() => {
                              const durationSec = routeResult?.segments?.[Math.max(navIndex - 1, 0)]?.duration || 900;
                              const etaDate = new Date();
                              etaDate.setSeconds(etaDate.getSeconds() + durationSec);
                              return etaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </p>
                          <div className="flex items-center gap-1.5 bg-slate-900 border border-white/5 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-tech animate-pulse" />
                            <p className="text-sm font-black text-white">
                              {Math.round((routeResult?.segments?.[Math.max(navIndex - 1, 0)]?.duration || 900) / 60)} min
                            </p>
                          </div>
                          <div className="text-xs font-bold text-slate-400">
                            • {((routeResult?.segments?.[Math.max(navIndex - 1, 0)]?.distance || 2500) / 1000).toFixed(1)} km
                          </div>
                        </div>

                        {/* Highly readable current leg target address */}
                        <div className="mt-2.5">
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-extrabold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            Destino Atual: Parada #{navIndex + 1} de {routeResult.sequence.length}
                          </span>
                          <p className="text-base font-black text-white leading-tight mt-0.5 truncate max-w-full">
                            {routeResult.sequence[navIndex]?.name || routeResult.sequence[navIndex]?.address?.split(',')[0]}
                          </p>
                        </div>

                        {/* NFe Quick Button */}
                        {routeResult.sequence[navIndex]?.invoice?.pdfUrl && (
                          <div className="mt-3.5">
                             <button 
                               onClick={() => {
                                 const inv = routeResult.sequence[navIndex]?.invoice;
                                 if (!inv) return;
                                 let htmlContent = "";
                                 if (inv.fullData) {
                                   htmlContent = generateDanfeHtml(inv.fullData);
                                 }
                                 setPreviewInvoice({
                                   url: inv.pdfUrl || "",
                                   isImage: inv.isImage,
                                   htmlContent: htmlContent || undefined,
                                   filename: `NFe_${inv.key || navIndex}`,
                                   chave: inv.key,
                                   fullData: inv.fullData
                                 });
                               }}
                               className="inline-flex items-center gap-2 px-3 py-1.5 bg-tech/15 border border-tech/30 hover:bg-tech/25 text-tech rounded-xl uppercase font-black text-[10px] tracking-widest transition-all shadow-md cursor-pointer"
                             >
                                <FileText className="w-4 h-4 shrink-0" />
                                NFe: {routeResult.sequence[navIndex]?.invoice?.key?.substring(0,8)}... Anexada
                             </button>
                          </div>
                        )}

                        {/* Compartilhar Rota Live Action */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <button 
                            onClick={() => {
                              const routeData = {
                                name: `Rota Otimizada (${routeResult.sequence.length} Paradas)`,
                                addresses: routeResult.sequence.map((stop: any) => stop.address),
                                options: options,
                                aiCustomPrompt: aiCustomPrompt
                              };
                              handleShareRoute(routeData);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-xl uppercase font-black text-[10px] tracking-widest transition-all shadow-md cursor-pointer"
                          >
                             <Share2 className="w-3.5 h-3.5 shrink-0" />
                             Compartilhar Rota Ativa
                          </button>
                        </div>
                      </div>

                      {/* Right Side Massive Tap-Target Action Buttons (Highly Accessible) */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Red "Ocorrência / Ausente" Button */}
                        <button 
                          onClick={() => {
                            setFailureReason('Destinatário Ausente');
                            setFailureNotes('');
                            setShowFailureModal(true);
                          }}
                          className="h-14 w-14 sm:h-16 sm:w-16 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-2xl flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(239,68,68,0.15)] shrink-0 group active:scale-95"
                          title="Destinatário Ausente / Falha na Entrega"
                        >
                          <XCircle className="w-7 h-7 transition-transform group-hover:scale-110" />
                        </button>

                        {/* Huge Primary Action Button (Começar / Cheguei / Finalizar) */}
                        <button 
                          onClick={async () => {
                            if (navIndex === 0) {
                              // Leaving warehouse/origin - start navigating immediately to first stop
                              setNavIndex(1);
                            } else {
                              // Any actual delivery stop requires POD (Proof of Delivery)
                              setShowDeliveryModal(true);
                              setDeliveryPhoto(null);
                              setDeliveryNotes('');
                              startWebcam();
                            }
                          }}
                          className={`px-8 h-14 sm:px-10 sm:h-16 rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer ${
                            navIndex === 0 
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_8px_30px_rgba(37,99,235,0.4)]' 
                              : (navIndex < routeResult.sequence.length - 1 
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.4)]' 
                                  : 'bg-tech hover:brightness-110 text-slate-950 shadow-[0_8px_30px_rgba(209,160,84,0.4)]')
                          }`}
                        >
                          {navIndex === 0 ? (
                            <>
                              <Play className="w-5 h-5 fill-current" />
                              Começar Rota
                            </>
                          ) : (navIndex < routeResult.sequence.length - 1 ? (
                            <>
                              <MapPin className="w-5 h-5 animate-bounce" />
                              Cheguei no Local
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              Concluir Entrega
                            </>
                          ))}
                        </button>
                      </div>
                    </div>
                 </div>
               </div>

               {/* Mock Exit Button */}
               <button 
                 onClick={() => {
                   setNavIndex(0);
                   setCurrentScreen('dashboard');
                 }}
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
                {/* Preview Invoice Modal relocated to root level */}

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

                             await recordToOperationalMemory(navIndex, false, failureReason || 'Outro');

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

      {/* Universal Preview Invoice Modal (APEX Design & High Accessibility) */}
      <AnimatePresence>
        {previewInvoice && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9990] flex items-center justify-center p-3 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-slate-900 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-tech/10 flex items-center justify-center border border-tech/20 shadow-inner">
                    <FileText className="w-5 h-5 text-tech" />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                      Detalhes do Documento Fiscal
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono tracking-wider truncate max-w-xs sm:max-w-md">
                      {previewInvoice?.chave ? `Chave: ${previewInvoice?.chave?.replace(/(.{4})/g, '$1 ')}` : 'Documento Carregado Localmente'}
                    </p>
                  </div>
                </div>
                
                {/* Top Navigation Tabs inside Modal */}
                {!previewInvoice?.isImage && previewInvoice?.htmlContent && (
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 self-start sm:self-center shrink-0">
                    <button
                      onClick={() => setActiveInvoiceTab('danfe')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeInvoiceTab === 'danfe' 
                          ? 'bg-tech text-slate-950 shadow-md font-black' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      DANFE Oficial
                    </button>
                    <button
                      onClick={() => setActiveInvoiceTab('data')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeInvoiceTab === 'data' 
                          ? 'bg-tech text-slate-950 shadow-md font-black' 
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Painel Digital
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => setPreviewInvoice(null)}
                  className="absolute sm:relative top-4 right-4 sm:top-auto sm:right-auto w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors border border-slate-700/40 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Main Body */}
              <div className="flex-1 bg-slate-950/90 overflow-y-auto p-4 sm:p-6 flex flex-col justify-between gap-5 min-h-[55vh]">
                {previewInvoice?.isImage ? (
                  <div className="flex-1 max-w-full flex items-center justify-center relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-900 p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={previewInvoice?.url} 
                      alt="Visualização do Documento" 
                      className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-2xl"
                    />
                  </div>
                ) : (
                  <>
                    {/* Tab Content: DANFE Clássico */}
                    {(!previewInvoice?.htmlContent || activeInvoiceTab === 'danfe') ? (
                      <div className="flex-1 w-full bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden relative shadow-inner">
                        {previewInvoice?.htmlContent ? (
                          <iframe 
                            id="danfe-preview-iframe"
                            srcDoc={previewInvoice.htmlContent}
                            className="w-full h-[58vh] bg-white border-0"
                            title="Visualização da NFe"
                          />
                        ) : (
                          <iframe 
                            id="danfe-preview-iframe"
                            src={previewInvoice?.url}
                            className="w-full h-[58vh] bg-white border-0"
                            title="Visualização da NFe"
                          />
                        )}
                      </div>
                    ) : (
                      /* Tab Content: Painel Digital Premium (APEX design) */
                      <div className="flex-1 w-full space-y-4 animate-fadeIn text-xs text-slate-200">
                        {/* Resumo de Valores e Natureza */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Valor Total do Documento</span>
                            <span className="text-3xl font-black text-tech tracking-tight leading-none mt-2">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(previewInvoice.fullData?.valor || 0)}
                            </span>
                          </div>
                          <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Peso Bruto Total</span>
                            <span className="text-2xl font-black text-white tracking-tight mt-2 flex items-baseline gap-1">
                              {previewInvoice.fullData?.peso || 0} <span className="text-xs text-slate-400 font-medium">kg</span>
                            </span>
                          </div>
                          <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex flex-col justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Status do Documento</span>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-sm font-black uppercase text-emerald-400 tracking-wider">
                                {previewInvoice.fullData?.statusNfe || 'Autorizada (SEFAZ)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Participantes (Emitente e Destinatário) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Emitente */}
                          <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-2xl space-y-3">
                            <h4 className="text-[10px] uppercase font-black text-tech tracking-widest border-b border-slate-800 pb-1.5">
                              Emitente / Remetente
                            </h4>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Razão Social</span>
                              <p className="text-xs font-black text-white">{previewInvoice.fullData?.emitente?.nome || 'Emitente'}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">CNPJ / CPF</span>
                              <p className="text-xs font-mono text-slate-300">{previewInvoice.fullData?.emitente?.cnpj || 'CNPJ não informado'}</p>
                            </div>
                          </div>

                          {/* Destinatário */}
                          <div className="bg-slate-900/50 border border-slate-900 p-4 rounded-2xl space-y-3">
                            <h4 className="text-[10px] uppercase font-black text-tech tracking-widest border-b border-slate-800 pb-1.5">
                              Destinatário / Cliente
                            </h4>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Razão Social</span>
                              <p className="text-xs font-black text-white">{previewInvoice.fullData?.destinatario?.nome || 'Destinatário'}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Endereço de Entrega</span>
                              <p className="text-xs text-slate-300 leading-normal">{previewInvoice.fullData?.destinatario?.endereco || 'Endereço não informado'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Informações de Carga / Descrição */}
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-2">
                            <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-800 pb-1.5">
                              Descrição das Mercadorias
                            </h4>
                            <p className="text-xs font-medium text-slate-300 italic bg-slate-950 p-3 rounded-xl border border-slate-900 leading-relaxed">
                              {previewInvoice.fullData?.descricao || 'Mercadorias Gerais'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Footer Actions Panel */}
                <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3.5 bg-slate-950/20 p-2 rounded-2xl">
                  {/* Left Meta Info */}
                  <div className="text-[10px] text-slate-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tech/50" />
                    Visualizador Multiplataforma Harpia v2.5
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    {/* Print Button (only for DANFE HTML view) */}
                    {!previewInvoice?.isImage && previewInvoice?.htmlContent && activeInvoiceTab === 'danfe' && (
                      <button
                        type="button"
                        onClick={() => {
                          const iframe = document.getElementById('danfe-preview-iframe') as HTMLIFrameElement;
                          if (iframe?.contentWindow) {
                            iframe.contentWindow.focus();
                            iframe.contentWindow.print();
                          }
                        }}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-750 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" /> Imprimir
                      </button>
                    )}

                    {/* XML Download Button */}
                    {!previewInvoice?.isImage && (
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            let xmlStr = "";
                            if (previewInvoice.fullData) {
                              const d = previewInvoice.fullData;
                              xmlStr = `<?xml version="1.0" encoding="UTF-8"?>\n<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">\n  <NFe>\n    <infNFe Id="NFe${d.chaveAcesso || '00000000000000000000000000000000000000000000'}" versao="4.00">\n      <ide>\n        <cUF>${(d.chaveAcesso || '00').substring(0, 2)}</cUF>\n        <dhEmi>${d.dataEmissao || ''}</dhEmi>\n      </ide>\n      <emit>\n        <CNPJ>${(d.emitente?.cnpj || '').replace(/\D/g, '')}</CNPJ>\n        <xNome>${d.emitente?.nome || ''}</xNome>\n      </emit>\n      <dest>\n        <CNPJ>${(d.destinatario?.cnpj || '').replace(/\D/g, '')}</CNPJ>\n        <xNome>${d.destinatario?.nome || ''}</xNome>\n        <enderDest>\n          <xLgr>${(d.destinatario?.endereco || '').split(',')[0]}</xLgr>\n          <xMun>${d.destinatario?.cidade || ''}</xMun>\n          <UF>${d.destinatario?.estado || ''}</UF>\n          <CEP>${(d.destinatario?.cep || '69000-000')}</CEP>\n        </enderDest>\n      </dest>\n      <det nItem="1">\n        <prod>\n          <xProd>${d.descricao || ''}</xProd>\n        </prod>\n      </det>\n      <total>\n        <ICMSTot>\n          <vNF>${d.valor || 0}</vNF>\n        </ICMSTot>\n      </total>\n      <transp>\n        <vol>\n          <pesoB>${d.peso || 0}</pesoB>\n        </vol>\n      </transp>\n    </infNFe>\n  </NFe>\n</nfeProc>`;
                            } else {
                              xmlStr = `<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00"><NFe><infNFe Id="NFe${previewInvoice.chave || '0'}" versao="4.00"></infNFe></NFe></nfeProc>`;
                            }
                            
                            const blob = new Blob([xmlStr], { type: 'application/xml' });
                            const blobUrl = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = blobUrl;
                            link.download = `NFe_${previewInvoice.chave || previewInvoice.filename || 'xml'}.xml`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(blobUrl);
                          } catch (err) {
                            console.error("Falha ao baixar XML:", err);
                          }
                        }}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-750 cursor-pointer"
                      >
                        <Code className="w-4 h-4 text-tech/80" /> Baixar XML
                      </button>
                    )}

                    {/* PDF/Image Download Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!previewInvoice.url) {
                          if (previewInvoice.htmlContent) {
                            const iframe = document.getElementById('danfe-preview-iframe') as HTMLIFrameElement;
                            if (iframe?.contentWindow) {
                              iframe.contentWindow.focus();
                              iframe.contentWindow.print();
                            } else {
                              const blob = new Blob([previewInvoice.htmlContent], { type: 'text/html' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `DANFE_${previewInvoice.chave || previewInvoice.filename || 'Nota'}.html`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }
                          }
                          return;
                        }
                        try {
                          if (previewInvoice.isImage) {
                            const link = document.createElement('a');
                            link.href = previewInvoice.url;
                            link.download = `${previewInvoice.filename || 'documento'}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            return;
                          }

                          const base64Data = previewInvoice.url.includes(',') ? previewInvoice.url.split(',')[1] : previewInvoice.url;
                          const binaryString = window.atob(base64Data);
                          const len = binaryString.length;
                          const bytes = new Uint8Array(len);
                          for (let i = 0; i < len; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                          }
                          const blob = new Blob([bytes], { type: 'application/pdf' });
                          const blobUrl = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          link.download = `DANFE_${previewInvoice.chave || previewInvoice.filename || 'Nota'}.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(blobUrl);
                        } catch (err) {
                          console.error("Falha ao decodificar e baixar PDF base64. Tentando download normal:", err);
                          const link = document.createElement('a');
                          link.href = previewInvoice.url;
                          link.download = `DANFE_${previewInvoice.chave || previewInvoice.filename || 'Nota'}.pdf`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-tech text-slate-950 hover:brightness-110 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(0,242,255,0.25)]"
                    >
                      <Download className="w-4 h-4 text-slate-950" /> Baixar PDF
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔮 ASSISTENTE INTERATIVO DE TUTORIAL GUIADO DO APP */}
      {showDemoAssistant && demoMinimized && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          onClick={() => setDemoMinimized(false)}
          className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[10000] bg-slate-950/95 border-2 border-tech hover:bg-slate-900 shadow-[0_0_25px_rgba(209,160,84,0.55)] text-white font-extrabold px-5 py-3.5 rounded-full flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:scale-105 active:scale-95 group font-sans animate-pulse"
          title="Retomar Tutorial"
        >
          <Sparkles className="w-4 h-4 text-tech group-hover:rotate-12 transition-transform" />
          <span className="text-xs tracking-wide text-white/95">Retomar Tutorial ({demoStep}/9)</span>
          <div className="bg-tech text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-mono">
            {demoStep}
          </div>
        </motion.button>
      )}

      {showDemoAssistant && !demoMinimized && (
        <motion.div
          id="panel-demo-assistant"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[10000] md:w-[420px] bg-slate-950/98 backdrop-blur-md rounded-[28px] border-2 border-tech/40 shadow-[0_15px_50px_rgba(209,160,84,0.25)] p-5 flex flex-col gap-3.5 font-sans text-white transition-all max-h-[85vh] overflow-y-auto custom-scrollbar"
        >
          <div className="flex justify-between items-start border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-tech animate-bounce shrink-0" />
              <div>
                <span className="text-[9px] font-black uppercase text-tech tracking-wider block">Tutorial do Aplicativo</span>
                <span className="text-xs text-slate-300 font-bold">Guia Interativo de Funcionalidades</span>
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
                title="Encerrar Tutorial"
              >
                <XCircle className="w-4 h-4 text-slate-350" />
              </button>
            </div>
          </div>

          {demoStep === 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>🎓</span> Bem-vindo ao Guia do HARPIA!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                O <strong>HARPIA (Voie Express)</strong> é a sua central de inteligência logística, roteamento autônomo, navegação GPS com voz e monitoramento climático.
              </p>
              <div className="bg-slate-900/80 p-3 rounded-2xl border border-tech/20 text-[11px] text-slate-200 space-y-1.5 font-sans">
                <p className="font-bold text-tech">💡 O que você vai aprender neste tour:</p>
                <ul className="space-y-1 text-slate-300 list-disc list-inside text-[10.5px]">
                  <li>Cadastro de rotas & Leitura de Notas Fiscais (NFe/DANFE)</li>
                  <li>Seleção de veículos, balança de peso & multas ANTT</li>
                  <li>Monitoramento de clima e nível dos rios (Cheias/Secas)</li>
                  <li>GPS por voz, desvio silencioso e modo 100% offline</li>
                  <li>Comprovante digital de entrega (POD) & Dashboard</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setDemoStep(1);
                  setCurrentScreen('home');
                }}
                className="w-full mt-1 bg-tech text-slate-950 font-black text-xs py-3 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans shadow-[0_0_15px_rgba(209,160,84,0.3)]"
              >
                Iniciar Passo a Passo →
              </button>
            </div>
          )}

          {demoStep === 1 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 1 de 9</span>
                <span className="text-tech">Planejamento</span>
              </div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📍</span> 1. Entrada de Endereços & Scanner de NFe/DANFE
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Na aba <strong>Planejamento</strong>, você pode montar suas rotas de 3 formas fáceis:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>🔍 Digitação Flexível:</strong> Escreva qualquer endereço com CEP, número ou ponto de referência (ex: <i>&quot;Rua Tefé 1000 Japiim&quot;</i>).</p>
                <p><strong>📄 Leitor de Nota Fiscal (NFe):</strong> Cole a chave de 44 dígitos ou envie o XML/PDF do DANFE no botão <strong>&quot;Consultar NFe&quot;</strong> para extrair os locais de entrega em 1 clique!</p>
                <p><strong>⏱️ Janelas de Horário:</strong> Defina horários específicos em que cada cliente atende (ex: <i>&quot;Recebe entre 08:00 e 11:00&quot;</i>).</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setDemoStep(0)}
                  className="px-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
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
                    setDemoStep(2);
                  }}
                  className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                >
                  Carregar Endereços & Avançar
                </button>
              </div>
            </div>
          )}

          {demoStep === 2 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 2 de 9</span>
                <span className="text-tech">Especificação da Carga</span>
              </div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🚚</span> 2. Veículos, Balança & Multas Fiscais (ANTT)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                O HARPIA inclui controle de frota e balança rodoviária integrada:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>🚛 Seleção de Frota:</strong> Alterne entre Moto, Van, VUC, Caminhão Baú ou Carreta.</p>
                <p><strong>⚖️ Balança de Peso por Eixo:</strong> Insira o peso total da carga (ex: 8.500 kg). O sistema valida a distribuição por eixo de acordo com o limite do CONTRAN/ANTT.</p>
                <p><strong>🚨 Alerta de Excesso de Peso:</strong> Caso o peso ultrapasse o limite legal, o app calcula imediatamente a estimativa da multa em R$ para evitar autuações nas balanças.</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setDemoStep(1)}
                  className="px-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
                    setOptions(prev => ({ ...prev, vehicle: 'truck' }));
                    setDemoStep(3);
                  }}
                  className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                >
                  Definir Caminhão & Avançar
                </button>
              </div>
            </div>
          )}

          {demoStep === 3 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 3 de 9</span>
                <span className="text-tech">Inteligência Ambiental</span>
              </div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🌊</span> 3. Clima, Nível dos Rios & Diretivas de IA
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Tecnologia preventiva para intempéries e peculiaridades regionais:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>🌧️ Monitoramento Hidrológico:</strong> Cruza dados do INMET e bacias hidrográficas (Cheias/Inundações de Dez a Jun e Estiagem/Seca de Jul a Nov) para evitar atoleiros ou balsas inoperantes.</p>
                <p><strong>🤖 Instruções Personalizadas de IA:</strong> Digite comandos em linguagem natural, como <i>&quot;Evitar vias alagadas na orla e priorizar entregas comerciais de manhã&quot;</i>.</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setDemoStep(2)}
                  className="px-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
                    setAiCustomPrompt('Evitar trechos com risco de alagamento próximo a igarapés e orla fluviométrica.');
                    setOptions(prev => ({ ...prev, priority: 'safety', avoidFloods: true }));
                    setDemoStep(4);
                  }}
                  className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                >
                  Aplicar Diretiva & Avançar
                </button>
              </div>
            </div>
          )}

          {demoStep === 4 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 4 de 9</span>
                <span className="text-tech">Roteamento Inteligente</span>
              </div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>⚡</span> 4. Otimização de Rota & Multi-Motores
              </h4>
              <p className="text-xs text-slate-350 leading-relaxed font-sans">
                O algoritmo analisa milhares de combinações para encontrar o melhor trajeto:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>🎯 Modos de Prioridade:</strong> Alterne entre <strong>Menor Distância</strong>, <strong>Menor Tempo</strong>, <strong>Equilibrado</strong> ou <strong>Segurança</strong>.</p>
                <p><strong>🗺️ Provedores de Mapa:</strong> Escolha entre Google Maps, Mapbox, OpenRouteService, OSRM e Photon para garantir máxima precisão.</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setDemoStep(3)}
                  className="px-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
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
                    setDemoStep(5);
                  }}
                  className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                >
                  ⚡ Otimizar Rota Agora
                </button>
              </div>
            </div>
          )}

          {demoStep === 5 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 5 de 9</span>
                <span className="text-tech">Análise do Traçado</span>
              </div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📈</span> 5. Diagnóstico de Custos, Combustível & Score
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                A rota otimizada exibe um relatório completo de eficiência:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>⛽ Custo & Combustível:</strong> Exibe a quilometragem total, consumo em litros de Diesel/Gasolina e projeção de custo financeiro.</p>
                <p><strong>⭐ Score de Segurança (0-100):</strong> Classificação baseada em vias pavimentadas, risco de retenção e atendimento de janelas de horário.</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => {
                    setDemoStep(4);
                    setCurrentScreen('home');
                  }}
                  className="px-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
                    setNavIndex(0);
                    setCurrentScreen('navigation');
                    setDemoStep(6);
                  }}
                  className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                >
                  Iniciar GPS de Navegação
                </button>
              </div>
            </div>
          )}

          {demoStep === 6 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 6 de 9</span>
                <span className="text-tech">Cockpit do Motorista</span>
              </div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🧭</span> 6. GPS por Voz, Giroscópio & Mapa Detalhado HD
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Interface de navegação completa para a cabine do veículo:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>📱 Giroscópio & Bússola do Veículo:</strong> O cursor aponta para a direção e o mapa gira dinamicamente conforme os sensores do celular ou veículo do usuário.</p>
                <p><strong>🛰️ Camadas de Alta Definição (Detalhe HD):</strong> Alternância em 1 clique entre Satélite Híbrido, Ruas & POIs, Relevo Topográfico e Detalhamento Urbano.</p>
                <p><strong>🔊 Voz & Desvio Silencioso:</strong> Instruções faladas em voz clara com recálculo automático em menos de 2s sem interromper o motorista.</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => {
                    setDemoStep(5);
                    setCurrentScreen('home');
                  }}
                  className="px-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
                >
                  Voltar
                </button>
                <button
                  onClick={() => setDemoStep(7)}
                  className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                >
                  Avançar para Modo Offline
                </button>
              </div>
            </div>
          )}

          {demoStep === 7 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 7 de 9</span>
                <span className="text-tech">Resiliência de Campo</span>
              </div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📲</span> 7. Operação Offline & Registro de Alertas
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Funcionamento ininterrupto mesmo sem sinal de celular:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>💾 Armazenamento Local (IndexedDB):</strong> Se o celular perder a internet em rodovias, todas as ações são gravadas localmente e sincronizadas quando houver conexão.</p>
                <p><strong>⚠️ Botão de Ocorrências:</strong> O motorista registra acidentes, vias alagadas ou quedas de barreiras em tempo real.</p>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={async () => {
                    try {
                      await db.occurrences.add({
                        type: 'flood',
                        description: 'Alagamento em via de acesso reportado via GPS',
                        lat: -3.134,
                        lon: -60.024,
                        timestamp: new Date(),
                        synced: false
                      });
                      setApiWarning("OCORRÊNCIA REGISTRADA: Alerta salvo localmente no celular!");
                    } catch(e){}
                  }}
                  className="w-full bg-slate-900/80 border border-alert/30 text-alert hover:bg-slate-900 font-extrabold text-[10px] py-2 rounded-lg text-center cursor-pointer transition-colors"
                >
                  ⚠️ Testar Reporte de Ocorrência (Sinistro)
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDemoStep(6)}
                    className="px-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => {
                      setNavIndex(4);
                      setDemoStep(8);
                    }}
                    className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                  >
                    Ir à Prova de Entrega
                  </button>
                </div>
              </div>
            </div>
          )}

          {demoStep === 8 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 8 de 9</span>
                <span className="text-tech">Comprovação Fiscal</span>
              </div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📸</span> 8. Comprovante Digital de Entrega (POD)
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Validação antifraude e auditoria de recebimento da carga:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1.5 font-sans">
                <p><strong>📷 Foto da Mercadoria:</strong> O motorista captura a foto do canhoto assinado ou da caixa entregue.</p>
                <p><strong>🔒 GPS & Data Criptografados:</strong> O carimbo com as coordenadas exatas e o horário de entrega é gravado para garantia jurídica contra extravios.</p>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={() => {
                    const boxSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230f172a"/><rect x="150" y="100" width="300" height="200" rx="10" fill="%23854d0e"/><rect x="150" y="100" width="300" height="40" fill="%23a16207"/><line x1="300" y1="100" x2="300" y2="300" stroke="%23713f12" stroke-width="4"/><rect x="240" y="160" width="120" height="80" rx="4" fill="%23f1f5f9" opacity="0.9"/><rect x="260" y="180" width="80" height="8" rx="2" fill="%23020617"/><rect x="260" y="196" width="60" height="6" rx="2" fill="%23475569"/><rect x="260" y="210" width="40" height="6" rx="2" fill="%23475569"/><circle cx="340" cy="220" r="10" fill="%2322c55e"/><path d="M336 220 l3 3 l5 -5" stroke="white" stroke-width="2" fill="none"/><text x="300" y="340" fill="%2300D4AA" font-family="monospace" font-size="12" text-anchor="middle" font-weight="bold">HARPIA - COMPROVANTE SEGURO</text></svg>`;
                    setDeliveryPhoto(boxSvg);
                    setDeliveryNotes("Mercadoria entregue em perfeito estado sob fiscalização.");
                    setShowDeliveryModal(true);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-tech font-extrabold text-[10px] py-2 rounded-lg text-center cursor-pointer transition-colors"
                >
                  📷 Abrir Câmera / Comprovante POD
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDemoStep(7)}
                    className="px-3 bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
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
                          deliveryNotes: 'Entrega concluída com comprovante digital seguro.',
                          completedAt: new Date()
                        });
                      } catch (err) {
                        console.warn(err);
                      }
                      stopWebcam();
                      setShowDeliveryModal(false);
                      setNavIndex(0);
                      setCurrentScreen('dashboard');
                      setDemoStep(9);
                    }}
                    className="flex-1 bg-tech text-slate-950 font-black text-[11px] py-2.5 rounded-xl uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer font-sans"
                  >
                    Concluir Entrega & Ir às Métricas
                  </button>
                </div>
              </div>
            </div>
          )}

          {demoStep === 9 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-extrabold font-mono">
                <span>Passo 9 de 9</span>
                <span className="text-tech">Gestão Central</span>
              </div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>📊</span> 9. Painel Gerencial, Exportação & Agendamento
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Parabéns! Você completou o tour de funcionalidades do HARPIA:
              </p>
              <div className="bg-slate-900 border border-white/5 p-2.5 rounded-xl text-[10px] text-slate-300 space-y-1 font-sans">
                <p><strong>📊 Métricas & CO2:</strong> Na aba <strong>Métricas</strong>, acompanhe o histórico de entregas, índice de pontualidade e emissão de CO2.</p>
                <p><strong>📅 Agendamento Futuro:</strong> Na aba Planejamento, programe e salve rotas para datas futuras.</p>
                <p><strong>🔗 Exportação Completa:</strong> Abra suas rotas no Waze, Google Maps, exporte em GPX/KML ou imprima o manifesto em PDF!</p>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => {
                    setShowDemoAssistant(false);
                    setDemoStep(0);
                  }}
                  className="w-full bg-tech text-slate-950 font-black text-xs py-3 rounded-xl uppercase tracking-wider hover:brightness-115 active:scale-95 transition-all text-center cursor-pointer font-sans shadow-[0_0_15px_rgba(209,160,84,0.3)]"
                >
                  🎉 Finalizar Tutorial & Usar o App
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Modal Integrar Ponto de Coleta (Temu, Shopee, Mercado Livre, Motoboys) */}
      <AnimatePresence>
        {showPickupHubModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowPickupHubModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white font-display flex items-center gap-2">
                      Integrar Ponto de Coleta / Hub Logistics
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Para motoboys, entregadores independentes e parceiros de e-commerce (Temu, Shopee, Mercado Livre, AliExpress, Correios).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPickupHubModal(false)}
                  className="text-slate-500 hover:text-white p-2 rounded-xl hover:bg-slate-800 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Filter / Search Bar */}
              <div className="my-4">
                <input
                  type="text"
                  value={customHubSearch}
                  onChange={(e) => setCustomHubSearch(e.target.value)}
                  placeholder="Pesquisar por Hub, Plataforma (Temu, Shopee, Meli), Bairro ou Endereço..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all font-sans"
                />
              </div>

              {/* Hubs Grid List */}
              <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3 pr-1">
                {ECOMMERCE_PICKUP_HUBS.filter(h => {
                  if (!customHubSearch) return true;
                  const query = customHubSearch.toLowerCase();
                  return h.name.toLowerCase().includes(query) || 
                         h.platform.toLowerCase().includes(query) || 
                         h.address.toLowerCase().includes(query);
                }).map(hub => (
                  <div 
                    key={hub.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${hub.badgeColor}`}>
                          {hub.platform}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {hub.type}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                        {hub.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {hub.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleSelectPickupHub(hub, true)}
                        className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3 h-3" />
                        Definir como Partida
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectPickupHub(hub, false)}
                        className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <PackageCheck className="w-3 h-3 text-tech" />
                        + Adicionar Coleta
                      </button>
                    </div>
                  </div>
                ))}

                {/* Option for custom address hub */}
                {customHubSearch.trim().length >= 3 && (
                  <div className="p-4 rounded-2xl bg-slate-950/40 border border-dashed border-slate-700 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-200">
                        Usar &quot;{customHubSearch}&quot; como Ponto de Coleta
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Insira este endereço personalizado para a entrega de volumes.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const customHub = {
                          id: `custom-${Date.now()}`,
                          name: `Ponto de Coleta: ${customHubSearch}`,
                          platform: 'Personalizado',
                          address: customHubSearch,
                          lat: -3.1311,
                          lon: -60.0242,
                          type: 'Coleta Personalizada',
                          badgeColor: 'bg-tech/10 text-tech border-tech/20'
                        };
                        handleSelectPickupHub(customHub, true);
                      }}
                      className="px-3 py-2 rounded-xl bg-tech text-slate-950 text-[10.5px] font-black hover:bg-amber-300 cursor-pointer"
                    >
                      Definir como Partida
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>💡 O roteador integrará este Ponto de Coleta no seu plano de entregas.</span>
                <button
                  type="button"
                  onClick={() => setShowPickupHubModal(false)}
                  className="text-slate-300 font-bold hover:underline cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
      `}</style>
    </div>
  );
}
