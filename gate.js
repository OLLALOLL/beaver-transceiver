/* Beaver Transceiver only runs as an installed app on phones and tablets.
   - Computer: a "this is a phone app" page with a QR code.
   - Phone browser: install steps (or "you already have it, open it").
   - Installed app: carries on into app.js.
   A few links must still work in a browser tab: password reset links and the Xbox sign-in return. */
(() => {
  "use strict";
  const ua = navigator.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const mobile = iOS || android || navigator.userAgentData?.mobile === true || /Mobi/i.test(ua);
  const mq = (q) => window.matchMedia && matchMedia(q).matches;
  const standalone = mq("(display-mode: standalone)") || mq("(display-mode: fullscreen)") || mq("(display-mode: minimal-ui)") || navigator.standalone === true || document.referrer.startsWith("android-app://");
  const q = new URLSearchParams(location.search);
  const hash = location.hash || "";
  const BASE = location.origin + location.pathname;

  const allowed = mobile && standalone;
  window.BT_ALLOWED_HERE = allowed;
  try { if (allowed) localStorage.setItem("bt-installed", "1"); } catch {}
  // links that have to finish in whatever tab they opened in
  const passThrough = /type=recovery/.test(hash) || q.has("xbl");
  if (allowed || passThrough) return;

  window.BT_GATED = true;
  const confirmed = /type=(signup|email_change|magiclink)/.test(hash) || /access_token=/.test(hash);
  const resetDone = hash === "#reset-done";
  if (hash) history.replaceState(null, "", location.pathname + location.search);

  const el = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) { if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v; else e.setAttribute(k, v); }
    e.append(...kids.filter(Boolean)); return e;
  };
  const icon = (id, cls) => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); if (cls) s.setAttribute("class", cls); const u = document.createElementNS("http://www.w3.org/2000/svg", "use"); u.setAttribute("href", "#" + id); s.append(u); return s; };
  const note = (text, kind) => el("div", { class: "gate-note" + (kind ? " " + kind : "") }, text);

  function inviteHint() {
    const join = q.get("join"), add = q.get("add");
    if (join && /^[a-z0-9]{6,32}$/i.test(join)) {
      const box = el("div", { class: "gate-invite" }, el("small", {}, "Your invite code"), el("code", {}, join.toLowerCase()));
      const copy = el("button", { class: "pill", type: "button" }, "Copy");
      copy.onclick = () => navigator.clipboard?.writeText(join.toLowerCase()).then(() => { copy.textContent = "Copied"; });
      box.append(copy);
      return [box, el("p", { class: "gate-small" }, "In the app, tap + on the Chats tab, then “Join with an invite code” and paste it.")];
    }
    if (add && /^[a-z0-9_.]{3,20}$/i.test(add)) return [note("Once you're in the app, add @" + add.toLowerCase() + " from the Friends tab.")];
    return [];
  }

  function render() {
    const boot = document.getElementById("bootScreen"); if (boot) boot.hidden = true;
    const wrap = el("div", { class: "auth gate", id: "gateScreen" });
    const inner = el("div", { class: "inner" });
    const hero = el("div", { class: "hero" }, icon("logo"));
    wrap.append(inner); inner.append(hero);

    if (!mobile) {
      hero.append(el("h1", {}, "Beaver Transceiver is a phone app"), el("p", {}, "Open this page on your phone to install it. It doesn't run on computers."));
      const card = el("div", { class: "card gate-card" });
      if (confirmed) card.append(note("Your email is confirmed. Open Beaver Transceiver on your phone and sign in.", "good"));
      if (resetDone) card.append(note("Your password is changed. Sign in on your phone with the new one.", "good"));
      const qr = el("div", { class: "qr", id: "gateQr" });
      card.append(qr, el("p", { class: "gate-small", style: "text-align:center" }, "Scan with your phone's camera"), el("div", { class: "code-box" }, el("code", {}, BASE)));
      inner.append(card);
      const drawQr = () => { if (window.QRCode) { new QRCode(qr, { text: BASE + (location.search || ""), width: 180, height: 180, colorDark: "#0f1419", colorLight: "#ffffff" }); return true; } return false; };
      if (!drawQr()) window.addEventListener("load", () => { if (!drawQr()) qr.remove(); });
      document.body.append(wrap); return;
    }

    hero.append(el("h1", {}, "Install Beaver Transceiver"), el("p", {}, "It runs as an app on your phone. Install it once, then open it from your home screen."));
    const card = el("div", { class: "card gate-card" });
    inner.append(card);
    if (confirmed) card.append(note("Your email is confirmed. Install the app below, open it and sign in.", "good"));
    if (resetDone) card.append(note("Your password is changed. Open the app and sign in with the new one.", "good"));

    let installed = false; try { installed = localStorage.getItem("bt-installed") === "1"; } catch {}
    const inApp = /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|musical_ly|Twitter|; wv\)/i.test(ua);

    if (inApp) {
      card.append(el("h3", { class: "gate-h" }, "Open this in your browser first"),
        el("p", { class: "gate-small" }, iOS ? "This app's built-in browser can't install apps. Tap ··· or the share button and choose “Open in Safari”." : "This app's built-in browser can't install apps. Tap ⋮ and choose “Open in Chrome”, or copy the link below."),
        el("div", { class: "code-box" }, el("code", {}, BASE)));
      const copy = el("button", { class: "btn ghost", type: "button" }, "Copy link");
      copy.onclick = () => navigator.clipboard?.writeText(BASE + location.search).then(() => { copy.textContent = "Link copied"; });
      card.append(copy, ...inviteHint());
      document.body.append(wrap); return;
    }

    const openBox = el("div", { class: "gate-open" });
    const showInstalled = () => {
      openBox.replaceChildren(
        el("h3", { class: "gate-h" }, "You already have the app"),
        el("p", { class: "gate-small" }, iOS ? "Open Beaver Transceiver from your Home Screen." : "Open Beaver Transceiver from your home screen or app drawer."));
      if (android) {
        const open = el("a", { class: "btn", href: "intent://" + location.host + location.pathname + location.search + "#Intent;scheme=https;end" }, "Open the app");
        openBox.append(open);
      }
    };

    if (android) {
      const steps = el("div", { class: "gate-steps" });
      const btn = el("button", { class: "btn", type: "button", hidden: "" }, "Install app");
      const manual = el("ol", { class: "gate-list" },
        el("li", {}, "Tap the ⋮ menu in the top corner of Chrome"),
        el("li", {}, "Choose “Install app” or “Add to Home screen”"),
        el("li", {}, "Open Beaver Transceiver from your home screen"));
      steps.append(btn, manual);
      let deferred = null;
      window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; btn.hidden = false; manual.hidden = true; });
      btn.onclick = async () => { if (!deferred) return; deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; btn.hidden = true; if (r?.outcome !== "accepted") manual.hidden = false; };
      window.addEventListener("appinstalled", () => {
        try { localStorage.setItem("bt-installed", "1"); } catch {}
        steps.replaceChildren(note("Installed! Open Beaver Transceiver from your home screen.", "good"));
      });
      card.append(openBox, steps);
      if (installed) showInstalled();
      navigator.getInstalledRelatedApps?.().then((apps) => { if (apps?.length) { installed = true; showInstalled(); } }).catch(() => {});
    } else {
      const share = el("span", { class: "gate-share" }, icon("i-share"));
      card.append(
        el("ol", { class: "gate-list" },
          el("li", {}, el("span", {}, "Tap the Share button ", share, " in Safari's toolbar")),
          el("li", {}, "Scroll down and tap “Add to Home Screen”"),
          el("li", {}, "Tap “Add”, then open Beaver Transceiver from your Home Screen")),
        note("Already installed? Open Beaver Transceiver from your Home Screen. This browser tab can't open it for you."));
    }
    card.append(...inviteHint());
    document.body.append(wrap);
  }

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
})();
