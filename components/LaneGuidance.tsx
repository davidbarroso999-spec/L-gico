'use client';

import React from 'react';
import { ArrowUp, ArrowUpLeft, ArrowUpRight, ArrowLeft, ArrowRight } from 'lucide-react';

export interface LaneInfo {
  direction: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right';
  valid: boolean; // whether this lane is suitable for the upcoming maneuver
}

interface LaneGuidanceProps {
  lanes?: LaneInfo[];
  stepDirection?: string;
  className?: string;
}

export default function LaneGuidance({ lanes, stepDirection = 'straight', className = '' }: LaneGuidanceProps) {
  // If no explicit lane data is returned from OSRM intersections, generate an intelligent 3-lane visual model based on step direction
  const displayLanes: LaneInfo[] = lanes && lanes.length > 0 ? lanes : (() => {
    if (stepDirection === 'left' || stepDirection === 'slight-left') {
      return [
        { direction: 'left', valid: true },
        { direction: 'straight', valid: false },
        { direction: 'straight', valid: false },
        { direction: 'right', valid: false }
      ];
    }
    if (stepDirection === 'right' || stepDirection === 'slight-right') {
      return [
        { direction: 'left', valid: false },
        { direction: 'straight', valid: false },
        { direction: 'right', valid: true }
      ];
    }
    if (stepDirection === 'u-turn') {
      return [
        { direction: 'left', valid: true },
        { direction: 'straight', valid: false },
        { direction: 'right', valid: false }
      ];
    }
    return [
      { direction: 'left', valid: false },
      { direction: 'straight', valid: true },
      { direction: 'straight', valid: true },
      { direction: 'right', valid: false }
    ];
  })();

  const renderArrow = (dir: LaneInfo['direction'], isValid: boolean) => {
    const iconClass = `w-4 h-4 stroke-[3px] transition-colors ${
      isValid ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-slate-500/70'
    }`;

    switch (dir) {
      case 'left':
        return <ArrowLeft className={iconClass} />;
      case 'slight-left':
        return <ArrowUpLeft className={iconClass} />;
      case 'right':
        return <ArrowRight className={iconClass} />;
      case 'slight-right':
        return <ArrowUpRight className={iconClass} />;
      case 'straight':
      default:
        return <ArrowUp className={iconClass} />;
    }
  };

  return (
    <div className={`flex items-center gap-1.5 py-1 px-2 rounded-xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md select-none ${className}`}>
      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
        Faixas:
      </span>
      <div className="flex items-center gap-1">
        {displayLanes.map((lane, idx) => (
          <div
            key={idx}
            className={`w-6 h-7 rounded-md border flex items-center justify-center transition-all ${
              lane.valid
                ? 'bg-emerald-950/80 border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/60 border-slate-800/60 opacity-60'
            }`}
            title={lane.valid ? 'Faixa recomendada para a manobra' : 'Outras faixas'}
          >
            {renderArrow(lane.direction, lane.valid)}
          </div>
        ))}
      </div>
    </div>
  );
}
