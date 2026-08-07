def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    start = -1
    for i, line in enumerate(lines):
        if "Right Section: Dynamic Logistics Configuration Bento Box List" in line:
            start = i
            break
            
    if start == -1:
        return
        
    div_count = 0
    for i in range(start, start + 300):
        line = lines[i]
        div_count += line.count('<div')
        div_count -= line.count('</div')
        print(f"{i}: {div_count} - {line.strip()}")
        if 'TUTORIAL GUIADO' in line:
            break

main()
