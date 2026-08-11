const fs = require('fs');
let code = fs.readFileSync('lib/route-engine.ts', 'utf8');
code = code.replace(
  "engine?: 'google' | 'waze' | 'ors';",
  "engine?: 'google' | 'waze' | 'ors';\n  isHybrid?: boolean;"
);
fs.writeFileSync('lib/route-engine.ts', code);
