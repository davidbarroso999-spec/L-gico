import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

pattern = re.compile(r'(\}\)\}\s*</div>\s*</div>\s*)\{\s*</div>\s*')
content = pattern.sub(r'\1', content)

with open('app/page.tsx', 'w') as f:
    f.write(content)

print("Regex replacement done!")

