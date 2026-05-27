const fs = require('fs');
const path = 'app/api/whatsapp/route.ts';
let content = fs.readFileSync(path, 'utf8');

// Cambiar cacheControl a un valor más pequeño en caso de que sea eso, o simplemente quitarlo si queremos no caché (aunque como el fileName es único (Date.now()), el caché del storage no debería afectar logos antiguos porque se generan nuevos recibos).
// El problema reportado es sobre recibos "antiguos" que siguen saliendo, pero como el nombre de archivo cambia (`receipt-${Date.now()}`), se está referenciando siempre un archivo nuevo.
// ¿Será que el logo del parqueadero está cacheado en el receipt-image generator o el URL en `appSettings`?

// En app/employee/ReceiptModal.tsx y en app/employee/page.tsx, se genera el recibo pasando el `appName`, `nit`, etc., pero NO se le pasa el `logo_url` al `receipt-image` !
// ¡Wow! Vamos a revisar el `app/api/receipt-image/route.tsx` a ver cómo pinta el logo.
