import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jccacnbfikzmsxxklrrh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjY2FjbmJmaWt6bXN4eGtscnJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NjEwNzcsImV4cCI6MjEwMjIzNzA3N30.-Kp67yJ-ZqvsQgs_zjQxJ8U5Pqbt4OfCjpq0j6HPZrs";

// Cast to `any` to avoid the complex Database<> generic resolution issue
// that causes .from().insert()/.update() to resolve to never[].
// All row types are still exported from ./types for manual casting.
export const supabase: any = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
