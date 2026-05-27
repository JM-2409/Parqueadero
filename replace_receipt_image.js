const fs = require('fs');
const path = 'app/api/receipt-image/route.tsx';
let content = fs.readFileSync(path, 'utf8');

// Modificaremos la ruta `receipt-image` para aceptar y renderizar `logoUrl` si es pasado,
// y actualizaremos la llamada en app/api/whatsapp/route.ts y en los lugares donde se envíe la URL a whatsapp.

// Agregar parámetro a receipt-image/route.tsx
content = content.replace(
  'const appName = searchParams.get("appName") || "Parqueadero";',
  'const appName = searchParams.get("appName") || "Parqueadero";\n    const logoUrl = searchParams.get("logoUrl") || "";'
);

const svgIconStr = `<svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>`;

const imageReplacementStr = `{logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "9999px"
                  }}
                />
              ) : (
                ${svgIconStr}
              )}`;

content = content.replace(svgIconStr, imageReplacementStr);

fs.writeFileSync(path, content);
