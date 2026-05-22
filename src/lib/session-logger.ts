import { supabase } from "@/integrations/supabase/client";

let wired = false;
let lastSig: string | null = null;

export function wireSessionLogger() {
  if (wired || typeof window === "undefined") return;
  wired = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) return;
    if (!["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) return;

    // dedup: evita duplicar SIGNED_IN no mesmo carregamento
    const sig = `${event}:${session.user.id}`;
    if (sig === lastSig && event !== "SIGNED_OUT") return;
    lastSig = sig;

    try {
      await supabase.from("session_log").insert({
        user_id: session.user.id,
        user_email: session.user.email ?? null,
        evento: event,
        user_agent: navigator.userAgent,
      });
    } catch {
      // silent
    }
  });
}
