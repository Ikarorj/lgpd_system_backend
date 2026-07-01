import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdminClient";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required",
  );
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export async function syncUser(
  supabaseUserId: string,
  email: string,
  name: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: supabaseUserId,
        email,
        name,
        role: "compliance_officer",
        auth_provider: "supabase",
        external_id: supabaseUserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  if (error) {
    console.error("Failed to sync user to local users table:", error.message);
  }
}
