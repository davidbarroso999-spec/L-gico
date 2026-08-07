import sys

def main():
    with open('app/page.tsx', 'r') as f:
        lines = f.readlines()
        
    start_idx = -1
    for i, line in enumerate(lines):
        if "currentScreen === 'result' && routeResult && (" in line:
            start_idx = i
            break
            
    if start_idx != -1:
        end_idx = -1
        # Find the matching closing div for motion.div
        div_count = 0
        for i in range(start_idx, len(lines)):
            if '<motion.div' in lines[i]:
                div_count += 1
            if '</motion.div>' in lines[i]:
                div_count -= 1
                if div_count == 0:
                    end_idx = i + 1
                    break
                    
        # Replace the whole block
        new_content = [
            "          {currentScreen === 'result' && routeResult && (\n",
            '            <motion.div\n',
            '              key="result"\n',
            '              initial={{ opacity: 0, y: 40, scale: 0.98 }}\n',
            '              animate={{ opacity: 1, y: 0, scale: 1 }}\n',
            '              exit={{ opacity: 0, y: -20, scale: 0.98 }}\n',
            "              transition={{ duration: 0.7, type: 'spring', stiffness: 90, damping: 20 }}\n",
            '              className={`h-full flex relative w-full overflow-hidden`}\n',
            '            >\n',
            '              <div className="absolute inset-0 z-0">\n',
            '                <MapView mapStyleProp={mapStyle} showTrafficProp={showTraffic} showWeatherProp={showWeather} stops={routeResult.sequence} geometry={routeResult.geometry} routeSegments={routeResult.segments} alternatives={routeResult.alternatives || []} onRouteRecalculated={setRouteResult} />\n',
            '              </div>\n',
            '            </motion.div>\n',
            '          )}\n'
        ]
        
        lines = lines[:start_idx] + new_content + lines[end_idx:]
        
    with open('app/page.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Fixed syntax")

main()
