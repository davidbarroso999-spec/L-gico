with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_s = content.find("{currentScreen === 'settings' && (")
s_block = content[pos_s:]

o = s_block.count('<div') + s_block.count('<motion.div') + s_block.count('<button') + s_block.count('<h1') + s_block.count('<p') + s_block.count('<span') + s_block.count('<textarea') + s_block.count('<input') + s_block.count('<h3') + s_block.count('<RouteIcon') + s_block.count('<Sidebar') + s_block.count('<Sliders') + s_block.count('<List') + s_block.count('<Truck') + s_block.count('<InfoTooltip') + s_block.count('<Bike') + s_block.count('<Car') + s_block.count('<Zap') + s_block.count('<Sparkles') + s_block.count('<Clock') + s_block.count('<MapIcon')
c = s_block.count('</div>') + s_block.count('</motion.div>') + s_block.count('</button>') + s_block.count('</h1') + s_block.count('</p>') + s_block.count('</span') + s_block.count('</textarea>') + s_block.count('</h3')

print("All Opens:", o)
print("All Closes:", c)

