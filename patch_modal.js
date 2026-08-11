const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const hybridModalHtml = `
      <AnimatePresence>
        {showHybridModal && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-tech/10 blur-3xl rounded-full pointer-events-none" />
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-tech/10 flex items-center justify-center text-tech mb-2 shadow-[0_0_20px_rgba(209,160,84,0.3)]">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold font-display text-white">Rota Multimodal Detectada</h2>
                <p className="text-sm text-slate-300">
                  Esta rota precisa de trecho terrestre até o porto de embarque, travessia fluvial, e trecho terrestre até o destino final.
                </p>
                <div className="w-full bg-slate-950/50 rounded-xl p-4 text-left space-y-3 border border-slate-800 my-2 text-xs">
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300"><strong>Etapa 1:</strong> Terrestre (Origem → Porto)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Ship className="w-4 h-4 text-tech" />
                    <span className="text-slate-300"><strong>Etapa 2:</strong> Fluvial (Porto → Porto)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300"><strong>Etapa 3:</strong> Terrestre (Porto → Destino)</span>
                  </div>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setShowHybridModal(false)}
                    className="flex-1 py-3.5 bg-slate-800 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setShowHybridModal(false);
                      setOptions(prev => ({ ...prev, isHybrid: true }));
                      setTimeout(() => runOptimization(), 100);
                    }}
                    className="flex-1 py-3.5 bg-tech text-slate-950 rounded-xl text-sm font-black uppercase tracking-wider shadow-[0_0_20px_rgba(209,160,84,0.4)] hover:brightness-110 transition-all"
                  >
                    Gerar Rota Híbrida
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

code = code.replace('{/* Quick Start Vehicle Profile Selection Modal */}', hybridModalHtml + '\n      {/* Quick Start Vehicle Profile Selection Modal */}');

fs.writeFileSync('app/page.tsx', code);
