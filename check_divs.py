with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_block = content[pos_home:pos_loading]

open_divs = home_block.count('<div') + home_block.count('<motion.div')
close_divs = home_block.count('</div>') + home_block.count('</motion.div>')

print("Open tags:", open_divs, "Close tags:", close_divs)
