const fs = require('fs');
let content = fs.readFileSync('app/login/page.tsx', 'utf8');

// Replace indigo colors with blue for the corporate look
content = content.replace(/indigo/g, 'blue');
// The background was already using slate, keep it clean
// Update focus rings
content = content.replace(/focus:ring-indigo-500/g, 'focus:ring-blue-500');

fs.writeFileSync('app/login/page.tsx', content);
