#!/usr/bin/env node
/* ============================================================================
   tools/validate_data.js — wykonywalny kontrakt danych PaleoAtlas
   ----------------------------------------------------------------------------
   Po co: 19 skryptów z js/data/ składa się w jedną całość WEDŁUG KOLEJNOŚCI
   <script> w index.html (późniejsze robią „splice" na wcześniejszych). Zła
   kolejność lub brak pliku nie daje błędu — guardy `if (!window.PALEO) return;`
   po cichu nic nie robią, a mapa wygląda „prawie dobrze". Ten walidator:
     • ładuje dane w TEJ SAMEJ kolejności co przeglądarka (nie alfabetycznie!),
     • sprawdza niezmienniki (oś czasu, geometria, proweniencja, odwołania),
     • mówi, co jest błędem (exit 1), a co długiem do naprawy (WARN, exit 0).

   Użycie:
     node tools/validate_data.js            # błędy → exit 1
     node tools/validate_data.js --strict   # ostrzeżenia też → exit 1 (bramka v1.0)
     node tools/validate_data.js --json     # maszynowo (CI)
   Zero zależności — celowo: walidator musi działać także bez Chromium.
============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const STRICT = process.argv.includes('--strict');
const JSONOUT = process.argv.includes('--json');
const R = { errors: [], warns: [], checks: 0 };

const ok = (cond, msg, detail) => {
  R.checks++;
  if (!cond) R.errors.push(detail ? msg + ' — ' + detail : msg);
  return !!cond;
};
const warn = (cond, msg, detail) => {
  R.checks++;
  if (!cond) R.warns.push(detail ? msg + ' — ' + detail : msg);
  return !!cond;
};

/* ---------------------------------------------------------------- 1. STRUKTURA */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scriptOrder = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]);
const dataOrder = scriptOrder.filter(f => f.startsWith('js/data/'));
const dataFiles = fs.readdirSync(path.join(ROOT, 'js/data')).filter(f => f.endsWith('.js')).map(f => 'js/data/' + f);

ok(dataOrder.length >= 19, 'index.html linkuje wszystkie skrypty danych', dataOrder.length + ' skryptów');
const missingFiles = dataOrder.filter(f => !fs.existsSync(path.join(ROOT, f)));
ok(missingFiles.length === 0, 'wszystkie podlinkowane pliki istnieją', missingFiles.join(', '));
const orphans = dataFiles.filter(f => !dataOrder.includes(f));
warn(orphans.length === 0, 'brak osieroconych plików w js/data (nieładowane przez index.html)', orphans.join(', '));

/* ---------------------------------------------------------------- 2. WCZYTANIE */
const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx;
vm.createContext(ctx);
const loadErrors = [];
/* Ładujemy WYŁĄCZNIE warstwę danych (js/data/), w kolejności z index.html.
   app.js i globe.js czytają DOM/Leafleta — nie da się ich uruchomić poza przeglądarką. */
for (const f of dataOrder) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }); }
  catch (e) { loadErrors.push(f + ': ' + e.message); }
}
ok(loadErrors.length === 0, 'skrypty danych wczytują się bez wyjątków', loadErrors.join(' | '));

const REQUIRED = ['SITES', 'META', 'PALEO', 'GLOSSARY', 'TOM1', 'ENV', 'SHELVES', 'BIOME_META', 'BIOME_POLLEN', 'WORLD_LAND'];
const missingGlobals = REQUIRED.filter(g => !ctx[g]);
ok(missingGlobals.length === 0, 'wszystkie wymagane obiekty globalne istnieją', missingGlobals.join(', '));
if (missingGlobals.length) return finish();   // dalej nie ma sensu

const { SITES, META, PALEO, GLOSSARY, TOM1, ENV, SHELVES, BIOME_META, BIOME_POLLEN } = ctx;

/* --------------------------------------------- 3. SPLICE'E (cichy no-op → błąd) */
const iceSets = PALEO.ice_sets || {};
const allIce = Object.values(iceSets).flat();
const withSrc = allIce.filter(p => p.src);
ok(Object.keys(iceSets).length >= 10, 'PALEO.ice_sets ma zestawy epok', Object.keys(iceSets).length + ' kluczy');
ok((iceSets.lgm || []).length >= 100, 'splice LGM zastosowany (≥100 poligonów)', (iceSets.lgm || []).length + '');
ok(withSrc.length / Math.max(1, allIce.length) >= 0.5,
  'większość poligonów lodu ma proweniencję (splice nie został po cichu pominięty)',
  withSrc.length + '/' + allIce.length + ' ze src');

/* ---------------------------------------------------------------- 4. PROWENIENCJA */
const KNOWN_SRC = new Set(['DATED-1', 'NADI-1', 'PATICE', 'PATICE-LAKE', 'ICE6G', 'RGI-7',
  'BRITICE-CHRONO', 'GLACIMONTIS', 'Q19', 'DANE_PORTALU', 'POMIAR']);
const unknownSrc = [...new Set(allIce.filter(p => p.src && !KNOWN_SRC.has(p.src)).map(p => p.src))];
ok(unknownSrc.length === 0, 'pola src pochodzą z zamkniętej listy', unknownSrc.join(', '));
/* Prawdziwy defekt proweniencji: obiekt oznaczony jako POMIAR nie ma src — wtedy UI
   podpisywał go „rekonstrukcją uproszczoną", czyli zmierzona wartość udawała szkic.
   UWAGA: samo „km²" w nazwie NIE jest obietnicą pomiaru — szkice autora cytują
   powierzchnie z literatury (np. „czapolód ~400 km² (SCHEMAT: krąg…)") i to jest OK. */
const measureNoSrc = allIce.filter(p => !p.src && /POMIAR/.test(p.name || ''));
warn(measureNoSrc.length === 0, 'obiekty podające pomiar (km²) mają własne src (nie udają „rekonstrukcji")',
  measureNoSrc.length + ': ' + measureNoSrc.slice(0, 3).map(p => (p.name || '?').slice(0, 50)).join(' | '));
const noSrc = allIce.filter(p => !p.src);
warn(noSrc.length === 0, 'wszystkie poligony mają src (ideał; reszta to ręczne szkice autora)',
  noSrc.length + ' bez src (dozwolone: jawne szkice, np. ' + noSrc.slice(0, 2).map(p => (p.name || '?').slice(0, 30)).join(', ') + ')');
const noName = allIce.filter(p => !p.name);
ok(noName.length === 0, 'każdy poligon lodu ma nazwę', noName.length + ' bez nazwy');

/* ------------------------------------- 5. GEOMETRIA I KONWENCJE WSPÓŁRZĘDNYCH */
/* Trzy konwencje w jednym portalu — to MUSI być sprawdzane, bo pomyłka daje
   „mapę prawie poprawną": stanowiska [lat,lon], lód/szelfy [lat,lon], GeoJSON [lon,lat]. */
const inLat = v => typeof v === 'number' && v >= -90.001 && v <= 90.001;
/* Długość geograficzna może być „rozwinięta" (−182°, 266°) — Leaflet normalizuje ją przy
   rysowaniu, a pierścienie przeciwpołudnikowe muszą być rozcięte w jednym kawałku.
   Kontrakt: |lon| ≤ 360. Wartości poza ±180 raportujemy jako informację, nie błąd. */
const inLon = v => typeof v === 'number' && v >= -360.001 && v <= 360.001;
const unwrapped = v => Math.abs(v) > 180.001;

const siteBad = SITES.rdzen.concat(SITES.sasiedzi).filter(s => !inLat(s.lat) || !inLon(s.lon));
ok(siteBad.length === 0, 'stanowiska: [lat, lon] w zakresie', siteBad.slice(0, 3).map(s => s.id).join(', '));

const ringOf = p => p.rings || (p.pts ? [p.pts] : null);
let geomBad = 0, coordBad = 0, lonOver180 = 0;
allIce.forEach(p => {
  const rings = ringOf(p);
  if (!rings || !rings.length || !rings.every(r => Array.isArray(r) && r.length >= 3)) { geomBad++; return; }
  rings.forEach(r => r.forEach(([a, b]) => {
    if (!inLat(a) || !inLon(b)) coordBad++;
    if (unwrapped(b)) lonOver180++;
  }));
});
ok(geomBad === 0, 'lód: każdy pierścień ma ≥3 punkty', geomBad + ' złych');
ok(coordBad === 0, 'lód: [lat, lon] w zakresie', coordBad + ' złych punktów');
warn(lonOver180 === 0, 'lód: długości geograficzne w −180…180 (bez „rozwiniętych")', lonOver180 + ' punktów poza ±180° (dozwolone, Leaflet normalizuje)');

/* UWAGA na strukturę: SHELVES[poziom] = [ poligon, … ], a poligon = [ pierścień, … ],
   pierścień = [[lat, lon], …]. O jeden poziom więcej niż w lodzie (tam rings są wprost). */
let shBad = 0, shGeom = 0, shPolys = 0, shUnwrapped = 0;
Object.values(SHELVES).forEach(list => (list || []).forEach(poly => {
  shPolys++;
  if (!Array.isArray(poly) || !poly.length) { shGeom++; return; }
  poly.forEach(ring => {
    if (!Array.isArray(ring) || ring.length < 3) { shGeom++; return; }
    ring.forEach(([a, b]) => { if (!inLat(a) || !inLon(b)) shBad++; else if (unwrapped(b)) shUnwrapped++; });
  });
}));
ok(shGeom === 0 && shBad === 0, 'szelfy: pierścień ≥3 punktów, [lat, lon] w zakresie',
  shPolys + ' poligonów · ' + shGeom + ' złej geometrii · ' + shBad + ' złych punktów');
warn(shUnwrapped === 0, 'szelfy: długości w −180…180 (bez „rozwiniętych")',
  shUnwrapped + ' punktów poza ±180° (dozwolone, Leaflet normalizuje)');

const wl = ctx.WORLD_LAND;
const feat = wl && wl.features ? wl.features[0] : null;
if (feat) {
  const first = JSON.stringify(feat.geometry.coordinates).match(/\[(-?\d+\.?\d*),(-?\d+\.?\d*)\]/);
  const a = first ? +first[1] : 0, b = first ? +first[2] : 0;
  /* W GeoJSON pierwsza współrzędna to długość: |lon| może być 180, |lat| ≤ 90 */
  ok(Math.abs(a) <= 180.001 && Math.abs(b) <= 90.001, 'WORLD_LAND: GeoJSON [lon, lat]', a + ', ' + b);
}
ok(!!wl && (wl.type === 'FeatureCollection' || Array.isArray(wl)), 'WORLD_LAND ma strukturę GeoJSON');

/* ---------------------------------------------------------------- 6. OŚ CZASU */
const F = META.fazy || [];
ok(F.length >= 17, 'fazy: komplet', F.length + '');
ok(new Set(F.map(f => f.id)).size === F.length, 'fazy: unikalne id');
ok(F.every(f => f.od_tys > f.do_tys), 'fazy: od_tys > do_tys');
ok(F.every((f, i) => i === 0 || Math.abs(F[i - 1].do_tys - f.od_tys) < 1e-9), 'fazy: ciągłe (bez luk i nakładek)',
  F.map((f, i) => i === 0 ? '' : (F[i - 1].do_tys - f.od_tys)).filter(d => d !== '' && Math.abs(d) > 1e-9).join(','));
ok(F[F.length - 1].do_tys <= 0.001, 'fazy: oś kończy się „dziś"', F[F.length - 1].do_tys + '');

const T = ENV.ticks || [];
ok(T.length >= 40, 'env: komplet przekrojów', T.length + '');
ok(new Set(T.map(t => t.bp)).size === T.length, 'env: unikalne bp');
ok(T.every(t => t.label && String(t.label).trim().length > 3), 'env: każdy przekrój ma etykietę');
/* Kolejność NIE jest monotoniczna w 4 miejscach (np. MIS 24 940 ka → MIS 23 920 ka):
   plik grupuje przekroje wg źródła, a nie wg wieku. Dziś to nieszkodliwe — envTickForBP
   skanuje liniowo i wybiera okno/najbliższy przekrój. Zostawiamy jako OSTRZEŻENIE, żeby
   nikt nie „zoptymalizował" tego do wyszukiwania binarnego bez posortowania danych. */
const envUnsorted = T.filter((t, i) => i > 0 && t.bp < T[i - 1].bp).length;
warn(envUnsorted === 0, 'env: przekroje uporządkowane rosnąco — UWAGA: kod nie może zakładać sortowania',
  envUnsorted + ' spadków bp (grupy wg źródła, nie wg wieku)');
const sea = ENV.sea || [];
ok(sea.every((p, i) => i === 0 || p[0] >= sea[i - 1][0]), 'env: krzywa morza uporządkowana po czasie');
ok(sea.every(p => p[1] > -150 && p[1] < 40), 'env: poziom morza w sensownym zakresie', sea.map(p => p[1]).join(' ').slice(0, 80));
const ms = META.milestones || [];
ok(ms.every(m => m.bp >= F[F.length - 1].do_tys * 1000 && m.bp <= F[0].od_tys * 1000), 'kamienie milowe: bp w zakresie osi');

/* ---------------------------------------------- 7. INTEGRALNOŚĆ ODWOŁAŃ (sites) */
const kult = new Set(META.kultury.map(c => c.id));
const all = SITES.rdzen.concat(SITES.sasiedzi);
const ids = new Set(all.map(s => s.id));
ok(new Set(all.map(s => s.id)).size === all.length, 'stanowiska: unikalne ID');
ok(all.every(s => kult.has(s.kultura)), 'stanowiska: kultura istnieje w META',
  all.filter(s => !kult.has(s.kultura)).slice(0, 3).map(s => s.id + '=' + s.kultura).join(', '));
ok(all.every(s => (s.powiazane || []).every(p => ids.has(p))), 'stanowiska: powiazane → istniejące ID',
  all.filter(s => (s.powiazane || []).some(p => !ids.has(p))).slice(0, 3).map(s => s.id).join(', '));
ok(all.every(s => !s.duplikat_patrz || ids.has(s.duplikat_patrz)), 'stanowiska: duplikat_patrz → istniejące ID');
ok(all.every(s => ['POTWIERDZONE', 'CZESCIOWO', 'KWESTIONOWANE', 'ZWERYFIKOWANE'].includes(s.status)),
  'stanowiska: status z zamkniętej listy');
ok(all.every(s => s.nazwa && s.nazwa.trim().length > 2), 'stanowiska: każdy ma nazwę');
ok(META.kultury.every(c => /^#[0-9a-fA-F]{6}$/.test(c.kolor)), 'kultury: kolory w formacie #rrggbb');

/* ---------------------------------------------------------------- 8. SŁOWNIK */
const terms = new Set(GLOSSARY.map(g => g.termin));
const gids = new Set(GLOSSARY.map(g => g.id));
ok(terms.size === GLOSSARY.length, 'słownik: unikalne terminy');
ok(gids.size === GLOSSARY.length && GLOSSARY.every(g => g.id), 'słownik: każde hasło ma unikalny, stabilny identyfikator');
/* Odnośniki są identyfikatorami — martwy odnośnik to realnie zepsuty link w UI, więc BŁĄD. */
const dangling = [];
GLOSSARY.forEach(g => (g.zobacz_tez || []).forEach(z => { if (!gids.has(z) && !terms.has(z)) dangling.push(g.termin + ' → ' + z); }));
ok(dangling.length === 0, 'słownik: „zobacz też" prowadzi do istniejących haseł (po identyfikatorze)',
  dangling.length + ' martwych, np. ' + dangling.slice(0, 3).join(' | '));
ok(GLOSSARY.every(g => g.termin && g.definicja && g.kategoria), 'słownik: każde hasło ma termin, definicję i kategorię');
const chap = (TOM1 || []).map(c => c.n).sort((a, b) => a - b);
ok(chap.every((n, i) => n === i + 1), 'Tom I: numeracja 1..' + chap.length + ' bez dziur');

/* ---------------------------------------------------------------- 9. BIOMY */
const ep = BIOME_META.epochs || [];
ok(ep.length >= 40, 'biomy: komplet migawek', ep.length + '');
ok(ep.every(e => fs.existsSync(path.join(ROOT, 'js/data/biome', e.file))), 'biomy: pliki rastrów istnieją',
  ep.filter(e => !fs.existsSync(path.join(ROOT, 'js/data/biome', e.file))).slice(0, 3).map(e => e.file).join(', '));
ok(ep.every(e => { const k = Array.isArray(e.ka) ? e.ka[0] : e.ka; return k >= 0 && k <= 3300; }), 'biomy: ka w zakresie 0–3300');
const palKeys = Object.keys(BIOME_META.palette || {}), nmKeys = Object.keys(BIOME_META.names || {});
ok(palKeys.length === nmKeys.length && palKeys.every(k => BIOME_META.names[k]), 'biomy: paleta ↔ nazwy klas',
  palKeys.length + ' vs ' + nmKeys.length);
ok(palKeys.every(k => /^#[0-9a-fA-F]{6}$/.test(BIOME_META.palette[k])), 'biomy: kolory palety w #rrggbb');
const pk = Object.keys(BIOME_POLLEN || {});
ok(pk.every(k => ['0k', '6k', '18k'].includes(k)), 'pyłek: tylko znane migawki 0k/6k/18k', pk.join(','));
ok(pk.every(k => BIOME_POLLEN[k].every(pt => inLat(pt[0]) && inLon(pt[1]) && pt[2] >= 0)), 'pyłek: [lat, lon, klasa] poprawne');

/* ---------------------------------------------------------------- 10. METADANE */
const bfs = path.join(ROOT, 'js/data/build_info.js');
if (fs.existsSync(bfs)) {
  const bctx = {}; bctx.window = bctx; vm.createContext(bctx);
  vm.runInContext(fs.readFileSync(bfs, 'utf8'), bctx);
  const B = bctx.BUILD || {};
  ok(!!B.dataVersion && !!B.dataHash, 'build_info: wersja i skrót danych obecne');
  const expected = { stanowiska: all.length, fazy: F.length, przekroje: T.length, migawkiBiomow: ep.length };
  const wrong = Object.entries(expected).filter(([k, v]) => B.counts && B.counts[k] !== v);
  ok(wrong.length === 0, 'build_info: liczby zgodne z danymi (build nie jest przestarzały)',
    wrong.map(([k, v]) => k + ': w pliku ' + (B.counts || {})[k] + ', w danych ' + v).join('; '));
} else {
  warn(false, 'build_info.js istnieje (uruchom tools/stamp_build.py)');
}

finish();

function finish() {
  if (JSONOUT) {
    console.log(JSON.stringify({ ok: R.errors.length === 0 && (!STRICT || R.warns.length === 0), checks: R.checks, errors: R.errors, warnings: R.warns }, null, 1));
  } else {
    R.warns.forEach(w => console.log('⚠  ' + w));
    R.errors.forEach(e => console.log('❌ ' + e));
    console.log('\n── KONTRAKT DANYCH: ' + R.checks + ' kontroli · ' + R.errors.length + ' błędów · ' + R.warns.length + ' ostrzeżeń');
    if (!R.errors.length) console.log('✅ Dane zgodne z kontraktem' + (R.warns.length ? ' (ostrzeżenia = dług do naprawy, nie awaria)' : ''));
    if (STRICT && R.warns.length) console.log('   --strict: ostrzeżenia traktowane jak błędy');
  }
  process.exit(R.errors.length ? 1 : (STRICT && R.warns.length ? 1 : 0));
}
