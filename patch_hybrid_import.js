const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

if (!code.includes('checkHybridRoute')) {
  // wait, the previous patch added checkHybridRoute as require
}

code = code.replace("const { checkHybridRoute } = require('@/lib/hybrid-route');", "");

if (!code.includes("import { checkHybridRoute } from '@/lib/hybrid-route';")) {
  code = code.replace(
    "import { optimizeRoute, RouteStop, RouteOptions } from '@/lib/route-engine';",
    "import { optimizeRoute, RouteStop, RouteOptions } from '@/lib/route-engine';\nimport { checkHybridRoute } from '@/lib/hybrid-route';"
  );
}

fs.writeFileSync('app/page.tsx', code);
