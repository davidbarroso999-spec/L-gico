with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_main = content.find("<main className=\"flex-1")
pos_main_end = content.find("</main>")

main_code = content[pos_main:pos_main_end]

open_p = main_code.count('(')
close_p = main_code.count(')')

open_b = main_code.count('{')
close_b = main_code.count('}')

print("Main Parens Open:", open_p, "Close:", close_p)
print("Main Braces Open:", open_b, "Close:", close_b)

