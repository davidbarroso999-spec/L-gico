with open('app/page.tsx', 'r') as f:
    content = f.read()

# 1. Remove settingsTab state
content = content.replace("  const [settingsTab, setSettingsTab] = useState<'preferences' | 'details'>('preferences');\n", "")
content = content.replace("  const [settingsTab, setSettingsTab] = useState<'preferences' | 'details'>('preferences');", "")

# 2. Update navbar tab desc
content = content.replace(
    "{ id: 'settings', label: 'Configurações', icon: Settings, desc: 'Ajustes e Detalhes da Rota' },",
    "{ id: 'settings', label: 'Configurações', icon: Settings, desc: 'Ajustes e Parâmetros' },"
)

# 3. Replace currentScreen === 'settings' block
pos_start = content.find("{currentScreen === 'settings' && (")
pos_end = content.find("</AnimatePresence>", pos_start)

new_settings_jsx = """{currentScreen === 'settings' && (
            <motion.div 
              key="settings" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar ${isMobile ? 'px-4 pt-20 pb-16' : 'p-6 sm:p-10'}`}
            >
              <div className="max-w-4xl mx-auto w-full space-y-6">
                <div className="pb-4 border-b border-slate-800/60">
                  <h1 className="text-3xl sm:text-4xl font-bold font-display text-white">Configurações do Sistema</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Ajuste perfis de veículos, regras de otimização, restrições e parâmetros de inteligência artificial.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bento Box 1: Vehicle selection */}
                  <div className="glass p-5 xs:p-6 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                      <Truck className="w-4 h-4 shrink-0" />
                      <span>
                        Perfil de Transporte
                        <InfoTooltip text="Selecione o tipo de veículo usado. O roteador adaptará o cálculo de tempo e viabilidade automaticamente." />
                      </span>
                    </h3>
                    <div className="grid grid-cols-2 xs:grid-cols-4 gap-2">
                      {[
                        { id: 'moto', icon: Bike, label: 'Moto' },
                        { id: 'van', icon: Car, label: 'Van' },
                        { id: 'truck', icon: Truck, label: 'Caminhão' },
                        { id: 'boat', icon: MapIcon, label: 'Barco' },
                      ].map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setOptions({ ...options, vehicle: v.id as any })}
                          className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all cursor-pointer ${
                            options.vehicle === v.id
                              ? 'bg-tech/10 border-tech text-tech shadow-[0_0_15px_rgba(0,242,255,0.06)] font-bold'
                              : 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                          }`}
                        >
                          <v.icon className="w-5 h-5 mb-1.5" />
                          <span className="text-[10px] font-bold uppercase tracking-tight">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bento Box 2: Route optimization priority */}
                  <div className="glass p-5 xs:p-6 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                      <Zap className="w-4 h-4 shrink-0" />
                      <span>
                        Prioridade do Algoritmo
                        <InfoTooltip text="Escolha se deseja focar na velocidade absoluta, menor quilometragem percorrida ou máxima economia de combustível." />
                      </span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'speed', label: 'Mais Rápido' },
                        { id: 'distance', label: 'Mais Curto' },
                        { id: 'economy', label: 'Econômico' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setOptions({ ...options, priority: p.id as any })}
                          className={`py-3 px-2 rounded-2xl border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            options.priority === p.id
                              ? 'bg-tech/10 border-tech text-tech shadow-[0_0_15px_rgba(0,242,255,0.06)]'
                              : 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bento Box 3: Avoidances */}
                  <div className="glass p-5 xs:p-6 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                      <Layers className="w-4 h-4 shrink-0" />
                      <span>
                        Restrições de Vias
                        <InfoTooltip text="Ative evitar estradas não pavimentadas, áreas com risco de inundação ou subidas íngremes." />
                      </span>
                    </h3>
                    <div className="space-y-2.5">
                      {[
                        { key: 'avoidDirt', label: 'Evitar estradas de terra / barro' },
                        { key: 'avoidFloods', label: 'Evitar áreas suscetíveis a alagamento' },
                        { key: 'avoidHills', label: 'Evitar relevo muito íngreme' },
                      ].map((item) => {
                        const isChecked = !!(options as any)[item.key];
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setOptions({ ...options, [item.key]: !isChecked })}
                            className={`w-full p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                              isChecked
                                ? 'bg-tech/10 border-tech/60 text-tech'
                                : 'bg-slate-950/40 border-slate-850/80 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span>{item.label}</span>
                            <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                              isChecked ? 'bg-tech text-slate-950 border-tech' : 'border-slate-700 bg-slate-900'
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bento Box 4: Routing Engine */}
                  <div className="glass p-5 xs:p-6 rounded-3xl border border-slate-800/40">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                      <Navigation className="w-4 h-4 shrink-0" />
                      <span>
                        Motor de Roteamento
                        <InfoTooltip text="Selecione qual provedor de mapas/algoritmo será utilizado como base do cálculo." />
                      </span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'google', label: 'Google Maps' },
                        { id: 'waze', label: 'Waze Traffic' },
                        { id: 'ors', label: 'OpenRoute' },
                      ].map((eng) => (
                        <button
                          key={eng.id}
                          type="button"
                          onClick={() => setOptions({ ...options, engine: eng.id as any })}
                          className={`py-3 px-2 rounded-2xl border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            (options.engine || 'google') === eng.id
                              ? 'bg-tech/10 border-tech text-tech shadow-[0_0_15px_rgba(0,242,255,0.06)]'
                              : 'bg-slate-950/40 border-slate-850/80 text-slate-500 hover:text-slate-300 hover:border-slate-800'
                          }`}
                        >
                          {eng.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bento Box 5: AI Custom Prompts */}
                  <div className="glass p-5 xs:p-6 rounded-3xl border border-slate-800/40 md:col-span-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-3 font-display flex items-center gap-2 flex-wrap">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>
                        Instruções da Inteligência Artificial
                        <InfoTooltip text="Adicione orientações especiais em linguagem natural para o modelo Gemini considerar no roteamento." />
                      </span>
                    </h3>
                    <textarea
                      value={options.customPrompt || ''}
                      onChange={(e) => setOptions({ ...options, customPrompt: e.target.value })}
                      placeholder="Ex: Evitar pedágios na BR-101, dar preferência para entregas comerciais pela manhã, priorizar estradas asfaltadas..."
                      className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-tech focus:ring-1 focus:ring-tech h-24 resize-none transition-all"
                    />
                  </div>

                  {/* Bento Box 6: Future Routing & Scheduling */}
                  <div className="glass p-5 xs:p-6 rounded-3xl border border-slate-800/40 md:col-span-2">
                    <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>
                        Agendamento Futuro
                        <InfoTooltip text="Programe a partida para uma data ou horário específicos para simular previsões de trânsito." />
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="date"
                        value={options.scheduledDate || ''}
                        onChange={(e) => setOptions({ ...options, scheduledDate: e.target.value })}
                        className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-tech transition-all cursor-pointer"
                      />
                      <input
                        type="time"
                        value={options.scheduledTime || ''}
                        onChange={(e) => setOptions({ ...options, scheduledTime: e.target.value })}
                        className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-tech transition-all cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}"""

content = content[:pos_start] + new_settings_jsx + "\n        " + content[pos_end:]

with open('app/page.tsx', 'w') as f:
    f.write(content)

print("Settings cleanly updated!")
