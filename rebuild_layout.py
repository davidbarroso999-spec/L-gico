import re

with open('app/page.tsx', 'r') as f:
    code = f.read()

# Make sure settingsTab state is defined in HarpiaApp
if 'const [settingsTab, setSettingsTab]' not in code:
    code = code.replace(
        "const [isSidebarOpen, setIsSidebarOpen] = useState(true);",
        "const [isSidebarOpen, setIsSidebarOpen] = useState(true);\n  const [settingsTab, setSettingsTab] = useState<'preferences' | 'details'>('preferences');"
    )

# Extract Bento Box 6 (Saved Routes) block content
bento6_match = re.search(r'(/\* Bento Box 6: Saved & Shared Routes List \*/.*?)(?=\n\s*/\* Bento Box 1|\n\s*</motion\.div>|\n\s*</>)', code, re.DOTALL)

# Let's extract Bento Box 1,2,4,5,6 cleanly by reading the lines between 2470 and 2805
lines = code.split('\n')

bento_1_to_5_lines = []
bento_6_lines = []

in_bento_1_5 = False
in_bento_6 = False

for line in lines:
    if '/* Bento Box 1: Vehicle selection */' in line:
        in_bento_1_5 = True
        in_bento_6 = False
    elif '/* Bento Box 6: Saved & Shared Routes List */' in line and in_bento_1_5:
        in_bento_1_5 = False
        in_bento_6 = True
    
    if in_bento_1_5:
        bento_1_to_5_lines.append(line)
    elif in_bento_6:
        if '</motion.div>' in line or '{currentScreen === \'loading\'' in line:
            in_bento_6 = False
        else:
            bento_6_lines.append(line)

bento_1_to_5_str = '\n'.join(bento_1_to_5_lines)
bento_6_str = '\n'.join(bento_6_lines)

print("Extracted Bento 1-5 len:", len(bento_1_to_5_str))
print("Extracted Bento 6 len:", len(bento_6_str))

