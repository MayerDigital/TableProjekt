import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

let supabaseClient = null;

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!window.supabase) {
    throw new Error("Supabase CDN wurde nicht geladen.");
  }

  if (
    !SUPABASE_URL ||
    SUPABASE_URL.includes("HIER_DEINE_SUPABASE_URL_EINFUEGEN") ||
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY.includes("HIER_DEINEN_SUPABASE_ANON_KEY_EINFUEGEN")
  ) {
    throw new Error("Supabase URL oder Anon Key fehlen in js/config.js.");
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  return supabaseClient;
}
