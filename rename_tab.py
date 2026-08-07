import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        if "{ id: 'settings', label: 'Configurações', icon: Settings, desc: 'Ajustes Finos do Sistema' }" in line:
            lines[i] = line.replace("'settings'", "'route_details'").replace("'Configurações'", "'Detalhes da Rota'").replace("Settings", "List").replace("'Ajustes Finos do Sistema'", "'Itinerário e Instruções'")
        elif "currentScreen === 'settings'" in line:
            lines[i] = line.replace("'settings'", "'route_details'")
        elif "Preferências</h1>" in line:
            lines[i] = line.replace("Preferências", "Detalhes da Rota")
            
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Renamed tab")

main()
