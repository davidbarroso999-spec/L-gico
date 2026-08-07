import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if line.strip() == ')}' and lines[i-1].strip() == ')}':
            lines[i] = ''
            
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Fixed extra )}")

main()
