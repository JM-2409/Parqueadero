const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://codeload.github.com/JM-2409/Parqueadero/zip/refs/heads/main';
const zipPath = path.join(__dirname, 'repo.zip');

https.get(url, (res) => {
  const writeStream = fs.createWriteStream(zipPath);
  res.pipe(writeStream);
  writeStream.on('finish', () => {
    writeStream.close();
    console.log('Downloaded zip.');
    const { execSync } = require('child_process');
    execSync('npx -y extract-zip repo.zip .', { stdio: 'inherit' });
    console.log('Extracted.');
  });
}).on('error', (err) => {
  console.error("Error: ", err.message);
});
