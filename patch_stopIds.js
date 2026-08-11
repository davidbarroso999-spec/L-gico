const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// Add stopIds state
if (!code.includes('const [stopIds, setStopIds]')) {
  code = code.replace(
    "const [addresses, setAddresses] = useState<string[]>(['']);",
    "const [addresses, setAddresses] = useState<string[]>(['']);\n  const [stopIds, setStopIds] = useState<string[]>(() => [crypto.randomUUID()]);"
  );
}

// In handleAddStop
if (!code.includes('setStopIds(prevIds => {')) {
  code = code.replace(
    "next.splice(insertIdx, 0, '');",
    "next.splice(insertIdx, 0, '');\n      setStopIds(prevIds => {\n        const nextIds = [...prevIds];\n        nextIds.splice(insertIdx, 0, crypto.randomUUID());\n        return nextIds;\n      });"
  );
}

// In removeAddress
if (!code.includes('setStopIds(prev => prev.filter((_, i) => i !== idx));')) {
  code = code.replace(
    "setAddresses(prev => prev.filter((_, i) => i !== idx));",
    "setAddresses(prev => prev.filter((_, i) => i !== idx));\n    setStopIds(prev => prev.filter((_, i) => i !== idx));"
  );
}

// In autocomplete push (around line 1190)
if (!code.includes('setStopIds(prev => [...prev, crypto.randomUUID()]);')) {
  code = code.replace(
    "updatedAddresses.push('');",
    "updatedAddresses.push('');\n                      setStopIds(prev => [...prev, crypto.randomUUID()]);"
  );
}

// In loadRoute (line 359)
code = code.replace(
  "setAddresses(route.addresses);",
  "setAddresses(route.addresses);\n      setStopIds(route.addresses.map(() => crypto.randomUUID()));"
);

// In uploadData / NFe data (line 1052)
code = code.replace(
  "setAddresses(data.addresses);",
  "setAddresses(data.addresses);\n              setStopIds(data.addresses.map(() => crypto.randomUUID()));"
);

// In DEFAULT_ADDRESSES reset (line 2388)
code = code.replace(
  "onClick={() => setAddresses(DEFAULT_ADDRESSES)}",
  "onClick={() => { setAddresses(DEFAULT_ADDRESSES); setStopIds(DEFAULT_ADDRESSES.map(() => crypto.randomUUID())); }}"
);

// In hardcoded array reset (line 4085)
code = code.replace(
  "setAddresses([\n                      'CEASA, Manaus, AM',",
  "const newAddresses = [\n                      'CEASA, Manaus, AM',\n                      'Centro, Manaus, AM',\n                      'Adrianópolis, Manaus, AM',\n                      'Compensa, Manaus, AM',\n                      'BR-319, Manaus, AM'\n                    ];\n                    setAddresses(newAddresses);\n                    setStopIds(newAddresses.map(() => crypto.randomUUID()));\n                    //setAddresses([\n                      //'CEASA, Manaus, AM',"
);

// Now change the rendering keys
// Origin
code = code.replace(
  '<div className="relative flex gap-4 items-start">',
  '<div key={stopIds[0]} className="relative flex gap-4 items-start">'
);
// Intermediate
code = code.replace(
  '<div key={realIdx} className="space-y-2 relative">',
  '<div key={stopIds[realIdx]} className="space-y-2 relative">'
);

fs.writeFileSync('app/page.tsx', code);
