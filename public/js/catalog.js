"use strict";
/*
 * Catálogo de Minion.GG: une los datos de Data Dragon (el CDN oficial de Riot: campeones, objetos,
 * runas y hechizos con sus imágenes) con las builds de data.js.
 * No toca el DOM: lo usan la página (navegador) y el servidor (/api/ddcheck).
 */
(function (root) {
  const D = root.MinionData || (typeof require === "function" ? require("./data.js") : null);
  const CDN = "https://ddragon.leagueoflegends.com/cdn/";
  const ROLE_ORDER = ["top", "jungle", "mid", "adc", "support"];
  const LETTER = { T: "top", J: "jungle", M: "mid", A: "adc", S: "support" };
  // Nombre en inglés -> id del hechizo de invocador en Data Dragon
  const SPELL_IDS = {
    flash: "SummonerFlash", ignite: "SummonerDot", heal: "SummonerHeal", smite: "SummonerSmite", teleport: "SummonerTeleport",
    ghost: "SummonerHaste", barrier: "SummonerBarrier", cleanse: "SummonerBoost", exhaust: "SummonerExhaust", mark: "SummonerSnowball"
  };
  const TREE_ALIAS = { dominacion: "domination", hechiceria: "sorcery", inspiracion: "inspiration", precision: "precision", resolucion: "resolve" };
  const RUNE_ALIAS = { aery: "summonaery" };
  const PLACEHOLDERS = ["Objeto de soporte", "Objeto de jungla inicial"]; // no son objetos reales: se muestran como texto

  // Minúsculas, sin tildes ni símbolos: "Legend: Alacrity" y "LegendAlacrity" coinciden
  function norm(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  /* ---------- Data Dragon: reducir las respuestas a lo que se usa ---------- */
  const SHARDS = {
    5001: ["Vida escalable", "HealthScaling"], 5002: ["Armadura", "Armor"], 5003: ["Resistencia mágica", "MagicRes"],
    5005: ["Velocidad de ataque", "AttackSpeed"], 5007: ["Reducción de enfriamiento", "CDRScaling"],
    5008: ["Fuerza adaptable", "AdaptiveForce"], 5010: ["Velocidad de movimiento", "MovementSpeed"],
    5011: ["Vida", "HealthScaling"], 5013: ["Tenacidad", "Tenacity"]
  };

  function reduceDD(raw) {
    const ch = raw && raw.champion && raw.champion.data;
    if (!ch) return null;
    const out = { v: raw.version, champs: [], itemByName: {}, itemEn: {}, itemEs: {}, trees: [], spells: {} };

    Object.keys(ch).forEach(k => {
      const c = ch[k], i = c.info || {};
      out.champs.push({
        id: c.id || k, name: c.name || k, title: c.title || "", tags: c.tags || [],
        atk: i.attack | 0, def: i.defense | 0, mag: i.magic | 0, dif: i.difficulty | 0,
        img: c.image && c.image.full ? c.image.full : (c.id || k) + ".png"
      });
    });
    out.champs.sort((a, b) => a.name.localeCompare(b.name, "es"));

    const en = (raw.itemEn && raw.itemEn.data) || {}, es = (raw.itemEs && raw.itemEs.data) || {};
    const buyable = it => !(it.gold && it.gold.purchasable === false) && it.inStore !== false;
    Object.keys(en).forEach(id => {
      const it = en[id];
      if (!it || !it.name) return;
      if (it.maps && it.maps["11"] === false) return; // solo la Grieta del Invocador
      const n = norm(it.name);
      const prev = out.itemByName[n];
      if (prev && !(buyable(it) && !buyable(en[prev]))) return;
      out.itemByName[n] = id;
      out.itemEn[id] = it.name;
      out.itemEs[id] = (es[id] && es[id].name) || it.name;
    });

    // Objetos finales (sin mejora posterior) de la Grieta, para la lista "más objetos" por clase
    out.legendary = [];
    Object.keys(en).forEach(id => {
      const it = en[id];
      if (!it || !it.name || !out.itemEn[id] || it.into && it.into.length) return;
      if (it.maps && it.maps["11"] === false) return;
      if (it.requiredChampion || it.consumed || it.hideFromAll || it.inStore === false) return;
      const tg = it.tags || [], g = (it.gold && it.gold.total) | 0;
      if (g < 2200 || tg.indexOf("Boots") >= 0 || tg.indexOf("Consumable") >= 0 || tg.indexOf("Trinket") >= 0 || tg.indexOf("Jungle") >= 0 || tg.indexOf("Lane") >= 0) return;
      out.legendary.push({ id: id, t: tg, g: g });
    });
    out.legendary.sort((a, b) => b.g - a.g);

    const rEs = {};
    ((raw.runesEs) || []).forEach(t => { rEs[t.id] = t; });
    ((raw.runesEn) || []).forEach(t => {
      const te = rEs[t.id] || t;
      const esRunes = {};
      (te.slots || []).forEach(s => (s.runes || []).forEach(r => { esRunes[r.id] = r; }));
      const tree = { id: t.id, key: t.key, en: t.name, name: te.name || t.name, icon: t.icon, runes: [] };
      (t.slots || []).forEach((s, si) => (s.runes || []).forEach(r => {
        tree.runes.push({ id: r.id, key: r.key, en: r.name, name: (esRunes[r.id] && esRunes[r.id].name) || r.name, icon: r.icon, slot: si });
      }));
      out.trees.push(tree);
    });

    const sp = (raw.summoner && raw.summoner.data) || {};
    Object.keys(sp).forEach(id => { out.spells[id] = { key: String(sp[id].key || ""), name: sp[id].name, img: sp[id].image && sp[id].image.full }; });
    return out;
  }

  /* ---------- Resolver nombres (en inglés, como en data.js) a imagen y nombre en español ---------- */
  function makeResolver(dd) {
    const v = dd.v;
    const runeIdx = {}, treeIdx = {};
    (dd.trees || []).forEach(t => {
      [t.en, t.key, t.name].forEach(n => { treeIdx[norm(n)] = t; });
      t.runes.forEach(r => {
        [r.en, r.key].forEach(n => { const k = norm(n); if (!runeIdx[k]) runeIdx[k] = { r: r, t: t }; });
      });
    });
    const runeById = {}, treeById = {}, spellByKey = {};
    (dd.trees || []).forEach(t => { treeById[t.id] = t; t.runes.forEach(r => { runeById[r.id] = { r: r, t: t }; }); });
    Object.keys(dd.spells || {}).forEach(id => { const s = dd.spells[id]; if (s && s.key) spellByKey[s.key] = { id: id, s: s }; });
    return {
      v: v,
      itemById(id) {
        id = String(id | 0);
        if (id === "0") return null;
        return { id: id, name: (dd.itemEs && dd.itemEs[id]) || "Objeto " + id, img: CDN + v + "/img/item/" + id + ".png" };
      },
      spellByKey(key) {
        const e = spellByKey[String(key)];
        return e && e.s.img ? { id: e.id, name: e.s.name, img: CDN + v + "/img/spell/" + e.s.img } : null;
      },
      runeById(id) {
        const e = runeById[id];
        return e ? { id: e.r.id, name: e.r.name, img: CDN + "img/" + e.r.icon, tree: e.t.id } : null;
      },
      treeById(id) {
        const t = treeById[id];
        return t ? { id: t.id, name: t.name, img: CDN + "img/" + t.icon } : null;
      },
      shard(id) {
        const S = SHARDS[id];
        return S ? { id: id, name: S[0], img: CDN + "img/perk-images/StatMods/StatMods" + S[1] + "Icon.png" } : null;
      },
      item(name) {
        const id = dd.itemByName[norm(name)];
        return id ? { id: id, name: dd.itemEs[id], img: CDN + v + "/img/item/" + id + ".png" } : null;
      },
      rune(name) {
        const n = norm(name), e = runeIdx[RUNE_ALIAS[n] || n];
        return e ? { id: e.r.id, name: e.r.name, img: CDN + "img/" + e.r.icon, tree: e.t.id } : null;
      },
      tree(name) {
        const n = norm(name), t = treeIdx[TREE_ALIAS[n] || n];
        return t ? { id: t.id, name: t.name, img: CDN + "img/" + t.icon } : null;
      },
      spell(name) {
        const id = SPELL_IDS[norm(name)], s = id && dd.spells[id];
        return s && s.img ? { id: id, name: s.name, img: CDN + v + "/img/spell/" + s.img } : null;
      },
      champImg(file) { return CDN + v + "/img/champion/" + file; },
      splash(id) { return CDN + "img/champion/splash/" + id + "_0.jpg"; },
      abilityImg(file) { return CDN + v + "/img/spell/" + file; },
      passiveImg(file) { return CDN + v + "/img/passive/" + file; },
      detailUrl(id) { return CDN + v + "/data/es_MX/champion/" + encodeURIComponent(id) + ".json"; }
    };
  }

  // "Dominación: Cheap Shot, Legend: Alacrity" -> { tree: "Dominación", runes: ["Cheap Shot", "Legend: Alacrity"] }
  function parseTreeLine(line) {
    const s = String(line || ""), i = s.indexOf(":");
    if (i < 0) return { tree: "", runes: s.split(",").map(x => x.trim()).filter(Boolean) };
    return { tree: s.slice(0, i).trim(), runes: s.slice(i + 1).split(",").map(x => x.trim()).filter(Boolean) };
  }

  /* ---------- Catálogo de campeones ---------- */
  function fallbackRole(tags) {
    switch ((tags || [])[0]) {
      case "Marksman": return "adc";
      case "Support": return "support";
      case "Fighter": case "Tank": return "top";
      default: return "mid";
    }
  }

  function rolesFor(c, cur) {
    const set = [];
    const add = r => { if (r && set.indexOf(r) < 0) set.push(r); };
    const map = c.id && D.ROLE_MAP[c.id];
    if (map) map.split("").forEach(l => add(LETTER[l]));
    if (cur) Object.keys(cur.roles).forEach(add);
    let est = false;
    if (!set.length) { est = true; add(fallbackRole(c.tags)); }
    return { roles: ROLE_ORDER.filter(r => set.indexOf(r) >= 0), main: set[0], est: est };
  }

  function makeChamp(c, online) {
    const cur = D.BY_ID[c.k] || null;
    const r = rolesFor(c, cur);
    return {
      k: c.k, id: c.id, name: c.name, title: c.title, tags: c.tags || [],
      atk: c.atk, def: c.def, mag: c.mag, img: c.img, online: online,
      curated: cur, roles: r.roles, main: r.main, estRoles: r.est,
      dmg: cur ? cur.dmg : ((c.tags || [])[0] === "Tank" ? "TANK" : c.mag > c.atk ? "AP" : "AD"),
      diff: cur ? cur.diff : (c.dif <= 3 ? 1 : c.dif <= 7 ? 2 : 3)
    };
  }

  // dd = datos reducidos de Data Dragon, o null (sin conexión): entonces solo los campeones con build detallada
  function buildCatalog(dd) {
    const out = [];
    if (dd && dd.champs && dd.champs.length) {
      dd.champs.forEach(c => out.push(makeChamp({ id: c.id, k: c.id.toLowerCase(), name: c.name, title: c.title, tags: c.tags, atk: c.atk, def: c.def, mag: c.mag, dif: c.dif, img: c.img }, true)));
    }
    D.CH.forEach(cur => {
      if (out.some(c => c.k === cur.id)) return;
      out.push(makeChamp({ id: null, k: cur.id, name: cur.name, title: cur.title, tags: [], atk: 0, def: 0, mag: 0, dif: cur.diff * 3, img: null }, false));
    });
    out.sort((a, b) => a.name.localeCompare(b.name, "es"));
    return out;
  }

  function classText(c) {
    return (c.tags || []).map(t => D.CLASS_ES[t] || t).join(" / ");
  }

  /* ---------- Builds ---------- */
  function archetype(c, role) {
    const t = c.tags || [], t0 = t[0] || "";
    const has = x => t.indexOf(x) >= 0;
    const curAp = !!(c.curated && c.curated.dmg === "AP");
    const ap = c.mag > c.atk || (!c.atk && !c.mag && curAp);
    if (role === "support") {
      if (t0 === "Support") return "sup-enchanter";
      if (t0 === "Mage") return "sup-mage";
      if (t0 === "Tank" || t0 === "Fighter") return "sup-tank";
      if (has("Support")) return "sup-enchanter";
      return curAp ? "sup-mage" : "sup-tank";
    }
    if (t0 === "Marksman") return "adc-crit";
    if (t0 === "Tank") return "tank";
    if (t0 === "Mage") return "ap-mage";
    if (t0 === "Assassin") return ap ? "ap-assassin" : "ad-assassin";
    if (t0 === "Fighter") return ap ? "ap-mage" : "fighter";
    if (t0 === "Support") return ap ? "ap-mage" : "tank";
    if (c.curated) return c.curated.dmg === "TANK" ? "tank" : curAp ? "ap-mage" : "fighter";
    return "fighter";
  }

  function summsFor(key, role) {
    if (role === "jungle") return ["Smite", "Flash"];
    if (role === "top") return ["Flash", "Teleport"];
    if (role === "adc") return ["Flash", "Heal"];
    if (role === "support") return key === "sup-enchanter" ? ["Flash", "Heal"] : ["Flash", "Ignite"];
    return ["Flash", "Ignite"];
  }

  function startFor(key, role) {
    if (role === "jungle") return ["Objeto de jungla inicial", "Health Potion"];
    if (role === "support") return ["Objeto de soporte", "Control Ward"];
    if (key === "adc-crit" || key === "ad-assassin" || key === "fighter") return ["Doran's Blade", "Health Potion"];
    if (key === "tank") return ["Doran's Shield", "Health Potion"];
    return ["Doran's Ring", "Health Potion"];
  }

  // v = 0 (estándar), 1 o 2 (variantes de la clase)
  function archVariant(key, v) {
    const a = D.ARCH[key];
    if (!v) return Object.assign({ name: "Estándar" }, a);
    const x = (D.ALT[key] || [])[v - 1];
    return x ? Object.assign({}, a, x) : a;
  }
  function baseBuild(c, role, v) {
    const key = archetype(c, role), a = archVariant(key, v);
    return { arch: key, label: D.ARCH[key].label, runes: a.runes, summs: summsFor(key, role), skills: a.skills, start: startFor(key, role), boots: a.boots, core: a.core, sit: a.sit, tip: a.tip };
  }
  // Fragmentos de estadísticas recomendados (ids de Riot: ataque, flexible, defensa)
  const SHARD_BY = { "ap-mage": [5008, 5008, 5011], "ap-assassin": [5008, 5008, 5011], "ad-assassin": [5008, 5008, 5011], "adc-crit": [5005, 5008, 5011],
    "fighter": [5008, 5008, 5011], "tank": [5008, 5001, 5001], "sup-enchanter": [5008, 5001, 5001], "sup-tank": [5008, 5001, 5001], "sup-mage": [5008, 5008, 5001] };
  function shardsFor(key) { return SHARD_BY[key] || SHARD_BY.fighter; }
  // Objetos de cada clase según las etiquetas de Data Dragon
  const ITEM_TAGS = { "ap-mage": ["SpellDamage"], "ap-assassin": ["SpellDamage"], "sup-mage": ["SpellDamage"], "ad-assassin": ["Damage"], "fighter": ["Damage"],
    "adc-crit": ["CriticalStrike", "AttackSpeed", "Damage"], "tank": ["Armor", "SpellBlock", "Health"], "sup-tank": ["Armor", "SpellBlock", "Health"],
    "sup-enchanter": ["ManaRegen", "AbilityHaste", "SpellDamage"] };
  function moreItems(dd, key, exclude) {
    const tags = ITEM_TAGS[key] || [], skip = {};
    (exclude || []).forEach(n => { const id = dd.itemByName[norm(n)]; if (id) skip[id] = true; });
    return (dd.legendary || []).filter(it => !skip[it.id] && it.t.some(t => tags.indexOf(t) >= 0)).slice(0, 30);
  }
  function variantNames(c, mode, role) {
    const key = archetype(c, mode === "sr" ? role : c.main);
    return ["Estándar"].concat((D.ALT[key] || []).map(x => x.name));
  }

  // kind: "detailed" (escrita a mano para ese campeón) o "base" (build base de su clase)
  function getBuild(c, mode, role, v) {
    const cur = c.curated;
    v = v | 0;
    if (mode === "sr") {
      const key = archetype(c, role), alt = archVariant(key, v ? (v + 1) % 3 : 1).runes; // segunda página de runas
      if (cur && cur.roles[role] && !v) return { kind: "detailed", b: cur.roles[role], alt: alt, arch: key };
      return { kind: "base", b: baseBuild(c, role, v), alt: alt, arch: key };
    }
    if (cur && !v) return { kind: "detailed", b: mode === "aram" ? cur.aram : cur.arena };
    const a = archVariant(archetype(c, c.main), v);
    const items = a.core.concat(a.sit.slice(0, 2).map(s => s[0]));
    return { kind: "base", b: mode === "aram" ? { key: a.runes.key, items: items, tip: a.tip, label: a.label } : { items: items.slice(0, 4), tip: a.tip, label: a.label } };
  }

  /* ---------- Auditoría: ¿existen en Data Dragon todos los nombres de data.js? ---------- */
  function audit(dd) {
    const res = makeResolver(dd);
    const miss = { items: [], runes: [], trees: [], spells: [] };
    const seen = { items: {}, runes: {}, trees: {}, spells: {} };
    const chk = (kind, name, fn) => {
      if (!name || seen[kind][name]) return;
      seen[kind][name] = true;
      if (!fn(name)) miss[kind].push(name);
    };
    const item = n => { if (PLACEHOLDERS.indexOf(n) < 0) chk("items", n, x => res.item(x)); };
    const rune = n => chk("runes", n, x => res.rune(x));
    const check = b => {
      if (!b) return;
      if (b.runes) {
        rune(b.runes.key);
        [b.runes.main, b.runes.sec].forEach(l => {
          const p = parseTreeLine(l);
          chk("trees", p.tree, x => res.tree(x));
          p.runes.forEach(rune);
        });
      }
      if (b.key) rune(b.key);
      (b.summs || []).forEach(s => chk("spells", s, x => res.spell(x)));
      (b.start || []).forEach(item);
      if (b.boots) item(b.boots);
      (b.core || []).forEach(item);
      (b.sit || []).forEach(s => item(s[0]));
      (b.items || []).forEach(item);
    };
    D.CH.forEach(c => { Object.keys(c.roles).forEach(r => check(c.roles[r])); check(c.aram); check(c.arena); });
    Object.keys(D.ARCH).forEach(k => check(D.ARCH[k]));
    Object.keys(D.ALT || {}).forEach(k => D.ALT[k].forEach(a => check(a)));
    ROLE_ORDER.forEach(r => Object.keys(D.ARCH).forEach(k => summsFor(k, r).forEach(s => chk("spells", s, x => res.spell(x)))));
    chk("spells", "Mark", x => res.spell(x));

    const ids = dd.champs.map(c => c.id);
    return {
      version: dd.v,
      champions: ids.length,
      itemsInGame: Object.keys(dd.itemEn).length,
      runesInGame: dd.trees.reduce((n, t) => n + t.runes.length, 0),
      unmatched: miss,
      championsWithoutRoleMap: ids.filter(id => !D.ROLE_MAP[id]),
      roleMapNotInGame: Object.keys(D.ROLE_MAP).filter(id => ids.indexOf(id) < 0),
      curatedNotInGame: D.CH.map(c => c.id).filter(k => !ids.some(id => id.toLowerCase() === k))
    };
  }

  const api = { variantNames, shardsFor, moreItems, norm, reduceDD, makeResolver, parseTreeLine, buildCatalog, classText, archetype, getBuild, audit, CDN, ROLE_ORDER, PLACEHOLDERS };
  root.Catalog = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
