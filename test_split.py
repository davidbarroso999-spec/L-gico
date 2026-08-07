with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_bento1 = content.find('{/* Bento Box 1: Vehicle selection */}')
pos_bento6_heading = content.find('Rotas Salvas e Agendadas')
pos_bento6_div = content.rfind('<div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">', 0, pos_bento6_heading)
pos_calc = content.find('{!hasTwoOrMoreAddresses ?', pos_bento6_heading)
pos_loading = content.find("{currentScreen === 'loading' && (")

print("pos_home:", pos_home)
print("pos_bento1:", pos_bento1)
print("pos_bento6_div:", pos_bento6_div)
print("pos_calc:", pos_calc)
print("pos_loading:", pos_loading)

home_inputs = content[pos_home:pos_bento1]
bento_prefs = content[pos_bento1:pos_bento6_div]
bento_saved = content[pos_bento6_div:pos_calc]
home_calc = content[pos_calc:pos_loading]

print("Inputs len:", len(home_inputs))
print("Prefs len:", len(bento_prefs))
print("Saved len:", len(bento_saved))
print("Calc len:", len(home_calc))

