'use client';

import React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { MapPin, Clock, AlertTriangle, ChevronRight, CheckCircle2, Navigation, Anchor, Sparkles, Shield, Leaf, Zap, ArrowLeft, TrendingUp, ArrowRightLeft, FileText, Fuel, Activity, ShoppingBag, DollarSign, Globe, RefreshCw, Eye } from 'lucide-react';
import { RouteStop } from '@/lib/route-engine';
import { useIsMobile } from '@/hooks/use-mobile';
import { fetchExternalScoutData } from '@/lib/api-services';

interface SidebarProps {
  stops: RouteStop[];
  summary: { distance: number, duration: number, vehicle?: string };
  score: number;
  aiAnalysis?: string;
  hybridAnalysis?: any;
  onNavigate: () => void;
  isLoading: boolean;
  onShowInvoice?: (idx: number) => void;
  
  // Optional Simulation Mode props
  isSimulating?: boolean;
  onStartSimulation?: () => void;
  onStopSimulation?: () => void;
  simulatedResults?: Record<string, any>;
  isCalculatingSim?: string | null;
  activeSimProfile?: string | null;
  onSimulateProfile?: (profile: 'speed' | 'distance' | 'economy' | 'safety' | 'balanced') => void;
  onApplyRoute?: (route: any) => void;
}

export default function Sidebar({ 
  stops, 
  summary, 
  score, 
  aiAnalysis, 
  hybridAnalysis,
  onNavigate, 
  isLoading,
  onShowInvoice,
  
  isSimulating = false,
  onStartSimulation,
  onStopSimulation,
  simulatedResults = {},
  isCalculatingSim = null,
  activeSimProfile = null,
  onSimulateProfile,
  onApplyRoute
}: SidebarProps) {
  const isMobile = useIsMobile();

  const [scoutData, setScoutData] = React.useState<any>(null);
  const [scouting, setScouting] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    
    if (stops.length === 0) {
      setTimeout(() => {
        if (isMounted) setScoutData(null);
      }, 0);
      return;
    }
    
    const loadScout = async () => {
      setTimeout(() => {
        if (isMounted) setScouting(true);
      }, 0);
      
      const totalDist = summary.distance / 1000;
      const label = stops[1]?.address || 'Manaus';
      const vehicle = stops[0]?.fluvialPort ? 'boat' : 'van';
      const res = await fetchExternalScoutData(totalDist, 0, vehicle, label);
      
      if (isMounted) {
        setScoutData(res);
        setScouting(false);
      }
    };
    loadScout();
    return () => { isMounted = false; };
  }, [stops, summary.distance]);

  const calculateTripMetrics = (route: any) => {
    if (!route || !route.summary) return { distanceKm: 0, durationStr: '0m', fuelLiters: 0, fuelCost: 0, riskPercent: 0, riskLabel: 'Mínimo' };

    const distanceKm = route.summary.distance / 1000;
    
    // Format Duration safely
    const mins = Math.floor(route.summary.duration / 60);
    const hrs = Math.floor(mins / 60);
    const durationStr = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;

    // Base consumption in L/100km by vehicle type
    const vehicle = route.vehicle || 'van';
    let baseConsumption = 12.0; // Default: van
    if (vehicle === 'moto') baseConsumption = 2.8;
    else if (vehicle === 'car') baseConsumption = 7.5;
    else if (vehicle === 'truck') baseConsumption = 26.0;
    else if (vehicle === 'boat') baseConsumption = 34.0;

    // Profile inflation factor
    const priority = route.priority || 'balanced';
    let profileFactor = 1.0;
    if (priority === 'speed') profileFactor = 1.15;
    else if (priority === 'distance') profileFactor = 1.05;
    else if (priority === 'economy') profileFactor = 0.88;
    else if (priority === 'balanced') profileFactor = 0.95;

    const fuelLiters = Math.round((distanceKm / 100) * baseConsumption * profileFactor * 10) / 10;
    const fuelCost = Math.round(fuelLiters * 5.85);

    const riskPercent = Math.round(Math.max(0, Math.min(100, 100 - route.score)));
    let riskLabel = 'Baixo';
    if (riskPercent > 40) riskLabel = 'Alto';
    else if (riskPercent > 20) riskLabel = 'Moderado';

    return {
      distanceKm: parseFloat(distanceKm.toFixed(1)),
      durationStr,
      fuelLiters,
      fuelCost,
      riskPercent,
      riskLabel
    };
  };

  const getSimWinners = () => {
    let bestDist = { profile: '', value: Infinity };
    let bestTime = { profile: '', value: Infinity };
    let bestFuel = { profile: '', value: Infinity };
    let bestRisk = { profile: '', value: Infinity };

    if (!simulatedResults) return { bestDist: '', bestTime: '', bestFuel: '', bestRisk: '' };

    Object.entries(simulatedResults).forEach(([prof, res]: [string, any]) => {
      const metrics = calculateTripMetrics(res);
      const secs = res.summary?.duration || Infinity;
      
      if (metrics.distanceKm > 0 && metrics.distanceKm < bestDist.value) {
        bestDist = { profile: prof, value: metrics.distanceKm };
      }
      if (secs > 0 && secs < bestTime.value) {
        bestTime = { profile: prof, value: secs };
      }
      if (metrics.fuelLiters > 0 && metrics.fuelLiters < bestFuel.value) {
        bestFuel = { profile: prof, value: metrics.fuelLiters };
      }
      if (metrics.riskPercent >= 0 && metrics.riskPercent < bestRisk.value) {
        bestRisk = { profile: prof, value: metrics.riskPercent };
      }
    });

    return {
      bestDist: bestDist.profile,
      bestTime: bestTime.profile,
      bestFuel: bestFuel.profile,
      bestRisk: bestRisk.profile
    };
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=900');
    if (!printWindow) {
      alert("Por favor, habilite a permissão para janelas pop-up para gerar o relatório em PDF.");
      return;
    }

    const todayStr = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Manaus',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const distanceKm = (summary.distance / 1000).toFixed(1);
    
    // Formatting duration
    const mins = Math.floor(summary.duration / 60);
    const hrs = Math.floor(mins / 60);
    const durationStr = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;

    const riskPercent = Math.round(Math.max(0, Math.min(100, 100 - score)));
    let riskLabel = 'BAIXO';
    let riskColor = 'text-green-600 bg-green-50 border-green-200';
    if (riskPercent > 40) {
      riskLabel = 'CRÍTICO';
      riskColor = 'text-rose-600 bg-rose-50 border-rose-250 font-bold';
    } else if (riskPercent > 20) {
      riskLabel = 'MODERADO';
      riskColor = 'text-amber-600 bg-amber-50 border-amber-200';
    }

    // Identify high risk stops
    const highRiskStops = stops.filter(s => s.riskScore > 35);
    // Identify ports
    const ports = stops.filter(s => s.fluvialPort);

    // Build Stops rows
    const stopsRows = stops.map((stop, idx) => {
      const stopRisk = Math.round(stop.riskScore);
      let stopRiskBadge = 'Baixo';
      let stopRiskColor = 'text-green-600';
      if (stopRisk > 40) {
        stopRiskBadge = 'Alto';
        stopRiskColor = 'text-red-650 font-bold';
      } else if (stopRisk > 20) {
        stopRiskBadge = 'Médio';
        stopRiskColor = 'text-amber-600';
      }

      return `
        <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
          <td class="py-3 px-3">
            <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
              \${idx + 1}
            </span>
          </td>
          <td class="py-3 px-2 font-medium text-slate-800 text-xs">
            \${stop.address}
            \${stop.fluvialPort ? \`
              <div class="mt-1 inline-flex items-center gap-1 text-[9px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase">
                ⚓ \${stop.fluvialPort}
              </div>
            \` : ''}
          </td>
          <td class="py-3 px-2 text-xs font-mono text-slate-600">\${stop.estimatedArrival || 'N/A'}</td>
          <td class="py-3 px-2 text-xs text-slate-500">\${stop.timeWindow ? \`\${stop.timeWindow.start} - \${stop.timeWindow.end}\` : 'Livre'}</td>
          <td class="py-3 px-2 text-xs font-mono \${stopRiskColor}">\${stopRisk}% (\${stopRiskBadge})</td>
          <td class="py-3 px-2 text-[11px] text-slate-500">\${Math.round(stop.elevation || 0)}m</td>
        </tr>
      `;
    }).join('');

    // Formulating dynamic safety observations
    let safetyBulletPoints = '';
    
    // 1. Overall risk score
    if (riskPercent > 40) {
      safetyBulletPoints += `
        <li class="flex items-start gap-2.5">
          <span class="text-rose-600 font-bold mt-0.5 text-sm">⚠️</span>
          <div>
            <strong class="text-rose-950 font-bold">ALERTA DE SEGURANÇA MÁXIMA (RISCO CRÍTICO):</strong> 
            Esta rota passa por múltiplos pontos sensíveis na região do Amazonas com classificação de risco elevada (\${riskPercent}%). 
            Evite paradas noturnas. Recomenda-se comboio policial ou escolta armada nos trechos mapeados.
          </div>
        </li>
      `;
    } else if (riskPercent > 20) {
      safetyBulletPoints += `
        <li class="flex items-start gap-2.5">
          <span class="text-amber-500 font-bold mt-0.5 text-sm">⚠️</span>
          <div>
            <strong class="text-amber-950">RECOMENDAÇÃO DE ATENÇÃO MODERADA:</strong> 
            Nível médio de risco (\${riskPercent}%). Mantenha as portas e janelas trancadas nos pontos urbanos periféricos. 
            Não estacione em acostamentos sem fiscalização oficial ou em trechos isolados da BR-319 sem sinal de celular.
          </div>
        </li>
      `;
    } else {
      safetyBulletPoints += `
        <li class="flex items-start gap-2.5">
          <span class="text-green-600 font-bold mt-0.5 text-sm">✓</span>
          <div>
            <strong class="text-green-950">RISCO DENTRO DA NORMALIDADE:</strong> 
            Índice de risco calculado baixo (\${riskPercent}%). Prossiga mantendo as normas padrão de trânsito fluvial e terrestre e respeitando os limites de velocidade nas vias secundárias de Manaus.
          </div>
        </li>
      `;
    }

    // 2. Ports/Ferry warnings
    if (ports.length > 0) {
      safetyBulletPoints += `
        <li class="flex items-start gap-2.5">
          <span class="text-sky-600 font-bold mt-0.5 text-sm">⚓</span>
          <div>
            <strong class="text-sky-950">PROTOCOLO DE TRAVESSIA FLUVIAL / BALSA (\${ports.length} portos):</strong> 
            Há paradas conectadas a portos e balsas fluviais (\${ports.map(p => p.fluvialPort).join(', ')}). 
            Embarque o veículo com extrema cautela. Certifique-se de prender os cabos de suspensão e acionar o freio de estacionamento mecânico no convés da balsa. Monitore as variações de maré fluvial e vento no Rio Negro/Solimões.
          </div>
        </li>
      `;
    }

    // 3. High risk stops specified
    if (highRiskStops.length > 0) {
      safetyBulletPoints += `
        <li class="flex items-start gap-2.5">
          <span class="text-amber-600 font-bold mt-0.5 text-sm">📍</span>
          <div>
            <strong class="text-amber-950">ZONAS DE EXPEDIENTE MONITORADO:</strong> 
            Os seguintes pontos de descarga possuem índices altos de sinistralidade: 
            <ul class="list-disc pl-5 mt-1 text-slate-600 space-y-0.5 text-[10.5px]">
              \${highRiskStops.map(s => \`<li>\${s.address} (Risco: \${Math.round(s.riskScore)}%)</li>\`).join('')}
            </ul>
            Nestes locais, realize o descarregamento o mais rápido possível e reduza tempos ociosos com motor ligado.
          </div>
        </li>
      `;
    }

    const printHTML = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Harpia Itinerário Logístico - ${todayStr}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
          tailwind.config = {
            theme: {
              extend: {
                fontFamily: {
                  sans: ['Inter', 'sans-serif'],
                  mono: ['JetBrains Mono', 'monospace'],
                }
              }
            }
          }
        </script>
        <style>
          @media print {
            body { background: white; color: black; }
            .no-print { display: none !important; }
            .print-break-inside-none { page-break-inside: avoid; }
            @page {
              size: A4 portrait;
              margin: 1.2cm;
            }
          }
        </style>
      </head>
      <body class="bg-neutral-50 min-h-screen py-10 px-5 font-sans leading-relaxed text-slate-800">
        <div class="max-w-4xl mx-auto bg-white border border-gray-200 shadow-xl rounded-2xl p-8 sm:p-12 relative overflow-hidden" id="printable-area">
          
          <!-- NO-PRINT floating print button on top -->
          <div class="no-print absolute top-4 right-4 flex gap-2">
            <button onclick="window.print()" class="bg-[#D1A054] text-slate-950 font-black text-xs uppercase cursor-pointer hover:brightness-110 transition px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-md">
              🖨️ Imprimir / Salvar como PDF
            </button>
            <button onclick="window.close()" class="bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer hover:bg-slate-300 transition px-3 py-2.5 rounded-lg">
              Fechar Aba
            </button>
          </div>

          <!-- Decorative Harpia Watermark Header decoration -->
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start border-b border-gray-200 pb-6 mb-8 gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1.5 font-sans">
                <span class="text-xl font-extrabold text-slate-900 tracking-wider">🦅 HARPIA</span>
                <span class="text-[9px] bg-slate-900 text-[#D1A054] font-mono font-bold tracking-widest uppercase px-1.5 py-0.5 rounded">
                  LOGISTICS CO.
                </span>
              </div>
              <h1 class="text-xl font-extrabold text-slate-900 tracking-tight">RESUMO TÉCNICO INTERNO DA ROTA</h1>
              <p class="text-[11px] text-slate-400 font-mono tracking-tight mt-0.5">SISTEMA INTEGRADO DE PLANEJAMENTO E EXPEDIÇÃO DA AMAZÔNIA</p>
            </div>
            <div class="sm:text-right font-mono text-[10.5px] text-slate-500">
              <p>📍 Emissão: <strong>Manaus, AM</strong></p>
              <p>📅 Data: <strong>${todayStr}</strong></p>
              <p>🆔 Ref: <span class="bg-gray-100 px-1 border border-gray-200 text-slate-700 text-[10px] font-bold rounded">HRP-LN-${Math.floor(1000 + Math.random() * 9000)}-AM</span></p>
            </div>
          </div>

          <!-- KPI Metrics Boxes -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
              <span class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Distância Estimada</span>
              <div>
                <span class="text-lg font-black text-slate-900">${distanceKm}</span>
                <span class="text-xs text-slate-500 font-medium ml-0.5">km</span>
              </div>
            </div>
            <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
              <span class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Previsão Tempo</span>
              <div>
                <span class="text-lg font-black text-slate-900">${durationStr}</span>
              </div>
            </div>
            <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
              <span class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total de Paradas</span>
              <div>
                <span class="text-lg font-black text-slate-900">${stops.length}</span>
                <span class="text-xs text-slate-500 font-medium ml-0.5">locais</span>
              </div>
            </div>
            <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
              <span class="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Risco de Tráfego</span>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="px-2 py-0.5 text-[10px] rounded-md font-extrabold border ${riskColor}">
                  ${riskLabel} (${riskPercent}%)
                </span>
              </div>
            </div>
          </div>

          <!-- AI Tactical Analysis Brief -->
          ${aiAnalysis ? `
            <div class="mb-8 p-4 bg-slate-50 border border-slate-200/60 rounded-xl">
              <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Análise de Diretrizes - IA Harpia</h4>
              <p class="text-xs text-slate-700 italic leading-relaxed font-sans font-medium">"${aiAnalysis}"</p>
            </div>
          ` : ''}

          <!-- Itinerary Stops List -->
          <div class="mb-8">
            <h3 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider border-b border-gray-100 pb-2.5 mb-4 flex items-center gap-1.5">
              <span>📋 SEQUÊNCIA E ITINERÁRIO DO MOTORISTA</span>
            </h3>
            
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-gray-100">
                    <th class="py-2.5 px-3 w-12 text-center">Nº</th>
                    <th class="py-2.5 px-2">Local/Endereço de Entrega</th>
                    <th class="py-2.5 px-2 w-20">ETA Previsto</th>
                    <th class="py-2.5 px-2 w-28">Janela Segura</th>
                    <th class="py-2.5 px-2 w-28">Risco Local</th>
                    <th class="py-2.5 px-2 w-16">Altitude</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  ${stopsRows}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Security Observations Advisory Block -->
          <div class="mb-10 print-break-inside-none">
            <div class="bg-amber-50/25 border border-amber-200/80 rounded-xl p-5">
              <h3 class="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
                🛡️ MANUAL DE SEGURANÇA E DIRETRIZES DE EMBARQUE
              </h3>
              
              <ul class="text-[11.5px] text-slate-700 space-y-3">
                ${safetyBulletPoints}
                <li class="flex items-start gap-2.5">
                  <span class="text-blue-600 font-bold mt-0.5 text-sm">💡</span>
                  <div>
                    <strong class="text-blue-950">APLICATIVO DE NAVEGAÇÃO ONLINE:</strong> 
                    Este resumo foi gerado a partir de dados geográficos em tempo real. O condutor deve manter o GPS ligado e consultar o botão 'Navegação' no painel Harpia para atualizações instantâneas de obstrução de vias ou emergência.
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <!-- Handshake Agreement Checkoff Signature Block -->
          <div class="grid grid-cols-2 gap-12 mt-12 border-t border-gray-150 pt-10 text-center print-break-inside-none">
            <div class="flex flex-col items-center">
              <div class="w-48 h-px bg-gray-300 mb-2"></div>
              <p class="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Assinatura do Despachante</p>
              <p class="text-[9px] text-slate-400 font-mono mt-0.5">Logística Harpia Amazônica</p>
            </div>
            <div class="flex flex-col items-center">
              <div class="w-48 h-px bg-gray-300 mb-2"></div>
              <p class="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Assinatura do Condutor</p>
              <p class="text-[9px] text-slate-400 font-mono mt-0.5">Transportador Autorizado</p>
            </div>
          </div>

          <!-- Footer Metadata -->
          <div class="mt-14 pt-4 border-t border-gray-100 text-center text-[9px] text-gray-400 font-mono tracking-tight flex flex-col sm:flex-row sm:justify-between items-center gap-2">
            <span>Tecnologia Baseada no Hórus Inteligente Amazônico</span>
            <span>Ref: HRP-SEC-A-2026</span>
            <span>Folha 1 de 1</span>
          </div>

        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
  };

  const renderSimulationPanel = () => {
    const winners = getSimWinners();
    const activeRoute = activeSimProfile && simulatedResults ? simulatedResults[activeSimProfile] : null;
    const activeMetrics = activeRoute ? calculateTripMetrics(activeRoute) : null;

    const profilesList = [
      { id: 'balanced', name: 'Equilibrado', desc: 'Pondera tempo, consumo e segurança', icon: Anchor, color: 'text-sky-400 bg-sky-500/10 border-sky-500/25', leadBadge: winners.bestRisk === 'balanced' ? '🏆 Equilibrado' : '' },
      { id: 'speed', name: 'Rápido', desc: 'Evita lentidões, focado no menor tempo', icon: Zap, color: 'text-amber-450 bg-amber-500/10 border-amber-500/25', leadBadge: winners.bestTime === 'speed' ? '⚡ Mais Rápida' : '' },
      { id: 'distance', name: 'Curto', desc: 'Traçado seco com menor metragem', icon: MapPin, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25', leadBadge: winners.bestDist === 'distance' ? '📏 Mais Curta' : '' },
      { id: 'economy', name: 'Econômico', desc: 'Evita declives pesados e acelerações', icon: Leaf, color: 'text-emerald-455 bg-emerald-500/10 border-emerald-500/25', leadBadge: winners.bestFuel === 'economy' ? '🍃 Mais Econômica' : '' },
      { id: 'safety', name: 'Seguro', desc: 'Desvia de áreas alagadas ou perigosas', icon: Shield, color: 'text-rose-455 bg-rose-500/10 border-rose-500/25', leadBadge: winners.bestRisk === 'safety' ? '🛡️ Mais Segura' : '' },
    ];

    return (
      <div className="flex flex-col h-full bg-slate-950 font-sans p-5 select-text overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Back header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <button
            onClick={onStopSimulation}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Sair da Simulação
          </button>
          <span className="text-[10px] bg-tech/15 text-tech font-extrabold px-2 py-0.5 rounded uppercase font-mono">
            Modo Simulação
          </span>
        </div>

        {/* Info card */}
        <div className="mb-4 bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
          <h3 className="text-sm font-black text-white mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-tech animate-pulse" />
            Simulador de Perfis Logix
          </h3>
          <p className="text-[11px] text-slate-400 leading-normal">
            Selecione perfis para recalcular e comparar. Veja as métricas de tempo, distância, combustível e riscos antes de atualizar o traçado oficial.
          </p>
        </div>

        {/* Profiles Grid Selector */}
        <div className="space-y-2 mb-4">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Perfis Disponíveis</label>
          <div className="grid grid-cols-1 gap-2">
            {profilesList.map((p) => {
              const isSelected = activeSimProfile === p.id;
              const isCalculating = isCalculatingSim === p.id;
              const hasResult = simulatedResults && !!simulatedResults[p.id];
              const resultMetrics = hasResult ? calculateTripMetrics(simulatedResults[p.id]) : null;
              
              return (
                <button
                  key={p.id}
                  onClick={() => onSimulateProfile?.(p.id as any)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                    isSelected 
                      ? 'bg-slate-900 border-tech shadow-md' 
                      : 'bg-slate-900/45 border-slate-850 hover:border-slate-755 hover:bg-slate-900/80 cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${p.color}`}>
                        <p.icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-100">{p.name}</span>
                        <p className="text-[9.5px] text-slate-400 truncate line-clamp-1 mt-0.5">{p.desc}</p>
                      </div>
                    </div>
                    {isCalculating ? (
                      <span className="text-[9px] text-tech font-bold font-mono animate-pulse">Calculando...</span>
                    ) : isSelected ? (
                      <span className="w-4 h-4 rounded-full bg-tech text-slate-950 flex items-center justify-center text-[9px] font-black">✓</span>
                    ) : hasResult ? (
                      <span className="text-[9px] text-slate-450 font-bold font-mono">Pronto</span>
                    ) : (
                      <span className="text-[9.5px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-850 hover:text-tech select-none">Toque p/ simular</span>
                    )}
                  </div>
                  
                  {resultMetrics && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{resultMetrics.distanceKm} km</span>
                      <span>·</span>
                      <span>{resultMetrics.durationStr}</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-bold">{resultMetrics.fuelLiters}L</span>
                      <span>·</span>
                      <span className={`font-bold ${resultMetrics.riskPercent > 35 ? 'text-alert' : resultMetrics.riskPercent > 20 ? 'text-warning' : 'text-tech'}`}>
                        Risco: {resultMetrics.riskPercent}%
                      </span>
                    </div>
                  )}

                  {/* Badges for winners */}
                  {hasResult && (
                    <div className="flex gap-1.5 flex-wrap mt-1.5">
                      {winners.bestTime === p.id && (
                        <span className="text-[8.5px] font-extrabold uppercase bg-amber-500/10 text-amber-405 px-2 py-0.5 rounded border border-amber-500/20">🚀 Mais Rápida</span>
                      )}
                      {winners.bestDist === p.id && (
                        <span className="text-[8.5px] font-extrabold uppercase bg-indigo-500/10 text-indigo-405 px-2 py-0.5 rounded border border-indigo-500/20">📏 Mais Curta</span>
                      )}
                      {winners.bestFuel === p.id && (
                        <span className="text-[8.5px] font-extrabold uppercase bg-emerald-500/10 text-emerald-405 px-2 py-0.5 rounded border border-emerald-500/20">🍃 Mais Econômica</span>
                      )}
                      {winners.bestRisk === p.id && (
                        <span className="text-[8.5px] font-extrabold uppercase bg-sky-500/10 text-sky-405 px-2 py-0.5 rounded border border-sky-500/20">🛡️ Mais Segura</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Route Analytics Comparisons and apply button */}
        {activeRoute && activeMetrics ? (
          <div className="mt-2 space-y-3 shrink-0">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-[9.5px] font-black uppercase text-tech tracking-wider font-mono">Visualização e Mapeamento</span>
              <h4 className="text-sm font-black text-white mt-0.5 mb-3">Traçado Simulado: {profilesList.find(p => p.id === activeSimProfile)?.name}</h4>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Distância Total</p>
                  <p className="text-sm font-black text-slate-200 mt-0.5">{activeMetrics.distanceKm} km</p>
                </div>
                <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">ETA Estimado</p>
                  <p className="text-sm font-black text-slate-200 mt-0.5">{activeMetrics.durationStr}</p>
                </div>
                <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Consumo Previsto</p>
                  <p className="text-sm font-black text-emerald-400 mt-0.5">{activeMetrics.fuelLiters} L</p>
                </div>
                <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl">
                  <p className="text-[9px] text-slate-500 font-bold uppercase">Risco de Trajeto</p>
                  <p className={`text-sm font-black mt-0.5 ${activeMetrics.riskPercent > 35 ? 'text-alert' : activeMetrics.riskPercent > 20 ? 'text-warning' : 'text-tech'}`}>
                    {activeMetrics.riskPercent}% ({activeMetrics.riskLabel})
                  </p>
                </div>
              </div>

              {/* Compare with the initial calculation (the baseline!) */}
              {(() => {
                const baseline = calculateTripMetrics({ summary, score, vehicle: activeRoute.vehicle, priority: stops[0]?.status ? 'balanced' : 'balanced' });
                // Let's compute delta
                const distSavings = parseFloat((baseline.distanceKm - activeMetrics.distanceKm).toFixed(1));
                const fuelSavings = parseFloat((baseline.fuelLiters - activeMetrics.fuelLiters).toFixed(1));
                const riskSavings = baseline.riskPercent - activeMetrics.riskPercent;
                
                return (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-850/60 text-[10.5px]">
                    <span className="font-bold text-slate-400 uppercase text-[9px] block mb-1">Diferença em relação à Rota Inicial:</span>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 font-mono text-slate-350">
                      <div>Distância: <span className={distSavings > 0 ? 'text-emerald-400 font-bold' : distSavings < 0 ? 'text-alert font-bold' : 'text-slate-400'}>{distSavings > 0 ? `-${distSavings}km` : distSavings < 0 ? `+${Math.abs(distSavings)}km` : '0km'}</span></div>
                      <div>Consumo: <span className={fuelSavings > 0 ? 'text-emerald-400 font-bold' : fuelSavings < 0 ? 'text-alert font-bold' : 'text-slate-400'}>{fuelSavings > 0 ? `-${fuelSavings}L` : fuelSavings < 0 ? `+${Math.abs(fuelSavings)}L` : '0L'}</span></div>
                      <div>Custo Comb.: <span className={fuelSavings > 0 ? 'text-emerald-400 font-bold' : fuelSavings < 0 ? 'text-alert font-bold' : 'text-slate-400'}>{fuelSavings > 0 ? `-R$ ${Math.round(fuelSavings * 5.85)}` : fuelSavings < 0 ? `+R$ ${Math.round(Math.abs(fuelSavings) * 5.85)}` : 'R$ 0'}</span></div>
                      <div>Risco: <span className={riskSavings > 0 ? 'text-emerald-405 font-bold' : riskSavings < 0 ? 'text-alert font-bold' : 'text-slate-400'}>{riskSavings > 0 ? `-${riskSavings}%` : riskSavings < 0 ? `+${Math.abs(riskSavings)}%` : '0%'}</span></div>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={() => onApplyRoute?.(activeRoute)}
                className="w-full mt-4 bg-tech text-slate-950 font-black py-3.5 rounded-2xl flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(209,160,84,0.35)] hover:brightness-110 active:scale-[0.98] transition-all text-xs uppercase"
              >
                Seguir esta Rota Simulação
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-900/10 rounded-2xl border border-dashed border-slate-850 py-10 mt-2">
            <TrendingUp className="w-8 h-8 text-slate-700 animate-pulse mb-3" />
            <p className="text-xs font-bold text-slate-400">Nenhum perfil carregado</p>
            <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto leading-relaxed mt-1">
              Toque em qualquer perfil acima para recalcular o percurso e iniciar a simulação comparativa.
            </p>
          </div>
        )}
      </div>
    );
  };

  const [snapState, setSnapState] = React.useState<'expanded' | 'mid' | 'collapsed'>('mid');
  const [windowHeight, setWindowHeight] = React.useState(800);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        setWindowHeight(window.innerHeight);
      }, 0);
      const handleResize = () => setWindowHeight(window.innerHeight);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const drawerHeight = windowHeight * 0.75; // 75vh
  const collapsedY = drawerHeight - 85;     // 85px visible
  const midY = drawerHeight - 340;          // 340px visible

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

  const toggleSnapState = () => {
    if (snapState === 'collapsed') {
      setSnapState('mid');
    } else if (snapState === 'mid') {
      setSnapState('expanded');
    } else {
      setSnapState('collapsed');
    }
  };

  if (isMobile) {
    const activeYValue = snapState === 'expanded' ? 0 : snapState === 'mid' ? midY : collapsedY;

    return (
      <motion.div 
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: collapsedY }}
        dragElastic={0.15}
        onDragEnd={(e, info) => {
          const deltaY = info.offset.y;
          const velocityY = info.velocity.y;
          
          if (snapState === 'expanded') {
            if (deltaY > 180 || velocityY > 350) {
              setSnapState('collapsed');
            } else if (deltaY > 40 || velocityY > 120) {
              setSnapState('mid');
            }
          } else if (snapState === 'mid') {
            if (deltaY < -40 || velocityY < -120) {
              setSnapState('expanded');
            } else if (deltaY > 40 || velocityY > 120) {
              setSnapState('collapsed');
            }
          } else if (snapState === 'collapsed') {
            if (deltaY < -185 || velocityY < -350) {
              setSnapState('expanded');
            } else if (deltaY < -40 || velocityY < -120) {
              setSnapState('mid');
            }
          }
        }}
        initial={false}
        animate={{ y: activeYValue }}
        transition={{ type: "spring", damping: 28, stiffness: 220 }}
        className="fixed bottom-0 left-0 right-0 max-w-[100vw] overflow-x-hidden z-[2000] flex flex-col bg-slate-950/95 border-t border-slate-800/80 rounded-t-[32px] backdrop-blur-xl shadow-[0_-15px_40px_rgba(0,0,0,0.7)] h-[75vh]"
      >
        {isSimulating ? (
          <div className="flex-1 overflow-hidden">
            {renderSimulationPanel()}
          </div>
        ) : (
          <>
            {/* Mobile Header indicator & touch drag handle */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              onClick={toggleSnapState}
              className="flex flex-col items-center py-3 cursor-grab active:cursor-grabbing select-none touch-none shrink-0 border-b border-white/5 bg-slate-950/40 hover:bg-slate-900/35 transition-colors"
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-700/80 mb-2.5" />
              <div className="flex justify-between items-center w-full px-6">
                <div className="flex flex-col text-left">
                  <span className="text-[9px] text-tech font-black uppercase tracking-widest font-mono">
                    Voie Express • Rota
                  </span>
                  <h2 className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                    Resumo Otimizado 
                    <span className={`text-[9px] px-1.5 py-0.5 rounded bg-tech/15 text-tech font-bold font-mono`}>
                      Score: {Math.round(score)}
                    </span>
                  </h2>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-xs text-tech font-black font-mono">
                    {(summary.distance / 1000).toFixed(1)} km
                  </span>
                  <span className="text-[10px] text-slate-450 font-bold">
                    {formatTime(summary.duration)}
                  </span>
                </div>
              </div>
            </div>

            {/* Swipe Panel Content area */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
              
              {/* Middle snapState panel section */}
              <AnimatePresence mode="wait">
                {snapState === 'mid' && (
                  <motion.div
                    key="mid-panel-nav"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="px-6 py-4 flex flex-col gap-4 h-full select-none justify-between"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Quick details */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
                          <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Início</p>
                          <p className="text-xs font-bold text-slate-350 truncate mt-0.5">
                            {stops[0]?.address || 'Manaus, AM'}
                          </p>
                        </div>
                        <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
                          <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Destino Final</p>
                          <p className="text-xs font-bold text-slate-350 truncate mt-0.5">
                            {stops[stops.length - 1]?.address || 'Manaus, AM'}
                          </p>
                        </div>
                      </div>

                      {/* AI strategic quote summary */}
                      {aiAnalysis && (
                        <div className="p-3 bg-tech/5 border border-tech/10 rounded-2xl relative overflow-hidden">
                          <span className="text-[9px] uppercase tracking-wider font-extrabold text-tech flex items-center gap-1.5 mb-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-tech" />
                            Recomendação Ativa
                          </span>
                          <p className="text-[10px] text-slate-300 leading-normal italic line-clamp-2">
                            &quot;{aiAnalysis}&quot;
                          </p>
                        </div>
                      )}

                      {/* AI Hybrid Multi-Engine routing analysis */}
                      {hybridAnalysis && hybridAnalysis.active && (
                        <div className="p-3 bg-gradient-to-br from-slate-950 to-slate-900 border border-tech/20 rounded-2xl relative overflow-hidden">
                          <p className="text-[9px] uppercase tracking-widest font-black text-tech mb-1 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-tech animate-pulse" />
                            Motor Híbrido com IA
                          </p>
                          <p className="text-[10px] text-slate-300 leading-relaxed line-clamp-2">
                            {hybridAnalysis.description}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Mobile action button for mid snapState */}
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={onNavigate}
                        className="w-full bg-tech hover:brightness-110 active:scale-[0.98] transition-all text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_22px_rgba(209,160,84,0.35)] cursor-pointer text-xs uppercase tracking-wider"
                        disabled={stops.length === 0}
                      >
                        <Navigation className="w-4 h-4 fill-current animate-pulse" />
                        Iniciar Navegação ({stops.length} Paradas)
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {onStartSimulation && (
                        <button
                          onClick={() => {
                            setSnapState('expanded');
                            onStartSimulation();
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-tech hover:text-white py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider font-extrabold transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-tech" />
                          Simular Perfis de Rota
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expanded snapState panel section */}
              <AnimatePresence mode="wait">
                {snapState === 'expanded' && (
                  <motion.div 
                    key="expanded-panel-nav"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 overflow-hidden flex flex-col min-h-0 relative h-full bg-slate-950/30"
                  >
                    {/* AI strategic directive */}
                    {aiAnalysis && (
                      <div className="px-6 pt-3 pb-1 shrink-0">
                        <div className="p-3.5 bg-tech/5 border border-tech/10 rounded-2xl relative overflow-hidden">
                          <p className="text-[9px] uppercase tracking-widest font-black text-tech mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-tech animate-pulse" />
                            Diretiva Estratégica
                          </p>
                          <p className="text-[11px] text-slate-300 leading-relaxed italic">
                            &quot;{aiAnalysis}&quot;
                          </p>
                        </div>
                      </div>
                    )}

                    {/* AI Hybrid Multi-Engine routing analysis */}
                    {hybridAnalysis && hybridAnalysis.active && (
                      <div className="px-6 pt-2 pb-1 shrink-0">
                        <div className="p-3.5 bg-gradient-to-br from-slate-950 to-slate-900 border border-tech/25 rounded-2xl relative overflow-hidden">
                          <p className="text-[9px] uppercase tracking-widest font-black text-tech mb-1.5 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-tech animate-pulse" />
                            Motor Híbrido com IA Ativo
                          </p>
                          <p className="text-[10.5px] text-slate-300 leading-relaxed">
                            {hybridAnalysis.description}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Standard steps/stops overview list */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pb-28 custom-scrollbar select-text">
                      <p className="text-[10px] font-black text-slate-500 mb-3.5 uppercase tracking-widest mt-1">
                        Mapeamento das Paradas ({stops.length})
                      </p>
                      
                      <div className="space-y-3.5">
                        {stops.map((stop, idx) => (
                          <div
                            key={stop.id}
                            className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl"
                          >
                            <div className="flex gap-3 text-left">
                              {stop.status === 'completed' ? (
                                <div className="w-6 h-6 rounded-full bg-tech/20 border border-tech text-tech flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                                  ✓
                                </div>
                              ) : stop.status === 'failed' ? (
                                <div className="w-6 h-6 rounded-full bg-alert/20 border border-alert text-alert flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                                  ✕
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black border border-slate-700 text-slate-300 shrink-0 mt-0.5">
                                  {idx + 1}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5 gap-2">
                                  <p className="font-bold text-slate-100 text-xs truncate leading-tight">{stop.address}</p>
                                  {stop.riskScore > 20 && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                                  )}
                                </div>
                                {(summary?.vehicle === 'boat' && stop.fluvialPort) && (
                                  <div className="mb-2 mt-1 flex items-center gap-1.5 text-[9.5px] font-bold text-sky-400 bg-sky-950/40 border border-sky-900/40 px-2 py-0.5 rounded w-fit uppercase font-mono">
                                    <Anchor className="w-3.5 h-3.5 text-sky-450 shrink-0" />
                                    {stop.fluvialPort}
                                  </div>
                                )}
                                
                                {stop.invoice && (
                                  <div className="mt-1.5 mb-2 bg-slate-950/50 border border-slate-800/80 rounded-xl p-2.5 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <span className="text-[9px] font-black uppercase text-tech tracking-wider flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5 text-tech shrink-0 animate-pulse" />
                                        {stop.invoice.valor ? 'NFe Vinculada' : 'DANFE Anexada'}
                                      </span>
                                      {stop.invoice.valor !== undefined && (
                                        <span className="text-[10px] font-bold text-emerald-450 font-mono">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stop.invoice.valor || 0)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[9px] text-slate-400 truncate font-sans">
                                      {stop.invoice.destinatario ? `Dest: ${stop.invoice.destinatario}` : `Chave: ${stop.invoice.key}`}
                                    </div>
                                    {onShowInvoice && (
                                      <button
                                        type="button"
                                        onClick={() => onShowInvoice(parseInt(stop.id))}
                                        className="w-full text-center py-1 bg-tech/10 hover:bg-tech/20 border border-tech/25 rounded-lg text-[9px] font-black uppercase tracking-wider text-tech mt-1 transition-all cursor-pointer h-7 flex items-center justify-center gap-1"
                                      >
                                        <Eye className="w-3 h-3 text-tech shrink-0" /> Visualizar Nota
                                      </button>
                                    )}
                                  </div>
                                )}
                                
                                {stop.status === 'completed' && (
                                  <div className="mb-1 text-[9px] font-bold text-tech bg-tech/10 border border-tech/20 px-1.5 py-0.5 rounded uppercase w-fit font-sans">
                                    ✓ Entregue com Sucesso
                                  </div>
                                )}
                                {stop.status === 'failed' && (
                                  <div className="mb-2 flex flex-col gap-0.5">
                                    <span className="inline-block w-fit text-[9px] font-bold text-alert bg-alert/10 border border-alert/20 px-1.5 py-0.5 rounded uppercase font-sans">
                                      ✕ Falha na Entrega: {stop.failureReason}
                                    </span>
                                    {stop.deliveryNotes && (
                                      <p className="text-[9px] text-slate-400 italic font-sans animate-fade">Obs: {stop.deliveryNotes}</p>
                                    )}
                                  </div>
                                )}

                                {/* Hydrographic & Fluvial Matrix Card */}
                                {(summary?.vehicle === 'boat' && stop.amazonasHydrology) && (
                                  <div className="mt-2.5 p-2.5 bg-cyan-950/20 border border-cyan-800/40 rounded-xl space-y-1.5 text-[9.5px]">
                                    <div className="flex items-center justify-between text-cyan-300 font-extrabold uppercase tracking-wider text-[9px]">
                                      <span className="flex items-center gap-1">
                                        <Anchor className="w-3 h-3 text-cyan-400 shrink-0" />
                                        Monitor Hidrográfico Fluvial
                                      </span>
                                      <span className="bg-cyan-950 px-1.5 py-0.5 rounded text-[8.5px] border border-cyan-800/40">
                                        {stop.amazonasHydrology.season === 'cheia' ? 'Cheia Plena' : 'Vazante'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 font-mono text-[9px]">
                                      <div className="bg-slate-950/60 p-1 rounded border border-slate-800/80">
                                        <span className="text-slate-500 block text-[8px]">Cota Rio:</span>
                                        <span className="text-cyan-300 font-bold">{stop.amazonasHydrology.riverLevelMeters || 26.2}m</span>
                                      </div>
                                      <div className="bg-slate-950/60 p-1 rounded border border-slate-800/80">
                                        <span className="text-slate-500 block text-[8px]">Correnteza:</span>
                                        <span className="text-cyan-300 font-bold">{stop.amazonasHydrology.currentSpeedKnots || 3.8} nós</span>
                                      </div>
                                    </div>
                                    {stop.amazonasHydrology.vesselDraftStatus && (
                                      <p className="text-slate-300 leading-tight text-[8.5px]">
                                        <strong>Calado/Talvegue:</strong> {stop.amazonasHydrology.vesselDraftStatus}
                                      </p>
                                    )}
                                    {stop.amazonasHydrology.forecast24h && (
                                      <p className="text-cyan-200/90 leading-tight text-[8.5px] italic">
                                        <strong>Previsão 24h:</strong> {stop.amazonasHydrology.forecast24h}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
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
                                {(summary?.vehicle === 'boat' && stop.amazonasHydrology) && (
                                  <div className="mt-2 text-[9px] py-1.5 px-2.5 rounded-xl border flex flex-col gap-0.5 bg-sky-950/25 border-sky-700/20 text-sky-300">
                                    <span className="font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                                      Climatologia AM: {stop.amazonasHydrology.seasonLabel}
                                    </span>
                                    <p className="text-[9px] text-slate-350 leading-relaxed font-sans">{stop.amazonasHydrology.warning}</p>
                                  </div>
                                )}

                                {/* Weather info */}
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
                                    <span className="capitalize font-medium text-[9px] text-slate-450">
                                      {stop.weather?.weather[0].description || 'N/A'}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-black text-white bg-tech/5 px-1.5 py-0.2 rounded border border-tech/10">
                                    {Math.round(stop.weather?.main.temp || 0)}°C
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sticky primary action docked bottom trigger */}
                    <div className="px-6 py-4 border-t border-slate-900 bg-slate-950 shrink-0 absolute bottom-0 left-0 right-0 z-10 flex flex-col gap-2">
                      <button 
                        onClick={onNavigate}
                        className="w-full bg-tech hover:brightness-110 active:scale-[0.98] transition-all text-slate-950 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(209,160,84,0.3)] cursor-pointer text-xs uppercase tracking-wider font-sans font-extrabold"
                      >
                        <Navigation className="w-4 h-4 fill-current" />
                        Iniciar Rota ({stops.length} Paradas)
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {onStartSimulation && (
                        <button
                          onClick={onStartSimulation}
                          className="w-full bg-slate-900 border border-slate-850 text-tech hover:text-white py-2.5 rounded-2xl flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-wider font-extrabold transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-tech" />
                          Simular Perfis de Rota
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col glass overflow-hidden h-full">
      {isSimulating ? (
        renderSimulationPanel()
      ) : (
        <>
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
              Análise da Rota
            </p>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              &quot;{aiAnalysis}&quot;
            </p>
          </motion.div>
        )}

        {/* AI Hybrid Multi-Engine routing analysis */}
        {hybridAnalysis && hybridAnalysis.active && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-4 bg-gradient-to-br from-slate-950 to-slate-900 border border-tech/25 rounded-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-3 opacity-5">
              <Zap className="w-8 h-8 text-tech animate-pulse" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-extrabold text-tech mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-tech animate-bounce" />
              Fusão Híbrida de IA
            </p>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {hybridAnalysis.description}
            </p>
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>Provedor Ativo: <strong className="text-slate-350">{hybridAnalysis.primaryEngine}</strong></span>
              <span>Google + ORS</span>
            </div>
          </motion.div>
        )}

        <div className="flex flex-col gap-2.5 mt-4 md:mt-6">
          <button 
            onClick={onNavigate}
            className="w-full bg-tech hover:brightness-110 active:scale-[0.98] transition-all text-slate-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_5px_22px_rgba(209,160,84,0.3)] text-xs uppercase tracking-wider font-extrabold cursor-pointer"
            disabled={stops.length === 0}
          >
            <Navigation className="w-4 h-4 fill-current animate-pulse" />
            Iniciar Navegação ({stops.length} Paradas)
            <ChevronRight className="w-4 h-4" />
          </button>

          {onStartSimulation && (
            <button
              onClick={onStartSimulation}
              className="w-full bg-slate-900 border border-slate-800 text-tech hover:bg-slate-850 hover:text-white py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-tech animate-bounce" />
              Simular Perfis de Rota
            </button>
          )}

          <button
            type="button"
            onClick={handleExportPDF}
            className="w-full bg-slate-900/60 border border-slate-800/80 text-slate-300 hover:bg-slate-850/80 hover:text-white py-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider font-extrabold transition-all cursor-pointer"
            disabled={stops.length === 0}
          >
            <FileText className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
            Exportar Rota (PDF)
          </button>
        </div>
      </div>

      {/* Stop List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
        {/* Radar de Combustível e Cotações do Scout Externo */}
        {stops.length > 0 && (
          <div className="mb-6 p-4.5 rounded-2xl border border-slate-800 bg-slate-900/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Fuel className="w-10 h-10 text-tech" />
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <Fuel className="w-5 h-5 text-tech" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Radar de Combustível & Scout</h3>
            </div>

            {scouting ? (
              <div className="py-4 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-tech" />
                <span>Sincronizando cotações externas...</span>
              </div>
            ) : scoutData ? (
              <div className="space-y-3.5">
                {/* Consumo Calculado */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Consumo Estimado</span>
                    <p className="text-sm font-black text-white mt-0.5">{scoutData.calculatedConsumption?.liters || 0} L</p>
                    <span className="text-[9.5px] text-slate-450 font-mono">Méd. {scoutData.baseConsumption}L/100km</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Custo Financeiro</span>
                    <p className="text-sm font-black text-tech mt-0.5">R$ {scoutData.calculatedConsumption?.cost?.toFixed(2) || '0.00'}</p>
                    <span className="text-[9.5px] text-slate-450 font-mono">Preço ref: R$ {scoutData.selectedPrice?.toFixed(2)}/L</span>
                  </div>
                </div>

                {/* Inteligência de Mercado */}
                {scoutData.intelligence && (
                  <div className="text-[11px] leading-relaxed text-slate-300 bg-slate-950/30 p-2.5 rounded-xl border border-dashed border-slate-850">
                    <span className="font-extrabold text-tech block mb-0.5">💡 INTELIGÊNCIA LOGÍSTICA:</span>
                    {scoutData.intelligence}
                  </div>
                )}

                {/* Tabela de Preços de Combustível no AM */}
                <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 text-[10px]">
                  <span className="font-bold text-slate-400 block mb-1">Média dos Combustíveis (ANP AM):</span>
                  <div className="grid grid-cols-4 gap-1 text-center font-mono">
                    <div>
                      <div className="text-slate-500">Gasolina</div>
                      <div className="font-bold text-slate-300">R$ {scoutData.fuelPrices?.gasolina?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Diesel</div>
                      <div className="font-bold text-slate-300">R$ {scoutData.fuelPrices?.diesel?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Etanol</div>
                      <div className="font-bold text-slate-300">R$ {scoutData.fuelPrices?.etanol?.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">GNV</div>
                      <div className="font-bold text-slate-300">R$ {scoutData.fuelPrices?.gnv?.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Comparativo com Apps de Entrega Externos */}
                <div className="border-t border-slate-800 pt-3">
                  <span className="text-[10px] uppercase font-black text-slate-450 block mb-2 tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-tech" />
                    Cotações de Apps de Entrega
                  </span>
                  
                  <div className="space-y-2">
                    {Object.values(scoutData.externalPlatforms || {}).map((plat: any, pIdx: number) => (
                      <div key={pIdx} className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between transition-all hover:bg-slate-950">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200 text-xs flex items-center gap-1">
                            {plat.name}
                            {!plat.available && (
                              <span className="text-[8px] bg-red-950 text-red-400 border border-red-900 px-1 py-0.2 rounded font-normal font-sans uppercase">
                                Indisp.
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500">{plat.coverage}</span>
                        </div>
                        
                        <div className="text-right">
                          {plat.available ? (
                            <>
                              <span className="font-mono font-black text-xs text-emerald-400">R$ {plat.estimatedCost?.toFixed(2)}</span>
                              <span className="text-[10px] text-slate-500 block font-mono">≈ {plat.etaMinutes} min</span>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">—</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">Nenhum dado de combustível disponível.</div>
            )}
          </div>
        )}


        <AnimatePresence mode="popLayout">
          {stops.map((stop, idx) => (
            <motion.div
              key={stop.id}
              layout
              initial={{ opacity: 0, x: -20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 120, damping: 20 }}
              className="group mb-4 bg-slate-900/50 border border-slate-800 hover:border-tech/40 p-4 rounded-2xl transition-all"
            >
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  {stop.status === 'completed' ? (
                    <div className="w-8 h-8 rounded-full bg-tech/20 border border-tech text-tech flex items-center justify-center text-sm font-bold">
                      ✓
                    </div>
                  ) : stop.status === 'failed' ? (
                    <div className="w-8 h-8 rounded-full bg-alert/20 border border-alert text-alert flex items-center justify-center text-sm font-bold">
                      ✕
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold border border-slate-700 text-slate-300">
                      {idx + 1}
                    </div>
                  )}
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
                  {stop.fluvialPort && (
                    <div className="mb-2 mt-0.5 flex items-center gap-1.5 text-[9.5px] font-bold text-sky-400 bg-sky-950/40 border border-sky-900/40 px-2 py-0.5 rounded w-fit uppercase font-mono">
                      <Anchor className="w-3 h-3 text-sky-450 shrink-0" />
                      {stop.fluvialPort}
                    </div>
                  )}
                  
                  {stop.invoice && (
                    <div className="mt-2 mb-2.5 bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-[9.5px] font-black uppercase text-tech tracking-wider flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-tech shrink-0 animate-pulse" />
                          {stop.invoice.valor ? 'NFe Vinculada' : 'DANFE Anexada'}
                        </span>
                        {stop.invoice.valor !== undefined && (
                          <span className="text-[10px] font-bold text-emerald-450 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stop.invoice.valor || 0)}
                          </span>
                        )}
                      </div>
                      <div className="text-[9.5px] text-slate-400 truncate font-sans">
                        {stop.invoice.destinatario ? `Dest: ${stop.invoice.destinatario}` : `Chave: ${stop.invoice.key}`}
                      </div>
                      {onShowInvoice && (
                        <button
                          type="button"
                          onClick={() => onShowInvoice(parseInt(stop.id))}
                          className="w-full text-center py-1.5 bg-tech/10 hover:bg-tech/20 border border-tech/25 rounded-lg text-[9.5px] font-black uppercase tracking-wider text-tech mt-1.5 transition-all cursor-pointer h-8 flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-tech shrink-0" /> Visualizar Nota
                        </button>
                      )}
                    </div>
                  )}
                  
                  {stop.status === 'completed' && (
                    <div className="mt-1 mb-2 text-[10px] font-bold text-tech bg-tech/10 border border-tech/20 px-2 py-0.5 rounded uppercase w-fit">
                      ✓ Entregue com Sucesso
                    </div>
                  )}
                  {stop.status === 'failed' && (
                    <div className="mt-1 mb-2 flex flex-col gap-1">
                      <span className="inline-block w-fit text-[10px] font-bold text-alert bg-alert/10 border border-alert/20 px-2 py-0.5 rounded uppercase font-sans">
                        ✕ Falha na Entrega: {stop.failureReason}
                      </span>
                      {stop.deliveryNotes && (
                        <p className="text-xs text-slate-400 italic font-sans">Observação: {stop.deliveryNotes}</p>
                      )}
                    </div>
                  )}
                  
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

                  {/* Histórico de Entregas Local Sub-panel */}
                  {stop.historyInsight && (
                    <div className="mt-3 py-2.5 px-3.5 rounded-2xl border flex flex-col gap-1.5 bg-slate-950/60 border-tech/20 text-slate-300 text-xs">
                      <div className="flex items-center justify-between font-bold text-[11px] text-tech border-b border-white/5 pb-1.5 mb-1">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-tech" />
                          <span>Histórico Operacional</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {stop.historyInsight.successCount}/{stop.historyInsight.totalDeliveries} Entregues
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[9.5px]">Tempo de Descarga</span>
                          <span className="font-semibold text-slate-200">{stop.historyInsight.averageServiceTimeMinutes} min</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9.5px]">Taxa de Sucesso</span>
                          <span className={`font-semibold ${stop.historyInsight.failedCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {Math.round((stop.historyInsight.successCount / stop.historyInsight.totalDeliveries) * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      {stop.historyInsight.notes && stop.historyInsight.notes.length > 0 && (
                        <div className="text-[10.5px] text-slate-400 italic font-sans leading-normal border-t border-white/5 pt-1 mt-1">
                          <strong>Última nota:</strong> &quot;{stop.historyInsight.notes[0]}&quot;
                        </div>
                      )}

                      <div className="text-[11px] text-slate-300 font-sans leading-normal bg-tech/5 border border-tech/15 rounded-xl p-2 mt-1">
                        <strong>Recomendação:</strong> {stop.historyInsight.recommendation}
                      </div>
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
        </>
      )}
    </div>
  );
}
