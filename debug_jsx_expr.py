import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_code = content[pos_home:pos_loading]

p_app = home_code.find("showAppContent && (")
app_code = home_code[p_app:]

# Track curly braces { and } and ternaries ? and :
depth = 0
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
            depth += 1
            # print(f"Open {{ at index {i}, depth={depth}: {app_code[i:i+30]}")
        elif char == '}':
            depth -= 1
            # print(f"Close }} at index {i}, depth={depth}")
            if depth < 0:
                print(f"ERROR: Negative depth at index {i}: {app_code[i-30:i+30]}")
                break

print("Final JS brace depth inside showAppContent:", depth)

