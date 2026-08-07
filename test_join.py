with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_bento1 = content.find('{/* Bento Box 1: Vehicle selection */}')
pos_bento6_heading = content.find('Rotas Salvas e Agendadas')
pos_bento6_div = content.rfind('<div className="glass p-5 xs:p-6 md:p-7 rounded-3xl border border-slate-800/40">', 0, pos_bento6_heading)
pos_calc = content.find('{!hasTwoOrMoreAddresses ?', pos_bento6_heading)

print("END OF HOME_INPUTS:")
print(content[pos_bento1-300:pos_bento1])

print("\nSTART OF BENTO_SAVED:")
print(content[pos_bento6_div:pos_bento6_div+200])

