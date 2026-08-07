with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_loading = content.find("{currentScreen === 'loading' && (")
pos_btn = content.rfind("CALCULAR MELHOR ROTA\n                </button>", 0, pos_loading)

exact_lines = [
    "CALCULAR MELHOR ROTA",
    "                </button>",
    "              </div>",
    "            </motion.div>",
    "          </>",
    "        )}",
    "      </motion.div>",
    "    )}",
    "  </AnimatePresence>",
    "</div>",
    "</motion.div>",
    ")}"
]

content = content[:pos_btn] + "\n".join(exact_lines) + "\n\n          " + content[pos_loading:]

with open('app/page.tsx', 'w') as f:
    f.write(content)

print("Home structure corrected!")

