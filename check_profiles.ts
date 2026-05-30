import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkRouteLogic() {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*, parking_lots(name)")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  console.log("Route admins:", data);
  console.log("Route error:", error);
}

checkRouteLogic();
