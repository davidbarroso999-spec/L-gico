import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_main = content.find("<main className=\"flex-1")
pos_main_end = content.find("</main>")

main_code = content[pos_main:pos_main_end]

# Strip JS expressions in quotes or comments
tag_regex = re.compile(r'</?([a-zA-Z0-9\._]+)(?:\s+[^>]*?)?>')

stack = []
for m in tag_regex.finditer(main_code):
    tag_str = m.group(0)
    tag_name = m.group(1)
    
    if tag_str.endswith('/>') or tag_name in ['input', 'img', 'br', 'hr']:
        continue
    
    if tag_str.startswith('</'):
        if not stack:
            print(f"ERROR: Unmatched closing tag </{tag_name}> at pos {m.start()} in main")
        else:
            top_tag, top_pos = stack.pop()
            if top_tag != tag_name:
                print(f"MISMATCH: Opened <{top_tag}> at {top_pos}, closed </{tag_name}> at {m.start()}")
    else:
        stack.append((tag_name, m.start()))

print(f"Main tag parsing finished. Remaining stack: {len(stack)}")
for tag_name, p in stack:
    print(f"  Unclosed <{tag_name}> at pos {p}")

