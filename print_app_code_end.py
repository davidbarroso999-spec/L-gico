with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_code = content[pos_home:pos_loading]
p_app = home_code.find("showAppContent && (")
app_code = home_code[p_app:]

print(repr(app_code[-400:]))

