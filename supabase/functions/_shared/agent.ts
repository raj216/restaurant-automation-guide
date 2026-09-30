// The restaurants' "agent" account, which the edge functions sign in as
// (never the service_role key), so Row Level Security and the tables' rules
// apply to everything they do. Settings: AGENT_EMAIL, AGENT_PASSWORD and
// PUBLIC_API_KEY (Supabase secrets).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = (name: string): string => Deno.env.get(name) ?? "";

// One signed-in agent connection per server instance, reused between requests.
let client: SupabaseClient | null = null;

export async function agentClient(): Promise<SupabaseClient> {
  if (client) {
    const { data } = await client.auth.getSession(); // also refreshes an expired login
    if (!data?.session) client = null;
  }
  if (!client) {
    const fresh = createClient(env("SUPABASE_URL"), env("PUBLIC_API_KEY") || env("SUPABASE_ANON_KEY"), {
      auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
    });
    const { error } = await fresh.auth.signInWithPassword({ email: env("AGENT_EMAIL"), password: env("AGENT_PASSWORD") });
    if (error) throw new Error(`Agent login failed: ${error.message}`);
    client = fresh;
  }
  return client;
}
