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
          background-color: #00d4aa; /* tech color */
          right: -50%;
          border-radius: 3px;
          animation: roadAnimation 1s linear infinite;
          box-shadow: 0 0 10px rgba(0,212,170,0.5);
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
          width: 5px;
          background: #334155; /* slate-700 */
          border-radius: 2px;
          animation: roadAnimation 1.5s linear infinite;
        }
        .lampLight {
          position: absolute;
          top: 0;
          right: -15px;
          width: 25px;
          height: 5px;
          background: #334155;
          border-radius: 2px;
        }
        .lampGlow {
          position: absolute;
          top: 5px;
          right: -12px;
          width: 15px;
          height: 15px;
          background: #00d4aa;
          border-radius: 50%;
          box-shadow: 0 0 20px 8px rgba(0, 212, 170, 0.4);
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
          <Truck className="w-24 h-24 fill-slate-900 stroke-tech drop-shadow-[0_0_15px_rgba(0,212,170,0.3)]" strokeWidth={1.5} />
        </div>
        <div className="road shadow-[0_0_15px_rgba(0,212,170,0.2)]"></div>
      </div>
      <p className="text-tech text-sm tracking-widest uppercase font-black animate-pulse shadow-tech/50 drop-shadow-md">
        Calculando a Rota Mais Eficiente
      </p>
      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-2 animate-pulse delay-75">
        Otimizando a frota...
      </p>
    </div>
  );
}
