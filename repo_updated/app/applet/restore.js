const fs = require('fs');
const path = require('path');

const srcFiles = [
  'README.md', 'check_db.ts', 'check_profiles.ts', 'eslint.config.mjs',
  'metadata.json', 'next-env.d.ts', 'next.config.ts', 'package-lock.json',
  'package.json', 'postcss.config.mjs', 'supabase-schema.sql',
  'supabase-updates.sql', 'tsconfig.json', 'components', 'hooks', 'lib'
];

srcFiles.forEach(f => {
  const src = path.join('/', f);
  const dest = path.join('/app/applet', f);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
  }
});

// App directory is special, let's copy its contents or move it carefully
const appSrc = '/app'; // This is /app
const appletAppDest = '/app/applet/app'; // Wait, applet is IN /app!
if (!fs.existsSync(appletAppDest)) {
    fs.mkdirSync(appletAppDest, { recursive: true });
}

['actions', 'admin', 'api', 'employee', 'fix_supabase_warnings.sql', 'globals.css', 'layout.tsx', 'login', 'page.tsx', 'setup', 'setup-owner', 'superadmin', 'README.md'].forEach(f => {
    const src = path.join(appSrc, f);
    const dest = path.join(appletAppDest, f);
    if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
    }
});

console.log('Moved files back');
