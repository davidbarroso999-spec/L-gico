import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    for i in range(len(lines)-1, -1, -1):
        if '</div>' in lines[i]:
            lines[i] = lines[i].replace('</div>', '</main>')
            break
            
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Fixed closing tag")

main()
