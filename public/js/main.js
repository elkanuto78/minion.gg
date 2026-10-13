/* ---------- Inicio ---------- */
loadDB();
setCatalog();   // al principio solo los campeones con build detallada; el resto llega con Data Dragon
renderAll();

loadDD().then(dd => {
  if (dd) { DD = dd; RES = Catalog.makeResolver(dd); ddState = "ok"; } else { ddState = "fail"; }
  setCatalog();
  renderAll();
  if (!$("#view-stats").hidden) renderStats();
});

fetch("/api/health").then(r => (r.ok ? r.json() : null)).then(j => {
  API.ok = !!(j && j.ok);
  if (API.ok && !$("#view-stats").hidden) renderStats();
}).catch(() => { /* sin servidor: solo registro manual */ });

if (location.hash === "#stats") showTab("stats");
