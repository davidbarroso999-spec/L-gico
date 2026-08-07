import re

with open('app/page.tsx', 'r') as f:
    lines = f.readlines()

rotas_lines = lines[1658:2565] # Lines around rotas-section to calculate button
rotas_code = ''.join(rotas_lines)

tag_regex = re.compile(r'</?([a-zA-Z0-9\._]+)(?:\s+[^>]*?)?>')

stack = []
for m in tag_regex.finditer(rotas_code):
    tag_str = m.group(0)
    tag_name = m.group(1)
    line_num = 1659 + rotas_code[:m.start()].count('\n')
    
    if tag_str.endswith('/>') or tag_name in ['input', 'img', 'br', 'hr']:
        continue
    
    if tag_str.startswith('</'):
        if not stack:
            print(f"Error: Closing </{tag_name}> at line {line_num} with empty stack")
        else:
            top_name, top_line = stack.pop()
            if top_name != tag_name:
                print(f"Mismatch at line {line_num}: Opened <{top_name}> at line {top_line}, closed </{tag_name}>")
    else:
        stack.append((tag_name, line_num))

print(f"Tracing finished. Stack size remaining: {len(stack)}")
for name, l in stack:
    print(f"  Unclosed <{name}> at line {l}")

