with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_saved_start = content.find('{/* Bento Box 6: Saved & Shared Routes List */}')
pos_calc = content.find('{!hasTwoOrMoreAddresses ?')

saved_block = content[pos_saved_start:pos_calc]

print("SAVED BLOCK:")
print(saved_block[-300:])

