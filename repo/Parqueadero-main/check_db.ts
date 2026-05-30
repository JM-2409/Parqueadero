import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDatabase() {
  console.log("Iniciando verificación profunda de la base de datos...");
  let allGood = true;
  
  // 1. Verificar perfiles
  const { error: pErr } = await supabase.from('profiles').select('id, role, username').limit(1);
  if (pErr) { console.error("❌ Error en 'profiles':", pErr.message); allGood = false; }
  else console.log("✅ Tabla 'profiles' verificada.");

  // 2. Verificar parking_lots y custom_fields
  const { error: lErr } = await supabase.from('parking_lots').select('id, name, custom_fields').limit(1);
  if (lErr) { console.error("❌ Error en 'parking_lots':", lErr.message); allGood = false; }
  else console.log("✅ Tabla 'parking_lots' verificada (incluye custom_fields).");

  // 3. Verificar parking_sessions y nuevas columnas
  const { error: sErr } = await supabase.from('parking_sessions').select('id, entry_employee_name, exit_employee_name, extra_data').limit(1);
  if (sErr) { console.error("❌ Error en 'parking_sessions':", sErr.message); allGood = false; }
  else console.log("✅ Tabla 'parking_sessions' verificada (incluye columnas de empleados y extra_data).");
  
  // 4. Verificar app_settings
  const { error: setErr } = await supabase.from('app_settings').select('id, logo_url').limit(1);
  if (setErr) { console.error("❌ Error en 'app_settings':", setErr.message); allGood = false; }
  else console.log("✅ Tabla 'app_settings' verificada.");

  if (allGood) {
    console.log("\n🎉 ¡Todo está en orden! La base de datos está 100% actualizada y lista para usar.");
  } else {
    console.log("\n⚠️ Se encontraron algunos problemas. Revisa los mensajes con ❌ arriba.");
  }
}

verifyDatabase();
