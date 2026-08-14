import React from 'react';
import { Truck } from 'lucide-react';

export default function TruckLoader() {
  return (
    <div className="flex flex-col items-center justify-center">
      <style>{`
        .truckWrapper {
          width: 240px;
          height: 120px;
          display: flex;
          flex-direction: column;
          position: relative;
          align-items: center;
          justify-content: flex-end;
          overflow-x: hidden;
          margin-bottom: 2rem;
        }
        .truckBody {
          width: fit-content;
          height: fit-content;
          margin-bottom: 2px;
          animation: motion 0.8s linear infinite;
          z-index: 10;
        }
        @keyframes motion {
          0% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(2px) rotate(0.5deg); }
          50% { transform: translateY(0px) rotate(0deg); }
          75% { transform: translateY(2px) rotate(-0.5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .road {
          width: 100%;
          height: 3px;
          background-color: #1e293b; /* slate-800 */
          position: relative;
          bottom: 0;
          align-self: flex-end;
          border-radius: 3px;
        }
        .road::before {
          content: "";
          position: absolute;
          width: 40px;
          height: 100%;
          background-color: #D1A054; /* tech color */
          right: -50%;
          border-radius: 3px;
          animation: roadAnimation 1s linear infinite;
        }
        .road::after {
          content: "";
          position: absolute;
          width: 15px;
          height: 100%;
          background-color: #ef4444; /* alert color */
          right: -80%;
          border-radius: 3px;
          animation: roadAnimation 1s linear infinite;
          animation-delay: 0.2s;
        }
        .lampPost {
          position: absolute;
          bottom: 0;
          right: -90%;
          height: 80px;
          width: 4px;
          background: #334155; /* slate-700 */
          border-radius: 2px;
          animation: roadAnimation 1.5s linear infinite;
        }
        .lampLight {
          position: absolute;
          top: 0;
          right: -12px;
          width: 20px;
          height: 4px;
          background: #334155;
          border-radius: 2px;
        }
        .lampGlow {
          position: absolute;
          top: 4px;
          right: -10px;
          width: 8px;
          height: 8px;
          background: #D1A054;
          border-radius: 50%;
          opacity: 0.8;
        }
        @keyframes roadAnimation {
          0% { transform: translateX(0px); }
          100% { transform: translateX(-350px); }
        }
      `}</style>
      <div className="truckWrapper">
        <div className="lampPost">
          <div className="lampLight"></div>
          <div className="lampGlow"></div>
        </div>
        <div className="truckBody text-tech">
          <Truck className="w-20 h-20 fill-slate-900 stroke-tech" strokeWidth={1.5} />
        </div>
        <div className="road"></div>
      </div>
      <p className="text-tech text-sm tracking-wider uppercase font-bold">
        Calculando a Rota Mais Eficiente
      </p>
      <p className="text-slate-400 text-xs mt-1.5 font-medium">
        Processando matriz de distâncias e otimizando paradas...
      </p>
    </div>
  );
}
