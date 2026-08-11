const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

if (!code.includes('showHybridModal')) {
  code = code.replace(
    'const [showFailureModal, setShowFailureModal] = useState(false);',
    'const [showFailureModal, setShowFailureModal] = useState(false);\n  const [showHybridModal, setShowHybridModal] = useState(false);'
  );
}

fs.writeFileSync('app/page.tsx', code);
