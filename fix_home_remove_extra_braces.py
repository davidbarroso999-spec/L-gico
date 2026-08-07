with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_loading = content.find("{currentScreen === 'loading' && (")

# Look at the end of home
pos_btn = content.rfind("CALCULAR MELHOR ROTA\n                </button>", 0, pos_loading)

exact_tail = """CALCULAR MELHOR ROTA
                </button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  </motion.div>
</AnimatePresence>
</div>
</motion.div>
)}

          """

content = content[:pos_btn] + exact_tail + content[pos_loading:]

with open('app/page.tsx', 'w') as f:
    f.write(content)

print("Home tail updated without extra braces!")

