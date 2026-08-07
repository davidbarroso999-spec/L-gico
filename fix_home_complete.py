with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

# Replace tail before pos_loading
bad = "</button>\n              </div>\n            </motion.div>\n          </>\n        )}\n      </div>\n    </div>\n  </motion.div>\n)}\n          "

good = """</button>
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

content = content.replace(bad, good)

with open('app/page.tsx', 'w') as f:
    f.write(content)

print("Applied home complete ending fix!")

