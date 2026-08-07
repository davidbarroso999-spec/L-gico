import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    for i in range(len(lines)):
        if lines[i].strip() == '}':
            if lines[i-1].strip() == '</div>':
                if 'route_details' in ''.join(lines[i-20:i]):
                    lines[i] = '            </motion.div>\n          )}\n'
            
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Fixed extra }")

main()
