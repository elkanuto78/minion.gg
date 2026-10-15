/* ---------- Estadísticas ---------- */
const KEY = "forja-lol-v1";
const blankDB = () => ({ name: "", matches: [], ranks: [], riotId: "", region: "la2", cur: "", players: {} });
let DB = blankDB();
let confirmClear = false;

function isoDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  const p = x => String(x).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}
function seed() {
  // champ, mode, role, K, D, A, CS, minutos, victoria, hace N días
  const rows = [
    ["ahri", "sr", "mid", 9, 3, 8, 212, 31, 1, 14], ["ahri", "sr", "mid", 4, 5, 6, 180, 29, 0, 13],
    ["jinx", "sr", "adc", 12, 4, 7, 267, 34, 1, 12], ["jinx", "sr", "adc", 6, 7, 5, 201, 27, 0, 11],
    ["yasuo", "sr", "mid", 11, 8, 4, 230, 33, 1, 10], ["leesin", "sr", "jungle", 5, 4, 12, 161, 28, 1, 9],
    ["thresh", "sr", "support", 1, 5, 18, 32, 32, 1, 8], ["lux", "aram", "", 14, 9, 21, 0, 19, 1, 7],
    ["ahri", "sr", "mid", 7, 2, 10, 224, 30, 1, 6], ["darius", "sr", "top", 8, 6, 3, 248, 31, 0, 5],
    ["jinx", "sr", "adc", 10, 3, 9, 281, 33, 1, 4], ["zed", "sr", "mid", 6, 6, 3, 195, 26, 0, 3],
    ["ahri", "sr", "mid", 12, 2, 9, 236, 32, 1, 2], ["leesin", "sr", "jungle", 3, 7, 8, 144, 25, 0, 1]
  ];
  return rows.map((r, i) => ({ id: "ex" + i, champ: r[0], mode: r[1], role: r[2], k: r[3], d: r[4], a: r[5], cs: r[6], min: r[7], win: !!r[8], date: isoDaysAgo(r[9]), ex: true }));
}
function loadDB() {
  const raw = lsGet(KEY);
  if (raw) {
    try {
      const o = JSON.parse(raw);
      if (o && Array.isArray(o.matches)) {
        DB = {
          name: String(o.name || ""),
          matches: o.matches.filter(m => m && typeof m.champ === "string" && m.champ),
          ranks: Array.isArray(o.ranks) ? o.ranks : [],
          riotId: String(o.riotId || ""),
          region: String(o.region || "la2"),
          cur: String(o.cur || ""),
          players: o.players && typeof o.players === "object" ? o.players : {}
        };
        return;
      }
    } catch (e) { /* datos dañados: se vuelve a sembrar */ }
  }
  DB = Object.assign(blankDB(), { matches: seed() });
}
function saveDB() { lsSet(KEY, JSON.stringify(DB)); }

// Cada jugador importado tiene su propio historial: nunca se mezclan las partidas de dos cuentas.
function plKey(region, gameName, tagLine) { return region + ":" + (gameName + "#" + tagLine).toLowerCase(); }
function viewList() {
  const real = DB.matches.filter(m => !m.ex && (DB.cur
    ? m.pl === DB.cur || (!m.pl && String(m.id).indexOf("riot-") !== 0)
    : !m.pl && String(m.id).indexOf("riot-") !== 0));
  return real.length ? real : DB.matches.filter(m => m.ex);
}
function kdaRatio(k, d, a) { return d === 0 ? k + a : (k + a) / d; }
function fmt(n, dec) { return Number(n).toFixed(dec); }
function kdaText(k, d, a) { return d === 0 ? "Perfecto" : fmt((k + a) / d, 2); }

function aggregate(list) {
  const t = { g: list.length, w: 0, k: 0, d: 0, a: 0, cs: 0, csMin: 0 };
  list.forEach(m => {
    if (m.win) t.w++;
    t.k += m.k; t.d += m.d; t.a += m.a;
    if (m.cs > 0 && m.min > 0) { t.cs += m.cs; t.csMin += m.min; }
  });
  return t;
}
function groupBy(list, keyFn) {
  const g = {};
  list.forEach(m => { const k = keyFn(m); if (k) (g[k] = g[k] || []).push(m); });
  return Object.entries(g).map(([k, v]) => ({ k, t: aggregate(v) })).sort((x, y) => y.t.g - x.t.g || y.t.w - x.t.w);
}
function pct(w, g) { return g ? Math.round((w / g) * 100) : 0; }

function chartSvg(list) {
  const pts = list.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).slice(-20);
  if (!pts.length) return "";
  const W = 560, H = 220, L = 38, R = 14, T = 14, Bm = 30, pw = W - L - R, ph = H - T - Bm;
  const vals = pts.map(m => kdaRatio(m.k, m.d, m.a));
  const yMax = Math.max(4, Math.ceil(Math.max.apply(null, vals) / 2) * 2);
  const y = v => T + (1 - v / yMax) * ph;
  const x = i => L + (pts.length === 1 ? pw / 2 : (i / (pts.length - 1)) * pw);
  const ticks = [0, yMax / 2, yMax];
  let s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="KDA por partida, de la más antigua a la más reciente">';
  ticks.forEach(v => {
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--line)" stroke-width="1"/>' +
      '<text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + v + "</text>";
  });
  if (ticks.indexOf(3) === -1 && 3 < yMax) {
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(3) + '" y2="' + y(3) + '" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 4"/>' +
      '<text x="' + (L - 6) + '" y="' + (y(3) + 4) + '" text-anchor="end" font-size="11" fill="var(--accent)">3</text>';
  }
  s += '<path d="' + vals.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ") + '" fill="none" stroke="var(--accent-2)" stroke-width="2"/>';
  pts.forEach((m, i) => {
    const v = vals[i];
    s += m.win
      ? '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="5" fill="var(--good)" stroke="var(--surface)" stroke-width="1.5"/>'
      : '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="4.5" fill="var(--surface)" stroke="var(--bad)" stroke-width="2"/>';
  });
  s += '<text x="' + L + '" y="' + (H - 8) + '" font-size="11" fill="var(--muted)">Partida 1</text>' +
    '<text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end" font-size="11" fill="var(--muted)">Partida ' + pts.length + "</text></svg>";
  return s;
}

/* ---------- Rango: emblema + datos ---------- */
const TIERS = {
  IRON: ["Hierro", "#7a6a64"], BRONZE: ["Bronce", "#a8682f"], SILVER: ["Plata", "#9aa7b1"], GOLD: ["Oro", "#d8a73c"],
  PLATINUM: ["Platino", "#3fb2a8"], EMERALD: ["Esmeralda", "#2fae6a"], DIAMOND: ["Diamante", "#5b8dee"],
  MASTER: ["Maestro", "#b05fd6"], GRANDMASTER: ["Gran Maestro", "#d9534f"], CHALLENGER: ["Aspirante", "#f0c75e"]
};
const EMBLEM_URL = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-";
const QUEUE_NAME = { RANKED_SOLO_5x5: "Solo/Dúo", RANKED_FLEX_SR: "Flex" };

// Cuando carga la imagen oficial se oculta el escudo de respaldo
document.addEventListener("load", e => {
  const t = e.target;
  if (t && t.tagName === "IMG" && t.parentNode && t.parentNode.classList && t.parentNode.classList.contains("emblem")) t.parentNode.classList.add("ok");
}, true);

function rankEmblem(tier) {
  const t = TIERS[tier] || ["", "#6b7280"];
  const letter = t[0] ? t[0].charAt(0) : "?";
  // Escudo propio de respaldo; la imagen oficial se pone encima y, si no carga, se oculta y queda el escudo.
  return '<span class="emblem" style="--tier:' + t[1] + '"><svg viewBox="0 0 48 56" width="64" height="74" aria-hidden="true">' +
    '<path d="M24 2 44 10v20c0 12-8 20-20 24C12 50 4 42 4 30V10z" fill="var(--tier)" fill-opacity=".25" stroke="var(--tier)" stroke-width="3"/>' +
    '<text x="24" y="35" text-anchor="middle" font-size="22" font-weight="700" fill="var(--tier)">' + esc(letter) + '</text></svg>' +
    (TIERS[tier] ? '<img src="' + EMBLEM_URL + tier.toLowerCase() + '.png" alt="" width="84" height="84" loading="lazy">' : "") + '</span>';
}
function rankCards(ranks, ok, shown) {
  const by = {};
  (ranks || []).forEach(r => { by[r.queue] = r; });
  if (!shown && !(ranks && ranks.length)) return "";
  const warn = ok === false ? '<p class="note rknote">No se pudo leer el rango de esta cuenta. Vuelve a importarla en un momento.</p>'
    : (!ranks || !ranks.length) && ok === true ? '<p class="note rknote">Esta cuenta no tiene rango en este servidor. Si debería tenerlo, revisa que el servidor elegido al importar sea el correcto (LAN y LAS son distintos).</p>' : "";
  return '<div class="ranks">' + ["RANKED_SOLO_5x5", "RANKED_FLEX_SR"].map(q => {
    const r = by[q], name = QUEUE_NAME[q];
    if (!r) return '<div class="rank unr">' + rankEmblem("") + '<div><div class="rq">' + name + '</div><div class="rt">Sin clasificar</div></div></div>';
    const tn = (TIERS[r.tier] || [r.tier])[0], big = ["MASTER", "GRANDMASTER", "CHALLENGER"].indexOf(r.tier) >= 0;
    const g = (r.wins | 0) + (r.losses | 0);
    return '<div class="rank">' + rankEmblem(r.tier) + '<div><div class="rq">' + name + '</div><div class="rt">' + esc(tn) + (big ? "" : " " + esc(r.rank)) + '</div>' +
      '<div class="rs">' + esc(r.lp) + ' LP · ' + esc(r.wins) + 'V ' + esc(r.losses) + 'D' + (g ? ' · ' + pct(r.wins, g) + '%' : '') + '</div></div></div>';
  }).join("") + '</div>' + warn;
}

/* ---------- Historial con campeón, build y runas ---------- */
function champIcon(key) {
  const c = CATMAP[key];
  return c ? avatar(c, "s") : "";
}
function riotImg(r, cls) { return r ? icoImg(r.img, 28, cls) : ""; }
function matchRow(m, names) {
  const c = CATMAP[m.champ];
  const head = '<div class="hm">' + champIcon(m.champ) +
    '<div class="hn">' + (c ? '<button type="button" class="linkbtn" data-build="' + m.champ + '">' + esc(names[m.champ]) + '</button>' : esc(names[m.champ])) + (m.ex ? '<span class="ex">Ejemplo</span>' : "") +
    '<div class="hs">' + esc(m.date) + " · " + esc(m.mode === "sr" ? (ROLE_NAME[m.role] || "Grieta") : MODE_NAME[m.mode]) + (m.lvl ? " · Nv " + m.lvl : "") + '</div></div></div>' +
    '<div class="hr ' + (m.win ? "win" : "loss") + '"><b>' + (m.win ? "Victoria" : "Derrota") + '</b><span>' + m.min + ' min</span></div>' +
    '<div class="hk"><b>' + m.k + " / " + m.d + " / " + m.a + '</b><span>' + kdaText(m.k, m.d, m.a) + ' KDA' + (m.cs > 0 ? " · " + m.cs + " CS" : "") + '</span></div>';
  let build = "", detail = "";
  if (RES && m.items) {
    const its = m.items.slice(0, 6).map(id => RES.itemById(id));
    build += '<div class="hb">' + its.map(it => it ? '<span class="slot" title="' + esc(it.name) + '">' + icoImg(it.img, 28) + '</span>' : '<span class="slot empty"></span>').join("") +
      (m.items[6] ? '<span class="slot ward" title="Tótem">' + icoImg(RES.itemById(m.items[6]).img, 28) + '</span>' : "") + '</div>';
  }
  if (RES && m.spells) {
    build += '<div class="hp">' + m.spells.map(k => { const s = RES.spellByKey(k); return s ? '<span class="slot" title="' + esc(s.name) + '">' + icoImg(s.img, 28) + '</span>' : ""; }).join("") + '</div>';
  }
  if (RES && m.perks) {
    const p = m.perks, key = RES.runeById(p.p[0]), sec = RES.treeById(p.ss);
    build += '<div class="hp">' + (key ? '<span class="slot rune" title="' + esc(key.name) + '">' + icoImg(key.img, 28) + '</span>' : "") +
      (sec ? '<span class="slot rune sm" title="' + esc(sec.name) + '">' + icoImg(sec.img, 20) + '</span>' : "") + '</div>';
    const rl = ids => ids.map(id => { const r = RES.runeById(id); return r ? '<span class="item">' + icoImg(r.img, 28) + '<span>' + esc(r.name) + '</span></span>' : ""; }).join("");
    const pt = RES.treeById(p.ps);
    detail = '<div class="hd"><div><h4>Runas · ' + esc(pt ? pt.name : "") + '</h4><div class="rl">' + rl(p.p) + '</div></div>' +
      '<div><h4>Secundarias · ' + esc(sec ? sec.name : "") + '</h4><div class="rl">' + rl(p.s) + '</div>' +
      '<div class="rl">' + (p.sh || []).map(id => { const s = RES.shard(id); return s ? '<span class="item">' + icoImg(s.img, 20) + '<span>' + esc(s.name) + '</span></span>' : ""; }).join("") + '</div></div>' +
      '<div><h4>Objetos</h4><div class="rl">' + m.items.map(id => RES.itemById(id)).filter(Boolean).map(it => '<span class="item">' + icoImg(it.img, 28) + '<span>' + esc(it.name) + '</span></span>').join("") + '</div></div>' +
      '<div><h4>Partida</h4><p class="note">' + (m.dmg != null ? "Daño a campeones: " + m.dmg.toLocaleString("es") + " · " : "") + (m.gold != null ? "Oro: " + m.gold.toLocaleString("es") + " · " : "") + (m.vis != null ? "Visión: " + m.vis : "") + '</p></div></div>';
  }
  const del = '<button type="button" class="linkbtn" data-del="' + esc(m.id) + '" aria-label="Eliminar partida">Eliminar</button>';
  if (!build) build = '<div class="hb note">' + (m.items === undefined && !m.ex && String(m.id).indexOf("riot-") === 0 ? "Vuelve a importar para ver la build" : "Sin datos de build") + '</div>';
  return '<details class="mrow ' + (m.win ? "win" : "loss") + '"' + '><summary><div class="line">' + head + '<div class="hbuild">' + build + '</div></div></summary>' +
    (detail || "") + '<div class="hx">' + del + '</div></details>';
}

function renderStats() {
  const list = viewList();
  const showingEx = list.length > 0 && list.every(m => m.ex);
  const t = aggregate(list);
  const ordered = list.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const names = {};
  list.forEach(m => { names[m.champ] = CATMAP[m.champ] ? CATMAP[m.champ].name : (m.cn || m.champ); });
  const byChamp = groupBy(list, m => m.champ);
  const byRole = groupBy(list.filter(m => m.mode === "sr"), m => m.role);
  const byMode = groupBy(list, m => m.mode);
  let h = "";

  h += '<div class="who"><label for="pname">Invocador</label><input class="nameinput" id="pname" type="text" maxlength="40" placeholder="Tu nombre de invocador" autocomplete="off">' +
    '<span class="note">Las estadísticas se calculan con las partidas que registras o importas y se guardan en este navegador.</span></div>';
  const keys = Object.keys(DB.players);
  if (keys.length > 1) {
    h += '<div class="roles" role="group" aria-label="Jugador">' + keys.map(k => '<button type="button" class="chip" data-player="' + esc(k) + '" aria-pressed="' + (k === DB.cur) + '">' + esc(DB.players[k].label) + '</button>').join("") + '</div>';
  }
  const cp = DB.cur && DB.players[DB.cur];
  h += cp ? rankCards(cp.ranks, cp.ranksOk, true) : rankCards(DB.ranks);

  if (showingEx) {
    h += '<div class="banner"><p>Estás viendo partidas de ejemplo. Registra las tuyas y estas se dejan de mostrar.</p>' +
      '<button type="button" class="btn" data-act="rm-ex">Quitar ejemplos</button></div>';
  }

  if (!t.g) {
    h += '<div class="panel"><h2>Aún no hay partidas</h2><p class="note">Registra tu primera partida en el formulario de abajo para ver tu KDA, tu porcentaje de victorias y tus campeones más jugados.</p></div>';
  } else {
    h += '<div class="summary">' +
      '<div class="sum"><div class="l">Partidas</div><div class="v">' + t.g + '</div><div class="s">' + t.w + " V · " + (t.g - t.w) + " D</div></div>" +
      '<div class="sum"><div class="l">Victorias</div><div class="v">' + pct(t.w, t.g) + '%</div><div class="s">porcentaje de victorias</div></div>' +
      '<div class="sum"><div class="l">KDA</div><div class="v">' + kdaText(t.k, t.d, t.a) + '</div><div class="s">(K + A) / D</div></div>' +
      '<div class="sum"><div class="l">K / D / A medio</div><div class="v">' + fmt(t.k / t.g, 1) + " / " + fmt(t.d / t.g, 1) + " / " + fmt(t.a / t.g, 1) + '</div><div class="s">por partida</div></div>' +
      '<div class="sum"><div class="l">CS por minuto</div><div class="v">' + (t.csMin ? fmt(t.cs / t.csMin, 1) : "—") + '</div><div class="s">sin contar partidas sin CS</div></div></div>';

    h += '<div class="panel chart"><h2>KDA por partida</h2>' + chartSvg(list) +
      '<div class="legend"><span><b class="win">●</b> Victoria</span><span><b class="loss">○</b> Derrota</span><span>Línea punteada: KDA de 3</span></div></div>';

    h += '<div class="two"><div class="panel"><h2>Por campeón</h2><div class="tbl"><table><thead><tr><th>Campeón</th><th class="n">Part.</th><th class="n">Victorias</th><th class="n">KDA</th><th class="n">CS/min</th></tr></thead><tbody>' +
      byChamp.map(r => '<tr><td class="cn">' + champIcon(r.k) + (CATMAP[r.k] ? '<button type="button" class="linkbtn" data-build="' + r.k + '">' + esc(names[r.k]) + '</button>' : esc(names[r.k])) + '</td><td class="n">' + r.t.g + '</td><td class="n">' + pct(r.t.w, r.t.g) + '%</td><td class="n">' + kdaText(r.t.k, r.t.d, r.t.a) + '</td><td class="n">' + (r.t.csMin ? fmt(r.t.cs / r.t.csMin, 1) : "—") + "</td></tr>").join("") +
      '</tbody></table></div></div>' +
      '<div class="panel"><h2>Por línea y modo</h2><div class="tbl"><table><thead><tr><th>Grupo</th><th class="n">Part.</th><th class="n">Victorias</th><th class="n">KDA</th></tr></thead><tbody>' +
      byRole.map(r => '<tr><td>' + esc(ROLE_NAME[r.k] || r.k) + '</td><td class="n">' + r.t.g + '</td><td class="n">' + pct(r.t.w, r.t.g) + '%</td><td class="n">' + kdaText(r.t.k, r.t.d, r.t.a) + "</td></tr>").join("") +
      byMode.map(r => '<tr><td>' + esc(MODE_NAME[r.k] || r.k) + ' (modo)</td><td class="n">' + r.t.g + '</td><td class="n">' + pct(r.t.w, r.t.g) + '%</td><td class="n">' + kdaText(r.t.k, r.t.d, r.t.a) + "</td></tr>").join("") +
      '</tbody></table></div></div></div>';

    h += '<div class="panel"><h2>Últimas partidas</h2><div class="hist">' + ordered.slice(0, 15).map(m => matchRow(m, names)).join("") + '</div></div>';
  }

  if (API.ok) {
    h += '<div class="panel"><h2>Importar desde Riot</h2><form class="add riotform" id="riotform" novalidate>' +
      '<label for="r-id">Riot ID<input id="r-id" type="text" maxlength="40" placeholder="Nombre#TAG" autocomplete="off"></label>' +
      '<label for="r-region">Servidor<select id="r-region">' + REGIONS.map(r => '<option value="' + r[0] + '">' + esc(r[1]) + "</option>").join("") + '</select></label>' +
      '<div><button type="submit" class="btn primary" id="r-btn">Importar últimas partidas</button></div></form>' +
      '<p class="formmsg" id="r-msg" role="status" style="color:' + (importMsg.k === "ok" ? "var(--good)" : "var(--bad)") + '">' + esc(importMsg.t) + '</p></div>';
  } else {
    h += '<div class="panel"><h2>Importar desde Riot</h2><p class="note">Esta opción se activa al ejecutar Minion.GG con su servidor (en tu computadora o en Render), que guarda tus claves fuera del navegador. En esta versión puedes registrar partidas a mano.</p></div>';
  }

  h += '<div class="panel"><h2>Registrar partida</h2><form class="add" id="addform" novalidate>' +
    '<label for="f-champ">Campeón<select id="f-champ">' + CAT.map(c => '<option value="' + c.k + '">' + esc(c.name) + "</option>").join("") + '</select></label>' +
    '<label for="f-mode">Modo<select id="f-mode">' + MODES.map(m => '<option value="' + m.id + '">' + esc(MODE_NAME[m.id]) + "</option>").join("") + '</select></label>' +
    '<label for="f-role" id="l-role">Línea<select id="f-role">' + ROLES.map(r => '<option value="' + r.id + '">' + esc(r.n) + "</option>").join("") + '</select></label>' +
    '<label for="f-win">Resultado<select id="f-win"><option value="1">Victoria</option><option value="0">Derrota</option></select></label>' +
    '<label for="f-k">Kills<input id="f-k" type="number" min="0" max="99" inputmode="numeric" value="0"></label>' +
    '<label for="f-d">Muertes<input id="f-d" type="number" min="0" max="99" inputmode="numeric" value="0"></label>' +
    '<label for="f-a">Asistencias<input id="f-a" type="number" min="0" max="99" inputmode="numeric" value="0"></label>' +
    '<label for="f-cs">CS<input id="f-cs" type="number" min="0" max="999" inputmode="numeric" value="0"></label>' +
    '<label for="f-min">Minutos<input id="f-min" type="number" min="1" max="90" inputmode="numeric" value="25"></label>' +
    '<label for="f-date">Fecha<input id="f-date" type="date" value="' + isoDaysAgo(0) + '"></label>' +
    '<div><button type="submit" class="btn primary">Guardar partida</button></div></form>' +
    '<p class="formmsg" id="formmsg" role="alert"></p></div>';

  h += '<div class="confirm">' + (confirmClear
    ? '<span>¿Borrar todas las partidas y el nombre?</span><button type="button" class="btn danger" data-act="clear-yes">Sí, borrar todo</button><button type="button" class="btn" data-act="clear-no">Cancelar</button>'
    : '<button type="button" class="btn" data-act="clear">Borrar todos los datos</button>') + '</div>';

  $("#stats").innerHTML = h;
  $("#pname").value = DB.name;
  if ($("#r-id")) { $("#r-id").value = DB.riotId; $("#r-region").value = DB.region; }
  syncRoleField();
}

function syncRoleField() {
  const mode = $("#f-mode");
  if (mode) $("#l-role").hidden = mode.value !== "sr";
}

$("#stats").addEventListener("change", e => { if (e.target.id === "f-mode") syncRoleField(); });
$("#stats").addEventListener("input", e => {
  if (e.target.id === "pname") { DB.name = e.target.value; saveDB(); }
});
$("#stats").addEventListener("click", e => {
  const bd = e.target.closest("[data-build]");
  if (bd) {
    S.champ = bd.dataset.build; S.mode = "sr"; S.brole = ""; S.v = 0; S.r = 0;
    const c = CATMAP[S.champ]; S.role = (c && (c.main || c.roles[0])) || "mid"; S.q = ""; $("#search").value = "";
    renderAll(); showTab("builds"); window.scrollTo(0, 0);
    return;
  }
  const pl = e.target.closest("[data-player]");
  if (pl) {
    DB.cur = pl.dataset.player;
    const p = DB.players[DB.cur];
    if (p) { DB.riotId = p.riotId || DB.riotId; DB.region = p.region || DB.region; }
    saveDB(); renderStats(); return;
  }
  const del = e.target.closest("[data-del]");
  if (del) { DB.matches = DB.matches.filter(m => m.id !== del.dataset.del); saveDB(); renderStats(); return; }
  const act = e.target.closest("[data-act]");
  if (!act) return;
  const a = act.dataset.act;
  if (a === "rm-ex") { DB.matches = DB.matches.filter(m => !m.ex); saveDB(); renderStats(); }
  if (a === "clear") { confirmClear = true; renderStats(); }
  if (a === "clear-no") { confirmClear = false; renderStats(); }
  if (a === "clear-yes") { DB = blankDB(); confirmClear = false; saveDB(); renderStats(); }
});
$("#stats").addEventListener("submit", e => {
  e.preventDefault();
  if (e.target.id === "riotform") { doImport(); return; }
  if (e.target.id !== "addform") return;
  const num = id => Number($("#" + id).value);
  const k = num("f-k"), d = num("f-d"), a = num("f-a"), cs = num("f-cs"), min = num("f-min");
  const msg = $("#formmsg");
  const bad = [k, d, a, cs].some(v => !Number.isFinite(v) || v < 0 || !Number.isInteger(v));
  if (bad) { msg.textContent = "Kills, muertes, asistencias y CS deben ser números enteros de 0 en adelante."; return; }
  if (!Number.isFinite(min) || min < 1) { msg.textContent = "Indica la duración de la partida en minutos (mínimo 1)."; return; }
  const date = $("#f-date").value || isoDaysAgo(0);
  const mode = $("#f-mode").value;
  DB.matches.push({ id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), champ: $("#f-champ").value, mode: mode, role: mode === "sr" ? $("#f-role").value : "", k: k, d: d, a: a, cs: cs, min: min, win: $("#f-win").value === "1", date: date, ex: false, pl: DB.cur || undefined });
  saveDB(); renderStats();
  const m2 = $("#formmsg"); if (m2) { m2.style.color = "var(--good)"; m2.textContent = "Partida guardada."; }
});

/* ---------- Importación desde Riot (requiere el servidor) ---------- */
const API = { ok: false };
const REGIONS = [
  ["la1", "LAN (Latinoamérica Norte)"], ["la2", "LAS (Latinoamérica Sur)"], ["na1", "Norteamérica"], ["br1", "Brasil"],
  ["euw1", "Europa Oeste"], ["eun1", "Europa Nórdica y Este"], ["kr", "Corea"], ["jp1", "Japón"],
  ["oc1", "Oceanía"], ["tr1", "Turquía"], ["ru", "Rusia"]
];
let importMsg = { t: "", k: "" };

async function doImport() {
  const id = $("#r-id").value.trim(), region = $("#r-region").value;
  DB.riotId = id; DB.region = region; saveDB();
  if (!/^.{3,16}#[A-Za-z0-9]{3,5}$/.test(id)) {
    importMsg = { t: "Escribe tu Riot ID completo, por ejemplo Nombre#LAS.", k: "err" };
    renderStats();
    return;
  }
  $("#r-btn").disabled = true;
  $("#r-btn").textContent = "Importando…";
  try {
    const r = await fetch("/api/player?riotId=" + encodeURIComponent(id) + "&region=" + encodeURIComponent(region) + "&count=20");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "No se pudo importar (error " + r.status + ").");
    let added = 0;
    const pk = plKey(region, j.gameName, j.tagLine);
    (j.matches || []).forEach(m => { m.pl = pk; });
    (j.matches || []).forEach(m => {
      const i = DB.matches.findIndex(x => x.id === m.id && x.pl === m.pl);
      if (i < 0) { DB.matches.push(m); added++; } else DB.matches[i] = m; // actualiza con el detalle (build y runas)
    });
    DB.players[pk] = { label: j.gameName + "#" + j.tagLine, ranks: j.ranks || [], ranksOk: j.ranksOk, riotId: id, region: region };
    DB.cur = pk; DB.ranks = j.ranks || [];
    if (!DB.name) DB.name = j.gameName + "#" + j.tagLine;
    saveDB();
    importMsg = { t: (added ? "Se importaron " + added + " partidas nuevas." : "No hay partidas nuevas desde la última importación.") + (j.stored ? " Historial guardado en la base de datos." : ""), k: "ok" };
  } catch (err) {
    importMsg = { t: err.message || "No se pudo conectar con el servidor.", k: "err" };
  }
  renderStats();
}
