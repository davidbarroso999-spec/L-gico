const fs = require('fs');
let code = fs.readFileSync('./components/MapView.tsx', 'utf-8');

code = code.replace(/map\.setView\(carCoords, zoomLevel, \{ animate: false \}\);/g, 
`map.setView(carCoords, zoomLevel, { animate: true, duration: 0.5, easeLinearity: 1 });`);

fs.writeFileSync('./components/MapView.tsx', code);
