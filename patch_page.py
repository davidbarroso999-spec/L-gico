import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    # Remove Sidebar from result screen
    # Find start of Sidebar container in result
    sidebar_container_start = -1
    for i, line in enumerate(lines):
        if "width: isSidebarOpen ? '400px' : '0px'" in line:
            # The div containing the sidebar
            sidebar_container_start = i - 2
            break
            
    if sidebar_container_start != -1:
        # Find end of that div
        div_count = 0
        sidebar_container_end = -1
        for i in range(sidebar_container_start, len(lines)):
            div_count += lines[i].count('<div')
            div_count -= lines[i].count('</div')
            if div_count == 0:
                sidebar_container_end = i + 1
                break
                
        # We need to save the Sidebar component string itself so we can reuse it
        sidebar_comp_start = -1
        sidebar_comp_end = -1
        for i in range(sidebar_container_start, sidebar_container_end):
            if '<Sidebar' in lines[i]:
                sidebar_comp_start = i
            if sidebar_comp_start != -1 and '/>' in lines[i]:
                sidebar_comp_end = i + 1
                break
        
        sidebar_code = lines[sidebar_comp_start:sidebar_comp_end] if sidebar_comp_start != -1 else []
        
        # Now delete the sidebar container from result screen
        del lines[sidebar_container_start:sidebar_container_end]
        print("Removed sidebar from result screen")
        
        # Now find the route_details screen
        route_details_idx = -1
        for i, line in enumerate(lines):
            if "currentScreen === 'route_details'" in line:
                route_details_idx = i
                break
                
        if route_details_idx != -1:
            # Insert the sidebar code into the route_details screen
            # Replace the contents of the max-w-2xl div
            max_w_start = -1
            for i in range(route_details_idx, len(lines)):
                if 'className="max-w-2xl mx-auto w-full"' in lines[i]:
                    max_w_start = i
                    break
                    
            if max_w_start != -1:
                # Find end of max-w-2xl div
                div_count = 0
                max_w_end = -1
                for i in range(max_w_start, len(lines)):
                    div_count += lines[i].count('<div')
                    div_count -= lines[i].count('</div')
                    if div_count == 0:
                        max_w_end = i + 1
                        break
                        
                # Replace content of max-w-2xl div
                new_content = [
                    '              <div className="max-w-2xl mx-auto w-full h-full">\n',
                    '                <h1 className="text-4xl font-bold font-display mb-8">Detalhes da Rota</h1>\n',
                    '                {!routeResult ? (\n',
                    '                  <div className="text-center py-20">\n',
                    '                    <p className="text-slate-400">Nenhuma rota calculada. Vá para a aba Planejamento e calcule uma rota.</p>\n',
                    '                  </div>\n',
                    '                ) : (\n',
                    '                  <div className="h-[800px] rounded-3xl overflow-hidden border border-slate-800/50 shadow-2xl">\n',
                ] + sidebar_code + [
                    '                  </div>\n',
                    '                )}\n',
                    '              </div>\n'
                ]
                
                lines = lines[:max_w_start] + new_content + lines[max_w_end:]
                print("Added sidebar to route_details screen")
                
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Done")

main()
