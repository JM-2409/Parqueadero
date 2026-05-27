const fs = require('fs');

const path = 'app/employee/ReceiptModal.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  '              {/* eslint-disable-next-line @next/next/no-img-element */}\n              {/* eslint-disable-next-line @next/next/no-img-element */}\n              <img',
  '              {/* eslint-disable-next-line @next/next/no-img-element */}\n              <img'
);
fs.writeFileSync(path, content);
