const CACHE = "bt-shell-3319108";
const SHELL = [
  "./", "./index.html", "./gate.js?v=3319108", "./app.js?v=3319108", "./app.css?v=3319108", "./manifest.webmanifest",
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

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: "Beaver Transceiver", body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const target = new URL(data.url || "./", self.registration.scope);
    const cid = target.searchParams.get("c");
    const looking = wins.some((w) => w.visibilityState === "visible" && w.focused);
    if (looking && cid) return;
    await self.registration.showNotification(data.title || "Beaver Transceiver", {
      body: data.body || "",
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
