const fs = require('fs');
let code = fs.readFileSync('./components/MapView.tsx', 'utf-8');

code = code.replace(/transition: \$\{isDriving \? 'none' : 'transform 0.35s cubic-bezier\(0\.16, 1, 0\.3, 1\)'\};/g, 
`transition: transform 1s linear;`);

fs.writeFileSync('./components/MapView.tsx', code);
