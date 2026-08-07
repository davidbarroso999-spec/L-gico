with open('app/page.tsx', 'r') as f:
    content = f.read()

pos1 = content.find("{currentScreen === 'settings' && (")
pos2 = content.find("{currentScreen === 'settings' && (", pos1 + 1)

print("Pos 1:", pos1)
print("Pos 2:", pos2)

