import sys

def main():
    with open('components/MapView.tsx', 'r') as f:
        lines = f.readlines()
        
    # 1. Update MapProps
    for i, line in enumerate(lines):
        if 'onRouteRecalculated?:' in line:
            lines.insert(i+1, "  mapStyleProp?: 'google-streets' | 'google-hybrid' | 'google-terrain' | 'carto-voyager' | 'dark';\n")
            lines.insert(i+2, "  showTrafficProp?: boolean;\n")
            lines.insert(i+3, "  showWeatherProp?: boolean;\n")
            break
            
    # 2. Update MapView function signature
    for i, line in enumerate(lines):
        if 'export default function MapView({ stops, geometry' in line:
            lines[i] = line.replace('onRouteRecalculated }: MapProps)', 'onRouteRecalculated, mapStyleProp, showTrafficProp, showWeatherProp }: MapProps)')
            break
            
    # 3. Add useEffect to sync props
    for i, line in enumerate(lines):
        if 'const [is3DMode' in line:
            lines.insert(i, """
  useEffect(() => {
    if (mapStyleProp) setTileStyle(mapStyleProp);
  }, [mapStyleProp]);
  useEffect(() => {
    if (showTrafficProp !== undefined) setShowTrafficLayer(showTrafficProp);
  }, [showTrafficProp]);
  useEffect(() => {
    if (showWeatherProp !== undefined) setShowWeatherLayer(showWeatherProp);
  }, [showWeatherProp]);
""")
            break
            
    # 4. Remove floating toggles
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if '{/* Toggle Live Weather Layer */}' in line:
            start_idx = i
            break
            
    if start_idx != -1:
        for i in range(start_idx, len(lines)):
            if '{/* Giroscópio */}' in line:
                pass
            if '          <div className="w-px h-4 bg-slate-800/80 my-auto" />' in lines[i]:
                pass
            if '{/* Giroscópio */}' in lines[i]:
                end_idx = i
                break
                
        if end_idx != -1:
            print(f"Removing lines {start_idx} to {end_idx}")
            del lines[start_idx:end_idx]
            
    with open('components/MapView.tsx', 'w') as f:
        f.writelines(lines)
        
    print("Done patching MapView")

main()
