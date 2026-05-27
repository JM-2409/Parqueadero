const fs = require('fs');
const path1 = 'app/employee/ReceiptModal.tsx';
const path2 = 'app/employee/page.tsx';

function updateFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  // Buscar donde se crea el params `new URLSearchParams`
  // añadir logoUrl al URLSearchParams en ReceiptModal y employee/page

  if (path.includes('ReceiptModal')) {
    content = content.replace(
      'duration: `${hours}h ${minutes}m`,',
      'duration: `${hours}h ${minutes}m`,\n        logoUrl: parkingLot?.logo_url || appSettings?.logo_url || "",'
    );
  } else {
    content = content.replace(
      'duration: `${hours}h ${minutes}m`,',
      'duration: `${hours}h ${minutes}m`,\n            logoUrl: parkingLot?.logo_url || appSettings?.logo_url || "",'
    );
  }

  fs.writeFileSync(path, content);
}

updateFile(path1);
updateFile(path2);
