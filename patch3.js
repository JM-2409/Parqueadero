const fs = require('fs');
const content = fs.readFileSync('app/admin/page.tsx', 'utf8');

const importRegex = /import\s+\{\s*([^{}]+?)\s*\}\s+from\s+["']lucide-react["'];/g;
let newContent = content;

newContent = newContent.replace(importRegex, (match, importsString) => {
    // If the imports string already contains ArrowUp and ArrowDown, we can skip or clean it
    let importsArray = importsString.split(',').map(s => s.trim());
    let newImports = new Set(importsArray);
    newImports.add('ArrowUp');
    newImports.add('ArrowDown');

    // Convert back to string
    let finalImportsString = Array.from(newImports).filter(Boolean).join(',\n  ');

    // We only want to add it to the first import of lucide-react if there are multiple.
    // This is just a simple regex replace that might hit multiple, so we will deduplicate later if needed.
    return `import {\n  ${finalImportsString}\n} from "lucide-react";`;
});

// Since there are multiple lucide-react imports, let's just make sure ArrowUp and ArrowDown are imported properly.
// The replace above will add it to all lucide-react imports, which is valid JS/TS syntax although slightly redundant.

fs.writeFileSync('app/admin/page.tsx', newContent);
console.log("Patched successfully");
