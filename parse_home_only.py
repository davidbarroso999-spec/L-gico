import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_code = content[pos_home:pos_loading]

# Find all tags
tags = re.findall(r'</?([a-zA-Z0-9\._]+)(?:\s+[^/>]*?)?(/)?>', home_code)

stack = []
for full_match, tag_name, is_self in re.finditer(r'</?([a-zA-Z0-9\._]+)(?:\s+[^/>]*?)?(/)?>', home_code):
    full_str = full_match.group(0)
    tag_name = full_match.group(1)
    is_self = full_match.group(2) == '/'
    is_close = full_str.startswith('</')
    
    if is_self or tag_name in ['input', 'img', 'br', 'hr']:
        continue
    if is_close:
        if not stack:
            print(f"Empty stack when closing </{tag_name}>!")
        else:
            top = stack.pop()
            if top != tag_name:
                print(f"Mismatch: Expected </{top}>, got </{tag_name}>")
    else:
        stack.append(tag_name)

print("Stack size at end of home:", len(stack))
print("Remaining tags on stack:", stack)

