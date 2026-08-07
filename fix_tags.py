import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    # We want to add a </div> before tutorial in settings
    for i, line in enumerate(lines):
        if 'TUTORIAL GUIADO DE OPERAÇÃO DO APP' in line:
            print(f"Adding </div> at line {i}")
            lines.insert(i, "              </div>\n")
            break
            
    # And we want to remove the extra </div> that is 2 lines before </motion.div> around line 2590
    for i, line in enumerate(lines):
        if 'CALCULAR MELHOR ROTA' in line and 'className="w-4 h-4"' in lines[i-1]:
            # Found the second calculate button
            # Let's find the </motion.div> after it
            for j in range(i, i+15):
                if '</motion.div>' in lines[j] and '</div>' in lines[j-1] and ')}' in lines[j-2]:
                    print(f"Removing extra </div> at line {j-1}")
                    del lines[j-1]
                    break
            break

    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)

main()
