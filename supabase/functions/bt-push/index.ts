import webpush from "npm:web-push@3.6.7";

const MAX_BODY = 4000;
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const stripEmoji = (t: string) => t.replace(/^(?:\p{Extended_Pictographic}|️|‍)+\s*/u, "");

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const baseUrl = Deno.env.get("SUPABASE_URL")!;
  const db = (path: string, init: RequestInit = {}) =>
    fetch(baseUrl + "/rest/v1/" + path, {
      ...init,
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json", ...(init.headers || {}) },
    });
  const rows = async (path: string) => { const r = await db(path); return r.ok ? await r.json() : []; };
  const cfg = async (k: string) => (await rows("app_config?select=value&key=eq." + k))[0]?.value ?? null;

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
  // deno-lint-ignore no-explicit-any
  let body: any; try { body = JSON.parse(raw); } catch { return json({ error: "body" }, 400); }

  const secret = await cfg("push_trigger_secret");
  if (!secret || req.headers.get("x-push-secret") !== secret) return json({ error: "forbidden" }, 403);
  const pub = await cfg("vapid_public_key"), priv = await cfg("vapid_private_key");
  if (!pub || !priv) return json({ error: "vapid" }, 500);
  webpush.setVapidDetails("mailto:contact@ollaloll.com", pub, priv);

  const uuid = /^[0-9a-f-]{36}$/;
  let recipients: string[] = [];
  let payload: Record<string, string> = {};
  let ttl = 86400;

  if (body.type === "message" && uuid.test(body.message_id || "")) {
    const [m] = await rows(`bt_messages?select=id,conversation_id,user_id,kind,content,media_kind,media_meta,cipher&id=eq.${body.message_id}`);
    if (!m || m.kind === "system") return json({ ok: true, skipped: "kind" });
    const [conv] = await rows(`bt_conversations?select=id,kind,name&id=eq.${m.conversation_id}`);
    const members = await rows(`bt_members?select=user_id,notify&conversation_id=eq.${m.conversation_id}`);
    // deno-lint-ignore no-explicit-any
    const profiles = await rows(`bt_profiles?select=id,username,display_name&id=in.(${members.map((x: any) => x.user_id).join(",")})`);
    // deno-lint-ignore no-explicit-any
    const byId = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
    const blocks = await rows(`bt_blocks?select=blocker_id&blocked_id=eq.${m.user_id}`);
    // deno-lint-ignore no-explicit-any
    const blockedBy = new Set(blocks.map((b: any) => b.blocker_id));
    const text = String(m.content || "");
    // deno-lint-ignore no-explicit-any
    recipients = members.filter((x: any) => {
      if (x.user_id === m.user_id || x.notify === "off" || blockedBy.has(x.user_id)) return false;
      if (x.notify === "mentions") return text.toLowerCase().includes("@" + (byId[x.user_id]?.username || "\u0000"));
      return true;
    // deno-lint-ignore no-explicit-any
    }).map((x: any) => x.user_id);
    const sender = byId[m.user_id]?.display_name || "Someone";
    let preview = stripEmoji(text.replace(/\s+/g, " ")).replace(/\|\|[^|]+\|\|/g, "(spoiler)").slice(0, 140);
    if (m.media_kind === "image") preview = preview ? "Photo: " + preview : "Sent a photo";
    if (m.media_kind === "audio") preview = "Sent a voice message";
    if (m.media_kind === "file") preview = "Sent a file: " + String(m.media_meta?.name || "file").slice(0, 80);
    if (m.kind === "poll") preview = preview.startsWith("Poll: ") ? preview : "Poll: " + preview;
    payload = { title: conv?.kind === "group" ? `${sender} in ${conv.name}` : sender, body: preview || "New message", url: "./?c=" + m.conversation_id, tag: "c-" + m.conversation_id };
    // encrypted DM: the server can't read it, so the sealed text rides along and the phone opens it
    if (m.cipher) {
      payload.body = "New message";
      try {
        const p = JSON.parse(m.cipher);
        const [k] = uuid.test(p.s || "") ? await rows(`bt_keys?select=public_key&id=eq.${p.s}`) : [];
        if (k?.public_key && m.cipher.length < 2800) Object.assign(payload, { enc: m.cipher, jx: k.public_key.x, jy: k.public_key.y, cid: m.conversation_id, mk: m.media_kind || "" });
      } catch { /* plain fallback */ }
    }
  } else if (body.type === "call" && uuid.test(body.call_id || "")) {
    const [c] = await rows(`bt_calls?select=id,conversation_id,caller_id,video,status&id=eq.${body.call_id}`);
    if (!c || c.status !== "ringing") return json({ ok: true, skipped: "status" });
    const members = await rows(`bt_members?select=user_id,notify&conversation_id=eq.${c.conversation_id}`);
    const [p] = await rows(`bt_profiles?select=display_name&id=eq.${c.caller_id}`);
    // deno-lint-ignore no-explicit-any
    recipients = members.filter((x: any) => x.user_id !== c.caller_id && x.notify !== "off").map((x: any) => x.user_id);
    payload = { title: p?.display_name || "Someone", body: c.video ? "Incoming video call" : "Incoming voice call", url: `./?c=${c.conversation_id}&call=${c.id}`, tag: "call-" + c.id };
    ttl = 40;
  } else if (body.type === "birthday" && uuid.test(body.user_id || "")) {
    const [p] = await rows(`bt_profiles?select=display_name&id=eq.${body.user_id}`);
    const fr = await rows(`bt_friendships?select=requester,addressee&status=eq.accepted&or=(requester.eq.${body.user_id},addressee.eq.${body.user_id})`);
    // deno-lint-ignore no-explicit-any
    recipients = fr.map((f: any) => f.requester === body.user_id ? f.addressee : f.requester);
    payload = { title: "Birthday today", body: `It's ${p?.display_name || "a friend"}'s birthday. Say happy birthday!`, url: "./?dm=" + body.user_id, tag: "bday-" + body.user_id };
  } else if (body.type === "friend_request" && uuid.test(body.requester || "") && uuid.test(body.addressee || "")) {
    const [p] = await rows(`bt_profiles?select=display_name,username&id=eq.${body.requester}`);
    recipients = [body.addressee];
    payload = { title: "New friend request", body: `${p?.display_name || "Someone"} (@${p?.username || "?"}) wants to be friends`, url: "./?tab=friends", tag: "friends" };
  } else if (body.type === "friend_accepted" && uuid.test(body.requester || "") && uuid.test(body.addressee || "")) {
    const [p] = await rows(`bt_profiles?select=display_name&id=eq.${body.addressee}`);
    recipients = [body.requester];
    payload = { title: "Friend request accepted", body: `You and ${p?.display_name || "someone"} are now friends`, url: "./?tab=friends", tag: "friends" };
  } else {
    return json({ error: "type" }, 400);
  }

  if (!recipients.length) return json({ ok: true, sent: 0 });
  const subs = await rows(`bt_push_subs?select=endpoint,p256dh,auth,user_id&user_id=in.(${recipients.join(",")})`);
  let sent = 0;
  // deno-lint-ignore no-explicit-any
  await Promise.all(subs.map(async (s: any) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...payload, to: s.user_id }), { TTL: ttl, urgency: "high" });
      sent++;
    // deno-lint-ignore no-explicit-any
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await db("bt_push_subs?endpoint=eq." + encodeURIComponent(s.endpoint), { method: "DELETE" });
    }
  }));
  return json({ ok: true, sent });
});
