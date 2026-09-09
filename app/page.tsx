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
  ArrowRight,
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
  Ship,
  Waves,
  Compass,
  Navigation,
  Layers,
  ShoppingBag,
  Store,
  Building2,
  PackageCheck,
  Globe,
  Sliders,
  List,
  ArrowLeft
} from 'lucide-react';
import QuickStartVehicleProfile, { VehicleWorkProfile } from '@/components/QuickStartVehicleProfile';
import RouteDetailsModal from '@/components/RouteDetailsModal';
import ActiveStopBottomSheet from '@/components/ActiveStopBottomSheet';
import KpiDashboard from '@/components/Dashboard';
import { optimizeRoute, RouteStop, RouteOptions, getAutoDetectedAmazonSeason } from '@/lib/route-engine';
import { fetchLiveBulletin } from '@/lib/ai-engine';
import { checkHybridRoute } from '@/lib/hybrid-route';
import { db } from '@/lib/db';
import { seedHistoryIfEmpty } from '@/lib/history-analyzer';
import { enhancedAutocomplete, preciseGeocode, reverseGeocode, getNearestReferencePoint } from '@/lib/geocode-engine';
import InfoTooltip from '@/components/InfoTooltip';
import RotatingEarth from '@/components/ui/wireframe-dotted-globe';
import TruckLoader from '@/components/TruckLoader';
import { HarpiaTextEffect } from '@/components/ui/text-effect';
import RouteHistoryView from '@/components/RouteHistoryView';
import { getVehicleLabel, purgeAllSimulatedData, DEMO_ROUTE_TITLES, seedRealisticHistoryIfEmpty } from '@/lib/route-history-service';
import AccessibleTutorialGuide from '@/components/AccessibleTutorialGuide';
import { RouteIncident } from '@/lib/db';

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

export default function HarpiaApp() {
  const isMobile = useIsMobile();
  const [isBottomMenuExpanded, setIsBottomMenuExpanded] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'loading' | 'navigation' | 'dashboard' | 'history' | 'settings'>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavbarExpanded, setIsNavbarExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [addresses, setAddresses] = useState<string[]>(['']);
  const [stopIds, setStopIds] = useState<string[]>(() => [crypto.randomUUID()]);
  const [stopTypes, setStopTypes] = useState<Record<number, 'delivery' | 'pickup'>>({});
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);
  const [isDrawerMenuOptionsOpen, setIsDrawerMenuOptionsOpen] = useState(true);
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
  const [showSlogan, setShowSlogan] = useState(false);
  const [showPlanet, setShowPlanet] = useState(false);
  const [showAppContent, setShowAppContent] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(false);

  useEffect(() => {
    // Animation will play on every load for presentation purposes
  }, []);

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

  // Quick Start & Route Details Modal States (Adapted from layout screenshots)
  const [showQuickStartModal, setShowQuickStartModal] = useState<boolean>(false);
  const [showRouteDetailsModal, setShowRouteDetailsModal] = useState<boolean>(false);
  const [showDeliveryBanner, setShowDeliveryBanner] = useState<boolean>(true);
  const [vehicleProfile, setVehicleProfile] = useState<VehicleWorkProfile>('packages');
  const [routeStartTime, setRouteStartTime] = useState<string>('21:03');
  const [routeEndTime, setRouteEndTime] = useState<string>('');
  const [routeEndAddress, setRouteEndAddress] = useState<string>('');
  const [routeHasPause, setRouteHasPause] = useState<boolean>(false);
  const [routePauseMinutes, setRoutePauseMinutes] = useState<number>(30);
  const [presentationMode, setPresentationMode] = useState<boolean>(false);
  const [showAccessibleTutorial, setShowAccessibleTutorial] = useState<boolean>(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const loadSavedRoutes = useCallback(async () => {
    try {
      const allRoutes = await db.routes.toArray();
      // Filter out completed routes, simulated demo routes, and keep only genuine scheduled/saved routes
      const scheduledOnly = allRoutes.filter((r: any) => {
        if (r.isSimulated || r.isDemo) return false;
        if (DEMO_ROUTE_TITLES.some(dt => r.name?.includes(dt) || (r.notes && r.notes.includes(dt)))) return false;
        if (r.status === 'completed' || r.status === 'failed') return false;
        return r.isFutureRoute === true || r.status === 'scheduled' || r.status === 'saved' || (Boolean(r.scheduledDate) && r.status !== 'completed');
      });

      scheduledOnly.sort((a: any, b: any) => {
        const aTime = a.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
        const bTime = b.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
        if (aTime !== bTime) {
          return bTime - aTime;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setSavedRoutes(scheduledOnly);
    } catch (err) {
      console.error("Erro ao carregar rotas salvas:", err);
    }
  }, []);

  const handleClearAllScheduledRoutes = async () => {
    try {
      const allRoutes = await db.routes.toArray();
      const scheduledIds = allRoutes
        .filter((r: any) => r.isFutureRoute || r.status === 'scheduled' || r.status === 'saved' || Boolean(r.scheduledDate))
        .map((r: any) => r.id)
        .filter((id: any): id is number => typeof id === 'number');

      for (const id of scheduledIds) {
        await db.routes.delete(id);
      }
      await loadSavedRoutes();
      setNotificationToast("Todas as rotas agendadas foram removidas com sucesso.");
      setTimeout(() => setNotificationToast(null), 3000);
    } catch (err) {
      console.error("Erro ao limpar rotas agendadas:", err);
    }
  };

  const handleTogglePresentationMode = async () => {
    if (!presentationMode) {
      await seedRealisticHistoryIfEmpty(true);
      setAddresses([
        'CEASA, Manaus, AM',
        'Av. Eduardo Ribeiro, 520, Centro, Manaus, AM',
        'Av. Mário Ypiranga, 1300, Adrianópolis, Manaus, AM',
        'Av. Djalma Batista, 482, Flores, Manaus, AM'
      ]);
      setStopIds([crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]);
      await loadSavedRoutes();
      setPresentationMode(true);
      setNotificationToast("Modo Apresentação ATIVADO: Amostras de demonstração carregadas com sucesso!");
      setTimeout(() => setNotificationToast(null), 4000);
    } else {
      await purgeAllSimulatedData();
      setAddresses(['']);
      setStopIds([crypto.randomUUID()]);
      await loadSavedRoutes();
      setPresentationMode(false);
      setNotificationToast("Modo Apresentação DESATIVADO: Todos os dados simulados foram excluídos.");
      setTimeout(() => setNotificationToast(null), 4000);
    }
  };

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
      setStopIds(route.addresses.map(() => crypto.randomUUID()));
      if (route.vehicleType || route.originalParameters?.vehicleType) {
        setOptions(prev => ({
          ...prev,
          vehicle: route.vehicleType || route.originalParameters?.vehicleType
        }));
      }
      if (route.priority || route.originalParameters?.priority) {
        setOptions(prev => ({
          ...prev,
          priority: route.priority || route.originalParameters?.priority
        }));
      }
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
      setCurrentScreen('home');
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
  const [showHybridModal, setShowHybridModal] = useState(false);
  const [liveBulletinData, setLiveBulletinData] = useState<any>(null);
  const [isFetchingBulletin, setIsFetchingBulletin] = useState(false);
  const [showRerouteAnalysisModal, setShowRerouteAnalysisModal] = useState(false);
  const [rerouteAnalysisResult, setRerouteAnalysisResult] = useState<any>(null);
  const [isCheckingReroute, setIsCheckingReroute] = useState(false);

  // Background Polling & Fluvial Bulletin states
  const [fluvialBulletin, setFluvialBulletin] = useState<any>(null);
  const [isFetchingFluvialBulletin, setIsFetchingFluvialBulletin] = useState(false);
  const [activeIncidentToast, setActiveIncidentToast] = useState<any>(null);
  const [lastBgPollTime, setLastBgPollTime] = useState<string>('');

  // Route Execution Timer & Completion Summary states
  const [actualRouteStartTime, setActualRouteStartTime] = useState<number | null>(null);
  const [actualRouteEndTime, setActualRouteEndTime] = useState<number | null>(null);
  const [totalElapsedMs, setTotalElapsedMs] = useState<number | null>(null);
  const [showRouteCompletedModal, setShowRouteCompletedModal] = useState<boolean>(false);
  const [completedSummaryData, setCompletedSummaryData] = useState<any>(null);
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState<number>(0);

  const formatSecondsToClock = (secs: number) => {
    if (!secs || secs < 0) secs = 0;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${s}s`;
  };

  // Live Timer Effect for Navigation Screen
  useEffect(() => {
    let timer: any;
    if (currentScreen === 'navigation' && actualRouteStartTime) {
      const updateClock = () => {
        setLiveElapsedSeconds(Math.floor((Date.now() - actualRouteStartTime) / 1000));
      };
      updateClock();
      timer = setInterval(updateClock, 1000);
    }
    return () => clearInterval(timer);
  }, [currentScreen, actualRouteStartTime]);

  useEffect(() => {
    if (routeResult?.liveBulletin) {
      const bulletin = routeResult.liveBulletin;
      const timeout = setTimeout(() => {
        setLiveBulletinData(bulletin);
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [routeResult]);

  // Automatic live search check for Fluvial Modal when opened
  useEffect(() => {
    if (showHybridModal) {
      const timer = setTimeout(() => {
        setIsFetchingFluvialBulletin(true);
        const portLocations = ['Porto de Ceasa, Manaus, AM', 'Porto do Careiro, AM', 'Travessia Fluvial Rio Negro e Solimões'];
        fetchLiveBulletin(portLocations, 'FLUVIAL_CHECK')
          .then(res => setFluvialBulletin(res))
          .catch(err => console.warn('Fluvial bulletin fetch error:', err))
          .finally(() => setIsFetchingFluvialBulletin(false));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [showHybridModal]);

  // Background Incident Polling Service (runs every 45 seconds)
  useEffect(() => {
    const pollIntervalMs = 45000;
    const interval = setInterval(async () => {
      const validAddresses = routeResult?.sequence?.map((s: any) => s.address) || addresses.filter(a => a.trim().length > 3);
      if (validAddresses.length < 2) return;

      try {
        const isFluvial = options.vehicle === 'boat' || options.isHybrid;
        const taskName = isFluvial ? 'FLUVIAL_CHECK' : 'REROUTE_CHECK';
        const summary = currentScreen === 'navigation' 
          ? `Navegação ativa na parada ${navIndex + 1} de ${validAddresses.length}`
          : 'Planejamento de Rota Ativo';

        const pollResult = await fetchLiveBulletin(validAddresses, taskName, summary);
        setLastBgPollTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

        let cleanMsg = pollResult.bulletin || '';
        // Truncate to first sentence if multiple sentences were returned
        if (cleanMsg.includes('.')) {
          const firstSentence = cleanMsg.split('.')[0].trim();
          if (firstSentence.length > 8) cleanMsg = firstSentence + '.';
        }

        if (pollResult && pollResult.hasIncident) {
          setActiveIncidentToast({ ...pollResult, bulletin: cleanMsg });
        }
      } catch (err) {
        console.warn('Background incident polling error:', err);
      }
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [routeResult, addresses, options.vehicle, options.isHybrid, currentScreen, navIndex]);

  const handleRefreshLiveBulletin = async () => {
    setIsFetchingBulletin(true);
    try {
      const validAddresses = routeResult?.sequence?.map((s: any) => s.address) || addresses.filter(a => a.trim().length > 3);
      const res = await fetchLiveBulletin(validAddresses.length > 0 ? validAddresses : ['Manaus, AM', 'BR-319']);
      setLiveBulletinData(res);
    } catch (e) {
      console.error("Error refreshing live bulletin:", e);
    } finally {
      setIsFetchingBulletin(false);
    }
  };

  const handleRequestLiveRerouteCheck = async () => {
    setIsCheckingReroute(true);
    try {
      const validAddresses = routeResult?.sequence?.map((s: any) => s.address) || addresses.filter(a => a.trim().length > 3);
      const summaryText = `Navegação ativa. Parada atual: ${navIndex + 1} de ${validAddresses.length}. Localização aproximada: ${validAddresses[navIndex] || 'Manaus'}`;
      const analysis = await fetchLiveBulletin(validAddresses, 'REROUTE_CHECK', summaryText);
      setRerouteAnalysisResult(analysis);
      setShowRerouteAnalysisModal(true);
    } catch (err) {
      console.error("Reroute check error:", err);
    } finally {
      setIsCheckingReroute(false);
    }
  };
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

  // Location Mismatch States
  const [locationMismatchDismissed, setLocationMismatchDismissed] = useState<string | null>(null);
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

  // Continuous High-Precision Geolocation Watcher & Initial Instant Fix
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    // Trigger instant initial fix to auto-fill reference point immediately
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        console.warn("Geolocation initial fix error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 5000 }
    );

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




  useEffect(() => {
    if (apiWarning) {
      const t = setTimeout(() => setApiWarning(null), 3500);
      return () => clearTimeout(t);
    }
  }, [apiWarning]);

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
    // Scrub all legacy simulated routes on mount so the app starts 100% clean
    purgeAllSimulatedData().then(() => {
      loadSavedRoutes();
    });
    fetch('/api/diagnostic').then(r => r.json()).then(data => {
      setDiagnostic(data);
    }).catch(e => console.warn('Diagnostic fetch error:', e.message));
  }, [loadSavedRoutes]);

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

  const handleAddStop = useCallback((targetIndex?: number) => {
    setAddresses(prev => {
      const next = [...prev];
      const insertIdx = targetIndex !== undefined
        ? targetIndex
        : (next.length > 1 ? next.length - 1 : next.length);

      next.splice(insertIdx, 0, '');
      setStopIds(prevIds => {
        const nextIds = [...prevIds];
        nextIds.splice(insertIdx, 0, crypto.randomUUID());
        return nextIds;
      });

      // Shift stopTypes right for keys >= insertIdx
      setStopTypes(prevSt => {
        const nextSt: Record<number, 'delivery' | 'pickup'> = {};
        Object.keys(prevSt).forEach(keyStr => {
          const k = parseInt(keyStr, 10);
          if (k < insertIdx) {
            nextSt[k] = prevSt[k];
          } else {
            nextSt[k + 1] = prevSt[k];
          }
        });
        return nextSt;
      });

      // Shift invoiceData right for keys >= insertIdx
      setInvoiceData(prevInv => {
        const nextInv: Record<number, any> = {};
        Object.keys(prevInv).forEach(keyStr => {
          const k = parseInt(keyStr, 10);
          if (k < insertIdx) {
            nextInv[k] = prevInv[k];
          } else {
            nextInv[k + 1] = prevInv[k];
          }
        });
        return nextInv;
      });

      // Shift timeWindows right for keys >= insertIdx
      setTimeWindows(prevTw => {
        const nextTw: Record<number, any> = {};
        Object.keys(prevTw).forEach(keyStr => {
          const k = parseInt(keyStr, 10);
          if (k < insertIdx) {
            nextTw[k] = prevTw[k];
          } else {
            nextTw[k + 1] = prevTw[k];
          }
        });
        return nextTw;
      });

      setTimeout(() => {
        inputRefs.current[insertIdx]?.focus({ preventScroll: true });
      }, 100);

      return next;
    });
  }, []);

  const addAddress = handleAddStop;

  const updateAddress = useCallback((idx: number, val: string) => {
    setAddresses(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }, []);

  const removeAddress = useCallback((idx: number) => {
    setAddresses(prev => prev.filter((_, i) => i !== idx));
    setStopIds(prev => prev.filter((_, i) => i !== idx));

    // Shift stopTypes keys left
    setStopTypes(prev => {
      const next: Record<number, 'delivery' | 'pickup'> = {};
      Object.keys(prev).forEach(keyStr => {
        const k = parseInt(keyStr, 10);
        if (k < idx) {
          next[k] = prev[k];
        } else if (k > idx) {
          next[k - 1] = prev[k];
        }
      });
      return next;
    });

    // Shift timeWindows keys left
    setTimeWindows(prev => {
      const next: Record<number, { start?: string; end?: string }> = {};
      Object.keys(prev).forEach(keyStr => {
        const k = parseInt(keyStr, 10);
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
        const k = parseInt(keyStr, 10);
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
    const validStopTypes: Record<number, 'pickup' | 'delivery'> = {};
    let validCount = 0;
    const validAddresses = listToUse.filter((a, i) => {
      const isValid = a.trim().length > 3;
      if (isValid) {
        if (stopTypes[i]) {
          validStopTypes[validCount] = stopTypes[i];
        }
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

    // Check for Hybrid route
    
    if (checkHybridRoute(validAddresses) && !options.isHybrid) {
      setShowHybridModal(true);
      return;
    }


    setCurrentScreen('loading');
    setRouteResult(null); // Reset previous
    try {
      const autoTravelMonth = scheduledDate 
        ? (new Date(scheduledDate + 'T12:00:00').getMonth() + 1) 
        : (new Date().getMonth() + 1);

      const effectiveOptions: RouteOptions = {
        ...options,
        travelMonth: autoTravelMonth,
        customPrompt: aiCustomPrompt
      };

      const result = await optimizeRoute(validAddresses, effectiveOptions, resolvedCoords, validWithWindows, validWithInvoices, validStopTypes);
      setRouteResult(result);
      
      const startTime = new Date().getTime();
      setActualRouteStartTime(startTime);
      setActualRouteEndTime(null);
      setTotalElapsedMs(null);

      // Save rich historical route to IndexedDB (safe catch)
      try {
        const calcDistKm = result.summary?.distance ? Math.round((result.summary.distance / 1000) * 10) / 10 : 0;
        const calcDurMin = result.summary?.duration ? Math.round(result.summary.duration / 60) : 0;
        const selectedVehicle = options.vehicle || 'van';
        const selectedPriority = options.priority || 'balanced';

        const kml = selectedVehicle === 'moto' ? 40.0 : selectedVehicle === 'truck' ? 9.0 : selectedVehicle === 'boat' ? 3.5 : selectedVehicle === 'car' ? 12.5 : 10.0;
        const estFuelL = Math.round((calcDistKm / kml) * 10) / 10;
        const estFuelCost = Math.round(estFuelL * 6.15 * 100) / 100;

        const waypoints = (result.sequence || []).map((s: any, idx: number) => ({
          address: s.address || validAddresses[idx] || `Parada #${idx + 1}`,
          lat: s.lat || 0,
          lng: s.lng || s.lon || 0,
          stopIndex: idx,
          stopType: s.stopType || (idx === 0 ? 'pickup' : 'delivery'),
          status: 'pending' as const,
          plannedArrivalTime: s.plannedArrivalTime || `${8 + Math.floor(idx * 0.5)}:${idx % 2 === 0 ? '00' : '30'}`,
          serviceDurationMinutes: s.serviceDuration || 15,
          fluvialPort: s.fluvialPort
        }));

        await db.routes.add({
          date: new Date(),
          startedAt: new Date(startTime),
          name: `${getVehicleLabel(selectedVehicle)} • ${validAddresses.length} Paradas (${calcDistKm} km)`,
          addresses: validAddresses,
          sequence: waypoints,
          score: result.score || 95,
          finalScore: result.score || 95,
          status: 'pending',
          vehicleType: selectedVehicle as any,
          priority: selectedPriority as any,
          totalDistanceKm: calcDistKm,
          totalDurationMinutes: calcDurMin,
          originalParameters: {
            addresses: validAddresses,
            priority: selectedPriority as any,
            vehicleType: selectedVehicle as any,
            vehicleName: getVehicleLabel(selectedVehicle),
            timeWindows: validWithWindows,
            stopTypes: validStopTypes,
            customPrompt: aiCustomPrompt
          },
          calculatedRoute: {
            waypoints,
            distanceMeters: result.summary?.distance || Math.round(calcDistKm * 1000),
            distanceKm: calcDistKm,
            durationSeconds: result.summary?.duration || calcDurMin * 60,
            durationMinutes: calcDurMin,
            estimatedFuelLiters: estFuelL,
            estimatedFuelCost: estFuelCost,
            isFluvial: selectedVehicle === 'boat' || result.sequence.some((s: any) => s.fluvialPort)
          },
          executionMetrics: {
            startedAt: new Date(startTime),
            totalElapsedMs: 0,
            actualDurationMinutes: 0,
            actualDistanceKm: calcDistKm,
            completedStopsCount: 0,
            failedStopsCount: 0,
            totalStopsCount: validAddresses.length,
            completionRatePercent: 0,
            punctualityRatePercent: 100,
            fuelConsumedLiters: estFuelL,
            fuelCostTotal: estFuelCost
          },
          reportedIncidents: []
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
              setStopIds(data.addresses.map(() => crypto.randomUUID()));
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

  const getProviderBadge = (source?: string) => {
    switch (source) {
      case 'google':
        return <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">Google</span>;
      case 'mapbox':
        return <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">Mapbox</span>;
      case 'viacep':
        return <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">Correios / CEP</span>;
      case 'open-meteo':
        return <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">Open-Meteo</span>;
      case 'ors':
        return <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 shrink-0">ORS</span>;
      case 'nominatim':
      case 'photon':
        return <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/30 shrink-0">OSM</span>;
      case 'cache':
        return <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">Hub AM</span>;
      default:
        return null;
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
        className="autocomplete-container absolute left-0 right-0 z-[5000] mt-1.5 bg-slate-900 border-2 border-black dark:border-slate-700 rounded-xl shadow-[4px_4px_0px_#000] overflow-hidden max-h-[340px] flex flex-col w-full animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="px-3.5 py-2 bg-slate-950/80 border-b border-black dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
            <Search className="w-3 h-3 text-tech" />
            Sugestões Multi-API ({uniqueSuggestions.length})
          </span>
          <span className="text-[9px] font-mono text-slate-500">Google • Mapbox • CEP • Open-Meteo</span>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-slate-800/80">
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
                      setStopIds(prev => [...prev, crypto.randomUUID()]);
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
                className="w-full px-3.5 py-3 text-left hover:bg-slate-850 group transition-colors flex items-center justify-between"
              >
                <div className="flex-1 min-w-0 pr-3 flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {(() => {
                      const iconObj = getSuggestionIconObj(s.name, s.type);
                      const IconComp = iconObj.icon;
                      return (
                        <div className={`p-1.5 rounded-lg border-2 border-black ${iconObj.bg} shadow-[1px_1px_0px_#000]`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-slate-100 group-hover:text-tech transition-colors truncate" title={s.label}>
                        {s.label}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {getProviderBadge(s.source)}
                      {s.cep && (
                        <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                          CEP {s.cep}
                        </span>
                      )}
                      {s.name && s.name !== s.label && (
                        <span className="text-[9px] text-slate-400 group-hover:text-slate-300 transition-colors truncate">
                          {s.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="p-6 text-center bg-slate-900/50">
              <p className="text-xs font-bold text-slate-400 mb-1">Local não encontrado</p>
              <p className="text-[9px] text-slate-500 max-w-[200px] mx-auto">
                Busque por rua, número, bairro, CEP ou estabelecimento.
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/95 text-white border border-tech/40 text-[11px] sm:text-xs font-semibold py-2.5 px-5 rounded-full shadow-[0_10px_30px_rgba(209,160,84,0.15)] backdrop-blur-md animate-in slide-in-from-top-4 flex items-center gap-2 max-w-[90%] md:max-w-md whitespace-nowrap overflow-hidden text-ellipsis">
          <AlertOctagon className="w-4 h-4 text-tech shrink-0" />
          <div className="truncate flex-1">
            {apiWarning}
          </div>
          <button onClick={() => setApiWarning(null)} className="shrink-0 text-slate-400 hover:text-white transition-colors ml-1">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Notification Toast for Presentation Mode & Quick Actions */}
      {notificationToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/95 text-white border-2 border-amber-400 text-xs sm:text-sm font-bold py-3 px-6 rounded-2xl shadow-[0_10px_40px_rgba(251,191,36,0.4)] backdrop-blur-md animate-in slide-in-from-top-4 flex items-center gap-3 max-w-[92%]">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
          <div className="flex-1 font-sans">
            {notificationToast}
          </div>
          <button onClick={() => setNotificationToast(null)} className="shrink-0 text-slate-400 hover:text-white transition-colors ml-2 cursor-pointer">
            <X className="w-4 h-4" />
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
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9000] w-[92%] max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl bg-slate-950/95 backdrop-blur-2xl border-2 border-amber-500/70 text-white rounded-2xl p-4 shadow-[0_15px_50px_rgba(245,158,11,0.4)] flex flex-col gap-3"
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
                onClick={() => setLocationMismatchDismissed(addresses[0])}
                className="px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-700 text-slate-300 font-medium text-xs transition-all cursor-pointer"
              >
                Manter Partida Digitada
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Retractable Bottom Navigation Bar System - Unified for Desktop & Mobile & Navigation Mode */}
      <AnimatePresence>
        {showAppContent && (
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed bottom-0 left-0 right-0 ${currentScreen === 'navigation' ? 'z-[1300]' : 'z-[4000]'} flex flex-col items-center pointer-events-none select-none px-3 sm:px-6`}
          >
            {/* Background backdrop blur sheet that expands vertically */}
            <motion.div
              layout
              animate={{ 
                height: isBottomMenuExpanded ? 'auto' : 56,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl pointer-events-auto bg-slate-950/95 backdrop-blur-2xl shadow-[0_-12px_45px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden max-h-[85vh] relative rounded-t-2xl border-x border-b border-slate-850/80"
              style={{
                clipPath: isBottomMenuExpanded 
                  ? 'polygon(0% 0px, 50% 12px, 100% 0px, 100% 100%, 0% 100%)' 
                  : 'polygon(0% 12px, 50% 0px, 100% 12px, 100% 100%, 0% 100%)',
                transition: 'clip-path 0.3s ease'
              }}
            >
              {/* Luminous Chevron Accent Line (160° obtuse angle dynamic arrow contour) */}
              <div className="absolute top-0 left-0 right-0 h-4 pointer-events-none z-20">
                <svg 
                  viewBox="0 0 100 12" 
                  preserveAspectRatio="none" 
                  className="w-full h-full overflow-visible drop-shadow-[0_0_8px_rgba(245,204,132,0.85)] drop-shadow-[0_0_16px_rgba(209,160,84,0.45)]"
                >
                  <path 
                    d={isBottomMenuExpanded ? "M 0 0 L 50 12 L 100 0" : "M 0 12 L 50 0 L 100 12"} 
                    fill="none" 
                    stroke="#f5cc84" 
                    strokeWidth="2.2" 
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />
                </svg>
              </div>

              {/* Header / Trigger Strip - Centered 'MENU' Only */}
              <div 
                className="w-full h-14 pt-2.5 px-6 flex items-center justify-center cursor-pointer shrink-0 select-none hover:bg-slate-900/40 transition-colors group relative"
                onClick={() => setIsBottomMenuExpanded(!isBottomMenuExpanded)}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm sm:text-base font-black tracking-[0.3em] text-slate-100 uppercase transition-colors group-hover:text-tech">
                    Menu
                  </span>
                </div>
              </div>

              {/* Expanded Menu Content Area */}
              <AnimatePresence>
                {isBottomMenuExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full overflow-y-auto custom-scrollbar p-3 sm:p-4.5 space-y-3.5 max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto border-t border-slate-850/60"
                  >
                    {/* Context 1: When in Active Navigation Screen - Direct Telemetry & Full Stops List */}
                    {currentScreen === 'navigation' && routeResult?.sequence ? (
                      <div className="space-y-4">
                        {/* Top Live Telemetry Bar with Back Button */}
                        <div className="p-4 bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-slate-950 border border-tech/30 rounded-2xl shadow-inner">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsBottomMenuExpanded(false);
                                  setCurrentScreen('home');
                                }}
                                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 hover:border-tech/40 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                                title="Voltar ao Planejamento"
                              >
                                <ArrowLeft className="w-4 h-4 text-tech" />
                                <span className="hidden sm:inline">Voltar</span>
                              </button>

                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                    GPS Ativo
                                  </span>
                                  <span className="text-xs font-bold text-white">
                                    Parada {navIndex + 1} de {routeResult.sequence.length}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-100 font-bold truncate max-w-xl">
                                  {routeResult.sequence[navIndex]?.name || routeResult.sequence[navIndex]?.address?.split(',')[0] || 'Parada sem nome'}
                                </p>
                              </div>
                            </div>

                            {/* Telemetry Stats Pills */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-center min-w-[70px]">
                                <span className="text-[8px] uppercase font-mono text-slate-400 block">Tempo Est.</span>
                                <span className="text-xs font-mono font-black text-emerald-400">
                                  {Math.round((routeResult?.segments?.[Math.max(navIndex - 1, 0)]?.duration || 900) / 60)} min
                                </span>
                              </div>
                              <div className="bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-center min-w-[70px]">
                                <span className="text-[8px] uppercase font-mono text-slate-400 block">Distância</span>
                                <span className="text-xs font-mono font-black text-white">
                                  {((routeResult?.segments?.[Math.max(navIndex - 1, 0)]?.distance || 2500) / 1000).toFixed(1)} km
                                </span>
                              </div>
                              <div className="bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 text-center min-w-[70px]">
                                <span className="text-[8px] uppercase font-mono text-slate-400 block">Decorrido</span>
                                <span className="text-xs font-mono font-black text-tech">
                                  {formatSecondsToClock(liveElapsedSeconds)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsBottomMenuExpanded(false);
                                  setIsReporting(true);
                                }}
                                className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Reportar Ocorrência</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {navIndex === 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsBottomMenuExpanded(false);
                                    setNavIndex(1);
                                  }}
                                  className="px-5 py-2 rounded-xl bg-tech hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-tech/20 active:scale-95 cursor-pointer"
                                >
                                  <Play className="w-4 h-4 fill-current text-slate-950" />
                                  <span>Iniciar Saída da Garagem</span>
                                  <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsBottomMenuExpanded(false);
                                      setFailureReason('Destinatário Ausente');
                                      setFailureNotes('');
                                      setShowFailureModal(true);
                                    }}
                                    className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Insucesso</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsBottomMenuExpanded(false);
                                      setShowDeliveryModal(true);
                                      setDeliveryPhoto(null);
                                      setDeliveryNotes('');
                                      startWebcam();
                                    }}
                                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                                    <span>Registrar Entrega</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Full Width Stops List */}
                        <div className="w-full bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 flex flex-col">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                              <List className="w-3.5 h-3.5 text-tech" />
                              Todas as Paradas ({routeResult.sequence.length})
                            </span>
                            <span className="text-[9.5px] font-mono text-tech">
                              {navIndex} concluídas • {routeResult.sequence.length - navIndex} pendentes
                            </span>
                          </div>

                          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {routeResult.sequence.map((stop: any, idx: number) => {
                              const isCurrent = idx === navIndex;
                              const isDone = idx < navIndex;
                              return (
                                <div
                                  key={idx}
                                  onClick={() => setNavIndex(idx)}
                                  className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                                    isCurrent
                                      ? 'bg-tech/15 border-tech text-white font-bold shadow-sm'
                                      : isDone
                                      ? 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:bg-slate-900/40'
                                      : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <span
                                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                        isCurrent
                                          ? 'bg-tech text-slate-950'
                                          : isDone
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {idx + 1}
                                    </span>
                                    <div className="flex flex-col min-w-0">
                                      <span className={`truncate text-xs ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                        {stop.name || stop.address?.split(',')[0]}
                                      </span>
                                      <span className="text-[10px] text-slate-400 truncate font-mono">
                                        {stop.address}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isDone && <Check className="w-4 h-4 text-emerald-400" />}
                                    {isCurrent && (
                                      <span className="px-2 py-0.5 rounded bg-tech/20 text-tech text-[8px] uppercase font-mono font-bold">
                                        Em Foco
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : routeResult ? (
                      /* Context 2: When outside Navigation but a Route is Calculated/Active */
                      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsBottomMenuExpanded(false);
                              setCurrentScreen('home');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700 hover:border-tech/40 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 text-tech" />
                            <span>Voltar ao Planejamento</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setIsBottomMenuExpanded(false);
                              setActualRouteStartTime(prev => prev || Date.now());
                              setCurrentScreen('navigation');
                            }}
                            className="px-4 py-2.5 rounded-xl bg-tech text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 fill-current" />
                            <span>Iniciar / Retomar GPS</span>
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Navigation Modules Grid (Horizontal / Multi-column layout) */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2 px-1">
                        Módulos do Sistema
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
                        {[
                          { id: 'home', label: 'Planejamento', icon: MapIcon, desc: 'Inserir e Alterar Cidades' },
                          { id: 'route_details', label: 'Detalhes da Rota', icon: Sliders, desc: 'Custos, Horários e Veículo' },
                          ...(routeResult ? [
                            { id: 'navigation', label: 'Rota Ativa', icon: NavIcon, desc: 'Navegação GPS em Tempo Real' }
                          ] : []),
                          { id: 'history', label: 'Histórico', icon: Clock, desc: 'Auditoria e Relatórios' },
                          { id: 'dashboard', label: 'Métricas', icon: LayoutDashboard, desc: 'Desempenho e Logística' },
                          { id: 'settings', label: 'Configurações', icon: Settings, desc: 'Ajustes Finos do Sistema' },
                          { id: 'tutorial', label: 'Tutorial Guiado', icon: Sparkles, desc: 'Aprenda todas as funções' },
                        ].map((tab) => {
                          const isActive = tab.id === 'tutorial' 
                            ? showAccessibleTutorial 
                            : tab.id === 'route_details'
                            ? showRouteDetailsModal
                            : currentScreen === tab.id;
                          const Icon = tab.icon;

                          return (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => {
                                setIsBottomMenuExpanded(false);
                                if (tab.id === 'tutorial') {
                                  setShowAccessibleTutorial(true);
                                  setCurrentScreen('home');
                                } else if (tab.id === 'route_details') {
                                  setShowRouteDetailsModal(true);
                                } else {
                                  setCurrentScreen(tab.id as any);
                                }
                              }}
                              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer group min-h-[90px] ${
                                isActive 
                                  ? 'bg-tech text-slate-950 border-tech font-bold shadow-sm' 
                                  : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className={`p-2 rounded-xl ${isActive ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-950/50 text-tech group-hover:bg-tech/10 transition-colors'}`}>
                                  <Icon className="w-5 h-5 shrink-0" />
                                </div>
                                {isActive && (
                                  <span className="w-2 h-2 rounded-full bg-slate-950" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`text-xs uppercase tracking-wider font-extrabold leading-tight ${isActive ? 'text-slate-950' : 'text-slate-100'}`}>
                                  {tab.label}
                                </span>
                                <span className={`text-[9px] truncate mt-0.5 font-medium ${isActive ? 'text-slate-900/80' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                  {tab.desc}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick System Shortcuts and Controls */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-850/80 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <span className="text-[9.5px] uppercase font-mono text-slate-400">HARPIA Logística</span>
                        <span className="text-slate-700">•</span>
                        <span className="text-[9.5px] text-slate-400">Tempo Real Ativo</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBottomMenuExpanded(false)}
                        className="text-[10px] uppercase font-bold text-tech hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        Recolher Barra
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
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
              className={`h-full w-full flex flex-col max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-24 overflow-y-auto overflow-x-hidden custom-scrollbar ${!showAppContent ? 'items-center justify-center py-0' : (isMobile ? 'items-stretch pt-16 pb-28' : 'items-stretch py-8 pb-28')}`}
            >
              {/* Hero Logo Animation Section */}
              <motion.div 
                layout="position"
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full flex-shrink-0 flex flex-col items-center justify-center relative overflow-visible ${!showAppContent ? 'flex-1 py-12' : 'min-h-[340px] md:min-h-[480px] mb-4 sm:mb-8 md:mb-12'}`}
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
                      {/* Botão invisível sobre a logo para ativar/desativar o Modo Apresentação de dados simulados */}
                      <button
                        type="button"
                        aria-label="Modo Apresentação Secreto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePresentationMode();
                        }}
                        className="absolute top-0 left-0 w-full h-[55%] z-30 opacity-0 cursor-default"
                        title=""
                      />
                      <HarpiaTextEffect 
                        speed={1.4} 
                        skipAnimation={skipAnimation}
                        className="w-full h-auto text-white z-10" 
                        onAnimationComplete={() => {
                          if (skipAnimation) return;
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
                              className="font-medium text-[#D1A054] uppercase text-center leading-none whitespace-nowrap" 
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

                      {/* Scroll Indicator Prompt positioned with balanced spacing beneath the logo slogan */}
                      <AnimatePresence>
                        {showSlogan && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="absolute z-30 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center justify-center"
                            style={{ top: '79%' }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerImmediateReveal();
                                setTimeout(() => {
                                  const el = document.getElementById('rotas-section');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }}
                              className="group flex flex-col items-center gap-1 text-slate-400 hover:text-tech transition-colors cursor-pointer py-1.5 px-4 rounded-full hover:bg-slate-900/50"
                            >
                              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                Explorar Rotas
                              </span>
                              <ChevronDown className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-all group-hover:translate-y-0.5 animate-bounce" />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </h1>
              </motion.div>

              {/* Functional App Options & Route Grid - Revealed after Logo Animation */}
              <AnimatePresence>
                {showAppContent && (
                  <motion.div
                    id="rotas-section"
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="w-full max-w-7xl xl:max-w-[1400px] mx-auto flex flex-col gap-6 md:gap-10 mb-12"
                  >
                {/* Left Section: Itinerary inputs and Main Planning */}
                <div className="w-full flex flex-col gap-6">
                  {/* Main Planning Card */}
                  <div className="glass p-5 sm:p-7 md:p-8 rounded-2xl relative h-fit flex flex-col border border-slate-800/70">
                  {/* Quick Action Control Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b-2 border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowQuickStartModal(true)}
                        className="neo-btn px-3.5 py-1.5 rounded-xl bg-slate-900 border-2 border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-black transition-all flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Início Rápido</span>
                      </button>
                    </div>

                    <div className="neo-badge-tech flex items-center gap-1.5 px-3 py-1 text-[11px]">
                      <Truck className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold">
                        {vehicleProfile === 'packages' && 'Pacotes / Encomendas'}
                        {vehicleProfile === 'food_delivery' && 'Pedidos de Comida'}
                        {vehicleProfile === 'services' && 'Prestação de Serviços'}
                        {vehicleProfile === 'sales' && 'Equipe de Vendas'}
                        {vehicleProfile === 'custom' && 'Personalizado'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base font-black mb-5 flex items-center gap-2 font-display border-b-2 border-slate-800 pb-3 flex-wrap text-white">
                    <div className="w-2.5 h-2.5 bg-amber-400 border border-black shadow-[1px_1px_0px_0px_#000] shrink-0" />
                    <span>
                      Paradas de Entrega
                    </span>
                  </h3>
                  
                  <div className="space-y-5 mb-8 relative">
                    {/* Vertical Connecting Itinerary Line */}
                    <div className="absolute left-6 top-8 bottom-8 w-0.5 border-l-2 border-dashed border-slate-700 pointer-events-none" />

                    {/* Starting Point */}
                    <div key={stopIds[0]} id="tutorial-origin-stop" className="relative flex gap-3.5 items-start">
                      <div className="w-6 h-6 rounded-lg bg-amber-400 text-black font-black flex items-center justify-center text-xs mt-3 z-10 shrink-0 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                        A
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <label className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider px-0.5 flex items-center gap-1.5">
                            Ponto de Partida
                          </label>
                          {invoiceData[0] && (invoiceData[0].key || invoiceData[0].pdfUrl) ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleShowInvoice(0)}
                                className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Exibir nota
                              </button>
                              <span className="text-slate-700 text-[10px]">|</span>
                              <button
                                type="button"
                                onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === 0 ? null : 0)}
                                className="text-[10px] font-bold text-slate-400 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                Alterar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === 0 ? null : 0)}
                              className="text-[10px] font-bold text-slate-400 hover:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Atribuir nota
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
                            placeholder="De onde você está saindo? (Empresa, Rua...)"
                            className="neo-input w-full px-3.5 py-3 text-sm pr-10 text-white placeholder:text-slate-500"
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
                            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer z-10"
                            title="Pesquisar local"
                          >
                            <Search className="w-4 h-4" />
                          </button>
                          {renderSuggestionsDropdown(0)}
                        </div>

                        {/* Quick Action Toolbar for Departure Point */}
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <button
                            type="button"
                            onClick={handleUseCurrentGpsAsOrigin}
                            disabled={isLocatingGps}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-tech hover:border-slate-700 text-[10.5px] font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="Definir ponto de partida com base no GPS em tempo real"
                          >
                            <Navigation className={`w-3 h-3 text-tech shrink-0 ${isLocatingGps ? 'animate-spin' : ''}`} />
                            {isLocatingGps ? 'Estimando GPS...' : 'Usar GPS Atual'}
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
                                    Seu GPS atual indica que você está em outro endereço. Deseja definir sua localização real como partida?
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
                      <div className="space-y-4 pl-8">
                        {addresses.slice(1, -1).map((addr, idx) => {
                          const realIdx = idx + 1;
                          return (
                            <div key={stopIds[realIdx]} className="space-y-1.5 relative">
                              <div className="absolute -left-8 top-3.5 w-6 h-6 rounded-lg bg-slate-900 text-slate-200 font-mono font-black flex items-center justify-center text-xs z-10 border-2 border-slate-700 shadow-[2px_2px_0px_0px_#000]">
                                {idx + 1}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                  <div className="flex items-center gap-2">
                                    <label className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider px-0.5">
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
                                      className={`neo-btn px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border-2 ${
                                        stopTypes[realIdx] === 'pickup'
                                          ? 'bg-amber-400 text-black border-black shadow-[2px_2px_0px_0px_#000]'
                                          : 'bg-slate-900 text-slate-300 border-slate-700'
                                      }`}
                                      title="Alternar tipo de parada"
                                    >
                                      {stopTypes[realIdx] === 'pickup' ? (
                                        <>
                                          <ShoppingBag className="w-2.5 h-2.5 text-black shrink-0" />
                                          <span>Coleta</span>
                                        </>
                                      ) : (
                                        <>
                                          <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
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
                                        className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Exibir nota
                                      </button>
                                      <span className="text-slate-700 text-[10px]">|</span>
                                      <button
                                        type="button"
                                        onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === realIdx ? null : realIdx)}
                                        className="text-[10px] font-bold text-slate-400 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        Alterar
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === realIdx ? null : realIdx)}
                                      className="text-[10px] font-bold text-slate-400 hover:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Atribuir nota
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
                                      placeholder="Empresa, rua ou ponto de referência..."
                                      className="neo-input w-full px-3.5 py-3 text-sm pr-10 text-white placeholder:text-slate-500"
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
                                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer z-10"
                                      title="Pesquisar local"
                                    >
                                      <Search className="w-4 h-4 text-slate-500 hover:text-amber-400" />
                                    </button>
                                    {renderSuggestionsDropdown(realIdx)}
                                  </div>
                                  <button 
                                    onClick={() => removeAddress(realIdx)}
                                    className="neo-btn p-3 text-slate-400 hover:text-red-400 hover:border-red-500 bg-slate-900 border-2 border-slate-700 rounded-xl"
                                    title="Remover parada"
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
                                  <div className="flex flex-col gap-1 mt-2 bg-slate-900/40 border border-slate-800/60 p-2.5 rounded-xl">
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <FileCheck className="w-3.5 h-3.5 text-tech" />
                                        <span className="text-[10px] font-bold text-tech">
                                          {invoiceData[realIdx]?.valor ? 'NFe Vinculada' : 'DANFE Anexada'}
                                        </span>
                                      </div>
                                      {invoiceData[realIdx]?.valor !== undefined && (
                                        <span className="text-[10px] font-medium text-emerald-400 font-mono">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoiceData[realIdx]?.valor || 0)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[9.5px] text-slate-400 line-clamp-1">
                                      {invoiceData[realIdx]?.destinatario ? `Destinatário: ${invoiceData[realIdx]?.destinatario}` : `Chave: ${invoiceData[realIdx]?.key}`}
                                    </div>
                                  </div>
                                )}
                                {/* Stop Delivery Time Window */}
                                <div className="flex flex-wrap items-center gap-2 mt-1.5 px-0.5">
                                  <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="text-[9.5px] font-medium text-slate-500">Janela:</span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <input 
                                      type="time"
                                      value={timeWindows[realIdx]?.start || ''}
                                      onChange={(e) => updateTimeWindow(realIdx, 'start', e.target.value)}
                                      className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-0.5 outline-none focus:border-tech transition-all font-mono"
                                    />
                                    <span className="text-[10px] text-slate-600">às</span>
                                    <input 
                                      type="time"
                                      value={timeWindows[realIdx]?.end || ''}
                                      onChange={(e) => updateTimeWindow(realIdx, 'end', e.target.value)}
                                      className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2 py-0.5 outline-none focus:border-tech transition-all font-mono"
                                    />
                                    {(timeWindows[realIdx]?.start || timeWindows[realIdx]?.end) && (
                                      <button 
                                        onClick={() => removeTimeWindow(realIdx)}
                                        className="text-slate-500 hover:text-rose-400 text-[9px] uppercase font-bold ml-1 transition-all"
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

                    {/* Final Destination or Final Pickup */}
                    {addresses.length >= 2 && (() => {
                      const lastIdx = addresses.length - 1;
                      const isLastPickup = stopTypes[lastIdx] === 'pickup';
                      return (
                        <div key={stopIds[lastIdx]} className="relative flex gap-3.5 items-start">
                          <div className={`w-6 h-6 rounded-lg font-black flex items-center justify-center text-xs mt-3 z-10 shrink-0 border-2 border-black shadow-[2px_2px_0px_0px_#000] ${
                            isLastPickup 
                              ? 'bg-amber-400 text-black' 
                              : 'bg-rose-500 text-white'
                          }`}>
                            {isLastPickup ? 'C' : 'B'}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <div className="flex items-center gap-2">
                                <label className={`text-[10px] font-mono font-bold uppercase tracking-wider px-0.5 flex items-center gap-1.5 ${
                                  isLastPickup ? 'text-amber-400' : 'text-slate-300'
                                }`}>
                                  {isLastPickup ? 'Ponto de Coleta' : 'Destino Final'}
                                </label>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setStopTypes(prev => ({
                                      ...prev,
                                      [lastIdx]: prev[lastIdx] === 'pickup' ? 'delivery' : 'pickup'
                                    }));
                                  }}
                                  className={`neo-btn px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer border-2 ${
                                    isLastPickup
                                      ? 'bg-amber-400 text-black border-black shadow-[2px_2px_0px_0px_#000]'
                                      : 'bg-slate-900 text-slate-300 border-slate-700'
                                  }`}
                                  title="Alternar entre Coleta e Entrega"
                                >
                                  {isLastPickup ? (
                                    <>
                                      <ShoppingBag className="w-2.5 h-2.5 text-black shrink-0" />
                                      <span>Coleta</span>
                                    </>
                                  ) : (
                                    <>
                                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                      <span>Entrega</span>
                                    </>
                                  )}
                                </button>
                              </div>
                             {invoiceData[addresses.length - 1] && (invoiceData[addresses.length - 1].key || invoiceData[addresses.length - 1].pdfUrl) ? (
                               <div className="flex items-center gap-2">
                                 <button
                                   type="button"
                                   onClick={() => handleShowInvoice(addresses.length - 1)}
                                   className="text-[10px] font-medium text-tech hover:underline flex items-center gap-1 cursor-pointer"
                                 >
                                   <Eye className="w-3.5 h-3.5 text-tech shrink-0" /> Exibir nota
                                 </button>
                                 <span className="text-slate-700 text-[10px]">|</span>
                                 <button
                                   type="button"
                                   onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === addresses.length - 1 ? null : addresses.length - 1)}
                                   className="text-[10px] font-medium text-slate-400 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                                 >
                                   Alterar
                                 </button>
                               </div>
                             ) : (
                               <button
                                 type="button"
                                 onClick={() => setActiveNFeSearchIdx(activeNFeSearchIdx === addresses.length - 1 ? null : addresses.length - 1)}
                                 className="text-[10px] font-medium text-slate-400 hover:text-tech hover:underline flex items-center gap-1 cursor-pointer"
                               >
                                 <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Atribuir nota
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
                              placeholder="Aonde você quer chegar? (Ex: Aeroporto, Shopping, Rua...)"
                              className="neo-input w-full px-3.5 py-3 text-sm pr-10 text-white placeholder:text-slate-500"
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
                              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer z-10"
                              title="Pesquisar local"
                            >
                              <Search className="w-4 h-4 text-slate-500 hover:text-amber-400" />
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
                            <div className="flex flex-col gap-1.5 mt-2.5 bg-slate-900/40 border-2 border-slate-800 p-3 rounded-xl">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <div className="flex items-center gap-1.5">
                                  <FileCheck className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
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
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[9.5px] uppercase font-mono font-bold text-slate-400 tracking-wider">Janela de Entrega:</span>
                            <div className="flex flex-wrap items-center gap-1.5 ml-1">
                              <input 
                                type="time"
                                value={timeWindows[addresses.length - 1]?.start || ''}
                                onChange={(e) => updateTimeWindow(addresses.length - 1, 'start', e.target.value)}
                                className="neo-input text-[11px] px-2 py-1 font-mono"
                              />
                              <span className="text-[10px] text-slate-500 font-mono font-bold">até</span>
                              <input 
                                type="time"
                                value={timeWindows[addresses.length - 1]?.end || ''}
                                onChange={(e) => updateTimeWindow(addresses.length - 1, 'end', e.target.value)}
                                className="neo-input text-[11px] px-2 py-1 font-mono"
                              />
                              {(timeWindows[addresses.length - 1]?.start || timeWindows[addresses.length - 1]?.end) && (
                                <button 
                                  onClick={() => removeTimeWindow(addresses.length - 1)}
                                  className="text-slate-400 hover:text-red-400 text-[9px] uppercase font-bold ml-1 hover:underline transition-all"
                                >
                                  Limpar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  </div>

                  <div className="flex flex-col gap-2.5 mt-auto pt-2">
                    <button 
                      id="tutorial-add-stop-btn"
                      onClick={() => handleAddStop()}
                      className="neo-btn w-full py-3 bg-slate-900 border-2 border-dashed border-slate-700 hover:border-amber-400 hover:text-amber-400 text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      + Adicionar Parada
                    </button>
                  </div>
                </div>

                {/* Bento Box 6: Saved & Shared Routes List */}
                <div id="tutorial-saved-routes" className="neo-card p-5 sm:p-6 rounded-2xl bg-slate-950">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <RouteIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Rotas Salvas e Agendadas</span>
                    </h3>
                    {savedRoutes.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllScheduledRoutes}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer uppercase"
                        title="Remover todas as rotas agendadas"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Limpar</span>
                      </button>
                    )}
                  </div>
                  
                  {savedRoutes.length === 0 ? (
                    <div className="text-center py-5 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/40 font-mono">
                      <p className="text-xs text-slate-400 font-bold">Nenhuma rota programada</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] mx-auto leading-relaxed">As rotas salvas ou agendadas aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[280px] overflow-y-auto custom-scrollbar font-sans pr-1">
                      {savedRoutes.map((route: any) => {
                        const isCopied = copiedRouteId === route.id;
                        return (
                          <div 
                            key={route.id} 
                            className="p-3 rounded-xl bg-slate-900 border-2 border-slate-800 hover:border-slate-700 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-white truncate leading-tight font-mono" title={route.name || 'Rota Sem Nome'}>
                                  {route.name || 'Rota Sem Nome'}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="neo-badge-tech text-[9px] px-1.5 py-0.5 shrink-0">
                                    {route.addresses.length} Paradas
                                  </span>
                                  {route.scheduledDate && (
                                    <span className="text-[9px] text-slate-300 font-mono font-medium flex items-center gap-1 leading-none">
                                      <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                      {new Date(route.scheduledDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                      {route.scheduledTime ? ` às ${route.scheduledTime}` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => handleDeleteSavedRoute(route.id)}
                                className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                                title="Excluir Rota"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            <div className="flex gap-2 pt-1 border-t-2 border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleLoadSavedRoute(route)}
                                className="neo-btn flex-1 py-1.5 bg-amber-400 text-black border-2 border-black text-[10px] font-black uppercase tracking-wider rounded-lg shadow-[2px_2px_0px_0px_#000] text-center cursor-pointer"
                              >
                                Carregar
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleShareRoute(route)}
                                className={`neo-btn flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer border-2 ${
                                  isCopied 
                                    ? 'bg-emerald-400 border-black text-black shadow-[2px_2px_0px_0px_#000]' 
                                    : 'bg-slate-800 border-slate-700 text-white hover:border-slate-500'
                                }`}
                              >
                                <Share2 className="w-3 h-3 shrink-0" />
                                {isCopied ? 'Copiado' : 'Compartilhar'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Section: Dynamic Logistics Configuration Bento Box List */}
              <div className="w-full flex flex-col gap-6">
                  {/* Bento Box 1: Vehicle selection */}
                  <div id="tutorial-vehicle-selector" className="neo-card p-5 sm:p-6 rounded-2xl bg-slate-950">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3.5 flex items-center gap-2 flex-wrap">
                      <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Perfil de Transporte</span>
                    </h3>
                    <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                      {[
                        { id: 'moto', icon: Bike, label: 'Moto' },
                        { id: 'van', icon: Car, label: 'Van' },
                        { id: 'truck', icon: Truck, label: 'Caminhão' },
                        { id: 'boat', icon: Ship, label: 'Barco' },
                      ].map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setOptions({ ...options, vehicle: v.id as any })}
                          className={`neo-btn flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border-2 transition-all cursor-pointer ${
                            options.vehicle === v.id
                              ? 'bg-amber-400 text-black border-black shadow-[3px_3px_0px_0px_#000] font-black'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                          }`}
                        >
                          <v.icon className="w-4 h-4 mb-1" />
                          <span className="text-[10px] uppercase tracking-wider font-mono">{v.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Subpanel de Rota Fluvial & Embarcação quando 'boat' está ativo */}
                    {options.vehicle === 'boat' && (
                      <div className="mt-4 pt-4 border-t-2 border-slate-800 animate-fadeIn space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <Anchor className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            Tipo de Embarcação & Calado
                          </label>
                          <span className="neo-badge-tech text-[9px] px-2 py-0.5">
                            Matriz Fluvial
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
                              className={`neo-btn p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                                (options.vesselType || 'express_lancha') === vessel.id
                                  ? 'bg-amber-400 border-black text-black shadow-[2px_2px_0px_0px_#000] font-black'
                                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 mb-1">
                                <vessel.icon className={`w-3.5 h-3.5 ${ (options.vesselType || 'express_lancha') === vessel.id ? 'text-black' : 'text-amber-400' }`} />
                                <span className="text-[10px] font-bold uppercase">{vessel.label}</span>
                              </div>
                              <p className={`text-[8.5px] font-mono leading-none ${ (options.vesselType || 'express_lancha') === vessel.id ? 'text-slate-900 font-bold' : 'text-slate-400' }`}>{vessel.desc}</p>
                            </button>
                          ))}
                        </div>

                        {/* Sazonalidade do Rio Detectada Automaticamente */}
                        {(() => {
                          const autoSeason = getAutoDetectedAmazonSeason(scheduledDate || null);
                          return (
                            <div className="mt-3.5 p-3 rounded-xl bg-slate-900 border-2 border-slate-800 text-slate-300 font-sans space-y-1.5">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-200">
                                    Sazonalidade do Rio
                                  </span>
                                </div>
                                <span className="neo-badge-tech text-[9px] px-2 py-0.5 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                  {scheduledDate ? 'Detectado por Agendamento' : 'Detectado Automaticamente'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-white">
                                  {autoSeason.badgeLabel}
                                </span>
                                <span className="text-[10px] font-mono text-amber-400">
                                  (Cota est. ~{autoSeason.riverLevelEstimate}m)
                                </span>
                              </div>
                              <p className="text-[9.5px] text-slate-400 leading-relaxed">
                                {autoSeason.description}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Bento Box 2: Route optimization priority */}
                  <div className="neo-card p-5 sm:p-6 rounded-2xl bg-slate-950">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3.5 flex items-center gap-2 flex-wrap">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Prioridade de Rota</span>
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
                          className={`neo-btn flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                            options.priority === p.id 
                            ? 'bg-amber-400 border-black text-black shadow-[2px_2px_0px_0px_#000] font-black' 
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                          }`}
                        >
                          <p.icon className="w-4 h-4 mb-1 shrink-0" />
                          <span className="text-[9px] uppercase font-mono font-bold leading-none">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bento Box 4: AI Custom Prompts */}
                  <div className="neo-card p-5 sm:p-6 rounded-2xl bg-slate-950">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white mb-2 flex items-center gap-2 flex-wrap">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Instruções Adicionais</span>
                    </h3>
                    <textarea
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Ex: 'priorizar vias principais', 'evitar travessias lentas'..."
                      rows={2}
                      className="neo-input w-full px-3.5 py-2.5 text-xs resize-none text-white placeholder-slate-500 font-mono"
                    />
                  </div>

                  {/* Bento Box 5: Future Routing & Scheduling */}
                  <div className="neo-card p-5 sm:p-6 rounded-2xl bg-slate-950">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-2 flex-wrap">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Agendar Rota</span>
                    </h3>
                    
                    <div className="space-y-3 font-sans">
                      <div>
                        <label className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider block mb-1">Nome da Rota</label>
                        <input
                          type="text"
                          value={scheduledName}
                          onChange={(e) => setScheduledName(e.target.value)}
                          placeholder="Ex: Rota Centro / Manhã"
                          className="neo-input w-full px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider block mb-1">Data</label>
                          <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="neo-input w-full px-3 py-2 text-xs text-white placeholder-slate-500 font-mono [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider block mb-1">Horário</label>
                          <input
                            type="time"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            className="neo-input w-full px-3 py-2 text-xs text-white placeholder-slate-500 font-mono [color-scheme:dark]"
                          />
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleSaveFutureRoute}
                        disabled={addresses.filter(a => a.trim().length > 3).length < 2}
                        className="neo-btn w-full py-2.5 bg-slate-900 border-2 border-slate-700 hover:border-amber-400 text-slate-200 disabled:text-slate-600 disabled:border-slate-800 disabled:bg-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-400" />
                        Salvar e Agendar
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      id="tutorial-optimize-btn"
                      onClick={runOptimization}
                      disabled={!hasTwoOrMoreAddresses}
                      className={`w-full font-black py-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
                        hasTwoOrMoreAddresses 
                          ? 'neo-btn-primary text-black' 
                          : 'bg-slate-900 border-2 border-slate-800 text-slate-600 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{hasTwoOrMoreAddresses ? `Calcular Rota (${enteredAddresses.length} Paradas)` : 'Adicione pelo menos 2 endereços'}</span>
                    </button>
                  </div>
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



          {currentScreen === 'navigation' && routeResult && (
            <motion.div
              key="navigation"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex flex-col relative overflow-hidden"
            >
              <div id="tutorial-map-section" className="relative flex-1">
                 <MapView stops={routeResult.sequence} geometry={routeResult.geometry} routeSegments={routeResult.segments} alternatives={routeResult.alternatives || []} isNavigationScreen={true} navIndex={navIndex} onRouteRecalculated={setRouteResult} />
                 
                 {/* Floating Background Incident Polling Alert Toast - 1 Frase Clara */}
                  <AnimatePresence>
                    {activeIncidentToast && (
                      <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="absolute top-16 left-1/2 -translate-x-1/2 z-[4500] max-w-md md:max-w-lg w-[90%] bg-slate-950/95 backdrop-blur-xl border border-rose-500/80 rounded-2xl p-3 shadow-[0_8px_30px_rgba(244,63,94,0.35)] text-white"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
                            <AlertTriangle className="w-4 h-4 animate-bounce" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[9px] uppercase font-black tracking-wider text-rose-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                Ocorrência na Rota
                              </span>
                              {lastBgPollTime && (
                                <span className="text-[8.5px] text-slate-400 font-mono shrink-0">{lastBgPollTime}</span>
                              )}
                            </div>
                            <p className="text-slate-100 font-semibold text-xs leading-snug truncate">
                              {activeIncidentToast.bulletin}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setActiveIncidentToast(null);
                                setOptions(prev => ({
                                  ...prev,
                                  avoidFloods: true,
                                  customPrompt: (prev.customPrompt || '') + ' Aplicar desvio por ocorrência detectada em tempo real.'
                                }));
                                setTimeout(() => runOptimization(), 100);
                              }}
                              className="px-2.5 py-1.5 bg-tech text-slate-950 rounded-lg font-black text-[10px] uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_10px_rgba(209,160,84,0.3)]"
                              title="Recalcular Rota com Desvio"
                            >
                              <Zap className="w-3 h-3" />
                              <span>Desviar</span>
                            </button>
                            <button
                              onClick={() => setActiveIncidentToast(null)}
                              className="p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Dispensar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                 
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

                 {/* Floating Top-Center Live Route Elapsed Time Clock */}
                 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1500] px-4 py-2 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-tech/40 text-tech shadow-[0_8px_25px_rgba(0,0,0,0.6)] flex items-center gap-2.5 font-mono text-xs font-black">
                   <Clock className="w-4 h-4 text-tech shrink-0 animate-spin" style={{ animationDuration: '8s' }} />
                   <span className="text-slate-400 text-[10px] uppercase font-sans font-bold tracking-wider hidden sm:inline">Tempo Decorrido:</span>
                   <span className="text-white text-sm font-black tracking-tight">{formatSecondsToClock(liveElapsedSeconds)}</span>
                 </div>


                 {/* Retractable Navigation Drawer */}
                 <AnimatePresence>
                   {isNavDrawerOpen && (
                     <motion.div
                       initial={{ x: '-100%', opacity: 0 }}
                       animate={{ x: 0, opacity: 1 }}
                       exit={{ x: '-100%', opacity: 0 }}
                       transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                       className="absolute top-0 left-0 bottom-0 z-[1400] w-72 md:w-80 bg-slate-950/95 backdrop-blur-2xl border-r border-tech/30 p-4 md:p-5 flex flex-col shadow-[10px_0_40px_rgba(0,0,0,0.85)] text-white"
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
                           <span className="inline-block mt-2 px-2 py-0.5 bg-tech/15 border border-tech/30 text-tech text-[9.5px] font-mono font-bold rounded">
                             ID Rota: #{routeResult.routeId || 'ROT-8492'}
                           </span>
                         </div>

                         {/* Sub-menu Collapsible: Opções do Menu */}
                         <div className="bg-slate-900/90 rounded-2xl border border-tech/30 overflow-hidden shadow-lg">
                           <button
                             type="button"
                             onClick={() => setIsDrawerMenuOptionsOpen(!isDrawerMenuOptionsOpen)}
                             className="w-full p-3.5 flex items-center justify-between text-left text-xs font-black uppercase tracking-wider text-tech hover:bg-white/5 transition-colors cursor-pointer"
                           >
                             <div className="flex items-center gap-2">
                               <Menu className="w-4 h-4 text-tech" />
                               <span>Opções do Menu</span>
                             </div>
                             {isDrawerMenuOptionsOpen ? (
                               <ChevronUp className="w-4 h-4 text-tech" />
                             ) : (
                               <ChevronDown className="w-4 h-4 text-tech" />
                             )}
                           </button>

                           <AnimatePresence>
                             {isDrawerMenuOptionsOpen && (
                               <motion.div
                                 initial={{ height: 0, opacity: 0 }}
                                 animate={{ height: 'auto', opacity: 1 }}
                                 exit={{ height: 0, opacity: 0 }}
                                 className="px-3 pb-3 space-y-1.5 border-t border-slate-800/80 pt-2"
                               >
                                 {[
                                   { id: 'home', label: 'Planejamento', icon: MapIcon, desc: 'Inserir e Alterar Cidades' },
                                   { id: 'navigation', label: 'Rota Ativa', icon: NavIcon, desc: 'Navegação GPS em Tempo Real' },
                                   { id: 'history', label: 'Histórico', icon: Clock, desc: 'Auditoria e Relatórios' },
                                   { id: 'dashboard', label: 'Métricas', icon: LayoutDashboard, desc: 'Desempenho e Logística' },
                                   { id: 'settings', label: 'Configurações', icon: Settings, desc: 'Ajustes Finos do Sistema' },
                                   { id: 'tutorial', label: 'Tutorial Guiado', icon: Sparkles, desc: 'Aprenda todas as funções' },
                                 ].map((tab) => {
                                   const isActive = tab.id === 'navigation';
                                   const Icon = tab.icon;
                                   return (
                                     <button
                                       key={tab.id}
                                       onClick={() => {
                                         setIsNavDrawerOpen(false);
                                         if (tab.id === 'tutorial') {
                                           setShowAccessibleTutorial(true);
                                           setCurrentScreen('home');
                                         } else {
                                           setCurrentScreen(tab.id as any);
                                         }
                                       }}
                                       className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                                         isActive
                                           ? 'bg-tech/20 border-tech text-tech font-bold'
                                           : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/80 text-slate-300 hover:text-white'
                                       }`}
                                     >
                                       <Icon className="w-4 h-4 text-tech shrink-0" />
                                       <div className="flex flex-col min-w-0">
                                         <span className="text-[11px] font-bold uppercase tracking-wider leading-none">
                                           {tab.label}
                                         </span>
                                         <span className="text-[9px] text-slate-400 truncate mt-0.5">
                                           {tab.desc}
                                         </span>
                                       </div>
                                     </button>
                                   );
                                 })}
                               </motion.div>
                             )}
                           </AnimatePresence>
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
                             setCurrentScreen('home');
                           }}
                           className="w-full py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                         >
                           <ChevronLeft className="w-4 h-4 text-tech" />
                           <span>Voltar ao Planejamento</span>
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
                       className="absolute top-24 sm:top-28 right-4 sm:right-6 z-[1000] bg-slate-950/90 backdrop-blur-xl p-3.5 rounded-2xl border border-cyan-500/50 shadow-[0_10px_30px_rgba(6,182,212,0.3)] max-w-[280px] font-sans text-white space-y-2"
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
                      className="fixed inset-0 z-[6000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
                    >
                      <motion.div 
                        initial={{ scale: 0.95, y: 15 }} 
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 15 }}
                        className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[32px] w-full max-w-md md:max-w-lg lg:max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
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
                                  const endTime = Date.now();
                                  const startTime = actualRouteStartTime || (latest?.date ? new Date(latest.date).getTime() : endTime - 900000);
                                  const elapsedMs = Math.max(0, endTime - startTime);
                                  
                                  const completedCountSoFar = updatedSequence.filter((s: any) => s.status === 'completed').length;
                                  const failedCountSoFar = updatedSequence.filter((s: any) => s.status === 'failed').length;
                                  const totalStopsCount = updatedSequence.length;
                                  const actualMinutes = Math.round(elapsedMs / 60000);
                                  const plannedMinutes = latest.totalDurationMinutes || Math.round((routeResult.summary?.duration || 0) / 60);

                                  await db.routes.update(latest.id, { 
                                    status: isLastStop ? 'completed' : 'pending',
                                    sequence: updatedSequence,
                                    deliveryPhoto: deliveryPhoto,
                                    deliveryNotes: deliveryNotes || 'Entrega efetuada com sucesso',
                                    startedAt: new Date(startTime),
                                    completedAt: isLastStop ? new Date(endTime) : undefined,
                                    totalElapsedMs: isLastStop ? elapsedMs : undefined,
                                    executionMetrics: {
                                      startedAt: new Date(startTime),
                                      completedAt: isLastStop ? new Date(endTime) : undefined,
                                      totalElapsedMs: elapsedMs,
                                      actualDurationMinutes: actualMinutes,
                                      actualDistanceKm: latest.totalDistanceKm || (routeResult.summary?.distance ? Math.round((routeResult.summary.distance / 1000) * 10) / 10 : 0),
                                      completedStopsCount: completedCountSoFar,
                                      failedStopsCount: failedCountSoFar,
                                      totalStopsCount: totalStopsCount,
                                      completionRatePercent: Math.round((completedCountSoFar / totalStopsCount) * 100),
                                      punctualityRatePercent: actualMinutes <= plannedMinutes * 1.15 ? 100 : Math.max(50, Math.round((1 - (actualMinutes - plannedMinutes) / (plannedMinutes || 1)) * 100)),
                                      timeDeviationMinutes: actualMinutes - plannedMinutes,
                                      fuelConsumedLiters: latest.calculatedRoute?.estimatedFuelLiters || 0,
                                      fuelCostTotal: latest.calculatedRoute?.estimatedFuelCost || 0
                                    }
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
                                    setActualRouteEndTime(endTime);
                                    setTotalElapsedMs(elapsedMs);

                                    const completedCount = updatedSequence.filter((s: any) => s.status === 'completed').length;
                                    const failedCount = updatedSequence.filter((s: any) => s.status === 'failed').length;

                                    setCompletedSummaryData({
                                      startTimeStr: new Date(startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                                      endTimeStr: new Date(endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                                      elapsedMs,
                                      elapsedFormatted: formatSecondsToClock(Math.floor(elapsedMs / 1000)),
                                      estimatedDurationFormatted: formatSecondsToClock(Math.round(routeResult.summary?.duration || 0)),
                                      estimatedMinutes: Math.round((routeResult.summary?.duration || 0) / 60),
                                      actualMinutes: Math.round(elapsedMs / 60000),
                                      totalStops: routeResult.sequence.length,
                                      completedCount,
                                      failedCount,
                                      totalDistanceKm: (routeResult.summary?.distance ? (routeResult.summary.distance / 1000).toFixed(1) : (routeResult.distance ? (routeResult.distance / 1000).toFixed(1) : '18.4')),
                                      vehicle: options.vehicle || 'van',
                                      score: routeResult.score || 95
                                    });

                                    setShowRouteCompletedModal(true);
                                    setNavIndex(0);
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

               {/* Modal de Conclusão de Rota com Tempo Total Decorrido */}
               <AnimatePresence>
                 {showRouteCompletedModal && (
                   <motion.div
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="fixed inset-0 z-[6000] bg-slate-950/85 backdrop-blur-xl flex items-center justify-center p-4"
                     onClick={() => setShowRouteCompletedModal(false)}
                   >
                     <motion.div
                       initial={{ scale: 0.9, opacity: 0, y: 20 }}
                       animate={{ scale: 1, opacity: 1, y: 0 }}
                       exit={{ scale: 0.9, opacity: 0, y: 20 }}
                       transition={{ type: "spring", damping: 25, stiffness: 300 }}
                       className="bg-slate-950 border-2 border-emerald-500/60 rounded-3xl p-6 sm:p-8 max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl w-full text-white shadow-[0_0_60px_rgba(16,185,129,0.25)] relative overflow-hidden"
                       onClick={(e) => e.stopPropagation()}
                     >
                       {/* Subtle glowing ambient background effect */}
                       <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                       <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-tech/10 rounded-full blur-3xl pointer-events-none" />

                       {/* Top Badge */}
                       <div className="flex items-center justify-center mb-4">
                         <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                           <CheckCircle2 className="w-9 h-9 animate-bounce" />
                         </div>
                       </div>

                       <div className="text-center mb-6">
                         <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] uppercase font-black tracking-widest rounded-full">
                           Rota Finalizada com Sucesso
                         </span>
                         <h3 className="font-display font-black text-2xl sm:text-3xl text-white mt-2">
                           🎉 Percurso Concluído!
                         </h3>
                         <p className="text-xs text-slate-400 mt-1">
                           Confira o resumo de desempenho e tempo total gasto durante a navegação.
                         </p>
                       </div>

                       {/* Big Hero Total Elapsed Time Block */}
                       <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 rounded-2xl p-5 mb-6 text-center relative shadow-inner">
                         <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 flex items-center justify-center gap-1.5 mb-1">
                           <Clock className="w-3.5 h-3.5 text-emerald-400" />
                           Tempo Total Decorrido de Rota
                         </span>
                         <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight my-1 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                           {completedSummaryData?.elapsedFormatted || '00m 00s'}
                         </div>
                         <div className="flex flex-wrap items-center justify-center gap-2 mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-300">
                           {completedSummaryData?.startTimeStr && completedSummaryData?.endTimeStr && (
                             <span>
                               Início: <strong className="text-white">{completedSummaryData.startTimeStr}</strong> • Fim: <strong className="text-white">{completedSummaryData.endTimeStr}</strong>
                             </span>
                           )}
                           {completedSummaryData?.estimatedDurationFormatted && (
                             <span className="bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 text-tech text-[10px]">
                               Estimado Inicial: {completedSummaryData.estimatedDurationFormatted}
                             </span>
                           )}
                         </div>
                       </div>

                       {/* Operational Key Metrics Grid */}
                       <div className="grid grid-cols-2 gap-3 mb-6">
                         <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col">
                           <span className="text-[9.5px] uppercase font-bold text-slate-400">Entregas Concluídas</span>
                           <span className="text-base font-black text-white font-mono mt-0.5">
                             {completedSummaryData?.completedCount || 0} / {completedSummaryData?.totalStops || 0}
                           </span>
                           <span className="text-[9px] text-emerald-400 font-medium mt-0.5">
                             {completedSummaryData?.totalStops ? Math.round(((completedSummaryData?.completedCount || 0) / completedSummaryData?.totalStops) * 100) : 100}% taxa de entrega
                           </span>
                         </div>

                         <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-col">
                           <span className="text-[9.5px] uppercase font-bold text-slate-400">Distância Total</span>
                           <span className="text-base font-black text-white font-mono mt-0.5">
                             {completedSummaryData?.totalDistanceKm || '0'} km
                           </span>
                           <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                             {options.vehicle || 'Veículo Padrão'}
                           </span>
                         </div>
                       </div>

                       {/* Action Buttons */}
                       <div className="flex flex-col sm:flex-row gap-3">
                         <button
                           onClick={() => {
                             setShowRouteCompletedModal(false);
                             setCurrentScreen('history');
                           }}
                           className="flex-1 py-3.5 px-4 bg-tech text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(209,160,84,0.3)] cursor-pointer flex items-center justify-center gap-2"
                         >
                           <Clock className="w-4 h-4" />
                           <span>Ver Histórico & Auditoria</span>
                         </button>
                         <button
                           onClick={() => {
                             setShowRouteCompletedModal(false);
                             setCurrentScreen('dashboard');
                           }}
                           className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2"
                         >
                           <LayoutDashboard className="w-4 h-4" />
                           <span>Métricas</span>
                         </button>
                         <button
                           onClick={() => {
                             setShowRouteCompletedModal(false);
                             setCurrentScreen('home');
                           }}
                           className="py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-2"
                         >
                           <MapIcon className="w-4 h-4" />
                           <span>Nova Rota</span>
                         </button>
                       </div>
                     </motion.div>
                   </motion.div>
                 )}
               </AnimatePresence>

                 {/* Active Stop Bottom Sheet following 6-level hierarchy */}
                 <ActiveStopBottomSheet
                   stop={routeResult.sequence[navIndex]}
                   stopIndex={navIndex}
                   totalStops={routeResult.sequence.length}
                   remainingTimeMinutes={Math.round((routeResult?.segments?.[Math.max(navIndex - 1, 0)]?.duration || 900) / 60)}
                   remainingDistanceKm={(routeResult?.segments?.[Math.max(navIndex - 1, 0)]?.distance || 2500) / 1000}
                   etaString={(() => {
                     const durationSec = routeResult?.segments?.[Math.max(navIndex - 1, 0)]?.duration || 900;
                     const etaDate = new Date();
                     etaDate.setSeconds(etaDate.getSeconds() + durationSec);
                     return etaDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                   })()}
                   onMarkDelivered={() => {
                     if (navIndex === 0) {
                       setNavIndex(1);
                     } else {
                       setShowDeliveryModal(true);
                       setDeliveryPhoto(null);
                       setDeliveryNotes('');
                       startWebcam();
                     }
                   }}
                   onMarkUndelivered={() => {
                     setFailureReason('Destinatário Ausente');
                     setFailureNotes('');
                     setShowFailureModal(true);
                   }}
                   onEditStop={() => {
                     setShowRouteDetailsModal(true);
                   }}
                   onDuplicateStop={() => {
                     if (routeResult.sequence[navIndex]) {
                       const dupe = { ...routeResult.sequence[navIndex], id: Date.now() };
                       const updated = [...routeResult.sequence];
                       updated.splice(navIndex + 1, 0, dupe);
                       setRouteResult({ ...routeResult, sequence: updated });
                     }
                   }}
                   onRemoveStop={() => {
                     if (routeResult.sequence.length > 1) {
                       const updated = routeResult.sequence.filter((_: any, i: number) => i !== navIndex);
                       setRouteResult({ ...routeResult, sequence: updated });
                       if (navIndex >= updated.length) setNavIndex(Math.max(0, updated.length - 1));
                     }
                   }}
                   onAddNotes={(notes) => {
                     if (routeResult.sequence[navIndex]) {
                       const updatedSeq = [...routeResult.sequence];
                       updatedSeq[navIndex] = { ...updatedSeq[navIndex], deliveryNotes: notes };
                       setRouteResult({ ...routeResult, sequence: updatedSeq });
                     }
                   }}
                   onViewAllStops={() => {
                     setIsNavDrawerOpen(true);
                   }}
                 />
               </div>

               {/* Back to Menu / Exit Navigation Buttons */}
               <button 
                 onClick={() => {
                   setNavIndex(0);
                   setCurrentScreen('home');
                 }}
                 className="absolute top-6 left-6 z-[1002] px-3.5 py-2 bg-black/60 backdrop-blur-md text-white border border-white/20 hover:border-tech/40 rounded-2xl flex items-center gap-2 hover:bg-black/80 transition-all font-bold text-xs shadow-lg cursor-pointer active:scale-95 group"
                 title="Encerrar navegação e voltar ao menu principal"
               >
                 <ArrowLeft className="w-4 h-4 text-tech group-hover:-translate-x-0.5 transition-transform" />
                 <span className="hidden sm:inline">Voltar ao Menu</span>
               </button>

               <button 
                 onClick={() => {
                   setNavIndex(0);
                   setCurrentScreen('dashboard');
                 }}
                 className="absolute top-6 right-6 z-[1002] w-10 h-10 bg-black/40 backdrop-blur-md text-white border border-white/15 rounded-full flex items-center justify-center hover:bg-black/70 transition-all cursor-pointer shadow-lg"
                 title="Sair para o Painel"
               >
                 <XCircle className="w-6 h-6" />
               </button>

               {/* Report Modal */}
               <AnimatePresence>
                 {isReporting && (
                   <motion.div 
                     initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                     className="fixed inset-0 z-[6000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6"
                   >
                     <motion.div 
                       initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                       className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] w-full max-w-md md:max-w-lg lg:max-w-xl shadow-2xl"
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
                        onClick={async () => {
                          // Save occurrence to Dexie
                          try {
                            await db.occurrences.add({
                              type: 'other',
                              lat: routeResult.sequence[navIndex]?.lat || 0,
                              lon: routeResult.sequence[navIndex]?.lon || 0,
                              description: reportType,
                              timestamp: new Date(),
                              synced: false
                            });

                            const latest = await db.routes.toCollection().last();
                            if (latest?.id) {
                              const existingIncidents = latest.reportedIncidents || [];
                              const newIncident: RouteIncident = {
                                id: `inc-${Date.now()}`,
                                type: reportType.toLowerCase().includes('areia') ? 'sandbank' :
                                      reportType.toLowerCase().includes('cota') || reportType.toLowerCase().includes('repiquete') ? 'repiquete' :
                                      reportType.toLowerCase().includes('trânsito') || reportType.toLowerCase().includes('lentidão') ? 'congestion' :
                                      reportType.toLowerCase().includes('acidente') ? 'accident' :
                                      reportType.toLowerCase().includes('alag') ? 'flood' :
                                      reportType.toLowerCase().includes('buraco') ? 'pothole' : 'other',
                                description: reportType,
                                reportedAt: new Date(),
                                severity: 'medium',
                                lat: routeResult.sequence[navIndex]?.lat,
                                lng: routeResult.sequence[navIndex]?.lon,
                                stopIndex: navIndex
                              };
                              await db.routes.update(latest.id, {
                                reportedIncidents: [...existingIncidents, newIncident]
                              });
                            }
                          } catch (err) {
                            console.warn("Could not attach incident to route:", err);
                          }
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
                     className="fixed inset-0 z-[6000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6"
                   >
                     <motion.div 
                       initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                       className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[40px] w-full max-w-md md:max-w-lg lg:max-w-xl shadow-2xl flex flex-col"
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
                               const endTime = Date.now();
                               let startTime = actualRouteStartTime;
                               try {
                                 const latest = await db.routes.toCollection().last();
                                 if (latest?.id) {
                                   if (!startTime && latest.date) startTime = new Date(latest.date).getTime();
                                   const elapsedMs = Math.max(0, endTime - (startTime || endTime - 900000));
                                   const completedCount = updatedSequence.filter((s: any) => s.status === 'completed').length;
                                   const failedCount = updatedSequence.filter((s: any) => s.status === 'failed').length;
                                   const totalStopsCount = updatedSequence.length;
                                   const actualMinutes = Math.round(elapsedMs / 60000);
                                   const plannedMinutes = latest.totalDurationMinutes || Math.round((routeResult.summary?.duration || 0) / 60);

                                   await db.routes.update(latest.id, {
                                     status: 'completed',
                                     sequence: updatedSequence,
                                     startedAt: new Date(startTime || endTime - 900000),
                                     completedAt: new Date(endTime),
                                     totalElapsedMs: elapsedMs,
                                     executionMetrics: {
                                       startedAt: new Date(startTime || endTime - 900000),
                                       completedAt: new Date(endTime),
                                       totalElapsedMs: elapsedMs,
                                       actualDurationMinutes: actualMinutes,
                                       actualDistanceKm: latest.totalDistanceKm || (routeResult.summary?.distance ? Math.round((routeResult.summary.distance / 1000) * 10) / 10 : 0),
                                       completedStopsCount: completedCount,
                                       failedStopsCount: failedCount,
                                       totalStopsCount: totalStopsCount,
                                       completionRatePercent: Math.round((completedCount / totalStopsCount) * 100),
                                       punctualityRatePercent: actualMinutes <= plannedMinutes * 1.15 ? 100 : Math.max(50, Math.round((1 - (actualMinutes - plannedMinutes) / (plannedMinutes || 1)) * 100)),
                                       timeDeviationMinutes: actualMinutes - plannedMinutes,
                                       fuelConsumedLiters: latest.calculatedRoute?.estimatedFuelLiters || 0,
                                       fuelCostTotal: latest.calculatedRoute?.estimatedFuelCost || 0
                                     }
                                   });
                                   setActualRouteEndTime(endTime);
                                   setTotalElapsedMs(elapsedMs);

                                   setCompletedSummaryData({
                                     startTimeStr: new Date(startTime || endTime - 900000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                                     endTimeStr: new Date(endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                                     elapsedMs,
                                     elapsedFormatted: formatSecondsToClock(Math.floor(elapsedMs / 1000)),
                                     estimatedDurationFormatted: formatSecondsToClock(Math.round(routeResult.summary?.duration || 0)),
                                     estimatedMinutes: Math.round((routeResult.summary?.duration || 0) / 60),
                                     actualMinutes: Math.round(elapsedMs / 60000),
                                     totalStops: routeResult.sequence.length,
                                     completedCount,
                                     failedCount,
                                     totalDistanceKm: (routeResult.summary?.distance ? (routeResult.summary.distance / 1000).toFixed(1) : (routeResult.distance ? (routeResult.distance / 1000).toFixed(1) : '18.4')),
                                     vehicle: options.vehicle || 'van',
                                     score: routeResult.score || 95
                                   });
                                   setShowRouteCompletedModal(true);
                                 }
                               } catch (err) {
                                 console.error("Erro salvando falha final no Dexie:", err);
                               }
                               setNavIndex(0);
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
              <KpiDashboard 
                activeRoute={routeResult} 
                onLoadRouteToPlanner={handleLoadSavedRoute} 
                onNavigateBack={() => setCurrentScreen('home')}
                currentVehicle={options.vehicle as any}
                onVehicleChange={(v) => setOptions(prev => ({ ...prev, vehicle: v as any }))}
              />
            </motion.div>
          )}

          {currentScreen === 'history' && (
            <motion.div 
              key="history" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full"
            >
              <RouteHistoryView 
                onLoadRouteToPlanner={handleLoadSavedRoute} 
                onNavigateToPlanner={() => setCurrentScreen('home')}
              />
            </motion.div>
          )}

          {currentScreen === 'settings' && (
            <motion.div 
              key="settings" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar ${isMobile ? 'px-4 pt-20 pb-28' : 'p-12 pb-28'}`}
            >
              <div className="max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto w-full">
                {/* Top Corner Back Button */}
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('home')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 hover:border-tech/40 text-xs font-bold transition-all cursor-pointer shadow-sm group active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4 text-tech group-hover:-translate-x-0.5 transition-transform" />
                    <span>Voltar ao Menu Principal</span>
                  </button>
                </div>

                <h1 className="text-4xl font-bold font-display mb-8">Preferências</h1>
                
                <div className="space-y-8">
                  {/* 🔮 TUTORIAL GUIADO DE OPERAÇÃO DO APP */}
                  <div className="bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-tech/35 p-6 sm:p-8 rounded-[32px] shadow-[0_0_30px_rgba(209,160,84,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-tech/10 blur-3xl rounded-full pointer-events-none" />
                    
                    <div className="flex items-start gap-4 mb-5">
                      <div className="p-3 bg-tech/10 rounded-2xl text-tech shrink-0 mt-1">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black tracking-widest text-tech uppercase">Guia Interativo de Operação</span>
                        <h2 className="text-xl font-bold font-display text-white mt-0.5">Tutorial Guiado de Funcionalidades</h2>
                        <p className="text-xs text-slate-400 mt-1">
                          Aprenda a operar todas as funções do HARPIA em 5 passos práticos.
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed mb-6">
                      <p>
                        Este tutorial interativo guiará você por todas as telas do aplicativo em uma jornada prática e direta, utilizando um exemplo real de rota com paradas em <strong>Manaus-AM</strong>:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 font-sans mt-2">
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                          <span className="text-tech font-bold shrink-0">1. Cadastro de Paradas</span>
                          <span className="text-slate-400 text-[10.5px]">Endereços detalhados e janelas de horário</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                          <span className="text-tech font-bold shrink-0">2. Frota & Custos</span>
                          <span className="text-slate-400 text-[10.5px]">Veículos e configuração de consumo</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                          <span className="text-tech font-bold shrink-0">3. Otimização VRP</span>
                          <span className="text-slate-400 text-[10.5px]">Matriz de rotas, IA e clima regional</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                          <span className="text-tech font-bold shrink-0">4. GPS & Offline</span>
                          <span className="text-slate-400 text-[10.5px]">Navegação por voz e ocorrências</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-white/5 sm:col-span-2">
                          <span className="text-tech font-bold shrink-0">5. Comprovante & Painel</span>
                          <span className="text-slate-400 text-[10.5px]">Comprovante de entrega (POD), histórico e métricas</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setShowAccessibleTutorial(true);
                        setCurrentScreen('home');
                      }}
                      className="w-full sm:w-auto bg-tech text-slate-950 font-black text-xs px-6 py-4 rounded-2xl uppercase tracking-wider hover:brightness-110 hover:shadow-[0_0_15px_rgba(209,160,84,0.3)] active:scale-95 transition-all text-center cursor-pointer flex items-center justify-center gap-2 font-sans"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Iniciar Tutorial Passo a Passo Visual e Acessível
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
              className="bg-slate-900 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl w-full max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] overflow-hidden flex flex-col"
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

      {/* 🔮 TUTORIAL ULTRA-ACESSÍVEL DE FUNCIONAMENTO DO APP (COM DESTAQUE E PREENCHIMENTO ATIVO) */}
      <AccessibleTutorialGuide
        isOpen={showAccessibleTutorial}
        onClose={() => {
          setShowAccessibleTutorial(false);
        }}
        onStepChange={(stepIdx) => {
          if (stepIdx <= 3) {
            if (currentScreen !== 'home') setCurrentScreen('home');
          }
        }}
        onFillDemoData={(stepIdx) => {
          const demoOrigin = 'Av. Torquato Tapajós, 2200 - Flores, Manaus - AM';
          const demoStopsList = [
            'Av. Torquato Tapajós, 2200 - Flores, Manaus - AM',
            'Av. Noel Nutels, 1762 - Cidade Nova, Manaus - AM',
            'Av. Djalma Batista, 482 - Parque 10, Manaus - AM',
            'Rua Marquês de Santa Cruz, 25 - Centro, Manaus - AM'
          ];

          if (stepIdx === 0) {
            if (currentScreen !== 'home') setCurrentScreen('home');
            setAddresses(prev => {
              const next = [...prev];
              next[0] = demoOrigin;
              return next;
            });
            setResolvedCoords(prev => ({
              ...prev,
              [demoOrigin]: { lat: -3.0355, lon: -60.0125 }
            }));
          } else if (stepIdx === 1) {
            if (currentScreen !== 'home') setCurrentScreen('home');
            setAddresses(demoStopsList);
            setStopIds([crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()]);
            setTimeWindows({
              1: { start: '08:30', end: '10:30' },
              2: { start: '11:00', end: '13:00' },
              3: { start: '14:30', end: '16:30' }
            });
            setResolvedCoords(prev => ({
              ...prev,
              [demoStopsList[0]]: { lat: -3.0355, lon: -60.0125 },
              [demoStopsList[1]]: { lat: -3.0248, lon: -59.9678 },
              [demoStopsList[2]]: { lat: -3.1025, lon: -60.0278 },
              [demoStopsList[3]]: { lat: -3.1312, lon: -60.0268 }
            }));
          } else if (stepIdx === 2) {
            if (currentScreen !== 'home') setCurrentScreen('home');
            setOptions(prev => ({
              ...prev,
              vehicle: 'van',
              avoidFloods: true,
              avoidDirt: true,
              priority: 'balanced'
            }));
          } else if (stepIdx === 3) {
            if (currentScreen !== 'home') setCurrentScreen('home');
          } else if (stepIdx === 4) {
            // Trigger calculation to showcase navigation map and active telemetry
            if (!routeResult) {
              runOptimization(demoStopsList);
            } else {
              setCurrentScreen('navigation');
            }
          } else if (stepIdx === 5) {
            // Show saved route & proof of delivery capabilities
          }
        }}
      />


      
      <AnimatePresence>
        {showHybridModal && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl w-full shadow-2xl relative overflow-hidden text-white"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-tech/10 blur-3xl rounded-full pointer-events-none" />
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-tech/10 border border-tech/30 flex items-center justify-center text-tech mb-1 shadow-[0_0_20px_rgba(209,160,84,0.3)]">
                  <Ship className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold font-display text-white">Rota Multimodal Detectada</h2>
                <p className="text-xs text-slate-300">
                  Esta rota integra trecho terrestre até o porto, travessia fluvial por embarcação e trecho terrestre final.
                </p>

                {/* Etapas */}
                <div className="w-full bg-slate-950/60 rounded-2xl p-3.5 text-left space-y-2.5 border border-slate-800 text-xs">
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-300"><strong>Etapa 1:</strong> Terrestre (Origem → Porto de Embarque)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Ship className="w-4 h-4 text-tech shrink-0 animate-pulse" />
                    <span className="text-slate-300"><strong>Etapa 2:</strong> Fluvial (Porto → Porto via Lancha/Balsa)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-300"><strong>Etapa 3:</strong> Terrestre (Porto → Destino Final)</span>
                  </div>
                </div>

                {/* Plantão Fluvial em Tempo Real com Busca Grounded */}
                <div className="w-full bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-3.5 text-left text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Status Fluvial & Portos
                    </span>
                    <span className="text-[9px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">Google Search</span>
                  </div>

                  {isFetchingFluvialBulletin ? (
                    <div className="py-3 flex items-center gap-2 text-slate-400 text-xs font-mono">
                      <RefreshCw className="w-3.5 h-3.5 text-tech animate-spin" />
                      <span>Consultando condições dos rios, balsas e atracadouros...</span>
                    </div>
                  ) : fluvialBulletin ? (
                    <div className="space-y-2">
                      <p className="text-slate-200 text-[11px] leading-relaxed font-medium">
                        {fluvialBulletin.bulletin}
                      </p>
                      {fluvialBulletin.groundingSources && fluvialBulletin.groundingSources.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-800/80 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[9px] text-slate-400 uppercase font-bold">Fontes da Busca:</span>
                          {fluvialBulletin.groundingSources.map((src: any, idx: number) => (
                            <a
                              key={idx}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9.5px] text-tech underline hover:text-white transition-colors truncate max-w-[140px] inline-block"
                              title={src.title}
                            >
                              {src.title || `Notícia ${idx + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px]">Condições fluviais monitoradas. Portos e atracadouros operacionais.</p>
                  )}
                </div>

                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setShowHybridModal(false)}
                    className="py-3 px-4 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setShowHybridModal(false);
                      setOptions(prev => ({ 
                        ...prev, 
                        isHybrid: true,
                        avoidFloods: fluvialBulletin?.hasIncident ? true : prev.avoidFloods 
                      }));
                      setTimeout(() => runOptimization(), 100);
                    }}
                    className="flex-1 py-3 bg-tech text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(209,160,84,0.4)] hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Ship className="w-4 h-4" />
                    <span>{fluvialBulletin?.hasIncident ? 'Gerar Rota Fluvial Alternativa' : 'Gerar Rota Híbrida'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showRerouteAnalysisModal && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl w-full shadow-2xl relative overflow-hidden text-white"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Zap className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-display text-white">Análise de Trânsito & Alertas</h2>
                    <p className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">Busca em Tempo Real · Google Grounding</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRerouteAnalysisModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isCheckingReroute ? (
                <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
                  <RefreshCw className="w-8 h-8 text-tech animate-spin" />
                  <p className="text-xs font-bold text-slate-300">Consultando motores de busca em tempo real sobre ocorrências e interdições na rota...</p>
                  <span className="text-[10px] text-slate-500 font-mono">Pesquisando alertas de trânsito, acidentes e clima...</span>
                </div>
              ) : rerouteAnalysisResult ? (
                <div className="space-y-4">
                  {rerouteAnalysisResult.hasIncident ? (
                    <div className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-2xl flex items-start gap-3 text-rose-200 text-xs">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <strong className="text-rose-300 uppercase font-black tracking-wider block mb-0.5">Alerta de Ocorrência Detectado!</strong>
                        <span>Foram reportados problemas recentes (alagamento/acidente/interdição) no trecho. Recomenda-se recalcular a rota para segurança.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-emerald-950/50 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-emerald-200 text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-emerald-300 uppercase font-black tracking-wider block mb-0.5">Trecho Fluído sem Bloqueios Graves</strong>
                        <span>O monitoramento em tempo real não indicou paralisações críticas na via neste instante.</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
                    <p className="font-medium">{rerouteAnalysisResult.bulletin}</p>
                  </div>

                  {rerouteAnalysisResult.groundingSources && rerouteAnalysisResult.groundingSources.length > 0 && (
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Fontes de Notícias / Trânsito Grounded:</span>
                      <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                        {rerouteAnalysisResult.groundingSources.map((src: any, idx: number) => (
                          <a
                            key={idx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-tech underline hover:text-white transition-colors truncate flex items-center gap-1.5"
                          >
                            <Globe className="w-3 h-3 text-tech shrink-0" />
                            <span className="truncate">{src.title || src.uri}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                    <button
                      onClick={() => {
                        setShowRerouteAnalysisModal(false);
                        setOptions(prev => ({
                          ...prev,
                          avoidFloods: true,
                          customPrompt: (prev.customPrompt || '') + ' Evitar trecho com acidentes e alagamentos reportados recentemente.'
                        }));
                        setTimeout(() => runOptimization(), 100);
                      }}
                      className="flex-1 py-3 bg-tech text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(209,160,84,0.4)] hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Recalcular Rota</span>
                    </button>
                    <button
                      onClick={() => handleRequestLiveRerouteCheck()}
                      className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      title="Atualizar busca agora"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-tech" />
                      <span>Re-checar</span>
                    </button>
                    <button
                      onClick={() => setShowRerouteAnalysisModal(false)}
                      className="py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Manter
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Start Vehicle Profile Selection Modal */}
      <AnimatePresence>
        {showQuickStartModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
            <QuickStartVehicleProfile
              currentProfile={vehicleProfile}
              onSelectProfile={(prof) => {
                setVehicleProfile(prof);
                if (prof === 'packages') {
                  setOptions(prev => ({ ...prev, vehicle: 'van' }));
                } else if (prof === 'food_delivery') {
                  setOptions(prev => ({ ...prev, vehicle: 'moto' }));
                } else if (prof === 'services') {
                  setOptions(prev => ({ ...prev, vehicle: 'van' }));
                } else if (prof === 'sales') {
                  setOptions(prev => ({ ...prev, vehicle: 'car' }));
                }
                setShowQuickStartModal(false);
              }}
              onClose={() => setShowQuickStartModal(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Route Details (Partida, Destino, Pausa) Modal */}
      <RouteDetailsModal
        isOpen={showRouteDetailsModal}
        onClose={() => setShowRouteDetailsModal(false)}
        startAddress={addresses[0] || ''}
        onUseCurrentLocation={handleUseCurrentGpsAsOrigin}
        startTime={routeStartTime}
        onUpdateStartTime={(t) => setRouteStartTime(t)}
        endAddress={routeEndAddress}
        onUpdateEndAddress={(addr) => setRouteEndAddress(addr)}
        endTime={routeEndTime}
        onUpdateEndTime={(t) => setRouteEndTime(t)}
        hasPause={routeHasPause}
        onTogglePause={(hp) => setRouteHasPause(hp)}
        pauseDurationMinutes={routePauseMinutes}
        onUpdatePauseDuration={(m) => setRoutePauseMinutes(m)}
        onSaveAsDefault={(save) => {
          if (save) {
            setApiWarning("Parâmetros de rota (partida, destino e pausas) salvos como padrão de operação.");
          }
          setShowRouteDetailsModal(false);
        }}
      />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .glass { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
      `}</style>
    </div>
  );
}
