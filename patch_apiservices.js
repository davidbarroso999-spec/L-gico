const fs = require('fs');
let code = fs.readFileSync('./lib/api-services.ts', 'utf-8');

code = code.replace(/const cleanPoints: \[number, number\]\[\] = \[\];\n\s+points\.forEach\(p => \{([\s\S]*?)\}\);\n/m, 
`const cleanPoints: [number, number][] = [];
  points.forEach(p => {
    if (cleanPoints.length === 0) {
      cleanPoints.push(p);
    } else {
      const prev = cleanPoints[cleanPoints.length - 1];
      const dist = Math.sqrt(Math.pow(p[0] - prev[0], 2) + Math.pow(p[1] - prev[1], 2));
      if (dist > 0.0001) {
        cleanPoints.push(p);
      }
    }
  });

  if (cleanPoints.length < 2) {
    return {
      geometry: { type: 'LineString', coordinates: points.map(p => [p[1], p[0]]) },
      distance: 0,
      duration: 0
    };
  }
`);

fs.writeFileSync('./lib/api-services.ts', code);
