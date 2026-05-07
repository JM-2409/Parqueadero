const fs = require('fs');
const file = 'app/layout.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'import "./globals.css"; // Global styles',
  `import { Poppins } from "next/font/google";\nimport "./globals.css"; // Global styles\n\nconst poppins = Poppins({ \n  subsets: ["latin"],\n  weight: ["300", "400", "500", "600", "700"],\n  variable: "--font-poppins",\n});`
);

content = content.replace(
  '<body suppressHydrationWarning className="antialiased text-slate-800 bg-slate-50 transition-colors duration-300 min-h-screen flex flex-col">',
  '<body suppressHydrationWarning className={`${poppins.className} antialiased text-slate-800 bg-slate-50 min-h-screen flex flex-col`}>'
);

fs.writeFileSync(file, content);
