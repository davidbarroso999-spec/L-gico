'use client';

import React, { useEffect, useState } from 'react';

interface TutorialSpotlightProps {
  activeStep: number;
  active: boolean;
}

export default function TutorialSpotlight({ activeStep, active }: TutorialSpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) {
      const timer = setTimeout(() => setRect(null), 0);
      return () => clearTimeout(timer);
    }

    const updateRect = () => {
      const targetId = `tutorial-target-step-${activeStep}`;
      const element = document.getElementById(targetId);
      if (element) {
        const bounds = element.getBoundingClientRect();
        // Check if element is visible / has dimensions
        if (bounds.width > 0 && bounds.height > 0) {
          setRect(bounds);
        } else {
          setRect(null);
        }
      } else {
        setRect(null);
      }
    };

    updateRect();

    // Auto scroll into view with slight delay to ensure tab/screen transitions complete
    const scrollTimer = setTimeout(() => {
      const targetId = `tutorial-target-step-${activeStep}`;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Recalculate after smooth scroll
        setTimeout(updateRect, 350);
      }
    }, 200);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const interval = setInterval(updateRect, 500);

    return () => {
      clearTimeout(scrollTimer);
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [activeStep, active]);

  if (!active || !rect) return null;

  const padding = 10;
  const top = rect.top - padding;
  const left = rect.left - padding;
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9980] overflow-hidden transition-all duration-300">
      {/* Box shadow trick for dimming everything outside the spotlight rect */}
      <div
        className="absolute rounded-2xl transition-all duration-300 ease-out"
        style={{
          top: `${Math.max(0, top)}px`,
          left: `${Math.max(0, left)}px`,
          width: `${width}px`,
          height: `${height}px`,
          boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.72)',
        }}
      />

      {/* High-visibility rectangular glowing highlight box */}
      <div
        className="absolute rounded-2xl border-2 border-tech shadow-[0_0_30px_rgba(0,242,255,0.8),inset_0_0_15px_rgba(0,242,255,0.25)] transition-all duration-300 ease-out animate-pulse"
        style={{
          top: `${Math.max(0, top)}px`,
          left: `${Math.max(0, left)}px`,
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {/* Animated Corner Brackets */}
        <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-white rounded-tl" />
        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-white rounded-tr" />
        <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-white rounded-bl" />
        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-white rounded-br" />

        {/* Step Badge Indicator attached to target box */}
        <div className="absolute -top-4 left-4 bg-tech text-slate-950 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 font-mono whitespace-nowrap z-10">
          <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
          <span>Foco do Passo {activeStep} de 5</span>
        </div>
      </div>
    </div>
  );
}
