const fs = require('fs');

const files = [
  'app/superadmin/page.tsx',
  'app/admin/page.tsx',
  'app/employee/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Simple regex to replace dark: classes. Might leave multiple spaces, but it's safe.
  content = content.replace(/dark:[a-zA-Z0-9\-\/\[\]#]+/g, '');
  fs.writeFileSync(file, content);
});
console.log("Removed dark mode classes.");
