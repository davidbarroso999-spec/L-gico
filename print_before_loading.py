with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_loading = content.find("{currentScreen === 'loading' && (")
print(repr(content[pos_loading-300:pos_loading]))

