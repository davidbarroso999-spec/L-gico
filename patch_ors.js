const fs = require('fs');
let code = fs.readFileSync('./components/MapView.tsx', 'utf-8');

const replacement = `
      // Clean points to avoid ORS 400 error on identical consecutive points
      const cleanPoints = [];
      recalculatePoints.forEach(p => {
        if (cleanPoints.length === 0) {
          cleanPoints.push(p);
        } else {
          const prev = cleanPoints[cleanPoints.length - 1];
          const dist = Math.sqrt(Math.pow(p[0] - prev[0], 2) + Math.pow(p[1] - prev[1], 2));
          if (dist > 0.0001) { // ~10 meters
            cleanPoints.push(p);
          }
        }
      });
      
      if (cleanPoints.length < 2) {
         setIsRerouting(false);
         return;
      }
`;

code = code.replace(/const recalculatePoints = \[\n\s+\[startPoint\[0\], startPoint\[1\]\],\n\s+\.\.\.remainingStops\.map\(s => \[s\.lat, s\.lon\]\)\n\s+\];/, 
`const recalculatePoints = [
        [startPoint[0], startPoint[1]],
        ...remainingStops.map(s => [s.lat, s.lon])
      ];
      ${replacement}`);

// Also replace the ORS fetch coordinates to use cleanPoints
code = code.replace(/coordinates: recalculatePoints\.map\(p => \[p\[1\], p\[0\]\]\)/g, 
`coordinates: cleanPoints.map(p => [p[1], p[0]])`);

// For Google Maps API, change points to cleanPoints too
code = code.replace(/points: recalculatePoints/g, 'points: cleanPoints');

fs.writeFileSync('./components/MapView.tsx', code);
