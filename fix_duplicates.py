import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    # Remove duplicate states
    # Find "const [mapStyle, setMapStyle] = useState<'google-streets' | 'google-hybrid' | 'google-terrain' | 'carto-voyager' | 'dark'>('google-streets');"
    # and remove the second one.
    
    seen = 0
    indices_to_remove = []
    
    for i, line in enumerate(lines):
        if "const [mapStyle, setMapStyle] = useState<'google-streets'" in line:
            seen += 1
            if seen > 1:
                indices_to_remove.extend([i, i+1, i+2])
                
    # Remove backwards to not shift indices
    for i in sorted(indices_to_remove, reverse=True):
        del lines[i]
        
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Fixed duplicates")

main()
