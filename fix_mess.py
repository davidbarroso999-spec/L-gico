import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    # We have TWO copies of "Right Section: Dynamic Logistics Configuration Bento Box List"
    # Find both
    indices = []
    for i, line in enumerate(lines):
        if 'Right Section: Dynamic Logistics Configuration Bento Box List' in line:
            indices.append(i)
            
    if len(indices) != 2:
        print(f"Expected 2 copies, found {len(indices)}")
        sys.exit(1)
        
    # Let's delete the second copy. It starts at indices[1] and ends somewhere.
    # Where does it end? Before "TUTORIAL GUIADO DE OPERAÇÃO DO APP" or something?
    # Or wait, the second copy is the one that got inserted from lines[settings_idx:]
    # So the second copy ends when we see the end of Bento 5:
    # "Salvar e Agendar Rota" and then </button> </div> </div>
    end_second = -1
    for i in range(indices[1], len(lines)):
        if 'Salvar e Agendar Rota' in lines[i]:
            # The next lines are </button>, </div>, </div>
            end_second = i + 3
            break
            
    if end_second == -1:
        print("Could not find end of second copy")
        sys.exit(1)
        
    print(f"Deleting second copy from {indices[1]-1} to {end_second}")
    # -1 because there is a comment "              {/* Right Section..."
    del lines[indices[1]-1 : end_second]
    
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Done")

main()
