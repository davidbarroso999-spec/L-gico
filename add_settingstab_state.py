with open('app/page.tsx', 'r') as f:
    content = f.read()

target = "const [isSidebarOpen, setIsSidebarOpen] = useState(true);"
replacement = "const [isSidebarOpen, setIsSidebarOpen] = useState(true);\n  const [settingsTab, setSettingsTab] = useState<'preferences' | 'details'>('preferences');"

if target in content:
    content = content.replace(target, replacement)
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Added settingsTab state successfully!")

