with open('app/page.tsx', 'r') as f:
    content = f.read()

pos = content.find('{!hasTwoOrMoreAddresses ?')
print(repr(content[pos-100:pos]))

