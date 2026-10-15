/* ---------- Utilidades ---------- */
const $ = (s, r) => (r || document).querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }
// Texto plano a partir de las descripciones de Riot, que traen etiquetas HTML
function plain(s) { return String(s == null ? "" : s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(); }

function initials(name) {
  const parts = name.replace(/'/g, "").split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.replace(/'/g, "").slice(0, 2)).toUpperCase();
}
// Insignia con iniciales: se ve mientras llega la imagen oficial y si esta no carga
function badge(c, size) {
  return '<svg class="badge" width="' + size + '" height="' + size + '" viewBox="0 0 48 48" aria-hidden="true">' +
    '<polygon points="24,2 43,13 43,35 24,46 5,35 5,13" fill="var(--surface-2)" stroke="var(--accent)" stroke-width="2"/>' +
    '<text x="24" y="30" text-anchor="middle" font-family="Marcellus, serif" font-size="' + (initials(c.name).length > 1 ? 16 : 18) + '" fill="var(--fg)">' + esc(initials(c.name)) + '</text></svg>';
}
function roleIcon(id) {
  const r = ROLES.find(x => x.id === id);
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + r.p + '</svg>';
}
// Una imagen que falle se oculta y deja visible el texto o la insignia que hay debajo
document.addEventListener("error", e => {
  const t = e.target;
  if (t && t.tagName === "IMG") t.classList.add("broken");
}, true);

/* ---------- Pestañas ---------- */
function showTab(t) {
  const isBuilds = t !== "stats";
  $("#view-builds").hidden = !isBuilds;
  $("#view-stats").hidden = isBuilds;
  $("#tab-builds").setAttribute("aria-selected", String(isBuilds));
  $("#tab-stats").setAttribute("aria-selected", String(!isBuilds));
  if (!isBuilds) renderStats();
  try { history.replaceState(null, "", "#" + (isBuilds ? "builds" : "stats")); } catch (e) { /* ignorar */ }
}
document.querySelector(".tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-tab]");
  if (b) showTab(b.dataset.tab);
});

/* ---------- Catálogo oficial de Riot (Data Dragon) ---------- */
const DD_ROOT = "https://ddragon.leagueoflegends.com/";
const DD_CACHE = "minion-dd-v2";
let DD = null;            // datos reducidos de Data Dragon (o null si no cargaron)
let RES = null;           // resolvedor de nombres a imágenes
let CAT = [];             // campeones, ordenados por nombre
let CATMAP = {};          // id en minúsculas -> campeón
let ddState = "loading";  // loading | ok | fail
const DETAIL = {};        // id en minúsculas -> habilidades y consejos de Riot, "loading" o "fail"

function setCatalog() {
  CAT = Catalog.buildCatalog(DD);
  CATMAP = {};
  CAT.forEach(c => { CATMAP[c.k] = c; });
}

function ddFetch(url, ms) {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), ms || 12000) : null;
  return fetch(url, ctl ? { signal: ctl.signal } : undefined)
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .finally(() => { if (timer) clearTimeout(timer); });
}

async function loadDD() {
  let cached = null;
  try { cached = JSON.parse(lsGet(DD_CACHE) || "null"); } catch (e) { cached = null; }
  let v = null;
  try { v = (await ddFetch(DD_ROOT + "api/versions.json"))[0]; } catch (e) { v = null; }
  if (v && cached && cached.v === v && cached.dd) return cached.dd;
  if (!v) return cached && cached.dd ? cached.dd : null; // sin conexión: se usa la copia guardada, si hay
  try {
    const B = DD_ROOT + "cdn/" + v + "/data/";
    const soft = p => ddFetch(B + p).catch(() => null);
    const parts = await Promise.all([
      ddFetch(B + "es_MX/champion.json"), soft("en_US/item.json"), soft("es_MX/item.json"),
      soft("en_US/runesReforged.json"), soft("es_MX/runesReforged.json"), soft("es_MX/summoner.json")
    ]);
    const dd = Catalog.reduceDD({ version: v, champion: parts[0], itemEn: parts[1], itemEs: parts[2], runesEn: parts[3], runesEs: parts[4], summoner: parts[5] });
    if (!dd || !dd.champs.length) throw new Error("catálogo vacío");
    lsSet(DD_CACHE, JSON.stringify({ v: v, dd: dd }));
    return dd;
  } catch (e) {
    return cached && cached.dd ? cached.dd : null;
  }
}

// Habilidades y consejos del campeón (se piden solo al elegirlo)
function ensureDetail(c) {
  if (!RES || !c.online || !c.id || DETAIL[c.k]) return;
  DETAIL[c.k] = "loading";
  ddFetch(RES.detailUrl(c.id)).then(j => {
    const d = j && j.data && (j.data[c.id] || j.data[Object.keys(j.data)[0]]);
    DETAIL[c.k] = d && typeof d === "object" ? d : "fail";
  }).catch(() => { DETAIL[c.k] = "fail"; }).then(() => {
    if (S.champ === c.k && ddState === "ok") renderBuild();
  });
}

/* ---------- Piezas de la interfaz ---------- */
function icoImg(src, px, cls) {
  return '<img class="ico' + (cls ? " " + cls : "") + '" src="' + esc(src) + '" alt="" width="' + px + '" height="' + px + '" loading="lazy">';
}
function avatar(c, size) {
  const px = size === "l" ? 96 : 32;
  const src = RES && c.online && c.img ? RES.champImg(c.img) : "";
  return '<span class="av av-' + size + '">' + badge(c, px) +
    (src ? '<img src="' + esc(src) + '" alt="" width="' + px + '" height="' + px + '"' + (size === "l" ? "" : ' loading="lazy"') + ">" : "") + "</span>";
}
// Objeto con su imagen y nombre en español; si no se encuentra, solo el texto
function itemInner(name) {
  const r = RES ? RES.item(name) : null;
  return (r ? icoImg(r.img, 32) : "") + "<span>" + esc(r ? r.name : name) + "</span>";
}
function itemChip(name, tag, core) {
  const r = RES ? RES.item(name) : null;
  return '<span class="item' + (core ? " core" : "") + '">' + (r ? icoImg(r.img, 32) : "") + "<span>" +
    (tag !== "" && tag != null ? "<small>" + esc(tag) + "</small>" : "") + esc(r ? r.name : name) + "</span></span>";
}
function itemPath(b) {
  return '<ul class="path"><li><span class="item"><small>Inicio</small>' + b.start.map(itemInner).join(" + ") + "</span></li>" +
    "<li>" + itemChip(b.boots, "Botas") + "</li>" + b.core.map((n, i) => "<li>" + itemChip(n, i + 1, true) + "</li>").join("") + "</ul>";
}
function itemList(arr) {
  return '<ul class="path">' + arr.map((n, i) => "<li>" + itemChip(n, i + 1, true) + "</li>").join("") + "</ul>";
}
function spellList(names) {
  return '<ul class="path spells">' + names.map(n => {
    const s = RES ? RES.spell(n) : null;
    return '<li><span class="item">' + (s ? icoImg(s.img, 32) : "") + "<span>" + esc(s ? s.name : n) + "</span></span></li>";
  }).join("") + "</ul>";
}
function runeLi(name) {
  const r = RES ? RES.rune(name) : null;
  return r ? '<li class="rn">' + icoImg(r.img, 28, "rune") + "<span>" + esc(r.name) + "</span></li>"
    : '<li class="rn txt"><span>' + esc(name) + "</span></li>";
}
function keystone(name) {
  const r = RES ? RES.rune(name) : null;
  return '<div class="ks">' + (r ? icoImg(r.img, 56, "rune") : "") + '<p class="key">' + esc(r ? r.name : name) + "</p></div>";
}
function runeBlock(r) {
  const main = Catalog.parseTreeLine(r.main), sec = Catalog.parseTreeLine(r.sec);
  const mt = RES ? RES.tree(main.tree) : null, st = RES ? RES.tree(sec.tree) : null;
  return '<div class="runes"><h3>Runas</h3>' + keystone(r.key) +
    '<p class="lbl">Árbol principal · ' + esc(mt ? mt.name : main.tree) + '</p><ul class="rl">' + main.runes.map(runeLi).join("") + "</ul>" +
    '<p class="lbl">Árbol secundario · ' + esc(st ? st.name : sec.tree) + '</p><ul class="rl">' + sec.runes.map(runeLi).join("") + "</ul></div>";
}
function abilitiesHtml(c) {
  const d = DETAIL[c.k];
  if (!d || typeof d !== "object") return d === "loading" ? '<p class="note">Cargando habilidades…</p>' : "";
  const cards = [];
  if (d.passive && d.passive.name) {
    cards.push(["Pasiva", d.passive.name, d.passive.description, d.passive.image && RES.passiveImg(d.passive.image.full)]);
  }
  (d.spells || []).forEach((s, i) => cards.push([["Q", "W", "E", "R"][i] || "", s.name, s.description, s.image && RES.abilityImg(s.image.full)]));
  if (!cards.length) return "";
  return '<div><h3>Habilidades</h3><ul class="abil">' + cards.map(a =>
    '<li class="ab">' + (a[3] ? icoImg(a[3], 44) : "<span></span>") + "<b>" + esc(a[0]) + " · " + esc(a[1]) + "</b><p>" + esc(plain(a[2])) + "</p></li>").join("") + "</ul></div>";
}
function riotTips(c) {
  const d = DETAIL[c.k];
  const tips = d && typeof d === "object" ? (d.allytips || []).map(plain).filter(Boolean).slice(0, 3) : [];
  return tips.length ? '<div class="tipbox"><h3>Consejos de Riot para jugar con ' + esc(c.name) + "</h3><ul class=\"tips\">" + tips.map(t => "<li>" + esc(t) + "</li>").join("") + "</ul></div>" : "";
}

/* ---------- Builds ---------- */
const S = { mode: "sr", role: "mid", champ: "ahri", q: "", brole: "", v: 0 }; // brole: línea elegida en la build; v: variante 0-2

function champsForRole(role) { return CAT.filter(c => c.roles.indexOf(role) >= 0); }
function visibleChamps() {
  const q = Catalog.norm(S.q);
  const base = S.mode === "sr" && S.role ? champsForRole(S.role) : CAT;
  return base.filter(c => !q || Catalog.norm(c.name).indexOf(q) >= 0);
}
function ensureValid() {
  if (S.champ && !CATMAP[S.champ]) S.champ = CATMAP.ahri ? "ahri" : (CAT[0] ? CAT[0].k : S.champ);
  if (S.mode === "sr" && S.role) {
    const c = CATMAP[S.champ];
    if (c && c.roles.indexOf(S.role) < 0) {
      const list = champsForRole(S.role);
      if (list.length) S.champ = list[0].k;
    }
  }
}
function ddNote() {
  if (ddState === "loading") return "Cargando el catálogo oficial de Riot…";
  if (ddState === "fail") return "No se pudo cargar el catálogo de Riot: solo se muestran los campeones con build detallada y sin imágenes. Recarga la página para reintentar.";
  return "Datos e imágenes de Riot (Data Dragon " + DD.v + "). ★ = build detallada; el resto usa una build base de su clase.";
}

function renderPicker() {
  $("#modes").innerHTML = MODES.map(m =>
    '<button type="button" data-mode="' + m.id + '" aria-pressed="' + (S.mode === m.id) + '">' + m.n + "</button>").join("");
  const sr = S.mode === "sr";
  $("#roles").innerHTML = '<button type="button" class="chip" data-role="" aria-pressed="' + (sr && !S.role) + '"' + (sr ? "" : " disabled") + ">Todas</button>" + ROLES.map(r =>
    '<button type="button" class="chip" data-role="' + r.id + '" aria-pressed="' + (sr && S.role === r.id) + '"' + (sr ? "" : " disabled") + ">" +
    roleIcon(r.id) + r.n + "</button>").join("");
  $("#rolenote").hidden = sr;
  const list = visibleChamps();
  $("#champs").innerHTML = list.length ? list.map(c =>
    '<button type="button" class="champ" data-champ="' + c.k + '" aria-pressed="' + (S.champ === c.k) + '">' +
    avatar(c, "s") + '<span class="nm">' + esc(c.name) + "</span>" + (c.curated ? '<span class="star" title="Build detallada">★</span>' : "") + "</button>").join("") :
    '<p class="empty">Ningún campeón coincide con la búsqueda.</p>';
  $("#ddnote").textContent = list.length + " campeones. " + ddNote();
}

function renderBuild() {
  const c = CATMAP[S.champ];
  if (!c) { $("#build").innerHTML = '<p class="note">Elige un campeón de la lista para ver su build.</p>'; return; }
  ensureDetail(c);
  const role = S.brole || S.role || c.main || c.roles[0] || "mid";
  const vnames = Catalog.variantNames(c, S.mode, role);
  if (S.v >= vnames.length) S.v = 0;
  const gb = Catalog.getBuild(c, S.mode, role, S.v), b = gb.b, base = gb.kind === "base";
  const splash = RES && c.online && c.id ? RES.splash(c.id) : "";
  const classes = Catalog.classText(c);

  let html = '<div class="bhead">' + (splash ? '<img class="splash" src="' + esc(splash) + '" alt="">' : "") + avatar(c, "l") +
    '<div class="t"><h2>' + esc(c.name) + "</h2><p>" + esc(c.title) + "</p>" +
    '<div class="tags"><span class="tag kind">' + (base ? "Build base de clase" : "Build detallada ★") + "</span>" +
    '<span class="tag">' + esc(MODE_NAME[S.mode]) + "</span>" +
    (S.mode === "sr" ? '<span class="tag">' + esc(ROLE_NAME[role]) + "</span>" : "") +
    '<span class="tag">' + esc(classes || DMG[c.dmg]) + '</span><span class="tag">' + esc(DIFF[c.diff]) + "</span></div></div></div>";

  if (S.mode === "sr") {
    html += '<div class="vrow" role="group" aria-label="Línea de la build">' + ROLES.map(r =>
      '<button type="button" class="chip" data-brole="' + r.id + '" aria-pressed="' + (role === r.id) + '">' + roleIcon(r.id) + r.n +
      (c.roles.indexOf(r.id) < 0 ? '<small title="Línea poco habitual para este campeón">*</small>' : "") + "</button>").join("") + "</div>";
    if (c.roles.indexOf(role) < 0) html += '<p class="note">* Línea poco habitual para ' + esc(c.name) + ": la build se adapta a su clase y es solo orientativa.</p>";
  }
  html += '<div class="vrow" role="group" aria-label="Variante de la build">' + vnames.map((n, i) =>
    '<button type="button" class="chip vbtn" data-v="' + i + '" aria-pressed="' + (S.v === i) + '"><b>' + (i + 1) + "</b> " + esc(n) + "</button>").join("") + "</div>";

  if (base) {
    html += '<p class="note basenote">Esta es una build base para ' + esc(b.label) + ". Sirve como punto de partida, pero no está ajustada a las habilidades de " +
      esc(c.name) + ". Las builds detalladas, hechas a mano para cada campeón, se marcan con ★ en la lista." +
      (c.estRoles && S.mode === "sr" ? " Su línea se estimó según su clase." : "") + "</p>";
  }

  if (S.mode === "sr") {
    html += '<div class="cols">' + runeBlock(b.runes) +
      "<div><h3>Hechizos de invocador</h3>" + spellList(b.summs) +
      '<h3 class="sp">Orden de habilidades</h3><p class="m0">' + esc(b.skills) + "</p></div></div>";
    html += "<div><h3>Camino de objetos</h3>" + itemPath(b) + "</div>";
    html += '<div><h3>Situacionales</h3><ul class="sit">' +
      b.sit.map(s => "<li><b>" + itemInner(s[0]) + "</b><span>" + esc(s[1]) + "</span></li>").join("") + "</ul></div>";
  } else if (S.mode === "aram") {
    html += '<div class="cols"><div class="runes"><h3>Piedra clave</h3>' + keystone(b.key) +
      '<p class="note">Completa el resto de runas con las de tu línea habitual.</p>' +
      "<h3 class=\"sp\">Hechizos de invocador</h3>" + spellList(["Flash", "Mark"]) + "</div>" +
      "<div><h3>Objetos en orden de compra</h3>" + itemList(b.items) + "</div></div>";
  } else {
    html += "<div><h3>Objetos en orden de prioridad</h3>" + itemList(b.items) +
      '<p class="note" style="margin-top:10px">En cada ronda eliges aumentos: prioriza los que refuercen tu plan de daño o de supervivencia.</p></div>';
  }
  html += '<div class="tipbox"><h3>Consejo de juego</h3><p>' + esc(b.tip) + "</p></div>";
  if (base) html += riotTips(c);
  html += abilitiesHtml(c);
  html += '<p class="disc">Estas builds son recomendaciones generales de uso común. Los objetos, runas y ajustes cambian con cada parche, así que compáralas con la tienda y las notas del parche actual antes de jugar.</p>';
  $("#build").innerHTML = html;
}

function renderAll() { ensureValid(); renderPicker(); renderBuild(); }

$("#modes").addEventListener("click", e => {
  const b = e.target.closest("[data-mode]");
  if (!b) return;
  S.mode = b.dataset.mode; S.q = ""; S.v = 0; S.brole = ""; $("#search").value = "";
  renderAll();
});
$("#roles").addEventListener("click", e => {
  const b = e.target.closest("[data-role]");
  if (!b || b.disabled) return;
  S.role = S.role === b.dataset.role ? "" : b.dataset.role; S.brole = ""; S.v = 0; renderAll(); // al pulsar la línea elegida se deselecciona y se ven todas
});
$("#champs").addEventListener("click", e => {
  const b = e.target.closest("[data-champ]");
  if (!b) return;
  S.champ = S.champ === b.dataset.champ ? "" : b.dataset.champ; S.brole = ""; S.v = 0; // pulsar de nuevo deselecciona
  document.querySelectorAll("#champs .champ").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.champ === S.champ)));
  renderBuild();
});
$("#build").addEventListener("click", e => {
  const r = e.target.closest("[data-brole]"), v = e.target.closest("[data-v]");
  if (r) { S.brole = r.dataset.brole; S.v = 0; renderBuild(); }
  else if (v) { S.v = Number(v.dataset.v) || 0; renderBuild(); }
});
$("#search").addEventListener("input", e => { S.q = e.target.value; renderPicker(); });
