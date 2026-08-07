def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    for i in range(3590, 3615):
        if 'TUTORIAL GUIADO' in lines[i]:
            if '</div>' in lines[i-1]:
                print("Removing extra div at", i-1)
                del lines[i-1]
                break

    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
main()
