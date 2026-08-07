with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_bento1 = content.find('{/* Bento Box 1: Vehicle selection */}')
pos_bento6_heading = content.find('Rotas Salvas e Agendadas')
pos_bento6_div = content.rfind('<div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">', 0, pos_bento6_heading)
pos_calc = content.find('{!hasTwoOrMoreAddresses ?', pos_bento6_heading)
pos_loading = content.find("{currentScreen === 'loading' && (")

pos_demo = content.find('Usar Rota de Laboratório Demo')
pos_demo_end = content.find('</div>', pos_demo)
pos_demo_end = content.find('</div>', pos_demo_end + 1)
pos_demo_end = content.find('</div>', pos_demo_end + 1) + len('</div>')

home_inputs = content[pos_home : pos_demo_end]
bento_saved = content[pos_bento6_div : pos_calc]
home_calc = content[pos_calc : pos_loading]
bento_prefs = content[pos_bento1 : pos_bento6_div]

def count_tags(s):
    o = s.count('<div') + s.count('<motion.div')
    c = s.count('</div>') + s.count('</motion.div>')
    return o, c

print("home_inputs:", count_tags(home_inputs))
print("bento_saved:", count_tags(bento_saved))
print("home_calc:", count_tags(home_calc))
print("bento_prefs:", count_tags(bento_prefs))

