with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_block = content[pos_home:pos_loading]

o = home_block.count('<div') + home_block.count('<motion.div')
c = home_block.count('</div>') + home_block.count('</motion.div>')

diff = o - c
print("Home Diff (open - close):", diff)

if diff > 0:
    closing_divs = '</div>' * diff
    # Insert closing_divs before the last </motion.div> in home_block
    last_motion_close = home_block.rfind('</motion.div>')
    fixed_home_block = home_block[:last_motion_close] + closing_divs + home_block[last_motion_close:]
    
    content = content[:pos_home] + fixed_home_block + content[pos_loading:]
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print(f"Inserted {diff} closing divs into home block!")

