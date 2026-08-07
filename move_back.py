import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    # Find the start of the right section
    start_idx = -1
    for i, line in enumerate(lines):
        if 'Right Section: Dynamic Logistics Configuration Bento Box List' in line:
            start_idx = i
            break
            
    # Find the end of the Right Section
    end_idx = -1
    if start_idx != -1:
        # Look for the tutorial section or the end of the settings screen
        for i in range(start_idx, len(lines)):
            if '{/* 🔮 TUTORIAL GUIADO DE OPERAÇÃO DO APP */}' in lines[i]:
                end_idx = i - 1
                break
                
    if start_idx == -1 or end_idx == -1:
        print("Could not find bounds of settings to move")
        sys.exit(1)
        
    # Extract settings content
    settings_content = lines[start_idx:end_idx]
    
    # We will remove them from settings screen
    del lines[start_idx:end_idx]
    
    # Insert back into Home screen
    # Where? Probably right after '{/* Bento Box 6: Saved & Shared Routes List */}' and its closing div
    # Let's find Bento Box 6
    bento6_idx = -1
    for i, line in enumerate(lines):
        if '{/* Bento Box 6: Saved & Shared Routes List */}' in line:
            bento6_idx = i
            break
            
    # Find the closing div for Bento Box 6
    insert_idx = -1
    if bento6_idx != -1:
        div_count = 0
        for i in range(bento6_idx, len(lines)):
            div_count += lines[i].count('<div')
            div_count -= lines[i].count('</div')
            if div_count == 0:
                insert_idx = i + 1
                break
                
    if insert_idx != -1:
        # Wrap settings_content if needed? It's just a bunch of divs.
        lines = lines[:insert_idx] + ['              <div className="flex flex-col gap-6 mt-6">\n'] + settings_content + ['              </div>\n'] + lines[insert_idx:]
        
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Moved settings back to home screen")

main()
