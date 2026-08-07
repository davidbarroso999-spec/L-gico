with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_code = content[pos_home:pos_loading]

p_app = home_code.find("showAppContent && (")
app_code = home_code[p_app:]

stack = []
in_string = False
string_char = ''

for i, char in enumerate(app_code):
    if char in ['"', "'", '`'] and (i == 0 or app_code[i-1] != '\\'):
        if not in_string:
            in_string = True
            string_char = char
        elif string_char == char:
            in_string = False
    elif not in_string:
        if char == '{':
            # print snippet
            snippet = repr(app_code[i:i+40])
            stack.append((i, snippet))
        elif char == '}':
            if not stack:
                print(f"Unmatched }} at index {i}: {repr(app_code[i-20:i+20])}")
            else:
                open_pos, snippet = stack.pop()

print("Remaining open braces at end:", len(stack))
for open_pos, snippet in stack:
    print(f"  Unclosed {{ at pos {open_pos}: {snippet}")

