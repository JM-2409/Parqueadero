const fs = require('fs');
let content = fs.readFileSync('app/admin/page.tsx', 'utf8');
content = content.replace('GripVertical', 'GripVertical,\n  ArrowUp,\n  ArrowDown');
fs.writeFileSync('app/admin/page.tsx', content);
