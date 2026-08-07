with open('app/page.tsx', 'r') as f:
    content = f.read()

pos1 = content.find('{/* Bento Box 1: Vehicle selection */}')
pos6 = content.find('Rotas Salvas e Agendadas')
print("Pos1:", pos1, "Pos6:", pos6)

if pos1 != -1 and pos6 != -1:
    sub = content[pos1:pos6]
    print("Length of sub:", len(sub))

