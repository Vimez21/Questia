import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

let adminClient: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseEnv();
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  adminClient = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
