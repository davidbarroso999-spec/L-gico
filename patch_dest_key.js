const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

// Destination block starts with:
// {/* Final Destination or Final Pickup */}
// {addresses.length >= 2 && (() => {
//   const lastIdx = addresses.length - 1;
//   const isLastPickup = stopTypes[lastIdx] === 'pickup';
//   return (
//     <div className="relative flex gap-4 items-start">

code = code.replace(
  '{/* Final Destination or Final Pickup */}\n                    {addresses.length >= 2 && (() => {\n                      const lastIdx = addresses.length - 1;\n                      const isLastPickup = stopTypes[lastIdx] === \'pickup\';\n                      return (\n                        <div className="relative flex gap-4 items-start">',
  '{/* Final Destination or Final Pickup */}\n                    {addresses.length >= 2 && (() => {\n                      const lastIdx = addresses.length - 1;\n                      const isLastPickup = stopTypes[lastIdx] === \'pickup\';\n                      return (\n                        <div key={stopIds[lastIdx]} className="relative flex gap-4 items-start">'
);

fs.writeFileSync('app/page.tsx', code);
