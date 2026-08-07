with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

# Find line 2550 area
pos_bad = content.find("</div>        {\n      </div>    </motion.div>  )}")
if pos_bad == -1:
    pos_bad = content.find("        {\n      </div>    </motion.div>  )}")

calc_button_jsx = """
        {!hasTwoOrMoreAddresses ? (
          <button 
            onClick={runOptimization}
            className="w-full bg-tech text-slate-950 font-black py-4.5 rounded-2xl text-lg md:text-xl shadow-[0_15px_30px_rgba(209,160,84,0.25)] hover:bg-tech/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Sparkles className="w-5 h-5" />
            CALCULAR MELHOR ROTA
          </button>
        ) : (
          <>
            <div className="h-32 w-full" />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-[1200] bg-slate-950/95 border-t border-tech/30 p-4 md:p-6 shadow-[0_-10px_35px_rgba(209,160,84,0.15)] flex items-center justify-center backdrop-blur-xl"
            >
              <div className="w-full max-w-2xl flex items-center justify-between gap-4">
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest leading-none">Roteamento Ativo</span>
                  <span className="text-sm font-black text-white mt-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tech animate-pulse" />
                    {enteredAddresses.length} endereços inseridos
                  </span>
                </div>
                
                <button 
                  onClick={runOptimization}
                  className="w-full sm:w-auto px-8 py-3.5 bg-tech text-slate-950 font-black rounded-xl text-sm md:text-base shadow-[0_4px_20px_rgba(209,160,84,0.3)] hover:shadow-[0_4px_25px_rgba(209,160,84,0.45)] hover:bg-tech/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  CALCULAR MELHOR ROTA
                </button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  )}"""

if pos_bad != -1:
    content = content[:pos_bad] + calc_button_jsx + '\n          ' + content[pos_loading:]
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Replaced calc button!")
else:
    print("pos_bad not found!")

