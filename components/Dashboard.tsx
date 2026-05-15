'use client';

import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Package, Clock, ShieldAlert, Navigation } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function KpiDashboard() {
  const data = {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
    datasets: [
      {
        label: 'Eficiência',
        data: [85, 92, 78, 90, 95, 88, 91],
        borderColor: '#00D4AA',
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { display: false },
      x: { grid: { display: false }, ticks: { color: '#64748b' } },
    }
  };

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
          <div className="h-[300px]">
             <Line data={data} options={options} />
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
