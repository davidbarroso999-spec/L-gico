import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-12 h-12 text-tech" }: LogoProps) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      id="harpia-logo-svg"
    >
      {/* Symmetrical High-tech Harpy Eagle (Harpia) */}
      {/* Dynamic central crest / head */}
      <path 
        d="M50 15 L56 27 L66 22 L62 33 L50 30 L38 33 L34 22 L44 27 Z" 
        fill="currentColor" 
        fillOpacity="0.1" 
        strokeWidth="2"
      />
      {/* Beak / face */}
      <path 
        d="M50 30 L54 40 L50 44 L46 40 Z" 
        fill="currentColor" 
        strokeWidth="2"
      />
      {/* Geometric eye details */}
      <line x1="45" y1="36" x2="48" y2="38" strokeWidth="1.5" />
      <line x1="55" y1="36" x2="52" y2="38" strokeWidth="1.5" />
      
      {/* Left wing (multi-segmented, modern, technical) */}
      <path d="M44 38 L25 45 L15 55 L32 50 L40 43" />
      <path d="M42 42 L22 53 L18 64 L34 57 L42 47" />
      <path d="M43 47 L24 61 L22 72 L36 64 L44 52" />
      
      {/* Right wing (symmetrical) */}
      <path d="M56 38 L75 45 L85 55 L68 50 L60 43" />
      <path d="M58 42 L78 53 L82 64 L66 57 L58 47" />
      <path d="M57 47 L76 61 L78 72 L64 64 L56 52" />

      {/* Cybernetic telemetry body plate */}
      <polygon 
        points="50,46 56,58 50,75 44,58" 
        fill="currentColor" 
        fillOpacity="0.15" 
        strokeWidth="2" 
      />
      
      {/* Tail feathers / compass needle direction styling */}
      <path d="M50 75 L45 88 L50 92 L55 88 Z" fill="currentColor" fillOpacity="0.2" />
      
      {/* Navigation satellites / node points around wings */}
      <circle cx="15" cy="55" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="85" cy="55" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18" cy="64" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="82" cy="64" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="22" cy="72" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="78" cy="72" r="1.5" fill="currentColor" stroke="none" />
      
      {/* Symmetrical telemetry lines linking wings to center */}
      <path d="M32 50 L44 58" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
      <path d="M68 50 L56 58" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
      <path d="M34 57 L44 58" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
      <path d="M66 57 L56 58" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );
}
