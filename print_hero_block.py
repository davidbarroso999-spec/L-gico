with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_code = content[pos_home:pos_loading]

p_hero = home_code.find("className={`w-full flex-shrink-0 flex flex-col items-center")
p_app = home_code.find("showAppContent && (")

print(home_code[p_hero:p_app])

