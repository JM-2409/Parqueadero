const fs = require('fs');
const path = require('path');

const directories = ['app/admin', 'app/employee', 'app/actions'];

let files = [];
directories.forEach(dirPath => {
  if(fs.existsSync(dirPath)) {
      const dirFiles = fs.readdirSync(dirPath)
        .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'))
        .map(f => path.join(dirPath, f));
      files = files.concat(dirFiles);
  }
});

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');

    // Convert indigo to blue
    content = content.replace(/indigo/g, 'blue');

    // Increase border radiuses for modern feel
    content = content.replace(/rounded-lg/g, 'rounded-2xl');
    content = content.replace(/rounded-xl/g, 'rounded-2xl');

    // Ensure light mode by removing dark classes if any snuck in
    content = content.replace(/dark:[a-zA-Z0-9\-\/\[\]#]+/g, '');

    // Slight shadow bump
    content = content.replace(/shadow-sm/g, 'shadow-md');

    fs.writeFileSync(file, content);
  }
});
