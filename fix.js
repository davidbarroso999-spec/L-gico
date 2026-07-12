const fs = require('fs');
let lines = fs.readFileSync('./components/MapView.tsx', 'utf-8').split('\n');

for (let i = 855; i < 860; i++) {
  if (lines[i].includes('  };')) {
    lines.splice(i, 1);
    break;
  }
}

fs.writeFileSync('./components/MapView.tsx', lines.join('\n'));
