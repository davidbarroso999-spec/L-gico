with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_loading = content.find("{currentScreen === 'loading' && (")
pos_result = content.find("{currentScreen === 'result' &&")

print(content[pos_loading:pos_result])

