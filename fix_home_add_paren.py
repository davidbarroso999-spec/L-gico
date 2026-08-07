with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_loading = content.find("{currentScreen === 'loading' && (")
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
)}
</AnimatePresence>
</div>
</motion.div>
)}

          """

# Notice:
# line 10: </motion.div>
# line 11: )}  <-- CLOSES showAppContent
# line 12: </AnimatePresence>
# line 13: </div>
# line 14: </motion.div>
# line 15: )}  <-- CLOSES home screen

exact_tail_fixed = """CALCULAR MELHOR ROTA
                </button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  </motion.div>
)}
</AnimatePresence>
</div>
</motion.div>
)}

          """

# Let's write the exact lines:
exact_tail_fixed = """CALCULAR MELHOR ROTA
                </button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  </motion.div>
)}
</AnimatePresence>
</div>
</motion.div>
)}

          """

# Wait, let's write out each line explicitly:
exact_lines = [
    "CALCULAR MELHOR ROTA",
    "                </button>",
    "              </div>",
    "            </motion.div>",
    "          </>",
    "        )}",
    "      </div>",
    "    </div>",
    "  </motion.div>",
    ")}",
    "</AnimatePresence>",
    "</div>",
    "</motion.div>",
    ")}"
]

content = content[:pos_btn] + "\n".join(exact_lines) + "\n\n          " + content[pos_loading:]

with open('app/page.tsx', 'w') as f:
    f.write(content)

print("Home tail set with showAppContent closing parenthesis!")

