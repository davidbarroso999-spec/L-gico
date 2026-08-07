with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_s = content.find("{currentScreen === 'settings' && (")
s_block = content[pos_s:]

o_div = s_block.count('<div') + s_block.count('<motion.div')
c_div = s_block.count('</div>') + s_block.count('</motion.div>')

print("Div Opens:", o_div)
print("Div Closes:", c_div)

