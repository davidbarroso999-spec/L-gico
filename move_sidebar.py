import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    start_idx = -1
    for i, line in enumerate(lines):
        if "<RouteSidebar" in line:
            start_idx = i
            break
            
    if start_idx == -1:
        print("Could not find RouteSidebar")
        return
        
    print("Found RouteSidebar at line", start_idx)

main()
