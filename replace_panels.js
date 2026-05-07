const fs = require('fs');

const files = [
  'app/superadmin/page.tsx',
  'app/admin/page.tsx',
  'app/employee/page.tsx',
  'app/setup/page.tsx',
  'app/setup-owner/page.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Replace indigo with blue
    content = content.replace(/indigo/g, 'blue');

    // Replace dark mode specific slate classes
    content = content.replace(/bg-slate-900/g, 'bg-blue-950'); // for sidebars, deep blue
    content = content.replace(/bg-slate-800/g, 'bg-blue-900'); // hover states in sidebar
    content = content.replace(/border-slate-800/g, 'border-blue-900');

    content = content.replace(/rounded-xl/g, 'rounded-2xl');
    content = content.replace(/rounded-lg/g, 'rounded-2xl');
    content = content.replace(/shadow-sm/g, 'shadow-md');

    fs.writeFileSync(file, content);
  }
});
