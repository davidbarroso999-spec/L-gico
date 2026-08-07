import re

with open('app/page.tsx', 'r') as f:
    lines = f.readlines()

stack = []

for idx, line in enumerate(lines, 1):
    # Find all JSX tags
    tags = re.findall(r'</?([a-zA-Z0-9\.\-\_]+)(?:\s+[^>]*?)?>', line)
    for tag in tags:
        # Ignore self-closing tags in line
        pass

# Better approach: parse tokens
code = ''.join(lines)
# Strip comments
code_no_comments = re.sub(r'\{/\*.*?\*/\}', '', code, flags=re.DOTALL)

# Find all <tag ...> and </tag> and self closing <tag ... />
token_pattern = re.compile(r'</?([a-zA-Z0-9\._]+)(?:\s+[^/>]*?)?(/)?>')

tokens = []
for match in token_pattern.finditer(code_no_comments):
    full_str = match.group(0)
    tag_name = match.group(1)
    is_self = match.group(2) == '/'
    is_close = full_str.startswith('</')
    line_num = code_no_comments[:match.start()].count('\n') + 1
    
    if is_self:
        continue
    if is_close:
        tokens.append(('close', tag_name, line_num))
    else:
        tokens.append(('open', tag_name, line_num))

stack = []
for kind, name, lnum in tokens:
    if kind == 'open':
        stack.append((name, lnum))
    else:
        if not stack:
            print(f"Error: Closing tag </{name}> at line {lnum} with empty stack!")
        else:
            last_name, last_line = stack.pop()
            if last_name != name:
                print(f"Mismatch at line {lnum}: Expected </{last_name}> (opened at line {last_line}), got </{name}>")

print(f"Parsing complete! Stack size remaining: {len(stack)}")
if stack:
    print("Unclosed tags remaining on stack:")
    for tag, lnum in stack[-15:]:
        print(f"  <{tag}> opened at line {lnum}")

