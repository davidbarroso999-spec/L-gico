'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className = '', size = 'md' }: LogoProps) {
  // Sizes mapping for container
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className} flex items-center justify-center overflow-hidden transition-all duration-500 hover:scale-105`}>
      {/* Visual background gradient glow for larger sizes */}
      {size !== 'sm' && (
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-violet-500/15 rounded-full blur-xl animate-pulse" style={{ animationDuration: '4s' }} />
      )}
      
      {/* High-precision Custom Harpy Eagle (Harpia) Vector Graphic */}
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 select-none group"
      >
        <defs>
          {/* Cyber-neon gradient */}
          <linearGradient id="harpy-neon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="50%" stopColor="#7b2fff" />
            <stop offset="100%" stopColor="#00ff88" />
          </linearGradient>

          {/* Electric Beak gradient */}
          <linearGradient id="harpy-beak-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffb800" />
            <stop offset="100%" stopColor="#ff5c00" />
          </linearGradient>

          {/* Core Glow filter */}
          <filter id="harpy-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer glowing coordinate boundary rings */}
        <circle 
          cx="50" 
          cy="50" 
          r="45" 
          stroke="url(#harpy-neon-grad)" 
          strokeWidth="1" 
          strokeOpacity="0.25" 
          strokeDasharray="4 4" 
          className="animate-spin" 
          style={{ animationDuration: '25s' }}
        />
        <circle 
          cx="50" 
          cy="50" 
          r="41" 
          stroke="url(#harpy-neon-grad)" 
          strokeWidth="0.75" 
          strokeOpacity="0.12" 
        />

        {/* Geometric Harpy Eagle (Harpia) Composition */}
        <g filter="url(#harpy-glow)">
          {/* Distinctive double split crest on the back of the head (representing the bird's crown of alert feathers) */}
          {/* Crest Spike 1 (Top-most) */}
          <path 
            d="M 45,34 L 28,14 L 41,29 Z" 
            fill="url(#harpy-neon-grad)" 
            opacity="0.9"
          />
          {/* Crest Spike 2 (Split double crest lower) */}
          <path 
            d="M 39,39 L 21,24 L 35,34 Z" 
            fill="url(#harpy-neon-grad)" 
            opacity="0.8"
          />
          {/* Crest Spike 3 (Lower occipital) */}
          <path 
            d="M 35,46 L 18,36 L 31,42 Z" 
            fill="url(#harpy-neon-grad)" 
            opacity="0.7"
          />

          {/* Dynamic Flight / Router trails behind the head (represents ultra-fast logistics) */}
          <path 
            d="M 12,48 L 26,48 L 20,53 L 10,52 Z" 
            fill="#00f5ff" 
            opacity="0.65" 
          />
          <path 
            d="M 8,57 L 22,57 L 16,63 L 6,61 Z" 
            fill="#7b2fff" 
            opacity="0.55" 
          />

          {/* Majestic Royal Head Structure (Folded geometric planes) */}
          {/* Main Crown Plane */}
          <path 
            d="M 41,29 L 55,27 L 65,37 L 50,44 Z" 
            fill="url(#harpy-neon-grad)" 
            opacity="0.95"
          />
          {/* Cheek / Jaw Plane */}
          <path 
            d="M 50,44 L 65,37 L 61,50 L 46,51 Z" 
            fill="#1e1b4b" 
            stroke="url(#harpy-neon-grad)" 
            strokeWidth="0.5"
          />
          {/* Nape / Back of Neck */}
          <path 
            d="M 31,42 L 41,29 L 50,44 L 46,51 L 34,68 L 26,60 Z" 
            fill="url(#harpy-neon-grad)" 
            opacity="0.85"
          />
          {/* Throat / Front Upper Breast */}
          <path 
            d="M 46,51 L 61,50 L 52,72 L 40,78 L 34,68 Z" 
            fill="url(#harpy-neon-grad)" 
            opacity="0.9"
          />

          {/* Beak Connection Joint (Grey gradient transition) */}
          <path 
            d="M 65,37 L 69,38 L 65,49 L 61,50 Z" 
            fill="#334155" 
          />

          {/* Powerful, hooked predatory beak (facing forward/right, representing focused delivery speed) */}
          <path 
            d="M 69,38 L 81,42 L 74,54 L 65,49 Z" 
            fill="url(#harpy-beak-grad)" 
          />
          
          {/* Fierce cybernetic radar eye (represents logistics tracking and search grounding overlay) */}
          <polygon 
            points="58,36 60,37 57,39 55,38" 
            fill="#ffffff" 
          />
          <circle 
            cx="57.5" 
            cy="37.5" 
            r="1" 
            fill="#00f5ff" 
            className="animate-pulse"
          />
        </g>

        {/* Dynamic Navigation Line Core Overlay (A futuristic vector nod to Voie Express) */}
        <path 
          d="M 40,78 L 52,72 L 68,82" 
          stroke="url(#harpy-neon-grad)" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeOpacity="0.4"
        />
        <circle cx="68" cy="82" r="2" fill="#00ff88" opacity="0.8" />
        <circle cx="40" cy="78" r="1.5" fill="#00f5ff" opacity="0.8" />
      </svg>
    </div>
  );
}

