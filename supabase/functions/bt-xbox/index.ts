import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// Xbox activity for Beaver Transceiver, via OpenXBL Apps (https://xbl.io).
// People sign in with Microsoft on xbl.io, we get a per-person app key, and a
// cron job reads their presence every few minutes into bt_profiles.xbox.
const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const ORIGINS = ["https://ollaloll.github.io", "http://localhost", "http://127.0.0.1"];
const PER_RUN = 10; // keeps the free OpenXBL plan (150 calls/hour) safe with a 5-minute cron
const HOME_TITLES = new Set(["home", "online", "xbox app", "xbox", "xbox console companion"]);

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  const ok = ORIGINS.some((x) => o === x || o.startsWith(x + ":"));
  return {
    "Access-Control-Allow-Origin": ok ? o : ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
async function config(key: string): Promise<string | null> {
  const { data } = await admin.from("app_config").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}
function deviceName(t: string) {
  const s = (t || "").toLowerCase();
  if (/scarlett|anaconda|lockhart|durango|xboxone|xbox ?one|xbox ?series|edmonton/.test(s)) return "Xbox";
  if (/windows|win32|pc/.test(s)) return "PC";
  if (/android/.test(s)) return "Android";
  if (/ios|iphone|ipad/.test(s)) return "iPhone";
  if (/nintendo|switch/.test(s)) return "Switch";
  if (/playstation|ps4|ps5/.test(s)) return "PlayStation";
  if (/web/.test(s)) return "";
  return t || "";
}

// deno-lint-ignore no-explicit-any
function pickPresence(raw: any, xuid: string) {
  // OpenXBL may answer with an array, {people:[…]} or a single object
  // deno-lint-ignore no-explicit-any
  let list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.people) ? raw.people : Array.isArray(raw?.content) ? raw.content : [raw];
  const me = list.find((p) => String(p?.xuid ?? p?.id ?? "") === xuid) || (list.length === 1 ? list[0] : null);
  if (!me) return null;
  const state = String(me.state ?? me.presenceState ?? "").toLowerCase();
  const online = state === "online" || state === "away";
  let game = "", detail = "", device = "";
  for (const d of me.devices || []) {
    for (const t of d.titles || []) {
      const name = String(t.name || "").trim();
      if (!name || HOME_TITLES.has(name.toLowerCase()) || String(t.id) === "750323071") continue;
      if (t.state && String(t.state).toLowerCase() !== "active") continue;
      if (!game || String(t.placement || "").toLowerCase() === "full") {
        game = name;
        detail = String(t.activity?.richPresence || "").trim();
        device = deviceName(String(d.type || ""));
      }
    }
  }
  return { on: online, game: online ? game.slice(0, 60) : "", detail: online ? detail.slice(0, 80) : "", device: online ? device : "" };
}

async function xbl(path: string, key: string) {
  const r = await fetch("https://xbl.io/api/v2/" + path, {
    headers: { "X-Authorization": key, "X-Contract": "100", "Accept": "application/json", "Accept-Language": "en-US" },
  });
  if (!r.ok) return { status: r.status, body: null };
  return { status: r.status, body: await r.json().catch(() => null) };
}

// deno-lint-ignore no-explicit-any
async function pollOne(link: any) {
  const now = new Date().toISOString();
  if (!link.show_activity) {
    await admin.from("bt_profiles").update({ xbox: { gt: link.gamertag, show: false } }).eq("id", link.user_id);
    await admin.from("bt_xbox_links").update({ polled_at: now }).eq("user_id", link.user_id);
    return;
  }
  let res = await xbl(`${link.xuid}/presence`, link.app_key);
  if (!res.body) res = await xbl("presence", link.app_key);
  const p = res.body ? pickPresence(res.body, String(link.xuid)) : null;
  const xbox = p ? { gt: link.gamertag, show: true, ...p, at: now } : { gt: link.gamertag, show: true, on: false, game: "", detail: "", device: "", at: now, err: res.status };
  await admin.from("bt_profiles").update({ xbox }).eq("id", link.user_id);
  await admin.from("bt_xbox_links").update({ polled_at: now }).eq("user_id", link.user_id);
}

Deno.serve(async (req) => {
  const h = { ...cors(req), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const reply = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: h });
  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = String(body.action || "");

  if (action === "poll") {
    const secret = await config("push_trigger_secret");
    if (!secret || req.headers.get("x-push-secret") !== secret) return reply({ error: "forbidden" }, 403);
    const { data: links } = await admin.from("bt_xbox_links").select("*").order("polled_at", { ascending: true, nullsFirst: true }).limit(PER_RUN);
    for (const l of links || []) { try { await pollOne(l); } catch { /* keep going */ } }
    return reply({ polled: (links || []).length });
  }

  if (action === "config") {
    const pk = await config("openxbl_public_key");
    return reply({ enabled: !!pk, authUrl: pk ? `https://xbl.io/app/auth/${pk}` : null });
  }

  // everything else needs a signed-in person
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: who } = await createClient(URL_, ANON, { auth: { persistSession: false } }).auth.getUser(jwt);
  const uid = who?.user?.id;
  if (!uid) return reply({ error: "signin" }, 401);

  if (action === "link") {
    const pk = await config("openxbl_public_key");
    const code = String(body.code || "").trim();
    if (!pk) return reply({ error: "not_configured" });
    if (!code || code.length > 512) return reply({ error: "bad_code" });
    const r = await fetch("https://xbl.io/app/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ code, app_key: pk }),
    });
    const c = await r.json().catch(() => null);
    const appKey = c?.app_key ?? c?.appKey;
    const xuid = c?.xuid ? String(c.xuid) : "";
    const gamertag = String(c?.gamertag ?? c?.gamerTag ?? "").slice(0, 32);
    if (!r.ok || !appKey || !xuid || !gamertag) return reply({ error: "claim_failed" });
    const link = { user_id: uid, xuid, gamertag, app_key: appKey, show_activity: true, linked_at: new Date().toISOString() };
    const { error } = await admin.from("bt_xbox_links").upsert(link);
    if (error) return reply({ error: "save_failed" });
    await pollOne(link).catch(() => {});
    return reply({ ok: true, gamertag });
  }
  if (action === "unlink") {
    await admin.from("bt_xbox_links").delete().eq("user_id", uid);
    await admin.from("bt_profiles").update({ xbox: null }).eq("id", uid);
    return reply({ ok: true });
  }
  if (action === "show") {
    const { data: link } = await admin.from("bt_xbox_links").update({ show_activity: !!body.show }).eq("user_id", uid).select("*").maybeSingle();
    if (!link) return reply({ error: "not_linked" });
    await pollOne(link).catch(() => {});
    return reply({ ok: true });
  }
  if (action === "refresh") {
    const { data: link } = await admin.from("bt_xbox_links").select("*").eq("user_id", uid).maybeSingle();
    if (!link) return reply({ error: "not_linked" });
    if (link.polled_at && Date.now() - new Date(link.polled_at).getTime() < 60_000) return reply({ ok: true, cached: true });
    await pollOne(link).catch(() => {});
    return reply({ ok: true });
  }
  return reply({ error: "unknown_action" }, 400);
});
