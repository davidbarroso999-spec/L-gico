import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    for i in range(len(lines)):
        if 'className="h-[800px] rounded-3xl overflow-hidden border border-slate-800/50 shadow-2xl"' in lines[i]:
            lines.insert(i+1, '''                  <Sidebar 
                    stops={routeResult.sequence} 
                    summary={routeResult.summary}
                    score={routeResult.score}
                    aiAnalysis={routeResult.aiAnalysis}
                    hybridAnalysis={routeResult.hybridAnalysis}
                    onNavigate={() => setCurrentScreen('navigation')}
                    isLoading={false}
                  />\n''')
            break
            
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Inserted Sidebar")

main()
