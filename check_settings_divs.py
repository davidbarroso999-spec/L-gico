with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_settings = content.find("{currentScreen === 'settings' && (")
pos_end = content.find("</AnimatePresence>", pos_settings)

settings_block = content[pos_settings:pos_end]

open_divs = settings_block.count('<div') + settings_block.count('<motion.div')
close_divs = settings_block.count('</div>') + settings_block.count('</motion.div>')

print("Settings Open tags:", open_divs, "Close tags:", close_divs)
