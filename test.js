"use strict";
// Prueba el servidor con Riot y Supabase simulados (sin claves ni internet).
const assert = require("assert");
const path = require("path");
const { createApp, mapMatch } = require("./server.js");

const SB = "https://proj.supabase.co";
const calls = [];
const tables = { players: new Map(), matches: new Map() };
let riotMode = "ok";
let sbMode = "ok";
let sbKey = "sb_secret_test";

function jsonRes(status, body, headers) {
  return { status, headers: { get: k => (headers || {})[k.toLowerCase()] || null }, json: async () => body };
}
function match(id, queueId, dur, me) {
  return {
    metadata: { matchId: id },
    info: {
      queueId, gameDuration: dur, gameCreation: Date.UTC(2026, 9, 10, 15, 0, 0),
      participants: [Object.assign({ puuid: "P1", championName: "Kaisa", kills: 9, deaths: 3, assists: 7, totalMinionsKilled: 200, neutralMinionsKilled: 12, win: true, teamPosition: "BOTTOM", champLevel: 16, item0: 6672, item1: 3006, item2: 0, item3: 0, item4: 0, item5: 0, item6: 3340, summoner1Id: 4, summoner2Id: 7, totalDamageDealtToChampions: 21000, goldEarned: 12500, visionScore: 18, perks: { statPerks: { offense: 5005, flex: 5008, defense: 5011 }, styles: [{ description: "primaryStyle", style: 8000, selections: [{ perk: 8005 }, { perk: 9111 }, { perk: 9104 }, { perk: 8014 }] }, { description: "subStyle", style: 8300, selections: [{ perk: 8304 }, { perk: 8347 }] }] } }, me || {}), { puuid: "OTRO", championName: "Ahri" }]
    }
  };
}
const MATCHES = {
  LA2_1: match("LA2_1", 420, 1800),
  LA2_2: match("LA2_2", 450, 1200, { championName: "MonkeyKing", win: false, teamPosition: "" }),
  LA2_3: match("LA2_3", 420, 200),
  LA2_4: match("LA2_4", 900, 1500)
};

async function fakeFetch(url, opts) {
  calls.push(url);
  const headers = (opts && opts.headers) || {};
  if (url.startsWith(SB)) {
    assert.ok(!("X-Riot-Token" in headers), "la clave de Riot no debe viajar a Supabase");
    assert.strictEqual(headers.apikey, sbKey);
    assert.strictEqual("Authorization" in headers, sbKey.startsWith("eyJ"), "Authorization solo con la clave JWT antigua");
    if (sbMode === "down") return jsonRes(500, {});
    const u = new URL(url);
    const table = u.pathname.replace("/rest/v1/", "");
    if (opts.method === "GET") {
      const puuid = u.searchParams.get("puuid").replace("eq.", "");
      return jsonRes(200, Array.from(tables.matches.values()).filter(r => r.puuid === puuid).sort((a, b) => (a.played_on < b.played_on ? 1 : -1)));
    }
    assert.strictEqual(opts.method, "POST");
    JSON.parse(opts.body).forEach(r => tables[table].set(table === "players" ? r.puuid : r.id, r));
    return jsonRes(201, null);
  }
  assert.strictEqual(headers["X-Riot-Token"], "RGAPI-test", "la clave debe viajar solo en la cabecera hacia Riot");
  assert.ok(!("apikey" in headers), "la clave de Supabase no debe viajar a Riot");
  if (riotMode === "429") return jsonRes(429, {}, { "retry-after": "7" });
  if (url.includes("/accounts/by-riot-id/")) {
    if (url.includes("/NoExiste/")) return jsonRes(404, {});
    return jsonRes(200, { puuid: "P1", gameName: "Tester", tagLine: "LAS" });
  }
  if (url.includes("/league/v4/entries/by-puuid/")) return jsonRes(200, [{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 45, wins: 10, losses: 8 }]);
  if (url.includes("/matches/by-puuid/")) return jsonRes(200, Object.keys(MATCHES));
  const m = url.match(/\/matches\/(LA2_\d)$/);
  if (m) return jsonRes(200, MATCHES[m[1]]);
  return jsonRes(404, {});
}

async function get(base, p) {
  const r = await fetch(base + p);
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch (e) { body = text; }
  return { status: r.status, body, headers: r.headers };
}
const listen = srv => new Promise(r => srv.listen(0, "127.0.0.1", () => r("http://127.0.0.1:" + srv.address().port)));
const matchCalls = () => calls.filter(c => /\/matches\/LA2_[12]$/.test(c)).length;
const Q = "/api/player?riotId=Tester%23LAS&region=la2&count=20";
const publicDir = path.join(__dirname, "public");
const mk = o => createApp(Object.assign({ apiKey: "RGAPI-test", fetchImpl: fakeFetch, publicDir, ratePerIp: 100, rateGlobal: 1000 }, o));
const rawStatus = (base, p) => new Promise((resolve, reject) => {
  const u = new URL(base);
  require("http").get({ host: u.hostname, port: u.port, path: p }, r => { r.resume(); r.on("end", () => resolve(r.statusCode)); }).on("error", reject);
});

(async () => {
  // mapMatch directo
  const mm = mapMatch(MATCHES.LA2_1, "P1");
  assert.deepStrictEqual([mm.champ, mm.mode, mm.role, mm.cs, mm.min, mm.win, mm.date], ["kaisa", "sr", "adc", 212, 30, true, "2026-10-10"]);
  assert.strictEqual(mapMatch(MATCHES.LA2_3, "P1"), null, "los remakes se ignoran");
  assert.strictEqual(mapMatch(MATCHES.LA2_4, "P1"), null, "las colas no soportadas se ignoran");

  // Sin Supabase: todo funciona con la caché en memoria
  const plain = mk({});
  const noKey = mk({ apiKey: "" });
  const basePlain = await listen(plain), baseNoKey = await listen(noKey);
  assert.deepStrictEqual((await get(basePlain, "/api/health")).body, { ok: true, storage: false });
  assert.strictEqual((await get(baseNoKey, "/api/health")).body.ok, false);
  assert.strictEqual((await get(baseNoKey, Q)).status, 503);

  const page = await get(basePlain, "/");
  assert.strictEqual(page.status, 200);
  assert.ok(page.body.startsWith("<!doctype html>") && page.body.includes("Minion") && page.body.includes('<div class="wrap">'));
  assert.ok(page.body.includes('href="/css/styles.css"') && page.body.includes('src="/js/data.js"') && page.body.includes('src="/js/app.js"'));
  assert.ok(!/<style|<script>/.test(page.body), "el index no lleva CSS ni JS en línea");
  const csp = page.headers.get("content-security-policy");
  assert.ok(csp.includes("connect-src 'self'") && csp.includes("script-src 'self'") && !/script-src[^;]*unsafe-inline/.test(csp));

  // Archivos estáticos de public/
  for (const [p, type] of [["/css/styles.css", "text/css"], ["/js/data.js", "text/javascript"], ["/js/app.js", "text/javascript"], ["/img/favicon.svg", "image/svg+xml"], ["/index.html", "text/html"]]) {
    const r = await get(basePlain, p);
    assert.strictEqual(r.status, 200, p);
    assert.ok(r.headers.get("content-type").startsWith(type), p + " tipo " + r.headers.get("content-type"));
  }
  assert.strictEqual((await get(basePlain, "/js/no-existe.js")).status, 404);
  assert.strictEqual((await get(basePlain, "/api/no-existe")).status, 404);
  // Rutas que intentan salir de public/ o leer archivos ocultos
  for (const p of ["/../server.js", "/%2e%2e/server.js", "/..%2fserver.js", "/js/../../server.js", "/.env", "/css/%2e%2e/%2e%2e/.env", "/%00"]) {
    assert.strictEqual(await rawStatus(basePlain, p), 404, "debe rechazar " + p);
  }

  const ok = await get(basePlain, Q);
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.stored, false);
  assert.strictEqual(ok.body.matches.length, 2);
  assert.ok(ok.body.matches.some(m => m.cn === "MonkeyKing" && m.mode === "aram"));
  assert.deepStrictEqual(ok.body.ranks[0], { queue: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", lp: 45, wins: 10, losses: 8 });
  assert.ok(calls.some(c => c.startsWith("https://americas.api.riotgames.com/riot/account/v1/")), "account-v1 va por la ruta regional");
  assert.ok(calls.some(c => c.startsWith("https://la2.api.riotgames.com/lol/league/v4/")), "league-v4 va por la plataforma");
  const before = calls.length;
  await get(basePlain, Q);
  assert.strictEqual(calls.length, before, "la segunda consulta sale de la caché");

  assert.strictEqual((await get(basePlain, "/api/player?riotId=malformado&region=la2")).status, 400);
  assert.strictEqual((await get(basePlain, "/api/player?riotId=Tester%23LAS&region=xx")).status, 400);
  assert.strictEqual((await get(basePlain, "/api/player?riotId=NoExiste%23LAS&region=la2")).status, 404);
  assert.strictEqual((await get(basePlain, "/otra-ruta")).status, 404);

  riotMode = "429";
  const lim = await get(basePlain, "/api/player?riotId=Otro%23LAS&region=la2");
  assert.strictEqual(lim.status, 429);
  assert.strictEqual(lim.headers.get("retry-after"), "7");
  riotMode = "ok";

  // Con Supabase: guarda jugador y partidas
  const a = mk({ supabaseUrl: SB, supabaseKey: sbKey });
  const baseA = await listen(a);
  assert.deepStrictEqual((await get(baseA, "/api/health")).body, { ok: true, storage: true });
  const first = await get(baseA, Q);
  assert.strictEqual(first.status, 200);
  assert.strictEqual(first.body.stored, true);
  assert.strictEqual(tables.matches.size, 2, "solo se guardan las partidas válidas");
  const row = tables.matches.get("riot-LA2_1");
  assert.deepStrictEqual([row.puuid, row.champ, row.minutes, row.played_on, row.win], ["P1", "kaisa", 30, "2026-10-10", true]);
  assert.strictEqual(tables.players.get("P1").ranks[0].tier, "GOLD");
  assert.strictEqual(tables.players.get("P1").game_name, "Tester");

  // Un servidor nuevo (sin memoria, como tras reiniciar Render) reutiliza lo guardado y no vuelve a pedir esas partidas a Riot
  const b = mk({ supabaseUrl: SB, supabaseKey: sbKey });
  const baseB = await listen(b);
  const mcBefore = matchCalls();
  const second = await get(baseB, Q);
  assert.strictEqual(second.status, 200);
  assert.strictEqual(second.body.matches.length, 2);
  assert.strictEqual(matchCalls(), mcBefore, "las partidas guardadas no se piden otra vez a Riot");

  // Clave service_role antigua (JWT): también va en Authorization
  sbKey = "eyJ.legacy.jwt";
  const legacy = mk({ supabaseUrl: SB, supabaseKey: sbKey });
  assert.strictEqual((await get(await listen(legacy), Q)).status, 200);
  sbKey = "sb_secret_test";

  // Si Supabase falla, la importación sigue funcionando con Riot
  sbMode = "down";
  const c = mk({ supabaseUrl: SB, supabaseKey: sbKey });
  const down = await get(await listen(c), Q);
  assert.strictEqual(down.status, 200);
  assert.strictEqual(down.body.stored, false);
  assert.strictEqual(down.body.matches.length, 2);
  sbMode = "ok";

  // Límite por visitante
  const lm = createApp({ apiKey: "RGAPI-test", fetchImpl: fakeFetch, publicDir, ratePerIp: 2, rateGlobal: 1000 });
  const baseL = await listen(lm);
  assert.strictEqual((await get(baseL, Q)).status, 200);
  assert.strictEqual((await get(baseL, Q)).status, 200);
  const blocked = await get(baseL, Q);
  assert.strictEqual(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) >= 1);

  [plain, noKey, a, b, legacy, c, lm].forEach(s => s.close());
  console.log("Todas las pruebas pasaron");
})().catch(e => { console.error(e); process.exit(1); });

{
  const m = require("./server.js").mapMatch(MATCHES.LA2_1, "P1");
  assert.deepStrictEqual(m.items, [6672, 3006, 0, 0, 0, 0, 3340]);
  assert.deepStrictEqual(m.spells, [4, 7]);
  assert.deepStrictEqual(m.perks, { ps: 8000, ss: 8300, p: [8005, 9111, 9104, 8014], s: [8304, 8347], sh: [5005, 5008, 5011] });
  assert.strictEqual(m.lvl, 16); assert.strictEqual(m.dmg, 21000);
  console.log("ok mapMatch detalle");
}
