import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://example.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "example-anon-key";

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to a local .env file before enabling auth and database calls."
  );
}

// Cast to `any` to avoid the complex Database<> generic resolution issue
// that causes .from().insert()/.update() to resolve to never[].
// All row types are still exported from ./types for manual casting.
export const supabase: any = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
