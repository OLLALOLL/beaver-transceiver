const CACHE = "bt-shell-4294151";
const SHELL = [
  "./", "./index.html", "./gate.js?v=4294151", "./app.js?v=4294151", "./app.css?v=4294151", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;
  if (url.pathname.endsWith("version.json")) return; // always ask the network
  const isShell = url.origin === location.origin;
  const isLib = /cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (!isShell && !isLib) return;
  if (isShell && (req.mode === "navigate" || /\.(js|css|html|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/"))) {
    e.respondWith(
      fetch(req, { cache: "no-cache" }).then((res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === "opaque") caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; }))
  );
});

/* Encrypted DMs: the push carries the sealed message; open it with this phone's key so the
   notification can show the real text. Same maths as app.js (ECDH P-256 → HKDF → AES-GCM). */
function keyFromDb(id) {
  return new Promise((res) => {
    const r = indexedDB.open("bt-e2e", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("keys");
    r.onerror = () => res(null);
    r.onsuccess = () => { try { const g = r.result.transaction("keys").objectStore("keys").get("k-" + id); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); } catch { res(null); } };
  });
}
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function openSealed(d) {
  const p = JSON.parse(d.enc);
  const mine = await keyFromDb(d.to);
  if (!mine || !mine.priv || mine.id !== p.r) return null;
  const ec = { name: "ECDH", namedCurve: "P-256" };
  const theirs = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: d.jx, y: d.jy, ext: true }, ec, true, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: theirs }, mine.priv, 256);
  const hk = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const te = new TextEncoder();
  const key = await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: te.encode(d.cid), info: te.encode("bt-dm-v1") }, hk, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(p.iv) }, key, unb64(p.c));
  const m = JSON.parse(new TextDecoder().decode(pt));
  const text = String(m.t || "").replace(/\s+/g, " ").replace(/\|\|[^|]+\|\|/g, "(spoiler)").trim().slice(0, 140);
  if (d.mk === "image") return text ? "Photo: " + text : "Sent a photo";
  if (d.mk === "audio") return "Sent a voice message";
  if (d.mk === "file") return m.mm?.addon?.n ? "Sent an addon: " + m.mm.addon.n : "Sent a file: " + String(m.mm?.name || "file").slice(0, 80);
  return text || null;
}

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: "Beaver Transceiver", body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const target = new URL(data.url || "./", self.registration.scope);
    const cid = target.searchParams.get("c");
    const looking = wins.some((w) => w.visibilityState === "visible" && w.focused);
    if (looking && cid) return;
    let body = data.body || "";
    if (data.enc) { const t = await openSealed(data).catch(() => null); if (t) body = t; }
    await self.registration.showNotification(data.title || "Beaver Transceiver", {
      body,
      tag: data.tag || undefined,
      renotify: !!data.tag,
      icon: "icon-192.png",
      badge: "icon-192.png",
      data: { url: target.toString() }
    });
  })());
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        w.postMessage({ type: "open", url });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
