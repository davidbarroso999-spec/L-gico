import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    for i in range(len(lines)-1, -1, -1):
        if '</AnimatePresence>' in lines[i]:
            lines = lines[:i+1] + [
                '      </main>\n',
                '    </div>\n',
                '  );\n',
                '}\n'
            ]
            break
            
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Patched end of file")

main()
