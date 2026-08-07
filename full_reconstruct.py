import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

# 1. Icons import check
if 'Sliders,' not in content:
    content = content.replace('import { MapPin,', 'import { MapPin, Sliders,')

# 2. State checks
if 'const [settingsTab, setSettingsTab]' not in content:
    content = content.replace(
        "const [isSidebarOpen, setIsSidebarOpen] = useState(true);",
        "const [isSidebarOpen, setIsSidebarOpen] = useState(true);\n  const [settingsTab, setSettingsTab] = useState<'preferences' | 'details'>('preferences');"
    )

pos_home = content.find("{currentScreen === 'home' && (")
pos_bento1 = content.find('{/* Bento Box 1: Vehicle selection */}')
pos_bento6_heading = content.find('Rotas Salvas e Agendadas')
pos_bento6_div = content.rfind('<div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">', 0, pos_bento6_heading)
pos_calc = content.find('{!hasTwoOrMoreAddresses ?', pos_bento6_heading)
pos_loading = content.find("{currentScreen === 'loading' && (")

pos_demo = content.find('Usar Rota de Laboratório Demo')
pos_demo_end = content.find('</div>', pos_demo)
pos_demo_end = content.find('</div>', pos_demo_end + 1)
pos_demo_end = content.find('</div>', pos_demo_end + 1) + len('</div>')

clean_home_inputs = content[pos_home : pos_demo_end].strip()
clean_bento_prefs = content[pos_bento1 : pos_bento6_div].strip()
clean_bento_saved = content[pos_bento6_div : pos_calc].strip()
clean_home_calc = content[pos_calc : pos_loading].strip()

# Clean trailing stray divs if present
while clean_bento_prefs.endswith('</div>'):
    if clean_bento_prefs.count('<div') < clean_bento_prefs.count('</div'):
        clean_bento_prefs = clean_bento_prefs[:-6].strip()
    else:
        break

# Rebuild home block
rebuilt_home = clean_home_inputs + """
                {/* Bento Box 6: Saved & Shared Routes List */}
                <div className="mt-6">
                  """ + clean_bento_saved + """
                </div>
                """ + clean_home_calc

# Result screen block
rebuilt_result = """          {currentScreen === 'result' && routeResult && (
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
          )}"""

# Settings screen block
rebuilt_settings = """          {currentScreen === 'settings' && (
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
                    """ + clean_bento_prefs + """
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
          )}"""

pos_dashboard = content.find("{currentScreen === 'dashboard' && (")

pre_home = content[:pos_home]
loading_to_dash = content[pos_loading:pos_dashboard]

pos_res_start = loading_to_dash.find("{currentScreen === 'result' && routeResult && (")
pos_nav_start = loading_to_dash.find("{currentScreen === 'navigation' && routeResult && (")

loading_part = loading_to_dash[:pos_res_start]
nav_part = loading_to_dash[pos_nav_start:]

new_middle = loading_part + rebuilt_result + '\n' + nav_part

post_dash = content[pos_dashboard:]
pos_settings_start = post_dash.find("{currentScreen ===")

dash_only = post_dash[:pos_settings_start]

final_code = pre_home + rebuilt_home + '\n' + new_middle + dash_only + rebuilt_settings + '\n        </AnimatePresence>\n      </main>\n    </div>\n  );\n}\n'

with open('app/page.tsx', 'w') as f:
    f.write(final_code)

print("Full reconstruction complete!")

