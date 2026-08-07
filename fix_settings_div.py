with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_s = content.find("{currentScreen === 'settings' && (")

bad_end = """                  </div>
                )}
              </div>
            </motion.div>
          )}"""

good_end = """                )}
              </div>
            </motion.div>
          )}"""

if bad_end in content:
    content = content.replace(bad_end, good_end)
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Fixed extra div in settings!")

