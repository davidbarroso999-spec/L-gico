with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_loading = content.find("{currentScreen === 'loading' && (")
pos_loading_end = content.find("</motion.div>\n          )", pos_loading)
if pos_loading_end == -1:
    pos_loading_end = content.find("</motion.div>", pos_loading)
    pos_loading_end = content.find(")", pos_loading_end)

# Cut content after pos_loading_end + 1
clean_prefix = content[:pos_loading_end + 1]

all_screens_suffix = """
          {currentScreen === 'result' && routeResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.7, type: 'spring', stiffness: 90, damping: 20 }}
              className={`h-full flex ${isMobile ? 'relative w-full h-full overflow-hidden' : ''}`}
            >
              <div className={`${isMobile ? 'absolute inset-0 z-0' : 'flex-1 relative'}`}>
                <MapView mapStyleProp={mapStyle} showTrafficProp={showTraffic} showWeatherProp={showWeather} stops={routeResult.sequence} geometry={routeResult.geometry} routeSegments={routeResult.segments} alternatives={routeResult.alternatives || []} onRouteRecalculated={setRouteResult} />
              </div>
              <div 
                className={`${
                  isMobile 
                    ? 'z-50' 
                    : 'relative h-full z-10 shadow-2xl shrink-0 transition-all duration-300 ease-in-out'
                }`}
                style={isMobile ? undefined : { width: isSidebarOpen ? '400px' : '0px' }}
              >
                {!isMobile && (
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    style={{ left: '-32px' }}
                    className="absolute top-1/2 -translate-y-1/2 w-8 h-12 bg-slate-950 border border-slate-800 border-r-0 rounded-l-xl z-20 flex items-center justify-center text-tech hover:text-white transition-colors shadow-lg cursor-pointer"
                    title={isSidebarOpen ? "Recolher Painel" : "Expandir Painel"}
                  >
                    <ChevronRight 
                      className={`w-5 h-5 transition-transform duration-300 ${
                        isSidebarOpen ? 'rotate-0' : 'rotate-180'
                      }`} 
                    />
                  </button>
                )}
                <div 
                  className={`h-full ${isMobile ? '' : 'overflow-hidden transition-all duration-300'}`}
                  style={isMobile ? undefined : { 
                    width: '400px', 
                    visibility: isSidebarOpen ? 'visible' : 'hidden', 
                    opacity: isSidebarOpen ? 1 : 0 
                  }}
                >
                  <Sidebar 
                    stops={routeResult.sequence} 
                    summary={routeResult.summary}
                    score={routeResult.score}
                    aiAnalysis={routeResult.aiAnalysis}
                    hybridAnalysis={routeResult.hybridAnalysis}
                    onNavigate={() => setCurrentScreen('navigation')}
                    isLoading={false}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {currentScreen === 'navigation' && routeResult && (
            <motion.div
              key="navigation"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex flex-col relative overflow-hidden"
            >
              <div className="relative flex-1">
                 <MapView mapStyleProp={mapStyle} showTrafficProp={showTraffic} showWeatherProp={showWeather} stops={routeResult.sequence} geometry={routeResult.geometry} routeSegments={routeResult.segments} alternatives={routeResult.alternatives || []} isNavigationScreen={true} navIndex={navIndex} onRouteRecalculated={setRouteResult} />
              </div>
            </motion.div>
          )}

          {currentScreen === 'dashboard' && (
            <motion.div 
               key="dashboard" 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full"
            >
              <KpiDashboard activeRoute={routeResult} />
            </motion.div>
          )}

          {currentScreen === 'settings' && (
            <motion.div 
              key="settings" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar ${isMobile ? 'px-4 pt-20 pb-16' : 'p-6 sm:p-10'}`}
            >
              <div className="max-w-4xl mx-auto w-full space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold font-display text-white">Configurações & Rota</h1>
                    <p className="text-xs text-slate-400 mt-1">
                      {settingsTab === 'preferences' 
                        ? 'Ajuste perfis de veículos, regras de otimização e parâmetros de inteligência artificial.' 
                        : 'Visualize o itinerário completo e análises técnicas da rota calculada.'}
                    </p>
                  </div>

                  {/* Sub-tab Switcher */}
                  <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 border border-slate-800 rounded-2xl shrink-0 self-start sm:self-auto shadow-inner">
                    <button
                      type="button"
                      onClick={() => setSettingsTab('preferences')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        settingsTab === 'preferences'
                          ? 'bg-tech text-slate-950 shadow-[0_0_15px_rgba(0,242,255,0.2)] font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sliders className="w-4 h-4" />
                      Preferências do Sistema
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsTab('details')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        settingsTab === 'details'
                          ? 'bg-tech text-slate-950 shadow-[0_0_15px_rgba(0,242,255,0.2)] font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      Detalhes da Rota
                    </button>
                  </div>
                </div>

                {settingsTab === 'preferences' ? (
                  <div className="flex flex-col gap-6">
                    {/* Bento Box 1: Vehicle selection */}
                    <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                      <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                        <Truck className="w-4 h-4 shrink-0" />
                        <span>
                          Perfil de Transporte
                          <InfoTooltip text="Selecione o tipo de veículo usado. O roteador adaptará o cálculo de tempo e viabilidade de ruas automaticamente." />
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
                                ? 'bg-tech/10 border-tech text-tech shadow-[0_0_15px_rgba(0,242,255,0.06)]'
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
                    <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
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

                    {/* Bento Box 4: AI Custom Prompts */}
                    <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                      <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-3 font-display flex items-center gap-2 flex-wrap">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>
                          Instruções da IA
                          <InfoTooltip text="Adicione orientações especiais para o motor de IA levar em conta durante a otimização." />
                        </span>
                      </h3>
                      <textarea
                        value={options.customPrompt || ''}
                        onChange={(e) => setOptions({ ...options, customPrompt: e.target.value })}
                        placeholder="Ex: Evitar pedágios na BR-101, dar preferência para entregas comerciais pela manhã..."
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-tech focus:ring-1 focus:ring-tech h-24 resize-none transition-all"
                      />
                    </div>

                    {/* Bento Box 5: Future Routing & Scheduling */}
                    <div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">
                      <h3 className="text-sm font-black uppercase tracking-widest text-tech mb-4 font-display flex items-center gap-2 flex-wrap">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>
                          Agendamento Futuro
                          <InfoTooltip text="Programe a rota para uma data ou horário específicos para estimar condições de tráfego." />
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="date"
                          value={options.scheduledDate || ''}
                          onChange={(e) => setOptions({ ...options, scheduledDate: e.target.value })}
                          className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-tech transition-all"
                        />
                        <input
                          type="time"
                          value={options.scheduledTime || ''}
                          onChange={(e) => setOptions({ ...options, scheduledTime: e.target.value })}
                          className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-tech transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    {!routeResult ? (
                      <div className="text-center py-16 px-6 glass rounded-3xl border border-slate-800/40">
                        <RouteIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <h3 className="text-base font-bold text-slate-200">Nenhuma rota calculada no momento</h3>
                        <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                          Para visualizar a sequência de paradas, instruções turn-by-turn e métricas detalhadas, calcule uma rota na aba Planejamento.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCurrentScreen('home')}
                          className="mt-6 px-6 py-2.5 bg-tech/10 border border-tech/30 hover:border-tech text-tech text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                        >
                          <MapIcon className="w-4 h-4" />
                          Ir para Planejamento
                        </button>
                      </div>
                    ) : (
                      <div className="glass rounded-3xl overflow-hidden border border-slate-800/50 shadow-2xl h-[780px]">
                        <Sidebar 
                          stops={routeResult.sequence} 
                          summary={routeResult.summary}
                          score={routeResult.score}
                          aiAnalysis={routeResult.aiAnalysis}
                          hybridAnalysis={routeResult.hybridAnalysis}
                          onNavigate={() => setCurrentScreen('navigation')}
                          isLoading={false}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
"""

with open('app/page.tsx', 'w') as f:
    f.write(clean_prefix + all_screens_suffix)

print("Appended all screens successfully!")

