'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Package, Clock, ShieldAlert, Navigation } from 'lucide-react';

export default function KpiDashboard() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const dataValues = [85, 92, 78, 90, 95, 88, 91];

  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  const points = dataValues.map((val, idx) => {
    const x = paddingX + idx * ((width - 2 * paddingX) / (dataValues.length - 1));
    const y = height - paddingY - (val / 100) * (height - 2 * paddingY);
    return { x, y, val, label: weekdays[idx] };
  });

  let linePath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 3;
      const cpY1 = p0.y;
      const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
      const cpY2 = p1.y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  const areaPath = linePath ? `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z` : '';

  const kpis = [
    { label: 'KM Total', value: '1,248', icon: TrendingUp, color: 'text-tech' },
    { label: 'Entregas', value: '142', icon: Package, color: 'text-accent' },
    { label: 'Tempo Médio', value: '22m', icon: Clock, color: 'text-slate-400' },
    { label: 'Ocorrências', value: '4', icon: ShieldAlert, color: 'text-alert' },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar md:pb-8 pb-32">
      <header className="mb-12">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500">
          Dashboard Operacional
        </h1>
        <p className="text-slate-400 mt-2">Métricas de performance dos últimos 7 dias</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -4 }}
            className="glass p-6 rounded-3xl relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <kpi.icon className="w-12 h-12" />
            </div>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className={`text-4xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <span className="text-tech">+12%</span> em relação à semana passada
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass p-8 rounded-3xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">Curva de Eficiência</h3>
            <select className="bg-slate-800 text-xs border-none rounded-lg px-3 py-1 outline-none">
              <option>Esta Semana</option>
              <option>Mês Passado</option>
            </select>
          </div>
          <div className="h-[280px] w-full flex items-center justify-center relative">
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#00D4AA" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Lines */}
              {[25, 50, 75, 100].map((level) => {
                const yLevel = height - paddingY - (level / 100) * (height - 2 * paddingY);
                return (
                  <g key={level} className="opacity-20">
                    <line 
                      x1={paddingX} 
                      y1={yLevel} 
                      x2={width - paddingX} 
                      y2={yLevel} 
                      stroke="#475569" 
                      strokeWidth="1" 
                      strokeDasharray="4 4" 
                    />
                    <text 
                      x={paddingX - 10} 
                      y={yLevel + 4} 
                      textAnchor="end" 
                      fill="#94a3b8" 
                      className="text-[10px] font-mono"
                    >
                      {level}%
                    </text>
                  </g>
                );
              })}

              {/* Area Under the Line */}
              {areaPath && (
                <path 
                  d={areaPath} 
                  fill="url(#chartGradient)" 
                />
              )}

              {/* Glow Behind the Line */}
              {linePath && (
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke="#00D4AA" 
                  strokeWidth="3" 
                  opacity="0.5"
                  filter="url(#glow)"
                />
              )}

              {/* Main Line */}
              {linePath && (
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke="#00D4AA" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                />
              )}

              {/* Interactive Points / Hover Triggers */}
              {points.map((p, idx) => (
                <g key={idx}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="24"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />

                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredIdx === idx ? 6 : 4}
                    fill="#0b241e"
                    stroke="#00D4AA"
                    strokeWidth={hoveredIdx === idx ? 3 : 2}
                    className="transition-all duration-200 pointer-events-none"
                    style={{ filter: hoveredIdx === idx ? 'drop-shadow(0 0 6px #00D4AA)' : 'none' }}
                  />

                  {hoveredIdx === idx && (
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={p.x}
                      y2={height - paddingY}
                      stroke="#00D4AA"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.5"
                      className="pointer-events-none"
                    />
                  )}
                </g>
              ))}

              {/* Bottom Labels (Weekdays) */}
              {points.map((p, idx) => (
                <text
                  key={idx}
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  fill={hoveredIdx === idx ? "#00D4AA" : "#64748b"}
                  className="text-[11px] font-medium transition-colors duration-200"
                >
                  {p.label}
                </text>
              ))}
            </svg>

            {/* Float Tooltip Overlay */}
            <AnimatePresence>
              {hoveredIdx !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col items-center pointer-events-none z-50 text-center"
                  style={{
                    left: `${(points[hoveredIdx].x / width) * 100}%`,
                    top: `${(points[hoveredIdx].y / height) * 100 - 18}%`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-0.5">
                    {points[hoveredIdx].label}
                  </p>
                  <p className="text-sm font-bold text-tech">
                    {points[hoveredIdx].val}% <span className="text-[10px] text-slate-400 font-normal">Eficiência</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl flex flex-col">
          <h3 className="text-xl font-bold mb-6">Próximas Tarefas</h3>
          <div className="space-y-4 flex-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-5 h-5 text-tech" />
                </div>
                <div>
                  <p className="font-medium text-sm">Carregar Carga #DF921</p>
                  <p className="text-xs text-slate-500">Terminal Hidroviário - 14:30</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 border border-slate-700 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors">
            Ver Cronograma Completo
          </button>
        </div>
      </div>
    </div>
  );
}
