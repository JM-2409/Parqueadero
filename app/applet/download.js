const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://codeload.github.com/JM-2409/Parqueadero/zip/refs/heads/main';
const zipPath = path.join(__dirname, 'repo.zip');

https.get(url, (res) => {
  if (res.statusCode === 301 || res.statusCode === 302) {
    https.get(res.headers.location, (res2) => {
        download(res2);
    });
  } else {
    download(res);
  }
}).on('error', (err) => {
  console.error("Error: ", err.message);
});

function download(response) {
  const writeStream = fs.createWriteStream(zipPath);
  response.pipe(writeStream);
  writeStream.on('finish', () => {
    writeStream.close();
    console.log('Downloaded zip.');
    const { execSync } = require('child_process');
    try {
      execSync('npx -y extract-zip repo.zip .', { stdio: 'inherit' });
      console.log('Extracted.');
      // Move contents of Parqueadero-main to current directory
      const fs = require('fs');
      const innerDir = path.join(__dirname, 'Parqueadero-main');
      if (fs.existsSync(innerDir)) {
         const files = fs.readdirSync(innerDir);
         for (const file of files) {
             fs.renameSync(path.join(innerDir, file), path.join(__dirname, file));
         }
         fs.rmdirSync(innerDir);
      }
    } catch(e) { console.log(e); }
  });
}
