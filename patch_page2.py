import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    # Find Bento Box 1: Vehicle selection
    bento_idx = -1
    for i, line in enumerate(lines):
        if '{/* Bento Box 1: Vehicle selection */}' in line:
            bento_idx = i
            break
            
    if bento_idx != -1:
        map_settings = """                {/* Bento Box: Map Display Options */}
                <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                  <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                    <Layers className="w-4 h-4 shrink-0" />
                    <span>Opções de Exibição</span>
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Estilo do Mapa */}
                    <div>
                      <label className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block mb-2">Estilo do Mapa</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'google-streets', icon: MapPin, label: 'Ruas' },
                          { id: 'google-hybrid', icon: Globe, label: 'Satélite' },
                          { id: 'google-terrain', icon: Sun, label: 'Topografia' },
                          { id: 'dark', icon: Compass, label: 'Escuro' },
                        ].map((p: any) => (
                          <button
                            key={p.id}
                            onClick={() => setMapStyle(p.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                              mapStyle === p.id
                                ? 'bg-tech/10 border-tech text-tech shadow-[0_0_15px_rgba(0,242,255,0.06)]'
                                : 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                            }`}
                          >
                            <p.icon className="w-4 h-4 mb-1 shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-tight leading-none">{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {/* Trânsito */}
                      <button
                        onClick={() => setShowTraffic(!showTraffic)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          showTraffic
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                            : 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                        }`}
                      >
                        <Car className={`w-5 h-5 shrink-0 ${showTraffic ? 'animate-pulse' : ''}`} />
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-wider leading-none mb-0.5">Trânsito</p>
                          <p className="text-[9px] opacity-70 leading-none">Ao Vivo</p>
                        </div>
                      </button>
                      
                      {/* Clima */}
                      <button
                        onClick={() => setShowWeather(!showWeather)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          showWeather
                            ? 'bg-teal-500/10 border-teal-500/40 text-teal-400'
                            : 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                        }`}
                      >
                        <CloudRain className={`w-5 h-5 shrink-0 ${showWeather ? 'animate-pulse' : ''}`} />
                        <div className="text-left">
                          <p className="text-[10px] font-black uppercase tracking-wider leading-none mb-0.5">Clima</p>
                          <p className="text-[9px] opacity-70 leading-none">Radar</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

"""
        lines.insert(bento_idx, map_settings)
        
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Done patching page.tsx again")

main()
