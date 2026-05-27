const fs = require('fs');

const path = 'app/employee/ReceiptModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// The original file had a JS comment `// eslint-disable-next-line @next/next/no-img-element`
// And my previous script added a JSX comment `{/* ... */}` but inside a ternary, you cannot have `{/* */}` directly alongside a JSX element like that without an enclosing tag or fragment if they aren't part of an array.
// Actually, it's easier to just reset the file and apply our changes properly.

content = content.replace(
  '{/* eslint-disable-next-line @next/next/no-img-element */}\n              <img',
  '<img'
);
fs.writeFileSync(path, content);
