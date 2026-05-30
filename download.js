const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const url = 'https://github.com/JM-2409/Parqueadero/archive/refs/heads/main.tar.gz';
const dest = './main.tar.gz';

console.log('Downloading...');
const file = fs.createWriteStream(dest);
https.get(url, function(response) {
  if (response.statusCode === 301 || response.statusCode === 302) {
    https.get(response.headers.location, function(redirectResponse) {
       redirectResponse.pipe(file);
       file.on('finish', function() {
         file.close();
         console.log('Extracting...');
         // tar is likely available in the env
         execSync('tar -xzf main.tar.gz --strip-components=1', { stdio: 'inherit' });
         console.log('Done.');
       });
    });
  } else {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      console.log('Extracting...');
      execSync('tar -xzf main.tar.gz --strip-components=1', { stdio: 'inherit' });
      console.log('Done.');
    });
  }
}).on('error', function(err) {
  fs.unlink(dest);
  console.error("Error: ", err.message);
});
