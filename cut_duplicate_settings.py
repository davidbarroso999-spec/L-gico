with open('app/page.tsx', 'r') as f:
    content = f.read()

pos1 = content.find("{currentScreen === 'settings' && (")
pos2 = content.find("{currentScreen === 'settings' && (", pos1 + 1)

if pos2 != -1:
    # Keep up to pos2, but wait! Does pos1 end before pos2?
    content = content[:pos2] + "\n        </AnimatePresence>\n      </main>\n    </div>\n  );\n}\n"
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Cut duplicate settings block after pos2!")

