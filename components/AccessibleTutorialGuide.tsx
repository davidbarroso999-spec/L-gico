'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Volume2, 
  VolumeX, 
  Check, 
  MapPin, 
  Plus, 
  Truck, 
  Sparkles, 
  Navigation, 
  Camera,
  Play,
  RotateCcw
} from 'lucide-react';

interface AccessibleTutorialGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onStepChange?: (stepIndex: number) => void;
  onFillDemoData?: (stepIndex: number) => void;
  onResetDemoData?: () => void;
}

interface TutorialStep {
  id: string;
  title: string;
  action: string;
  demoNote: string;
  targetId: string;
  voiceText: string;
  icon: React.ElementType;
}

const STEPS: TutorialStep[] = [
  {
    id: 'origin',
    title: '1. Ponto de Partida',
    action: 'Defina a origem do veículo (ex: Centro de Distribuição ou Garagem).',
    demoNote: 'Preenchendo automaticamente o CD de partida...',
    targetId: 'tutorial-origin-stop',
    voiceText: 'Definindo o endereço de partida na base de distribuição.',
    icon: MapPin
  },
  {
    id: 'add-stop',
    title: '2. Destinos e Paradas',
    action: 'Adicione clientes, filiais e janelas de horário para cada parada.',
    demoNote: 'Adicionando 3 paradas reais com janelas de entrega...',
    targetId: 'tutorial-add-stop-btn',
    voiceText: 'Adicionando paradas de clientes com horários programados.',
    icon: Plus
  },
  {
    id: 'vehicle',
    title: '3. Perfil de Transporte',
    action: 'Escolha o tipo de veículo e regras logísticas (evitar alagamentos, balsa).',
    demoNote: 'Selecionando modalidade Van com desvio de alagamentos...',
    targetId: 'tutorial-vehicle-selector',
    voiceText: 'Configurando veículo e restrições de tráfego e vias.',
    icon: Truck
  },
  {
    id: 'optimize',
    title: '4. Otimização Inteligente',
    action: 'O algoritmo calcula a sequência perfeita para menor tempo e combustível.',
    demoNote: 'Pronto para calcular a melhor rota em tempo real.',
    targetId: 'tutorial-optimize-btn',
    voiceText: 'Otimizando a rota com algoritmo de menor tempo e distância.',
    icon: Sparkles
  },
  {
    id: 'navigation',
    title: '5. Navegação e Alertas',
    action: 'Acompanhe a rota em tempo real no mapa com alertas de tráfego e chuva.',
    demoNote: 'Visualizando trajeto otimizado com telemetria ativa...',
    targetId: 'tutorial-map-section',
    voiceText: 'Navegação curva a curva com monitoramento de trânsito em tempo real.',
    icon: Navigation
  },
  {
    id: 'pod',
    title: '6. Comprovante e Auditoria',
    action: 'Gere relatórios executivos de entrega, fotos e auditoria SLA/ESG.',
    demoNote: 'Demonstrando registro de comprovante e histórico...',
    targetId: 'tutorial-saved-routes',
    voiceText: 'Comprovantes digitais e relatórios gerenciais de entrega.',
    icon: Camera
  }
];

export default function AccessibleTutorialGuide({
  isOpen,
  onClose,
  onStepChange,
  onFillDemoData,
  onResetDemoData
}: AccessibleTutorialGuideProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom' | 'center';
    spotlight: { top: number; left: number; width: number; height: number } | null;
  }>({ top: 100, left: 20, placement: 'bottom', spotlight: null });

  const tooltipRef = useRef<HTMLDivElement>(null);
  const step = STEPS[currentStep];

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speakInstruction = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, []);

  // Update position anchored directly to target element
  const updatePosition = useCallback(() => {
    if (!isOpen) return;

    const el = document.getElementById(step.targetId);
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const tooltipWidth = Math.min(330, winWidth - 32);
    const tooltipHeight = 160;

    if (!el) {
      setTooltipPos({
        top: Math.max(20, winHeight - tooltipHeight - 24),
        left: Math.max(16, winWidth - tooltipWidth - 24),
        placement: 'top',
        spotlight: null
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const spotlight = {
      top: Math.max(0, rect.top - 6),
      left: Math.max(0, rect.left - 6),
      width: rect.width + 12,
      height: rect.height + 12
    };

    let placement: 'top' | 'bottom' | 'center' = 'bottom';
    let top = rect.bottom + 12;

    if (top + tooltipHeight > winHeight - 16) {
      top = Math.max(16, rect.top - tooltipHeight - 12);
      placement = 'top';
    }

    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, winWidth - tooltipWidth - 16));

    setTooltipPos({ top, left, placement, spotlight });
  }, [isOpen, step.targetId]);

  // Execute demo fill for current step and notify parent
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    onStepChange?.(currentStep);
    onFillDemoData?.(currentStep);

    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const rafId = requestAnimationFrame(updatePosition);
    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    const timer = setTimeout(updatePosition, 250);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [currentStep, isOpen, step.targetId, updatePosition, onStepChange, onFillDemoData]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < STEPS.length - 1) {
          setCurrentStep(c => c + 1);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) setCurrentStep(c => c - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, onClose]);

  if (!isOpen) return null;

  const StepIcon = step.icon;
  const isLast = currentStep === STEPS.length - 1;

  const handleNext = () => {
    stopSpeaking();
    if (!isLast) {
      setCurrentStep(s => s + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    stopSpeaking();
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  return (
    <>
      {/* Target Element Spotlight Ring */}
      {tooltipPos.spotlight && (
        <div
          style={{
            position: 'fixed',
            top: tooltipPos.spotlight.top,
            left: tooltipPos.spotlight.left,
            width: tooltipPos.spotlight.width,
            height: tooltipPos.spotlight.height
          }}
          className="rounded-2xl border-2 border-tech bg-tech/10 shadow-[0_0_25px_rgba(209,160,84,0.45)] pointer-events-none z-[5900] transition-all duration-300 animate-pulse"
        />
      )}

      {/* Anchored Micro Coachmark Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={tooltipRef}
          initial={{ opacity: 0, y: tooltipPos.placement === 'top' ? 8 : -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            maxWidth: '330px',
            width: 'calc(100vw - 32px)'
          }}
          className="z-[6000] bg-slate-950/95 border border-tech/40 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-slate-100 font-sans pointer-events-auto"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-tech/20 border border-tech/30 flex items-center justify-center text-tech shrink-0">
                <StepIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-black uppercase tracking-wider text-white truncate block">
                  {step.title}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold text-tech bg-tech/10 px-2 py-0.5 rounded-full border border-tech/20">
                {currentStep + 1}/{STEPS.length}
              </span>

              {/* Voice button */}
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    speakInstruction(step.voiceText);
                  }
                }}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isSpeaking
                    ? 'bg-tech text-slate-950 border-tech'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Ouvir instrução por voz"
              >
                {isSpeaking ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  onClose();
                }}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Fechar tutorial"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Description */}
          <p className="text-xs text-slate-300 leading-relaxed mb-2 font-medium">
            {step.action}
          </p>

          {/* Live Demonstration Active Pill */}
          <div className="flex items-center gap-1.5 bg-tech/10 border border-tech/20 rounded-xl px-2.5 py-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-tech animate-ping shrink-0" />
            <span className="text-[10px] text-tech font-semibold truncate">
              {step.demoNote}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-900 h-1 rounded-full mb-3 overflow-hidden">
            <div
              className="bg-tech h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="px-2.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-[11px] font-semibold disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Anterior</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-tech hover:brightness-110 text-slate-950 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_2px_10px_rgba(209,160,84,0.3)] cursor-pointer"
            >
              <span>{isLast ? 'Concluir' : 'Avançar'}</span>
              {isLast ? <Check className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
