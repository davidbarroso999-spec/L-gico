import re

with open('app/page.tsx', 'r') as f:
    lines = f.readlines()

# Find Bento Box 1 to 5 block in home
start_bento_idx = -1
end_bento_idx = -1

for i, line in enumerate(lines):
    if '{/* Right Section: Dynamic Logistics Configuration Bento Box List */}' in line:
        start_bento_idx = i
        break

if start_bento_idx != -1:
    # Find the end of this block before currentScreen === 'loading'
    for i in range(start_bento_idx, len(lines)):
        if "{currentScreen === 'loading' && (" in lines[i]:
            # Backtrack to find closing div/motion.div
            end_bento_idx = i - 3
            break

print("Bento block lines:", start_bento_idx, "to", end_bento_idx)

