import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function getAuthenticatedUserFromRequest(request: NextRequest): Promise<User> {
  const authHeader = request.headers.get("authorization");
  const admin = getSupabaseAdminClient();

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token);

    if (error || !user) {
      throw new Error("Sessao invalida.");
    }

    return user;
  }

  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();
  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Nao autenticado.");
  }

  return user;
}
