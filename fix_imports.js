const fs = require('fs');
const content = fs.readFileSync('app/admin/page.tsx', 'utf8');

// The file has multiple lucide-react imports which got ArrowUp and ArrowDown added to them.
// We should remove ArrowUp and ArrowDown from all of them except the first one.

let newContent = content.replace(/,\n\s*ArrowUp,\n\s*ArrowDown/g, ''); // Remove the ones added by patch3
newContent = newContent.replace(/ArrowUp,\s*ArrowDown/g, '');

// Let's just restore the file and manually add ArrowUp and ArrowDown properly.
fs.writeFileSync('app/admin/page.tsx', newContent);
