const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

code = code.replace(
  'if (validAddresses.length < 2) return;',
  `if (validAddresses.length < 2) return;

    // Check for Hybrid route
    const { checkHybridRoute } = require('@/lib/hybrid-route');
    if (checkHybridRoute(validAddresses) && !options.isHybrid) {
      setShowHybridModal(true);
      return;
    }
`
);

fs.writeFileSync('app/page.tsx', code);
