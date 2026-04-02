import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

let supabaseClient = null;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!window.supabase) {
    throw new Error("Supabase CDN wurde nicht geladen.");
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL oder Anon Key fehlen in js/config.js.");
  }

  try {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log("Supabase Client initialisiert");

    return supabaseClient;
  } catch (error) {
    console.error("Supabase Initialisierung fehlgeschlagen:", error);
    throw error;
  }
}
