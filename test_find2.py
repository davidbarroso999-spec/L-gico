with open('app/page.tsx', 'r') as f:
    content = f.read()

pos6 = content.find('{/* Bento Box 6: Saved & Shared Routes List */}')
if pos6 == -1:
    pos6 = content.find('Rotas Salvas e Agendadas')

pos_loading = content.find("{currentScreen === 'loading' && (")

print("Pos6:", pos6, "Pos_loading:", pos_loading)

bento6_code = content[pos6:pos_loading]
print("Bento6 len:", len(bento6_code))

