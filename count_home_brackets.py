with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_code = content[pos_home:pos_loading]

open_p = home_code.count('(')
close_p = home_code.count(')')

open_b = home_code.count('{')
close_b = home_code.count('}')

print("Parens Open:", open_p, "Close:", close_p)
print("Braces Open:", open_b, "Close:", close_b)

