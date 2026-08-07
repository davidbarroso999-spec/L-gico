with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_code = content[pos_home:pos_loading]

p_anim = home_code.find("<AnimatePresence>")
print(home_code[p_anim-400:p_anim+100])

