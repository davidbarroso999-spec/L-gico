with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_demo = content.find('Usar Rota de Laboratório Demo')
pos_demo_end = content.find('</div>', pos_demo) # button div
pos_demo_end = content.find('</div>', pos_demo_end + 1) # inner div
pos_demo_end = content.find('</div>', pos_demo_end + 1) # outer div

print("DEMO END:")
print(content[pos_demo:pos_demo_end+10])

