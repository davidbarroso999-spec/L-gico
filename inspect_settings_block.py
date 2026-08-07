with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_start = content.find("{currentScreen === 'settings' && (")
pos_end = content.find("</AnimatePresence>", pos_start)

print("Start pos:", pos_start, "End pos:", pos_end)
print("Block preview:\n", content[pos_start:pos_start+200])
