import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbWZieHJqa2FoYmtudXFyaWZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjg1MzkyNiwiZXhwIjoyMDk4NDI5OTI2fQ.sW8yPBB1wb55xLJXZ1ovKnui0CB9NjsdA7RW3juYY7I";

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await supabase.from("users").select("*").limit(1);
  console.log(
    "users query:",
    JSON.stringify({ count: data?.length, error: error?.message }),
  );

  const { data: d2, error: e2 } = await supabase
    .from("artifacts")
    .select("*")
    .limit(1);
  console.log(
    "artifacts query:",
    JSON.stringify({ count: d2?.length, error: e2?.message }),
  );

  if (error?.message?.includes("relation") || e2?.message?.includes("relation")) {
    console.log("Tables don't exist yet. Need to run migrations.");
  } else {
    console.log("Tables exist! Supabase REST API works.");
  }
}

main().catch(console.error);
