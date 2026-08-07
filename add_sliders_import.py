with open('app/page.tsx', 'r') as f:
    content = f.read()

target = "} from 'lucide-react';"
replacement = ", Sliders} from 'lucide-react';"

if target in content:
    content = content.replace(target, replacement)
    with open('app/page.tsx', 'w') as f:
        f.write(content)
    print("Added Sliders import successfully!")

