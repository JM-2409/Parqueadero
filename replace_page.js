const fs = require('fs');

let content = fs.readFileSync('app/page.tsx', 'utf8');

// Replace indigo colors with blue
content = content.replace(/indigo/g, 'blue');

// Ensure rounded borders and floating styles
content = content.replace(/rounded-xl/g, 'rounded-2xl');
content = content.replace(/rounded-2xl/g, 'rounded-2xl'); // in case it was already replaced
content = content.replace(/rounded-3xl/g, 'rounded-3xl'); // Keep large borders
content = content.replace(/shadow-sm/g, 'shadow-md');
content = content.replace(/hover:shadow-md/g, 'hover:shadow-xl hover:-translate-y-1 transition-all duration-300');

fs.writeFileSync('app/page.tsx', content);
