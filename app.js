(() => {
"use strict";
const SUPABASE_URL = "https://zrslvneipbgtivhlygfd.supabase.co";
const SUPABASE_KEY = "sb_publishable_3M5msWhxHlC7cOfY5X4NeQ_Lbc1bR3f";
const VAPID_PUBLIC = "BLgsV3h4QeDmlsulruH0VsGcfGeje7XBq1cdWxzYo9gSgWejPcjz4fxKUF--fq_DhKTNnP1gG_x04GJ9z842WSQ";
const BASE = location.origin + location.pathname;
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

const $ = (id) => document.getElementById(id);
const QUICK = ["👍","❤️","😂","🔥","😮","😢","🦫"];
const ALL_EMOJI = ["👍","👎","❤️","🧡","💛","💚","💙","💜","🖤","🤍","😂","🤣","😊","😍","🥰","😘","😎","🤩","🥳","😮","😱","😢","😭","😡","🤯","🤔","🙄","😴","🤤","😬","🙏","👏","🙌","💪","🤝","👀","🔥","✨","💯","🎉","🎮","⚔️","🛡️","💎","🏆","⛏️","🦫","🪵"];
const PALETTE = ["#c4621a","#2f8f83","#5b6ee1","#b8457a","#4f8a2b","#8c5a2e","#7a52c7","#b0851a"];
const ACCENTS = ["#c4621a","#d1462f","#b8457a","#7a52c7","#3f6fd8","#1f8ea8","#2f9e63","#8a8f1d"];
const WALLS = [["none","None"],["dots","Dots"],["grid","Grid"],["river","River"],["wood","Wood"],["sunset","Sunset"]];
const PAGE = 60;
const USER_RE = /^[a-z0-9_.]{3,20}$/;
const S = {
  me:null, profile:null, P:{}, nick:{}, blocks:new Set(), friendships:[], convs:[], unread:{}, mentions:{},
  cur:null, msgs:[], hasOlder:false, detached:false, awayCount:0, pins:[], polls:{}, votes:{}, media:{}, revealed:new Set(),
  peers:{}, rt:null, pres:null, tab:"chats", typingOn:false, typingTimer:null, reply:null, editing:null,
  archivedView:false, search:"", outbox:[], drafts:{}, pendingEmail:"", offline:false, deep:null, spoilShown:new Set(), bdays:{}
};
const prefs = Object.assign({ sound:true, wall:"none" }, store("bt-prefs") || {});
const wide = () => matchMedia("(min-width:760px)").matches;

/* ================= helpers ================= */
function store(k, v){
  try{
    if(v===undefined){ const x=localStorage.getItem(k); return x ? JSON.parse(x) : null; }
    if(v===null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
  }catch{ return null; }
}
const ukey = (k) => k + "-" + (S.me?.id || "anon");
function h(tag, props={}, ...kids){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(props||{})){
    if(v==null||v===false) continue;
    if(k.startsWith("aria-")||k==="role"||k.startsWith("data-")||k==="style") e.setAttribute(k,v); else e[k]=v;
  }
  e.append(...kids.flat().filter(k=>k!=null&&k!==false));
  return e;
}
function svg(id, size){ const s=document.createElementNS("http://www.w3.org/2000/svg","svg"); const u=document.createElementNS("http://www.w3.org/2000/svg","use"); u.setAttribute("href","#"+id); s.append(u); if(size){ s.setAttribute("width",size); s.setAttribute("height",size); } return s; }
function toast(t){ const el=$("toast"); el.textContent=t; el.classList.add("show"); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("show"),2800); }
function esc(s){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
const usernames = () => new Set(Object.values(S.P).map(p=>p.username));
function fmt(text){
  const blocks=[];
  const src=String(text).replace(/```([a-z0-9+#-]*)[ \t]*\n?([\s\S]*?)```/gi,(m0,lang,code)=>{ blocks.push({ lang:lang.toLowerCase(), code }); return "\u0000"+(blocks.length-1)+"\u0000"; });
  let x=esc(src);
  x=x.replace(/\|\|([^|\n]+)\|\|/g,'<span class="spoiler" role="button" tabindex="0">$1</span>');
  x=x.replace(/`([^`\n]+)`/g,"<code>$1</code>");
  x=x.replace(/\*\*([^*\n]+)\*\*/g,"<b>$1</b>");
  x=x.replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<i>$2</i>");
  x=x.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  const known=usernames();
  x=x.replace(/(^|[\s(])@([a-z0-9_.]{3,20})/gi,(m,pre,u)=> known.has(u.toLowerCase()) ? `${pre}<span class="at">@${u}</span>` : m);
  x=x.replace(/\u0000(\d+)\u0000/g,(m0,i)=>{ const b=blocks[+i]; const lang=b.lang && window.hljs?.getLanguage?.(b.lang) ? " language-"+b.lang : ""; return `<pre class="code"><code class="${lang?lang.trim():"nohighlight"}">${esc(b.code.replace(/\n$/,""))}</code></pre>`; });
  return x;
}
const firstUrl = (t) => (String(t||"").match(/https?:\/\/[^\s<]+/)||[])[0];
const isJumbo = (t) => t.length<=12 && /^\p{Extended_Pictographic}[\p{Extended_Pictographic}‍️\s]*$/u.test(t);
const timeStr = (ts) => new Date(ts).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
const longDate = (ts) => new Date(ts).toLocaleDateString("en-GB", {day:"numeric", month:"long", year:"numeric"});
function dayStr(ts){
  const d=new Date(ts), n=new Date(), k=x=>x.toDateString();
  if(k(d)===k(n)) return "Today";
  const y=new Date(n); y.setDate(n.getDate()-1); if(k(d)===k(y)) return "Yesterday";
  return d.toLocaleDateString("en-GB", {weekday:"short", day:"numeric", month:"short", year: d.getFullYear()!==n.getFullYear() ? "numeric" : undefined});
}
function listTime(ts){
  if(!ts) return "";
  const d=new Date(ts), n=new Date();
  if(d.toDateString()===n.toDateString()) return timeStr(ts);
  if(n-d < 6*864e5) return d.toLocaleDateString("en-GB",{weekday:"short"});
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
}
function ago(ts){
  const s=(Date.now()-Date.parse(ts))/1000;
  if(s<60) return "just now"; if(s<3600) return Math.floor(s/60)+" min ago";
  if(s<86400) return Math.floor(s/3600)+" h ago"; if(s<172800) return "yesterday";
  if(s<7*86400) return Math.floor(s/86400)+" days ago"; return "on "+longDate(ts);
}
function since(ts){
  const days=Math.floor((Date.now()-Date.parse(ts))/864e5);
  if(days<1) return "Today"; if(days===1) return "1 day"; if(days<60) return days+" days";
  const m=Math.floor(days/30.44); if(m<24) return m+" months"; return Math.floor(days/365.25)+" years";
}
const durStr = (s) => { s=Math.max(0,Math.round(s||0)); return Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); };
function hashColor(s){ let x=0; for(const c of String(s)) x=(x*31+c.charCodeAt(0))>>>0; return PALETTE[x%PALETTE.length]; }
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
const realName = (uid) => S.P[uid]?.display_name || "Someone";
const nameOf = (uid) => S.nick[uid] || realName(uid);
const firstName = (uid) => nameOf(uid).split(" ")[0];
const handleOf = (uid) => S.P[uid] ? "@"+S.P[uid].username : "";
function avatar(uid, size=44){
  const p=S.P[uid];
  if(p?.avatar_url){ const i=h("img",{className:"av",src:p.avatar_url,alt:"",loading:"lazy",decoding:"async"}); i.style.width=i.style.height=size+"px"; return i; }
  const d=h("div",{className:"av",textContent:(realName(uid).trim()[0]||"?").toUpperCase()});
  d.style.cssText=`width:${size}px;height:${size}px;font-size:${Math.round(size*.42)}px;background:${hashColor(uid)}`;
  return d;
}
function convAvatar(c, size=48){
  if(c.kind==="dm"){ const o=dmOther(c); return h("span",{className:"av-wrap"+(isOnline(o)?" online":"")}, avatar(o,size)); }
  if(c.avatar_url){ const i=h("img",{className:"av group",src:c.avatar_url,alt:"",loading:"lazy"}); i.style.width=i.style.height=size+"px"; return i; }
  const d=h("div",{className:"av group"}); d.style.cssText=`width:${size}px;height:${size}px;background:${hashColor(c.id)}`;
  d.append(svg("i-group",Math.round(size*.5))); return d;
}
const isNetErr = (e) => !navigator.onLine || /failed to fetch|networkerror|load failed|network request failed/i.test(e?.message||"");
const ERRORS = {
  "user not found":"No one has that username.", "that is you":"That's your own username.",
  "too many requests":"You've sent a lot of requests. Try again later.",
  "not friends":"You can only do that with people on your friends list.",
  "bad group name":"Group names need 1–40 characters.", "pick at least one friend":"Pick at least one friend for the group.",
  "group too big":"Groups can have up to 50 people.", "not in group":"You're not in that group any more.",
  "only the group owner can remove people":"Only the group owner can remove people.",
  "only the group owner can change roles":"Only the group owner can change roles.",
  "slow down":"Slow down a little — too many messages at once.", "username taken":"That username was just taken. Pick another.",
  "no profile":"Finish setting up your profile first.", "banned":"Your account is banned.",
  "invite not found":"That invite link doesn't work any more.", "bad poll":"Polls need a question and 2–10 options.",
  "too many reports":"You've sent a lot of reports. Try again later.", "not allowed":"You can't do that.",
  "cannot change your own role":"You can't change your own role.", "not accepting requests":"That person isn't accepting friend requests.", "friends of friends only":"That person only accepts requests from friends of friends.", "call already over":"That call has already ended."
};
function friendlyErr(e, fallback){
  const m=(e?.message||"");
  const cd=m.match(/bt: (username|display name) cooldown (\d{4}-\d{2}-\d{2})/);
  if(cd) return `You can change your ${cd[1]} again on ${longDate(cd[2])}.`;
  const bt=m.match(/bt: ([a-z ]+)/i); if(bt && ERRORS[bt[1].trim()]) return ERRORS[bt[1].trim()];
  const low=m.toLowerCase();
  if(low.includes("bt_profiles_username") || (low.includes("duplicate") && low.includes("username"))) return "That username is taken. Pick another.";
  if(isNetErr(e)) return "No connection. Check your internet and try again.";
  return fallback;
}
async function copyText(t, label){
  try{ await navigator.clipboard.writeText(t); toast(label||"Copied"); }
  catch{ toast("Couldn't copy — long-press to select it instead"); }
}

/* gestures: long-press + optional swipe-right, with tap */
function gestures(el, { onTap, onLong, onSwipe, swipeTarget }){
  let timer=null, sx=0, sy=0, dx=0, mode=null, longFired=false, lastTouch=0;
  const tgt = swipeTarget || el;
  const cancelLong = () => { clearTimeout(timer); timer=null; el.classList.remove("pressed"); };
  el.addEventListener("touchstart",(e)=>{
    lastTouch=Date.now(); const t=e.touches[0]; sx=t.clientX; sy=t.clientY; dx=0; mode=null; longFired=false;
    if(onLong){ el.classList.add("pressed"); timer=setTimeout(()=>{ longFired=true; el.classList.remove("pressed"); navigator.vibrate?.(12); onLong(); }, 430); }
  },{passive:true});
  el.addEventListener("touchmove",(e)=>{
    const t=e.touches[0], x=t.clientX-sx, y=t.clientY-sy;
    if(mode===null){
      if(Math.abs(x)<8 && Math.abs(y)<8) return;
      cancelLong();
      mode = (onSwipe && x>0 && Math.abs(x)>Math.abs(y)*1.3) ? "swipe" : "scroll";
    }
    if(mode==="swipe"){ dx=Math.min(90,Math.max(0,x)); tgt.style.transform=`translateX(${dx}px)`; const ico=tgt.querySelector(".swipe-ico"); if(ico) ico.style.opacity=Math.min(1,dx/56); }
  },{passive:true});
  el.addEventListener("touchend",()=>{
    cancelLong();
    if(mode==="swipe"){ tgt.style.transition="transform .2s"; tgt.style.transform=""; setTimeout(()=>{ tgt.style.transition=""; },220); const ico=tgt.querySelector(".swipe-ico"); if(ico) ico.style.opacity=0; if(dx>56){ navigator.vibrate?.(8); onSwipe(); } }
  });
  el.addEventListener("touchcancel",()=>{ cancelLong(); tgt.style.transform=""; });
  el.addEventListener("contextmenu",(e)=>{ if(!onLong) return; e.preventDefault(); if(Date.now()-lastTouch<800) return; onLong(); });
  el.addEventListener("click",(e)=>{ if(longFired){ longFired=false; e.preventDefault(); return; } if(mode==="swipe") return; onTap?.(e); });
}

/* ================= sheets ================= */
function openSheet(build){ const b=$("sheetBody"); b.replaceChildren(); build(b); $("backdrop").classList.add("show"); $("sheet").classList.add("show"); $("sheet").scrollTop=0; }
function closeSheet(){ const sh=$("sheet"); sh.style.transform=""; sh.style.transition=""; $("backdrop").style.opacity=""; $("backdrop").classList.remove("show"); sh.classList.remove("show"); }
$("backdrop").onclick=closeSheet;

/* drag-down-to-dismiss for sheets and the photo viewer */
function dragToClose(el, { onClose, canStart, fade }){
  let startY=0, startT=0, dy=0, dragging=false, tracking=false, fromHandle=false;
  const begin=(y, target)=>{ startY=y; startT=Date.now(); dy=0; dragging=false; fromHandle=!!target.closest?.(".grab,.drag-zone"); tracking=canStart(fromHandle); };
  const move=(y, e)=>{
    if(!tracking) return;
    const d=y-startY;
    if(!dragging){
      if(d<6) { if(d<-6) tracking=false; return; }
      if(!fromHandle && el.scrollTop>0){ tracking=false; return; }
      dragging=true; el.style.transition="none";
    }
    dy=Math.max(0,d);
    el.style.transform=`translateY(${dy}px)`;
    if(fade) fade(Math.max(0,1-dy/(el.offsetHeight||400)));
    if(e?.cancelable) e.preventDefault();
  };
  const end=()=>{
    if(!tracking){ return; } tracking=false;
    if(!dragging) return; dragging=false;
    const v=dy/Math.max(1,Date.now()-startT);
    el.style.transition="";
    if(dy>110 || (v>0.55 && dy>30)){ onClose(); }
    else { el.style.transform=""; if(fade) fade(1); }
  };
  el.addEventListener("touchstart",(e)=>begin(e.touches[0].clientY, e.target),{ passive:true });
  el.addEventListener("touchmove",(e)=>move(e.touches[0].clientY, e),{ passive:false });
  el.addEventListener("touchend",end); el.addEventListener("touchcancel",end);
  el.addEventListener("pointerdown",(e)=>{ if(e.pointerType!=="mouse" || !e.target.closest(".grab,.drag-zone")) return; begin(e.clientY, e.target); const mv=(ev)=>move(ev.clientY, ev); const up=()=>{ end(); window.removeEventListener("pointermove",mv); window.removeEventListener("pointerup",up); }; window.addEventListener("pointermove",mv); window.addEventListener("pointerup",up); });
}
dragToClose($("sheet"),{
  canStart:()=>$("sheet").classList.contains("show"),
  onClose:closeSheet,
  fade:(o)=>{ $("backdrop").style.opacity=String(o); }
});
dragToClose($("viewer"),{
  canStart:()=>!$("viewer").hidden,
  onClose:()=>{ const v=$("viewer"); v.style.transform=""; v.style.opacity=""; v.hidden=true; $("viewerImg").src=""; },
  fade:(o)=>{ $("viewer").style.opacity=String(Math.max(.3,o)); }
});
function armed(btn, label, action){
  btn.onclick=()=>{ const old=btn.textContent; btn.textContent=label; btn.classList.add("danger"); btn.onclick=async()=>{ btn.disabled=true; await action(); btn.disabled=false; btn.textContent=old; btn.classList.remove("danger"); }; };
}
const ICONS={"📌":"i-pin","🔔":"i-bell","🗄️":"i-archive","📤":"i-unarchive","✓":"i-check","●":"i-unread","👥":"i-group","🔗":"i-link","↩️":"i-reply","📋":"i-copy","✏️":"i-edit","👤":"i-me","🚩":"i-flag","🗑️":"i-trash","🏷️":"i-tag","⛔":"i-block","🔨":"i-ban","➕":"i-user-plus","⭐":"i-star","⬇️":"i-star-off","🚪":"i-leave","🔍":"i-search","📱":"i-qr","🎨":"i-palette","🔐":"i-lock","🛡️":"i-shield","📷":"i-image","🎤":"i-mic","📊":"i-poll","🖼️":"i-image","📎":"i-file","🎧":"i-headset","💻":"i-devices","🔒":"i-users-lock","🎂":"i-cake","🎮":"i-game","📞":"i-phone","🎥":"i-video"};
function menuBtn(label, onClick, opts={}){
  const m=label.match(/^(\S+)\s+([\s\S]*)$/); const icon=m && ICONS[m[1]];
  const b=h("button",{className:opts.danger?"danger":""}, icon ? svg(icon) : null, h("span",{className:"lbl-t",textContent: icon ? m[2] : label}), opts.right ? h("span",{className:"r",textContent:opts.right}) : null);
  b.onclick=onClick; return b;
}
const stripEmoji = (t) => String(t||"").replace(/^(?:\p{Extended_Pictographic}|\ufe0f|\u200d)+\s*/u,"");
function previewNode(text){
  const t=stripEmoji(text);
  if(text==="") return [svg("i-image"), "Photo"].map(x=>{ if(typeof x!=="string") x.setAttribute("class","inline-ico"); return x; });
  if(/^File: /.test(t)){ const i=svg("i-file"); i.setAttribute("class","inline-ico"); return [i, t.slice(6)]; }
  if(/^Voice message$/.test(t)){ const i=svg("i-mic"); i.setAttribute("class","inline-ico"); return [i, "Voice message"]; }
  if(/^Poll: /.test(t) || /^📊/.test(text)){ const i=svg("i-poll"); i.setAttribute("class","inline-ico"); return [i, t.replace(/^Poll: /,"")]; }
  return [t];
}

/* ================= screens ================= */
function show(which){ for(const id of ["bootScreen","authScreen","mailScreen","setupScreen","bannedScreen","app"]) $(id).hidden = id!==which; }

/* ================= username checks ================= */
function watchUsername(input, note, getCurrent){
  let t=null, seq=0;
  input.addEventListener("input",()=>{
    const v=input.value.toLowerCase().replace(/[^a-z0-9_.]/g,""); if(v!==input.value) input.value=v;
    clearTimeout(t); note.textContent=""; note.className="";
    if(!v) return;
    if(v===getCurrent?.()) return;
    if(!USER_RE.test(v)){ note.textContent="3–20 characters"; note.className="bad"; return; }
    note.textContent="Checking…";
    const my=++seq;
    t=setTimeout(async()=>{
      const { data, error } = await sb.rpc("bt_username_available",{ name:v });
      if(my!==seq) return;
      if(error){ note.textContent=""; return; }
      note.textContent = data ? "Available" : "Taken"; note.className = data ? "good" : "bad";
    }, 350);
  });
}
async function usernameFree(v){ const { data } = await sb.rpc("bt_username_available",{ name:v }); return !!data; }

/* ================= auth ================= */
let mode="in";
function setMode(m){
  mode=m;
  $("tabIn").setAttribute("aria-selected", m==="in"); $("tabUp").setAttribute("aria-selected", m==="up");
  $("upFields").hidden = m!=="up"; $("forgotWrap").hidden = m!=="in";
  $("authBtn").textContent = m==="in" ? "Sign in" : "Create account";
  $("authPass").autocomplete = m==="in" ? "current-password" : "new-password";
  $("authErr").textContent="";
}
$("tabIn").onclick=()=>setMode("in"); $("tabUp").onclick=()=>setMode("up");
watchUsername($("suUser"), $("suUserNote"));
function showMail(email){ S.pendingEmail=email; $("mailText").textContent="We sent a link to "+email+". Open it to activate your account, then come back here and sign in."; $("mailErr").textContent=""; show("mailScreen"); }
$("authForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email=$("authEmail").value.trim(), password=$("authPass").value, err=$("authErr");
  err.textContent="";
  if(mode==="up"){
    if(!$("suDisplay").value.trim()){ err.textContent="Enter a display name."; return; }
    if(!USER_RE.test($("suUser").value.trim())){ err.textContent="Usernames are 3–20 lowercase letters, numbers, dots or underscores."; return; }
  }
  if(!/^\S+@\S+\.\S+$/.test(email)){ err.textContent="Enter a valid email address."; return; }
  if(password.length<6){ err.textContent="Passwords need at least 6 characters."; return; }
  const btn=$("authBtn"); btn.disabled=true;
  try{
    if(mode==="in"){
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error){ if(/email not confirmed/i.test(error.message)){ showMail(email); return; } throw error; }
    } else {
      const user=$("suUser").value.trim();
      if(!(await usernameFree(user))){ err.textContent="That username is taken. Pick another."; $("suUserNote").textContent="Taken"; $("suUserNote").className="bad"; return; }
      const { data, error } = await sb.auth.signUp({ email, password, options:{ emailRedirectTo:BASE, data:{ bt_username:user, bt_display_name:$("suDisplay").value.trim() } } });
      if(error) throw error;
      if(data.user && Array.isArray(data.user.identities) && data.user.identities.length===0){ err.textContent="That email already has an account. Sign in instead."; return; }
      if(data.session && !data.user?.email_confirmed_at) await sb.auth.signOut();
      if(!data.session || !data.user?.email_confirmed_at) showMail(email);
    }
  }catch(ex){
    const m=(ex?.message||"").toLowerCase();
    err.textContent =
      m.includes("invalid login") ? "Wrong email or password." :
      m.includes("already registered") ? "That email already has an account. Sign in instead." :
      m.includes("database error saving new user") ? "That username was just taken. Pick another." :
      m.includes("rate limit") ? "Too many tries. Wait a minute and try again." :
      friendlyErr(ex, ex?.message || "Something went wrong. Try again.");
  }finally{ btn.disabled=false; }
});
$("forgotBtn").onclick=async()=>{
  const email=$("authEmail").value.trim();
  if(!/^\S+@\S+\.\S+$/.test(email)){ $("authErr").textContent="Type your email above first, then tap “Forgot your password?”."; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo:BASE });
  $("authErr").textContent = error ? friendlyErr(error,"Couldn't send the reset email. Try again in a minute.") : "";
  if(!error) toast("Reset link sent to "+email);
};
$("resendBtn").onclick=async()=>{
  const { error } = await sb.auth.resend({ type:"signup", email:S.pendingEmail, options:{ emailRedirectTo:BASE } });
  $("mailErr").textContent = error ? (/rate|seconds/i.test(error.message) ? "Wait a minute before asking for another email." : "Couldn't send it. Try again shortly.") : "";
  if(!error) toast("Email sent again");
};
$("mailBack").onclick=()=>{ show("authScreen"); setMode("in"); $("authEmail").value=S.pendingEmail; };
$("bannedOut").onclick=()=>sb.auth.signOut();
function newPasswordSheet(){
  openSheet(b=>{
    const inp=h("input",{className:"input",id:"newPass",type:"password",autocomplete:"new-password",minLength:6});
    const err=h("div",{className:"err"}); const go=h("button",{className:"btn",textContent:"Save new password"});
    go.onclick=async()=>{
      if(inp.value.length<6){ err.textContent="Passwords need at least 6 characters."; return; }
      go.disabled=true; const { error } = await sb.auth.updateUser({ password:inp.value }); go.disabled=false;
      if(error){ err.textContent=friendlyErr(error,"Couldn't save the password. Try again."); return; }
      closeSheet(); toast("Password updated");
    };
    b.append(h("h2",{textContent:"Choose a new password"}), h("label",{className:"lbl",htmlFor:"newPass",textContent:"New password"}), inp, err, go);
  });
}

/* setup profile */
watchUsername($("stUser"), $("stUserNote"));
$("setupForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const d=$("stDisplay").value.trim(), u=$("stUser").value.trim(), err=$("setupErr");
  if(!d){ err.textContent="Enter a display name."; return; }
  if(!USER_RE.test(u)){ err.textContent="Usernames are 3–20 lowercase letters, numbers, dots or underscores."; return; }
  $("setupBtn").disabled=true;
  const { error } = await sb.from("bt_profiles").insert({ id:S.me.id, username:u, display_name:d });
  $("setupBtn").disabled=false;
  if(error){ err.textContent=friendlyErr(error,"Couldn't save. Try again."); return; }
  enter();
});
$("setupOut").onclick=()=>sb.auth.signOut();

/* ================= profiles / social ================= */
async function ensureProfiles(ids){
  const miss=[...new Set(ids.filter(id=>id && !S.P[id]))];
  if(!miss.length) return;
  const { data } = await sb.from("bt_profiles").select("*").in("id", miss);
  for(const p of data||[]) S.P[p.id]=p;
}
const otherOf = (f) => f.requester===S.me.id ? f.addressee : f.requester;
const friendRow = (uid) => S.friendships.find(f=>otherOf(f)===uid);
const isFriend = (uid) => friendRow(uid)?.status==="accepted";
const friendIds = () => S.friendships.filter(f=>f.status==="accepted").map(otherOf);
const isOnline = (uid) => !!S.peers[uid] && uid!==S.me?.id;
const ACT_TYPES=[["playing","Playing","i-game"],["listening","Listening to","i-headset"],["watching","Watching","i-video"],["building","Building","i-edit"],["working","Working on","i-devices"]];
function activityOf(uid){
  const a=S.P[uid]?.activity; if(!a || !a.text) return null;
  if(a.until && Date.parse(a.until)<Date.now()) return null;
  const t=ACT_TYPES.find(x=>x[0]===a.type)||ACT_TYPES[0];
  return { label:`${t[1]} ${a.text}`, icon:t[2] };
}
function activityLine(uid){ const a=activityOf(uid); if(!a) return null; return h("div",{className:"activity"}, svg(a.icon), a.label); }
function isBirthdayToday(uid){ const b=S.bdays[uid]; if(!b) return false; const d=new Date(b.birthday+"T12:00:00"), n=new Date(); return d.getMonth()===n.getMonth() && d.getDate()===n.getDate(); }
function presenceText(uid){
  if(isOnline(uid)) return "Online";
  const ls=S.P[uid]?.last_seen_at; return ls ? "Last seen "+ago(ls) : "Offline";
}
async function loadSocial(){
  const [f, n, b, bd] = await Promise.all([
    sb.from("bt_friendships").select("*"),
    sb.from("bt_nicknames").select("target_id,nickname"),
    sb.from("bt_blocks").select("blocked_id"),
    sb.from("bt_birthdays").select("*"),
  ]);
  S.bdays=Object.fromEntries((bd.data||[]).map(x=>[x.user_id,x]));
  if(f.error) throw f.error;
  S.friendships=f.data||[];
  S.nick=Object.fromEntries((n.data||[]).map(x=>[x.target_id,x.nickname]));
  S.blocks=new Set((b.data||[]).map(x=>x.blocked_id));
  await ensureProfiles([...S.friendships.map(otherOf), ...S.blocks]);
  renderFriends(); renderBadges(); scheduleSave();
}
let socialTimer=null; const reloadSocial=()=>{ clearTimeout(socialTimer); socialTimer=setTimeout(()=>loadSocial().catch(()=>{}),250); };
let suggestions=[];
async function loadSuggestions(){
  const { data } = await sb.rpc("bt_friend_suggestions");
  suggestions=data||[]; await ensureProfiles(suggestions.map(s=>s.user_id)); renderFriends();
}
function renderFriends(){
  const box=$("friendsList"); if(!box || !S.me) return; box.replaceChildren();
  const incoming=S.friendships.filter(f=>f.status==="pending" && f.addressee===S.me.id);
  const outgoing=S.friendships.filter(f=>f.status==="pending" && f.requester===S.me.id);
  const friends=friendIds().sort((a,b)=>(isOnline(b)-isOnline(a)) || nameOf(a).localeCompare(nameOf(b)));
  if(incoming.length){
    box.append(h("div",{className:"section-label",textContent:`Friend requests · ${incoming.length}`}));
    const rows=h("div",{className:"rows"});
    for(const f of incoming){
      const uid=f.requester;
      const acc=h("button",{className:"pill primary",textContent:"Accept"}), dec=h("button",{className:"pill",textContent:"Decline"});
      acc.onclick=(e)=>{ e.stopPropagation(); respond(uid,true); }; dec.onclick=(e)=>{ e.stopPropagation(); respond(uid,false); };
      rows.append(personRow(uid, handleOf(uid), h("span",{className:"actions"},dec,acc)));
    }
    box.append(rows);
  }
  box.append(h("div",{className:"section-label",textContent:`Friends · ${friends.length}`}));
  if(!friends.length){
    const e=h("div",{className:"empty"}); e.innerHTML='<svg><use href="#logo"/></svg><h3>No friends yet</h3><p>Ask a friend for their username and add them above, or share your QR code.</p>';
    box.append(e);
  } else {
    const rows=h("div",{className:"rows"});
    for(const uid of friends){
      const msg=h("button",{className:"pill",textContent:"Message"}); msg.onclick=(e)=>{ e.stopPropagation(); openDM(uid); };
      const st=activityOf(uid)?.label || S.P[uid]?.status;
      rows.append(personRow(uid, st || presenceText(uid), h("span",{className:"actions"},msg)));
    }
    box.append(rows);
  }
  const sugg=suggestions.filter(s=>!friendRow(s.user_id) && !S.blocks.has(s.user_id));
  if(sugg.length){
    box.append(h("div",{className:"section-label",textContent:"People you may know"}));
    const rows=h("div",{className:"rows"});
    for(const s of sugg){
      const add=h("button",{className:"pill primary",textContent:"Add"});
      add.onclick=async(e)=>{ e.stopPropagation(); add.disabled=true; const { error } = await sb.rpc("bt_send_friend_request",{ target_username:S.P[s.user_id].username }); if(error){ add.disabled=false; toast(friendlyErr(error,"Couldn't send the request")); return; } toast("Request sent"); loadSocial(); };
      rows.append(personRow(s.user_id, `${s.mutual} mutual friend${s.mutual==1?"":"s"}`, h("span",{className:"actions"},add)));
    }
    box.append(rows);
  }
  if(outgoing.length){
    box.append(h("div",{className:"section-label",textContent:`Sent requests · ${outgoing.length}`}));
    const rows=h("div",{className:"rows"});
    for(const f of outgoing){
      const uid=f.addressee; const c=h("button",{className:"pill",textContent:"Cancel"});
      c.onclick=async(e)=>{ e.stopPropagation(); c.disabled=true; const { error } = await sb.rpc("bt_remove_friend",{ other:uid }); if(error){ c.disabled=false; toast(friendlyErr(error,"Couldn't cancel the request")); } else loadSocial(); };
      rows.append(personRow(uid, "Waiting for "+firstName(uid)+" to accept", h("span",{className:"actions"},c)));
    }
    box.append(rows);
  }
}
function personRow(uid, subText, right){
  const r=h("div",{className:"row",role:"button",tabIndex:0});
  r.append(h("span",{className:"av-wrap"+(isOnline(uid)?" online":"")},avatar(uid,48)),
    h("div",{className:"meta"},h("div",{className:"top"},h("div",{className:"name",textContent:nameOf(uid)})),h("div",{className:"bottom"},h("div",{className:"sub",textContent:subText}))), right);
  r.onclick=()=>openProfile(uid); r.onkeydown=(e)=>{ if(e.key==="Enter") openProfile(uid); };
  return r;
}
async function respond(uid, accept){
  const { error } = await sb.rpc("bt_respond_friend_request",{ other:uid, accept });
  if(error){ toast(friendlyErr(error,"Couldn't update the request")); return; }
  toast(accept ? "You and "+nameOf(uid)+" are now friends" : "Request declined");
  loadSocial();
}
$("addForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const v=$("addInput").value.trim().replace(/^@/,"").toLowerCase(), note=$("addNote");
  note.className="addnote"; note.textContent="";
  if(!v) return;
  if(!USER_RE.test(v)){ note.textContent="Usernames are 3–20 letters, numbers, dots or underscores."; note.classList.add("bad"); return; }
  const { data, error } = await sb.rpc("bt_send_friend_request",{ target_username:v });
  if(error){ note.textContent=friendlyErr(error,"Couldn't send the request. Try again."); note.classList.add("bad"); return; }
  note.textContent={ sent:"Request sent to @"+v+".", accepted:"You and @"+v+" are now friends!", already_friends:"You're already friends with @"+v+".", pending:"You already sent @"+v+" a request." }[data]||"Done.";
  note.classList.add("good"); $("addInput").value="";
  loadSocial();
});

/* ================= conversations ================= */
const myMember = (c) => c?.bt_members?.find(m=>m.user_id===S.me.id);
const dmOther = (c) => c?.bt_members?.find(m=>m.user_id!==S.me.id)?.user_id;
const convName = (c) => c.kind==="group" ? c.name : nameOf(dmOther(c));
const convTime = (c) => Date.parse(c.last_message_at||c.created_at);
const curConv = () => S.convs.find(x=>x.id===S.cur);
const viewing = (cid) => S.cur===cid && document.body.dataset.view==="chat" && !document.hidden;
function unreadOf(c){ if(viewing(c.id)) return 0; return S.unread[c.id]||0; }
const isUnread = (c) => unreadOf(c)>0 || !!myMember(c)?.marked_unread;
function sortConvs(){ S.convs.sort((a,b)=>((myMember(b)?.pinned?1:0)-(myMember(a)?.pinned?1:0)) || convTime(b)-convTime(a)); }
async function loadConvs(){
  const [{ data, error }, uc] = await Promise.all([
    sb.from("bt_conversations").select("*, bt_members(user_id, role, last_read_at, joined_at, pinned, archived, notify, marked_unread)"),
    sb.rpc("bt_unread_counts")
  ]);
  if(error) throw error;
  S.convs=data; sortConvs();
  S.unread={}; S.mentions={};
  for(const r of uc.data||[]){ S.unread[r.conversation_id]=Number(r.unread)||0; S.mentions[r.conversation_id]=Number(r.mentions)||0; }
  await ensureProfiles(data.flatMap(c=>c.bt_members.map(m=>m.user_id)));
  renderChats(); renderBadges(); scheduleSave();
  if(S.cur){ if(!curConv()){ closeChat(); toast("You're no longer in that chat"); } else renderChatHead(); }
  for(const c of S.convs){ const me=myMember(c); if(me && c.last_message_at && c.last_message_user && c.last_message_user!==S.me.id && Date.parse(c.last_message_at)>Date.parse(me.last_delivered_at||0)) markDelivered(c.id); }
}
const deliverTimers={};
function markDelivered(cid){
  const c=S.convs.find(x=>x.id===cid); const me=myMember(c); if(!me) return;
  me.last_delivered_at=new Date().toISOString();
  clearTimeout(deliverTimers[cid]);
  deliverTimers[cid]=setTimeout(()=>sb.from("bt_members").update({ last_delivered_at:new Date().toISOString() }).match({ conversation_id:cid, user_id:S.me.id }).then(()=>{}), 700);
}
let convTimer=null; const reloadConvs=()=>{ clearTimeout(convTimer); convTimer=setTimeout(()=>loadConvs().catch(()=>{}),300); };
function previewOf(c){
  const draft=S.drafts[c.id];
  if(draft && S.cur!==c.id) return [h("span",{className:"draft",textContent:"Draft: "}), draft];
  const p=c.last_message_preview;
  if(p==null) return c.kind==="group" ? "Group created" : "Say hi";
  if(c.last_message_user && S.blocks.has(c.last_message_user)) return "Message from someone you blocked";
  const body=previewNode(p);
  if(c.last_message_user===S.me.id) return ["You: ", ...body];
  if(c.kind==="group" && c.last_message_user) return [firstName(c.last_message_user)+": ", ...body];
  return body;
}
function renderChats(){
  const box=$("chatList"); if(!box || !S.me) return; box.replaceChildren();
  const q=S.search.trim().toLowerCase();
  if(q){
    const convs=S.convs.filter(c=>convName(c).toLowerCase().includes(q) || (c.kind==="dm" && (S.P[dmOther(c)]?.username||"").includes(q)));
    const dmWith=new Set(S.convs.filter(c=>c.kind==="dm").map(dmOther));
    const people=friendIds().filter(id=>!dmWith.has(id) && (nameOf(id).toLowerCase().includes(q) || (S.P[id]?.username||"").includes(q)));
    if(!convs.length && !people.length){ box.append(h("div",{className:"empty"},h("p",{textContent:`No chats or friends match “${S.search.trim()}”.`}))); return; }
    if(convs.length){ box.append(h("div",{className:"section-label",textContent:"Chats"})); convs.forEach(c=>box.append(chatRow(c))); }
    if(people.length){
      box.append(h("div",{className:"section-label",textContent:"Friends"}));
      for(const uid of people){ const r=personRow(uid, handleOf(uid), null); r.onclick=()=>openDM(uid); box.append(r); }
    }
    return;
  }
  const active=S.convs.filter(c=>!myMember(c)?.archived), archived=S.convs.filter(c=>myMember(c)?.archived);
  if(S.archivedView){
    const back=h("button",{className:"archived-row"}, svg("i-back",18), "Back to chats"); back.onclick=()=>{ S.archivedView=false; renderChats(); };
    box.append(back);
    if(!archived.length) box.append(h("div",{className:"empty"},h("p",{textContent:"No archived chats."})));
    archived.forEach(c=>box.append(chatRow(c)));
    return;
  }
  if(!S.convs.length){
    const e=h("div",{className:"empty"});
    e.innerHTML='<svg><use href="#logo"/></svg><h3>No chats yet</h3><p>Add friends by their username, then start a DM or make a group.</p>';
    const b=h("button",{className:"btn",textContent: friendIds().length ? "Start a chat" : "Find friends"});
    b.onclick=()=> friendIds().length ? newChatSheet() : setTab("friends");
    e.append(b); box.append(e); return;
  }
  const bdays=friendIds().filter(isBirthdayToday);
  if(bdays.length){
    const names=bdays.map(firstName); const who=names.length===1?names[0]:names.slice(0,-1).join(", ")+" and "+names[names.length-1];
    const bn=h("button",{className:"bday-banner"}, svg("i-cake"), h("span",{textContent:`It's ${who}'s birthday today. Say happy birthday!`}));
    bn.onclick=()=>openDM(bdays[0]);
    box.append(bn);
  }
  active.forEach(c=>box.append(chatRow(c)));
  if(archived.length){
    const n=archived.filter(isUnread).length;
    const a=h("button",{className:"archived-row"}, `Archived (${archived.length})`, n ? h("span",{className:"pill primary",style:"height:24px;padding:0 8px;font-size:.75rem",textContent:n}) : null);
    a.onclick=()=>{ S.archivedView=true; renderChats(); };
    box.append(a);
  }
}
function chatRow(c){
  const me=myMember(c), unread=isUnread(c), count=unreadOf(c), muted=me?.notify==="off";
  const r=h("div",{className:"row"+(unread?" unread":"")+(S.cur===c.id?" on":""),role:"button",tabIndex:0});
  const bottom=h("div",{className:"bottom"}, h("div",{className:"sub"}, ...[].concat(previewOf(c))));
  if(muted){ const ic=svg("i-bell-off"); ic.setAttribute("class","ico"); bottom.append(ic); }
  if(me?.pinned) { const p=svg("i-pin"); p.setAttribute("class","ico"); bottom.append(p); }
  if(S.mentions[c.id] && count) bottom.append(h("span",{className:"count at",textContent:"@"}));
  if(count) bottom.append(h("span",{className:"count"+(muted?" muted":""),textContent: count>99?"99+":count}));
  else if(me?.marked_unread) bottom.append(h("span",{className:"count"+(muted?" muted":""),textContent:" "}));
  r.append(convAvatar(c,52), h("div",{className:"meta"}, h("div",{className:"top"},h("div",{className:"name",textContent:convName(c)}),h("div",{className:"time",textContent:listTime(c.last_message_at||c.created_at)})), bottom));
  const wrap=h("div",{className:"row-swipe"}, h("div",{className:"under"}, svg(unread?"i-check":"i-unread"), unread ? "Mark as read" : "Mark as unread"), r);
  gestures(r,{ onTap:()=>openConv(c.id), onLong:()=>chatRowMenu(c), onSwipe:()=>toggleRead(c) });
  r.onkeydown=(e)=>{ if(e.key==="Enter") openConv(c.id); };
  return wrap;
}
async function updateMyMember(c, patch){
  const m=myMember(c); if(!m) return;
  Object.assign(m, patch); sortConvs(); renderChats(); renderBadges();
  const { error } = await sb.from("bt_members").update(patch).match({ conversation_id:c.id, user_id:S.me.id });
  if(error){ toast("Couldn't save that change"); reloadConvs(); }
}
function toggleRead(c){
  if(isUnread(c)){ S.unread[c.id]=0; S.mentions[c.id]=0; updateMyMember(c,{ last_read_at:new Date().toISOString(), marked_unread:false }); }
  else updateMyMember(c,{ marked_unread:true });
}
function chatRowMenu(c){
  const me=myMember(c);
  openSheet(b=>{
    b.append(h("div",{className:"member"}, convAvatar(c,44), h("div",{className:"nm"},h("b",{textContent:convName(c)}),h("span",{textContent:c.kind==="group"?`${c.bt_members.length} members`:handleOf(dmOther(c))}))));
    const menu=h("div",{className:"menu"});
    menu.append(
      menuBtn(isUnread(c)?"✓  Mark as read":"●  Mark as unread",()=>{ closeSheet(); toggleRead(c); }),
      menuBtn(me?.pinned?"📌  Unpin chat":"📌  Pin to top",()=>{ closeSheet(); updateMyMember(c,{ pinned:!me.pinned }); }),
      menuBtn("🔔  Notifications",()=>notifySheet(c),{ right:{all:"All",mentions:"Mentions",off:"Off"}[me?.notify||"all"] }),
      menuBtn(me?.archived?"📤  Unarchive":"🗄️  Archive",()=>{ closeSheet(); updateMyMember(c,{ archived:!me.archived }); toast(me.archived?"Chat archived":"Chat moved back to Chats"); })
    );
    b.append(menu);
  });
}
function notifySheet(c){
  const me=myMember(c);
  openSheet(b=>{
    b.append(h("h2",{textContent:"Notifications"}), h("p",{className:"sub",textContent:"For "+convName(c)+". Off also mutes the sound and greys out the unread count."}));
    for(const [v,label,desc] of [["all","All messages","Get notified about every message"],["mentions","Only @mentions","Only when someone writes your @username"],["off","Off (muted)","No notifications or sounds"]]){
      const inp=h("input",{type:"radio",name:"notify",checked:(me?.notify||"all")===v});
      const row=h("label",{className:"radio"}, inp, h("span",{}, h("b",{textContent:label}), h("div",{className:"hint",style:"margin:0",textContent:desc})));
      inp.onchange=()=>{ updateMyMember(c,{ notify:v }); setTimeout(closeSheet,150); };
      b.append(row);
    }
  });
}
function renderBadges(){
  if(!S.me) return;
  const unread=S.convs.filter(c=>isUnread(c) && myMember(c)?.notify!=="off").length;
  const reqs=S.friendships.filter(f=>f.status==="pending" && f.addressee===S.me.id).length;
  $("chatsBadge").hidden=!unread; $("chatsBadge").textContent=unread;
  $("friendsBadge").hidden=!reqs; $("friendsBadge").textContent=reqs;
  document.title=(unread?`(${unread}) `:"")+"Beaver Transceiver";
  navigator.setAppBadge?.(unread).catch?.(()=>{});
}
$("chatSearch").addEventListener("input",(e)=>{ S.search=e.target.value; renderChats(); });

/* tabs */
function setTab(t){
  S.tab=t;
  for(const b of document.querySelectorAll(".tabbar button")) b.setAttribute("aria-selected", b.dataset.tab===t);
  $("viewChats").hidden=t!=="chats"; $("viewFriends").hidden=t!=="friends"; $("viewMe").hidden=t!=="me";
  if(t==="me") fillMeForm();
  if(t==="friends") loadSuggestions().catch(()=>{});
}
for(const b of document.querySelectorAll(".tabbar button")) b.onclick=()=>setTab(b.dataset.tab);

/* new chat / group */
function newChatSheet(){
  const ids=friendIds().sort((a,b)=>nameOf(a).localeCompare(nameOf(b)));
  openSheet(b=>{
    b.append(h("h2",{textContent:"New chat"}));
    if(!ids.length){ b.append(h("p",{className:"sub",textContent:"Add a friend first — go to Friends and type their username."})); const g=h("button",{className:"btn",textContent:"Go to Friends"}); g.onclick=()=>{ closeSheet(); setTab("friends"); }; b.append(g); return; }
    b.append(h("div",{className:"menu"}, menuBtn("👥  New group", newGroupSheet), menuBtn("🔗  Join with an invite code", joinCodeSheet)));
    b.append(h("h3",{textContent:"Message a friend"}));
    const list=h("div",{className:"members"});
    for(const uid of ids){
      const r=h("button",{className:"member"}, h("span",{className:"av-wrap"+(isOnline(uid)?" online":"")},avatar(uid,40)), h("div",{className:"nm"},h("b",{textContent:nameOf(uid)}),h("span",{textContent:handleOf(uid)})));
      r.onclick=()=>{ closeSheet(); openDM(uid); };
      list.append(r);
    }
    b.append(list);
  });
}
$("newChatBtn").onclick=newChatSheet;
function friendPicker(excluded=new Set()){
  const box=h("div",{className:"checks"}); const picked=new Set();
  const ids=friendIds().filter(id=>!excluded.has(id)).sort((a,b)=>nameOf(a).localeCompare(nameOf(b)));
  for(const uid of ids){
    const cb=h("input",{type:"checkbox"});
    cb.onchange=()=>{ cb.checked ? picked.add(uid) : picked.delete(uid); box.dispatchEvent(new Event("change")); };
    box.append(h("label",{className:"check"}, avatar(uid,40), h("div",{className:"nm"},h("b",{textContent:nameOf(uid)}),h("span",{textContent:handleOf(uid)})), cb));
  }
  return { el:box, picked, count:ids.length };
}
function newGroupSheet(){
  openSheet(b=>{
    const name=h("input",{className:"input",id:"grpName",maxLength:40,placeholder:"e.g. Dam builders"});
    const pick=friendPicker(); const err=h("div",{className:"err"});
    const go=h("button",{className:"btn",textContent:"Create group",disabled:true});
    const upd=()=>{ go.disabled=!pick.picked.size || !name.value.trim(); go.textContent=pick.picked.size?`Create group with ${pick.picked.size+1} people`:"Create group"; };
    pick.el.addEventListener("change",upd); name.addEventListener("input",upd);
    go.onclick=async()=>{
      go.disabled=true;
      const { data, error } = await sb.rpc("bt_create_group",{ gname:name.value.trim(), member_ids:[...pick.picked] });
      if(error){ err.textContent=friendlyErr(error,"Couldn't create the group."); upd(); return; }
      closeSheet(); await loadConvs(); openConv(data);
    };
    b.append(h("h2",{textContent:"New group"}), h("label",{className:"lbl",htmlFor:"grpName",textContent:"Group name"}), name,
      h("label",{className:"lbl",textContent:"Add friends"}), pick.el, err, go);
    setTimeout(()=>name.focus(),250);
  });
}
function joinCodeSheet(){
  openSheet(b=>{
    const inp=h("input",{className:"input",id:"joinCode",placeholder:"Paste the code or link",autocapitalize:"none",autocorrect:"off"});
    const err=h("div",{className:"err"}); const go=h("button",{className:"btn",textContent:"Continue"});
    go.onclick=()=>{ const v=inp.value.trim(); const code=(v.match(/[?&]join=([a-z0-9]+)/i)||[])[1]||v; if(!/^[a-z0-9]{6,32}$/i.test(code)){ err.textContent="That doesn't look like an invite code."; return; } joinPreview(code.toLowerCase()); };
    b.append(h("h2",{textContent:"Join a group"}), h("p",{className:"sub",textContent:"Paste an invite link or code someone sent you."}), inp, err, go);
    setTimeout(()=>inp.focus(),250);
  });
}
async function joinPreview(code){
  const { data, error } = await sb.rpc("bt_invite_info",{ invite:code });
  if(error || !data){ toast("That invite link doesn't work any more."); return; }
  if(data.joined){ closeSheet(); await loadConvs(); openConv(data.id); return; }
  openSheet(b=>{
    const fake={ id:data.id, kind:"group", avatar_url:data.avatar_url };
    b.append(h("div",{className:"prof"}, convAvatar(fake,88), h("h2",{textContent:data.name}), h("div",{className:"status",textContent:`${data.members} members`}), data.description ? h("p",{className:"bio",textContent:data.description}) : null));
    const go=h("button",{className:"btn",textContent:"Join group"});
    go.onclick=async()=>{ go.disabled=true; const { data:cid, error:e2 } = await sb.rpc("bt_join_with_code",{ invite:code }); if(e2){ go.disabled=false; toast(friendlyErr(e2,"Couldn't join the group")); return; } closeSheet(); await loadConvs(); setTab("chats"); openConv(cid); };
    b.append(go);
  });
}
async function openDM(uid){
  const { data, error } = await sb.rpc("bt_open_dm",{ other:uid });
  if(error){ toast(friendlyErr(error,"Couldn't open the chat")); return; }
  closeSheet();
  if(!S.convs.some(c=>c.id===data)) await loadConvs();
  setTab("chats"); openConv(data);
}

/* ================= chat view ================= */
function canPost(c){ return c.kind==="group" || (isFriend(dmOther(c)) && !S.blocks.has(dmOther(c))); }
function renderChatHead(){
  const c=curConv(); if(!c) return;
  const head=$("chatHead"); head.replaceChildren();
  let subText, on=false;
  if(c.kind==="dm"){ const o=dmOther(c); on=isOnline(o); subText = S.P[o]?.status && !on ? S.P[o].status : presenceText(o); }
  else { const n=c.bt_members.length; const online=c.bt_members.filter(m=>m.user_id!==S.me.id && isOnline(m.user_id)).length; subText = n+" members"+(online?` · ${online} online`:""); }
  head.append(convAvatar(c,40), h("div",{className:"t"}, h("b",{textContent:convName(c)}), h("span",{textContent:subText,className:on?"on":""})));
  head.onclick=()=> c.kind==="dm" ? openProfile(dmOther(c)) : groupSheet(c);
  const ok=canPost(c);
  $("composer").hidden=!ok || S.recording; $("blocked").hidden=ok; $("recorder").hidden=!S.recording;
  if(!ok) $("blocked").textContent = S.blocks.has(dmOther(c)) ? "You blocked "+nameOf(dmOther(c))+". Unblock them from their profile to chat." : "You're not friends with "+nameOf(dmOther(c))+" any more. Add them again to keep chatting.";
  $("input").placeholder = c.kind==="dm" ? "Message "+firstName(dmOther(c)) : "Message "+c.name;
  $("attachBtn").hidden=false;
  $("callBtn").hidden = c.kind!=="dm" || !ok; $("videoBtn").hidden = c.kind!=="dm" || !ok; $("roomBtn").hidden = c.kind!=="group" || (R.joined && R.cid===c.id);
}
$("callBtn").onclick=()=>startCall(false);
$("videoBtn").onclick=()=>startCall(true);
$("roomBtn").onclick=()=>{ const c=curConv(); if(c) joinRoom(c.id); };
async function openConv(id){
  const c=S.convs.find(x=>x.id===id); if(!c) return;
  const changed=S.cur!==id;
  if(changed && S.cur) saveDraft();
  S.cur=id;
  for(const el of ["chatBar","msgsWrap","typing"]) $(el).hidden=false;
  $("chatPlaceholder").hidden=true; $("chatSearchBar").hidden=true;
  $("msgs").className="msgs"+(prefs.wall!=="none"?" wall-"+prefs.wall:"");
  document.body.dataset.view="chat";
  renderChatHead(); renderTyping();
  if(changed){
    S.msgs=[]; S.hasOlder=false; S.detached=false; S.awayCount=0; S.pins=[]; S.revealed=new Set();
    setReply(null); setEditing(null);
    $("input").value=S.drafts[id]||""; autoGrow();
    paintFromCache(id);
    S.pres?.track({ ch:id, typing:false });
    renderPinned();
    if(c.kind==="group") watchRoom(c.id); else unwatchRoom();
    await Promise.all([loadMessages(id).catch(()=>{}), loadPins(id).catch(()=>{})]);
  }
  markRead(); renderChats();
}
function closeChat(){
  if(S.recording) stopRecording(true);
  if(S.cur) saveDraft();
  S.cur=null; document.body.dataset.view="home"; stopTyping(); setReply(null); setEditing(null);
  for(const el of ["chatBar","msgsWrap","typing","composer","blocked","pinnedBar","chatSearchBar","composeCtx","mentionPop","recorder"]) $(el).hidden=true;
  $("chatPlaceholder").hidden=false;
  S.pres?.track({ ch:null, typing:false });
  unwatchRoom(); $("roomBar").hidden=true;
  renderChats();
}
$("backBtn").onclick=closeChat;
let readTimer=null;
function markRead(){
  const c=curConv(); if(!c || !viewing(c.id)) return;
  const m=myMember(c);
  const had = (S.unread[c.id]||0)>0 || m?.marked_unread;
  S.unread[c.id]=0; S.mentions[c.id]=0;
  if(m){ m.last_read_at=new Date().toISOString(); m.marked_unread=false; }
  renderBadges();
  if(had) renderChats();
  clearTimeout(readTimer);
  readTimer=setTimeout(()=>sb.from("bt_members").update({ last_read_at:new Date().toISOString(), last_delivered_at:new Date().toISOString(), marked_unread:false }).match({ conversation_id:c.id, user_id:S.me.id }).then(()=>{}), 500);
}

/* messages */
async function hydrate(rows){
  if(!rows.length) return;
  const ids=rows.map(r=>r.id);
  const polls=rows.filter(r=>r.kind==="poll").map(r=>r.id);
  const replyIds=rows.map(r=>r.reply_to).filter(id=>id && !rows.some(x=>x.id===id) && !S.msgs.some(x=>x.id===id));
  const [rx, pl, pv, rp] = await Promise.all([
    sb.from("bt_reactions").select("message_id,user_id,emoji").in("message_id", ids),
    polls.length ? sb.from("bt_polls").select("*").in("message_id", polls) : { data:[] },
    polls.length ? sb.from("bt_poll_votes").select("poll_id,user_id,option_idx").in("poll_id", polls) : { data:[] },
    replyIds.length ? sb.from("bt_messages").select("id,user_id,content,media_kind,kind").in("id", replyIds) : { data:[] },
  ]);
  const byId=Object.fromEntries(rows.map(r=>[r.id,r]));
  for(const r of rx.data||[]) addRx(byId[r.message_id], r.emoji, r.user_id);
  for(const p of pl.data||[]) S.polls[p.message_id]=p;
  for(const v of pv.data||[]) (S.votes[v.poll_id] ||= []).push(v);
  S.replyCache ||= {};
  for(const r of rp.data||[]) S.replyCache[r.id]=r;
  await ensureProfiles(rows.map(r=>r.user_id));
  await signMedia(rows.filter(r=>r.media_path).map(r=>r.media_path));
}
async function loadMessages(cid, before){
  let q=sb.from("bt_messages").select("*").eq("conversation_id",cid).order("created_at",{ascending:false}).limit(PAGE);
  if(before) q=q.lt("created_at",before);
  const { data, error } = await q;
  if(S.cur!==cid) return;
  if(error){ if(!before) setOffline(true); return; }
  const rows=data.reverse().map(m=>({...m, rx:{}}));
  await hydrate(rows);
  if(S.cur!==cid) return;
  const box=$("msgs"), prevH=box.scrollHeight, prevTop=box.scrollTop;
  const known=new Set(S.msgs.map(m=>m.id));
  if(before) S.msgs=[...rows.filter(r=>!known.has(r.id)), ...S.msgs];
  else { const pend=S.msgs.filter(m=>m._pending||m._failed); const ids=new Set(rows.map(r=>r.id)); S.msgs=[...rows, ...pend.filter(m=>!ids.has(m.id))]; S.detached=false; S.awayCount=0; }
  S.hasOlder = data.length===PAGE;
  paint();
  box.scrollTop = before ? box.scrollHeight-prevH+prevTop : box.scrollHeight;
  updateJump(); scheduleSave();
}
function addRx(m,e,uid){ if(!m) return; m.rx ||= {}; const a=m.rx[e]||(m.rx[e]=[]); if(!a.includes(uid)) a.push(uid); }
function delRx(m,e,uid){ if(!m?.rx?.[e]) return; m.rx[e]=m.rx[e].filter(x=>x!==uid); if(!m.rx[e].length) delete m.rx[e]; }
function renderMsgs(){ const box=$("msgs"); const near=box.scrollHeight-box.scrollTop-box.clientHeight<160; paint(); if(near && !S.detached) box.scrollTop=box.scrollHeight; updateJump(); }
const findMsg = (id) => S.msgs.find(x=>x.id===id) || S.replyCache?.[id];
function seenLabel(c, m){
  const others=c.bt_members.filter(x=>x.user_id!==S.me.id);
  const t=Date.parse(m.created_at);
  const seen=others.filter(x=>Date.parse(x.last_read_at)>=t);
  if(c.kind==="dm") return seen.length ? "Seen" : "Sent";
  if(!seen.length) return "Sent";
  return seen.length===others.length ? "Seen by everyone" : `Seen by ${seen.length}`;
}
function paint(){
  const box=$("msgs"); box.replaceChildren(h("div",{className:"spacer"}));
  const c=curConv(); if(!c) return;
  if(S.hasOlder){ const o=h("button",{className:"older",textContent:"Load earlier messages"}); o.onclick=()=>{ o.disabled=true; loadMessages(S.cur, S.msgs.find(m=>!m._pending)?.created_at); }; box.append(o); }
  if(!S.msgs.length){
    const e=h("div",{className:"empty"});
    e.append(c.kind==="dm" ? avatar(dmOther(c),72) : convAvatar(c,72), h("h3",{textContent:convName(c)}), h("p",{textContent: c.kind==="dm" ? "This is the start of your chat with "+nameOf(dmOther(c))+". Say hi!" : (c.description || "This is the start of the group.")}));
    box.append(e); return;
  }
  const isGroup=c.kind==="group";
  const myName=S.profile.username;
  const lastMine=[...S.msgs].reverse().find(m=>m.user_id===S.me.id && m.kind!=="system" && !m._pending && !m._failed);
  let prevDay="", prev=null;
  const { albumOf, skip } = groupAlbums(S.msgs);
  S.msgs.forEach((m,i)=>{
    if(skip.has(m.id)) return;
    const ts=Date.parse(m.created_at), d=dayStr(ts);
    if(d!==prevDay){ box.append(h("div",{className:"day",textContent:d})); prevDay=d; prev=null; }
    if(m.kind==="system"){ box.append(h("div",{className:"sys",textContent:m.content})); prev=null; return; }
    if(S.blocks.has(m.user_id) && !S.revealed.has(m.id)){
      const bm=h("button",{className:"blocked-msg",textContent:"Message from someone you blocked · tap to show"}); bm.onclick=()=>{ S.revealed.add(m.id); renderMsgs(); };
      box.append(bm); prev=null; return;
    }
    const next=S.msgs[i+1];
    const mine=m.user_id===S.me.id;
    const startRun = !prev || prev.user_id!==m.user_id || ts-Date.parse(prev.created_at)>5*60e3;
    const endRun = !next || next.kind==="system" || next.user_id!==m.user_id || Date.parse(next.created_at)-ts>5*60e3 || dayStr(Date.parse(next.created_at))!==d;
    const row=h("div",{className:"m"+(mine?" mine":"")+(startRun?" first":"")+(m._pending?" pending":"")+(m._failed?" failed":""), "data-id":m.id});
    const jumbo=!m.media_path && !m.reply_to && m.kind==="text" && isJumbo(m.content);
    const mentionsMe=!mine && myName && new RegExp("@"+myName.replace(/\./g,"\\.")+"(?![a-z0-9_.])","i").test(m.content||"");
    const bub=h("div",{className:"bubble"+(jumbo?" jumbo":"")+(mentionsMe?" mention":"")+(m.media_path&&!m.content?" media-only":""),role:"button",tabIndex:0});
    if(isGroup && !mine && startRun){ const w=h("span",{className:"who",textContent:nameOf(m.user_id)}); w.style.color=hashColor(m.user_id); bub.append(w); }
    if(m.reply_to){
      const r=findMsg(m.reply_to);
      const q=h("button",{className:"quote",type:"button"}, h("b",{textContent: r ? (r.user_id===S.me.id?"You":nameOf(r.user_id)) : "Message"}), h("span",{textContent: r ? snippet(r) : "Original message was deleted"}));
      q.onclick=(e)=>{ e.stopPropagation(); if(r) jumpTo(r.id); };
      bub.append(q);
    }
    if(m.kind==="poll") bub.append(pollEl(m));
    else if(albumOf[m.id]) bub.append(albumEl(albumOf[m.id]));
    else if(m.media_kind==="image") bub.append(photoEl(m));
    else if(m.media_kind==="audio") bub.append(voiceEl(m));
    else if(m.media_kind==="file") bub.append(fileEl(m));
    if(m.kind==="text" && m.content && m.media_kind!=="audio" && m.media_kind!=="file"){
      const t=h("div",{className:"text"}); t.innerHTML=fmt(m.content);
      t.querySelectorAll(".spoiler").forEach((el,k)=>{ el.dataset.k=k; if(S.spoilShown.has(m.id+":"+k)) el.classList.add("shown"); });
      bub.append(t);
    }
    const url=m.kind==="text" && !m.media_path && firstUrl(m.content);
    if(url){ const card=linkCard(url); if(card) bub.append(card); }
    bub.append(h("span",{className:"when"}, m.edited_at ? "edited ·" : null, m._failed ? "Not sent · tap to retry" : m._pending ? "Sending…" : timeStr(ts), mine && !m._failed ? tickEl(c,m) : null));
    gestures(bub,{
      onTap:(ev)=>{
        const sp=ev.target.closest(".spoiler");
        if(sp){ const key=m.id+":"+sp.dataset.k; sp.classList.toggle("shown"); sp.classList.contains("shown") ? S.spoilShown.add(key) : S.spoilShown.delete(key); return; }
        if(ev.target.closest("a,.quote,.photo,.play,.opt,.tile,.dl,.speed,pre")) return; if(m._failed) retry(m); },
      onLong:()=>{ if(!m._pending && !m._failed) msgSheet(m); },
      onSwipe: m._pending||m._failed ? null : ()=>{ if(canPost(c)) setReply(m); },
      swipeTarget: row
    });
    bub.onkeydown=(ev)=>{ if(ev.key==="Enter" && !m._pending) msgSheet(m); };
    const ico=h("span",{className:"swipe-ico"}, svg("i-reply"));
    if(!mine && isGroup){
      const slot=h("div",{className:"av-slot"});
      if(endRun){ const a=avatar(m.user_id,30); a.style.cursor="pointer"; a.onclick=()=>openProfile(m.user_id); slot.append(a); }
      row.append(ico, slot);
    } else row.append(ico);
    row.append(bub); box.append(row);
    const keys=Object.keys(m.rx||{}).filter(k=>m.rx[k].length).sort((a,b)=>m.rx[b].length-m.rx[a].length);
    if(keys.length){
      const r=h("div",{className:"rx"+(mine?" mine":"")+(!isGroup&&!mine?" dm":"")});
      for(const k of keys){ const b=h("button",{className:m.rx[k].includes(S.me.id)?"mine":"","aria-label":k+" "+m.rx[k].length},k,h("span",{textContent:m.rx[k].length})); b.onclick=()=>react(m,k); r.append(b); }
      box.append(r);
    }
    if(isGroup && lastMine && m.id===lastMine.id) box.append(h("div",{className:"seen",textContent:seenLabel(c,m)}));
    prev=m;
  });
  if(window.hljs) box.querySelectorAll("pre.code code:not(.nohighlight)").forEach(el=>{ try{ hljs.highlightElement(el); }catch{} });
}
function tickState(c,m){
  if(m._pending) return "pending";
  const others=c.bt_members.filter(x=>x.user_id!==S.me.id); if(!others.length) return "sent";
  const t=Date.parse(m.created_at);
  if(others.every(x=>Date.parse(x.last_read_at)>=t)) return "seen";
  if(others.every(x=>Date.parse(x.last_delivered_at||0)>=t || Date.parse(x.last_read_at)>=t)) return "delivered";
  return "sent";
}
function tickEl(c,m){
  const st=tickState(c,m);
  const s=svg(st==="pending"?"i-clock":st==="sent"?"i-check":"i-check2");
  s.setAttribute("class","tick"+(st==="seen"?" seen":"")); s.setAttribute("aria-label",{pending:"Sending",sent:"Sent",delivered:"Delivered",seen:"Seen"}[st]);
  return s;
}
function groupAlbums(list){
  const albumOf={}, skip=new Set();
  for(let i=0;i<list.length;i++){
    const m=list[i], a=m.media_meta?.album;
    if(!a || m.media_kind!=="image" || skip.has(m.id)) continue;
    const group=[m];
    for(let j=i+1;j<list.length;j++){ const n=list[j]; if(n.media_meta?.album===a && n.user_id===m.user_id){ group.push(n); skip.add(n.id); } else break; }
    if(group.length>1){ group.sort((x,y)=>(x.media_meta.i||0)-(y.media_meta.i||0)); albumOf[m.id]=group; }
  }
  return { albumOf, skip };
}
const signing=new Set();
function needSign(paths){
  const now=Date.now(); const miss=paths.filter(p=>p && !(S.media[p] && S.media[p].exp>now) && !signing.has(p));
  if(!miss.length) return;
  miss.forEach(p=>signing.add(p));
  signMedia(miss).then(()=>{ miss.forEach(p=>signing.delete(p)); if(miss.some(p=>S.media[p])) renderMsgs(); });
}
function albumEl(group){
  const n=group.length;
  const box=h("div",{className:"album "+(n===2?"n2":n===3?"n3":n===4?"n4":"many")});
  const show=group.slice(0, n>6?6:n);
  show.forEach((g,idx)=>{
    const tile=h("div",{className:"tile"}); const url=mediaUrl(g);
    if(url) tile.append(h("img",{src:url,alt:"Photo",loading:"lazy",decoding:"async"}));
    if(idx===show.length-1 && n>show.length) tile.append(h("div",{className:"more",textContent:"+"+(n-show.length)}));
    tile.onclick=(e)=>{ e.stopPropagation(); const u=mediaUrl(g); if(u) openViewer(u); };
    box.append(tile);
  });
  needSign(group.map(g=>g.media_path));
  return box;
}
const sizeStr=(b)=> !b ? "" : b<1024 ? b+" B" : b<1048576 ? (b/1024).toFixed(0)+" KB" : (b/1048576).toFixed(1)+" MB";
function fileEl(m){
  const meta=m.media_meta||{}; const ext=((meta.name||"").split(".").pop()||"").toUpperCase().slice(0,6);
  const dl=h("button",{className:"dl",type:"button","aria-label":"Download "+(meta.name||"file")}, svg("i-download"));
  dl.onclick=async(e)=>{
    e.stopPropagation(); if(m._pending) return;
    const { data, error } = await sb.storage.from("bt-chat-media").createSignedUrl(m.media_path, 600, { download: meta.name || true });
    if(error){ toast("Couldn't get that file"); return; }
    const a=h("a",{href:data.signedUrl,target:"_blank",rel:"noopener"}); document.body.append(a); a.click(); a.remove();
  };
  return h("div",{className:"file"}, h("div",{className:"ficon"}, svg("i-file"), h("span",{textContent:ext})), h("div",{className:"fmeta"}, h("b",{textContent:meta.name||"File"}), h("span",{textContent:sizeStr(meta.size)+(m._pending?" · uploading…":"")})), dl);
}
function snippet(r){
  if(r.kind==="poll") return "Poll: "+stripEmoji(r.content).replace(/^Poll: /,"");
  if(r.media_kind==="image") return r.content ? "Photo: "+r.content : "Photo";
  if(r.media_kind==="audio") return "Voice message";
  if(r.media_kind==="file") return "File: "+(r.media_meta?.name||"file");
  return (r.content||"").replace(/\s+/g," ").slice(0,120);
}

/* media */
async function signMedia(paths){
  const now=Date.now();
  const need=[...new Set(paths.filter(p=>p && !(S.media[p] && S.media[p].exp>now+60e3)))];
  if(!need.length) return;
  const { data } = await sb.storage.from("bt-chat-media").createSignedUrls(need, 3600);
  for(const d of data||[]) if(d.signedUrl) S.media[d.path]={ url:d.signedUrl, exp:now+3600e3 };
}
const mediaUrl = (m) => m._local || S.media[m.media_path]?.url;
function photoEl(m){
  const meta=m.media_meta||{}; const w=meta.w||4, hh=meta.h||3;
  const box=h("div",{className:"photo"}); box.style.aspectRatio=`${w}/${hh}`; box.style.width=Math.min(300, w>hh?300:Math.round(300*w/hh))+"px";
  const url=mediaUrl(m);
  if(url){ const img=h("img",{src:url,alt:"Photo",loading:"lazy",decoding:"async"}); box.append(img); box.onclick=(e)=>{ e.stopPropagation(); openViewer(url); }; }
  else needSign([m.media_path]);
  return box;
}
function openViewer(url){ $("viewerImg").src=url; $("viewer").hidden=false; }
$("viewerClose").onclick=()=>{ $("viewer").hidden=true; $("viewerImg").src=""; };
$("viewer").onclick=(e)=>{ if(e.target.id==="viewer"){ $("viewer").hidden=true; $("viewerImg").src=""; } };
let audioEl=null, audioMsg=null, voiceRate=1;
function voiceEl(m){
  const dur=m.media_meta?.d||0;
  const playing=audioMsg===m.id && audioEl && !audioEl.paused;
  const btn=h("button",{className:"play",type:"button","aria-label":playing?"Pause":"Play voice message"}, svg(playing?"i-pause":"i-play"));
  const bar=h("i"); const track=h("div",{className:"track"},bar);
  const t=h("span",{className:"dur",textContent:durStr(dur)});
  if(audioMsg===m.id && audioEl){ bar.style.width=(audioEl.currentTime/(audioEl.duration||dur||1)*100)+"%"; t.textContent=durStr(audioEl.currentTime||dur); }
  btn.onclick=async(e)=>{
    e.stopPropagation();
    if(audioMsg===m.id && audioEl){ if(audioEl.paused) audioEl.play().catch(()=>toast("Couldn't play that voice message")); else audioEl.pause(); return; }
    audioEl?.pause();
    if(!mediaUrl(m)) await signMedia([m.media_path]);
    const url=mediaUrl(m); if(!url){ toast("Couldn't load that voice message"); return; }
    audioEl=new Audio(url); audioMsg=m.id; audioEl.playbackRate=voiceRate;
    audioEl.ontimeupdate=()=>{ const row=document.querySelector(`.m[data-id="${m.id}"]`); if(!row) return; const b=row.querySelector(".track i"), d=row.querySelector(".dur"); if(b) b.style.width=(audioEl.currentTime/(audioEl.duration&&isFinite(audioEl.duration)?audioEl.duration:dur||1)*100)+"%"; if(d) d.textContent=durStr(audioEl.currentTime); };
    audioEl.onplay=audioEl.onpause=()=>renderMsgs();
    audioEl.onended=()=>{ audioMsg=null; renderMsgs(); };
    audioEl.onerror=()=>{ toast("This device can't play that voice message"); audioMsg=null; renderMsgs(); };
    audioEl.play().catch(()=>toast("Couldn't play that voice message"));
  };
  const sp=h("button",{className:"speed",type:"button","aria-label":"Playback speed",textContent:voiceRate+"×"});
  sp.onclick=(e)=>{ e.stopPropagation(); voiceRate = voiceRate===1 ? 1.5 : voiceRate===1.5 ? 2 : 1; if(audioEl) audioEl.playbackRate=voiceRate; renderMsgs(); };
  return h("div",{className:"voice"}, btn, track, t, sp);
}

/* link previews */
const lpCache=new Map(Object.entries(store("bt-lp")||{}));
const lpLoading=new Set();
function linkCard(url){
  const d=lpCache.get(url);
  if(d===undefined){
    if(!lpLoading.has(url)){
      lpLoading.add(url);
      sb.functions.invoke("bt-link-preview",{ body:{ url } }).then(({ data, error })=>{
        lpCache.set(url, (!error && data && data.title) ? data : null);
        const obj=Object.fromEntries([...lpCache].slice(-150)); store("bt-lp", obj);
        renderMsgs();
      }).catch(()=>{});
    }
    return null;
  }
  if(!d) return null;
  const a=h("a",{className:"lp",href:d.url||url,target:"_blank",rel:"noopener noreferrer"});
  if(d.image) a.append(h("img",{src:d.image,alt:"",loading:"lazy",referrerPolicy:"no-referrer",onerror:function(){ this.remove(); }}));
  a.append(h("div",{}, h("small",{textContent:d.site||""}), h("b",{textContent:d.title}), d.description ? h("span",{textContent:d.description}) : null));
  return a;
}

/* polls */
function pollEl(m){
  const p=S.polls[m.id];
  if(!p){ sb.from("bt_polls").select("*").eq("message_id",m.id).maybeSingle().then(({data})=>{ if(data){ S.polls[m.id]=data; renderMsgs(); } }); return h("div",{className:"poll"},h("div",{className:"q"},svg("i-poll"),stripEmoji(m.content).replace(/^Poll: /,""))); }
  const votes=S.votes[m.id]||[];
  const voters=new Set(votes.map(v=>v.user_id));
  const mine=new Set(votes.filter(v=>v.user_id===S.me.id).map(v=>v.option_idx));
  const box=h("div",{className:"poll"}, h("div",{className:"q"}, svg("i-poll"), p.question));
  p.options.forEach((opt,i)=>{
    const n=votes.filter(v=>v.option_idx===i).length, pct=voters.size?Math.round(n/voters.size*100):0;
    const bar=h("i"); bar.style.width=(mine.size?pct:0)+"%";
    const b=h("button",{className:"opt"+(mine.has(i)?" voted":""),type:"button"}, bar, h("span",{}, h("b",{textContent:opt}), mine.size ? h("em",{textContent:`${n} · ${pct}%`}) : null));
    b.onclick=(e)=>{ e.stopPropagation(); vote(p,i); };
    box.append(b);
  });
  box.append(h("div",{className:"meta",textContent:`${voters.size} vote${voters.size===1?"":"s"}${p.multi?" · pick as many as you like":""}`}));
  return box;
}
async function vote(p, idx){
  const list=S.votes[p.message_id] ||= [];
  const mineIdx=list.filter(v=>v.user_id===S.me.id).map(v=>v.option_idx);
  if(mineIdx.includes(idx)){
    S.votes[p.message_id]=list.filter(v=>!(v.user_id===S.me.id && v.option_idx===idx)); renderMsgs();
    await sb.from("bt_poll_votes").delete().match({ poll_id:p.message_id, user_id:S.me.id, option_idx:idx });
    return;
  }
  if(!p.multi && mineIdx.length){
    S.votes[p.message_id]=list.filter(v=>v.user_id!==S.me.id);
    await sb.from("bt_poll_votes").delete().match({ poll_id:p.message_id, user_id:S.me.id });
  }
  S.votes[p.message_id].push({ poll_id:p.message_id, user_id:S.me.id, option_idx:idx }); renderMsgs();
  const { error } = await sb.from("bt_poll_votes").insert({ poll_id:p.message_id, conversation_id:p.conversation_id, user_id:S.me.id, option_idx:idx });
  if(error && !/duplicate/i.test(error.message)){ toast("Couldn't save your vote"); S.votes[p.message_id]=S.votes[p.message_id].filter(v=>!(v.user_id===S.me.id && v.option_idx===idx)); renderMsgs(); }
}
function pollSheet(){
  const c=curConv(); if(!c) return;
  openSheet(b=>{
    const q=h("input",{className:"input",id:"pollQ",maxLength:200,placeholder:"Ask a question"});
    const opts=h("div",{style:"display:flex;flex-direction:column;gap:8px"});
    const addOpt=(v="")=>{ if(opts.children.length>=10) return; opts.append(h("input",{className:"input",maxLength:80,placeholder:"Option "+(opts.children.length+1),value:v})); };
    addOpt(); addOpt();
    const more=h("button",{className:"btn ghost",type:"button",textContent:"+ Add option"}); more.onclick=()=>{ addOpt(); if(opts.children.length>=10) more.hidden=true; };
    const multi=h("input",{type:"checkbox"});
    const err=h("div",{className:"err"});
    const go=h("button",{className:"btn",textContent:"Send poll"});
    go.onclick=async()=>{
      const options=[...opts.children].map(i=>i.value.trim()).filter(Boolean);
      if(!q.value.trim()){ err.textContent="Write a question."; return; }
      if(options.length<2){ err.textContent="Add at least two options."; return; }
      go.disabled=true;
      const { error } = await sb.rpc("bt_create_poll",{ cid:c.id, question:q.value.trim(), options, multi:multi.checked });
      go.disabled=false;
      if(error){ err.textContent=friendlyErr(error,"Couldn't create the poll."); return; }
      closeSheet();
    };
    b.append(h("h2",{textContent:"New poll"}), h("label",{className:"lbl",htmlFor:"pollQ",textContent:"Question"}), q, h("label",{className:"lbl",textContent:"Options"}), opts, more,
      h("label",{className:"toggle"}, h("span",{},"Allow multiple answers"), multi), err, go);
    setTimeout(()=>q.focus(),250);
  });
}

/* message actions */
function msgSheet(m){
  const c=curConv(); if(!c) return;
  const mine=m.user_id===S.me.id;
  openSheet(b=>{
    b.append(h("p",{className:"sub",textContent:(mine?"You":nameOf(m.user_id))+" · "+dayStr(Date.parse(m.created_at))+" "+timeStr(Date.parse(m.created_at))+(m.edited_at?" · edited":"")}));
    const row=h("div",{className:"emoji-row"});
    for(const e of QUICK){ const btn=h("button",{textContent:e,className:(m.rx?.[e]||[]).includes(S.me.id)?"mine":"","aria-label":"React "+e}); btn.onclick=()=>{ closeSheet(); react(m,e); }; row.append(btn); }
    b.append(row);
    const moreBtn=h("button",{className:"btn ghost",textContent:"More reactions…",style:"margin-top:0"});
    moreBtn.onclick=()=>emojiSheet(m);
    b.append(moreBtn);
    const menu=h("div",{className:"menu"});
    if(canPost(c)) menu.append(menuBtn("↩️  Reply",()=>{ closeSheet(); setReply(m); }));
    if(m.content && m.media_kind!=="audio") menu.append(menuBtn("📋  Copy text",()=>{ copyText(m.content); closeSheet(); }));
    if(mine && m.kind==="text" && m.media_kind!=="audio") menu.append(menuBtn("✏️  Edit",()=>{ closeSheet(); setEditing(m); }));
    const pinned=S.pins.some(p=>p.message_id===m.id);
    if(m.kind==="text") menu.append(menuBtn(pinned?"📌  Unpin":"📌  Pin message",async()=>{ closeSheet(); await togglePin(m, pinned); }));
    if(!mine) menu.append(menuBtn("👤  View "+firstName(m.user_id)+"'s profile",()=>openProfile(m.user_id)));
    if(!mine && m.kind!=="system") menu.append(menuBtn("🚩  Report message",()=>reportSheet({ message:m }),{ danger:true }));
    if(mine && (m.kind==="text" || m.kind==="poll")){
      const del=menuBtn("🗑️  Delete for everyone",null,{ danger:true });
      del.onclick=()=>{ del.querySelector(".lbl-t").textContent="Tap again to delete"; del.onclick=async()=>{
        closeSheet();
        const group = m.media_meta?.album ? S.msgs.filter(x=>x.media_meta?.album===m.media_meta.album && x.user_id===S.me.id) : [m];
        const ids=group.map(x=>x.id);
        const { error } = await sb.from("bt_messages").delete().in("id",ids);
        if(error) toast("Couldn't delete that message");
        else { S.msgs=S.msgs.filter(x=>!ids.includes(x.id)); renderMsgs(); const paths=group.map(x=>x.media_path).filter(Boolean); if(paths.length) sb.storage.from("bt-chat-media").remove(paths).then(()=>{}); }
      }; };
      menu.append(del);
    }
    b.append(menu);
  });
}
function emojiSheet(m){
  openSheet(b=>{
    b.append(h("h2",{textContent:"React"}));
    const g=h("div",{className:"emoji-grid"});
    for(const e of ALL_EMOJI){ const btn=h("button",{textContent:e,"aria-label":"React "+e}); btn.onclick=()=>{ closeSheet(); react(m,e); }; g.append(btn); }
    b.append(g);
  });
}
async function react(m,e){
  const mine=(m.rx?.[e]||[]).includes(S.me.id);
  mine ? delRx(m,e,S.me.id) : addRx(m,e,S.me.id); renderMsgs();
  const { error } = mine
    ? await sb.from("bt_reactions").delete().match({ message_id:m.id, user_id:S.me.id, emoji:e })
    : await sb.from("bt_reactions").insert({ message_id:m.id, user_id:S.me.id, conversation_id:m.conversation_id, emoji:e });
  if(error && !/duplicate/i.test(error.message)){ mine ? addRx(m,e,S.me.id) : delRx(m,e,S.me.id); renderMsgs(); toast("Couldn't react. Try again."); }
}

/* pins */
async function loadPins(cid){
  const { data } = await sb.from("bt_pins").select("*").eq("conversation_id",cid).order("created_at",{ascending:false});
  if(S.cur!==cid) return;
  S.pins=data||[];
  const need=S.pins.map(p=>p.message_id).filter(id=>!findMsg(id));
  if(need.length){ const { data:ms } = await sb.from("bt_messages").select("id,user_id,content,media_kind,kind,created_at").in("id",need); S.replyCache ||= {}; for(const x of ms||[]) S.replyCache[x.id]=x; }
  renderPinned();
}
function renderPinned(){
  const bar=$("pinnedBar");
  const p=S.pins[0];
  if(!S.cur || !p){ bar.hidden=true; return; }
  const m=findMsg(p.message_id);
  bar.replaceChildren(svg("i-pin"), h("div",{className:"t"}, h("small",{textContent: S.pins.length>1 ? `Pinned · ${S.pins.length}` : "Pinned"}), h("span",{textContent: m ? snippet(m) : "Pinned message"})));
  bar.hidden=false;
  bar.onclick=()=> S.pins.length>1 ? pinsSheet() : jumpTo(p.message_id);
}
function pinsSheet(){
  openSheet(b=>{
    b.append(h("h2",{textContent:"Pinned messages"}));
    if(!S.pins.length) b.append(h("p",{className:"sub",textContent:"Nothing pinned yet. Long-press a message and choose Pin."}));
    for(const p of S.pins){
      const m=findMsg(p.message_id);
      const r=h("button",{className:"result"}, h("small",{textContent:(m?nameOf(m.user_id):"")+" · pinned by "+nameOf(p.pinned_by)}), m ? snippet(m) : "Message");
      r.onclick=()=>{ closeSheet(); jumpTo(p.message_id); };
      b.append(r);
    }
  });
}
async function togglePin(m, pinned){
  if(pinned){
    S.pins=S.pins.filter(p=>p.message_id!==m.id); renderPinned();
    const { error } = await sb.from("bt_pins").delete().match({ conversation_id:m.conversation_id, message_id:m.id });
    if(error) toast("Couldn't unpin");
  } else {
    S.pins.unshift({ conversation_id:m.conversation_id, message_id:m.id, pinned_by:S.me.id, created_at:new Date().toISOString() }); renderPinned();
    const { error } = await sb.from("bt_pins").insert({ conversation_id:m.conversation_id, message_id:m.id, pinned_by:S.me.id });
    if(error && !/duplicate/i.test(error.message)) toast("Couldn't pin that message"); else toast("Message pinned");
  }
}

/* search + jump */
$("chatSearchBtn").onclick=()=>{ $("chatSearchBar").hidden=false; $("chatBar").hidden=true; $("chatSearchIn").value=""; $("chatSearchIn").focus(); };
$("chatSearchClose").onclick=()=>{ $("chatSearchBar").hidden=true; $("chatBar").hidden=false; };
$("chatSearchBar").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const q=$("chatSearchIn").value.trim(); if(q.length<2){ toast("Type at least 2 characters"); return; }
  $("chatSearchIn").blur();
  const { data, error } = await sb.from("bt_messages").select("id,user_id,content,created_at,media_kind,kind").eq("conversation_id",S.cur).neq("kind","system")
    .ilike("content", "%"+q.replace(/[%_\\]/g, m=>"\\"+m)+"%").order("created_at",{ascending:false}).limit(50);
  if(error){ toast("Search didn't work. Try again."); return; }
  await ensureProfiles((data||[]).map(r=>r.user_id));
  openSheet(b=>{
    b.append(h("h2",{textContent:`Results for “${q}”`}), h("p",{className:"sub",textContent:`${data.length}${data.length===50?"+":""} message${data.length===1?"":"s"}`}));
    const re=new RegExp("("+q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig");
    for(const r of data){
      const line=h("span"); line.innerHTML=esc(snippet(r)).replace(re,"<mark>$1</mark>");
      const btn=h("button",{className:"result"}, h("small",{textContent:(r.user_id===S.me.id?"You":nameOf(r.user_id))+" · "+dayStr(Date.parse(r.created_at))+" "+timeStr(Date.parse(r.created_at))}), line);
      btn.onclick=()=>{ closeSheet(); $("chatSearchBar").hidden=true; $("chatBar").hidden=false; jumpTo(r.id); };
      b.append(btn);
    }
  });
});
async function jumpTo(id){
  let el=document.querySelector(`.m[data-id="${id}"] .bubble`);
  if(!el){
    const cid=S.cur;
    const { data:t } = await sb.from("bt_messages").select("created_at").eq("id",id).maybeSingle();
    if(!t){ toast("That message was deleted"); return; }
    const [before, after] = await Promise.all([
      sb.from("bt_messages").select("*").eq("conversation_id",cid).lt("created_at",t.created_at).order("created_at",{ascending:false}).limit(20),
      sb.from("bt_messages").select("*").eq("conversation_id",cid).gte("created_at",t.created_at).order("created_at",{ascending:true}).limit(120),
    ]);
    if(S.cur!==cid) return;
    const rows=[...(before.data||[]).reverse(), ...(after.data||[])].map(m=>({...m, rx:{}}));
    await hydrate(rows);
    S.msgs=rows; S.hasOlder=(before.data||[]).length===20; S.detached=(after.data||[]).length===120; S.awayCount=0;
    paint(); updateJump();
    el=document.querySelector(`.m[data-id="${id}"] .bubble`);
  }
  if(el){ el.scrollIntoView({ block:"center", behavior:"smooth" }); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }
}
function updateJump(){
  const box=$("msgs"); const far=box.scrollHeight-box.scrollTop-box.clientHeight>320;
  $("jumpBtn").hidden=!(far || S.detached);
  $("jumpCount").hidden=!S.awayCount; $("jumpCount").textContent=S.awayCount;
}
$("msgs").addEventListener("scroll",()=>{ updateJump(); const box=$("msgs"); if(!S.detached && box.scrollHeight-box.scrollTop-box.clientHeight<80) S.awayCount=0; },{ passive:true });
$("jumpBtn").onclick=async()=>{
  if(S.detached){ await loadMessages(S.cur); }
  const box=$("msgs"); box.scrollTo({ top:box.scrollHeight, behavior:"smooth" }); S.awayCount=0; updateJump();
};

/* ================= composer ================= */
const input=$("input");
function setReply(m){
  S.reply=m||null; if(m) S.editing=null;
  renderCtx(); if(m) input.focus();
}
function setEditing(m){
  if(S.editing && !m){ input.value=S.drafts[S.cur]||""; }
  S.editing=m||null; if(m){ S.reply=null; input.value=m.content; }
  renderCtx(); autoGrow(); if(m) input.focus();
}
function renderCtx(){
  const box=$("composeCtx");
  const m=S.editing||S.reply;
  if(!m || !S.cur){ box.hidden=true; return; }
  const x=h("button",{className:"icon-btn",type:"button","aria-label":"Cancel"}, svg("i-x")); x.onclick=()=> S.editing ? setEditing(null) : setReply(null);
  box.replaceChildren(h("div",{className:"t"}, h("small",{textContent: S.editing ? "Editing message" : "Replying to "+(m.user_id===S.me.id?"yourself":nameOf(m.user_id))}), h("span",{textContent:snippet(m)})), x);
  box.hidden=false;
}
function autoGrow(){
  input.style.height="auto"; input.style.height=Math.min(input.scrollHeight,140)+"px";
  const hasText=!!input.value.trim();
  $("sendBtn").replaceChildren(svg(hasText||S.editing?"i-send":"i-mic"));
  $("sendBtn").setAttribute("aria-label", hasText||S.editing ? "Send" : "Record voice message");
}
let draftTimer=null;
function saveDraft(){
  if(!S.cur || S.editing) return;
  const v=input.value; if(v.trim()) S.drafts[S.cur]=v; else delete S.drafts[S.cur];
  store(ukey("bt-drafts"), S.drafts);
}
input.addEventListener("input",()=>{
  autoGrow(); mentionCheck();
  clearTimeout(draftTimer); draftTimer=setTimeout(saveDraft,500);
  if(!S.typingOn && input.value.trim()){ S.typingOn=true; S.pres?.track({ ch:S.cur, typing:true }); }
  clearTimeout(S.typingTimer); S.typingTimer=setTimeout(stopTyping,3000);
});
function stopTyping(){ clearTimeout(S.typingTimer); if(S.typingOn){ S.typingOn=false; S.pres?.track({ ch:S.cur, typing:false }); } }
input.addEventListener("keydown",(e)=>{
  const pop=$("mentionPop");
  if(!pop.hidden && (e.key==="Enter"||e.key==="Tab")){ const first=pop.querySelector("button"); if(first){ e.preventDefault(); first.click(); return; } }
  if(e.key==="Escape"){ pop.hidden=true; if(S.editing) setEditing(null); else if(S.reply) setReply(null); }
  if(e.key==="Enter" && !e.shiftKey && !e.isComposing && matchMedia("(pointer:fine)").matches){ e.preventDefault(); $("composer").requestSubmit(); }
});
/* @mention autocomplete */
function mentionCheck(){
  const pop=$("mentionPop"); const c=curConv();
  if(!c || c.kind!=="group"){ pop.hidden=true; return; }
  const before=input.value.slice(0,input.selectionStart);
  const m=before.match(/(^|\s)@([a-z0-9_.]{0,20})$/i);
  if(!m){ pop.hidden=true; return; }
  const q=m[2].toLowerCase();
  const cands=c.bt_members.map(x=>x.user_id).filter(id=>id!==S.me.id && S.P[id] && (S.P[id].username.startsWith(q) || nameOf(id).toLowerCase().includes(q))).slice(0,6);
  if(!cands.length){ pop.hidden=true; return; }
  pop.replaceChildren(...cands.map(id=>{
    const b=h("button",{type:"button"}, avatar(id,28), h("b",{textContent:nameOf(id)}), h("span",{textContent:"@"+S.P[id].username}));
    b.onmousedown=(e)=>e.preventDefault();
    b.onclick=()=>{ const start=input.selectionStart-m[2].length; input.value=input.value.slice(0,start)+S.P[id].username+" "+input.value.slice(input.selectionStart); const pos=start+S.P[id].username.length+1; input.setSelectionRange(pos,pos); pop.hidden=true; input.focus(); autoGrow(); };
    return b;
  }));
  pop.hidden=false;
}
$("composer").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const text=input.value.trim();
  if(S.editing){
    const m=S.editing; if(!text){ toast("A message can't be empty"); return; }
    setEditing(null); input.value=S.drafts[S.cur]||""; autoGrow();
    if(text===m.content) return;
    const old=m.content; m.content=text; m.edited_at=new Date().toISOString(); renderMsgs();
    const { error } = await sb.from("bt_messages").update({ content:text }).eq("id",m.id);
    if(error){ m.content=old; m.edited_at=null; renderMsgs(); toast(friendlyErr(error,"Couldn't edit that message")); }
    return;
  }
  if(!text){ startRecording(); return; }
  if(!S.cur) return;
  input.value=""; delete S.drafts[S.cur]; store(ukey("bt-drafts"), S.drafts); autoGrow(); stopTyping(); input.focus(); $("mentionPop").hidden=true;
  const m={ id:uuid(), conversation_id:S.cur, user_id:S.me.id, kind:"text", content:text, reply_to:S.reply?.id||null, created_at:new Date().toISOString(), rx:{}, _pending:true };
  setReply(null);
  S.msgs.push(m); if(S.detached){ await loadMessages(S.cur); S.msgs.push(m); }
  paint(); $("msgs").scrollTop=$("msgs").scrollHeight;
  bumpConv(m); send(m);
});
async function send(m){
  const row={ id:m.id, conversation_id:m.conversation_id, user_id:m.user_id, content:m.content };
  if(m.reply_to) row.reply_to=m.reply_to;
  if(m.media_path){ row.media_path=m.media_path; row.media_kind=m.media_kind; row.media_meta=m.media_meta; }
  const { error } = await sb.from("bt_messages").insert(row);
  if(error && /duplicate key/i.test(error.message)){ m._pending=false; dropOutbox(m.id); renderMsgs(); return; }
  if(error && isNetErr(error) && !m.media_path){ addOutbox(m); setOffline(true); renderMsgs(); return; }
  m._pending=false;
  if(error){ m._failed=true; toast(friendlyErr(error,"Message didn't send. Tap it to retry.")); }
  else dropOutbox(m.id);
  renderMsgs();
}
async function retry(m){
  m._failed=false; m._pending=true; renderMsgs();
  if(m._blob && !m._uploaded){
    const { error } = await sb.storage.from("bt-chat-media").upload(m.media_path, m._blob, { contentType:m._ctype, cacheControl:"31536000" });
    if(error && !/exists|duplicate/i.test(error.message)){ m._pending=false; m._failed=true; renderMsgs(); toast("Upload failed again. Check your connection."); return; }
    m._uploaded=true;
  }
  send(m);
}
function bumpConv(m){
  const c=S.convs.find(x=>x.id===m.conversation_id); if(!c) return reloadConvs();
  c.last_message_at=m.created_at;
  c.last_message_preview = m.media_kind==="audio" ? "Voice message" : (m.content||"").replace(/\s+/g," ").slice(0,90);
  c.last_message_user = m.kind==="system" ? null : m.user_id;
  sortConvs(); renderChats(); renderBadges();
}
/* outbox (offline sending) */
function addOutbox(m){ if(!S.outbox.some(x=>x.id===m.id)){ S.outbox.push({ id:m.id, conversation_id:m.conversation_id, user_id:m.user_id, kind:"text", content:m.content, reply_to:m.reply_to, created_at:m.created_at }); store(ukey("bt-outbox"), S.outbox); } }
function dropOutbox(id){ const n=S.outbox.length; S.outbox=S.outbox.filter(x=>x.id!==id); if(S.outbox.length!==n) store(ukey("bt-outbox"), S.outbox); }
async function flushOutbox(){
  for(const o of [...S.outbox]){
    const { error } = await sb.from("bt_messages").insert({ id:o.id, conversation_id:o.conversation_id, user_id:o.user_id, content:o.content, ...(o.reply_to?{reply_to:o.reply_to}:{}) });
    if(!error || /duplicate key/i.test(error.message)){ dropOutbox(o.id); const m=S.msgs.find(x=>x.id===o.id); if(m){ m._pending=false; } }
    else if(isNetErr(error)) return;
    else { dropOutbox(o.id); const m=S.msgs.find(x=>x.id===o.id); if(m){ m._pending=false; m._failed=true; } }
  }
  if(S.cur) renderMsgs();
}

/* attachments */
$("attachBtn").onclick=()=>{
  const c=curConv(); if(!c) return;
  openSheet(b=>{
    b.append(h("h2",{textContent:"Send…"}));
    const menu=h("div",{className:"menu"});
    menu.append(menuBtn("📷  Photos",()=>{ closeSheet(); $("photoFile").click(); }));
    menu.append(menuBtn("🎤  Voice message",()=>{ closeSheet(); startRecording(); }));
    menu.append(menuBtn("📎  File",()=>{ closeSheet(); $("fileFile").click(); }));
    if(c.kind==="group") menu.append(menuBtn("📊  Poll",pollSheet));
    b.append(menu);
  });
};
$("photoFile").addEventListener("change", async ()=>{
  const files=[...$("photoFile").files].filter(f=>f.type.startsWith("image/")).slice(0,10); $("photoFile").value="";
  if(!files.length || !S.cur) return;
  if(files.length>1) return albumSheet(files);
  const file=files[0];
  if(!file.type.startsWith("image/")){ toast("Pick an image file"); return; }
  let img;
  try{ img=await resizeImage(file, 1600); }catch{ toast("Couldn't open that picture"); return; }
  const local=URL.createObjectURL(img.blob);
  const cid=S.cur;
  openSheet(b=>{
    const prev=h("img",{src:local,alt:"",style:"display:block;max-width:100%;max-height:50dvh;margin:0 auto;border-radius:14px"});
    const cap=h("input",{className:"input",id:"photoCap",maxLength:2000,placeholder:"Add a caption (optional)",value:input.value.trim()});
    const go=h("button",{className:"btn",textContent:"Send photo"});
    go.onclick=async()=>{
      closeSheet();
      const caption=cap.value.trim();
      if(caption===input.value.trim()){ input.value=""; delete S.drafts[cid]; store(ukey("bt-drafts"), S.drafts); autoGrow(); }
      const id=uuid(), ext=img.blob.type==="image/webp"?"webp":"jpg";
      const m={ id, conversation_id:cid, user_id:S.me.id, kind:"text", content:caption, reply_to:S.reply?.id||null, media_path:`${cid}/${S.me.id}/${id}.${ext}`, media_kind:"image", media_meta:{ w:img.w, h:img.h }, created_at:new Date().toISOString(), rx:{}, _pending:true, _local:local, _blob:img.blob, _ctype:img.blob.type };
      setReply(null);
      if(S.cur===cid){ S.msgs.push(m); paint(); $("msgs").scrollTop=$("msgs").scrollHeight; }
      const { error } = await sb.storage.from("bt-chat-media").upload(m.media_path, img.blob, { contentType:img.blob.type, cacheControl:"31536000" });
      if(error){ m._pending=false; m._failed=true; renderMsgs(); toast(isNetErr(error)?"You're offline — photos send when you're back online. Tap to retry.":"Couldn't upload that photo"); return; }
      m._uploaded=true; S.media[m.media_path]={ url:local, exp:Date.now()+3600e3 };
      bumpConv(m); send(m);
    };
    b.append(h("h2",{textContent:"Send photo"}), prev, h("label",{className:"lbl",htmlFor:"photoCap",textContent:"Caption"}), cap, go);
  });
});
async function albumSheet(files){
  toast("Preparing photos…");
  const imgs=[]; for(const f of files){ try{ imgs.push(await resizeImage(f,1600)); }catch{} }
  if(!imgs.length){ toast("Couldn't open those pictures"); return; }
  const cid=S.cur; const urls=imgs.map(i=>URL.createObjectURL(i.blob));
  openSheet(b=>{
    const n=imgs.length;
    const grid=h("div",{className:"album "+(n===2?"n2":n===3?"n3":n===4?"n4":"many"),style:"margin:0 auto;width:100%"});
    urls.forEach(u=>grid.append(h("div",{className:"tile"},h("img",{src:u,alt:""}))));
    const cap=h("input",{className:"input",id:"albumCap",maxLength:2000,placeholder:"Add a caption (optional)"});
    const go=h("button",{className:"btn",textContent:`Send ${n} photos`});
    go.onclick=async()=>{
      closeSheet();
      const album=uuid(), base=Date.now(), reply=S.reply?.id||null; setReply(null);
      const msgs=imgs.map((img,i)=>{ const id=uuid(), ext=img.blob.type==="image/webp"?"webp":"jpg";
        return { id, conversation_id:cid, user_id:S.me.id, kind:"text", content:i===0?cap.value.trim():"", reply_to:i===0?reply:null, media_path:`${cid}/${S.me.id}/${id}.${ext}`, media_kind:"image", media_meta:{ w:img.w, h:img.h, album, i, n }, created_at:new Date(base+i).toISOString(), rx:{}, _pending:true, _local:urls[i], _blob:img.blob, _ctype:img.blob.type }; });
      if(S.cur===cid){ S.msgs.push(...msgs); paint(); $("msgs").scrollTop=$("msgs").scrollHeight; }
      for(const m of msgs){
        const { error } = await sb.storage.from("bt-chat-media").upload(m.media_path, m._blob, { contentType:m._ctype, cacheControl:"31536000" });
        if(error){ m._pending=false; m._failed=true; continue; }
        m._uploaded=true; S.media[m.media_path]={ url:m._local, exp:Date.now()+3600e3 };
        await send(m);
      }
      bumpConv(msgs[0]); renderMsgs();
    };
    b.append(h("h2",{textContent:"Send photos"}), grid, h("label",{className:"lbl",htmlFor:"albumCap",textContent:"Caption"}), cap, go);
  });
}
$("fileFile").addEventListener("change", ()=>{ const f=$("fileFile").files[0]; $("fileFile").value=""; if(f) sendFile(f); });
async function sendFile(file){
  const cid=S.cur; if(!cid) return;
  if(file.size>25*1024*1024){ toast("Files can be up to 25 MB"); return; }
  const id=uuid(); const ext=((file.name.match(/\.([a-z0-9]{1,10})$/i)||[])[1]||"bin").toLowerCase();
  const ctype = ext==="pdf" ? "application/pdf" : "application/octet-stream";
  const name=file.name.replace(/[\u0000-\u001f]/g,"").slice(0,120) || "file."+ext;
  const m={ id, conversation_id:cid, user_id:S.me.id, kind:"text", content:"File: "+name, reply_to:S.reply?.id||null, media_path:`${cid}/${S.me.id}/${id}.${ext}`, media_kind:"file", media_meta:{ name, size:file.size }, created_at:new Date().toISOString(), rx:{}, _pending:true, _blob:file, _ctype:ctype };
  setReply(null);
  S.msgs.push(m); paint(); $("msgs").scrollTop=$("msgs").scrollHeight;
  const { error } = await sb.storage.from("bt-chat-media").upload(m.media_path, file, { contentType:ctype, cacheControl:"31536000" });
  if(error){ m._pending=false; m._failed=true; renderMsgs(); toast(isNetErr(error)?"You're offline. Tap the file to retry.":"Couldn't upload that file"); return; }
  m._uploaded=true; bumpConv(m); send(m);
}
async function resizeImage(file, max, square){
  const bmp = await (window.createImageBitmap ? createImageBitmap(file).catch(()=>null) : null) || await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); });
  let w=bmp.width, hh=bmp.height, sx=0, sy=0, sw=w, sh=hh;
  if(square){ const s=Math.min(w,hh); sx=(w-s)/2; sy=(hh-s)/2; sw=sh=s; w=hh=Math.min(s,max); }
  else if(square===false){ /* no-op */ }
  else { const k=Math.min(1, max/Math.max(w,hh)); w=Math.round(w*k); hh=Math.round(hh*k); }
  const cv=document.createElement("canvas"); cv.width=w; cv.height=hh;
  cv.getContext("2d").drawImage(bmp,sx,sy,sw,sh,0,0,w,hh);
  let blob=await new Promise(r=>cv.toBlob(r,"image/webp",.85));
  if(!blob || blob.type!=="image/webp") blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",.86));
  return { blob, w, h:hh };
}
async function cropImage(file, outW, outH){
  const bmp = await (window.createImageBitmap ? createImageBitmap(file).catch(()=>null) : null) || await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); });
  const target=outW/outH; let sw=bmp.width, sh=bmp.height;
  if(sw/sh>target) sw=sh*target; else sh=sw/target;
  const cv=document.createElement("canvas"); cv.width=outW; cv.height=outH;
  cv.getContext("2d").drawImage(bmp,(bmp.width-sw)/2,(bmp.height-sh)/2,sw,sh,0,0,outW,outH);
  let blob=await new Promise(r=>cv.toBlob(r,"image/webp",.85));
  if(!blob || blob.type!=="image/webp") blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",.86));
  return blob;
}

/* voice recording */
let rec=null, recChunks=[], recStart=0, recTimer=null, recStream=null, recCancelled=false;
async function startRecording(){
  if(!S.cur || S.recording) return;
  if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){ toast("Voice messages aren't supported in this browser"); return; }
  try{ recStream=await navigator.mediaDevices.getUserMedia({ audio:true }); }
  catch{ toast("Allow microphone access to send voice messages"); return; }
  const type=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg;codecs=opus"].find(t=>MediaRecorder.isTypeSupported?.(t))||"";
  rec=new MediaRecorder(recStream, type?{ mimeType:type }:{});
  recChunks=[]; recCancelled=false;
  rec.ondataavailable=(e)=>{ if(e.data.size) recChunks.push(e.data); };
  rec.onstop=finishRecording;
  rec.start(250); recStart=Date.now(); S.recording=true;
  $("composer").hidden=true; $("recorder").hidden=false; $("recTime").textContent="0:00";
  recTimer=setInterval(()=>{ const s=(Date.now()-recStart)/1000; $("recTime").textContent=durStr(s); if(s>=120) stopRecording(false); },250);
  stopTyping();
}
function stopRecording(cancel){ recCancelled=cancel; clearInterval(recTimer); if(rec && rec.state!=="inactive") rec.stop(); }
$("recCancel").onclick=()=>stopRecording(true);
$("recSend").onclick=()=>stopRecording(false);
async function finishRecording(){
  recStream?.getTracks().forEach(t=>t.stop());
  S.recording=false; $("recorder").hidden=true; renderChatHead();
  const secs=(Date.now()-recStart)/1000;
  if(recCancelled || !recChunks.length) return;
  if(secs<0.8){ toast("Hold on a little longer to record"); return; }
  const cid=S.cur; if(!cid) return;
  const mime=(rec.mimeType||recChunks[0].type||"audio/webm").split(";")[0];
  const blob=new Blob(recChunks,{ type:mime });
  const ext=mime.includes("mp4")?"m4a":mime.includes("ogg")?"ogg":"webm";
  const id=uuid();
  const m={ id, conversation_id:cid, user_id:S.me.id, kind:"text", content:"Voice message", reply_to:S.reply?.id||null, media_path:`${cid}/${S.me.id}/${id}.${ext}`, media_kind:"audio", media_meta:{ d:Math.round(secs) }, created_at:new Date().toISOString(), rx:{}, _pending:true, _local:URL.createObjectURL(blob), _blob:blob, _ctype:mime };
  setReply(null);
  S.msgs.push(m); paint(); $("msgs").scrollTop=$("msgs").scrollHeight;
  const { error } = await sb.storage.from("bt-chat-media").upload(m.media_path, blob, { contentType:mime, cacheControl:"31536000" });
  if(error){ m._pending=false; m._failed=true; renderMsgs(); toast("Couldn't upload the voice message"); return; }
  m._uploaded=true; S.media[m.media_path]={ url:m._local, exp:Date.now()+3600e3 };
  bumpConv(m); send(m);
}

/* ================= profile sheet ================= */
async function openProfile(uid){
  if(uid===S.me.id){ closeSheet(); setTab("me"); if(document.body.dataset.view==="chat" && !wide()) closeChat(); return; }
  await ensureProfiles([uid]);
  const p=S.P[uid]; if(!p){ toast("Couldn't load that profile"); return; }
  const f=friendRow(uid), blocked=S.blocks.has(uid);
  const shared=S.convs.filter(c=>c.kind==="group" && c.bt_members.some(m=>m.user_id===uid));
  const { data:mutual } = await sb.rpc("bt_mutual_friends",{ other:uid });
  const mids=(mutual||[]).map(x=>typeof x==="string"?x:x.bt_mutual_friends||Object.values(x)[0]);
  await ensureProfiles(mids);
  openSheet(b=>{
    const ban=h("div",{className:"pbanner"}); if(p.banner_url) ban.style.backgroundImage=`url("${p.banner_url}")`;
    b.append(ban);
    const on=isOnline(uid);
    const top=h("div",{className:"prof with-banner"}, h("span",{className:"av-wrap av-ring"+(on?" online":"")},avatar(uid,96)), h("h2",{textContent:nameOf(uid)}));
    if(S.nick[uid]) top.append(h("div",{className:"real",textContent:p.display_name}));
    top.append(h("div",{className:"handle"}, "@"+p.username, p.pronouns ? h("span",{className:"pron",textContent:" · "+p.pronouns}) : null), h("div",{className:"status"+(on?" on":""),textContent:presenceText(uid)}));
    const act=activityLine(uid); if(act) top.append(act);
    if(p.status) top.append(h("div",{className:"custom",textContent:p.status}));
    if(p.bio) top.append(h("p",{className:"bio",textContent:p.bio}));
    const lk=linkChips(p.links); if(lk) top.append(lk);
    const facts=h("div",{className:"facts"});
    facts.append(h("div",{className:"fact"},h("small",{textContent:"Joined"}),h("b",{textContent:longDate(p.created_at)})));
    const bd=S.bdays[uid];
    if(bd) facts.append(h("div",{className:"fact"},h("small",{textContent:isBirthdayToday(uid)?"Birthday today":"Birthday"}),h("b",{textContent:bdayText(bd)})));
    if(f?.status==="accepted") facts.append(h("div",{className:"fact"},h("small",{textContent:"Friends for"}),h("b",{textContent:since(f.responded_at||f.created_at)})));
    else facts.append(h("div",{className:"fact"},h("small",{textContent:"Friendship"}),h("b",{textContent: blocked ? "Blocked" : !f ? "Not friends" : f.requester===S.me.id ? "Request sent" : "Wants to be friends"})));
    const mf=h("div",{className:"fact wide"},h("small",{textContent:`Mutual friends · ${mids.length}`}));
    if(mids.length){ const st=h("div",{className:"stack"}); mids.slice(0,8).forEach(id=>st.append(avatar(id,30))); mf.append(st, h("b",{textContent:mids.slice(0,4).map(nameOf).join(", ")+(mids.length>4?` and ${mids.length-4} more`:"")})); }
    else mf.append(h("b",{textContent:"None yet"}));
    facts.append(mf, h("div",{className:"fact wide"},h("small",{textContent:"Groups in common"}),h("b",{textContent: shared.length ? shared.map(c=>c.name).join(", ") : "None yet"})));
    top.append(facts);
    const btns=h("div",{className:"btns"});
    if(blocked){
      const u=h("button",{className:"btn",textContent:"Unblock"}); u.onclick=async()=>{ await sb.from("bt_blocks").delete().match({ blocker_id:S.me.id, blocked_id:uid }); S.blocks.delete(uid); closeSheet(); toast("Unblocked "+nameOf(uid)); renderAll(); };
      btns.append(u);
    } else if(f?.status==="accepted"){
      const m=h("button",{className:"btn",textContent:"Message"}); m.onclick=()=>{ closeSheet(); openDM(uid); };
      const r=h("button",{className:"btn ghost",textContent:"Remove friend"});
      armed(r,"Tap again to remove",async()=>{ const { error } = await sb.rpc("bt_remove_friend",{ other:uid }); if(error) toast(friendlyErr(error,"Couldn't remove friend")); else { closeSheet(); toast("Removed "+nameOf(uid)); loadSocial(); } });
      btns.append(m,r);
    } else if(f && f.addressee===S.me.id){
      const a=h("button",{className:"btn",textContent:"Accept request"}); a.onclick=()=>{ closeSheet(); respond(uid,true); };
      const d=h("button",{className:"btn ghost",textContent:"Decline"}); d.onclick=()=>{ closeSheet(); respond(uid,false); };
      btns.append(a,d);
    } else if(f){
      const c=h("button",{className:"btn ghost",textContent:"Cancel request"}); c.onclick=async()=>{ await sb.rpc("bt_remove_friend",{ other:uid }); closeSheet(); loadSocial(); };
      btns.append(c);
    } else {
      const a=h("button",{className:"btn",textContent:"Add friend"});
      a.onclick=async()=>{ a.disabled=true; const { data, error } = await sb.rpc("bt_send_friend_request",{ target_username:p.username }); if(error){ a.disabled=false; toast(friendlyErr(error,"Couldn't send the request")); return; } closeSheet(); toast(data==="accepted"?"You're now friends!":"Friend request sent"); loadSocial(); };
      btns.append(a);
    }
    top.append(btns);
    b.append(top);
    const menu=h("div",{className:"menu"});
    menu.append(menuBtn("🏷️  "+(S.nick[uid]?"Change nickname":"Set a nickname"),()=>nicknameSheet(uid),{ right:S.nick[uid]||"Only you see it" }));
    if(!blocked) menu.append(menuBtn("⛔  Block "+firstName(uid),()=>blockSheet(uid),{ danger:true }));
    menu.append(menuBtn("🚩  Report "+firstName(uid),()=>reportSheet({ user:uid }),{ danger:true }));
    if(S.profile.is_admin) menu.append(menuBtn("🔨  Admin: ban user",()=>banSheet(uid),{ danger:true }));
    b.append(menu);
  });
}
function nicknameSheet(uid){
  openSheet(b=>{
    const inp=h("input",{className:"input",id:"nickIn",maxLength:32,value:S.nick[uid]||"",placeholder:S.P[uid].display_name});
    const err=h("div",{className:"err"});
    const go=h("button",{className:"btn",textContent:"Save nickname"});
    go.onclick=async()=>{
      const v=inp.value.trim(); go.disabled=true;
      const { error } = v ? await sb.from("bt_nicknames").upsert({ owner_id:S.me.id, target_id:uid, nickname:v }) : await sb.from("bt_nicknames").delete().match({ owner_id:S.me.id, target_id:uid });
      go.disabled=false;
      if(error){ err.textContent="Couldn't save the nickname."; return; }
      if(v) S.nick[uid]=v; else delete S.nick[uid];
      closeSheet(); toast(v?"Nickname saved":"Nickname removed"); renderAll();
    };
    b.append(h("h2",{textContent:"Nickname"}), h("p",{className:"sub",textContent:"Only you see this name for "+S.P[uid].display_name+". Leave it empty to remove it."}), inp, err, go);
    setTimeout(()=>inp.focus(),250);
  });
}
function blockSheet(uid){
  openSheet(b=>{
    b.append(h("h2",{textContent:"Block "+nameOf(uid)+"?"}), h("p",{className:"sub",textContent:"You'll stop being friends, they can't send you requests or DMs, and their messages in groups are hidden for you. They aren't told."}));
    const go=h("button",{className:"btn danger",textContent:"Block"});
    go.onclick=async()=>{
      go.disabled=true;
      const { error } = await sb.from("bt_blocks").insert({ blocker_id:S.me.id, blocked_id:uid });
      if(error && !/duplicate/i.test(error.message)){ go.disabled=false; toast("Couldn't block them"); return; }
      await sb.rpc("bt_remove_friend",{ other:uid });
      S.blocks.add(uid); closeSheet(); toast("Blocked "+nameOf(uid)); await loadSocial(); renderAll();
    };
    const no=h("button",{className:"btn ghost",textContent:"Cancel"}); no.onclick=closeSheet;
    b.append(go,no);
  });
}
function reportSheet({ user, message }){
  const target=message ? message.user_id : user;
  openSheet(b=>{
    b.append(h("h2",{textContent: message ? "Report message" : "Report "+nameOf(target)}), h("p",{className:"sub",textContent:"Reports go to the Beaver Transceiver admin. "+nameOf(target)+" won't see who reported them."}));
    let reason=null;
    for(const [v,label] of [["spam","Spam"],["harassment","Harassment or bullying"],["inappropriate","Inappropriate content"],["impersonation","Pretending to be someone else"],["other","Something else"]]){
      const inp=h("input",{type:"radio",name:"reason"}); inp.onchange=()=>{ reason=v; };
      b.append(h("label",{className:"radio"}, inp, label));
    }
    const det=h("textarea",{className:"input",maxLength:500,rows:3,placeholder:"Anything else the admin should know (optional)"});
    const err=h("div",{className:"err"});
    const go=h("button",{className:"btn danger",textContent:"Send report"});
    go.onclick=async()=>{
      if(!reason){ err.textContent="Pick a reason."; return; }
      go.disabled=true;
      const row={ reporter_id:S.me.id, reason, details:det.value.trim() };
      if(message) row.message_id=message.id; else row.target_id=target;
      const { error } = await sb.from("bt_reports").insert(row);
      go.disabled=false;
      if(error){ err.textContent=friendlyErr(error,"Couldn't send the report."); return; }
      closeSheet(); toast("Report sent. Thanks for letting us know.");
    };
    b.append(det, err, go);
  });
}

/* ================= group sheet ================= */
const myRole = (c) => myMember(c)?.role;
const isAdminOf = (c) => ["owner","admin"].includes(myRole(c));
function groupSheet(c){
  const owner=myRole(c)==="owner", admin=isAdminOf(c);
  openSheet(b=>{
    b.append(h("div",{className:"prof"}, convAvatar(c,88), h("h2",{textContent:c.name}), h("div",{className:"status",textContent:`${c.bt_members.length} members · created ${longDate(c.created_at)}`}), c.description ? h("p",{className:"bio",textContent:c.description}) : null));
    const menu=h("div",{className:"menu"});
    if(admin) menu.append(menuBtn("✏️  Edit group",()=>editGroupSheet(c)));
    menu.append(menuBtn("➕  Add friends",()=>addMembersSheet(c)));
    if(admin) menu.append(menuBtn("🔗  Invite links",()=>invitesSheet(c)));
    menu.append(menuBtn("🔔  Notifications",()=>notifySheet(c),{ right:{all:"All",mentions:"Mentions",off:"Off"}[myMember(c)?.notify||"all"] }));
    b.append(menu);
    b.append(h("h3",{textContent:"Members"}));
    const list=h("div",{className:"members"});
    const rank={ owner:0, admin:1, member:2 };
    const sorted=[...c.bt_members].sort((a,b)=>rank[a.role]-rank[b.role] || nameOf(a.user_id).localeCompare(nameOf(b.user_id)));
    for(const m of sorted){
      const uid=m.user_id;
      const r=h("div",{className:"member",role:"button",tabIndex:0}, h("span",{className:"av-wrap"+(isOnline(uid)?" online":"")},avatar(uid,40)), h("div",{className:"nm"},h("b",{textContent:nameOf(uid)+(uid===S.me.id?" (you)":"")}),h("span",{textContent:handleOf(uid)})));
      if(m.role!=="member") r.append(h("span",{className:"tag",textContent:m.role==="owner"?"Owner":"Admin"}));
      const canManage = uid!==S.me.id && m.role!=="owner" && (owner || (admin && m.role==="member"));
      if(canManage){
        const more=h("button",{className:"pill",textContent:"Manage"}); more.onclick=(e)=>{ e.stopPropagation(); memberSheet(c,m); }; r.append(more);
      }
      r.onclick=()=>openProfile(uid);
      list.append(r);
    }
    b.append(list);
    const leave=h("button",{className:"btn ghost",textContent:"Leave group"});
    armed(leave,"Tap again to leave "+c.name, async()=>{
      const { error } = await sb.rpc("bt_leave_group",{ cid:c.id });
      if(error){ toast(friendlyErr(error,"Couldn't leave the group")); return; }
      closeSheet(); S.convs=S.convs.filter(x=>x.id!==c.id); closeChat(); toast("You left "+c.name);
    });
    b.append(leave);
  });
}
function memberSheet(c, m){
  const owner=myRole(c)==="owner";
  openSheet(b=>{
    b.append(h("div",{className:"member"}, avatar(m.user_id,48), h("div",{className:"nm"},h("b",{textContent:nameOf(m.user_id)}),h("span",{textContent:m.role==="admin"?"Admin":"Member"}))));
    const menu=h("div",{className:"menu"});
    if(owner) menu.append(menuBtn(m.role==="admin"?"⬇️  Remove as admin":"⭐  Make admin", async()=>{
      const role=m.role==="admin"?"member":"admin";
      const { error } = await sb.from("bt_members").update({ role }).match({ conversation_id:c.id, user_id:m.user_id });
      if(error){ toast(friendlyErr(error,"Couldn't change their role")); return; }
      m.role=role; closeSheet(); toast(role==="admin"?nameOf(m.user_id)+" is now an admin":nameOf(m.user_id)+" is no longer an admin"); reloadConvs();
    }));
    const rm=menuBtn("🚪  Remove from group",null,{ danger:true });
    rm.onclick=()=>{ rm.querySelector(".lbl-t").textContent="Tap again to remove "+firstName(m.user_id); rm.onclick=async()=>{
      const { error } = await sb.from("bt_members").delete().match({ conversation_id:c.id, user_id:m.user_id });
      if(error){ toast(friendlyErr(error,"Couldn't remove them")); return; }
      closeSheet(); toast("Removed "+nameOf(m.user_id)); reloadConvs();
    }; };
    menu.append(rm);
    b.append(menu);
  });
}
function editGroupSheet(c){
  openSheet(b=>{
    const pic=h("button",{className:"av-btn",type:"button",style:"position:relative;border-radius:30%;margin:0 auto;display:block"}, convAvatar(c,96), h("span",{className:"cam",style:"position:absolute;right:-4px;bottom:-4px;width:34px;height:34px;border-radius:50%;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;border:3px solid var(--surface)"}, svg("i-cam",16)));
    const file=h("input",{type:"file",accept:"image/*",hidden:true});
    pic.onclick=()=>file.click();
    file.onchange=async()=>{
      const f=file.files[0]; if(!f) return;
      toast("Uploading…");
      try{
        const { blob }=await resizeImage(f,400,true);
        const path=`g/${c.id}/${Date.now()}.${blob.type==="image/webp"?"webp":"jpg"}`;
        const { error:up }=await sb.storage.from("bt-avatars").upload(path, blob, { contentType:blob.type, cacheControl:"31536000" });
        if(up) throw up;
        const url=sb.storage.from("bt-avatars").getPublicUrl(path).data.publicUrl;
        const old=c.avatar_url;
        const { error }=await sb.from("bt_conversations").update({ avatar_url:url }).eq("id",c.id);
        if(error) throw error;
        c.avatar_url=url; toast("Group photo updated"); closeSheet(); renderChats(); renderChatHead();
        const mm=old && old.match(/\/bt-avatars\/(g\/.+)$/); if(mm) sb.storage.from("bt-avatars").remove([mm[1]]).then(()=>{});
      }catch{ toast("Couldn't upload that photo"); }
    };
    const name=h("input",{className:"input",id:"gName",maxLength:40,value:c.name});
    const desc=h("textarea",{className:"input",id:"gDesc",maxLength:300,rows:3,value:c.description||"",placeholder:"What's this group about?"});
    const err=h("div",{className:"err"});
    const go=h("button",{className:"btn",textContent:"Save"});
    go.onclick=async()=>{
      const n=name.value.trim(); if(!n){ err.textContent="The group needs a name."; return; }
      const patch={}; if(n!==c.name) patch.name=n; if(desc.value.trim()!==(c.description||"")) patch.description=desc.value.trim();
      if(!Object.keys(patch).length){ closeSheet(); return; }
      go.disabled=true;
      const { error }=await sb.from("bt_conversations").update(patch).eq("id",c.id);
      go.disabled=false;
      if(error){ err.textContent=friendlyErr(error,"Couldn't save the changes."); return; }
      Object.assign(c,patch); closeSheet(); toast("Group updated"); renderChats(); renderChatHead();
    };
    b.append(h("h2",{textContent:"Edit group"}), pic, file, h("label",{className:"lbl",htmlFor:"gName",textContent:"Name"}), name, h("label",{className:"lbl",htmlFor:"gDesc",textContent:"Description"}), desc, err, go);
    if(c.avatar_url){ const rm=h("button",{className:"btn ghost",textContent:"Remove group photo"}); rm.onclick=async()=>{ const { error }=await sb.from("bt_conversations").update({ avatar_url:null }).eq("id",c.id); if(!error){ c.avatar_url=null; closeSheet(); renderChats(); renderChatHead(); } }; b.append(rm); }
  });
}
function addMembersSheet(c){
  openSheet(b=>{
    const pick=friendPicker(new Set(c.bt_members.map(m=>m.user_id))); const err=h("div",{className:"err"});
    b.append(h("h2",{textContent:"Add to "+c.name}));
    if(!pick.count){ b.append(h("p",{className:"sub",textContent:"All your friends are already in this group."+(isAdminOf(c)?" Use an invite link to bring in others.":"")})); return; }
    const go=h("button",{className:"btn",textContent:"Add",disabled:true});
    pick.el.addEventListener("change",()=>{ go.disabled=!pick.picked.size; go.textContent=pick.picked.size?`Add ${pick.picked.size}`:"Add"; });
    go.onclick=async()=>{ go.disabled=true; const { error } = await sb.rpc("bt_add_to_group",{ cid:c.id, member_ids:[...pick.picked] }); if(error){ err.textContent=friendlyErr(error,"Couldn't add them."); go.disabled=false; return; } closeSheet(); reloadConvs(); };
    b.append(pick.el, err, go);
  });
}
async function invitesSheet(c){
  const { data } = await sb.from("bt_invites").select("*").eq("conversation_id",c.id).order("created_at",{ascending:false});
  openSheet(b=>{
    b.append(h("h2",{textContent:"Invite links"}), h("p",{className:"sub",textContent:"Anyone with a link can join "+c.name+", even if they aren't your friend. Delete a link to stop it working."}));
    const list=data||[];
    for(const inv of list){
      const link=`${BASE}?join=${inv.code}`;
      const box=h("div",{className:"code-box"}, h("code",{textContent:link}));
      const cp=h("button",{className:"pill primary",textContent:"Copy"}); cp.onclick=()=>copyText(link,"Link copied");
      const qr=h("button",{className:"pill",textContent:"QR"}); qr.onclick=()=>qrSheet(link,"Scan to join "+c.name);
      const del=h("button",{className:"pill",textContent:"Delete"}); del.onclick=async()=>{ await sb.from("bt_invites").delete().eq("code",inv.code); invitesSheet(c); };
      box.append(cp,qr,del); b.append(box);
    }
    const go=h("button",{className:"btn",textContent: list.length ? "Create another link" : "Create invite link"});
    go.onclick=async()=>{ go.disabled=true; const { error } = await sb.from("bt_invites").insert({ conversation_id:c.id, created_by:S.me.id }); if(error){ go.disabled=false; toast(friendlyErr(error,"Couldn't create a link")); return; } invitesSheet(c); };
    b.append(go);
  });
}
function qrSheet(text, title){
  openSheet(b=>{
    b.append(h("h2",{textContent:title,style:"text-align:center"}));
    const box=h("div",{className:"qr"}); b.append(box);
    if(window.QRCode) new QRCode(box,{ text, width:220, height:220, colorDark:"#15211f", colorLight:"#ffffff", correctLevel:QRCode.CorrectLevel.M });
    else box.textContent="QR codes need an internet connection.";
    const link=h("div",{className:"code-box"}, h("code",{textContent:text}));
    const cp=h("button",{className:"pill primary",textContent:"Copy link"}); cp.onclick=()=>copyText(text,"Link copied");
    link.append(cp); b.append(link);
    b.append(h("p",{className:"hint",style:"text-align:center",textContent:"Point a phone camera at the code to open the link."}));
  });
}

/* chat options */
$("chatMenuBtn").onclick=()=>{
  const c=curConv(); if(!c) return; const me=myMember(c);
  openSheet(b=>{
    b.append(h("h2",{textContent:convName(c)}));
    const menu=h("div",{className:"menu"});
    menu.append(menuBtn("🔍  Search in chat",()=>{ closeSheet(); $("chatSearchBtn").click(); }));
    menu.append(menuBtn("📌  Pinned messages",pinsSheet,{ right:String(S.pins.length) }));
    menu.append(menuBtn("🔔  Notifications",()=>notifySheet(c),{ right:{all:"All",mentions:"Mentions",off:"Off"}[me?.notify||"all"] }));
    menu.append(menuBtn(me?.pinned?"📌  Unpin chat":"📌  Pin chat to top",()=>{ closeSheet(); updateMyMember(c,{ pinned:!me.pinned }); }));
    menu.append(menuBtn(me?.archived?"📤  Unarchive chat":"🗄️  Archive chat",()=>{ closeSheet(); updateMyMember(c,{ archived:!me.archived }); }));
    if(c.kind==="group") menu.append(menuBtn("👥  Group info",()=>groupSheet(c)));
    else { const o=dmOther(c); menu.append(menuBtn("👤  View profile",()=>openProfile(o)), menuBtn("🚩  Report "+firstName(o),()=>reportSheet({ user:o }),{ danger:true })); if(!S.blocks.has(o)) menu.append(menuBtn("⛔  Block "+firstName(o),()=>blockSheet(o),{ danger:true })); }
    b.append(menu);
  });
};

/* ================= my profile + settings ================= */
watchUsername($("meUserIn"), $("meUserNote"), ()=>S.profile?.username);
$("meBioIn").addEventListener("input",()=>{ $("bioCount").textContent=$("meBioIn").value.length+"/160"; });
$("meStatusIn").addEventListener("input",()=>{ $("statusCount").textContent=$("meStatusIn").value.length+"/60"; });
const cooldownLeft = (ts, days) => ts ? Date.parse(ts)+days*864e5-Date.now() : 0;
function renderMe(){
  const p=S.profile; if(!p) return;
  $("meAv").replaceChildren(avatar(S.me.id,104));
  $("meBanner").style.backgroundImage = p.banner_url ? `url("${p.banner_url}")` : "";
  $("meDisplay").textContent=p.display_name; $("meHandle").textContent="@"+p.username+(p.pronouns?" · "+p.pronouns:"");
  const a=activityOf(S.me.id); $("activityBtn").replaceChildren(svg(a?.icon||"i-game"), a ? a.label : "Set an activity"); $("activityBtn").classList.toggle("set",!!a);
  $("meStatus").textContent=p.status||""; $("meJoined").textContent="Joined "+longDate(p.created_at);
  renderSettings();
}
function fillMeForm(){
  const p=S.profile; if(!p) return;
  $("meDisplayIn").value=p.display_name; $("meUserIn").value=p.username; $("meBioIn").value=p.bio||""; $("meStatusIn").value=p.status||"";
  $("mePronounsIn").value=p.pronouns||"";
  const bd=S.bdays[S.me.id]; $("meBdayIn").value=bd?.birthday||""; $("meBdayYear").checked=!!bd?.show_year;
  $("meBdayIn").max=new Date().toISOString().slice(0,10);
  renderLinkEditor(p.links||[]);
  $("bioCount").textContent=(p.bio||"").length+"/160"; $("statusCount").textContent=(p.status||"").length+"/60"; $("meUserNote").textContent=""; $("meErr").textContent="";
  const uLeft=cooldownLeft(p.username_changed_at,180), dLeft=cooldownLeft(p.display_name_changed_at,30);
  $("meUserIn").disabled=uLeft>0; $("meDisplayIn").disabled=dLeft>0;
  $("meDisplayNote").textContent = dLeft>0 ? "Change again "+longDate(Date.parse(p.display_name_changed_at)+30*864e5) : "Once every 30 days";
  $("meDisplayNote").className="";
  $("cooldownHint").textContent = uLeft>0 ? "You can change your username again on "+longDate(Date.parse(p.username_changed_at)+180*864e5)+"." : "You can change your username once every 180 days.";
}
$("meForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const p=S.profile, d=$("meDisplayIn").value.trim(), u=$("meUserIn").value.trim(), bio=$("meBioIn").value.trim(), status=$("meStatusIn").value.trim(), err=$("meErr");
  err.textContent="";
  if(!d){ err.textContent="Enter a display name."; return; }
  if(!USER_RE.test(u)){ err.textContent="Usernames are 3–20 lowercase letters, numbers, dots or underscores."; return; }
  const links=[...$("meLinks").querySelectorAll("input")].map(i=>i.value.trim()).filter(Boolean);
  for(const u of links){ if(!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(u)){ err.textContent="Links must start with https:// — check “"+u.slice(0,40)+"”."; return; } }
  const patch={ bio, status, pronouns:$("mePronounsIn").value.trim(), links:links.map(url=>({ url })) };
  if(d!==p.display_name) patch.display_name=d;
  if(u!==p.username){
    if(!(await usernameFree(u))){ err.textContent="That username is taken. Pick another."; return; }
    patch.username=u;
  }
  const warn=[]; if(patch.username) warn.push("username (next change in 180 days)"); if(patch.display_name) warn.push("display name (next change in 30 days)");
  if(warn.length && $("meSave").dataset.confirm!=="1"){ $("meSave").dataset.confirm="1"; $("meSave").textContent="Tap again to confirm"; err.textContent="You're changing your "+warn.join(" and ")+"."; return; }
  $("meSave").dataset.confirm=""; $("meSave").textContent="Save profile";
  $("meSave").disabled=true;
  const { data, error } = await sb.from("bt_profiles").update(patch).eq("id",S.me.id).select().single();
  $("meSave").disabled=false;
  if(error){ err.textContent=friendlyErr(error,"Couldn't save. Try again."); return; }
  const bday=$("meBdayIn").value, year=$("meBdayYear").checked, cur=S.bdays[S.me.id];
  if(bday && (!cur || cur.birthday!==bday || cur.show_year!==year)){
    const { error:be } = await sb.from("bt_birthdays").upsert({ user_id:S.me.id, birthday:bday, show_year:year });
    if(!be) S.bdays[S.me.id]={ user_id:S.me.id, birthday:bday, show_year:year };
  } else if(!bday && cur){ await sb.from("bt_birthdays").delete().eq("user_id",S.me.id); delete S.bdays[S.me.id]; }
  S.profile=S.P[S.me.id]=data; renderMe(); fillMeForm(); toast("Profile saved");
});
function renderLinkEditor(list){
  const box=$("meLinks"); box.replaceChildren();
  for(const l of list) addLinkRow(l.url);
  $("addLinkBtn").hidden = box.children.length>=6;
}
function addLinkRow(v=""){
  const box=$("meLinks"); if(box.children.length>=6) return;
  const inp=h("input",{className:"input",type:"url",inputMode:"url",placeholder:"https://youtube.com/@you",value:v,autocapitalize:"none"});
  const x=h("button",{type:"button","aria-label":"Remove link"}, svg("i-x")); x.onclick=()=>{ row.remove(); $("addLinkBtn").hidden=false; };
  const row=h("div",{className:"link-row"}, inp, x); box.append(row);
  $("addLinkBtn").hidden = box.children.length>=6;
  return inp;
}
$("addLinkBtn").onclick=()=>addLinkRow().focus();
function linkLabel(url){
  let host=""; try{ host=new URL(url).hostname.replace(/^www\./,""); }catch{ return "Link"; }
  const known=[["youtube.com","YouTube"],["youtu.be","YouTube"],["discord.gg","Discord"],["discord.com","Discord"],["curseforge.com","CurseForge"],["github.com","GitHub"],["twitch.tv","Twitch"],["tiktok.com","TikTok"],["x.com","X"],["twitter.com","X"],["instagram.com","Instagram"],["mcpedl.com","MCPEDL"],["modrinth.com","Modrinth"],["spotify.com","Spotify"]];
  const k=known.find(([d])=>host===d||host.endsWith("."+d)); return k ? k[1] : host;
}
function linkChips(list){
  if(!Array.isArray(list) || !list.length) return null;
  const box=h("div",{className:"chips"});
  for(const l of list){ if(!/^https?:\/\//i.test(l?.url||"")) continue; box.append(h("a",{className:"chip",href:l.url,target:"_blank",rel:"noopener noreferrer nofollow"}, svg("i-link"), linkLabel(l.url))); }
  return box.children.length ? box : null;
}
function bdayText(b){
  const d=new Date(b.birthday+"T12:00:00");
  let t=d.toLocaleDateString("en-GB",{ day:"numeric", month:"long" });
  if(b.show_year){ const n=new Date(); let age=n.getFullYear()-d.getFullYear(); const before=(n.getMonth()<d.getMonth())||(n.getMonth()===d.getMonth() && n.getDate()<d.getDate()); if(before) age--; t+=` · ${age} years old`; }
  return t;
}
$("activityBtn").onclick=()=>activitySheet();
function activitySheet(){
  const cur=S.profile.activity;
  openSheet(b=>{
    b.append(h("h2",{textContent:"Activity"}), h("p",{className:"sub",textContent:"Show friends what you're up to. It appears under your name."}));
    let type=cur?.type||"playing", dur="4h";
    const seg=h("div",{className:"seg",style:"grid-auto-flow:row;grid-template-columns:repeat(3,1fr)"});
    for(const [v,l] of ACT_TYPES){ const btn=h("button",{type:"button","aria-pressed":String(type===v),textContent:l}); btn.onclick=()=>{ type=v; [...seg.children].forEach(x=>x.setAttribute("aria-pressed",String(x===btn))); }; seg.append(btn); }
    const txt=h("input",{className:"input",id:"actText",maxLength:60,placeholder:"e.g. Minecraft Bedrock",value:cur?.text||""});
    const seg2=h("div",{className:"seg"});
    for(const [v,l] of [["1h","1 hour"],["4h","4 hours"],["day","Today"],["none","Until I clear it"]]){ const btn=h("button",{type:"button","aria-pressed":String(dur===v),textContent:l}); btn.onclick=()=>{ dur=v; [...seg2.children].forEach(x=>x.setAttribute("aria-pressed",String(x===btn))); }; seg2.append(btn); }
    const go=h("button",{className:"btn",textContent:"Show activity"});
    go.onclick=async()=>{
      const text=txt.value.trim(); if(!text){ txt.focus(); return; }
      let until=null; const now=new Date();
      if(dur==="1h") until=new Date(now.getTime()+3600e3); else if(dur==="4h") until=new Date(now.getTime()+4*3600e3); else if(dur==="day"){ until=new Date(now); until.setHours(23,59,59,0); }
      await saveActivity({ type, text, until:until?until.toISOString():null });
    };
    b.append(h("label",{className:"lbl",textContent:"What kind"}), seg, h("label",{className:"lbl",htmlFor:"actText",textContent:"What"}), txt, h("label",{className:"lbl",textContent:"For how long"}), seg2, go);
    if(cur){ const cl=h("button",{className:"btn ghost",textContent:"Clear activity"}); cl.onclick=()=>saveActivity(null); b.append(cl); }
  });
}
async function saveActivity(a){
  const { data, error } = await sb.from("bt_profiles").update({ activity:a }).eq("id",S.me.id).select().single();
  if(error){ toast("Couldn't save your activity"); return; }
  S.profile=S.P[S.me.id]=data; closeSheet(); renderMe(); toast(a?"Activity updated":"Activity cleared");
}
$("avatarBtn").onclick=()=>{
  openSheet(b=>{
    b.append(h("h2",{textContent:"Profile picture"}));
    const menu=h("div",{className:"menu"});
    menu.append(menuBtn("📷  Choose a new picture",()=>{ closeSheet(); $("avatarFile").click(); }));
    if(S.profile.avatar_url) menu.append(menuBtn("🗑️  Remove picture",async()=>{ closeSheet(); await setProfileImage("avatar_url",null); },{ danger:true }));
    b.append(menu);
  });
};
$("bannerBtn").onclick=()=>{
  openSheet(b=>{
    b.append(h("h2",{textContent:"Profile banner"}), h("p",{className:"sub",textContent:"A wide image shown at the top of your profile."}));
    const menu=h("div",{className:"menu"});
    menu.append(menuBtn("🖼️  Choose a banner",()=>{ closeSheet(); $("bannerFile").click(); }));
    if(S.profile.banner_url) menu.append(menuBtn("🗑️  Remove banner",async()=>{ closeSheet(); await setProfileImage("banner_url",null); },{ danger:true }));
    b.append(menu);
  });
};
$("avatarFile").addEventListener("change", async ()=>{ const f=$("avatarFile").files[0]; $("avatarFile").value=""; if(f) uploadProfileImage(f,"avatar_url"); });
$("bannerFile").addEventListener("change", async ()=>{ const f=$("bannerFile").files[0]; $("bannerFile").value=""; if(f) uploadProfileImage(f,"banner_url"); });
async function uploadProfileImage(file, field){
  if(!file.type.startsWith("image/")){ toast("Pick an image file"); return; }
  toast("Uploading…");
  try{
    const blob = field==="avatar_url" ? (await resizeImage(file,320,true)).blob : await cropImage(file,1200,400);
    const path=`${S.me.id}/${field==="avatar_url"?"av":"banner"}-${Date.now()}.${blob.type==="image/webp"?"webp":"jpg"}`;
    const { error:up } = await sb.storage.from("bt-avatars").upload(path, blob, { contentType:blob.type, cacheControl:"31536000" });
    if(up) throw up;
    await setProfileImage(field, sb.storage.from("bt-avatars").getPublicUrl(path).data.publicUrl);
  }catch{ toast("Couldn't upload that picture. Try a different one."); }
}
async function setProfileImage(field, url){
  const old=S.profile[field];
  const { data, error } = await sb.from("bt_profiles").update({ [field]:url }).eq("id",S.me.id).select().single();
  if(error){ toast("Couldn't save that"); return; }
  S.profile=S.P[S.me.id]=data; renderMe(); renderChats();
  toast(url ? (field==="avatar_url"?"Profile picture updated":"Banner updated") : "Removed");
  const m=old && old.match(/\/bt-avatars\/([0-9a-f-]{36}\/.+)$/); if(m) sb.storage.from("bt-avatars").remove([m[1]]).then(()=>{});
}
function renderSettings(){
  const box=$("settingsList"); box.replaceChildren();
  const menu=h("div",{className:"menu"});
  menu.append(
    menuBtn("📱  My QR code",myQr),
    menuBtn("🎨  Appearance",appearanceSheet),
    menuBtn("🔔  Notifications & sounds",notificationsSheet),
    menuBtn("🔒  Privacy",privacySheet,{ right:{everyone:"Everyone",fof:"Friends of friends",nobody:"Nobody"}[S.profile?.add_policy||"everyone"] }),
    menuBtn("⛔  Blocked users",blockedSheet,{ right:String(S.blocks.size) }),
    menuBtn("💻  Devices",devicesSheet),
    menuBtn("🔐  Email & password",accountSheet)
  );
  if(S.profile?.is_admin) menu.append(menuBtn("🛡️  Admin",adminSheet));
  box.append(menu);
  const out=h("button",{className:"btn ghost",textContent:"Sign out"}); out.onclick=()=>sb.auth.signOut();
  const del=h("button",{className:"btn text-danger",textContent:"Delete my account"}); del.onclick=deleteAccountSheet;
  box.append(out, del, h("div",{className:"hint",style:"text-align:center",textContent:"Signed in as "+(S.me.email||"")}));
}
function myQr(){ qrSheet(`${BASE}?add=${S.profile.username}`, "Add me on Beaver Transceiver"); }
$("myQrBtn2").onclick=myQr;
function appearanceSheet(){
  openSheet(b=>{
    b.append(h("h2",{textContent:"Appearance"}));
    b.append(h("h3",{textContent:"Theme"}));
    const cur=store("bt-theme")||"system";
    const seg=h("div",{className:"seg"});
    for(const [v,l] of [["system","Auto"],["light","Light"],["dark","Dark"]]){
      const btn=h("button",{"aria-pressed":String(cur===v),textContent:l});
      btn.onclick=()=>{ store("bt-theme", v==="system"?null:v); if(v==="system") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme=v; [...seg.children].forEach(x=>x.setAttribute("aria-pressed",String(x===btn))); };
      seg.append(btn);
    }
    b.append(seg);
    b.append(h("h3",{textContent:"Accent colour"}));
    const sw=h("div",{className:"swatches"}); const curA=store("bt-accent");
    const def=h("button",{"aria-pressed":String(!curA),"aria-label":"Default",style:"background:linear-gradient(135deg,#c4621a 50%,#f08d3c 50%)"}); def.onclick=()=>{ setAccent(null); [...sw.children].forEach(x=>x.setAttribute("aria-pressed",String(x===def))); };
    sw.append(def);
    for(const a of ACCENTS){ const btn=h("button",{"aria-pressed":String(curA===a),"aria-label":"Accent "+a,style:"background:"+a}); btn.onclick=()=>{ setAccent(a); [...sw.children].forEach(x=>x.setAttribute("aria-pressed",String(x===btn))); }; sw.append(btn); }
    b.append(sw);
    b.append(h("h3",{textContent:"Chat wallpaper"}));
    const walls=h("div",{className:"walls"});
    for(const [v,l] of WALLS){
      const btn=h("button",{"aria-pressed":String(prefs.wall===v),className:"wall-"+v,textContent:l});
      btn.onclick=()=>{ prefs.wall=v; store("bt-prefs",prefs); [...walls.children].forEach(x=>x.setAttribute("aria-pressed",String(x===btn))); $("msgs").className="msgs"+(v!=="none"?" wall-"+v:""); };
      walls.append(btn);
    }
    b.append(walls);
    b.append(h("h3",{textContent:"Text size in chats"}));
    const size=store("bt-size")||"1";
    const seg2=h("div",{className:"seg"});
    for(const [v,l] of [["0.9","Small"],["1","Normal"],["1.12","Large"],["1.25","Huge"]]){
      const btn=h("button",{"aria-pressed":String(String(size)===v),textContent:l});
      btn.onclick=()=>{ store("bt-size",v); document.documentElement.style.setProperty("--chat-scale",v); [...seg2.children].forEach(x=>x.setAttribute("aria-pressed",String(x===btn))); };
      seg2.append(btn);
    }
    b.append(seg2);
  });
}
function setAccent(hex){
  const root=document.documentElement.style;
  if(!hex){ store("bt-accent",null); root.removeProperty("--accent-user"); root.removeProperty("--accent-ink-user"); return; }
  store("bt-accent",hex); root.setProperty("--accent-user",hex);
  applyAccentInk(hex);
}
function applyAccentInk(hex){
  const n=parseInt(hex.slice(1),16), r=(n>>16)&255, g=(n>>8)&255, bl=n&255;
  const lum=(0.2126*r+0.7152*g+0.0722*bl)/255;
  document.documentElement.style.setProperty("--accent-ink-user", lum>0.62 ? "#1d1106" : "#ffffff");
}
if(store("bt-accent")) applyAccentInk(store("bt-accent"));
async function notificationsSheet(){
  const supported="serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  let subscribed=false;
  if(supported){ const reg=await navigator.serviceWorker.getRegistration(); subscribed=!!(await reg?.pushManager.getSubscription()); }
  openSheet(b=>{
    b.append(h("h2",{textContent:"Notifications & sounds"}));
    const push=h("input",{type:"checkbox",checked:subscribed,disabled:!supported});
    push.onchange=async()=>{ push.disabled=true; const ok = push.checked ? await enablePush() : await disablePush(); if(!ok) push.checked=!push.checked; push.disabled=false; };
    b.append(h("label",{className:"toggle"}, h("span",{}, h("b",{textContent:"Push notifications"}), h("small",{textContent: supported ? "Get notified about messages and friend requests even when the app is closed." : "This browser doesn't support push. On iPhone, add the app to your Home Screen first (Share → Add to Home Screen), then open it from there."})), push));
    const snd=h("input",{type:"checkbox",checked:prefs.sound});
    snd.onchange=()=>{ prefs.sound=snd.checked; store("bt-prefs",prefs); if(snd.checked) blip(); };
    b.append(h("label",{className:"toggle"}, h("span",{}, h("b",{textContent:"Message sound"}), h("small",{textContent:"Play a short sound when a message arrives while the app is open."})), snd));
    b.append(h("p",{className:"hint",textContent:"You can mute single chats or set them to @mentions only from each chat's menu."}));
  });
}
async function swReg(){ if(!("serviceWorker" in navigator)) return null; return navigator.serviceWorker.getRegistration() .then(r=>r||navigator.serviceWorker.register("sw.js")); }
function b64ToBytes(s){ const pad="=".repeat((4-s.length%4)%4); const raw=atob((s+pad).replace(/-/g,"+").replace(/_/g,"/")); return Uint8Array.from(raw,c=>c.charCodeAt(0)); }
async function enablePush(){
  try{
    const perm=await Notification.requestPermission();
    if(perm!=="granted"){ toast("Notifications are blocked. Allow them in your browser settings."); return false; }
    const reg=await swReg(); await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:b64ToBytes(VAPID_PUBLIC) });
    const j=sub.toJSON();
    const { error } = await sb.from("bt_push_subs").insert({ endpoint:j.endpoint, user_id:S.me.id, p256dh:j.keys.p256dh, auth:j.keys.auth });
    if(error && !/duplicate/i.test(error.message)) throw error;
    toast("Push notifications on"); return true;
  }catch{ toast("Couldn't turn on notifications on this device"); return false; }
}
async function disablePush(){
  try{
    const reg=await swReg(); const sub=await reg?.pushManager.getSubscription();
    if(sub){ await sb.from("bt_push_subs").delete().eq("endpoint",sub.endpoint); await sub.unsubscribe(); }
    toast("Push notifications off"); return true;
  }catch{ return false; }
}
let audioCtx=null;
function blip(){
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    const t=audioCtx.currentTime, o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type="sine"; o.frequency.setValueAtTime(880,t); o.frequency.exponentialRampToValueAtTime(1320,t+0.08);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.18,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
    o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t+0.25);
  }catch{}
}
function privacySheet(){
  openSheet(b=>{
    b.append(h("h2",{textContent:"Privacy"}), h("h3",{textContent:"Who can send me friend requests"}));
    for(const [v,label,desc] of [["everyone","Everyone","Anyone who knows your username"],["fof","Friends of friends","Only people who share a friend with you"],["nobody","Nobody","You can still add people yourself"]]){
      const inp=h("input",{type:"radio",name:"addp",checked:(S.profile.add_policy||"everyone")===v});
      inp.onchange=async()=>{ const { data, error } = await sb.from("bt_profiles").update({ add_policy:v }).eq("id",S.me.id).select().single(); if(error){ toast("Couldn't save that"); return; } S.profile=S.P[S.me.id]=data; renderSettings(); toast("Saved"); };
      b.append(h("label",{className:"radio"}, inp, h("span",{}, h("b",{textContent:label}), h("div",{className:"hint",style:"margin:0",textContent:desc}))));
    }
    b.append(h("p",{className:"hint",textContent:"Your birthday is only shown to friends. Blocked people can never send you requests."}));
  });
}
function deviceName(ua){
  ua=ua||"";
  const os=/iPhone|iPad|iPod/.test(ua)?"iPhone":/Android/.test(ua)?"Android":/Windows/.test(ua)?"Windows":/Mac OS X|Macintosh/.test(ua)?"Mac":/CrOS/.test(ua)?"ChromeOS":/Linux/.test(ua)?"Linux":"Unknown device";
  const br=/Edg\//.test(ua)?"Edge":/OPR\//.test(ua)?"Opera":/SamsungBrowser/.test(ua)?"Samsung Internet":/Firefox\/|FxiOS/.test(ua)?"Firefox":/CriOS|Chrome\//.test(ua)?"Chrome":/Safari\//.test(ua)?"Safari":"Browser";
  return br+" on "+os;
}
async function devicesSheet(){
  const { data, error } = await sb.rpc("bt_my_sessions");
  openSheet(b=>{
    b.append(h("h2",{textContent:"Devices"}), h("p",{className:"sub",textContent:"Places where your account is signed in."}));
    if(error){ b.append(h("p",{className:"err",textContent:"Couldn't load your devices."})); return; }
    for(const d of data||[]){
      const row=h("div",{className:"device"}, svg("i-devices"), h("div",{className:"nm"}, h("b",{textContent:deviceName(d.user_agent)}), h("span",{textContent:(d.is_current?"This device · ":"")+"Active "+ago(d.last_active)+" · since "+longDate(d.created_at)})));
      if(!d.is_current){
        const out=h("button",{className:"pill",textContent:"Sign out"});
        out.onclick=async()=>{ out.disabled=true; const { error:e2 } = await sb.functions.invoke("bt-account",{ body:{ action:"revoke_session", session_id:d.id } }); if(e2){ out.disabled=false; toast("Couldn't sign that device out"); return; } row.remove(); toast("Signed out. It may take up to an hour to fully log out."); };
        row.append(out);
      }
      b.append(row);
    }
    if((data||[]).length>1){
      const all=h("button",{className:"btn ghost",textContent:"Sign out all other devices"});
      all.onclick=async()=>{ all.disabled=true; const { error:e3 } = await sb.auth.signOut({ scope:"others" }); all.disabled=false; if(e3){ toast("Couldn't sign them out"); return; } toast("All other devices signed out"); devicesSheet(); };
      b.append(all);
    }
  });
}
async function blockedSheet(){
  await ensureProfiles([...S.blocks]);
  openSheet(b=>{
    b.append(h("h2",{textContent:"Blocked users"}));
    if(!S.blocks.size){ b.append(h("p",{className:"sub",textContent:"You haven't blocked anyone."})); return; }
    const list=h("div",{className:"members"});
    for(const uid of S.blocks){
      const u=h("button",{className:"pill",textContent:"Unblock"});
      u.onclick=async()=>{ await sb.from("bt_blocks").delete().match({ blocker_id:S.me.id, blocked_id:uid }); S.blocks.delete(uid); toast("Unblocked "+nameOf(uid)); blockedSheet(); renderAll(); };
      list.append(h("div",{className:"member"}, avatar(uid,40), h("div",{className:"nm"},h("b",{textContent:nameOf(uid)}),h("span",{textContent:handleOf(uid)})), u));
    }
    b.append(list);
  });
}
function accountSheet(){
  openSheet(b=>{
    b.append(h("h2",{textContent:"Email & password"}));
    const em=h("input",{className:"input",id:"newEmail",type:"email",value:S.me.email||"",autocomplete:"email"});
    const e1=h("div",{className:"err"}); const g1=h("button",{className:"btn",textContent:"Change email"});
    g1.onclick=async()=>{
      const v=em.value.trim(); if(!/^\S+@\S+\.\S+$/.test(v)){ e1.textContent="Enter a valid email address."; return; }
      if(v===S.me.email){ e1.textContent="That's already your email."; return; }
      g1.disabled=true; const { error } = await sb.auth.updateUser({ email:v },{ emailRedirectTo:BASE }); g1.disabled=false;
      if(error){ e1.textContent=friendlyErr(error,"Couldn't change the email."); return; }
      e1.textContent=""; toast("Check your inbox to confirm the new email");
    };
    const pw=h("input",{className:"input",id:"newPw",type:"password",autocomplete:"new-password",minLength:6});
    const pw2=h("input",{className:"input",id:"newPw2",type:"password",autocomplete:"new-password",minLength:6});
    const e2=h("div",{className:"err"}); const g2=h("button",{className:"btn",textContent:"Change password"});
    g2.onclick=async()=>{
      if(pw.value.length<6){ e2.textContent="Passwords need at least 6 characters."; return; }
      if(pw.value!==pw2.value){ e2.textContent="The passwords don't match."; return; }
      g2.disabled=true; const { error } = await sb.auth.updateUser({ password:pw.value }); g2.disabled=false;
      if(error){ e2.textContent=friendlyErr(error, /reauth|recent/i.test(error.message)?"Sign out and back in, then try again.":"Couldn't change the password."); return; }
      pw.value=pw2.value=""; e2.textContent=""; toast("Password changed");
    };
    b.append(h("label",{className:"lbl",htmlFor:"newEmail",textContent:"Email"}), em, h("div",{className:"hint",textContent:"We'll send a confirmation link to the new address."}), e1, g1,
      h("h3",{textContent:"Password"}), h("label",{className:"lbl",htmlFor:"newPw",textContent:"New password"}), pw, h("label",{className:"lbl",htmlFor:"newPw2",textContent:"Repeat new password"}), pw2, e2, g2);
  });
}
function deleteAccountSheet(){
  openSheet(b=>{
    b.append(h("h2",{textContent:"Delete your account?"}), h("p",{className:"sub",textContent:"This permanently deletes your profile, friends, messages you sent and your sign-in. It can't be undone. Type DELETE to confirm."}));
    const inp=h("input",{className:"input",id:"delConfirm",autocapitalize:"characters",placeholder:"DELETE"});
    const err=h("div",{className:"err"});
    const go=h("button",{className:"btn danger",textContent:"Delete my account forever",disabled:true});
    inp.oninput=()=>{ go.disabled=inp.value.trim()!=="DELETE"; };
    go.onclick=async()=>{
      go.disabled=true;
      const { data, error } = await sb.functions.invoke("bt-account",{ body:{ action:"delete_account", confirm:"DELETE" } });
      if(error || !data?.ok){ go.disabled=false; err.textContent="Couldn't delete the account. Try again."; return; }
      closeSheet(); store(ukey("bt-cache"),null); store(ukey("bt-outbox"),null); store(ukey("bt-drafts"),null);
      await sb.auth.signOut(); toast("Your account was deleted");
    };
    const no=h("button",{className:"btn ghost",textContent:"Keep my account"}); no.onclick=closeSheet;
    b.append(inp, err, go, no);
  });
}

/* ================= admin ================= */
async function adminSheet(){
  const [{ data:reports }, { data:bans }] = await Promise.all([
    sb.from("bt_reports").select("*").order("created_at",{ascending:false}).limit(100),
    sb.from("bt_bans").select("*").order("created_at",{ascending:false}),
  ]);
  await ensureProfiles([...(reports||[]).flatMap(r=>[r.reporter_id,r.target_id]), ...(bans||[]).flatMap(x=>[x.user_id,x.banned_by])]);
  openSheet(b=>{
    b.append(h("h2",{textContent:"Admin"}), h("p",{className:"sub",textContent:`${(reports||[]).length} open report${(reports||[]).length===1?"":"s"} · ${(bans||[]).length} banned`}));
    b.append(h("h3",{textContent:"Reports"}));
    if(!(reports||[]).length) b.append(h("p",{className:"sub",textContent:"No reports. All quiet in the lodge."}));
    const reasons={ spam:"Spam", harassment:"Harassment", inappropriate:"Inappropriate", impersonation:"Impersonation", other:"Other" };
    for(const r of reports||[]){
      const card=h("div",{className:"report"},
        h("div",{className:"who"}, h("b",{textContent:reasons[r.reason]||r.reason}), ` · ${nameOf(r.target_id)} (${handleOf(r.target_id)}) · reported by ${nameOf(r.reporter_id)} · ${ago(r.created_at)}`));
      if(r.message_snapshot) card.append(h("blockquote",{textContent:r.message_snapshot}));
      if(r.details) card.append(h("div",{className:"hint",textContent:"“"+r.details+"”"}));
      const acts=h("div",{className:"acts"});
      const view=h("button",{className:"pill",textContent:"View profile"}); view.onclick=()=>openProfile(r.target_id);
      const ban=h("button",{className:"pill danger",textContent:"Ban"}); ban.onclick=()=>banSheet(r.target_id);
      const dis=h("button",{className:"pill",textContent:"Dismiss"}); dis.onclick=async()=>{ await sb.from("bt_reports").delete().eq("id",r.id); card.remove(); toast("Report dismissed"); };
      acts.append(view,ban,dis); card.append(acts); b.append(card);
    }
    b.append(h("h3",{textContent:"Banned users"}));
    if(!(bans||[]).length) b.append(h("p",{className:"sub",textContent:"Nobody is banned."}));
    const list=h("div",{className:"members"});
    for(const x of bans||[]){
      const un=h("button",{className:"pill",textContent:"Unban"}); un.onclick=async()=>{ await sb.from("bt_bans").delete().eq("user_id",x.user_id); toast("Unbanned "+nameOf(x.user_id)); adminSheet(); };
      list.append(h("div",{className:"member"}, avatar(x.user_id,40), h("div",{className:"nm"},h("b",{textContent:nameOf(x.user_id)}),h("span",{textContent:(x.reason||"No reason")+" · "+ago(x.created_at)})), un));
    }
    b.append(list);
  });
}
function banSheet(uid){
  openSheet(b=>{
    b.append(h("h2",{textContent:"Ban "+nameOf(uid)+"?"}), h("p",{className:"sub",textContent:"They won't be able to send messages, friend requests or use the app. You can unban them from the Admin page."}));
    const r=h("input",{className:"input",maxLength:300,placeholder:"Reason (shown to them)"});
    const go=h("button",{className:"btn danger",textContent:"Ban"});
    go.onclick=async()=>{ go.disabled=true; const { error } = await sb.from("bt_bans").insert({ user_id:uid, banned_by:S.me.id, reason:r.value.trim() }); go.disabled=false; if(error && !/duplicate/i.test(error.message)){ toast("Couldn't ban them"); return; } closeSheet(); toast(nameOf(uid)+" is banned"); };
    b.append(r, go);
  });
}

/* ================= live updates ================= */
function subscribe(){
  S.rt=sb.channel("bt-live")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"bt_messages"},async ({new:m})=>{
      await ensureProfiles([m.user_id]);
      const mine=m.user_id===S.me.id;
      if(!mine) markDelivered(m.conversation_id);
      if(m.conversation_id===S.cur){
        const ex=S.msgs.find(x=>x.id===m.id);
        if(ex){ Object.assign(ex,{ created_at:m.created_at, _pending:false, _failed:false }); renderMsgs(); }
        else if(S.detached){ if(!mine) S.awayCount++; updateJump(); }
        else {
          const row={...m, rx:{}}; await hydrate([row]);
          S.msgs.push(row);
          const box=$("msgs"); const far=box.scrollHeight-box.scrollTop-box.clientHeight>160;
          if(far && !mine) S.awayCount++;
          renderMsgs();
        }
        if(viewing(m.conversation_id)) markRead();
      }
      if(!mine && m.kind!=="system" && !viewing(m.conversation_id)){
        S.unread[m.conversation_id]=(S.unread[m.conversation_id]||0)+1;
        const me=S.profile.username; const isMention=new RegExp("@"+me.replace(/\./g,"\\.")+"(?![a-z0-9_.])","i").test(m.content||"");
        if(isMention) S.mentions[m.conversation_id]=(S.mentions[m.conversation_id]||0)+1;
        const c=S.convs.find(x=>x.id===m.conversation_id); const n=myMember(c)?.notify||"all";
        if(prefs.sound && !S.blocks.has(m.user_id) && (n==="all" || (n==="mentions" && isMention))) blip();
      }
      bumpConv(m);
      if(m.kind==="system") reloadConvs();
    })
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bt_messages"},({new:m})=>{ const ex=S.msgs.find(x=>x.id===m.id); if(ex){ ex.content=m.content; ex.edited_at=m.edited_at; renderMsgs(); } })
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"bt_messages"},({old})=>{ if(old?.id && S.msgs.some(x=>x.id===old.id)){ S.msgs=S.msgs.filter(x=>x.id!==old.id); renderMsgs(); } if(S.pins.some(p=>p.message_id===old?.id)){ S.pins=S.pins.filter(p=>p.message_id!==old.id); renderPinned(); } })
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"bt_reactions"},({new:r})=>{ const m=S.msgs.find(x=>x.id===r.message_id); if(m){ addRx(m,r.emoji,r.user_id); renderMsgs(); } })
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"bt_reactions"},({old:r})=>{ const m=S.msgs.find(x=>x.id===r?.message_id); if(m){ delRx(m,r.emoji,r.user_id); renderMsgs(); } })
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"bt_poll_votes"},({new:v})=>{ const l=S.votes[v.poll_id] ||= []; if(!l.some(x=>x.user_id===v.user_id && x.option_idx===v.option_idx)){ l.push(v); if(S.msgs.some(x=>x.id===v.poll_id)) renderMsgs(); } })
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"bt_poll_votes"},({old:v})=>{ if(!S.votes[v?.poll_id]) return; S.votes[v.poll_id]=S.votes[v.poll_id].filter(x=>!(x.user_id===v.user_id && x.option_idx===v.option_idx)); if(S.msgs.some(x=>x.id===v.poll_id)) renderMsgs(); })
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"bt_polls"},({new:p})=>{ S.polls[p.message_id]=p; if(S.msgs.some(x=>x.id===p.message_id)) renderMsgs(); })
    .on("postgres_changes",{event:"*",schema:"public",table:"bt_pins"},(e)=>{ const cid=(e.new||e.old)?.conversation_id; if(cid && cid===S.cur) loadPins(cid); })
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bt_members"},({new:m})=>{
      const c=S.convs.find(x=>x.id===m.conversation_id); const ex=c?.bt_members.find(x=>x.user_id===m.user_id);
      if(!ex){ reloadConvs(); return; }
      const roleChanged=ex.role!==m.role; Object.assign(ex,m);
      if(m.user_id===S.me.id){ sortConvs(); renderChats(); renderBadges(); }
      if(c.id===S.cur){ renderMsgs(); if(roleChanged) renderChatHead(); }
    })
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"bt_members"},reloadConvs)
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"bt_members"},reloadConvs)
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bt_conversations"},({new:c})=>{ const x=S.convs.find(y=>y.id===c.id); if(x){ Object.assign(x,c); sortConvs(); renderChats(); renderBadges(); if(S.cur===c.id) renderChatHead(); } else reloadConvs(); })
    .on("postgres_changes",{event:"*",schema:"public",table:"bt_friendships"},reloadSocial)
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"bt_calls"},({new:c})=>onCallInsert(c))
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bt_calls"},({new:c})=>onCallUpdate(c))
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bt_profiles"},({new:p})=>{
      if(!S.P[p.id]) return;
      const old=S.P[p.id]; S.P[p.id]=p;
      if(p.id===S.me.id){ S.profile=p; renderMe(); return; }
      if(old.last_seen_at!==p.last_seen_at && old.display_name===p.display_name && old.avatar_url===p.avatar_url && old.status===p.status) { if(S.tab==="friends") renderFriends(); if(S.cur) renderChatHead(); return; }
      renderAll();
    })
    .subscribe((status)=>{
      if(status==="SUBSCRIBED"){ if(S.subscribedOnce) resync(); S.subscribedOnce=true; setOffline(false); }
      if(status==="CHANNEL_ERROR"||status==="TIMED_OUT") setOffline(!navigator.onLine);
    });
}
async function resync(){
  try{ await Promise.all([loadConvs(), loadSocial()]); if(S.cur && !S.detached) await loadMessages(S.cur); flushOutbox(); }catch{}
}
function subscribePresence(){
  S.pres=sb.channel("bt-online",{ config:{ presence:{ key:S.me.id } } });
  S.pres.on("presence",{event:"sync"},()=>{
    S.peers=S.pres.presenceState();
    renderTyping(); renderChats(); if(S.tab==="friends") renderFriends(); if(S.cur) renderChatHead();
  }).subscribe(async(st)=>{ if(st==="SUBSCRIBED") await S.pres.track({ ch:S.cur, typing:false }); });
}
function renderTyping(){
  const box=$("typing"); box.replaceChildren(); if(!S.cur) return;
  const ids=Object.entries(S.peers).filter(([uid,metas])=>uid!==S.me.id && !S.blocks.has(uid) && metas.some(x=>x.typing && x.ch===S.cur)).map(([uid])=>uid);
  if(!ids.length) return;
  const names=ids.map(firstName);
  const who=names.length===1?names[0]:names.length===2?names.join(" and "):"Several people";
  box.append(h("i",{},h("b"),h("b"),h("b")), h("span",{textContent:`${who} ${names.length===1?"is":"are"} typing…`}));
}
function renderAll(){ renderChats(); renderFriends(); renderBadges(); if(S.cur){ renderChatHead(); renderMsgs(); } }
let seenTimer=null;
function touchSeen(){ if(!S.me || S.offline) return; sb.from("bt_profiles").update({ last_seen_at:new Date().toISOString() }).eq("id",S.me.id).then(()=>{}); }

/* ================= calls (1:1 voice + video) ================= */
const ICE=[{ urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302","stun:stun.cloudflare.com:3478"] }];
const C={ call:null, role:null, pc:null, ch:null, local:null, remote:null, video:false, muted:false, camOff:false, remoteCamOff:false, facing:"user", startedAt:null, timers:[], pendingIce:[], tone:null, peer:null, state:null, wantReady:false, readyTimer:null };
function buildCallUI(){
  const ui=$("callUI"); if(ui.dataset.built) return; ui.dataset.built="1";
  ui.append(h("video",{id:"remoteVideo",autoplay:true,playsInline:true,muted:true}), h("video",{id:"localVideo",autoplay:true,playsInline:true,muted:true}), h("audio",{id:"remoteAudio",autoplay:true}), h("div",{className:"call-info",id:"callInfo"}), h("div",{className:"call-btns",id:"callBtns"}));
}
function callStatusText(){
  if(C.state==="incoming") return C.video?"Incoming video call…":"Incoming voice call…";
  if(C.state==="outgoing") return "Calling…";
  if(C.state==="connecting") return "Connecting…";
  if(C.state==="active" && C.startedAt) return durStr((Date.now()-C.startedAt)/1000);
  return "";
}
function tickCall(){ const el=$("callStatus"); if(el) el.textContent=callStatusText(); }
function showCall(state){
  buildCallUI(); C.state=state;
  const ui=$("callUI"); ui.hidden=false;
  ui.classList.toggle("video", C.video); ui.classList.toggle("live", state==="active");
  ui.classList.toggle("cam-off", C.camOff); ui.classList.toggle("remote-off", C.remoteCamOff);
  const live=state==="active" && C.video;
  const info=$("callInfo"); info.replaceChildren(h("span",{className:state==="active"?"":"pulse"}, avatar(C.peer, live?36:112)), h("div",{}, h("h2",{textContent:nameOf(C.peer)}), h("div",{className:"st",id:"callStatus",textContent:callStatusText()})));
  const btns=$("callBtns"); btns.replaceChildren();
  const B=(icon,label,cls,fn)=>{ const b=h("button",{className:cls||"",type:"button","aria-label":label}, svg(icon)); b.onclick=fn; return h("label",{}, b, label); };
  if(state==="incoming"){
    btns.append(B("i-hangup","Decline","red",declineCall));
    if(C.video) btns.append(B("i-video","Video","green",()=>acceptCall(true)));
    btns.append(B("i-phone",C.video?"Audio only":"Accept","green",()=>acceptCall(false)));
  } else {
    btns.append(B(C.muted?"i-mic-off":"i-mic", C.muted?"Unmute":"Mute", C.muted?"on":"", toggleMute));
    if(C.video && C.local?.getVideoTracks().length){ btns.append(B(C.camOff?"i-video-off":"i-video", C.camOff?"Camera on":"Camera off", C.camOff?"on":"", toggleCam), B("i-flip","Flip","",flipCam)); }
    btns.append(B("i-hangup","End","red",()=>endCall()));
  }
  const lv=$("localVideo"); if(C.local && lv.srcObject!==C.local) lv.srcObject=C.local;
}
let toneCtx=null;
function playTone(kind){
  stopTone();
  try{
    toneCtx ||= new (window.AudioContext||window.webkitAudioContext)(); toneCtx.resume?.();
    const beep=()=>{
      const t=toneCtx.currentTime, o=toneCtx.createOscillator(), g=toneCtx.createGain();
      o.frequency.value = kind==="ring" ? 660 : 425;
      g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.12,t+0.03); g.gain.setValueAtTime(0.12,t+0.85); g.gain.exponentialRampToValueAtTime(0.0001,t+1);
      o.connect(g).connect(toneCtx.destination); o.start(t); o.stop(t+1.05);
      if(kind==="ring"){ const o2=toneCtx.createOscillator(), g2=toneCtx.createGain(); o2.frequency.value=880; g2.gain.setValueAtTime(0.0001,t+0.15); g2.gain.exponentialRampToValueAtTime(0.08,t+0.2); g2.gain.exponentialRampToValueAtTime(0.0001,t+0.9); o2.connect(g2).connect(toneCtx.destination); o2.start(t+0.15); o2.stop(t+0.95); navigator.vibrate?.([300,200,300]); }
    };
    beep(); C.tone=setInterval(beep, kind==="ring"?2500:3500);
  }catch{}
}
function stopTone(){ clearInterval(C.tone); C.tone=null; try{ navigator.vibrate?.(0); }catch{} }
const getMedia = (video) => navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true }, video: video ? { facingMode:C.facing } : false });
async function startCall(video){
  const c=curConv(); if(!c || c.kind!=="dm") return;
  if(C.call){ toast("You're already in a call"); return; }
  if(R.joined){ toast("Leave the voice room first"); return; }
  if(!canPost(c)){ toast("You can only call friends"); return; }
  if(!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection){ toast("Calls aren't supported in this browser"); return; }
  C.peer=dmOther(c); C.video=video; C.role="caller"; C.camOff=false; C.muted=false; C.remoteCamOff=false;
  try{ C.local=await getMedia(video); }catch{ toast(video?"Allow camera and microphone to make video calls":"Allow microphone access to make calls"); C.peer=null; return; }
  const { data, error } = await sb.from("bt_calls").insert({ conversation_id:c.id, caller_id:S.me.id, video, status:"ringing" }).select().single();
  if(error){ C.local.getTracks().forEach(t=>t.stop()); C.local=null; toast(friendlyErr(error,"Couldn't start the call")); return; }
  C.call=data; openSignal(data.id); showCall("outgoing"); playTone("ringback");
  C.timers.push(setTimeout(()=>{ if(C.call?.id===data.id && C.call.status==="ringing") endCall(); }, 45000));
}
function openSignal(id){
  C.ch=sb.channel("btcall:"+id,{ config:{ private:true, broadcast:{ self:false } } });
  C.ch.on("broadcast",{ event:"sig" },({ payload })=>{ onSignal(payload).catch(()=>{}); });
  C.ch.subscribe((st)=>{ if(st==="SUBSCRIBED" && C.role==="callee" && C.wantReady) sendReady(); if(st==="CHANNEL_ERROR" && C.call) toast("Couldn't reach the call. Check your connection."); });
}
function sendSig(p){ C.ch?.send({ type:"broadcast", event:"sig", payload:{ ...p, from:S.me.id } }); }
function sendReady(){
  let n=0; sendSig({ type:"ready" }); clearInterval(C.readyTimer);
  C.readyTimer=setInterval(()=>{ if(C.pc?.remoteDescription || ++n>10 || !C.call){ clearInterval(C.readyTimer); return; } sendSig({ type:"ready" }); }, 1500);
}
function makePC(){
  const pc=new RTCPeerConnection({ iceServers:ICE });
  C.local.getTracks().forEach(t=>pc.addTrack(t,C.local));
  pc.onicecandidate=(e)=>{ if(e.candidate) sendSig({ type:"ice", candidate:e.candidate.toJSON() }); };
  pc.ontrack=(e)=>{
    C.remote=e.streams[0]||new MediaStream([e.track]);
    const rv=$("remoteVideo"), ra=$("remoteAudio"); rv.srcObject=C.remote; ra.srcObject=C.remote;
    rv.play?.().catch(()=>{}); ra.play?.().catch(()=>{});
  };
  pc.onconnectionstatechange=()=>{
    const st=pc.connectionState;
    if(st==="connected" && !C.startedAt){ C.startedAt=Date.now(); stopTone(); showCall("active"); C.timers.push(setInterval(tickCall,1000)); }
    if(st==="failed"){ toast("The call couldn't connect. One of you may be on a strict network."); endCall(); }
  };
  return pc;
}
function flushIce(){ for(const c of C.pendingIce.splice(0)) C.pc?.addIceCandidate(c).catch(()=>{}); }
async function onSignal(p){
  if(!C.call || p.from===S.me.id) return;
  if(p.type==="ready" && C.role==="caller" && !C.pc){
    C.pc=makePC(); const offer=await C.pc.createOffer(); await C.pc.setLocalDescription(offer); sendSig({ type:"offer", sdp:offer });
    if(C.state==="outgoing"){ stopTone(); showCall("connecting"); }
  } else if(p.type==="offer" && C.role==="callee"){
    if(!C.pc) C.pc=makePC();
    await C.pc.setRemoteDescription(p.sdp); const ans=await C.pc.createAnswer(); await C.pc.setLocalDescription(ans);
    sendSig({ type:"answer", sdp:ans }); flushIce(); clearInterval(C.readyTimer);
  } else if(p.type==="answer" && C.role==="caller" && C.pc && !C.pc.remoteDescription){
    await C.pc.setRemoteDescription(p.sdp); flushIce();
  } else if(p.type==="ice"){
    if(C.pc?.remoteDescription) C.pc.addIceCandidate(p.candidate).catch(()=>{}); else C.pendingIce.push(p.candidate);
  } else if(p.type==="cam"){ C.remoteCamOff=!p.on; showCall(C.state); }
  else if(p.type==="bye"){ cleanupCall(); }
}
function onCallInsert(c){
  if(!S.me || c.caller_id===S.me.id || c.status!=="ringing") return;
  if(Date.now()-Date.parse(c.created_at)>45000) return;
  if(C.call){ if(C.call.id!==c.id) sb.from("bt_calls").update({ status:"busy" }).eq("id",c.id).then(()=>{}); return; }
  if(R.joined){ sb.from("bt_calls").update({ status:"busy" }).eq("id",c.id).then(()=>{}); return; }
  C.call=c; C.role="callee"; C.video=c.video; C.peer=c.caller_id; C.camOff=false; C.muted=false; C.remoteCamOff=false;
  ensureProfiles([c.caller_id]).then(()=>{ if(C.call?.id===c.id && !C.state){ showCall("incoming"); playTone("ring"); } });
  C.timers.push(setTimeout(()=>{ if(C.call?.id===c.id && C.state==="incoming") cleanupCall(); }, 45000));
}
function onCallUpdate(c){
  if(!C.call || C.call.id!==c.id) return;
  C.call=c;
  if(["ended","missed","declined","busy"].includes(c.status)){
    const msg = C.role==="caller" ? ({ declined:"Call declined", busy:"They're on another call", missed:"No answer" }[c.status]) : (c.status==="missed" && C.state==="incoming" ? "Missed call" : "");
    if(msg && C.state!=="active") toast(msg);
    cleanupCall(); return;
  }
  if(c.status==="active" && C.role==="caller" && C.state==="outgoing"){ stopTone(); showCall("connecting"); }
}
async function acceptCall(withVideo){
  stopTone();
  if(!navigator.mediaDevices?.getUserMedia){ toast("Calls aren't supported in this browser"); declineCall(); return; }
  try{ C.local=await getMedia(withVideo); }catch{ toast("Allow microphone access to answer calls"); return; }
  if(C.video && !withVideo) C.camOff=true;
  const { error } = await sb.from("bt_calls").update({ status:"active" }).eq("id",C.call.id);
  if(error){ toast("That call has already ended"); cleanupCall(); return; }
  C.wantReady=true; openSignal(C.call.id); showCall("connecting");
}
async function declineCall(){
  const id=C.call?.id; cleanupCall();
  if(id) await sb.from("bt_calls").update({ status:"declined" }).eq("id",id);
}
async function endCall(){
  const call=C.call; if(!call) return cleanupCall();
  sendSig({ type:"bye" });
  const status = call.status==="ringing" ? "missed" : "ended";
  cleanupCall();
  await sb.from("bt_calls").update({ status }).eq("id",call.id);
}
function cleanupCall(){
  stopTone(); C.timers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); C.timers=[]; clearInterval(C.readyTimer);
  try{ C.pc?.close(); }catch{}
  C.local?.getTracks().forEach(t=>t.stop());
  if(C.ch) sb.removeChannel(C.ch);
  Object.assign(C,{ call:null, role:null, pc:null, ch:null, local:null, remote:null, startedAt:null, pendingIce:[], state:null, wantReady:false, peer:null });
  const ui=$("callUI"); ui.hidden=true;
  for(const id of ["remoteVideo","localVideo","remoteAudio"]){ const el=$(id); if(el) el.srcObject=null; }
}
function toggleMute(){ C.muted=!C.muted; C.local?.getAudioTracks().forEach(t=>t.enabled=!C.muted); showCall(C.state); }
function toggleCam(){
  const vt=C.local?.getVideoTracks(); if(!vt?.length) return;
  C.camOff=!C.camOff; vt.forEach(t=>t.enabled=!C.camOff); sendSig({ type:"cam", on:!C.camOff }); showCall(C.state);
}
async function flipCam(){
  if(!C.local?.getVideoTracks().length) return;
  C.facing = C.facing==="user" ? "environment" : "user";
  try{
    const ns=await navigator.mediaDevices.getUserMedia({ video:{ facingMode:C.facing } });
    const nt=ns.getVideoTracks()[0]; const old=C.local.getVideoTracks()[0];
    const sender=C.pc?.getSenders().find(s=>s.track?.kind==="video"); if(sender) await sender.replaceTrack(nt);
    C.local.removeTrack(old); old.stop(); C.local.addTrack(nt); nt.enabled=!C.camOff;
    $("localVideo").srcObject=null; $("localVideo").srcObject=C.local;
  }catch{ toast("Couldn't switch camera"); }
}

/* ================= group voice rooms ================= */
const R={ cid:null, joined:false, peers:{}, local:null, muted:false, chans:{}, state:{}, viewCid:null, pending:{} };
function ensureRoomChannel(cid){
  if(R.chans[cid]) return R.chans[cid];
  const ch=sb.channel("btroom:"+cid,{ config:{ private:true, presence:{ key:S.me.id }, broadcast:{ self:false } } });
  ch.on("presence",{ event:"sync" },()=>{ R.state[cid]=ch.presenceState(); onRoomPresence(cid); });
  ch.on("broadcast",{ event:"sig" },({ payload })=>{ if(R.joined && R.cid===cid) onRoomSig(payload).catch(()=>{}); });
  ch.subscribe(async(st)=>{ if(st==="SUBSCRIBED" && R.joined && R.cid===cid) await ch.track({ muted:R.muted }); });
  R.chans[cid]=ch; return ch;
}
function dropRoomChannel(cid){ const ch=R.chans[cid]; if(ch){ sb.removeChannel(ch); delete R.chans[cid]; delete R.state[cid]; } }
function watchRoom(cid){ if(R.viewCid && R.viewCid!==cid && R.viewCid!==R.cid) dropRoomChannel(R.viewCid); R.viewCid=cid; ensureRoomChannel(cid); renderRoomBar(); }
function unwatchRoom(){ if(R.viewCid && R.viewCid!==R.cid) dropRoomChannel(R.viewCid); R.viewCid=null; }
const roomIds = (cid) => Object.keys(R.state[cid]||{});
function onRoomPresence(cid){
  const ids=roomIds(cid);
  ensureProfiles(ids).then(()=>{ if(cid===R.viewCid) renderRoomBar(); renderRoomPill(); });
  if(R.joined && R.cid===cid){
    const others=ids.filter(id=>id!==S.me.id);
    for(const id of others) if(!R.peers[id] && S.me.id>id) roomOffer(id).catch(()=>{});
    for(const id of Object.keys(R.peers)) if(!others.includes(id)) closeRoomPeer(id);
  }
}
function roomPeer(id){
  const pc=new RTCPeerConnection({ iceServers:ICE });
  R.local.getTracks().forEach(t=>pc.addTrack(t,R.local));
  pc.onicecandidate=(e)=>{ if(e.candidate) roomSend({ to:id, type:"ice", candidate:e.candidate.toJSON() }); };
  pc.ontrack=(e)=>{ let a=document.getElementById("ra-"+id); if(!a){ a=h("audio",{id:"ra-"+id,autoplay:true}); document.body.append(a); } a.srcObject=e.streams[0]||new MediaStream([e.track]); a.play?.().catch(()=>{}); };
  pc.onconnectionstatechange=()=>{ if(pc.connectionState==="failed") closeRoomPeer(id); };
  const peer={ pc, ice:R.pending[id]||[] }; delete R.pending[id];
  R.peers[id]=peer; return peer;
}
async function roomOffer(id){ const p=roomPeer(id); const o=await p.pc.createOffer(); await p.pc.setLocalDescription(o); roomSend({ to:id, type:"offer", sdp:o }); }
function roomSend(p){ R.chans[R.cid]?.send({ type:"broadcast", event:"sig", payload:{ ...p, from:S.me.id } }); }
function flushRoom(peer){ for(const c of peer.ice.splice(0)) peer.pc.addIceCandidate(c).catch(()=>{}); }
async function onRoomSig(p){
  if(p.to!==S.me.id || !R.local) return;
  let peer=R.peers[p.from];
  if(p.type==="offer"){
    if(peer) closeRoomPeer(p.from);
    peer=roomPeer(p.from); await peer.pc.setRemoteDescription(p.sdp);
    const a=await peer.pc.createAnswer(); await peer.pc.setLocalDescription(a);
    roomSend({ to:p.from, type:"answer", sdp:a }); flushRoom(peer);
  } else if(p.type==="answer" && peer && !peer.pc.remoteDescription){ await peer.pc.setRemoteDescription(p.sdp); flushRoom(peer); }
  else if(p.type==="ice"){ if(peer?.pc.remoteDescription) peer.pc.addIceCandidate(p.candidate).catch(()=>{}); else if(peer) peer.ice.push(p.candidate); else (R.pending[p.from] ||= []).push(p.candidate); }
}
function closeRoomPeer(id){ const p=R.peers[id]; if(p){ try{ p.pc.close(); }catch{} delete R.peers[id]; } document.getElementById("ra-"+id)?.remove(); }
async function joinRoom(cid){
  if(C.call){ toast("Finish your call first"); return; }
  if(R.joined){ if(R.cid===cid) return; await leaveRoom(); }
  if(!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection){ toast("Voice rooms aren't supported in this browser"); return; }
  try{ R.local=await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true } }); }
  catch{ toast("Allow microphone access to join voice rooms"); return; }
  R.cid=cid; R.joined=true; R.muted=false;
  const ch=ensureRoomChannel(cid);
  try{ await ch.track({ muted:false }); }catch{}
  renderRoomBar(); renderRoomPill(); if(S.cur===cid) renderChatHead();
  toast("You joined the voice room");
}
async function leaveRoom(){
  if(!R.joined) return;
  const cid=R.cid;
  try{ await R.chans[cid]?.untrack(); }catch{}
  Object.keys(R.peers).forEach(closeRoomPeer);
  R.local?.getTracks().forEach(t=>t.stop());
  R.joined=false; R.cid=null; R.local=null; R.pending={};
  if(cid!==R.viewCid) dropRoomChannel(cid);
  renderRoomBar(); renderRoomPill(); if(S.cur) renderChatHead();
}
async function toggleRoomMute(){
  R.muted=!R.muted; R.local?.getAudioTracks().forEach(t=>t.enabled=!R.muted);
  try{ await R.chans[R.cid]?.track({ muted:R.muted }); }catch{}
  renderRoomPill();
}
function roomStack(cid, max=5){
  const st=h("div",{className:"stack"});
  roomIds(cid).slice(0,max).forEach(id=>st.append(avatar(id,26)));
  return st;
}
function renderRoomBar(){
  const bar=$("roomBar"); const cid=R.viewCid;
  if(!cid || S.cur!==cid){ bar.hidden=true; return; }
  const ids=roomIds(cid); const inRoom=R.joined && R.cid===cid;
  if(!ids.length && !inRoom){ bar.hidden=true; return; }
  const btn=h("button",{className:"pill "+(inRoom?"danger":"primary"),textContent:inRoom?"Leave":"Join"});
  btn.onclick=()=> inRoom ? leaveRoom() : joinRoom(cid);
  const names=ids.slice(0,3).map(id=>id===S.me.id?"You":firstName(id)).join(", ")+(ids.length>3?` +${ids.length-3}`:"");
  bar.replaceChildren(svg("i-headset"), h("div",{className:"t",textContent:`Voice room · ${names}`}), roomStack(cid), btn);
  bar.hidden=false;
}
function renderRoomPill(){
  const pill=$("roomPill");
  if(!R.joined){ pill.hidden=true; return; }
  const c=S.convs.find(x=>x.id===R.cid); const n=roomIds(R.cid).length||1;
  const t=h("span",{className:"t",textContent:`Voice room · ${c?.name||"Group"} · ${n} in`}); t.onclick=()=>{ setTab("chats"); openConv(R.cid); };
  const mute=h("button",{type:"button","aria-label":R.muted?"Unmute":"Mute"}, svg(R.muted?"i-mic-off":"i-mic")); mute.onclick=toggleRoomMute;
  const lv=h("button",{type:"button",className:"red","aria-label":"Leave voice room"}, svg("i-hangup")); lv.onclick=leaveRoom;
  pill.replaceChildren(svg("i-headset"), t, mute, lv); pill.hidden=false;
}
window.addEventListener("pagehide",()=>{ if(C.call) endCall(); if(R.joined) leaveRoom(); });

/* ================= offline cache ================= */
let saveTimer=null;
function scheduleSave(){ clearTimeout(saveTimer); saveTimer=setTimeout(saveCache,1500); }
function saveCache(){
  if(!S.me || !S.profile) return;
  const cache=store(ukey("bt-cache"))||{ msgs:{} };
  cache.convs=S.convs; cache.P=S.P; cache.nick=S.nick; cache.blocks=[...S.blocks]; cache.friendships=S.friendships;
  cache.unread=S.unread; cache.mentions=S.mentions; cache.profile=S.profile; cache.at=Date.now();
  if(S.cur && !S.detached){ cache.msgs[S.cur]=S.msgs.filter(m=>!m._pending && !m._failed).slice(-50).map(({_local,...m})=>m); }
  const keep=new Set(S.convs.slice(0,25).map(c=>c.id)); for(const k of Object.keys(cache.msgs)) if(!keep.has(k)) delete cache.msgs[k];
  try{ localStorage.setItem(ukey("bt-cache"), JSON.stringify(cache)); }
  catch{ cache.msgs={}; store(ukey("bt-cache"), cache); }
}
function loadCache(){
  const c=store(ukey("bt-cache")); if(!c) return false;
  S.convs=c.convs||[]; S.P=Object.assign({}, c.P||{}, S.P); S.nick=c.nick||{}; S.blocks=new Set(c.blocks||[]);
  S.friendships=c.friendships||[]; S.unread=c.unread||{}; S.mentions=c.mentions||{};
  sortConvs(); return true;
}
function paintFromCache(cid){
  const c=store(ukey("bt-cache")); const list=c?.msgs?.[cid]; if(!list?.length) { paint(); return; }
  S.msgs=list.map(m=>({...m, rx:m.rx||{}}));
  for(const o of S.outbox.filter(o=>o.conversation_id===cid)) if(!S.msgs.some(m=>m.id===o.id)) S.msgs.push({...o, rx:{}, _pending:true});
  paint(); $("msgs").scrollTop=$("msgs").scrollHeight;
}
function setOffline(v){ S.offline=v; $("offlineBar").hidden=!v; }
window.addEventListener("online",()=>{ setOffline(false); resync(); });
window.addEventListener("offline",()=>setOffline(true));

/* ================= deep links ================= */
function readDeepLink(){
  const q=new URLSearchParams(location.search);
  const d={ join:q.get("join"), add:q.get("add"), c:q.get("c"), tab:q.get("tab"), dm:q.get("dm"), call:q.get("call") };
  if(d.join||d.add||d.c||d.tab||d.dm||d.call){ S.deep=d; history.replaceState(null,"",BASE); }
}
async function handleDeepLink(){
  const d=S.deep; S.deep=null; if(!d) return;
  if(d.tab==="friends") setTab("friends");
  if(d.c && S.convs.some(c=>c.id===d.c)) openConv(d.c);
  if(d.join && /^[a-z0-9]{6,32}$/i.test(d.join)) joinPreview(d.join.toLowerCase());
  if(d.dm && /^[0-9a-f-]{36}$/.test(d.dm) && isFriend(d.dm)) openDM(d.dm);
  if(d.call && /^[0-9a-f-]{36}$/.test(d.call)){ const { data } = await sb.from("bt_calls").select("*").eq("id",d.call).maybeSingle(); if(data) onCallInsert(data); }
  if(d.add && USER_RE.test(d.add.toLowerCase())){
    const { data } = await sb.from("bt_profiles").select("*").eq("username",d.add.toLowerCase()).maybeSingle();
    if(data){ S.P[data.id]=data; openProfile(data.id); } else toast("No one has the username @"+d.add);
  }
}
navigator.serviceWorker?.addEventListener("message",(e)=>{ if(e.data?.type==="open" && e.data.url){ const u=new URL(e.data.url, BASE); const c=u.searchParams.get("c"); const call=u.searchParams.get("call"); if(call) sb.from("bt_calls").select("*").eq("id",call).maybeSingle().then(({data})=>{ if(data) onCallInsert(data); }); const dm=u.searchParams.get("dm"); if(dm && isFriend(dm)) openDM(dm); if(c && S.convs.some(x=>x.id===c)){ setTab("chats"); openConv(c); } else if(u.searchParams.get("tab")==="friends") setTab("friends"); } });

/* ================= boot ================= */
async function enter(){
  if(!S.me.email_confirmed_at){ const email=S.me.email; await sb.auth.signOut(); showMail(email); return; }
  S.outbox=store(ukey("bt-outbox"))||[]; S.drafts=store(ukey("bt-drafts"))||{};
  const cached=store(ukey("bt-cache"));
  if(cached?.profile && !navigator.onLine){
    S.profile=S.P[S.me.id]=cached.profile; loadCache();
    show("app"); renderMe(); setTab("chats"); renderChats(); renderFriends(); renderBadges(); setOffline(true);
    return;
  }
  const { data:prof, error } = await sb.from("bt_profiles").select("*").eq("id",S.me.id).maybeSingle();
  if(error && cached?.profile){ S.profile=S.P[S.me.id]=cached.profile; loadCache(); show("app"); renderMe(); setTab("chats"); renderChats(); setOffline(true); return; }
  if(!prof){
    const meta=S.me.user_metadata||{};
    $("stDisplay").value=meta.bt_display_name||""; $("stUser").value=meta.bt_username||"";
    if($("stUser").value) $("stUser").dispatchEvent(new Event("input"));
    show("setupScreen"); return;
  }
  const { data:ban } = await sb.from("bt_bans").select("reason").eq("user_id",S.me.id).maybeSingle();
  if(ban){ $("bannedText").textContent = ban.reason ? "Reason: "+ban.reason : "An admin has banned this account from Beaver Transceiver."; show("bannedScreen"); return; }
  S.profile=S.P[prof.id]=prof;
  if(loadCache()){ S.P[prof.id]=prof; }
  show("app"); renderMe(); setTab(S.deep?.tab==="friends"?"friends":"chats"); renderChats(); renderBadges();
  try{ await Promise.all([loadSocial(), loadConvs()]); setOffline(false); }catch{ setOffline(true); }
  if(!S.rt) subscribe();
  if(!S.pres) subscribePresence();
  flushOutbox();
  touchSeen(); clearInterval(seenTimer); seenTimer=setInterval(()=>{ if(!document.hidden) touchSeen(); }, 120e3);
  handleDeepLink();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
}
function leave(){
  try{ if(C.call) cleanupCall(); if(R.joined) leaveRoom(); Object.keys(R.chans).forEach(dropRoomChannel); }catch{}
  S.rt && sb.removeChannel(S.rt); S.pres && sb.removeChannel(S.pres); clearInterval(seenTimer);
  Object.assign(S,{ me:null, profile:null, P:{}, nick:{}, blocks:new Set(), friendships:[], convs:[], unread:{}, mentions:{}, cur:null, msgs:[], peers:{}, rt:null, pres:null, subscribedOnce:false, outbox:[], drafts:{} });
  closeSheet(); document.body.dataset.view="home";
  if($("mailScreen").hidden){ show("authScreen"); setMode("in"); }
}
readDeepLink();
let currentUid=null;
sb.auth.onAuthStateChange((event, session)=>{
  if(event==="PASSWORD_RECOVERY") setTimeout(newPasswordSheet, 500);
  if(event==="USER_UPDATED" && session?.user && S.me){ S.me=session.user; if(S.profile) renderSettings(); }
  const uid=session?.user?.id||null;
  if(uid===currentUid) return;
  currentUid=uid;
  setTimeout(()=>{ if(uid){ S.me=session.user; enter(); } else leave(); },0);
});
sb.auth.getSession().then(({data})=>{ if(!data.session && currentUid===null) show("authScreen"); });
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){ stopTyping(); saveDraft(); touchSeen(); saveCache(); }
  else if(S.me && S.profile && !S.offline){ touchSeen(); loadConvs().catch(()=>{}); if(S.cur && document.body.dataset.view==="chat") markRead(); }
});
})();
