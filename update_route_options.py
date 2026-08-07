with open('lib/route-engine.ts', 'r') as f:
    content = f.read()

target = "  customPrompt?: string;\n  engine?: 'google' | 'waze' | 'ors';"
replacement = "  customPrompt?: string;\n  engine?: 'google' | 'waze' | 'ors';\n  scheduledDate?: string;\n  scheduledTime?: string;"

if target in content:
    content = content.replace(target, replacement)
    with open('lib/route-engine.ts', 'w') as f:
        f.write(content)
    print("Updated RouteOptions in lib/route-engine.ts successfully!")
else:
    print("Target string not found in lib/route-engine.ts!")

