import re

with open('app/page.tsx', 'r') as f:
    content = f.read()

# 1. Ensure isSidebarOpen and settingsTab states exist
if 'const [isSidebarOpen, setIsSidebarOpen]' not in content:
    content = content.replace(
        "const [currentScreen, setCurrentScreen] = useState<'home' | 'loading' | 'result' | 'navigation' | 'dashboard' | 'settings'>('home');",
        "const [currentScreen, setCurrentScreen] = useState<'home' | 'loading' | 'result' | 'navigation' | 'dashboard' | 'settings'>('home');\n  const [isSidebarOpen, setIsSidebarOpen] = useState(true);\n  const [settingsTab, setSettingsTab] = useState<'preferences' | 'details'>('preferences');"
    )
elif 'const [settingsTab, setSettingsTab]' not in content:
    content = content.replace(
        "const [isSidebarOpen, setIsSidebarOpen] = useState(true);",
        "const [isSidebarOpen, setIsSidebarOpen] = useState(true);\n  const [settingsTab, setSettingsTab] = useState<'preferences' | 'details'>('preferences');"
    )

# Fix type declaration of currentScreen if it was changed
content = content.replace(
    "<'home' | 'loading' | 'result' | 'navigation' | 'dashboard' | 'route_details'>",
    "<'home' | 'loading' | 'result' | 'navigation' | 'dashboard' | 'settings'>"
)

# 2. Update navigation tabs in Floating Menu Ball
old_tabs_pattern = re.compile(r"\{\s*id:\s*'route_details',.*?\n", re.MULTILINE)
content = old_tabs_pattern.sub("{ id: 'settings', label: 'Configurações', icon: Settings, desc: 'Ajustes e Detalhes da Rota' },\n", content)

print("Updated state and navigation menu")
with open('app/page.tsx', 'w') as f:
    f.write(content)
