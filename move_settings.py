import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()

    # Find where the Bento boxes start and end
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if 'Right Section: Dynamic Logistics Configuration Bento Box List' in line:
            start_idx = i
        if start_idx != -1 and '{!hasTwoOrMoreAddresses ? (' in line:
            end_idx = i
            break
            
    if start_idx == -1 or end_idx == -1:
        print("Could not find start or end index for Bento boxes.")
        sys.exit(1)

    print(f"Moving lines from {start_idx} to {end_idx}")
    bento_boxes = lines[start_idx:end_idx]
    
    # We want to keep the `<div className="w-full flex flex-col gap-6">` that wraps the Bento boxes?
    # Actually, the Bento boxes have `className="w-full flex flex-col gap-6"` around them.
    # Let's just move them into Settings.
    
    # Find settings insertion point
    settings_idx = -1
    for i, line in enumerate(lines):
        if '<div className="space-y-8">' in line and 'TUTORIAL GUIADO' in lines[i+1]:
            settings_idx = i + 1
            break
            
    if settings_idx == -1:
        print("Could not find settings insertion point.")
        sys.exit(1)
        
    print(f"Inserting at {settings_idx}")
    
    # Insert bento_boxes at settings_idx
    lines.insert(settings_idx, "".join(bento_boxes))
    
    # Remove from original location
    # Note: since we inserted BEFORE the original location (settings_idx is > start_idx),
    # wait, start_idx is ~2550, settings_idx is ~3600. So settings is AFTER the original location.
    # So we remove first, then insert. Or we can just build a new list.
    
    new_lines = []
    for i, line in enumerate(lines[:len(lines)-1]): # Skip the joined insertion if we didn't use insert
        pass # Too complex to do manually, let's just do it simple
        
    new_lines = lines[:start_idx] + lines[end_idx:settings_idx] + bento_boxes + lines[settings_idx:]
    
    with open('app/page.tsx', 'w') as f:
        f.writelines(new_lines)
        
    print("Done!")

main()
