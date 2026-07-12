const fs = require('fs');
let code = fs.readFileSync('./components/MapView.tsx', 'utf-8');

// 1. Move triggerWazeReroute up and wrap in useCallback
const fullMatch = code.match(/\/\/ Core Dynamic Rerouting Engine \(Consults live Maps engines from current vehicle position\)([\s\S]*?)  \/\/ Timer-based Autopilot Simulation loop for desktop\/iFrame environments/);

if (fullMatch) {
  let rerouteCode = fullMatch[0].replace('  // Timer-based Autopilot Simulation loop for desktop/iFrame environments', '');
  
  // Remove the old one
  code = code.replace(fullMatch[0], '  // Timer-based Autopilot Simulation loop for desktop/iFrame environments');
  
  // Wrap in useCallback
  rerouteCode = rerouteCode.replace('const triggerWazeReroute = async () => {', 'const triggerWazeReroute = React.useCallback(async (forcedOrigin?: [number, number]) => {');
  rerouteCode = rerouteCode.replace('if (isRerouting || !carCoords || polyline.length === 0) return;', 'const startPoint = forcedOrigin || carCoords;\n    if (isRerouting || !startPoint || polyline.length === 0) return;');
  rerouteCode = rerouteCode.replace('const recalculatePoints = [\n        [carCoords[0], carCoords[1]],', 'const recalculatePoints = [\n        [startPoint[0], startPoint[1]],');
  
  // End of function replace
  rerouteCode = rerouteCode.replace(/  };\n$/, '  }, [isRerouting, carCoords, polyline.length, navIndex, stops, onRouteRecalculated]);\n\n');

  // Insert before geolocation
  code = code.replace('  // Real Geolocation Tracking System', rerouteCode + '  // Real Geolocation Tracking System');
}

// 2. Change TileLayer
code = code.replace(/<TileLayer\s+attribution='&copy; CARTO'\s+url="https:\/\/\{s\}\.basemaps\.cartocdn\.com\/dark_all\/\{z\}\/\{x\}\/\{y\}\{r\}\.png"\s+maxNativeZoom=\{19\}\s+maxZoom=\{22\}\s+\/>/, 
`<TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            maxNativeZoom={22}
            maxZoom={22}
            className="dark-map-tiles"
          />`);

// 3. Add Rerouting logic if deviates from route (minD > 0.000005)
code = code.replace(/snappedCoords = \[latitude, longitude\];\n\s+\}/, 
`snappedCoords = [latitude, longitude];
                    // Se desviar consideravelmente, recalcula a rota do novo ponto
                    if (d > 0.000025 && autoRerouteEnabled && !isRerouting) {
                      triggerWazeReroute([latitude, longitude]);
                    }
                  }`);

fs.writeFileSync('./components/MapView.tsx', code);
