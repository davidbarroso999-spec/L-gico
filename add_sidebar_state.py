with open('app/page.tsx', 'r') as f:
    content = f.read()

target = "const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);"
replacement = "const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);\n  const [isSidebarOpen, setIsSidebarOpen] = useState(true);"

if target in content:
    content = content.replace(target, replacement)
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Added isSidebarOpen state successfully!")

