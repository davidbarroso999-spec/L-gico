'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AlertTriangle, 
  Waves, 
  Anchor, 
  Compass, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  ChevronUp, 
  X, 
  ShieldAlert, 
  ArrowUpRight, 
  Activity, 
  Info,
  Navigation,
  Gauge
} from 'lucide-react';
import { 
  checkFluvialHazards, 
  FluvialHazardDetection, 
  FLUVIAL_SANDBANKS 
} from '@/lib/fluvial-engine';

export interface FluvialNavigationAlertProps {
  currentCoords: [number, number] | null; // [lat, lon]
  currentHeading?: number; // vessel heading in degrees
  travelMonth?: number;
  vesselDraftMeters?: number; // calado da embarcação (default ~2.0m)
  isSimulating?: boolean;
  onAdjustTalvegue?: (targetBearingDeg: number, advice: string) => void;
  className?: string;
  forceTestHazard?: 'sandbank' | 'extreme_low_gauge' | 'repiquete' | null;
}

// Web Audio API Synthesizer for Nautical Sonar Radar Ping
const playSonarPing = (isCritical = false) => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const freq = isCritical ? 920 : 640;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isCritical ? 1150 : 800, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.36);
  } catch (e) {
    console.warn("Sonar audio unavailable:", e);
  }
};

export default function FluvialNavigationAlert({
  currentCoords,
  currentHeading = 0,
  travelMonth,
  vesselDraftMeters = 2.2,
  isSimulating = false,
  onAdjustTalvegue,
  className = '',
  forceTestHazard = null
}: FluvialNavigationAlertProps) {
  const [dismissedAlertKey, setDismissedAlertKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [demoHazardMode, setDemoHazardMode] = useState<'none' | 'sandbank' | 'low_gauge' | 'repiquete'>('none');
  const lastSoundRef = useRef<number>(0);

  // Computa a detecção de perigo fluvial em tempo real
  const hazardData: FluvialHazardDetection = useMemo(() => {
    // Se estiver em modo de teste forçado ou demo manual
    const activeTest = forceTestHazard || (demoHazardMode !== 'none' ? demoHazardMode : null);
    
    if (activeTest === 'sandbank') {
      const demoSb = FLUVIAL_SANDBANKS[0]; // Banco da Ponta Negra
      return {
        inFluvialZone: true,
        closestSandbank: {
          sandbank: demoSb,
          distanceMeters: 450,
          bearingDegrees: 135,
          depthEstimatedMeters: 1.9,
          isImminentCollision: true,
          isWarningZone: true
        },
        riverGauge: {
          levelMeters: 12.8,
          criticalThresholdMeters: 14.0,
          status: 'vazante_extrema',
          statusLabel: 'Estiagem Severa (Cota 12.8m) - Talvegue Obrigatório',
          trend24h: '-22cm nas últimas 24h',
          dailyVariationCm: -22,
          depthAtLocationMeters: 1.9,
          isExtremeLow: true,
          isExtremeHigh: false
        },
        recommendedAction: 'REDUZA VELOCIDADE IMEDIATAMENTE e guine para boreste (rumo 145°) em direção ao canal profundo do Rio Negro.',
        talvegueAdvice: 'Canal de águas profundas homologado pela Capitania dos Portos a 350m no rumo 145°.',
        hasActiveAlert: true,
        alertType: 'sandbank',
        alertSeverity: 'danger',
        alertTitle: '🚨 ALERTA CRÍTICO: Banco de Areia a 450m',
        alertMessage: 'Aproximação iminente do Banco da Ponta Negra / Praia da Lua. Ecobatímetro registrando 1.9m de lâmina d\'água (Calado: 2.2m). Alto risco de encalhe de hélices!'
      };
    }

    if (activeTest === 'low_gauge' || activeTest === 'extreme_low_gauge') {
      return {
        inFluvialZone: true,
        riverGauge: {
          levelMeters: 12.4,
          criticalThresholdMeters: 14.0,
          status: 'vazante_extrema',
          statusLabel: 'Estiagem Crítica Histórica (12.4m)',
          trend24h: '-19cm nas últimas 24h',
          dailyVariationCm: -19,
          depthAtLocationMeters: 3.4,
          isExtremeLow: true,
          isExtremeHigh: false
        },
        recommendedAction: 'Navegação permitida exclusivamente dentro da calha do talvegue. Velocidade reduzida recomendada.',
        talvegueAdvice: 'Proibido desviar do canal principal para evitar pontais arenosos submersos.',
        hasActiveAlert: true,
        alertType: 'extreme_low_gauge',
        alertSeverity: 'danger',
        alertTitle: '🚨 ESTIAGEM SEVERA: Cota Fluvial Crítica (12.4m)',
        alertMessage: 'Nível da bacia abaixo da cota mínima de segurança (14.0m). Risco de encalhe em toda a orla fora do talvegue principal.'
      };
    }

    if (activeTest === 'repiquete') {
      return {
        inFluvialZone: true,
        riverGauge: {
          levelMeters: 16.5,
          criticalThresholdMeters: 14.0,
          status: 'repiquete_severo',
          statusLabel: 'Repiquete Negativo Acentuado (-26cm/dia)',
          trend24h: '-26cm nas últimas 24h',
          dailyVariationCm: -26,
          depthAtLocationMeters: 4.8,
          isExtremeLow: false,
          isExtremeHigh: false
        },
        recommendedAction: 'Atenção aos bancos móveis e recuo repentino de margem nas áreas de atracadouro.',
        talvegueAdvice: 'Evite aproximação de margens rasas sem ecobatímetro ativo.',
        hasActiveAlert: true,
        alertType: 'repiquete',
        alertSeverity: 'warning',
        alertTitle: '⚠️ ALERTA DE REPIQUETE: Queda Abrupta (-26cm/24h)',
        alertMessage: 'Sensores registram retração acelerada da cota do rio. Bancos de sedimentos podem surgir rapidamente nos acessos aos portos.'
      };
    }

    if (!currentCoords) {
      // Retorna estado neutro
      return checkFluvialHazards(-3.1410, -60.0260, travelMonth, vesselDraftMeters);
    }

    return checkFluvialHazards(currentCoords[0], currentCoords[1], travelMonth, vesselDraftMeters);
  }, [currentCoords, travelMonth, vesselDraftMeters, forceTestHazard, demoHazardMode]);

  const currentAlertKey = hazardData.alertTitle + (hazardData.closestSandbank?.sandbank.id || '');
  const isDismissed = dismissedAlertKey === currentAlertKey;

  // Se o perigo for crítico, toca som do sonar
  useEffect(() => {
    if (hazardData.hasActiveAlert && hazardData.alertSeverity === 'danger') {
      const now = Date.now();
      if (soundEnabled && now - lastSoundRef.current > 7000) {
        lastSoundRef.current = now;
        playSonarPing(true);
      }
    }
  }, [hazardData.hasActiveAlert, hazardData.alertSeverity, soundEnabled]);

  // Se não houver coordenadas ou não estiver em zona fluvial e nem em teste, esconde
  if (!hazardData.inFluvialZone && !forceTestHazard && demoHazardMode === 'none') {
    return null;
  }

  // Se o usuário dispensou o banner (mas permite reabrir via chip flutuante)
  if (isDismissed && hazardData.hasActiveAlert) {
    return (
      <button
        onClick={() => setDismissedAlertKey(null)}
        className="absolute top-20 right-4 z-[1050] bg-slate-950/90 hover:bg-slate-900 border border-amber-500/50 text-amber-400 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-[11px] font-bold flex items-center gap-2 cursor-pointer animate-pulse transition-all"
        title="Reabrir Alerta de Navegação Fluvial"
      >
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <Waves className="w-3.5 h-3.5" />
        <span>Alerta Náutico Ativo ({hazardData.alertType === 'sandbank' ? 'Banco de Areia' : 'Cota Crítica'})</span>
      </button>
    );
  }

  // Não tem alerta ativo e não está em demo
  if (!hazardData.hasActiveAlert && demoHazardMode === 'none' && !forceTestHazard) {
    return null;
  }

  const isDanger = hazardData.alertSeverity === 'danger';
  const isWarning = hazardData.alertSeverity === 'warning';
  
  // Cores dinâmicas de acordo com a severidade
  const borderTone = isDanger 
    ? 'border-red-500/60 shadow-[0_12px_40px_rgba(239,68,68,0.35)]' 
    : isWarning 
      ? 'border-amber-500/60 shadow-[0_12px_40px_rgba(245,158,11,0.25)]' 
      : 'border-cyan-500/50 shadow-[0_12px_40px_rgba(6,182,212,0.2)]';

  const badgeBg = isDanger ? 'bg-red-500/20 text-red-300 border-red-500/40' : isWarning ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';

  const sb = hazardData.closestSandbank;
  const relativeBearing = sb ? (sb.bearingDegrees - currentHeading + 360) % 360 : 0;

  return (
    <aside
      aria-label="Alerta de Navegação Fluvial"
      className={`absolute top-20 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-[1050] bg-slate-950/95 backdrop-blur-2xl border ${borderTone} rounded-3xl p-4 text-white transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${className}`}
    >
      {/* Header do Alerta */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${badgeBg} relative overflow-hidden`}>
            {/* Animação de radar pulse */}
            <div className={`absolute inset-0 rounded-2xl opacity-40 animate-ping ${isDanger ? 'bg-red-500' : 'bg-amber-500'}`} />
            {isDanger ? (
              <ShieldAlert className="w-5 h-5 text-red-400 relative z-10 animate-bounce" />
            ) : isWarning ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 relative z-10" />
            ) : (
              <Waves className="w-5 h-5 text-cyan-400 relative z-10" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-tech flex items-center gap-1">
                <Anchor className="w-3 h-3" />
                Sonar Fluvial • Hidrologia AM
              </span>
              {isDanger && (
                <span className="bg-red-600 text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full animate-pulse">
                  CRÍTICO
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-white truncate">
              {hazardData.alertTitle.replace(/^[🚨⚠️🌊]\s*/, '')}
            </h4>
          </div>
        </div>

        {/* Controles de Som e Fechar */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playSonarPing(isDanger);
            }}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              soundEnabled 
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:text-white' 
                : 'bg-slate-900/50 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Silenciar alertas de sonar' : 'Ativar avisos sonoros de sonar'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-tech" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setDismissedAlertKey(currentAlertKey)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            title="Ocultar temporariamente"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Conteúdo Principal: Radar & Ecobatímetro */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Radar Sonar Visual (Se houver banco de areia) */}
        {sb && (
          <div className="sm:col-span-4 flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/80 border border-slate-800/80 relative overflow-hidden">
            <div className="relative w-20 h-20 rounded-full border border-cyan-500/30 flex items-center justify-center bg-cyan-950/20">
              {/* Círculos de Distância do Sonar */}
              <div className="absolute inset-1 rounded-full border border-cyan-500/20" />
              <div className="absolute inset-3 rounded-full border border-cyan-500/25" />
              <div className="absolute inset-5 rounded-full border border-cyan-500/30" />
              
              {/* Linhas de Mira Ortogonal */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-px bg-cyan-500/20" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-full w-px bg-cyan-500/20" />
              </div>

              {/* Varredura Giratória do Radar */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-cyan-400/20 to-transparent animate-spin-slow pointer-events-none" />

              {/* Ícone da Embarcação no Centro */}
              <div className="w-3.5 h-3.5 rounded-full bg-tech border border-white flex items-center justify-center z-10 shadow-[0_0_8px_rgba(209,160,84,0.8)]">
                <Navigation className="w-2.5 h-2.5 text-slate-950 rotate-45 fill-current" />
              </div>

              {/* Blip do Banco de Areia */}
              {sb && (
                <div 
                  className="absolute w-3 h-3 rounded-full bg-red-500 border border-white animate-ping"
                  style={{
                    top: `${50 - Math.cos((relativeBearing * Math.PI) / 180) * 32}%`,
                    left: `${50 + Math.sin((relativeBearing * Math.PI) / 180) * 32}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={`Banco de areia a ${sb.distanceMeters}m`}
                />
              )}
            </div>

            <div className="mt-1.5 flex items-center justify-between w-full text-[9px] font-mono text-slate-400">
              <span>Rumo: {sb.bearingDegrees}°</span>
              <span className="text-red-400 font-bold">{sb.distanceMeters}m</span>
            </div>
          </div>
        )}

        {/* Telemetria de Calado e Cota */}
        <div className={sb ? 'sm:col-span-8 space-y-2' : 'sm:col-span-12 space-y-2'}>
          <p className="text-[11.5px] leading-relaxed text-slate-300">
            {hazardData.alertMessage}
          </p>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            {/* Lâmina d'água atual */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1.5">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Profundidade</span>
              <span className={`font-mono text-sm font-bold leading-tight ${hazardData.riverGauge.depthAtLocationMeters <= vesselDraftMeters ? 'text-red-400 animate-pulse' : 'text-cyan-300'}`}>
                {hazardData.riverGauge.depthAtLocationMeters}m
              </span>
            </div>

            {/* Cota do Rio */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1.5">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Cota do Rio</span>
              <span className="font-mono text-sm font-bold text-white leading-tight">
                {hazardData.riverGauge.levelMeters}m
              </span>
            </div>

            {/* Variação 24h */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-1.5">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Variação 24h</span>
              <span className={`font-mono text-[11px] font-bold leading-tight ${hazardData.riverGauge.dailyVariationCm < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {hazardData.riverGauge.trend24h.split(' ')[0]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ação Imediata de Talvegue */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="text-[11px] text-amber-200/90 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{hazardData.talvegueAdvice}</span>
        </div>

        {sb && onAdjustTalvegue && (
          <button
            onClick={() => {
              playSonarPing(false);
              onAdjustTalvegue(sb.sandbank.talvegueDeviationBearingDeg, hazardData.talvegueAdvice);
            }}
            className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-slate-950 font-black text-[10.5px] uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Corrigir pelo Talvegue
          </button>
        )}
      </div>

      {/* Drawer de Detalhes Hidrológicos Expansível */}
      <div className="mt-2.5">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-[10px] uppercase font-black tracking-wider text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 py-1 transition-colors cursor-pointer"
        >
          <span>{isExpanded ? 'Recolher Telemetria Hidroviária' : 'Ver Boletim Hidrológico Completo'}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {isExpanded && (
          <div className="mt-2 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-[11px] text-slate-300 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <span className="text-slate-400">Status Operacional:</span>
              <span className="font-bold text-tech">{hazardData.riverGauge.statusLabel}</span>
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <span className="text-slate-400">Calado de Segurança:</span>
              <span className="font-bold text-white">Mínimo {vesselDraftMeters}m (Margem +0.5m)</span>
            </div>

            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <span className="text-slate-400">Recomendação do Capitão:</span>
              <span className="font-bold text-amber-300 text-right">{hazardData.recommendedAction}</span>
            </div>

            {sb && (
              <div className="pt-1 text-[10px] text-slate-400 leading-relaxed">
                <span className="text-amber-400 font-bold block mb-0.5">Nota sobre {sb.sandbank.name}:</span>
                {sb.sandbank.description}
              </div>
            )}

            {/* Teste de Demonstração Interativo */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-1 text-[9px]">
              <span className="text-slate-500 font-bold uppercase">Simulação:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDemoHazardMode('sandbank')}
                  className={`px-2 py-0.5 rounded border ${demoHazardMode === 'sandbank' ? 'bg-red-500 text-white border-red-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                >
                  Banco Areia
                </button>
                <button
                  onClick={() => setDemoHazardMode('low_gauge')}
                  className={`px-2 py-0.5 rounded border ${demoHazardMode === 'low_gauge' ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                >
                  Seca Crítica
                </button>
                <button
                  onClick={() => setDemoHazardMode('none')}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
