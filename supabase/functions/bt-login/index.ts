import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Sign in with a username instead of an email. The email never leaves the server.
const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const ORIGINS = ["https://ollaloll.github.io", "http://localhost", "http://127.0.0.1"];
const REDIRECT = "https://ollaloll.github.io/beaver-transceiver/";
const USER_RE = /^[a-z0-9._]{3,20}$/;

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  const ok = ORIGINS.some((x) => o === x || o.startsWith(x + ":"));
  return {
    "Access-Control-Allow-Origin": ok ? o : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req) => {
  const h = { ...cors(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: h });
  const reply = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: h });
  let body: { action?: string; username?: string; password?: string };
  try { body = await req.json(); } catch { return reply({ error: "bad_request" }, 400); }
  const username = String(body.username || "").trim().replace(/^@/, "").toLowerCase();
  const action = body.action === "reset" ? "reset" : "login";
  if (!USER_RE.test(username)) return reply(action === "reset" ? { ok: true } : { error: "invalid" });

  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: prof } = await admin.from("bt_profiles").select("id").eq("username", username).maybeSingle();
  let email: string | null = null;
  if (prof?.id) {
    const { data: u } = await admin.auth.admin.getUserById(prof.id);
    email = u?.user?.email ?? null;
  }
  // pass the person's browser through so "Devices" shows their phone, not the server
  const fwd: Record<string, string> = {};
  const ua = req.headers.get("user-agent"); if (ua) fwd["User-Agent"] = ua;
  const pub = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: fwd } });

  if (action === "reset") {
    if (email) await pub.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT });
    return reply({ ok: true });
  }

  const password = String(body.password || "");
  if (!email || password.length < 6) return reply({ error: "invalid" });
  const { data, error } = await pub.auth.signInWithPassword({ email, password });
  if (error) {
    const m = (error.message || "").toLowerCase();
    if (m.includes("email not confirmed")) return reply({ error: "unconfirmed", email });
    if (m.includes("rate")) return reply({ error: "rate_limit" });
    return reply({ error: "invalid" });
  }
  return reply({ access_token: data.session!.access_token, refresh_token: data.session!.refresh_token });
});
