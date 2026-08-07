import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home = content.find("{currentScreen === 'home' && (")
pos_loading = content.find("{currentScreen === 'loading' && (")

home_code = content[pos_home:pos_loading]

positions = [43, 655, 6078, 6151, 6574]
for p in positions:
    print(f"--- At pos {p} ---")
    print(repr(home_code[p-20:p+80]))

