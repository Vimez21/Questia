const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

export function getSupabaseEnv() {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Supabase client environment variables are not configured.");
  }

  return {
    supabaseUrl: env.supabaseUrl,
    supabasePublishableKey: env.supabasePublishableKey,
    supabaseServiceRoleKey: env.supabaseServiceRoleKey,
  };
}
