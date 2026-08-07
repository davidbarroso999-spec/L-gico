with open('app/page.tsx', 'r') as f:
    content = f.read()

pos_home_start = content.find("{currentScreen === 'home' && (")
pos_loading_start = content.find("{currentScreen === 'loading' && (")

print("Home block length:", pos_loading_start - pos_home_start)

