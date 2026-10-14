"use strict";
/*
 * Minion.GG: servidor intermedio para la API de Riot.
 * Sin dependencias (Node 18 o superior). La clave de Riot y la de Supabase viven solo aquí,
 * nunca en el navegador. Si hay Supabase configurado, guarda el historial de partidas;
 * si no, funciona igual con una caché en memoria.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const Catalog = require("./public/js/catalog.js");

function loadEnv(file) {
  try {
    fs.readFileSync(file, "utf8").split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    });
  } catch (e) { /* no hay .env */ }
}

// Servidor (plataforma) -> ruta regional que usa match-v5 y account-v1
const ROUTE = {
  la1: "americas", la2: "americas", na1: "americas", br1: "americas",
  euw1: "europe", eun1: "europe", tr1: "europe", ru: "europe",
  kr: "asia", jp1: "asia",
  oc1: "sea", ph2: "sea", sg2: "sea", th2: "sea", tw2: "sea", vn2: "sea"
};
// queueId -> modo de Minion.GG (se ignoran las colas no listadas)
const QUEUES = { 400: "sr", 420: "sr", 430: "sr", 440: "sr", 490: "sr", 450: "aram", 2400: "aram", 1700: "arena" };
const POS = { TOP: "top", JUNGLE: "jungle", MIDDLE: "mid", BOTTOM: "adc", UTILITY: "support" };
const HISTORY_LIMIT = 200;

class RiotError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || {};
  }
}

function mapMatch(match, puuid) {
  const info = match && match.info;
  if (!info || !match.metadata) return null;
  const mode = QUEUES[info.queueId];
  if (!mode) return null;
  const me = (info.participants || []).find(p => p.puuid === puuid);
  if (!me) return null;
  let sec = Number(info.gameDuration) || 0;
  if (sec > 100000) sec = Math.round(sec / 1000); // partidas antiguas guardaban milisegundos
  if (sec < 300) return null; // remakes
  const created = Number(info.gameCreation) || Date.now();
  return {
    id: "riot-" + match.metadata.matchId,
    champ: String(me.championName).toLowerCase(),
    cn: me.championName,
    mode: mode,
    role: mode === "sr" ? (POS[me.teamPosition] || "") : "",
    k: me.kills | 0,
    d: me.deaths | 0,
    a: me.assists | 0,
    cs: (me.totalMinionsKilled | 0) + (me.neutralMinionsKilled | 0),
    min: Math.max(1, Math.round(sec / 60)),
    win: !!me.win,
    date: new Date(created).toISOString().slice(0, 10),
    ex: false,
    lvl: me.champLevel | 0,
    items: [0, 1, 2, 3, 4, 5, 6].map(i => me["item" + i] | 0),
    spells: [me.summoner1Id | 0, me.summoner2Id | 0],
    perks: mapPerks(me.perks),
    dmg: me.totalDamageDealtToChampions | 0,
    gold: me.goldEarned | 0,
    vis: me.visionScore | 0
  };
}

function mapPerks(pk) {
  const st = (pk && pk.styles) || [];
  const pri = st.find(x => x.description === "primaryStyle") || st[0];
  const sec = st.find(x => x.description === "subStyle") || st[1];
  if (!pri) return null;
  const ids = x => ((x && x.selections) || []).map(y => y.perk | 0);
  const sp = (pk && pk.statPerks) || {};
  return { ps: pri.style | 0, ss: sec ? sec.style | 0 : 0, p: ids(pri), s: ids(sec), sh: [sp.offense | 0, sp.flex | 0, sp.defense | 0] };
}

/* ---------- Archivos estáticos (carpeta public/) ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8"
};

// Devuelve true si respondió con un archivo. Rechaza rutas fuera de public/ y archivos ocultos.
function serveStatic(publicDir, pathname, res, csp) {
  let rel;
  try { rel = decodeURIComponent(pathname); } catch (e) { return false; }
  if (rel.indexOf("\0") !== -1) return false;
  if (rel.endsWith("/")) rel += "index.html";
  const parts = path.normalize(rel).split(path.sep).filter(Boolean);
  if (parts.some(p => p === ".." || p.startsWith("."))) return false;
  const file = path.join(publicDir, parts.join(path.sep));
  if (!file.startsWith(publicDir + path.sep)) return false;
  let st;
  try { st = fs.statSync(file); } catch (e) { return false; }
  if (!st.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const headers = {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": st.size,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  };
  if (ext === ".html") headers["Content-Security-Policy"] = csp;
  res.writeHead(200, headers);
  const stream = fs.createReadStream(file);
  stream.on("error", () => res.destroy());
  stream.pipe(res);
  return true;
}

/* ---------- Supabase (opcional) ---------- */
function toRow(m, puuid) {
  return { id: m.id, puuid: puuid, champ: m.champ, cn: m.cn || m.champ, mode: m.mode, role: m.role || "", k: m.k, d: m.d, a: m.a, cs: m.cs, minutes: m.min, win: m.win, played_on: m.date,
    level: m.lvl == null ? null : m.lvl, items: m.items || null, spells: m.spells || null, perks: m.perks || null,
    damage: m.dmg == null ? null : m.dmg, gold: m.gold == null ? null : m.gold, vision: m.vis == null ? null : m.vis };
}
function fromRow(r) {
  return { id: r.id, champ: r.champ, cn: r.cn, mode: r.mode, role: r.role || "", k: r.k, d: r.d, a: r.a, cs: r.cs, min: r.minutes, win: r.win, date: String(r.played_on).slice(0, 10), ex: false,
    lvl: r.level, items: r.items, spells: r.spells, perks: r.perks, dmg: r.damage, gold: r.gold, vis: r.vision };
}

function createStore(url, key, doFetch) {
  if (!url || !key) return null;
  const base = url.replace(/\/+$/, "") + "/rest/v1";
  const headers = { apikey: key, "Content-Type": "application/json" };
  // Las claves nuevas (sb_secret_...) van solo en apikey; la clave service_role antigua es un JWT y también va en Authorization.
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key;

  async function call(method, p, body, extra) {
    const res = await doFetch(base + p, {
      method: method,
      headers: Object.assign({}, headers, extra || {}),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!(res.status >= 200 && res.status < 300)) throw new Error("Supabase respondió " + res.status);
    return method === "GET" ? res.json() : null;
  }
  const UPSERT = { Prefer: "resolution=merge-duplicates,return=minimal" };

  return {
    async loadMatches(puuid) {
      const rows = await call("GET", "/matches?select=*&puuid=eq." + encodeURIComponent(puuid) + "&order=played_on.desc,id.desc&limit=" + HISTORY_LIMIT);
      return rows.map(fromRow);
    },
    async savePlayer(p) {
      await call("POST", "/players?on_conflict=puuid", [{
        puuid: p.puuid, region: p.region, game_name: p.gameName, tag_line: p.tagLine, ranks: p.ranks, updated_at: new Date().toISOString()
      }], UPSERT);
    },
    async saveMatches(puuid, list) {
      if (!list.length) return;
      await call("POST", "/matches?on_conflict=id", list.map(m => toRow(m, puuid)), UPSERT);
    }
  };
}

function createApp(opts) {
  const apiKey = opts.apiKey || "";
  const doFetch = opts.fetchImpl || fetch;
  const publicDir = path.resolve(opts.publicDir || path.join(__dirname, "public"));
  const store =createStore(opts.supabaseUrl, opts.supabaseKey, doFetch);
  const trustProxy = !!opts.trustProxy;
  const perIp = opts.ratePerIp || 10;
  const perAll = opts.rateGlobal || 60;
  const matchCache = new Map();
  const playerCache = new Map();
  const PLAYER_TTL = 120000;

  // Límite de consultas por minuto: protege la clave de Riot si la URL se vuelve pública
  const hits = new Map();
  let allHits = { n: 0, reset: 0 };
  function tooMany(ip) {
    const now = Date.now();
    if (now > allHits.reset) allHits = { n: 0, reset: now + 60000 };
    let h = hits.get(ip);
    if (!h || now > h.reset) { h = { n: 0, reset: now + 60000 }; hits.set(ip, h); }
    if (hits.size > 5000) hits.forEach((v, k) => { if (now > v.reset) hits.delete(k); });
    h.n++; allHits.n++;
    if (h.n > perIp) return Math.max(1, Math.ceil((h.reset - now) / 1000));
    if (allHits.n > perAll) return Math.max(1, Math.ceil((allHits.reset - now) / 1000));
    return 0;
  }
  function clientIp(req) {
    if (trustProxy) {
      const f = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
      if (f) return f;
    }
    return req.socket.remoteAddress || "?";
  }

  async function riot(host, p) {
    const res = await doFetch("https://" + host + ".api.riotgames.com" + p, { headers: { "X-Riot-Token": apiKey } });
    if (res.status === 200) return res.json();
    if (res.status === 404) throw new RiotError(404, "Riot no encontró lo que se pidió.");
    if (res.status === 429) {
      const ra = Number(res.headers && res.headers.get("retry-after")) || 10;
      throw new RiotError(429, "Riot pide esperar " + ra + " segundos antes de volver a intentar.", { retryAfter: ra });
    }
    if (res.status === 401 || res.status === 403) {
      throw new RiotError(502, "Riot rechazó la clave. Las claves de desarrollo caducan cada 24 horas: genera una nueva en el portal y actualiza RIOT_API_KEY.");
    }
    throw new RiotError(502, "Riot respondió con un error (" + res.status + ").");
  }

  async function getMatch(route, id) {
    if (matchCache.has(id)) return matchCache.get(id);
    const m = await riot(route, "/lol/match/v5/matches/" + encodeURIComponent(id));
    matchCache.set(id, m); // las partidas terminadas no cambian
    return m;
  }

  // Diagnóstico: comprueba que los nombres de objetos, runas y hechizos de data.js existan en Data Dragon
  let ddAudit = null;
  async function auditDD() {
    if (ddAudit && Date.now() - ddAudit.t < 600000) return ddAudit.data;
    const get = async url => {
      const r = await doFetch(url);
      if (r.status !== 200) throw new Error("Data Dragon respondió " + r.status);
      return r.json();
    };
    const v = (await get(DDRAGON + "/api/versions.json"))[0];
    const B = DDRAGON + "/cdn/" + v + "/data/";
    const p = await Promise.all([
      get(B + "es_MX/champion.json"), get(B + "en_US/item.json"), get(B + "es_MX/item.json"),
      get(B + "en_US/runesReforged.json"), get(B + "es_MX/runesReforged.json"), get(B + "es_MX/summoner.json")
    ]);
    const data = Catalog.audit(Catalog.reduceDD({ version: v, champion: p[0], itemEn: p[1], itemEs: p[2], runesEn: p[3], runesEs: p[4], summoner: p[5] }));
    ddAudit = { t: Date.now(), data: data };
    return data;
  }

  async function player(q) {
    const riotId = String(q.get("riotId") || "").trim();
    const region = String(q.get("region") || "la2");
    let count = parseInt(q.get("count") || "20", 10);
    if (!(count >= 1)) count = 20;
    count = Math.min(count, 20);
    const route = ROUTE[region];
    if (!route) throw new RiotError(400, "Servidor no válido.");
    const parts = riotId.match(/^(.{3,16})#([A-Za-z0-9]{3,5})$/);
    if (!parts) throw new RiotError(400, "El Riot ID debe tener el formato Nombre#TAG.");

    const key = region + "|" + riotId.toLowerCase() + "|" + count;
    const hit = playerCache.get(key);
    if (hit && Date.now() - hit.t < PLAYER_TTL) return hit.data;

    let acc;
    try {
      acc = await riot(route, "/riot/account/v1/accounts/by-riot-id/" + encodeURIComponent(parts[1]) + "/" + encodeURIComponent(parts[2]));
    } catch (e) {
      if (e.status === 404) throw new RiotError(404, "No existe ese Riot ID. Revisa el nombre y la etiqueta.");
      throw e;
    }
    const gameName = acc.gameName || parts[1], tagLine = acc.tagLine || parts[2];

    let ranks = [], ranksOk = false;
    try {
      const entries = await riot(region, "/lol/league/v4/entries/by-puuid/" + encodeURIComponent(acc.puuid));
      ranks = entries.map(e => ({ queue: e.queueType, tier: e.tier, rank: e.rank, lp: e.leaguePoints, wins: e.wins, losses: e.losses }));
      ranksOk = true;
    } catch (e) {
      if (e.status === 429) throw e; // el rango es opcional; cualquier otro fallo se ignora
      console.warn("No se pudo leer el rango:", e.status || e.message);
    }

    const ids = await riot(route, "/lol/match/v5/matches/by-puuid/" + encodeURIComponent(acc.puuid) + "/ids?start=0&count=" + count);

    // Historial ya guardado: solo se piden a Riot las partidas que faltan
    let saved = [];
    let storeOk = false;
    if (store) {
      try {
        await store.savePlayer({ puuid: acc.puuid, region: region, gameName: gameName, tagLine: tagLine, ranks: ranks });
        saved = await store.loadMatches(acc.puuid);
        storeOk = true;
      } catch (e) {
        console.warn("Supabase no disponible, se usa solo Riot:", e.message);
      }
    }
    const known = new Set(saved.filter(m => m.perks).map(m => m.id)); // sin detalle (runas) = se vuelve a pedir
    const missing = ids.filter(id => !known.has("riot-" + id));

    const fresh = [];
    for (let i = 0; i < missing.length; i += 5) {
      const chunk = await Promise.all(missing.slice(i, i + 5).map(id =>
        getMatch(route, id).catch(e => { if (e.status === 429) throw e; return null; })));
      chunk.forEach(mt => { const x = mapMatch(mt, acc.puuid); if (x) fresh.push(x); });
    }
    if (storeOk && fresh.length) {
      try { await store.saveMatches(acc.puuid, fresh); } catch (e) {
        storeOk = false;
        console.warn("No se pudieron guardar las partidas en Supabase:", e.message);
      }
    }

    const all = new Map();
    saved.concat(fresh).forEach(m => all.set(m.id, m));
    const matches = Array.from(all.values())
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, HISTORY_LIMIT);

    const data = { gameName: gameName, tagLine: tagLine, ranks: ranks, ranksOk: ranksOk, matches: matches, stored: storeOk };
    playerCache.set(key, { t: Date.now(), data: data });
    return data;
  }

  function sendJson(res, status, body, headers) {
    res.writeHead(status, Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }, headers || {}));
    res.end(JSON.stringify(body));
  }

  // Los scripts solo se cargan desde public/ (sin código en línea). Data Dragon es el CDN oficial de Riot: de ahí salen
  // los datos (connect-src) y las imágenes (img-src). Los estilos en línea se permiten porque la página los usa en atributos.
  const DDRAGON = "https://ddragon.leagueoflegends.com";
  const CDRAGON = "https://raw.communitydragon.org";
  const CSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; connect-src 'self' " + DDRAGON + "; img-src 'self' data: " + DDRAGON + " " + CDRAGON + "; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

  return http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://localhost");
      if (req.method !== "GET") return sendJson(res, 405, { error: "Método no permitido." });
      if (u.pathname === "/api/health") {
        return sendJson(res, 200, apiKey ? { ok: true, storage: !!store } : { ok: false, storage: !!store, reason: "Falta RIOT_API_KEY" });
      }
      if (u.pathname === "/api/ddcheck") {
        const wait = tooMany(clientIp(req));
        if (wait) return sendJson(res, 429, { error: "Demasiadas consultas seguidas. Espera " + wait + " segundos." }, { "Retry-After": String(wait) });
        try {
          return sendJson(res, 200, await auditDD());
        } catch (e) {
          return sendJson(res, 502, { error: "No se pudo consultar Data Dragon: " + e.message });
        }
      }
      if (u.pathname === "/api/player") {
        if (!apiKey) return sendJson(res, 503, { error: "El servidor no tiene clave de Riot. Configura RIOT_API_KEY." });
        const wait = tooMany(clientIp(req));
        if (wait) return sendJson(res, 429, { error: "Demasiadas consultas seguidas. Espera " + wait + " segundos." }, { "Retry-After": String(wait) });
        try {
          return sendJson(res, 200, await player(u.searchParams));
        } catch (e) {
          if (e instanceof RiotError) {
            return sendJson(res, e.status, { error: e.message }, e.extra.retryAfter ? { "Retry-After": String(e.extra.retryAfter) } : {});
          }
          throw e;
        }
      }
      if (!u.pathname.startsWith("/api/") && serveStatic(publicDir, u.pathname, res, CSP)) return;
      return sendJson(res, 404, { error: "No encontrado." });
    } catch (e) {
      console.error(e);
      return sendJson(res, 500, { error: "Error interno del servidor." });
    }
  });
}

module.exports = { createApp, mapMatch };

if (require.main === module) {
  loadEnv(path.join(__dirname, ".env"));
  const apiKey = process.env.RIOT_API_KEY || "";
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || "";
  const onRender = !!process.env.RENDER;
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || (onRender ? "0.0.0.0" : "127.0.0.1");
  if (!apiKey) console.warn("Aviso: falta RIOT_API_KEY. Copia .env.example a .env y pega tu clave.");
  if (!!supabaseUrl !== !!supabaseKey) console.warn("Aviso: para guardar el historial hacen falta SUPABASE_URL y SUPABASE_SECRET_KEY. Se usará solo la caché en memoria.");
  createApp({
    apiKey: apiKey,
    publicDir: path.join(__dirname, "public"),
    supabaseUrl: supabaseUrl,
    supabaseKey: supabaseKey,
    trustProxy: onRender || process.env.TRUST_PROXY === "1",
    ratePerIp: Number(process.env.RATE_PER_IP) || undefined,
    rateGlobal: Number(process.env.RATE_GLOBAL) || undefined
  }).listen(port, host, () => {
    console.log("Minion.GG escuchando en el puerto " + port + (supabaseUrl && supabaseKey ? " con historial en Supabase" : " sin base de datos"));
  });
}
