import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://eicnazdxzkqlckpixhym.supabase.co";
const supabaseServiceKey = "sb_secret_LJXPNHzU2oJ4vnUbS1c0Cg_ssjUo9nB";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles data:", data);
  console.log("Profiles error:", error);
}

checkProfiles();
