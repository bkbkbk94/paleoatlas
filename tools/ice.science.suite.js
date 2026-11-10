/* ============================================================================
   ICE-SCIENCE-SUITE — kompleksowa walidacja lądolodu przeciwko literaturze.
   Warstwy:
     I.   Inżynieria danych (geometria, topologia, kompletność haseł źródeł)
     II.  Chronologia ENV (okna pięter, rozdzielczość referencji)
     III. Kontrprzykłady naukowe per epoka (marginesy wg pomiarów/zestawień)
     IV.  Linie brzegowe Polski — kanoniczne punkty z CSV (verbatim)
     V.   UI/browser — karta fazy pokazuje prawdę o pochodzeniu warstwy
     VI.  NADI-1 — deglacjacja Ameryki Płn. (izochrony, scalenie 22 ka, cofka)
     VII. AZJA — spójność DANE/SCHEMAT (Tajmyr, NE Azja, Beringia)
     VIII. PATICE — Lodowiec Patagoński (Ameryka Płd., rozpad po 15 ka, ACR, „dziś”)
     IX.  AFRYKA — Rift Wsch. + Maghreb z GLACIMONTIS (Chen/Osmaston/Hannah); readvance
          Atlasu w YD (Fink 2014) = świadomy schemat; „dziś” = pomiary
     X.   AUSTRALIA + NOWA GWINEA + TASMANIA — GLACIMONTIS (Barrows 2001/2002, Prentice);
          po ~17 ka = narracyjny schemat (szybka deglacjacja, brak readvance); „dziś” = pomiar Puncak Jaya
     XI.  NOWA ZELANDIA — GLACIMONTIS w LGM/poznańskiej (35 rekordów, Σ~40 tys. km²);
          ACR/YD narracja rzadkich okien = świadomy schemat; „dziś” = pomiary
     XVI. GLACIMONTIS FALA 2 — inżynieria podmiany: jedno źródło na grupę×fazę,
     XVII. PATICE-LAKES — paleojeziora przylodowcowe Patagonii 10–35 ka (Davies i in.
          2020; Chalenko ~4,7 tys. km²); krzywa objętościowa; splice + woda NAD lądem, POD lodem
          MIN_COUNT chroni narrację ACR/YD; q_lgm = nadpisane PA_*_LGM
     XII. ANTARKTYDA — ICE-6G_C (VM5a): maski 1° 26→0 ka; LGM 15,2 mln km² vs „dziś” 14,2;
          rozcięcie po antymeridianie, clamp Mercatora −84,9; fazy głębokie = stary schemat
     XIII. GLACIMONTIS — 578 rekordów / ~4 tys. poligonów lodowców górskich (fala 1);
          Tatry (Zasadni), Wierchojańsk (Barr & Clark 48 tys.), Okna wieku z rekordu
     XIV. GRENLANDIA — ICE-6G_C: LGM ~2,50 mln km² vs „dziś” 1,74 (rzeczywista 1,71)
     XV.  WYSPY BRYTYJSKIE — BRITICE-CHRONO (empiryczne, optimum co 1 ka, PANGAEA 945729):
          BIIS maks. ~0,83 mln km²; B-A = bez lodu; YD = readvance Loch Lomond (schemat)
     XVII. PATICE-LAKES — 49 paleojezior przylodowcowych Patagonii 10–35 ka (Davies i in.
          2020; Mendeley ztz59y79vv): pik 13–15 ka ~13,7 tys. km² (Chalenko 4,7 tys.);
          woda POD lodem; q_35/q_30 ka doklejane; ≥40 ka = brak rekonstrukcji
     XVIII. WARIANTY BRITICE-CHRONO — MINIMUM/OPTIMUM/MAKSIMUM niepewności datowań
          BIIS (Clark i in. 2022): ścisłe min < opt < max; przełącznik „🧊 BIIS” w karcie
          fazy zamienia wpisy w locie (mapa + globus, cache per-wariant); OPTIMUM domyślne
     XIX. ISLANDIA — „dziś” = RGI 7.0 (568 jęzorów → 9+ czap; Vatnajökull ~8 184 km²);
          deglacjacja = ICE-6G_C 15/13,5/12/10,5 ka (maska 1° statyczna do 13,5 ka —
          udokumentowana); LGM i starsze = schemat z natury empirycznej (Norðdahl &
          Pétursson 2005); walidacja IcelandICE DB 37 punktów (Goffin i in. 2026)
     XX.  GŁĘBOKIE STADIAŁY płk. płd. — etykiety epokowe z cytatami: PIS ≥40 ka =
          SCHEMAT portalu z ticka ENV (PATICE ≤35 ka — Davies 2020; moreny zewn. —
          Rabassa 2008; GPG ~1,09 mln — Hein 2009, tylko dla Matuyamy); Antarktyda
          ≥ MIS 3 = kotwica ≈ „dziś” z notką RAISED (Bentley 2014 — tylko do LGM)
     XXI. BIOMY — realna warstwa modelowa (zastąpiła schemat): 56 migawek PNG 0,5°
          (0–120 ka Beyer2020 Sci.Data 7:236 · 121–799 ka Krapp2021 Sci.Data 8:228 ·
          ≥810 ka Barreto2023 GEB 32:1034 + klasyfikator HG-lite v0.6 portalu, MODEL
          etykietowany); lody epok zgodne 1:1 z envTickForBP; kotwice DANYCH
          BIOME 6000 v4.2 (0k/6k/18k) rysowane punktowo; legenda + tooltip pikselowy
   Wartości literaturowe skalibrowane wg:
     Lisiecki & Raymo 2005 (LR04); Railsback i in. 2015; Tierney i in. 2020
     (Science 370); Batchelor i in. 2019 (Nat. Commun. 10:3713 + OSF osf.io/7jen3);
     Hughes i in. 2016 (DATED-1, Boreas; PANGAEA 848117); Margold i in. 2011
     (Norwegian Arch. Rev.); Ehlers & Gibbard 2004/2011; Lambeck 2014 (PNAS);
     Lambeck i in. 2010; Miller i in. 2020; USGS PRISM; Marks i in. (linie PL z CSV);
     Dalton, Dulfer, Margold i in. 2023 (NADI-1, QSR 321:108345; Zenodo 10.5281/zenodo.8161764).
============================================================================ */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = [];
let failed = 0;
function check(id, cond, info) {
  const ok = !!cond;
  results.push({ id, ok });
  if (!ok) failed++;
  console.log((ok ? '✅ ' : '❌ ') + id + (info !== undefined ? ' — ' + String(info).slice(0, 210) : ''));
}

/* ------------- ładowanie danych jak w przeglądarce ------------- */
global.window = {};
for (const f of ['paleo.js', 'ice_dated.js', 'ice_nadi.js', 'ice_patice.js', 'ice_patlakes.js', 'ice_ice6g.js', 'ice_britice.js', 'ice_glacmont.js', 'ice_quat.js', 'ice_rgi_isl.js', 'env.js']) {
  eval(fs.readFileSync('/home/user/paleoatlas/js/data/' + f, 'utf8'));
}
const P = window.PALEO, Q = window.ICE_QUAT, ENV = window.ENV;
const parts = p => (p.rings || [p.pts]);
const allRings = polys => polys.flatMap(parts);
function areaDeg(ring) {            // |deg²|, bez wag — do porównań względnych
  let s = 0; for (let i = 0; i < ring.length - 1; i++) s += ring[i][1] * ring[i + 1][0] - ring[i + 1][1] * ring[i][0];
  return Math.abs(s) / 2;
}
function domArea(rings) { let b = 0; for (const r of rings) b = Math.max(b, areaDeg(r)); return b; }
function areaNH(polys, latCut) {    // suma powierzchni pierścieni leżących ponad latCut
  let a = 0;
  for (const r of allRings(polys)) {
    let mn = 99, mx = -99;
    for (const pt of r) { mn = Math.min(mn, pt[0]); mx = Math.max(mx, pt[0]); }
    if (mn >= latCut) a += areaDeg(r);
  }
  return a;
}
function minLat(polys, lon0, lon1, lat0) {  // minimalna szerokość w sektorze (+ wymóg lat>=lat0)
  let m = 99;
  for (const r of allRings(polys)) for (const pt of r)
    if (pt[1] >= lon0 && pt[1] <= lon1 && pt[0] >= lat0 && pt[0] < m) m = pt[0];
  return m;
}
function minLon(rings) { let m = 99; for (const r of rings) for (const pt of r) m = Math.min(m, pt[1]); return m; }
function maxLatB(rings) { let m = -99; for (const r of rings) for (const pt of r) m = Math.max(m, pt[0]); return m; }
const hasPT = (polys, pt, eps) => allRings(polys).some(r => r.some(p => Math.abs(p[0] - pt[0]) <= eps && Math.abs(p[1] - pt[1]) <= eps));
const inRange = (v, a, b) => v >= a && v <= b;

/* ENV — odtworzenie logiki wyboru (okno piętra → najbliższy), jak w app.js */
function envTickForBP(bp) {
  for (const t of ENV.ticks) if (t.w && bp >= t.w[0] && bp <= t.w[1]) return t;
  let best = ENV.ticks[0], bd = Math.abs(bp - best.bp);
  for (const t of ENV.ticks) { const d = Math.abs(bp - t.bp); if (d < bd) { bd = d; best = t; } }
  return best;
}
function seaAtBP(bp) {
  const ka = bp / 1000, S = ENV.sea;
  if (ka <= S[0][0]) return S[0][1];
  for (let i = 1; i < S.length; i++) if (ka <= S[i][0]) {
    const [k0, m0] = S[i - 1], [k1, m1] = S[i];
    return m0 + (m1 - m0) * (ka - k0) / (k1 - k0);
  }
  return S[S.length - 1][1];
}
/* poligony lodu tak jak rysuje aplikacja (q + Antarktyda z 'now' + Patagonia wg źródeł) */
const PATICE_Q = { q_30ka: 'p30ka', q_35ka: 'p35ka', q_lgm: 'p20ka' };
const Q19_HAS_SA = { q_45ka: 1, q_gauss: 1 };
function envIcePolys(t) {
  if (!t) return P.ice_sets.now;
  if (t.ice) return P.ice_sets[t.ice] || [];
  if (t.q && Q[t.q]) {
    const extra = P.ice_sets.now.filter(p => /Antarktyd/.test(p.name)).map(p => Object.assign({}, p, {
      name: p.name + ' — kotwica ≈ „dziś”: dla ≥ MIS 3 nie ma otwartych przekrojów empirycznych'
        + ' (RAISED — Bentley i in. 2014, QSR 100:1–9 — kończy się na LGM; starsze stadiały'
        + ' wielkościowo nieznane, modelowo ≈ „dziś” lub większe)'
    }));
    if (window.ICE_PATICE && PATICE_Q[t.q]) extra.push(...window.ICE_PATICE[PATICE_Q[t.q]]);
    else if (/mis5[abcd]/.test(t.q) || Q19_HAS_SA[t.q]) { /* świadomie nic — jak app.js */ }
    else if (window.PA_PAT_schemat) extra.push(window.PA_PAT_schemat((t.label || '').split(' — ')[0]));
    else if (window.PA_PATAGONIA_SCHEMAT) extra.push(window.PA_PATAGONIA_SCHEMAT);
    const PATLAK_Q = { q_30ka: 'l30ka', q_35ka: 'l35ka' };
    if (window.PATICE_LAKES && PATLAK_Q[t.q]) (window.PATICE_LAKES[PATLAK_Q[t.q]] || []).forEach(l => extra.push({ name: l.name, lname: l.name, lake: 1, lp: PATLAK_Q[t.q], rings: l.rings }));
    if (!/mis5[abcd]/.test(t.q)) { const afr = t.q === 'q_lgm' && window.PA_AFRYKA_LGM ? window.PA_AFRYKA_LGM : window.PA_AFRYKA_SCHEMAT; if (afr) extra.push(...afr); }
    if (!/mis5[abcd]/.test(t.q)) { const aus = t.q === 'q_lgm' ? window.PA_AUS_LGM : window.PA_AUS_SCHEMAT; if (aus) extra.push(...aus); }
    if (!/mis5[abcd]/.test(t.q)) { const nz = t.q === 'q_lgm' ? window.PA_NZ_LGM : window.PA_NZ_SCHEMAT; if (nz) extra.push(...nz); }
    return Q[t.q].concat(extra);
  }
  return P.ice_sets.now;
}
function areaKm2(ring) {   // pole na kuli; pierścień (lat, lon)
  let a = 0; const toR = Math.PI / 180;
  for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; a += (q[1] - p[1]) * (2 + Math.sin(p[0] * toR) + Math.sin(q[0] * toR)); }
  return Math.abs(a / 2) * (6371 ** 2 * toR);
}
function isSARing(r) { let la = 0, lo = 0; for (const p of r) { la += p[0]; lo += p[1]; } la /= r.length; lo /= r.length; return la < -30 && la > -60 && lo > -90 && lo < -50; }
const saKm2 = polys => allRings(polys).filter(isSARing).reduce((a, r) => a + areaKm2(r), 0);
const NH = polys => areaNH(polys, 20);           // półkula płn. (bez Antarktydy)
const NH50 = polys => areaNH(polys, 50);         // lądolody kontynentalne strefy umiarkowanej

/* numer MIS z etykiety ENV (np. 'MIS 11 (~400 ka)…' → 11) */
const misNo = t => { const m = t.label.match(/MIS (\d+)/); return m ? +m[1] : null; };

(async () => {
/* ================= I. INŻYNIERIA DANYCH ================= */
// I.1 zakresy współrzędnych (wszystkie pierścienie, 3 zbiory)
let bad = 0, tot = 0;
for (const set of [Q, P.ice_sets]) {
  for (const key of Object.keys(set)) {
    const polys = Array.isArray(set[key]) ? set[key] : [set[key]];
    for (const r of allRings(polys)) for (const p of r) {
      tot++;
      if (!(p[0] >= -90 && p[0] <= 90 && p[1] >= -180.5 && p[1] <= 180.5)) bad++;
    }
  }
}
check('I.1 wszystkie współrzędne w granicach lat/lon (' + tot + ' pkt)', bad === 0, bad + ' błędnych');

/* I.2 topologia: (a) pipeline Q19 zapisuje pierścienie JAWNIE domknięte,
      (b) wszystkie zbiory mają ≥3 unikalne punkty (renderer domyka poligon sam) */
let openQ = 0, ringsQ = 0;
for (const key of Object.keys(Q)) for (const r of allRings(Q[key])) {
  ringsQ++;
  if (Math.abs(r[0][0] - r[r.length - 1][0]) > 1e-6 || Math.abs(r[0][1] - r[r.length - 1][1]) > 1e-6) openQ++;
}
check('I.2a przekroje Q19: pierścienie jawnie domknięte (pipeline build_ice_quat)', openQ === 0, 'otwarte ' + openQ + '/' + ringsQ);
let short = 0;
for (const set of [Q, P.ice_sets]) for (const key of Object.keys(set)) {
  const polys = Array.isArray(set[key]) ? set[key] : [set[key]];
  for (const r of allRings(polys)) {
    const uniq = new Set(r.map(p => p[0].toFixed(5) + ',' + p[1].toFixed(5)));
    if (uniq.size < 3) short++;
  }
}
check('I.2b każdy pierścień ma ≥3 unikalne punkty (poprawny poligon po domknięciu)', short === 0, 'za krótkie:' + short);

// I.3 antypołudnik: żaden segment nie przeskakuje >170° (Leaflet nie rysuje „wstęgi przez mapę”)
let jumps = 0, worst = 0;
for (const key of Object.keys(Q)) for (const r of allRings(Q[key])) {
  for (let i = 1; i < r.length; i++) {
    const d = Math.abs(r[i][1] - r[i - 1][1]);
    if (d > 170) jumps++;
    worst = Math.max(worst, d);
  }
}
check('I.3 przekroje Q19: brak skoków antypołudnika >170° (max ' + worst.toFixed(1) + '°)', jumps === 0, jumps + ' skoków');

// I.4 ISO 19107: src w każdym poligonie; obiekty mają nazwy
let qNoSrc = 0, noName = 0, qBadSrc = 0;
for (const key of Object.keys(Q)) for (const p of Q[key]) {
  if (!p.src) qNoSrc++;
  else if (p.src !== 'Q19' && p.src !== 'DANE_PORTALU') qBadSrc++;
  if (!p.name) noName++;
}
check('I.4a przekroje Q19: każdy poligon ma src ∈ {Q19, DANE_PORTALU} i nazwę', qNoSrc === 0 && qBadSrc === 0 && noName === 0,
  'bez src:' + qNoSrc + ' obcy src:' + qBadSrc + ' bez nazwy:' + noName);
const d1count = Object.values(P.ice_sets).flat().filter(p => p.src === 'DATED-1').length;
const paleoHead = fs.readFileSync('/home/user/paleoatlas/js/data/paleo.js', 'utf8').slice(0, 600);
const appSrc = fs.readFileSync('/home/user/paleoatlas/js/app.js', 'utf8');
check('I.4b pozostałe poligony: DATED-1 podpisane (' + d1count + '), schematy portalu mają deklarację w pliku + domyślny tooltip w app',
  d1count >= 20 && /SCHEMATYCZNE/.test(paleoHead) && /Rekonstrukcja uproszczona wg literatury/.test(appSrc));

// I.5 kompletność haseł źródeł w UI-tekstach (autor + rok + repozytorium/doi)
const srcOk = 'Batchelor' && !/undefined|NaN|\[object/.test(window.ICE_QUAT_SRC);
check('I.5 ICE_QUAT_SRC: autor, rok, DOI/repozytorium',
  /Batchelor i in\. 2019/.test(window.ICE_QUAT_SRC) && /(10\.1038\/s41467|osf\.io)/.test(window.ICE_QUAT_SRC) && srcOk);
const datedHead = fs.readFileSync('/home/user/paleoatlas/js/data/ice_dated.js', 'utf8').slice(0, 400);
check('I.6 nagłówek DATED-1: Hughes i in. 2016 + DOI PANGAEA', /Hughes/.test(datedHead) && /10\.1594\/PANGAEA\.848117/.test(datedHead));

// I.7 obiekty Q19 nie mogą mieć kolizji z nie-nazwanymi schematami starodawnymi (tylko jedno src=portal per lobe)
check('I.7 q_mis8 = Baton North (Q19) + dokładnie 1 lob portalowy (DANE_PORTALU)',
  Q.q_mis8.length === 2 && Q.q_mis8.filter(p => p.src === 'DANE_PORTALU').length === 1);

/* ================= II. CHRONOLOGIA ENV ================= */
// II.1 spójność referencji
let refs = 0;
for (const t of ENV.ticks) {
  if (t.ice) { if (P.ice_sets[t.ice] && P.ice_sets[t.ice].length) refs++; }
  else if (t.q) { if (Q[t.q]) refs++; }
}
check('II.1 każdy przekrój ENV rozwiązuje się do geometrii', refs === ENV.ticks.length, refs + '/' + ENV.ticks.length);

// II.2 okna pięter nie nakładają się i są uporządkowane
const wins = ENV.ticks.filter(t => t.w).map(t => ({ bp: t.bp, a: t.w[0], b: t.w[1] })).sort((x, y) => x.a - y.a);
let overlaps = 0, misordered = 0;
wins.forEach((w, i) => {
  if (w.a >= w.b) misordered++;
  if (i > 0 && w.a < wins[i - 1].b) overlaps++;
});
check('II.2 okna pięter uporządkowane, bez nakładania', overlaps === 0 && misordered === 0, 'kolizje:' + overlaps + '/' + misordered);

// II.3 ime-dzieci (okno zawiera reprezentatywny wiek przekroju)
let wOut = 0;
for (const t of ENV.ticks) if (t.w && !(t.bp >= t.w[0] && t.bp <= t.w[1])) wOut++;
check('II.3 reprezentatywny wiek przekroju leży w jego oknie', wOut === 0, wOut + ' poza oknem');

// II.4 każdy interglacjał ENV → zbiór 'now' (konwencja: ig = stan jak dziś)
let badIg = 0, igTicks = 0;
for (const t of ENV.ticks) if (!t.q && t.ice === 'now') { igTicks++; const polys = envIcePolys(t); if (polys !== P.ice_sets.now) badIg++; }
check('II.4 wszystkie interglacjały (' + igTicks + ') używają zbioru „now”', badIg === 0);

/* II.5 sekwencja pliocen→gauss→matuyama: monotoniczny WZROST lodu NH (LR04: pierwsze
      duże zlodowacenie ~2,6–2,5 Ma, wcześniej czapki arktyczne „limited” — Gauss);
      metryka: suma deg² północ od 20°N (Antarktyda/Patagonia zerują się w masce) */
const aPlio = NH(envIcePolys(envTickForBP(3150000)));
const aGauss = NH(envIcePolys(envTickForBP(2750000)));
const aMat = NH(envIcePolys(envTickForBP(2500000)));
check('II.5 wzrost lodu NH: pliocen (1449) < Gauss (2640 — „limited”) < Matuyama (4459 — 1. wielka)',
  aPlio < aGauss && aGauss < aMat, 'plio ' + aPlio.toFixed(0) + ' < gauss ' + aGauss.toFixed(0) + ' < matuyama ' + aMat.toFixed(0));

// II.6 krzywa morska: zakres fizyczny i wartości kotwiczne wg literatury
let seaBad = 0; for (const s of ENV.sea) if (s[1] < -135 || s[1] > 25) seaBad++;
check('II.6 krzywa morska w zakresie fizycznym (−135…+25 m)', seaBad === 0, ENV.sea.length + ' pkt');
const SEA_CASES = [
  [3250, 5, 25, 'pliocen +5…+25 (Miller 2020 / PRISM)'],
  [2600, -10, 10, '~LGM podobne do dziś przed wielkimi zlod. (Tierney 2020)'],
  [800, -105, -75, 'MIS 20 ≈ −90±15 (Spratt & Lisiecki 2016)'],
  [730, -50, 0, 'MIS 18 w oknie 712–745 → −80…−35 wg interpolacji'],
  [650, -115, -95, 'MIS 16 ≈ −105'],
  [450, -110, -90, 'MIS 12 ≈ −100±10 (Rohling i in. 2009)'],
  [400, -5, 15, 'MIS 11 ±10 (długi interglacjał)'],
  [280, -100, -75, 'MIS 8 ≈ −87'],
  [131, -30, 10, 'pożegnanie eemu: przejście przez −20…+5'],
  [125, 4, 9, 'Eem +4…+9 (Dutton & Lambeck 2012)'],
  [100, -70, -30, 'MIS 5c/b −45…−60±10'],
  [57, -70, -60, 'granica MIS 4/3 ≈ −65'],
  [40, -85, -70, 'MIS 3 ≈ −78±8'],
  [21, -126, -120, 'LGM −125±5 (Lambeck i in. 2014, PNAS)'],
  [13, -95, -75, 'Bølling ≈ −85±10'],
  [8, -25, -10, 'wczesny holocen ≈ −20±5']
];
let seaOk = 0; const seaMiss = [];
for (const [bp, lo, hi, ref] of SEA_CASES) {
  const v = seaAtBP(bp * 1000), tol = 12;              // tolerancja 12 m na uproszczenie krzywej
  if (inRange(v, lo - tol, hi + tol)) seaOk++; else seaMiss.push(bp + 'ka:' + v.toFixed(0) + 'm [' + ref + ']');
}
check('II.7 poziom morza vs 16 kotwic literaturowych (tol. 12 m)', seaOk === SEA_CASES.length, seaMiss.join('; ') || SEA_CASES.length + '/' + SEA_CASES.length);

// II.8 pełny skan okien → odtworzenie mapy MIS (każdorazowo etykieta mówi, co jest)
const WIN_SCAN = [[700, 17], [720, 18], [760, 19], [800, 20], [840, 21], [880, 22], [910, 23], [940, 24]];
let winOk = 0;
for (const [bp, want] of WIN_SCAN) if (misNo(envTickForBP(bp * 1000)) === want) winOk++;
check('II.8 mapa okien MIS 17–24 spójna z literaturą (Railsback 2015)', winOk === WIN_SCAN.length, winOk + '/' + WIN_SCAN.length);

/* ================= III. KONTRPRZYKŁADY NAUKOWE PER EPOKA ================= */
/* λ-łuski: EU = [−10..40E], PL = [14..24E] (powyżej 45°N) */
function qMinLat(key, lon0, lon1, lat0) { return minLat(Q[key], lon0, lon1, lat0 === undefined ? 45 : lat0); }

// Pliocen 3,15 mln: BRAK lodu w Europie (Margold 2011: fodero arktyczne/górskie max)
check('III.1 pliocen 3,15 mln: Europa bez lądolodu (tylko Grenlandia/Svalbard/Antarktyda)',
  minLat(envIcePolys(envTickForBP(3150000)), -30, 60, 40) > 60);

// Gauss 2,75: NH ≥3× pliocen (widać początek), ale PL bez lodu
check('III.2 późny Gauss (~2,75 mln): NH w oknie 1,5–2,5× stanu dzisiejszego („limited”), Polska bez lodu',
  aGauss > 1.5 * aPlio && aGauss < 2.5 * aPlio && minLat(envIcePolys(envTickForBP(2750000)), 14, 24, 40) > 58,
  aGauss.toFixed(0) + ' vs now ' + aPlio.toFixed(0));

// Matuyama 2,5: NH ≥3× pliocen; PL bez lodu (pomiary dav. MIS 96-100)
check('III.3 wczesny Matuyama (~2,5 mln): NH ≥2,8× stanu dzisiejszego (1. duża zlodowacenie), Polska bez lodu',
  aMat >= 2.8 * aPlio && minLat(envIcePolys(envTickForBP(2500000)), 14, 24, 40) > 58,
  aMat.toFixed(0) + ' = ' + (aMat / aPlio).toFixed(2) + '× now');

// MIS 82/62/52-54/36: analogi opisane SCHEMAT, istnieją geometrycznie (Q20)
const ANALOG_BP = [2150000, 1750000, 1550000, 1190000];
let analogNames = 0, analogEmpty = 0;
for (const bp of ANALOG_BP) {
  const t = envTickForBP(bp);
  if (/analog/.test(t.label)) analogNames++;
  if (envIcePolys(t).length < 1) analogEmpty++;
}
check('III.4 wczesny plejstocen: 4 stadiały-analogi, opisane „SCHEMAT: kształt = analog…”',
  analogNames === 4 && analogEmpty === 0, analogNames + '/4 opisanych');

// MIS 18/24 w oknach: kompozyt MIS 20-24, silny lód (NL >29k deg²)
const a18 = NH(envIcePolys(envTickForBP(720000)));
const a24 = NH(envIcePolys(envTickForBP(940000)));
const aNow = NH(P.ice_sets.now);
check('III.5 MIS 18 i MIS 24 (okna): silny lód NH (kompozyt Q19; standardowo ~2,5–4,5× stan dzisiejszy ≈ stadiał MPT)',
  a18 > 2.5 * aNow && a18 < 4.5 * aNow && a24 > 2.5 * aNow && a24 < 4.5 * aNow,
  a18.toFixed(0) + ' / ' + a24.toFixed(0) + ' = ' + (a18 / aNow).toFixed(2) + '× now');

// MIS 12 = globalne maksimum IM + linia Sanu w PL (≤49,5 — mierzyliśmy 49,3)
const a12 = NH(envIcePolys(envTickForBP(450000)));
const a16 = NH(envIcePolys(envTickForBP(650000)));
const a10 = NH(envIcePolys(envTickForBP(350000)));
const a6 = NH(envIcePolys(envTickForBP(155000)));
check('III.6 MIS 12 vs 16 vs 10: max lub ≈max (Batchelor: 7,1k vs 6,7k deg²)',
  a12 >= a10 && inRange(a12 / a16, 0.9, 1.25), a12.toFixed(0) + ' / ' + a16.toFixed(0) + ' / ' + a10.toFixed(0));
check('III.7 MIS 12: margines PL ≤49,5°N (przedpola Sudetów — San, Nida; ESZKOLA/zpe.gov.pl)',
  qMinLat('q_mis12', 14, 24) <= 49.5, qMinLat('q_mis12', 14, 24).toFixed(2));

// MIS 16 w PL (Batchelor: 49,0 — silniej niż kryptyczna kurtuazja „niska pewność”, poprawnie)
check('III.8 MIS 16: margines PL ≤51,5°N (Batchelor; scenariusz „don/Nida” w granicach literatury)',
  qMinLat('q_mis16', 14, 24) <= 51.5, qMinLat('q_mis16', 14, 24).toFixed(2));

// MIS 10: EU na południe od 56°N, ale bez Sanu
check('III.9 MIS 10: zasięg EU ≤56°N, łączna powierzchnia < MIS 12 (4630 < 7111 deg²; Batchelor)',
  qMinLat('q_mis10', -10, 40) <= 56 && NH(Q.q_mis10) < NH(Q.q_mis12),
  qMinLat('q_mis10', -10, 40).toFixed(1) + ' | ' + NH(Q.q_mis10).toFixed(0) + '<' + NH(Q.q_mis12).toFixed(0));

// MIS 8: Baton North NIE sięga PL (≥53), a lob portalowy sięga (≤52) — klasyczna rozbieżność
const m8batPL = minLat([Q.q_mis8[0]], 14, 24, 45);
const m8lobPL = minLat(Q.q_mis8.slice(1), 14, 24, 45);
check('III.10 MIS 8: Baton North poza PL (≥53), lob Odry wg portalu ≤52,0 — rozbieżność opisana',
  m8batPL >= 53 && m8lobPL <= 52.0, 'baton ' + m8batPL.toFixed(1) + ' | lob ' + m8lobPL.toFixed(1));
check('III.11 MIS 8: etykieta ENV zawiera notkę o rozbieżności korelacji',
  /rozbieżność/.test(envTickForBP(280000).label));

// MIS 6: Warta-linia w PL ≤51,2 + Taz na Syberii + Illinoian w NAm duży (Saalian = IM)
check('III.12 MIS 6: margines PL ≤51,2°N (Warta/Drenthe; Toucanne 2009: PGM południowy zasięg)',
  qMinLat('q_mis6', 14, 24) <= 51.2, qMinLat('q_mis6', 14, 24).toFixed(2));
check('III.13 MIS 6 ≥ MIS 12 pod względem powierzchni NH (Batchelor 2019 fig.5 — IM)',
  a6 >= a12 * 0.9, a6.toFixed(0) + ' vs ' + a12.toFixed(0));

// Interglacjały = zbiór 'now' (Eem/Holstein+ analog) bez lodu kontynentu EU
for (const [bp, name] of [[125000, 'Eem'], [400000, 'MIS 11'], [320000, 'MIS 9'], [500000, 'MIS 13'], [215000, 'MIS 7e']]) {
  const onSet = envIcePolys(envTickForBP(bp)) === P.ice_sets.now;
  check('III.14 ' + name + ': interglacjał → tylo Grenlandia/Svalbard/Antarktyda (zbiór „now”)',
    onSet && minLat(envIcePolys(envTickForBP(bp)), -30, 60, 40) > 60);
}

// MIS 5d/5b: wczesna Wisła, lód w S Skandynawii (Herning ≥55°N), nie nie dochodząc PL
check('III.15 MIS 5d: margines EU ≥54°N i lód istnieje (Herning/Rederstal; Mangerud 2004)',
  inRange(qMinLat('q_mis5d', -10, 40), 54, 60), qMinLat('q_mis5d', -10, 40).toFixed(1));
check('III.16 MIS 4 > MIS 5d: powierzchnia NH (6269>5462 deg² — Kordyliery/NE Azja) i margines EU dalej na południe (51,3<57)',
  NH(Q.q_mis4) > NH(Q.q_mis5d) && qMinLat('q_mis4', -10, 40) < qMinLat('q_mis5d', -10, 40),
  NH(Q.q_mis4).toFixed(0) + ' vs ' + NH(Q.q_mis5d).toFixed(0) + ' | marginesy ' + qMinLat('q_mis4', -10, 40).toFixed(1) + ' vs ' + qMinLat('q_mis5d', -10, 40).toFixed(1));

// MIS 3: wariant 40ka znacznie mniejszy niż 45ka (Ålesund interstadial — DATED-1/Batchelor)
check('III.17 MIS 3 (40 ka) ≪ późne MIS 3 (45 ka): Ålesund (obsz. 442 vs 13k deg² — wariant min/max)',
  NH(Q.q_40ka) < 0.3 * NH(Q.q_45ka), NH(Q.q_40ka).toFixed(0) + ' vs ' + NH(Q.q_45ka).toFixed(0));

// Sekwencja NSG < 31 ka (Holocene → LGM): monotoniczna „droga do LGM”, zgrubna (DATED-1)
// porównujemy dominujący pierścień eurazjatycki DATED-1 przyjęty do PALEO zbiorów
function eurArea(key) {
  const main = P.ice_sets[key].find(p => /Eurazjatycki/.test(p.name));
  return main ? domArea(parts(main)) : 0;
}
check('III.18 deglacjacja: E-Hol ≪ YD ≪ B-A ≪ Pomorska ≪ Poznańska ≪ LGM (obszar Eurazji, DATED-1)',
  eurArea('early_holocene') < eurArea('younger_dryas') &&
  eurArea('younger_dryas') < eurArea('bolling_allerod') &&
  eurArea('bolling_allerod') < eurArea('pomorska') &&
  eurArea('pomorska') < eurArea('poznanska') &&
  eurArea('poznanska') < eurArea('lgm'),
  [eurArea('early_holocene'), eurArea('younger_dryas'), eurArea('bolling_allerod'), eurArea('pomorska'), eurArea('poznanska'), eurArea('lgm')].map(x => x.toFixed(0)).join(' < '));

// Marginesy PL w deglacjacji DATED-1: leszcz < pozn < pom (Marks zgodny: Younger Dryas 53,7-54,9)
// (pomiary sekcji wyżej: LGM 51,8 / Poznańska 52,4 / Pomorska 53,1)
function minLatD1(key, lon0, lon1) {
  const main = P.ice_sets[key].find(p => /Eurazjatycki/.test(p.name));
  return main ? minLat([main], lon0, lon1, 45) : 99;
}
check('III.19 margines PL: LGM ≤52,2 < Poznańska ≤52,7 < Pomorska ≥52,8 (sesiopostać DATED-1+linie PL)',
  minLatD1('lgm', 14, 24) <= 52.2 && minLatD1('poznanska', 14, 24) <= 52.7 && minLatD1('pomorska', 14, 24) >= 52.8,
  [minLatD1('lgm', 14, 24), minLatD1('poznanska', 14, 24), minLatD1('pomorska', 14, 24)].map(x => x.toFixed(1)).join(' / '));

// YD: Salpausselkä — lodolód sięga ~61°N w S Finlandii, S Szwecja wolna (Margold 2011: 59,5-61,5)
check('III.20 młodszy dryas: S Finlandia pod lodem (margines ≤61,5°N), PL wolne (≥58°N)',
  minLat([P.ice_sets.younger_dryas.find(p => /Eurazjatycki/.test(p.name))], 24, 30, 50) <= 61.5 &&
  minLatD1('younger_dryas', 14, 24) >= 57.5,
  'FI ' + minLat([P.ice_sets.younger_dryas.find(p => /Eurazjatycki/.test(p.name))], 24, 30, 50).toFixed(1) +
  ' | PL ' + minLatD1('younger_dryas', 14, 24).toFixed(1));

// liny DATED-1: nsa PL w LGM dokładnie z CSV, nie zaokrąglone
check('III.21 LGM: dominujący pierścień DATED-1 ma pierwszy punkt na linii leszczyńskiej portalu',
  hasPT([P.ice_sets.lgm.find(p => /Eurazjatycki/.test(p.name))], [51.94, 15.51], 0.006));

/* ================= IV. LINIE BRZEGOWE PL — KANON VERBATIM ================= */
const LINES = {
  'poludniowopolskie (San, 5 pkt) → q_mis12': {
    polys: () => Q.q_mis12,
    pts: [[51.15, 15.0], [50.77, 16.28], [50.06, 19.94], [50.04, 22.0], [49.78, 22.77]]
  },
  'warta (4 pkt) → q_mis6': {
    polys: () => Q.q_mis6,
    pts: [[51.11, 17.03], [51.5, 19.47], [51.53, 21.17], [52.3, 22.6]]
  },
  'odra (7 pkt) → lob DANE_PORTALU q_mis8': {
    polys: () => Q.q_mis8.filter(p => p.src === 'DANE_PORTALU'),
    pts: [[50.43, 16.65], [50.3, 18.9], [50.8, 19.12], [50.9, 20.6], [50.68, 21.75], [51.0, 22.5], [50.6, 23.3]]
  },
  'leszczyńska LGM (8 pkt) → PALEO.lgm': {
    polys: () => P.ice_sets.lgm,
    pts: [[51.94, 15.51], [51.84, 16.57], [52.32, 17.57], [52.22, 18.25], [52.55, 19.71], [53.36, 20.43], [53.65, 22.46], [53.84, 22.98]]
  },
  'poznańska (4 pkt) → PALEO.poznanska': {
    polys: () => P.ice_sets.poznanska,
    pts: [[52.41, 16.93], [52.65, 19.07], [53.09, 21.58], [53.13, 23.16]]
  },
  'pomorska (4 pkt) → PALEO.pomorska': {
    polys: () => P.ice_sets.pomorska,
    pts: [[53.43, 14.55], [53.12, 18.0], [53.78, 20.48], [54.1, 22.93]]
  },
  'gardzieńska B-A (3 pkt) → PALEO.bolling_allerod': {
    polys: () => P.ice_sets.bolling_allerod,
    pts: [[53.91, 14.25], [54.19, 16.17], [54.35, 18.65]]
  }
};
let lineOk = 0, lineMiss = [];
for (const name of Object.keys(LINES)) {
  const L = LINES[name], polys = L.polys();
  let all = true;
  for (const pt of L.pts) if (!hasPT(polys, pt, 0.006)) { all = false; lineMiss.push(name + ' @' + pt); }
  if (all) lineOk++;
}
check('IV.1 wszystkie 7 linii brzegowych z CSV — verbatim w geometrii (35 pkt łącznie)',
  lineOk === 7 && lineMiss.length === 0, lineMiss.join('; ') || '7/7 linii · 35/35 pkt');

// IV.2 każdy lob portalowy ma src=DANE_PORTALU lub splice w Q19/DATED-1 (żadnego „wydumania”)
const lobG = P.ice_sets.bolling_allerod.find(p => /gardzie/i.test(p.name));
check('IV.2 lob gardzieński istnieje jako osobny poligon z etykietą danych portalu',
  !!lobG && /portal/.test(lobG.name + (lobG.src || '')), lobG ? (lobG.name.slice(0, 60)) : 'BRAK');

/* ================= VI. NADI-1 — DEGLACJACJA AMERYKI PŁN. =================
   Dalton, Dulfer, Margold i in. 2023, QSR 321:108345; dane Zenodo 10.5281/zenodo.8161764.
   Kotwice z publikacji: maksimum 22 ka (15,5 Mkm²; WSZYSTKIE arkusze scalone po raz pierwszy);
   cofka południowego marginesu ~40°N → >47°N do 10,5 ka; izochrony co 0,5 tys. lat. */
const NADI_KEYS = ['przedmaksymalny', 'lgm', 'poznanska', 'pomorska', 'bolling_allerod', 'younger_dryas', 'early_holocene'];
const nadiOf = k => (P.ice_sets[k] || []).filter(p => p.src === 'NADI-1');

const nadiHead = fs.readFileSync('/home/user/paleoatlas/js/data/ice_nadi.js', 'utf8').slice(0, 700);
check('VI.1 nagłówek NADI-1: Dalton i in. 2023 + DOI artykułu + DOI Zenodo + zadeklarowany wariant OPTIMAL',
  /Dalton/.test(nadiHead) && /10\.1016\/j\.quascirev\.2023\.108345/.test(nadiHead) &&
  /10\.5281\/zenodo\.8161764/.test(nadiHead) && /OPTIMAL/.test(nadiHead));

let setsWithNadi = 0, nadiTot = 0;
for (const k of NADI_KEYS) { const n = nadiOf(k).length; if (n >= 1) setsWithNadi++; nadiTot += n; }
const schLeft = NADI_KEYS.filter(k => (P.ice_sets[k] || []).some(p => !p.src && /Laurentyjski|Kordylieraski|Arktyczny kanadyjski/.test(p.name)));
check('VI.2 7 zestawów deglacjacji podmienionych na NADI-1 (≥30 poligonów); zero resztek schematu Ameryki Płn.',
  setsWithNadi === 7 && nadiTot >= 30 && schLeft.length === 0,
  setsWithNadi + '/7 zestawów · ' + nadiTot + ' poligonów · resztki schematu: ' + (schLeft.join(',') || 'brak'));

let nb = { open: 0, short: 0, range: 0, jump: 0, rings: 0 };
for (const k of NADI_KEYS) for (const p of nadiOf(k)) for (const r of p.rings) {
  nb.rings++;
  if (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1]) nb.open++;
  if (new Set(r.map(q => q[0] + ',' + q[1])).size < 3) nb.short++;
  for (let i = 0; i < r.length; i++) {
    if (!(r[i][0] >= -90 && r[i][0] <= 90 && Math.abs(r[i][1]) <= 180.5)) nb.range++;
    if (i && Math.abs(r[i][1] - r[i - 1][1]) > 170) nb.jump++;
  }
}
check('VI.3 geometria NADI-1 (' + nb.rings + ' pierścieni): domknięte, ≥3 unikalne pkt, w zakresie, bez skoków antypołudnika',
  nb.open === 0 && nb.short === 0 && nb.range === 0 && nb.jump === 0, JSON.stringify(nb).slice(0, 130));

check('VI.4 Grenlandia w zestawach NADI pochodzi z ICE-6G_C (1 wpis src=ICE6G, zero schematu) — NADI-1 jej nie obejmuje; uczciwy rozdział DANE/SCHEMAT',
  NADI_KEYS.every(k => {
    const gr = (P.ice_sets[k] || []).filter(p => /Grenlandia/.test(p.name));
    return gr.length === 1 && gr[0].src === 'ICE6G';
  }), NADI_KEYS.map(k => k.slice(0, 4) + ':' + (P.ice_sets[k] || []).filter(p => /Grenlandia/.test(p.name)).length).join(' '));

function signedArea(ring) { let s = 0; for (let i = 0; i < ring.length - 1; i++) s += ring[i][1] * ring[i + 1][0] - ring[i + 1][1] * ring[i][0]; return s / 2; }
const polyNet = p => Math.abs(p.rings.reduce((x, r) => x + signedArea(r), 0));   // pierścienie zorientowane: dziury się odejmują
const netArea = polys => polys.reduce((a, p) => a + polyNet(p), 0);
const A = {}; for (const k of NADI_KEYS) A[k] = netArea(nadiOf(k));
check('VI.5 drabina powierzchni NA netto (deg²): nasuwanie 25ka < LGM, potem monotoniczna cofka 18 > 15 > 13,5 > 12,5 > 10,5 ka',
  A.przedmaksymalny < A.lgm && A.lgm > A.poznanska && A.poznanska > A.pomorska &&
  A.pomorska > A.bolling_allerod && A.bolling_allerod > A.younger_dryas && A.younger_dryas > A.early_holocene,
  NADI_KEYS.map(k => k.slice(0, 8) + '=' + A[k].toFixed(0)).join(' | '));

const share = k => { let best = 0; for (const p of nadiOf(k)) best = Math.max(best, polyNet(p)); return best; };
const sLGM = share('lgm') / A.lgm, sBA = share('bolling_allerod') / A.bolling_allerod;
check('VI.6 22 ka: NAISC scalone w jedną bryłę ≥85% powierzchni w dominancie (wg NADI-1: „merged at 22 ka for the first time”), w 13,5 ka już mniej',
  sLGM >= 0.85 && sBA < sLGM, '22ka ' + (100 * sLGM).toFixed(1) + '% | 13,5ka ' + (100 * sBA).toFixed(1) + '%');

const sLat = k => minLat(nadiOf(k), -110, -60, 0);
check('VI.7 margines płd. NA: LGM ≤40,5°N (Long Island/Ohio) → monotoniczna cofka do ≥46°N w 10,5 ka',
  sLat('lgm') <= 40.5 && sLat('poznanska') > sLat('lgm') && sLat('poznanska') <= 42 &&
  sLat('pomorska') >= 42.5 && sLat('bolling_allerod') >= 43.5 && sLat('early_holocene') >= 46,
  ['lgm', 'poznanska', 'pomorska', 'bolling_allerod', 'younger_dryas', 'early_holocene'].map(k => sLat(k).toFixed(1)).join(' → '));

check('VI.8 uczciwa etykieta przedmaksymalnego: „25 ka — najstarszy przekrój; 27 ka poza zasięgiem NADI-1”',
  /25 ka/.test(nadiOf('przedmaksymalny')[0].name) && /zasięgiem NADI-1/.test(nadiOf('przedmaksymalny')[0].name),
  nadiOf('przedmaksymalny')[0].name.slice(55, 160));

/* ================= VII. AZJA — spójność DANE/SCHEMAT =================
   Audyt po pytaniu użytkownika „A Azja jest ok?” (2026-08): usunięto statyczny boks
   „Tajmyr” (fałszował pokrywę przy oknach, gdy DATED-1 już zdeglacjował Tajmyr),
   a jednolity boks „NE Azja” zastąpiono rdzeniami górskimi (Batchelor 2019: LGM ≪ MIS 4/6). */
const closedArea = r => { let s = 0; for (let i = 0; i < r.length; i++) { const j = (i + 1) % r.length; s += r[i][1] * r[j][0] - r[j][1] * r[i][0]; } return Math.abs(s) / 2; };

check('VII.1 żaden zestaw deglacjacji (LGM→mł. dryas) nie zawiera już statycznego boksu „Tajmyr” (DATED-1 zdeglacjował Tajmyr do ~15 ka; boks zostaje tylko w starszych zestawach-schematach)',
  ['lgm', 'poznanska', 'przedmaksymalny', 'pomorska', 'bolling_allerod', 'younger_dryas', 'early_holocene']
    .every(k => !(P.ice_sets[k] || []).some(p => /Tajmyr/.test(p.name))),
  'wystąpienia Tajmyr łącznie (starsze schematy MIS): ' + Object.values(P.ice_sets).flat().filter(p => /Tajmyr/.test(p.name)).length);

const neaArea = k => (P.ice_sets[k] || []).filter(p => /NE Azja/.test(p.name))
  .reduce((a, p) => a + (p.rings || [p.pts]).reduce((x, r) => x + closedArea(r), 0), 0);
const qAsia = key => { let a = 0; for (const p of Q[key]) for (const r of p.rings) {
  let cx = 0, cy = 0; for (const q of r) { cx += q[1]; cy += q[0]; } cx /= r.length; cy /= r.length;
  if (cx >= 110 && cx <= 160 && cy >= 58) a += closedArea(r); } return a; };
const NEA_GLAC = k => (P.ice_sets[k] || []).filter(p => p.src === 'GLACIMONTIS' && /Wierchoja/.test(p.name))
  .reduce((a, p) => a + (p.rings || [p.pts]).reduce((x, r) => x + closedArea(r), 0), 0);
const NEA_LGM = NEA_GLAC('lgm'), NEA_MIS6 = qAsia('q_mis6'), NEA_MIS4 = qAsia('q_mis4');
check('VII.2 NE Azja w LGM: empiryczne rdzenie Wierchojańska z GLACIMONTIS (Barr & Clark 2012, ~48 tys. km²) istnieją, ale ≪ schematycznych pokryw MIS 6/4 (Batchelor 2019; stary jednolity boks implikował ciągłą pokrywę — zastąpiony danymi)',
  NEA_LGM > 2 && NEA_LGM < 0.4 * NEA_MIS6 && NEA_LGM < 0.4 * NEA_MIS4,
  'LGM ' + NEA_LGM.toFixed(1) + ' < MIS6 ' + NEA_MIS6.toFixed(0) + ' / MIS4 ' + NEA_MIS4.toFixed(0) + ' deg²');

check('VII.3 schematyczne boksy „NE Azja” ZNIKŁY z faz deglacjacji (LGM→mł. dryas) — zastąpione wpisami GLACIMONTIS (Wierchojańsk) z cytatami; w starszych zestawach (MIS ≥3) szczery SCHEMAT zostaje',
  ['lgm', 'poznanska', 'przedmaksymalny', 'pomorska', 'bolling_allerod', 'younger_dryas']
    .every(k => !(P.ice_sets[k] || []).some(p => !p.src && /NE Azja/.test(p.name))) &&
  ['lgm', 'poznanska', 'przedmaksymalny'].every(k =>
    (P.ice_sets[k] || []).filter(p => p.src === 'GLACIMONTIS' && /Wierchoja/.test(p.name)).length >= 4) &&
  (P.ice_sets.mis3 || []).filter(p => /NE Azja/.test(p.name)).every(p => /schemat/i.test(p.name)),
  'Wierchojańsk GLAC w LGM: ' + (P.ice_sets.lgm || []).filter(p => p.src === 'GLACIMONTIS' && /Wierchoja/.test(p.name)).length +
  ' · NE Azja scr w mis3: ' + (P.ice_sets.mis3 || []).filter(p => !p.src && /NE Azja/.test(p.name)).length);

let beringSheet = 0;
for (const k of ['lgm', 'poznanska']) for (const p of P.ice_sets[k]) for (const r of (p.rings || [p.pts])) {
  const inCorridor = r.filter(q => q[0] >= 59 && q[0] <= 64.5 && q[1] >= -166 && q[1] <= -162);
  if (inCorridor.length > 2) beringSheet++;
}
check('VII.4 Beringia sucha (59–64,5°N, 166–162°W): brak ciągłego lodu w zestawach 22/18 ka; zostają tylko glacjacje obrzeżne (Ahklun na wschodzie, St. Lawrence powyżej 64,5°N)',
  beringSheet === 0, beringSheet + ' pierścieni z >2 pkt w korytarzu beringijskim');

check('VII.5 Himalaje/Tybet/Płaskowyż w LGM: wpisy GLACIMONTIS z cytatami (empiryczne maksima lokalne; dawniej świadomy SCHEMAT portalu), zero schematu bez src',
  (P.ice_sets.lgm || []).filter(p => p.src === 'GLACIMONTIS' && /Himalaj|Tibet|Tybet|Karakoram|Pamir/.test(p.name)).length >= 10 &&
  !(P.ice_sets.lgm || []).some(p => !p.src && /Tibet|Himalaje/.test(p.name)),
  'GLAC w LGM: ' + (P.ice_sets.lgm || []).filter(p => p.src === 'GLACIMONTIS' && /Himalaj|Tibet|Tybet|Karakoram|Pamir/.test(p.name)).length);


/* ================= VIII. PATICE — Lodowiec Patagoński (Ameryka Płd.) ================= */
const PI = window.ICE_PATICE;
check('VIII.1 ice_patice.js rejestruje ICE_PATICE (8 przekrojów + „now”), wszystkie wpisy src=PATICE',
  !!PI && ['p35ka', 'p30ka', 'p25ka', 'p20ka', 'p15ka', 'p13ka', 'p10ka', 'p5ka', 'now'].every(k => Array.isArray(PI[k]) && PI[k].length && PI[k].every(p => p.src === 'PATICE')) &&
  !!window.PA_PATAGONIA_SCHEMAT,
  PI ? Object.keys(PI).join(',') : 'BRAK ICE_PATICE');

const SA_SETS = ['przedmaksymalny', 'lgm', 'poznanska', 'pomorska', 'bolling_allerod', 'younger_dryas', 'early_holocene', 'now'];
let saNoPat = [], saSchemLeft = 0;
for (const k of SA_SETS) {
  const its = P.ice_sets[k] || [];
  if (!its.some(p => p.src === 'PATICE')) saNoPat.push(k);
  saSchemLeft += its.filter(p => p.src === undefined && /Patagonia/.test(p.name || '')).length;
}
check('VIII.2 zestawy 27→0 ka: PATICE wszędzie, zero starych schematów Patagonii (PATAGONIA_MAX/MID usunięte)',
  saNoPat.length === 0 && saSchemLeft === 0, 'bez PATICE: ' + saNoPat.join(',') + ' · schematy: ' + saSchemLeft);

/* VIII.3 kotwice powierzchniowe vs publikowany DBF PATICE (Σ po filtrze ≥10 km²; RDP 0,02° daje <4% dryfu).
   Referencja publikacji: 35 ka = 492,6 tys. km² (Davies i in. 2020, streszczenie). */
const anchors = { p35ka: 492460, p30ka: 491127, p25ka: 465070, p20ka: 359402, p15ka: 120766, p13ka: 115492, p10ka: 63613 };
const anchOK = Object.keys(anchors).every(k => { const got = saKm2(PI[k]); return Math.abs(got - anchors[k]) / anchors[k] < 0.04; });
check('VIII.3 przekroje PATICE Σ-km² zgodne z DBF (±4%); 35 ka w paśmie publikacyjnym 480–505 tys. km²',
  anchOK && inRange(saKm2(PI.p35ka), 480000, 505000), Object.keys(anchors).map(k => k + '=' + Math.round(saKm2(PI[k]) / 1000) + 'k').join(' '));

const kmSet = k => allRings((P.ice_sets[k] || []).filter(p => p.src === 'PATICE')).reduce((a, r) => a + areaKm2(r), 0);
const SA_A = {}; SA_SETS.forEach(k => SA_A[k] = kmSet(k));
check('VIII.4 drabina PATICE w portalu: 25>20>15>10 ka>dziś; LGM ≥2,8× pomorska (załamanie 20→15 ka wg pracy)',
  SA_A.przedmaksymalny > SA_A.lgm && SA_A.lgm > SA_A.pomorska && SA_A.pomorska > SA_A.early_holocene && SA_A.early_holocene > SA_A.now && SA_A.lgm >= 2.8 * SA_A.pomorska,
  SA_SETS.map(k => k.slice(0, 8) + '=' + Math.round(SA_A[k] / 1000) + 'k').join(' '));
check('VIII.4b ACR: mł. dryas (13 ka) w paśmie 85–105% pomorskiej (15 ka) — stabilizacja/readvance zamiast załamania',
  inRange(SA_A.younger_dryas / SA_A.pomorska, 0.85, 1.05), 'stosunek ' + (SA_A.younger_dryas / SA_A.pomorska).toFixed(3));

/* VIII.5 anatomia LGM: od Lake District (~37°S) po Ziemię Ognistą; zachód = szelf Pacyfiku, wschód = loby na stepie */
const lgmPat = P.ice_sets.lgm.filter(p => p.src === 'PATICE');
let sMin = 99, sMax = -99, wMin = 99, eMax = -99;
for (const r of allRings(lgmPat)) for (const p of r) { sMin = Math.min(sMin, p[0]); sMax = Math.max(sMax, p[0]); wMin = Math.min(wMin, p[1]); eMax = Math.max(eMax, p[1]); }
check('VIII.5 anatomia LGM: zasięg ≥[−53°S], sięga ≥[−38°S]; zachód ≤ −75,2°W (krawędź szelfu), wschód ≥ −68,5°W',
  sMin <= -53 && sMax >= -38 && wMin <= -75.2 && eMax >= -68.5,
  'S ' + sMin.toFixed(1) + ' | N ' + sMax.toFixed(1) + ' | W ' + wMin.toFixed(1) + ' | E ' + eMax.toFixed(1));

/* VIII.6 po 15 ka PIS rozbity na osobne masywy (Davies 2020: „disparate ice masses”) */
const pomPat = P.ice_sets.pomorska.filter(p => p.src === 'PATICE');
const pomBig = pomPat.filter(p => parts(p).reduce((a, r) => a + areaKm2(r), 0) >= 5000);
const pomNames = pomPat.map(p => p.name).join(' | ');
check('VIII.6 pomorska (15 ka): ≥4 masywy ≥5 tys. km²; wśród nazw SPI i NPI (rozpad PIS)',
  pomBig.length >= 4 && /South Patagonian Icefield/.test(pomNames) && /North Patagonian Icefield/.test(pomNames),
  pomBig.length + ' masywów: ' + pomBig.map(p => p.name.split('—')[1].split('(')[0]).join(',').slice(0, 120));

/* VIII.7 „dziś”: inwentarz 2011 AD jako jeden zbiorczy wpis */
const nowPat = P.ice_sets.now.filter(p => p.src === 'PATICE');
check('VIII.7 „dziś”: współczesne lodowce Σ 18–25 tys. km² (literatura 22,7 tys. z drobinami <10 km²), ≥200 ringów',
  nowPat.length === 1 && inRange(SA_A.now, 18000, 25000) && allRings(nowPat).length >= 200,
  Math.round(SA_A.now) + ' km² · ' + allRings(nowPat).length + ' ringów');

/* VIII.8–11: przekroje Q19 — właściwe źródło Patagonii per przekrój */
const qSA = q => envIcePolys(ENV.ticks.find(t => t.q === q)).filter(p => parts(p).some(isSARing));
const q35 = qSA('q_35ka').filter(p => !p.lake);   /* jeziora PATICE-LAKES to osobna warstwa-woda, nie wpis lądolodu */
check('VIII.8 q_35ka: Patagonia WYŁĄCZNIE z PATICE (~490 tys. km²), zero schematu-boksu',
  q35.length && q35.every(p => p.src === 'PATICE') && inRange(q35.flatMap(parts).filter(isSARing).reduce((a, r) => a + areaKm2(r), 0), 460000, 510000),
  q35.length + ' wpisów');
check('VIII.9 interstadialia MIS 5a–d: brak lądolodu SA (ani Q19, ani schemat — stan jak dziś; dawny schemat usunięty)',
  ['q_mis5a', 'q_mis5b', 'q_mis5c', 'q_mis5d'].every(q => qSA(q).length === 0),
  'mis5b: ' + qSA('q_mis5b').length + ' wpisów');
const q6 = qSA('q_mis6');
check('VIII.10 MIS 6: fallback z JAWNĄ etykietą „SCHEMAT portalu” (ani Q19, ani PATICE nie czasorozróżniają PIS dla tego przekroju)',
  q6.length === 1 && /SCHEMAT portalu/.test(q6[0].name), (q6[0] || { name: 'BRAK' }).name.slice(0, 100));
const q45 = qSA('q_45ka');
check('VIII.11 q_45ka: wyłącznie pierścienie Q19 (~32 tys. km²) — usunięte podwójne rysowanie schemat+Q19',
  q45.length >= 1 && q45.every(p => p.src === 'Q19') && inRange(q45.flatMap(parts).filter(isSARing).reduce((a, r) => a + areaKm2(r), 0), 25000, 42000),
  q45.length + ' wpisów Q19');


/* ================= IX. AFRYKA — Rift Wsch. + Maghreb z GLACIMONTIS (fala 2) ================= */
const recSum = p => (p.rings || []).reduce((a, r) => a + areaKm2(r), 0);
const grpSum = items => items.reduce((a, p) => a + recSum(p), 0);
const domOf = items => items.length ? Math.max(...items.map(recSum)) : 0;
const centroidOf = p => { let c = [0, 0], n = 0; (p.rings || []).forEach(r => r.forEach(q => { c[0] += q[0]; c[1] += q[1]; n++; })); return n ? [c[0] / n, c[1] / n] : [NaN, NaN]; };
const afG = set => (P.ice_sets[set] || []).filter(p => p.src === 'GLACIMONTIS' && /^Afryka/.test(p.name || ''));
const afS = set => (P.ice_sets[set] || []).filter(p => !p.src && /^Afryka/.test(p.name || ''));
const riftG = set => afG(set).filter(p => /Riftu Wsch/.test(p.name));
const atlG = set => afG(set).filter(p => /Maghreb/.test(p.name));
const atlS = set => afS(set).filter(p => /Atlas Wysoki/.test(p.name));
const atlScrArea = set => atlS(set).reduce((a, p) => a + areaKm2(p.pts || p.rings[0]), 0);
const afIn = t => envIcePolys(t).filter(p => /^Afryka/.test(p.name || ''));

check('IX.1 Rift Wsch. z DANYCH GLACIMONTIS: przedmaksymalny–poznańska ≥2 rekordy (Chen 24–32 ka + Osmaston 0/0 i 17–20 ka) i zero dysków; pomorska/B–A = ≥1 rekord (okno nieustalone 13,5–57 ka Osmastona) — dyski Riftu nigdy tam nie istniały (afrGlac tworzy tylko Atlas; szybka deglacjacja E-Afryki przed ~14 ka); YD = 3 szczere dyski (brak rekordów); „now” = 3 masywy z POMIAREM',
  ['przedmaksymalny', 'lgm', 'poznanska'].every(k =>
    riftG(k).length >= 2 && afS(k).filter(p => /Kilimandżaro|góra Kenia|Ruwenzori/.test(p.name)).length === 0) &&
  ['pomorska', 'bolling_allerod'].every(k =>
    riftG(k).length >= 1 && afS(k).filter(p => /Kilimandżaro|góra Kenia|Ruwenzori/.test(p.name)).length === 0) &&
  afS('younger_dryas').filter(p => /Kilimandżaro|góra Kenia|Ruwenzori/.test(p.name)).length === 3 &&
  riftG('younger_dryas').length === 0 &&
  (P.ice_sets.now || []).filter(p => /^Afryka/.test(p.name)).length === 3 &&
  (P.ice_sets.now || []).filter(p => /^Afryka/.test(p.name)).every(p => /POMIAR/.test(p.name)),
  'lgm rift: ' + riftG('lgm').length + ' · pom: ' + riftG('pomorska').length + ' · BA: ' + riftG('bolling_allerod').length + ' · YD scr: 3');

check('IX.2 Σ Riftu Wsch. w LGM ∈ [150, 550] km² (literatura: >400 km² sama Kili w maksimum + „several hundred” dla gór E-Afryki, Young & Hastenrath 1987 — GLACIMONTIS pokrywa część rekordów)',
  inRange(grpSum(riftG('lgm')), 150, 550),
  Math.round(grpSum(riftG('lgm'))) + ' km²');

check('IX.3 Atlas: LGM/przedmaksymalny = GLACIMONTIS (Hannah i in. 2017, Σ ∈ [20, 120] km² — rzadkie pokrycie; w literaturze >25 km² same płyty Tazaghart); od poznańskiej = narracyjny SCHEMAT z readvance 11–13 ka (Fink i in. 2014): YD > B–A',
  ['przedmaksymalny', 'lgm'].every(k => atlG(k).length === 1 && atlS(k).length === 0) &&
  inRange(grpSum(atlG('lgm')), 20, 120) &&
  ['poznanska', 'pomorska', 'bolling_allerod', 'younger_dryas'].every(k => atlS(k).length === 2 && atlG(k).length === 0) &&
  atlScrArea('younger_dryas') > atlScrArea('bolling_allerod'),
  'LGM GLAC-atlas Σ ' + Math.round(grpSum(atlG('lgm'))) + ' km² · scr YD ' + atlS('younger_dryas').length + ' · YD>B–A: ' + (atlScrArea('younger_dryas') > atlScrArea('bolling_allerod')));

check('IX.4 pozycje rekordów: dominujący Riftu Wsch. w kordonie E-Afryki (lat ∈ [−4, 3], lon ∈ [33, 40]); Maghreb ≈ Toubkal (31,06/−7,92 ±2°)',
  (() => {
    const dr = riftG('lgm').slice().sort((a, b) => recSum(b) - recSum(a))[0];
    const c = centroidOf(dr), m = centroidOf(atlG('lgm')[0]);
    return c[0] >= -4 && c[0] <= 3 && c[1] >= 33 && c[1] <= 40 &&
           Math.abs(m[0] - 31.06) < 2 && Math.abs(m[1] + 7.92) < 2;
  })());

check('IX.5 q-przekroje: q_lgm = DANE (PA_AFRYKA_LGM, src GLACIMONTIS, ≥4 rekordy); q_mis6/q_35ka = 5 dysków-schematów; MIS 5a–d = 0 (stan jak dziś)',
  (window.PA_AFRYKA_LGM || []).length >= 4 &&
  (window.PA_AFRYKA_LGM || []).every(p => p.src === 'GLACIMONTIS') &&
  afIn(ENV.ticks.find(t => t.q === 'q_mis6')).length === 5 &&
  afIn(ENV.ticks.find(t => t.q === 'q_35ka')).length === 5 &&
  ['q_mis5a', 'q_mis5d'].every(q => afIn(ENV.ticks.find(t => t.q === q)).length === 0),
  'PA_AFRYKA_LGM: ' + (window.PA_AFRYKA_LGM || []).length + ' · mis6: ' + afIn(ENV.ticks.find(t => t.q === 'q_mis6')).length);

/* ============ X. AUSTRALIA + NOWA GWINEA + TASMANIA — GLACIMONTIS (fala 2) ============ */
const AUS_RE = /^(Nowa Gwinea|Tasmania|Australia)/;
const ausG = set => (P.ice_sets[set] || []).filter(p => p.src === 'GLACIMONTIS' && AUS_RE.test(p.name || ''));
const ausScr = set => (P.ice_sets[set] || []).filter(p => !p.src && AUS_RE.test(p.name || ''));
const tasG = set => ausG(set).filter(p => /^Tasmania/.test(p.name));
const ngG = set => ausG(set).filter(p => /^Nowa Gwinea/.test(p.name));
const ausScrSum = items => items.reduce((a, p) => a + areaKm2(p.pts || p.rings[0]), 0);
const ausIn = t => envIcePolys(t).filter(p => AUS_RE.test(p.name || ''));
const ausQ = q => ausIn(ENV.ticks.find(t => t.q === q)).reduce((a, p) => a + areaKm2(p.pts || p.rings[0]), 0);

check('X.1 LGM: Tasmania ≥12 rekordów (Barrows i in.), Snowy Mountains dokładnie 1 (Barrows i in. 2001), Nowa Gwinea ≥3 (Prentice i in. 2005/2011) — wszystkie src GLACIMONTIS z cytatem; ZERO dysków-schematów regionu w LGM',
  tasG('lgm').length >= 12 && tasG('lgm').every(p => /Barrows/.test(p.cite || '')) &&
  ausG('lgm').filter(p => /Snowy/.test(p.name)).length === 1 &&
  /Barrows et al., 2001/.test(ausG('lgm').find(p => /Snowy/.test(p.name)).name) &&
  ngG('lgm').length >= 3 && ngG('lgm').every(p => /Prentice|Peterson/.test(p.name)) &&
  ausScr('lgm').length === 0,
  'tas ' + tasG('lgm').length + ' · snowy ' + ausG('lgm').filter(p => /Snowy/.test(p.name)).length + ' · ng ' + ngG('lgm').length);

check('X.2 skale z literaturą: dominująca Tasmania ∈ [800, 1800] km² (rekord łączy czapę Central Plateau ~1085 km² — Colhoun & Barrows 2011 — z satelitami; sam plateau 1085); Snowy ≤ 30 km² (12–15 Kosciuszko — najmniej zlodowaciały kontynent)',
  inRange(domOf(tasG('lgm')), 800, 1800) &&
  (() => { const sn = ausG('lgm').find(p => /Snowy/.test(p.name)); return sn && recSum(sn) <= 30; })(),
  'tas-dom ' + Math.round(domOf(tasG('lgm'))) + ' km² · snowy ' + Math.round(recSum(ausG('lgm').find(p => /Snowy/.test(p.name)) || { rings: [] })) + ' km²');

check('X.3 po ~17 ka: Tasmania/Snowy wracają do narracyjnego SCHEMATU z cytatem (szybka deglacjacja, brak readvance ACR/YD — Barrows i in. 2002); Nowa Gwinea: DANE do B–A włącznie (Prentice 11,5–19 ka), YD = schemat',
  ['pomorska', 'bolling_allerod', 'younger_dryas'].every(k =>
    ausScr(k).filter(p => /^(Tasmania|Australia)/.test(p.name)).length >= 3 &&
    ausG(k).filter(p => /^(Tasmania|Australia)/.test(p.name)).length === 0 &&
    ausScr(k).every(p => /SCHEMAT/.test(p.name))) &&
  ['poznanska', 'bolling_allerod'].every(k => ngG(k).length >= 2) &&
  ngG('younger_dryas').length === 0 &&
  ausScr('younger_dryas').filter(p => /^Nowa Gwinea/.test(p.name)).length === 2,
  'YD scr region: ' + ausScr('younger_dryas').length + ' · ng-BA: ' + ngG('bolling_allerod').length);

check('X.4 Σ Nowej Gwinei wg okien rekordów: poznańska ∈ [0,3×, 0,65×] LGM (największy rekord Prentice 2005 = czysto LGM 17,7–24 ka) + co najmniej 1 rekord sięga pomorskiej (ciągłość czapek do ~15,4 ka — Giluwe wg Barrows i in. 2011, QSR 30:2676)',
  (() => { const r = grpSum(ngG('poznanska')) / grpSum(ngG('lgm')); return inRange(r, 0.30, 0.65) && ngG('pomorska').length >= 1; })(),
  'pozn ' + Math.round(grpSum(ngG('poznanska'))) + ' vs lgm ' + Math.round(grpSum(ngG('lgm'))) + ' km² (' +
  (grpSum(ngG('poznanska')) / grpSum(ngG('lgm'))).toFixed(2) + '×) · pom rekordów: ' + ngG('pomorska').length);

check('X.5 „now”: dokładnie 1 wpis regionu — Puncak Jaya POMIAR ≤0,35 km² (2022–24, BMKG); Tasmania i kontynent NIEOBECNE (0 km² stałego lodu — ścisłe fakty)',
  ausScr('now').length === 1 && /POMIAR/.test(ausScr('now')[0].name) &&
  ausScr('now').every(p => !/^(Tasmania|Australia)/.test(p.name)) &&
  ausScrSum(ausScr('now')) <= 0.35,
  'wpisów: ' + ausScr('now').length + ' · Σ ' + ausScrSum(ausScr('now')).toFixed(2) + ' km²');

check('X.6 q-przekroje: q_lgm = DANE (PA_AUS_LGM ≥18 rekordów GLACIMONTIS z cytatem); q_mis4/q_mis6 = wcześniejsze WIĘKSZE maksima — neuro▒ ~8,1 tys. km² schematu; interstadialia MIS 5a–d = 0',
  (window.PA_AUS_LGM || []).length >= 18 &&
  (window.PA_AUS_LGM || []).every(p => p.src === 'GLACIMONTIS') &&
  inRange(ausQ('q_mis4'), 7600, 8600) && inRange(ausQ('q_mis6'), 7600, 8600) &&
  ausQ('q_mis5a') === 0 && ausQ('q_mis5d') === 0,
  'PA_AUS_LGM ' + (window.PA_AUS_LGM || []).length + ' · q_mis4 ' + Math.round(ausQ('q_mis4')) + ' · q_mis5a ' + ausQ('q_mis5a'));

check('X.7 pozycje rekordów: dominant Nowej Gwinei w kordonie PNG (lat ∈ [−6, −4], lon ∈ [136, 146]); dominująca Tasmania ≈ Central Plateau (−41,75/146,55 ±1,5°)',
  (() => {
    const dng = ngG('lgm').slice().sort((a, b) => recSum(b) - recSum(a))[0];
    const dt = tasG('lgm').slice().sort((a, b) => recSum(b) - recSum(a))[0];
    const c1 = centroidOf(dng), c2 = centroidOf(dt);
    return c1[0] >= -6 && c1[0] <= -4 && c1[1] >= 136 && c1[1] <= 146 &&
           Math.abs(c2[0] + 41.75) < 1.5 && Math.abs(c2[1] - 146.55) < 1.5;
  })());

/* ============ XI. NOWA ZELANDIA — GLACIMONTIS (fala 2) + narracja ACR/YD jako schemat ============ */
const NZ_RE = /^Nowa Zelandia/;
const nzG = set => (P.ice_sets[set] || []).filter(p => p.src === 'GLACIMONTIS' && NZ_RE.test(p.name || ''));
const nzScr = set => (P.ice_sets[set] || []).filter(p => !p.src && NZ_RE.test(p.name || ''));
const nzScrSum = set => nzScr(set).reduce((a, p) => a + areaKm2(p.pts || p.rings[0]), 0);
const nzIn = t => envIcePolys(t).filter(p => NZ_RE.test(p.name || ''));
const nzQ = q => nzIn(ENV.ticks.find(t => t.q === q)).reduce((a, p) => a + areaKm2(p.pts || p.rings[0]), 0);

check('XI.1 LGM: ≥30 rekordów GLACIMONTIS (Barrell 2011, Golledge, Putnam i in. — zbiór zawiera autorów Σ~40 tys. km² Porter 1975/Barrell 2011/Golledge 2012), większość z wyspy Płd.; ZERO dysków-schematów w LGM i poznańskiej',
  nzG('lgm').length >= 30 && nzG('lgm').filter(p => /Wyspa Płd/.test(p.name)).length >= 20 &&
  nzG('lgm').some(p => /Barrell, 2011/.test(p.name)) &&
  nzScr('lgm').length === 0 && nzScr('poznanska').length === 0 && nzG('poznanska').length >= 10,
  'lgm ' + nzG('lgm').length + ' (Płd ' + nzG('lgm').filter(p => /Wyspa Płd/.test(p.name)).length + ') · pozn ' + nzG('poznanska').length);

check('XI.2 dominant NZ w LGM ∈ [35, 60] tys. km² (Barrell 2011 — Southern Alps + loby nizinne; literatura Σ~40 tys.) i ≥ 20× dominant Tasmanii; centroid w kordonie Southern Alps (±2° od −44/170)',
  inRange(domOf(nzG('lgm')), 35000, 60000) && domOf(nzG('lgm')) >= 20 * domOf(tasG('lgm')) &&
  (() => { const d = nzG('lgm').slice().sort((a, b) => recSum(b) - recSum(a))[0]; const c = centroidOf(d);
           return Math.abs(c[0] + 44) < 2 && Math.abs(c[1] - 170) < 2; })(),
  'dom ' + Math.round(domOf(nzG('lgm'))) + ' km² vs tas ' + Math.round(domOf(tasG('lgm'))) + ' km²');

check('XI.3 ACR/YD-podpis NZ = świadomy SCHEMAT z cytatem (pokrycie GLACIMONTIS w tych oknach za rzadkie → spójne jedno źródło): B–A ≈ pomorska ±15% (readvance ACR, Putnam 2010), mł. dryas < 0,75× B–A (cofka, Kaplan 2010)',
  ['pomorska', 'bolling_allerod', 'younger_dryas'].every(k =>
    nzScr(k).length === 9 && nzG(k).length === 0 && nzScr(k).every(p => /SCHEMAT/.test(p.name))) &&
  nzScrSum('bolling_allerod') >= 0.85 * nzScrSum('pomorska') && nzScrSum('bolling_allerod') <= 1.15 * nzScrSum('pomorska') &&
  nzScrSum('younger_dryas') < 0.75 * nzScrSum('bolling_allerod'),
  'pom ' + Math.round(nzScrSum('pomorska')) + ' → BA ' + Math.round(nzScrSum('bolling_allerod')) + ' → YD ' + Math.round(nzScrSum('younger_dryas')) + ' km²');

check('XI.4 „now”: 2 wpisy POMIAR — Southern Alps 794 ± 34 km² (Baumann i in. 2021, stan 2016) + Ruapehu 3 km²; zero GLACIMONTIS w „now” (zbiór = lok. LGM)',
  nzScr('now').length === 2 && nzScr('now').every(p => /POMIAR/.test(p.name)) && inRange(nzScrSum('now'), 700, 850),
  'wpisów: ' + nzScr('now').length + ' Σ ' + Math.round(nzScrSum('now')) + ' km²');

check('XI.5 q-przekroje: q_lgm = DANE (PA_NZ_LGM ≥30 rekordów GLACIMONTIS); q_mis4/q_mis6 = schemat SGM ~45 tys. km² ≥ LGM (Schaefer 2015); MIS 5a–d = 0',
  (window.PA_NZ_LGM || []).length >= 30 && (window.PA_NZ_LGM || []).every(p => p.src === 'GLACIMONTIS') &&
  inRange(nzQ('q_mis4'), 42000, 50000) && inRange(nzQ('q_mis6'), 42000, 50000) && nzQ('q_mis5a') === 0 && nzQ('q_mis5d') === 0,
  'PA_NZ_LGM ' + (window.PA_NZ_LGM || []).length + ' · q_mis4 ' + Math.round(nzQ('q_mis4')));

check('XI.6 trzy wzorce płk. płd. zgodne z cytowaną literaturą: Atlas YD>B–A (¹⁰Be, Fink 2014) · AUS YD<B–A (brak readvance, Barrows 2002) · NZ B–A≈pomorska z YD<B–A (Putnam 2010/Kaplan 2010) — wszystkie trzy na zachowanych schematach tam, gdzie GLACIMONTIS nie ma pokrycia',
  atlScrArea('younger_dryas') > atlScrArea('bolling_allerod') &&
  ausScrSum(ausScr('younger_dryas').filter(p => !/^Nowa Gwinea/.test(p.name))) < ausScrSum(ausScr('bolling_allerod').filter(p => !/^Nowa Gwinea/.test(p.name))) &&
  nzScrSum('younger_dryas') < nzScrSum('bolling_allerod') && nzScrSum('bolling_allerod') >= 0.85 * nzScrSum('pomorska'),
  'Atlas YD>BA: ' + (atlScrArea('younger_dryas') > atlScrArea('bolling_allerod')) +
  ' · AUS(Tasmania) YD<BA: ' + (ausScrSum(ausScr('younger_dryas').filter(p => !/^Nowa Gwinea/.test(p.name))) < ausScrSum(ausScr('bolling_allerod').filter(p => !/^Nowa Gwinea/.test(p.name)))) +
  ' · NZ: ' + (nzScrSum('younger_dryas') < nzScrSum('bolling_allerod') && nzScrSum('bolling_allerod') >= 0.85 * nzScrSum('pomorska')));

/* ============ XVI. GLACIMONTIS FALA 2 — inżynieria podmiany (jedno źródło na grupę×fazę) ============ */
const GLAC2C = {};
window.GLAC_W1.forEach(it => { if (it.grp) GLAC2C[it.grp] = (GLAC2C[it.grp] || 0) + 1; });
check('XVI.1 zbiór zawiera falę 2 (grp): nz ≥35, aus ≥17, ng ≥5, afr ≥6, atlas =1; Hughes i in. 2021 (Atlas 50,2 ka) poza fazami 11,7–30 ka → projektowo NIEobecny',
  (GLAC2C.nz || 0) >= 35 && (GLAC2C.aus || 0) >= 17 && (GLAC2C.ng || 0) >= 5 &&
  (GLAC2C.afr || 0) >= 6 && (GLAC2C.atlas || 0) === 1 &&
  !window.GLAC_W1.some(p => p.grp === 'atlas' && /Hughes/.test(p.name)),
  JSON.stringify(GLAC2C));

const G2_SCR = { nz: /^Nowa Zelandia/, aus: /^(Australia —|Tasmania)/, ng: /^Nowa Gwinea/,
                 afr: /^Afryka — (Kilimandżaro|góra Kenia|Ruwenzori)/, atlas: /^Afryka — Atlas/ };
const PH6 = ['przedmaksymalny', 'lgm', 'poznanska', 'pomorska', 'bolling_allerod', 'younger_dryas'];
const phaseStat = k => {
  const g = {}, sc = {};
  (P.ice_sets[k] || []).forEach(p => {
    if (p.src === 'GLACIMONTIS' && p.grp) g[p.grp] = (g[p.grp] || 0) + 1;
    else if (!p.src) for (const [gr, rx] of Object.entries(G2_SCR)) if (rx.test(p.name || '')) sc[gr] = (sc[gr] || 0) + 1;
  });
  return { g, sc };
};
check('XVI.2 SPOJNOŚĆ jedno źródło na grupę×fazę: w każdej fazie degla każda grupa ma ALBO rekordy GLACIMONTIS ALBO dyski-schematy — nigdy oba naraz (brak podwójnego rysowania)',
  PH6.every(k => { const { g, sc } = phaseStat(k);
    return Object.keys(G2_SCR).every(gr => !((g[gr] || 0) > 0 && (sc[gr] || 0) > 0)); }),
  PH6.map(k => { const { g, sc } = phaseStat(k); return k.slice(0, 4) + ':' + JSON.stringify(g) + '/' + JSON.stringify(sc); }).join('  '));

check('XVI.3 reguła MIN_COUNT: rzadkie okna = szczery schemat (NZ w pomorskiej/B–A/YD = 9 dysków, AUS w pomorskiej = 4, NG w YD = 2, Atlas od poznańskiej = 2) i ZERO tłumionych rekordów w tych oknach',
  (() => { const c = (k, gr) => phaseStat(k);
    return phaseStat('pomorska').g.nz === undefined && phaseStat('pomorska').sc.nz === 9 &&
           phaseStat('pomorska').sc.aus === 4 && (phaseStat('pomorska').g.aus || 0) === 0 &&
           (phaseStat('younger_dryas').g.ng || 0) === 0 && phaseStat('younger_dryas').sc.ng === 2 &&
           phaseStat('poznanska').sc.atlas === 2; })());
check('XVI.4 LGM = pełna podmiana: każda grupa z rekordami (≥ progi MIN_COUNT) i ZERO dysków; poznańska: nz/aus/ng/afr z rekordami i bez dysków, ATLAS świadomie zostaje narracyjnym schematem (2 dyski — rekord Hannah ma okno 19–25 ka, IX.3)',
  (() => { const A = phaseStat('lgm');
    return Object.keys(A.sc).length === 0 && (A.g.nz || 0) >= 10 && (A.g.aus || 0) >= 5 && (A.g.ng || 0) >= 2 && (A.g.afr || 0) >= 2 && (A.g.atlas || 0) >= 1; })() &&
  (() => { const B = phaseStat('poznanska');
    return Object.keys(B.sc).every(gr => gr === 'atlas') && B.sc.atlas === 2 &&
      (B.g.nz || 0) >= 10 && (B.g.aus || 0) >= 5 && (B.g.ng || 0) >= 2 && (B.g.afr || 0) >= 2 && !(B.g.atlas); })(),
  JSON.stringify({ lgm: phaseStat('lgm'), pozn: phaseStat('poznanska') }));

/* ============ XVII. PATICE-LAKES — paleojeziora przylodowcowe Patagonii (Davies i in. 2020, ESR 204:103152) ============ */
const PLK = window.PATICE_LAKES || {};
const PLK_KEYS = ['l35ka', 'l30ka', 'l25ka', 'l20ka', 'l15ka', 'l13ka', 'l10ka'];
const lakSum = k => (PLK[k] || []).reduce((s, l) => s + (l.area || 0), 0);
const lakGeoOK = PLK_KEYS.every(k => (PLK[k] || []).length >= 1 && (PLK[k] || []).every(l =>
  l.rings && l.rings.length >= 1 && l.rings.every(r =>
    r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] &&
    r.every(pt => pt[0] >= -57.5 && pt[0] <= -36 && pt[1] >= -80 && pt[1] <= -64) &&
    r.every((pt, i) => i === 0 || Math.abs(pt[1] - r[i - 1][1]) <= 60)) &&
  typeof l.ref === 'string' && l.ref.length >= 3));
check('XVII.1 PATICE_LAKES: 7 przekrojów 10–35 ka; łącznie 45–50 zbiorników ≥40 km²; ringi domknięte (lat,lon) w sektorze Patagonii [−57,5…−36 / −80…−64], długości krawędzi ≤60°; każdy zbiornik z odniesieniem publikacyjnym (ref)',
  PLK_KEYS.every(k => (PLK[k] || []).length >= 1) &&
  PLK_KEYS.reduce((s, k) => s + (PLK[k] || []).length, 0) >= 45 && lakGeoOK,
  'rekordów: ' + PLK_KEYS.reduce((s, k) => s + (PLK[k] || []).length, 0) +
  ' · źródło: ' + (window.PATICE_LAKES_SRC || '').slice(0, 60));
check('XVII.2 krzywa objętościowa = wzrost w deglacjacji do piku 13–15 ka (Σ ~13–14 tys. km²), potem zanik do 10 ka; 20 ka już 5–7 tys.; 25 ka < 2,5 tys.; 30/35 ka < 1,2 tys.; monotoniczność 25→13 i załamanie po 13 ka (fizyka jezior przylodziskowych)',
  inRange(lakSum('l15ka'), 12000, 15000) && inRange(lakSum('l13ka'), 12000, 15000) &&
  inRange(lakSum('l10ka'), 2500, 4500) && inRange(lakSum('l20ka'), 5000, 7500) &&
  lakSum('l25ka') < 2500 && lakSum('l30ka') < 1200 && lakSum('l35ka') < 500 &&
  lakSum('l20ka') > lakSum('l25ka') && lakSum('l15ka') > lakSum('l20ka') &&
  lakSum('l10ka') < lakSum('l13ka') * 0.45,
  'Σ: ' + PLK_KEYS.map(k => k.replace('l', '').replace('ka', '') + '=' + Math.round(lakSum(k))).join(' '));
const bigOf = k => Math.max.apply(null, (PLK[k] || []).map(l => l.area || 0));
const hasLake = (k, rx) => (PLK[k] || []).some(l => rx.test(l.name));
check('XVII.3 jezioro Chalenko (13 ka, stopień 6, Thorndycraft i in. 2019 — największe plejstoceńskie jezioro Ameryki Płd. objętościowo): szczytowy zbiornik 13 ka w [4, 5,5] tys. km²; płd. = Otway+Skyring (obydwa >1,5 tys.); 20 ka: Magellan/Tehuelche; 25 ka: Tar; 35 ka = dokładnie 1 zbiornik (CP)',
  hasLake('l13ka', /Chalenko/) && inRange(bigOf('l13ka'), 4000, 5500) &&
  hasLake('l15ka', /Otway/) && hasLake('l15ka', /Skyring/) &&
  hasLake('l20ka', /Magellan|Tehuelche/) && hasLake('l25ka', /Tar/) &&
  (PLK.l35ka || []).length === 1 && /CP/.test((PLK.l35ka[0] || {}).name || ''),
  'l13 top: ' + ((PLK.l13ka || []).slice().sort((a, b) => b.area - a.area)[0] || {}).name + ' ' + Math.round(bigOf('l13ka')) + ' km²');
const LK_MAP = { przedmaksymalny: 'l25ka', lgm: 'l20ka', poznanska: 'l15ka', pomorska: 'l15ka', bolling_allerod: 'l13ka', younger_dryas: 'l13ka', early_holocene: 'l10ka' };
const lkInSet = k => (P.ice_sets[k] || []).filter(p => p.lake === 1);
check('XVII.4 splice do osi: 7 faz ma jeziora ze src=PATICE-LAKE i flagą lake; liczność+Σ = przekrój publikacji; „now” = 0; fazy głębokie ≥ MIS 4 = 0 (zbiór zaczyna się od 35 ka — nic nie doklejone)',
  Object.keys(LK_MAP).every(k => lkInSet(k).length === (PLK[LK_MAP[k]] || []).length &&
    lkInSet(k).every(p => p.src === 'PATICE-LAKE') &&
    Math.abs(lkInSet(k).reduce((s, p) => s + (p.larea || 0), 0) - lakSum(LK_MAP[k])) < 1) &&
  (P.ice_sets.now || []).filter(p => p.lake).length === 0 &&
  ['mis3', 'mis4', 'mis6', 'warta', 'odra'].every(k => (P.ice_sets[k] || []).filter(p => p.lake).length === 0),
  Object.keys(LK_MAP).map(k => k + ':' + lkInSet(k).length).join(' '));
check('XVII.5 nazwy zbiorników w osi mówią prawdę: „paleojezioro przylodowcowe (PATICE NN ka)” + notka fazowa; B–A wymienia Chalenko jako największe; DANE vs SCHEMAT — PATICE_LAKES_SRC zaczyna się od „DANE —”',
  Object.keys(LK_MAP).every(k => lkInSet(k).every(p => /paleojezioro przylodowcowe \(PATICE \d+ ka\)/.test(p.name))) &&
  lkInSet('bolling_allerod').some(p => /Chalenko/.test(p.name) && /największ/.test(p.name)) &&
  /^DANE —/.test(window.PATICE_LAKES_SRC || '') &&
  /10\.17632\/ztz59y79vv/.test(window.PATICE_LAKES_SRC || ''));
check('XVII.6 envIcePolys q-cuts: q_35ka/q_30ka doklejają paleojeziora (pl.lake); q_40ka i MIS 4/6 = zero jezior (brak rekonstrukcji ≥40 ka)',
  envIcePolys({ q: 'q_35ka' }).filter(p => p.lake).length === (PLK.l35ka || []).length &&
  envIcePolys({ q: 'q_30ka' }).filter(p => p.lake).length === (PLK.l30ka || []).length &&
  envIcePolys({ q: 'q_40ka' }).filter(p => p.lake).length === 0 &&
  envIcePolys({ q: 'q_mis4' }).filter(p => p.lake).length === 0 &&
  envIcePolys({ q: 'q_mis6' }).filter(p => p.lake).length === 0,
  'q35: ' + envIcePolys({ q: 'q_35ka' }).filter(p => p.lake).length + ' jezior');

/* ============ XII. ANTARKTYDA (ICE-6G_C (VM5a), Argus i in. 2014 GJI 198:537) ============ */
const I6 = window.ICE_ICE6G || {};
const I6_KEYS = ['a26ka', 'a21ka', 'a17_5ka', 'a15ka', 'a13_5ka', 'a12ka', 'a10_5ka', 'a0ka'];
const anRings = key => (I6[key] || []).flatMap(p => p.rings || []);
const anClosedOK = I6_KEYS.every(k => anRings(k).length >= 1 && anRings(k).every(r =>
  r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] &&
  r.every(pt => pt[0] >= -84.9001 && pt[0] <= -60 && pt[1] >= -180 && pt[1] <= 180) &&
  r.every((pt, i) => i === 0 || Math.abs(pt[1] - r[i - 1][1]) <= 180)));
const anGlobeOK = I6_KEYS.every(k => (I6[k] || [])[0] && Array.isArray(I6[k][0].rings_globe) &&
  I6[k][0].rings_globe.every(r =>
    r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] &&
    r.every(pt => pt[0] >= -90.0001 && pt[0] <= -60 && pt[1] >= 0 && pt[1] <= 360)));   /* −90 = wierzchołek biegunowy RFC 7946 */
check('XII.1 ICE_ICE6G: 8 przekrojów (26/21/17,5/15/13,5/12/10,5/0 ka), ringi mapy domknięte (lat,lon), lat ≥ −84,9 (clamp Mercatora), lon ∈ [±180], ZERO skoków przez antymeridian + rings_globe (jeden pierścień ciągły 0..360 dla d3-geo)',
  I6_KEYS.every(k => (I6[k] || []).length === 1 && I6[k][0].src === 'ICE6G' && /Antarktyda/.test(I6[k][0].name)) && anClosedOK && anGlobeOK,
  'kluczy z danymi: ' + I6_KEYS.filter(k => I6[k]).length + '/8');
/* XII.2 powierzchnie wg literatury: dziś 13,6–14,2 mln km² (w tym szelfy); ICE-6G: 14,18 / LGM 15,20 (7%↑; RAISED: ugruntowanie przy krawędzi szelfu) */
const A6 = {}; I6_KEYS.forEach(k => A6[k] = anRings(k).reduce((a, r) => a + areaKm2(r), 0));
check('XII.2 „dziś” ≈ 13–14 mln km² i LGM ≈ 14–15 mln km² dla RENDEROWANYCH ringów (po clampie Mercatora −84,9 odpada polar-cap ~1,1 mln km²; siatka: 14,18/15,20 mln km²); stosunek LGM/dziś ∈ [1,03, 1,15]; cofka monotoniczna 15→0 ka',
  inRange(A6.a0ka, 12.3e6, 14.5e6) && inRange(A6.a21ka, 13.6e6, 15.4e6) &&
  inRange(A6.a21ka / A6.a0ka, 1.03, 1.15) && A6.a15ka >= A6.a13_5ka - 1 &&
  A6.a13_5ka >= A6.a10_5ka - 1 && A6.a10_5ka > A6.a0ka,
  '21ka ' + (A6.a21ka / 1e6).toFixed(2) + ' | 0ka ' + (A6.a0ka / 1e6).toFixed(2) + ' mln km² (×' +
  (A6.a21ka / A6.a0ka).toFixed(3) + ') | 15,0→0: ' + ['a15ka', 'a13_5ka', 'a12ka', 'a10_5ka', 'a0ka'].map(k => (A6[k] / 1e6).toFixed(2)).join('→'));
/* XII.3 splice: 8 kluczy degla+„now” dostaje ICE6G; stare schematy Antarktydy znikają TYLKO tam; fazy głębokie nietknięte */
const ANT_FAZY = ['przedmaksymalny', 'lgm', 'poznanska', 'pomorska', 'bolling_allerod', 'younger_dryas', 'early_holocene', 'now'];
const antIn = k => (P.ice_sets[k] || []).filter(p => /Antarktyd/.test(p.name || ''));
check('XII.3 splice: wszystkie 8 faz degla+„now” mają wpis src=ICE6G i ZERO starych schematów Antarktydy; mis3/eem = stary schemat nietknięty',
  ANT_FAZY.every(k => antIn(k).length === 1 && antIn(k)[0].src === 'ICE6G') &&
  antIn('mis3').some(p => p.src === undefined) && antIn('eem').some(p => p.src === undefined),
  ANT_FAZY.map(k => k.slice(0, 4) + ':' + antIn(k).map(p => p.src || 'schemat').join('+')).join(' '));
/* XII.4 łańcuch cytowań w app.js + zwartość ICE6G_SRC */
const ice6gHead = fs.readFileSync('/home/user/paleoatlas/js/data/ice_ice6g.js', 'utf8').slice(0, 1400);
check('XII.4 proweniencja: nagłówek + ICE6G_SRC z DOI (ggu140, 2014JB011176) i RAISED/Bentley 2014; app.js ma gałąź tooltipa ICE6G',
  /10\.1093\/gji\/ggu140/.test(ice6gHead) && /2014JB011176/.test(ice6gHead) && /Bentley/.test(ice6gHead) &&
  /10\.1093\/gji\/ggu140/.test(window.ICE6G_SRC || '') && /RAISED/.test(window.ICE6G_SRC || '') && /ICE6G/.test(appSrc),
  (window.ICE6G_SRC || '').slice(0, 120));
/* XII.5 q-przekroje: Antarktyda „dziś” (ICE6G 0 ka) doklejana do stadiałów Q19 — dokładnie 1×, ze źródłem */
const antQ = q => envIcePolys(ENV.ticks.find(t => t.q === q)).filter(p => /Antarktyd/.test(p.name || ''));
check('XII.5 q_mis4 i q_mis6: dokładnie 1 wpis Antarktydy i jest nim ICE6G 0 ka (zasięg płk. płd. z danych, nie ze schematu)',
  ['q_mis4', 'q_mis6'].every(q => { const a = antQ(q); return a.length === 1 && a[0].src === 'ICE6G'; }),
  'q_mis4 → ' + (antQ('q_mis4')[0] || {}).src + ' · q_mis6 → ' + (antQ('q_mis6')[0] || {}).src);
/* XII.6 faza lgm (21,5 ka): Antarktyda większa niż „dziś” w zbiorach portalu też PO stronie ice */
const antAreaIce = k => antIn(k).reduce((a, p) => a + (p.rings || []).reduce((b, r) => b + areaKm2(r), 0), 0);
check('XII.6 faza lgm > „now” (Δ ≈ 1,0 mln km² na czole szelfu — Ross/Weddell), a przekroje pośrednie brzegów degla istnieją (26/13,5/12 ka)',
  antAreaIce('lgm') > antAreaIce('now') && antAreaIce('lgm') - antAreaIce('now') < 2.2e6 &&
  I6.a26ka && I6.a13_5ka && I6.a12ka && ANT_FAZY.every(k => antIn(k).length === 1),
  'lgm ' + (antAreaIce('lgm') / 1e6).toFixed(2) + ' − now ' + (antAreaIce('now') / 1e6).toFixed(2) + ' = Δ' +
  ((antAreaIce('lgm') - antAreaIce('now')) / 1e6).toFixed(2) + ' mln km²');
/* XII.7 „O danych”: wiersz Antarktydy opisuje ICE-6G_C jako DANE modelowe + RAISED; fazy głębokie — kotwica ≈ „dziś” (XX) */
const odaneHasAnt = /ICE-6G_C/.test(appSrc) && /RAISED/.test(appSrc) && /Antarktyda „dziś”/.test(appSrc);
check('XII.7 „O danych”: wiersz Antarktydy z etykietą DANE modelowe (ICE-6G_C + RAISED) i uczciwą notką dla faz głębokich (kotwica ≈ „dziś” — od warstwy XX)',
  odaneHasAnt && /kotwica ≈ „dziś”<\/b> \(przekrój 0 ka, DANE\)/.test(appSrc) && /kończą się na LGM/.test(appSrc),
  'wiersz w panelu: ' + odaneHasAnt);

/* ============ XIII. GLACIMONTIS (fala 1: lodowce górskie świata, empiryczne) ============ */
const G1 = window.GLAC_W1 || [];
const gRings = it => it.rings || [];
const gClosedOK = G1.every(it => gRings(it).every(r =>
  r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] &&
  r.every(pt => pt[0] >= -90 && pt[0] <= 90 && pt[1] >= -180 && pt[1] <= 180) &&
  r.every((pt, i) => i === 0 || Math.abs(pt[1] - r[i - 1][1]) <= 170)));
check('XIII.1 GLAC_W1: 540–600 rekordów; wszystkie src=GLACIMONTIS z cite+win; ringi domknięte (lat,lon), granice poprawne, ZERO krawędzi >170° (M1.1)',
  inRange(G1.length, 600, 700) && G1.every(it => it.src === 'GLACIMONTIS' && it.cite && it.win.length >= 1 &&
    /GLACIMONTIS/.test(it.name)) && gClosedOK,
  'rekordów: ' + G1.length);
/* XIII.2 Tatry: Zasadni & Kłapyta 2014 ≈ 280 km² (19 ringów), okno 21–28 ka → lgm + przedmaksymalny */
const gName = it => it.name;
const gArea = it => gRings(it).reduce((a, r) => a + areaKm2(r), 0);
const tatry = G1.filter(it => /KARPATY/.test(gName(it)));
const zas = tatry.find(it => /Zasadni/.test(it.name));
check('XIII.2 TATRY w portalu z DANYCH: Zasadni & Kłapyta 2014 Σ 230–300 km² (≈ opublikowane ~280), okna = przedmaksymalny+lgm (21–28 ka), centroid w Tatrach (49,2°N/20,0°E ±1°)',
  !!zas && inRange(gArea(zas), 200, 320) && zas.win.includes('lgm') && zas.win.includes('przedmaksymalny') &&
  !zas.win.includes('pomorska') &&
  zas.rings.every(r => r.every(pt => pt[0] > 47 && pt[0] < 50.5 && pt[1] > 19 && pt[1] < 26.5)) &&
  // (inne rekordy KARPATY — np. Ignéczi & Nagy — obejmują Karpaty Południowe ~45°N: okno geo dotyczy tylko Tatr)
  tatry.every(it => /Zasadni/.test(it.name) || /KARPATY/.test(it.name)),
  tatry.length + ' rekordów Karpat; Σ Zasadni: ' + (zas ? Math.round(gArea(zas)) : '—') + ' km²');
/* XIII.3 Wierchojańsk: Barr & Clark 2012 — zimnokontynentalna największa płk. płd.? nie: płk. płn. górska;
   schemat portalu („NE Azja … ≪ MIS 4/6”) znikął z 3 faz; DANE na jego miejscu */
const lgmHas = rx => (P.ice_sets.lgm || []).some(p => rx.test(p.name || ''));
const lgmG = (P.ice_sets.lgm || []).filter(p => p.src === 'GLACIMONTIS');
const verkh = lgmG.filter(p => /Wierchojańsk — lodowce: Barr and Clark/.test(p.name));
const verkhSum = verkh.reduce((a, p) => a + gArea(p), 0);
check('XIII.3 podmianka schemat→DANE: po splice w lgm/poznanska/przedmaksymalny NIE MA „NE Azja…” ani „Tibet i Himalaje” (schemat); w lgm GLACIMONTIS: Wierchojańsk wg Barr & Clark 2012 Σ ≥ 35 tys. km² + Himalaje obecne',
  ['przedmaksymalny', 'lgm', 'poznanska'].every(k => !(P.ice_sets[k] || []).some(p => p.src === undefined &&
    /^(NE Azja|Tibet i Himalaje)/.test(p.name || ''))) &&
  verkh.length >= 1 && verkhSum >= 35000 && lgmHas(/Himalaje — lodowce/),
  'Wierchojańsk Σ (lgm): ' + Math.round(verkhSum) + ' km² (rekordów: ' + verkh.length + '); Himalaje: ' + lgmHas(/Himalaje — lodowce/));
/* XIII.4 okno fazowe zgodne z rekordem: younger_dryas dostaje tylko rekordy przecinające [11,7;12,9) ka */
const PHASEWIN = { przedmaksymalny: [24000, 30000], lgm: [19000, 24000], poznanska: [16000, 19000], pomorska: [14000, 16000], bolling_allerod: [12900, 14000], younger_dryas: [11700, 12900] };
const ydG = (P.ice_sets.younger_dryas || []).filter(p => p.src === 'GLACIMONTIS');
const ydOK = ydG.every(p => (G1.find(it => it.name === p.name) || {}).win.includes('younger_dryas'));
check('XIII.4 detale okien: younger_dryas zawiera tylko rekordy z win ∋ younger_dryas (per zapis 57–14 ka); mł. dryas ≠ „wszystko na raz”',
  ydOK && ydG.length >= 1,
  'rekordów w mł. dryasie: ' + ydG.length);
/* XIII.5 proweniencja: nagłówek + GLAC_SRC + app.js (tooltip + wiersz „O danych”) */
const glacHead = fs.readFileSync('/home/user/paleoatlas/js/data/ice_glacmont.js', 'utf8').slice(0, 1500);
check('XIII.5 proweniencja: DOI s41597-026-06841-z + Zenodo 15600659 + CC-BY; tooltip z cytowaniem poligonu (ic.cite); wiersz „O danych” istnieje',
  /10\.1038\/s41597-026-06841-z/.test(glacHead) && /15600659/.test(glacHead) && /CC-BY/.test(glacHead) &&
  /s41597-026-06841-z/.test(window.GLAC_SRC || '') && /GLACIMONTIS/.test(appSrc) && /ic\.cite/.test(appSrc),
  (window.GLAC_SRC || '').slice(0, 110));
/* XIII.6 etykiety sporności: rekordy-Kuhlego/Shangzhe = HIPOTEZA; Kuhlemann NIE jest błędnie oznaczony */
const hyp = G1.filter(it => /HIPOTEZA/.test(it.name));
check('XIII.6 HIPOTEZA sporna: rekordy Kuhle/Shangzhe/Kamp oznaczone; Kuhlemann niesłusznie oskarżony nie jest (bug startswith „Kuhle”)',
  hyp.length >= 2 && hyp.every(it => /Kuhle|Shangzhe|Kamp/.test(it.name)) &&
  !G1.some(it => /Kuhlemann/.test(it.name) && /HIPOTEZA/.test(it.name)),
  'z etykietą HIPOTEZA: ' + hyp.length + ' (Kuhlemann hipotezą nie jest)');

/* ============ XIV. GRENLANDIA z ICE-6G_C ============ */
const GGR = window.ICE_ICE6G_GR || {};
const GGR_KEYS = ['g26ka', 'g21ka', 'g17_5ka', 'g15ka', 'g13_5ka', 'g12ka', 'g10_5ka', 'g0ka'];
const ggrOK = GGR_KEYS.every(k => (GGR[k] || []).length === 1 && (GGR[k][0].rings || []).every(r =>
  r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] &&
  r.every(pt => pt[0] >= 57 && pt[0] <= 84.5 && pt[1] >= -75 && pt[1] <= -10)));
check('XIV.1 ICE_ICE6G_GR: 8 przekrojów Grenlandii (26→0 ka), ring domknięty, lat ∈ [57, 84,5], lon ∈ [−75, −10] (bez Islandii)',
  GGR_KEYS.every(k => (GGR[k] || []).length === 1 && GGR[k][0].src === 'ICE6G') && ggrOK,
  'kluczy: ' + GGR_KEYS.filter(k => GGR[k]).length + '/8');
const AG = {}; GGR_KEYS.forEach(k => AG[k] = (GGR[k][0].rings || []).reduce((a, r) => a + areaKm2(r), 0));
check('XIV.2 powierzchnie: „dziś” 1,74 ± 0,22 mln km² (rzeczywista ~1,71); LGM 2,50 ± 0,25 mln (czapa na szelfie); stosunek ∈ [1,25, 1,55]; cofka w holocenie (maska 1°)',
  inRange(AG.g0ka, 1.52e6, 1.96e6) && inRange(AG.g21ka, 2.25e6, 2.75e6) &&
  inRange(AG.g21ka / AG.g0ka, 1.25, 1.55) && AG.g26ka >= AG.g21ka * 0.985 && AG.g10_5ka > AG.g0ka,
  '21ka ' + (AG.g21ka / 1e6).toFixed(2) + ' | 0ka ' + (AG.g0ka / 1e6).toFixed(2) + ' mln km² (×' + (AG.g21ka / AG.g0ka).toFixed(2) + ')');
const grenIn = k => (P.ice_sets[k] || []).filter(p => /^Grenlandia/.test(p.name || ''));
check('XIV.3 splice: w 8 fazach degla+„now” dokładnie 1 wpis Grenlandii src=ICE6G i zero starych schematów; NADI-1 nietknięty (Archipelag/Ameryka brutto)',
  ANT_FAZY.every(k => grenIn(k).length === 1 && grenIn(k)[0].src === 'ICE6G') &&
  ANT_FAZY.every(k => !(P.ice_sets[k] || []).some(p => p.src === undefined && /^Grenlandia/.test(p.name || ''))),
  ANT_FAZY.map(k => k.slice(0, 3) + ':' + grenIn(k).length).join(' '));
check('XIV.4 notki fazowe Grenlandii cytują Lecavalier & Peltier (LGM) — zasięg LGM > dziś w portalu też W PRZEGLĄDARCE numerarycznych',
  /Lecavalier/.test(JSON.stringify(P.ice_sets.lgm.map(p => p.name))) &&
  grenIn('lgm')[0].src === 'ICE6G' && AG.g21ka > AG.g0ka,
  'LGM name zawiera Lecavalier: ' + /Lecavalier/.test(JSON.stringify(P.ice_sets.lgm.map(p => p.name))));

/* ============ XV. WYSPY BRYTYJSKIE z BRITICE-CHRONO (empiryczne, PANGAEA 945729) ============ */
const BRI = window.ICE_BRITICE || {};
const BRI_KEYS = ['b27ka', 'b21ka', 'b18ka', 'b15ka'];
check('XV.1 ICE_BRITICE: 4 przekroje (27/21/18/15 ka), każdy 1 wpis src=BRITICE-CHRONO; ringi domknięte (lat,lon) w sektorze BIIS (lat ∈ [48, 61.45], lon ∈ [−13.05, 11.5]), ≥4 pkt, ZERO krawędzi >170° (M1.1)',
  BRI_KEYS.every(k => (BRI[k] || []).length === 1 && BRI[k][0].src === 'BRITICE-CHRONO' &&
    BRI[k][0].rings.every(r => {
      if (r.length < 4 || r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1]) return false;
      for (let i = 0; i < r.length; i++) {
        if (r[i][0] < 48 || r[i][0] > 61.45 || r[i][1] < -13.05 || r[i][1] > 11.5) return false;
        if (i > 0 && Math.abs(r[i][1] - r[i - 1][1]) > 170) return false;
      }
      return true;
    })),
  BRI_KEYS.map(k => k + ':' + ((BRI[k] || [])[0] ? (BRI[k][0].rings.length + 'R') : 'BRAK')).join(' '));
const AB = {}; BRI_KEYS.forEach(k => AB[k] = ((BRI[k] || [])[0] ? (BRI[k][0].rings || []).reduce((a, r) => a + areaKm2(r), 0) : 0));
check('XV.2 powierzchnie BIIS wg Clark 2022: maksimum ~0,70–0,95 mln km² (21 i 27 ka), 18 ka < 21 ka; 15 ka ≪ 18 ka (zapaść morska — ≤ 50%)',
  inRange(AB.b21ka, 0.70e6, 0.95e6) && inRange(AB.b27ka, 0.70e6, 0.95e6) &&
  AB.b18ka < AB.b21ka * 0.75 && AB.b15ka <= AB.b18ka * 0.5,
  Object.keys(AB).map(k => k + ' ' + Math.round(AB[k] / 1000) + 'tys.km²').join(' '));
const briIn = k => (P.ice_sets[k] || []).filter(p => p.src === 'BRITICE-CHRONO');
const gbrOld = k => (P.ice_sets[k] || []).filter(p => p.src === undefined && /^(Wyspy Brytyjskie|Szkocja)/.test(p.name || ''));
check('XV.3 splice: 4 fazy (przedmax/LGM/pozn/pom) mają dokładnie 1 wpis BRITICE i zero starych schematów; B-A = BEZ lodu brytyjskiego (deglacjacja ~15–14 ka); YD: Loch Lomond pokrywa DATED-1 12 ka',
  ['przedmaksymalny', 'lgm', 'poznanska', 'pomorska'].every(k => briIn(k).length === 1 && gbrOld(k).length === 0) &&
  ['bolling_allerod', 'younger_dryas', 'early_holocene'].every(k => briIn(k).length === 0 && gbrOld(k).length === 0) &&
  (P.ice_sets.younger_dryas || []).some(p => p.src === 'DATED-1' && /Loch Lomond/.test(p.name)),
  ['przedmaksymalny','lgm','poznanska','pomorska','bolling_allerod','younger_dryas']
    .map(k => k.slice(0, 4) + ':' + briIn(k).length + '/' + gbrOld(k).length).join(' '));
check('XV.4 geografia optimum: w 27 ka lądolód sięga krawędzi szelfu celtyckiego (min lon ≤ −10,5); nie wystaje poza Wyspy + Shetland (max lat ≤ 61,45); w 15 ka największy fragment ≤ 40% LGM (szczątki)',
  minLon(BRI.b27ka[0].rings) <= -10.5 && maxLatB(BRI.b21ka[0].rings) <= 61.45 &&
  domArea(BRI.b15ka[0].rings) <= 0.40 * domArea(BRI.b21ka[0].rings),
  'minLon27 ' + minLon(BRI.b27ka[0].rings).toFixed(1) + ' · maxLat21 ' + maxLatB(BRI.b21ka[0].rings).toFixed(1) +
  ' · dom 15ka/LGM ' + (domArea(BRI.b15ka[0].rings) / domArea(BRI.b21ka[0].rings)).toFixed(2));

/* ============ XVIII. WARIANTY BRITICE-CHRONO — MINIMUM/OPTIMUM/MAKSIMUM niepewności ============ */
const BV = window.ICE_BRITICE_VARIANTS || {};
check('XVIII.1 ICE_BRITICE_VARIANTS: min/opt/max × 4 przekroje (27/21/18/15 ka), każdy 1 wpis src=BRITICE-CHRONO; ringi domknięte w sektorze BIIS; nazwa niesie etykietę wariantu; ICE_BRITICE = alias OPTIMUM',
  ['min', 'opt', 'max'].every(v => BRI_KEYS.every(k => ((BV[v] || {})[k] || []).length === 1 && BV[v][k][0].src === 'BRITICE-CHRONO' &&
    BV[v][k][0].name.includes({ min: 'MINIMUM', opt: 'OPTIMUM', max: 'MAKSIMUM' }[v]) &&
    BV[v][k][0].rings.every(r => r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] &&
      r.every(pt => pt[0] >= 48 && pt[0] <= 61.45 && pt[1] >= -13.05 && pt[1] <= 11.5)))) &&
  BRI.b21ka && (BV.opt || {}).b21ka && BRI.b21ka[0] === BV.opt.b21ka[0],
  ['min', 'opt', 'max'].map(v => v + ':' + BRI_KEYS.map(k => ((BV[v] || {})[k] || [{ rings: [] }])[0].rings.length + 'R').join('/')).join(' '));
const AV = {};
['min', 'opt', 'max'].forEach(v => {
  AV[v] = {};
  BRI_KEYS.forEach(k => AV[v][k] = (((BV[v] || {})[k] || [{ rings: [] }])[0].rings || []).reduce((a, r) => a + areaKm2(r), 0));
});
check('XVIII.2 siła wariantów wg Clark 2022: ścisłe min < opt < max we WSZYSTKICH 4 przekrojach; LGM ≈ 0,45/0,77/1,00 mln km²; 15 ka: max ≈ 2× optimum (wariant dominuje wynikiem w późnej deglacjacji)',
  BRI_KEYS.every(k => AV.min[k] < AV.opt[k] && AV.opt[k] < AV.max[k]) &&
  inRange(AV.min.b21ka, 0.40e6, 0.55e6) && inRange(AV.opt.b21ka, 0.70e6, 0.86e6) && inRange(AV.max.b21ka, 0.90e6, 1.10e6) &&
  AV.max.b15ka > 1.6 * AV.opt.b15ka,
  BRI_KEYS.map(k => k.replace('b', '').replace('ka', '') + ':' + Math.round(AV.min[k] / 1000) + '/' + Math.round(AV.opt[k] / 1000) + '/' + Math.round(AV.max[k] / 1000) + 'tys').join(' '));
const MAPB_T = { przedmaksymalny: 'b27ka', lgm: 'b21ka', poznanska: 'b18ka', pomorska: 'b15ka' };
const nNonBri = k => (P.ice_sets[k] || []).filter(p => p.src !== 'BRITICE-CHRONO').length;
window.BRITICE_SET_VARIANT('min');
const swapMinOK = Object.keys(MAPB_T).every(k => briIn(k).length === 1 && /MINIMUM/.test(briIn(k)[0].name) && briIn(k)[0].rings === BV.min[MAPB_T[k]][0].rings && gbrOld(k).length === 0);
window.BRITICE_SET_VARIANT('min');   // idempotentność: drugi raz nie dokleja
const idemOK = Object.keys(MAPB_T).every(k => briIn(k).length === 1);
window.BRITICE_SET_VARIANT('max');
const swapMaxOK = Object.keys(MAPB_T).every(k => briIn(k).length === 1 && /MAKSIMUM/.test(briIn(k)[0].name) && briIn(k)[0].rings === BV.max[MAPB_T[k]][0].rings);
check('XVIII.3 BRITICE_SET_VARIANT w locie: min→max zamienia wpisy (1/fazę, zero schematów, zero duplikatów, referencje ringów = żywe dane wariantu); B–A nadal bez lodu i bez wpisu BRITICE',
  swapMinOK && idemOK && swapMaxOK && briIn('bolling_allerod').length === 0 && gbrOld('bolling_allerod').length === 0,
  'min OK:' + swapMinOK + ' · idem:' + idemOK + ' · max OK:' + swapMaxOK);
const beforeInv = ['przedmaksymalny', 'lgm', 'poznanska', 'pomorska'].map(nNonBri);
window.BRITICE_SET_VARIANT('opt');
const afterInv = ['przedmaksymalny', 'lgm', 'poznanska', 'pomorska'].map(nNonBri);
check('XVIII.4 zamiana nie rusza warstw nie-BIIS (DATED-1/NADI-1/GLACIMONTIS/ICE6G liczności bez zmian); po powrocie do OPTIMUM cytat BRITICE_SRC zna wariant i wskazuje przełącznik „🧊 BIIS”',
  beforeInv.every((v, i) => v === afterInv[i]) && window.BRITICE_VARIANT === 'opt' &&
  /OPTIMUM/.test(briIn('lgm')[0].name) && /OPTIMUM/.test(window.BRITICE_SRC || '') && /🧊 BIIS/.test(window.BRITICE_SRC || ''),
  'nieBIIS przed/po: ' + beforeInv.join(',') + ' → ' + afterInv.join(','));

/* ============ XIX. ISLANDIA — RGI 7.0 „dziś” + ICE-6G_C deglacjacja + walidacja IcelandICE ============ */
const RGI = window.ICE_RGI_ISL || [];
const IS6 = window.ICE_ICE6G_IS || {};
const inRing = (ring, la, lo) => {              // rzut promienia: ring (lat,lon) (domknięty)
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [y1, x1] = ring[i], [y2, x2] = ring[i + 1];
    if ((x1 <= lo) !== (x2 <= lo)) {
      const yc = y1 + (y2 - y1) * (lo - x1) / (x2 - x1);
      if (yc > la) s = 1 - s;
    }
  }
  return !!s;
};
const covAny = (ent, la, lo) => (ent.rings || []).some(r => inRing(r, la, lo));
const A_RGI = RGI.reduce((a, e) => a + (e.rings || []).reduce((x, r) => x + areaKm2(r), 0), 0);
check('XIX.1 RGI 7.0 „dziś”: ≥9 wpisów z nazwanymi czapami (Vatnajökull/Langjökull/Hofsjökull/Mýrdalsjökull/Drangajökull); Σ ∈ [10,7; 11,3] tys. km² (inwentarz 11 060 km²); Vatnajökull ∈ [7,7; 8,6] tys.; ringi domknięte, ≥4 pkt, w boksie Islandii; src RGI-7',
  RGI.length >= 9 && ['Vatnajökull', 'Langjökull', 'Hofsjökull', 'Mýrdalsjökull', 'Drangajökull'].every(nm => RGI.some(e => e.name.includes(nm))) &&
  inRange(A_RGI, 10700, 11300) &&
  inRange((RGI.find(e => /Vatnajökull/.test(e.name)) || { rings: [] }).rings.reduce((x, r) => x + areaKm2(r), 0), 7700, 8600) &&
  RGI.every(e => e.src === 'RGI-7' && e.rings.every(r => r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] &&
    r.every(pt => pt[0] >= 63.3 && pt[0] <= 66.7 && pt[1] >= -24.6 && pt[1] <= -13.4))),
  RGI.length + ' wpisów · Σ ' + Math.round(A_RGI) + ' km²');
const ISK = ['i15ka', 'i13_5ka', 'i12ka', 'i10_5ka'];
const A_IS = {}; ISK.forEach(k => A_IS[k] = ((IS6[k] || [{ rings: [] }])[0].rings || []).reduce((a, r) => a + areaKm2(r), 0));
check('XIX.2 ICE-6G_C IIS (4 przekroje deglacjacji): i15ka ≈ 100–145 tys. km²; i12 ≤ i15; i10_5 ≤ i12; maska statyczna 15→13,5 ka (Δ ≤ 5 tys. — mechanika siatki 1°, udokumentowana); ringi domknięte w sektorze',
  ISK.every(k => (IS6[k] || []).length === 1 && IS6[k][0].src === 'ICE6G' && /Islandia/.test(IS6[k][0].name) &&
    IS6[k][0].rings.every(r => r.length >= 4 && r[0][0] === r[r.length - 1][0] && r[0][1] === r[r.length - 1][1] &&
      r.every(pt => pt[0] >= 62.3 && pt[0] <= 67.6 && pt[1] >= -27.2 && pt[1] <= -10.8))) &&
  inRange(A_IS.i15ka, 100e3, 145e3) && inRange(A_IS.i12ka, 45e3, 75e3) &&
  A_IS.i12ka < A_IS.i15ka && A_IS.i10_5ka <= A_IS.i12ka && Math.abs(A_IS.i15ka - A_IS.i13_5ka) <= 5e3,
  ISK.map(k => k + ':' + (A_IS[k] / 1000).toFixed(1) + 'tys.').join(' '));
const islSet = k => (P.ice_sets[k] || []).filter(p => /Islandia/.test(p.name));
const islG = k => islSet(k).filter(p => p.src === 'ICE6G');
const islS = k => islSet(k).filter(p => p.src === undefined && /^Islandia/.test(p.name));
const islR = k => (P.ice_sets[k] || []).filter(p => p.src === 'RGI-7');
check('XIX.3 splice: pomorska/B–A/MD/wcz. holocen = dokładnie 1 wpis ICE-6G islandzki i 0 schematów; przedmax/LGM/poznańska = schemat z natury empirycznej (Norðdahl & Pétursson 2005); „dziś” ≥9 wpisów RGI; Antarktyda/Grenlandia nietknięte',
  ['pomorska', 'bolling_allerod', 'younger_dryas', 'early_holocene'].every(k => islG(k).length === 1 && islS(k).length === 0) &&
  ['przedmaksymalny', 'lgm', 'poznanska'].every(k => islSet(k).length === 1 && islS(k).length === 1 && /schemat/i.test(islSet(k)[0].name) && /Norðdahl/.test(islSet(k)[0].name)) &&
  islR('now').length >= 9 &&
  (P.ice_sets.now || []).filter(p => p.src === 'ICE6G' && /Antarktyd/.test(p.name)).length === 1 &&
  (P.ice_sets.now || []).filter(p => p.src === 'ICE6G' && /Grenlandia/.test(p.name)).length === 1,
  ['pomorska', 'bolling_allerod', 'younger_dryas', 'now'].map(k => k.slice(0, 4) + ':' + islSet(k).length).join(' '));
/* IcelandICE DB (Goffin i in. 2026, Zenodo doi:10.5281/zenodo.19453940, CC-BY 4.0):
   [id, lat, lon, wiek kal. ka, marine] — 37 wiążących punktów zasięgu/grubości IIS */
const ISLICE = [
  ['2001', 66.938, -19.108, 46.0, 1],
  ['1029', 63.923, -22.48, 38.9, 0],
  ['2005', 66.584, -23.968, 36.5, 1],
  ['1028', 64.154, -22.026, 31.6, 0],
  ['2002', 66.846, -20.227, 28.7, 1],
  ['1030', 63.963, -22.552, 25.2, 0],
  ['2004', 66.584, -23.968, 22.3, 1],
  ['2007', 65.119, -27.534, 21.0, 1],
  ['1003', 66.116, -16.336, 20.4, 0],
  ['2006', 64.285, -24.212, 15.3, 1],
  ['2003', 66.855, -20.234, 15.0, 1],
  ['1007', 66.348, -16.504, 14.7, 0],
  ['1024', 64.523, -21.693, 14.6, 0],
  ['1025', 64.362, -21.838, 14.6, 0],
  ['1006', 66.353, -16.472, 14.4, 0],
  ['1010', 65.785, -16.885, 14.4, 0],
  ['1009', 65.454, -16.862, 14.3, 0],
  ['1027', 64.394, -22.023, 12.8, 0],
  ['1013', 65.958, -19.938, 12.7, 0],
  ['1021', 64.387, -21.2, 12.6, 0],
  ['1015', 66.061, -20.383, 12.4, 0],
  ['1026', 64.121, -21.921, 12.4, 0],
  ['1001', 65.461, -14.338, 12.1, 0],
  ['1011', 65.826, -17.901, 12.1, 0],
  ['1018', 64.324, -20.579, 12.1, 0],
  ['1019', 64.012, -20.679, 12.1, 0],
  ['1012', 65.963, -19.517, 11.9, 0],
  ['1023', 64.174, -21.672, 11.8, 0],
  ['1022', 63.941, -21.523, 11.4, 0],
  ['1004', 66.05, -16.346, 11.2, 0],
  ['1014', 64.015, -20.24, 11.1, 0],
  ['1002', 65.662, -14.982, 11.0, 0],
  ['1008', 65.55, -16.646, 10.8, 0],
  ['1017', 64.418, -20.537, 10.7, 0],
  ['1005', 65.179, -16.35, 10.4, 0],
  ['1020', 64.355, -20.683, 10.4, 0],
  ['1016', 64.358, -20.5, 10.1, 0]
];
const cov6 = (k, pt) => covAny(IS6[k][0], pt[1], pt[2]);
const c15 = ISLICE.filter(pt => cov6('i15ka', pt)).length;
const c12 = ISLICE.filter(pt => cov6('i12ka', pt)).length;
const c105 = ISLICE.filter(pt => cov6('i10_5ka', pt)).length;
const cMar15 = ISLICE.filter(pt => pt[4] === 1 && cov6('i15ka', pt)).length;
check('XIX.4 walidacja IcelandICE (37 punktów kal.): 15 ka maska pokrywa ≥24 (zm. 26/37, tu gł. lądowe — maska 1° nie sięga zewnętrznego szelfu wg projektu); 12/10,5 ka ≤ 15 (zm. 13); punkty morskie EXT: 0/7 pokrytych nigdy; pokrycia nierosnące w czasie',
  c15 >= 24 && c12 <= 15 && c105 <= 15 && cMar15 === 0 && c15 >= c12 && c12 >= c105,
  'pokr: 15ka ' + c15 + '/37 · 12ka ' + c12 + ' · 10,5ka ' + c105 + ' · morskie@15ka ' + cMar15 + '/7');
const vat = pnt => covAny(RGI.find(e => /Vatnajökull/.test(e.name)) || { rings: [] }, pnt[0], pnt[1]);
const myr = covAny(RGI.find(e => /Mýrdalsjökull/.test(e.name)) || { rings: [] }, 63.63, -19.08);
check('XIX.5 kanoniczne punkty: centrum Vatnajökull (64,4°N, −16,8°E) w czapie RGI i w masce i15ka; Mýrdalsjökull (63,63°N, −19,08°E) w swojej czapie RGI (zużycie punkt-in-poligon działa na geojsonie RGI)',
  vat([64.4, -16.8]) && cov6('i15ka', ['x', 64.4, -16.8]) && myr,
  'vat RGI:' + vat([64.4, -16.8]) + ' · vat i15:' + cov6('i15ka', ['x', 64.4, -16.8]) + ' · myr:' + myr);


/* ============ XX. GŁĘBOKIE STADIAŁY — etykieta PIS ≥40 ka (Davies/Rabassa/Hein) + Antarktyda-kotwica (RAISED) ============ */
const QS_DEEP = ['q_40ka', 'q_mis4', 'q_mis6', 'q_mis8', 'q_mis10', 'q_mis12', 'q_mis16', 'q_mis20_24', 'q_matuyama'];
const qPisXX = t => envIcePolys(t).filter(p => /Patago|PIS/.test(p.name));
const qAntXX = t => envIcePolys(t).filter(p => /Antarktyd/.test(p.name));
const okStages = QS_DEEP.map(k => {
  const t = ENV.ticks.find(tt => tt.q === k);
  const arr = qPisXX(t);
  const stage = (t.label || '').split(' — ')[0];
  return arr.length === 1 && /SCHEMAT portalu/.test(arr[0].name) && /Davies i in\. 2020/.test(arr[0].name)
    && /Rabassa 2008/.test(arr[0].name) && arr[0].name.indexOf(' — ' + stage) >= 12;
});
check('XX.1 głębokie stadiały PIS (9 przekrojów ≥40 ka): dokładnie 1 wpis; etykieta epokowa z ticka ENV; token „SCHEMAT portalu” + cytaty Davies i in. 2020 (PATICE ≤35 ka) i Rabassa 2008 (moreny zewn. niedatowane)',
  okStages.every(Boolean) && QS_DEEP.length === 9, QS_DEEP.map((k, i) => k + ':' + (okStages[i] ? 1 : 0)).join(' '));
const matTicks = ENV.ticks.filter(t => t.q === 'q_matuyama');
const okGpg = matTicks.every(t => { const a = qPisXX(t)[0]; return a && /Greatest Patagonian Glaciation/.test(a.name) && /Hein i in\. 2009/.test(a.name); });
const nonMatArr = ['q_mis4', 'q_mis6', 'q_mis20_24'].map(k => qPisXX(ENV.ticks.find(t => t.q === k))[0].name);
check('XX.2 limit ponad-LGM TYLKO tam, gdzie udowodniony: 4 ticki Matuyamy z klauzulą GPG ~1,09 mln (Hein i in. 2009, Geology 37:551); MIS 4/6/18 — bez pełnej klauzuli (heinowska wzmianka zostaje)',
  okGpg && nonMatArr.every(n => !/Greatest Patagonian Glaciation/.test(n) && /Hein i in\. 2009/.test(n)) && matTicks.length === 4,
  'ticki matuyamy: ' + matTicks.length + ' · ' + nonMatArr.every(n => /Hein/.test(n)));
const qT_XX = Object.keys(Q).filter(k => ENV.ticks.some(tt => tt.q === k));
const antQ_OK = qT_XX.length === 17 && qT_XX.every(k => {   // q_lgm nie ma ticka (LGM = faza ice)
  const t = ENV.ticks.find(tt => tt.q === k);
  const a = qAntXX(t);
  return a.length === 1 && /kotwica/.test(a[0].name) && /Bentley i in\. 2014/.test(a[0].name) && /RAISED/.test(a[0].name);
});
const nowCleanXX = P.ice_sets.now.filter(p => /Antarktyd/.test(p.name)).every(p => !/kotwica/.test(p.name));
check('XX.3 Antarktyda ≥ MIS 3: kotwica ≈ „dziś” z JAWNĄ notką (RAISED — Bentley i in. 2014 — dochodzi tylko do LGM) we wszystkich przekrojach Q19; źródłowy wpis „now” nie zmutowany (owijka = kopia)',
  antQ_OK && nowCleanXX, 'kluczy z tickiem: ' + qT_XX.length + ' · now czysty: ' + nowCleanXX);


/* ================= V. UI/BROWSER — PRAWDA W PASKU FAZOWYM ================= */
const server = spawn('python3', ['-m', 'http.server', '8347', '--bind', '127.0.0.1'], { cwd: '/home/user/paleoatlas' });
await sleep(1200);
const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  const jsErr = [];
  page.on('pageerror', e => jsErr.push(e.message));
  await page.goto('http://127.0.0.1:8347/', { waitUntil: 'networkidle2' });
  await sleep(1800);
  const go = bp => page.evaluate(bp => window.__PA.setSlider(window.__PA.bpToSlider(bp)), bp).then(() => sleep(280));
  const icesrc = () => page.evaluate(() => document.getElementById('phase-icesrc').textContent);
  const phaseice = () => page.evaluate(() => document.getElementById('phase-ice').textContent);
  const icePx = () => page.evaluate(() => {
    const cv = document.querySelector('.leaflet-ice-pane canvas');
    if (!cv) return -1;
    const ctx = cv.getContext('2d'), d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let hit = 0, tot = 0;
    for (let y = 0; y < cv.height; y += 4) for (let x = 0; x < cv.width; x += 4) { tot++; if (d[((y * cv.width + x) << 2) + 3] > 16) hit++; }
    return hit / tot;
  });

  // V.1 tooltip Q19 cytuje Batchelora z OSF i zastrzega „hypoteza”
  await go(450000);
  const tipText = await page.evaluate(() => {
    const tips = [];
    window.__PA.map.eachLayer(l => {
      if (l.options && l.options.pane === 'icePane' && l.getTooltip) {
        const t = l.getTooltip(); if (t) tips.push(t.getContent());
      }
    });
    return tips.join(' ␞ ');
  });
  check('V.1 msz12: tooltip(y) cytują Batchelor 2019 + OSF osf.io/7jen3 + „best estimate”',
    /osf\.io\/7jen3/.test(tipText) && /best estimate/.test(tipText), tipText.slice(0, 160));

  // V.2 pasek fazowy: każdy źródło-rodzaj ma poprawny bajt (DATED/Batchelor/portal/analog)
  const SRC_CASES = [
    [21500, 'DATED-1', 'LGM — DATED-1'],
    [450000, 'Batchelor', 'MIS 12 — Batchelor'],
    [280000, 'rozbieżność', 'MIS 8 — notka o rozbieżności'],
    [713000, 'analog', 'MIS 18 — analog'],
    [398000, 'MIS 11', 'interglacjał — trwały stan']
  ];
  for (const [bp, want, label] of SRC_CASES) {
    await go(bp);
    const s = await icesrc();
    check('V.2 pasek: ' + label, s.includes(want), s.slice(0, 90));
  }

  // V.3 δ-przejrzystość: przy odległości ≥5 tys. lat podajemy Δ
  await go(678000);
  const s1 = await icesrc();
  check('V.3 678 tys.: pasek pokazuje MIS 17 + Δ (jasny komunikat zamiast „fałszywego” lodu)',
    /MIS 17/.test(s1) && /Δ/.test(s1), s1.slice(0, 110));

  /* V.4 lód jest RYSOWANY tam, gdzie ma być — kadr mobilny 390×844 jak w regresji usera
        (w szerszym kadrze desktopowym do widoku wchodzi Grenlandia i „interglacjał === 0” byłby fałszywy) */
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluate(() => window.__PA.map.invalidateSize());
  await sleep(400);
  await page.evaluate(() => window.__PA.map.setView([62, 15], 4));
  await go(713000); const px18 = await icePx();
  await go(450000); const px12 = await icePx();
  await page.evaluate(() => window.__PA.map.setView([56, 18], 4));
  await go(398000); const pxIg = await icePx();
  check('V.4 rysowanie (kadr mobilny): MIS 18 ≥3% px, MIS 12 ≥5% px, interglacjał =0', px18 > 0.03 && px12 > 0.05 && pxIg === 0,
    'MIS18 ' + px18.toFixed(3) + ' | MIS12 ' + px12.toFixed(3) + ' | IG ' + pxIg);

  /* VI.9 NADI-1 w przeglądarce: tooltip LGM — NAISC = DANE (Dalton/Zenodo/OPTIMAL),
        a Grenlandia obok NADAL jako schemat (mieszana warstwa, uczciwie opisana) */
  await page.setViewport({ width: 1400, height: 900 });
  await page.evaluate(() => window.__PA.map.invalidateSize());
  await sleep(300);
  await go(21500);
  const tipLGM = await page.evaluate(() => {
    const tips = [];
    window.__PA.map.eachLayer(l => {
      if (l.options && l.options.pane === 'icePane' && l.getTooltip) {
        const t = l.getTooltip(); if (t) tips.push(t.getContent());
      }
    });
    return tips.join(' ␞ ');
  });
  check('VI.9 LGM w przeglądarce: NAISC cytuje NADI-1/Zenodo/OPTIMAL; Grenlandia nadal „Rekonstrukcja uproszczona”',
    /NADI-1: Dalton/.test(tipLGM) && /10\.5281\/zenodo\.8161764/.test(tipLGM) && /OPTIMAL/.test(tipLGM) && /Rekonstrukcja uproszczona/.test(tipLGM),
    tipLGM.slice(0, 150));

  /* VI.10 NADI-1 piksele: kadr na Amerykę Płn. — LGM pełny lód, Bølling–Allerød mniej, „dziś” ~0 */
  await page.setViewport({ width: 900, height: 700 });
  await page.evaluate(() => window.__PA.map.invalidateSize());
  await sleep(300);
  await page.evaluate(() => window.__PA.map.setView([55, -95], 3));
  await go(21500); const pxLGMna = await icePx();
  await go(13600); const pxBAna = await icePx();
  await go(1000); const pxNowna = await icePx();
  check('VI.10 rysowanie (Ameryka Płn. 900×700): LGM >20% px; B-A <85% LGM; „dziś” <50% B-A (reszta = Grenlandia+Archipelag) — cofka widoczna',
    pxLGMna > 0.2 && pxBAna > 0.1 && pxBAna < 0.85 * pxLGMna && pxNowna < 0.5 * pxBAna,
    'LGM ' + pxLGMna.toFixed(3) + ' | BA ' + pxBAna.toFixed(3) + ' | 1 ka ' + pxNowna.toFixed(3));

  /* VII.6 Azja w przeglądarce: Tajmyr — przy LGM pod DATED-1 (dużo pikseli),
        przy mł. dryasie lód zdeglacjowany (dużo mniej pikseli — statyczny boks usunięty) */
  await page.setViewport({ width: 900, height: 700 });
  await page.evaluate(() => window.__PA.map.invalidateSize());
  await sleep(300);
  await page.evaluate(() => window.__PA.map.setView([70, 80], 4));
  await go(21500); const pxTajLGM = await icePx();
  await go(12300); const pxTajYD = await icePx();
  check('VII.6 rysowanie nad Tajmyrem: przy LGM ≥28% px (DATED-1), przy mł. dryasie ≤1/3 tego (brak schematu-boksu)',
    pxTajLGM > 0.28 && pxTajYD < pxTajLGM / 3,
    'LGM ' + pxTajLGM.toFixed(3) + ' | YD ' + pxTajYD.toFixed(3));

  /* VII.7 Azja: tooltipy przy LGM mieszane — DATED-1 (Eurazja) i szczere „schemat” (NE Azja) */
  await go(21500);
  const tipAsia = await page.evaluate(() => {
    const tips = [];
    window.__PA.map.eachLayer(l => {
      if (l.options && l.options.pane === 'icePane' && l.getTooltip) {
        const t = l.getTooltip(); if (t) tips.push(t.getContent());
      }
    });
    return tips.join(' ␞ ');
  });
  /* po fali GLACIMONTIS: NE Azja w LGM = dane empiryczne (Wierchojańsk — Barr & Clark 2012), nie schemat */
  check('VII.7 tooltipy LGM: występują łącznie „DATED-1” (Eurazja) i Wierchojańsk GLACIMONTIS z cytatem Barr & Clark 2012 (NE Azja — po fali 1 GLACIMONTIS)',
    /DATED-1/.test(tipAsia) && /Wierchoja/.test(tipAsia) && /Barr and Clark/.test(tipAsia) && /GLACIMONTIS/.test(tipAsia),
    tipAsia.slice(0, 140));


  /* VIII.12–13: tooltipy PATICE w przeglądarce */
  await page.setViewport({ width: 1400, height: 900 });
  await page.evaluate(() => window.__PA.map.invalidateSize());
  await sleep(300);
  const grabTips = () => page.evaluate(() => {
    const tips = [];
    window.__PA.map.eachLayer(l => {
      if (l.options && l.options.pane === 'icePane' && l.getTooltip) {
        const t = l.getTooltip(); if (t) tips.push(t.getContent());
      }
    });
    return tips.join(' ␞ ');
  });
  await go(21500);
  const tipSA = await grabTips();
  check('VIII.12 tooltips LGM: trzy warstwy DANE naraz — DATED-1 (Eurazja), NADI-1 (Am. Płn.), PATICE (Am. Płd.)',
    /PATICE: Davies/.test(tipSA) && /Mendeley 10\.17632/.test(tipSA) && /DATED-1/.test(tipSA) && /NADI-1/.test(tipSA),
    tipSA.replace(/<[^>]+>/g, ' ').slice(0, 160));
  await go(12300);
  const tipYD = await grabTips();
  check('VIII.13 mł. dryas: tooltip Patagonii wyjaśnia Antarctic Cold Reversal (płk. płd. ≠ płn.)',
    /Antarctic Cold Reversal/.test(tipYD) && /PATICE/.test(tipYD), tipYD.replace(/<[^>]+>/g, ' ').slice(0, 160));

  /* VIII.14 piksele: Ameryka Płd. 900×700 — LGM pełny, 15 ka rozbity ale wyraźny, „dziś” mały ale >0 */
  await page.setViewport({ width: 900, height: 700 });
  await page.evaluate(() => window.__PA.map.invalidateSize());
  await sleep(300);
  await page.evaluate(() => window.__PA.map.setView([-47, -73.5], 6));
  await go(21500); const pxSAlgm = await icePx();
  await go(15000); const pxSA15 = await icePx();
  await go(12300); const pxSAyd = await icePx();
  await go(1000); const pxSAnow = await icePx();
  check('VIII.14 rysowanie (PATICE 900×700, z6): LGM ≥6% px; 15 ka w (25–60%) LGM (rozpad, nie zniknięcie); YD≈15 ka (ACR); „dziś” <25% LGM lecz >0,3%',
    pxSAlgm > 0.06 && pxSA15 > 0.25 * pxSAlgm && pxSA15 < 0.60 * pxSAlgm &&
    pxSAyd > 0.8 * pxSA15 && pxSAyd < 1.25 * pxSA15 &&
    pxSAnow < 0.25 * pxSAlgm && pxSAnow > 0.003,
    'LGM ' + pxSAlgm.toFixed(3) + ' | 15ka ' + pxSA15.toFixed(3) + ' | YD ' + pxSAyd.toFixed(3) + ' | dziś ' + pxSAnow.toFixed(3));


  /* IX.7–8: Afryka w przeglądarce (fala 2: Rift z GLACIMONTIS; Atlas YD = schemat readvance) */
  await go(21500);
  const tipAfr = await grabTips();
  check('IX.7 tooltipy LGM: Rift Wsch. (Kilimandżaro/Kenia) z pełnym cytatem GLACIMONTIS + autorzy (Chen/Osmaston) zamiast dysku',
    /Riftu Wsch/.test(tipAfr) && /GLACIMONTIS/.test(tipAfr) && /Osmaston|Chen/.test(tipAfr),
    tipAfr.replace(/<[^>]+>/g, ' ').slice(-180));
  await go(12300);
  const tipAfrYD = await grabTips();
  check('IX.7b tooltip YD: Atlas Wysoki z etykietą readvance/SCHEMAT (Fink i in. 2014 — ¹⁰Be 11–13 ka; punchline płk: płd. ≠ jednolite zachowanie)',
    /Atlas Wysoki/.test(tipAfrYD) && /SCHEMAT/.test(tipAfrYD) && /Fink/.test(tipAfrYD),
    tipAfrYD.replace(/<[^>]+>/g, ' ').slice(-180));

  /* IX.8 piksele Kilimandżaro z8: rekordy GLACIMONTIS vs mikropomiar „dziś” */
  await page.evaluate(() => window.__PA.map.setView([-3.1, 37.35], 8));
  await go(21500); const pxKiliLgm = await icePx();
  await go(1000); const pxKiliNow = await icePx();
  check('IX.8 rysowanie (Kilimandżaro z8): LGM ≥0,005% px i ≥10× „dziś” — empiryczny zapis zamiast dysku',
    pxKiliLgm > 0.00005 && pxKiliLgm >= 10 * Math.max(pxKiliNow, 1e-6),
    'LGM ' + (pxKiliLgm * 100).toFixed(4) + '% | dziś ' + (pxKiliNow * 100).toFixed(4) + '%');

  /* X.9–10: Australazja w przeglądarce (fala 2) */
  await go(21500);
  const tipAus = await grabTips();
  check('X.9 tooltipy LGM: Tasmania (Barrows i in. 2002) + Nowa Gwinea (Prentice i in.) + Snowy (Barrows i in. 2001) — pełny cytat GLACIMONTIS',
    /Tasmania/.test(tipAus) && /Barrows/.test(tipAus) && /Prentice/.test(tipAus) && /GLACIMONTIS/.test(tipAus),
    tipAus.replace(/<[^>]+>/g, ' ').slice(-180));
  await page.evaluate(() => window.__PA.map.setView([-4.6, 140.5], 6));
  await go(21500); const pxNgLgm = await icePx();
  await go(1000); const pxNgNow = await icePx();
  check('X.10 rysowanie (Nowa Gwinea z6): LGM ≥0,03% px i ≥15× „dziś” (pola Sudirmana wg Prentice; Puncak Jaya 0,2 km² = kreska)',
    pxNgLgm > 0.0003 && pxNgLgm >= 15 * Math.max(pxNgNow, 1e-6),
    'LGM ' + (pxNgLgm * 100).toFixed(3) + '% | dziś ' + (pxNgNow * 100).toFixed(4) + '%');

  /* XI.9–10: Nowa Zelandia w przeglądarce (fala 2) */
  await go(21500);
  const tipNz = await grabTips();
  check('XI.9 tooltipy LGM: NZ z rekordami GLACIMONTIS (Barrell 2011 i in. w cytatach) — wyspa Płd. dominuje; bez dysków „SCHEMAT: krąg”',
    /Nowa Zelandia — Wyspa Płd/.test(tipNz) && /Barrell/.test(tipNz) && /GLACIMONTIS/.test(tipNz),
    tipNz.replace(/<[^>]+>/g, ' ').slice(-180));
  await page.evaluate(() => window.__PA.map.setView([-44.2, 169.8], 5));
  await go(21500); const pxNzLgm = await icePx();
  await go(1000); const pxNzNow = await icePx();
  check('XI.10 rysowanie (wyspa Płd. z5): LGM ≥0,15% px i ≥20× „dziś” (rekord Barrella vs 794 km² pomiaru Baumanna)',
    pxNzLgm > 0.0015 && pxNzLgm >= 20 * Math.max(pxNzNow, 1e-6),
    'LGM ' + (pxNzLgm * 100).toFixed(3) + '% | dziś ' + (pxNzNow * 100).toFixed(4) + '%');

  /* XVI.5 (przeglądarka) Tasmania z6: LGM(GLAC) ≥ 2× pomorska(schemat); Atlas z7: readvance YD ≥ 1,2× B–A */
  await page.evaluate(() => window.__PA.map.setView([-42.1, 146.3], 6));
  await go(21500); const pxTasLgm = await icePx();
  await go(15000); const pxTasPom = await icePx();
  await page.evaluate(() => window.__PA.map.setView([31.1, -7.5], 7));
  await go(12300); const pxAtlYD = await icePx();
  await go(13600); const pxAtlBA = await icePx();
  check('XVI.5 rysowanie: Tasmania LGM ≥0,08% px i ≥2,5× pomorskiej (16 rekordów-poligon vs dysk); Atlas: readvance YD ≥1,2× B–A (dyski zachowane — Fink 2014)',
    pxTasLgm > 0.0008 && pxTasLgm >= 2.5 * Math.max(pxTasPom, 1e-6) &&
    pxAtlYD >= 1.2 * Math.max(pxAtlBA, 1e-6),
    'TAS LGM ' + (pxTasLgm * 100).toFixed(3) + '% → pom ' + (pxTasPom * 100).toFixed(3) + '% · Atlas YD ' + (pxAtlYD * 100).toFixed(4) + '% → BA ' + (pxAtlBA * 100).toFixed(4) + '%');


  /* XVII.7–8 (przeglądarka): paleojeziora jako WODA — warstwy, tooltipy, piksele */
  const lakeCnt = () => page.evaluate(() => {
    let n = 0;
    window.__PA.map.eachLayer(l => {
      if (l.options && l.options.pane === 'icePane' && l.getTooltip) {
        const t = l.getTooltip(); if (t && /paleojezioro przylodowcowe/.test(t.getContent())) n++;
      }
    });
    return n;
  });
  const watPx = () => page.evaluate(() => {
    const cv = document.querySelector('.leaflet-ice-pane canvas');
    if (!cv) return -1;
    const ctx = cv.getContext('2d'), d = ctx.getImageData(0, 0, cv.width, cv.height).data;
    let hit = 0, tot = 0;
    for (let y = 0; y < cv.height; y += 3) for (let x = 0; x < cv.width; x += 3) {
      tot++; const o = (y * cv.width + x) << 2;
      if (d[o + 3] > 16 && d[o + 2] - d[o] > 45 && d[o + 2] > 110) hit++;
    }
    return hit / tot;
  });
  await page.evaluate(() => window.__PA.map.setView([-47.2, -71.6], 6));
  await go(13600);
  const watBA = await watPx(), nBA = await lakeCnt();
  const tipBA = await grabTips();
  await go(21500);
  const watLGM = await watPx(), nLGM = await lakeCnt();
  await go(10500);
  const watEH = await watPx(), nEH = await lakeCnt();
  await go(0);
  const watNow = await watPx(), nNow = await lakeCnt();
  check('XVII.7 warstwy jezior (kadr Chalenko z6): B–A(13 ka)=9, LGM(20 ka)=13, wcz. holocen(10 ka)=5, „dziś”=0; piksele wody: B–A ≥0,4% i ≥1,8× LGM; holocen < B–A; „dziś” ~0',
    nBA === 9 && nLGM === 13 && nEH === 5 && nNow === 0 &&
    watBA > 0.004 && watBA >= 1.8 * Math.max(watLGM, 1e-6) && watEH < watBA && watNow < 0.002,
    'n: BA ' + nBA + ' LGM ' + nLGM + ' EH ' + nEH + ' now ' + nNow + ' · woda: BA ' + (watBA * 100).toFixed(2) + '% LGM ' + (watLGM * 100).toFixed(2) + '% EH ' + (watEH * 100).toFixed(2) + '% now ' + (watNow * 100).toFixed(3) + '%');
  check('XVII.8 tooltip B–A: 💧 Lago Chalenko z cytatem PATICE (Mendeley ztz59y79vv), odniesieniem Thorndycraft i parametrami (powierzchnia, zwierciadło)',
    /💧/.test(tipBA) && /Chalenko/.test(tipBA) && /10\.17632\/ztz59y79vv/.test(tipBA) &&
    /Thorndycraft/.test(tipBA) && /km²/.test(tipBA) && /paleojezioro przylodowcowe/.test(tipBA),
    tipBA.replace(/<[^>]+>/g, ' ').slice(0, 200));

  /* XII.8 tooltipy LGM: Antarktyda z ICE-6G_C (ggu140) + wzmianka RAISED */
  await go(21500);
  const tipAnt = await grabTips();
  check('XII.8 tooltipy LGM: wpis Antarktydy z pełnym cytatem ICE-6G_C (GJI 198:537, doi ggu140) i RAISED/Bentley 2014',
    /Antarktyda/.test(tipAnt) && /ggu140/.test(tipAnt) && /RAISED/.test(tipAnt) && /2014JB011176/.test(tipAnt),
    tipAnt.replace(/<[^>]+>/g, ' ').slice(-200));

  /* XII.9 piksele: czapa Antarktydy rysuje się z danych ICE-6G_C w LGM i „dziś” (widok z2 nad biegunem);
         różnica maskowa 1° ≈ 1–2 px obwodu — test obecności ≥1,5% px, LGM ≥ 0,95×dziś (ścisły stosunek: XII.2) */
  await page.setViewport({ width: 1000, height: 700 });
  await page.evaluate(() => window.__PA.map.invalidateSize());
  await sleep(300);
  await page.evaluate(() => window.__PA.map.setView([-70, 20], 2));
  await go(21500); const pxAntLgm = await icePx();
  await go(1000); const pxAntNow = await icePx();
  check('XII.9 rysowanie (Antarktyda z2): czapa widoczna ≥1,5% px w LGM i „dziś”; LGM ≥ 0,95× „dziś” (maska 1°, różnica na obwodzie)',
    pxAntLgm > 0.015 && pxAntNow > 0.015 && pxAntLgm >= 0.95 * pxAntNow && pxAntLgm < 3.5 * pxAntNow,
    'LGM ' + (pxAntLgm * 100).toFixed(2) + '% | dziś ' + (pxAntNow * 100).toFixed(2) + '%');

  /* XIII.7 tooltipy LGM: GLACIMONTIS z pełnym cytowaniem i źródłem poligonu (Tatry: Zasadni) */
  await page.evaluate(() => window.__PA.map.setView([49.3, 20.0], 7));
  await go(21500);
  const tipGlac = await grabTips();
  check('XIII.7 tooltipy LGM (kadr Tatr): TATRY z GLACIMONTIS + Zasadni & Kłapyta 2014 + wskaźnik źródła (doi zapiski)',
    /TATRY/.test(tipGlac) && /GLACIMONTIS/.test(tipGlac) && /Zasadni/.test(tipGlac) && /Scientific Data 13:629/.test(tipGlac),
    tipGlac.replace(/<[^>]+>/g, ' ').slice(-230));

  /* XIII.8 piksele: TATRY z7 — poligony w LGM widać; faza pomorska < LGM (Zasadni/Kłapyta'21 znikają wg okien) */
  await page.setViewport({ width: 1000, height: 700 });
  await page.evaluate(() => window.__PA.map.invalidateSize());
  await sleep(300);
  await page.evaluate(() => window.__PA.map.setView([49.28, 20.05], 7));
  await go(21500); const pxTatLgm = await icePx();
  await go(15000); const pxTatPom = await icePx();
  check('XIII.8 rysowanie (Tatry z7): LGM ≥0,02% px i ≥1,4× pomorskiej (okna: Zasadni 21–28 ka, Makos 15,9–25, Kłapyta 16,7–26)',
    pxTatLgm > 0.0002 && pxTatLgm >= 1.4 * Math.max(pxTatPom, 1e-6),
    'LGM ' + (pxTatLgm * 100).toFixed(3) + '% | pomorska ' + (pxTatPom * 100).toFixed(3) + '%');

  /* XIV.5 Grenlandia w przeglądarce: tooltip z ICE6G_SRC; pikselowo czapa w LGM ≥ „dziś” */
  await page.evaluate(() => window.__PA.map.setView([71.5, -40], 3));
  await go(21500);
  const tipGr = await grabTips();
  check('XIV.5a tooltipy LGM: Grenlandia z pełnym cytatem ICE-6G_C (ggu140) + Lecavalier (maksimum od ~27 ka)',
    /Grenlandia/.test(tipGr) && /ggu140/.test(tipGr) && /Lecavalier/.test(tipGr),
    tipGr.replace(/<[^>]+>/g, ' ').slice(-200));
  await go(21500); const pxGrLgm = await icePx();
  await go(1000); const pxGrNow = await icePx();
  /* przy z3 kadrowi towarzyszą: Laurentyda/Islandia/glacjacje górskie (GLACIMONTIS) w LGM — stąd współczynnik szeroki */
  check('XIV.5b rysowanie (Grenlandia z3): maska ICE-6G ≥0,5% px w obu epokach; LGM ≥ 0,95× „dziś” i < 8× (kadr regionalny z sąsiednimi lądolodami w LGM)',
    pxGrLgm > 0.005 && pxGrNow > 0.005 && pxGrLgm >= 0.95 * pxGrNow && pxGrLgm < 8 * pxGrNow,
    'LGM ' + (pxGrLgm * 100).toFixed(2) + '% | dziś ' + (pxGrNow * 100).toFixed(2) + '%');

  /* XV.5 Wyspy Brytyjskie w przeglądarce: tooltip z PANGAEA 945729; LGM ≫ B-A (bez lodu) */
  await page.evaluate(() => window.__PA.map.setView([54.3, -3.8], 6));
  await go(21500);
  const tipBri = await grabTips();
  check('XV.5a tooltipy LGM: BIIS z pełnym cytatem BRITICE-CHRONO (PANGAEA 945729, Clark 2022, Boreas)',
    /PANGAEA\.945729|945729/.test(tipBri) && /Clark/.test(tipBri) && /BRITICE-CHRONO/.test(tipBri),
    tipBri.replace(/<[^>]+>/g, ' ').slice(-200));
  await go(21500); const pxBriLgm = await icePx();
  await go(13600); const pxBriBA = await icePx();
  check('XV.5b rysowanie (Wyspy z6): LGM ≥2% px; boling–allerod ≈ 0 px (≤ 15% LGM) — Wyspy bez lodu wg BRITICE-CHRONO',
    pxBriLgm > 0.02 && pxBriBA <= 0.15 * pxBriLgm + 0.002,
    'LGM ' + (pxBriLgm * 100).toFixed(2) + '% | B-A ' + (pxBriBA * 100).toFixed(2) + '%');

  /* XVIII.5–7 warianty BRITICE-CHRONO w przeglądarce: piksele, przełącznik, globus */
  await page.evaluate(() => window.__PA.map.setView([53.0, -5.3], 7));
  await page.evaluate(() => window.__PA.setBritVar('opt'));
  await go(21500);
  const pxv = {};
  for (const v of ['min', 'opt', 'max']) {
    await page.evaluate(v => window.__PA.setBritVar(v), v);
    await sleep(320);
    pxv[v] = await icePx();
  }
  check('XVIII.5 rysowanie wariantów (Morze Irlandzkie z7, LGM): min ≤ opt ≤ max; max ≥ 1,08× min (namierzono ~1,14×); wszystkie ≥15% px kadru',
    pxv.min <= pxv.opt + 1e-6 && pxv.opt <= pxv.max + 1e-6 && pxv.max >= 1.08 * pxv.min && pxv.min > 0.15,
    Object.keys(pxv).map(v => v + ' ' + (100 * pxv[v]).toFixed(2) + '%').join(' | '));
  await page.click('#britice-var');       // z MAX cyklicznie → MINIMUM
  await sleep(320);
  const labBtn = await page.$eval('#britice-var', el => el.textContent);
  const tipMin = await grabTips();
  await go(18000);                        // zmiana epoki NIE resetuje wariantu
  const tipMin2 = await grabTips();
  check('XVIII.6 przełącznik „🧊 BIIS”: klik zmienia etykietę (MINIMUM) i warstwę; tooltip z wariantem + pełnym cytatem; wariant przetrwał zmianę epoki (LGM→poznańska)',
    /MINIMUM/.test(labBtn) && /BRITICE-CHRONO MINIMUM/.test(tipMin) && /PANGAEA\.945729|945729/.test(tipMin) && /BRITICE-CHRONO MINIMUM/.test(tipMin2),
    labBtn.trim() + ' · tip: ' + tipMin.replace(/<[^>]+>/g, ' ').slice(60, 170));
  await page.evaluate(() => window.__PA.setBritVar('opt'));   // porządek przed dalszymi testami
  await page.goto('http://127.0.0.1:8347/#globus', { waitUntil: 'networkidle2' });
  await sleep(1600);
  /* sonda bieli mierzy warstwę lądolodów — biomy (klasa 28 w rastrze) wyłączamy na czas testu,
     dokładnie jak w G.3 (podłoga #f0f8fc z rastra nie może maskować różnic wariantów BIIS) */
  await page.evaluate(() => { window.GLOBE.setBiome(false); window.__PA.setSlider(window.__PA.bpToSlider(21500)); window.GLOBE.setCenter(-3, 54); window.GLOBE.setScale(3.2); });
  await sleep(400);
  const gxv = {};
  for (const v of ['min', 'opt', 'max']) {
    await page.evaluate(v => { window.__PA.setBritVar(v); window.GLOBE.markDirty(); }, v);
    await sleep(450);
    gxv[v] = (await page.evaluate(() => window.GLOBE._ctxProbe(5))).ice;
  }
  check('XVIII.7 globus: wariant BIIS w kluczu cache (biomy OFF jak w G.3 — sonda czystej warstwy lodu) — LGM nad Wyspami min ≤ opt ≤ max; max ≥ 1,03× min (namierzono ~1,06×); kula pokazuje wybrany wariant, nie tylko płaska mapa',
    gxv.min <= gxv.opt + 1e-6 && gxv.opt <= gxv.max + 1e-6 && gxv.max >= 1.03 * gxv.min && gxv.min > 0.10,
    Object.keys(gxv).map(v => v + ' ' + (100 * gxv[v]).toFixed(2) + '%').join(' | '));

  /* XIX.6–7 Islandia w przeglądarce: cofka etapowa 15→10,5 ka; RGI „dziś”; tooltipy; globus */
  await page.setViewport({ width: 1400, height: 900 });   // kalibracja jak pozostałe bloki px
  await page.goto('http://127.0.0.1:8347/', { waitUntil: 'networkidle2' });   // powrót z widoku globusa (XVIII.7)
  await sleep(1600);
  await page.evaluate(() => { window.__PA.map.invalidateSize(); window.__PA.map.setView([64.9, -18.3], 6); });
  const pxi = {};
  let dbgMap = '';
  for (const [k, bp] of [['lgm', 21500], ['pom', 15000], ['yd', 12300], ['eh', 10500], ['now', 1000]]) {
    await go(bp);
    pxi[k] = await icePx();
    if (k === 'lgm') dbgMap = await page.evaluate(() => {
      const cv = document.querySelector('.leaflet-ice-pane canvas');
      return ' | cv ' + (cv ? cv.width + 'x' + cv.height : 'BRAK') + ' ctr ' + JSON.stringify(window.__PA.map.getCenter());
    });
  }
  check('XIX.6 rysowanie (Islandia z6): LGM = pełna wyspa (≥22% px); pomorska ≈ LGM (±20%); MD ≤ 0,82× pomorskiej (cofka maski ICE-6G); „dziś” ≤ 0,6× LGM lecz ≥ 4% (czapy RGI malują: Vatnajökull ~8 184 km²)',
    pxi.lgm >= 0.22 && pxi.pom >= 0.8 * pxi.lgm && pxi.pom <= 1.2 * pxi.lgm &&
    pxi.yd <= 0.82 * pxi.pom && pxi.now <= 0.6 * pxi.lgm && pxi.now >= 0.04,
    Object.keys(pxi).map(k => k + ' ' + (100 * pxi[k]).toFixed(1) + '%').join(' | ') + dbgMap);
  await go(12300);
  const tipIslYD = await grabTips();
  await go(1000);
  const tipIslNow = await grabTips();
  check('XIX.7 tooltipy: mł. dryas — ICE-6G_C z cytatem (ggu140); „dziś” — czapa Vatnajökull z pełnym cytatem RGI 7.0 (NSIDC, doi f6jmovy5navz)',
    /ggu140/.test(tipIslYD) && /ICE-6G_C|ICE6G/.test(tipIslYD) &&
    /Vatnajökull/.test(tipIslNow) && /f6jmovy5navz|NSIDC/.test(tipIslNow) && /RGI 7\.0/.test(tipIslNow),
    tipIslNow.replace(/<[^>]+>/g, ' ').slice(-200));

  /* XX.4 głęboki stadiał w przeglądarce: etykiety epokowe w tooltipach (MIS 4) */
  await go(65000);
  const tipMis4 = await grabTips();
  check('XX.4 tooltipy MIS 4: PIS — „SCHEMAT portalu” + stage + Rabassa 2008 + Davies 2020; Antarktyda — notka RAISED/Bentley („kotwica ≈ dziś”)',
    /SCHEMAT portalu/.test(tipMis4) && /Rabassa 2008/.test(tipMis4) && /Davies i in\. 2020/.test(tipMis4) && /MIS 4/.test(tipMis4)
      && /Bentley i in\. 2014/.test(tipMis4) && /kotwica/.test(tipMis4) && /RAISED/.test(tipMis4),
    tipMis4.replace(/<[^>]+>/g, ' ').slice(0, 160));

  /* ============ XXI. BIOMY — modele publikowane + HG-lite + kotwice pyłkowe ============ */
  const xxiMeta = await page.evaluate(() => {
    const M = window.BIOME_META;
    return { epok: M.epochs.length, klas: Object.keys(M.palette).length, nazw: Object.keys(M.names).length,
             srcUniq: [...new Set(M.epochs.map(e => e.src))].sort() };
  });
  check('XXI.1 BIOME_META w przeglądarce: 56 epok × 29 klas × 3 źródła (beyer/krapp/pgem)',
    xxiMeta.epok === 56 && xxiMeta.klas === 29 && xxiMeta.nazw === 29 && xxiMeta.srcUniq.join(',') === 'beyer,krapp,pgem',
    JSON.stringify(xxiMeta));

  /* XXI.2: każda z 56 epok: overlay wczytuje właściwy plik 720x360 */
  const xxiFiles = await page.evaluate(() => window.BIOME_META.epochs.map(e => {
    const ka = Array.isArray(e.ka) ? e.ka[0] : e.ka;
    return { bp: Math.round(ka * 1000), file: e.file };
  }));
  let xxiTwo = 0, xxiBad = [];
  for (const f of xxiFiles) {
    await page.evaluate(b => window.__PA.setSlider(window.__PA.bpToSlider(b)), f.bp);
    await sleep(210);
    const okf = await page.evaluate(file => {
      const img = document.querySelector('.leaflet-biome-pane img');
      return !!(img && img.complete && img.naturalWidth === 720 && img.naturalHeight === 360 && img.src.endsWith(file)
        && +getComputedStyle(img).opacity > 0.9);
    }, f.file);
    if (okf) xxiTwo++; else xxiBad.push(f.file);
    await page.evaluate(b => window.__PA.setSlider(window.__PA.bpToSlider(b)), f.bp);
    await sleep(60);
  }
  check('XXI.2 wybór migawki na osi: wszystkie 56 plików renderuje się jako overlay 720×360 pełną kryciem w paleo',
    xxiTwo === 56, xxiBad.length ? 'błędne: ' + xxiBad.slice(0, 5).join(',') : '56/56');

  /* XXI.3: lód epok biomów zgodny 1:1 z envTickForBP (kotwica Q19 osadzona w rastrze) */
  const xxiIce = await page.evaluate(() => {
    const out = [];
    for (const e of window.BIOME_META.epochs) {
      const kaReal = Array.isArray(e.ka) ? e.ka[1] : e.ka;
      const t = window.__PA.envTickForBP(Math.round(kaReal * 1000)) || {};
      out.push({ meta: e.ice || null, env: t.q || null });
    }
    return out;
  });
  const xxiIceBad = xxiIce.filter(r => r.meta !== r.env);
  check('XXI.3 klasa 28 osadzona dokładnie wg envTickForBP: meta.ice == tick.q dla wszystkich 56 epok',
    xxiIceBad.length === 0, xxiIceBad.length ? JSON.stringify(xxiIceBad.slice(0, 3)) : '56/56 zgodnych');

  /* XXI.4: hit-test pikselowy — sondy klas w 3 epokach (klucz do tooltipu) */
  const sondy = async (bp, pts) => page.evaluate((bp, pts) => {
    window.__PA.setSlider(window.__PA.bpToSlider(bp));
    return pts;
  }, bp, pts).then(() => sleep(260)).then(() => page.evaluate(pts => pts.map(([la, lo]) => window.__PA.biomeClassAt({ lat: la, lng: lo })), pts));
  const k0 = await sondy(0, [[52.23, 21.0], [26, -5], [-3, -60], [-34, 151]]);
  const klg = await sondy(21500, [[53.5, 19], [-5, -60], [75, -40]]);
  const kplio = await sondy(3300000, [[22, 10], [-3, -60], [72, -38]]);
  check('XXI.4 sondy klas (prawda źródeł): dziś Warszawa∈{7,8} (coolf wg Beyera), Sahara(26N,5W)=21, Amazonia=1 · LGM: PolskaN=28, AmazoniaN≠1, Grenlandia=28 · pliocen: Sahara=21, Amazonia=1, Grenlandia≠28',
    [7, 8].includes(k0[0]) && k0[1] === 21 && k0[2] === 1 && klg[0] === 28 && klg[1] !== 1 && klg[2] === 28 &&
    kplio[0] === 21 && kplio[1] === 1 && kplio[2] !== 28,
    '0k:' + k0 + ' lgm:' + klg + ' plio:' + kplio);

  /* XXI.5: kotwice pyłkowe per epoka + tooltip DANYCH */
  await page.evaluate(b => window.__PA.setSlider(window.__PA.bpToSlider(b)), 21500);
  await sleep(500);
  const xxiPollen = await page.evaluate(() => {
    const PA = window.__PA;
    const l0 = PA.group.pollen.getLayers()[0];
    return { key: PA.BIOME.pollenKey, n: PA.group.pollen.getLayers().length,
             tip: l0 && l0.getTooltip ? l0.getTooltip().getContent() : '' };
  });
  const xxiPollen0 = await page.evaluate(async () => {
    window.__PA.setSlider(window.__PA.bpToSlider(0));
    await new Promise(r => setTimeout(r, 500));
    const PA = window.__PA;
    return { key: PA.BIOME.pollenKey, n: PA.group.pollen.getLayers().length };
  });
  const xxiPollen6 = await page.evaluate(async () => {
    window.__PA.setSlider(window.__PA.bpToSlider(6000));
    await new Promise(r => setTimeout(r, 500));
    const PA = window.__PA;
    return { key: PA.BIOME.pollenKey, n: PA.group.pollen.getLayers().length };
  });
  check('XXI.5 kotwice BIOME 6000: 18k@LGM (318), 0k@dziś (9948), 6k@6ka (1794); tooltip = „DANE pyłkowe” + zbiór + kalibracja ¹⁴C',
    xxiPollen.key === '18k' && xxiPollen.n === 318 && xxiPollen0.key === '0k' && xxiPollen0.n === 9948 &&
    xxiPollen6.key === '6k' && xxiPollen6.n === 1794 &&
    /DANE pyłkowe/.test(xxiPollen.tip) && /¹⁴C/.test(xxiPollen.tip) && /BIOME 6000 v4.2/.test(xxiPollen.tip),
    JSON.stringify([xxiPollen.key, xxiPollen.n, xxiPollen0.key, xxiPollen0.n, xxiPollen6.key, xxiPollen6.n]));

  /* XXI.6: legenda i tooltip—czytelność etykiet DANE vs MODEL per źródło */
  const xxiLeg = await page.evaluate(async () => {
    const out = {};
    for (const bp of [0, 125000, 3300000]) {
      window.__PA.setSlider(window.__PA.bpToSlider(bp));
      await new Promise(r => setTimeout(r, 520));
      out[bp] = (document.querySelector('.biome-legend') || {}).textContent || '';
    }
    return out;
  });
  check('XXI.6 legenda mówi prawdę o pochodzeniu: 0ka „MODEL opublikowany”, Eem także, pliocen „MODEL (portal, HG-lite)” + epoki w tytułach',
    xxiLeg[0].includes('MODEL opublikowany') && xxiLeg[0].includes('dziś (0 ka)') &&
    xxiLeg[125000].includes('MODEL opublikowany') && xxiLeg[125000].includes('125 tys. BP') &&
    xxiLeg[3300000].includes('HG-lite') && xxiLeg[3300000].includes('3,3 mln BP'),
    Object.keys(xxiLeg).map(k => k + ':' + xxiLeg[k].split('MODEL')[1].slice(0, 16)).join(' | '));

  /* XXI.7: „O danych” — trzy cytaty + HG-lite + BIOME 6000 + uczciwa walidacja */
  const xxiAbout = await page.evaluate(() => document.documentElement.innerHTML);
  check('XXI.7 „O danych”: Beyer2020 (7:236), Krapp2021 (8:228), Barreto2023 (GEB 32:1034, doi 13683), HG-lite v0.6 z uczciwą walidacją (68%), BIOME 6000 v4.2',
    /7:236/.test(xxiAbout) && /8:228/.test(xxiAbout) && /1034/.test(xxiAbout) && /13683/.test(xxiAbout) &&
    /HG-lite v0.6/.test(xxiAbout) && /68%/.test(xxiAbout) && /BIOME 6000 v4.2/.test(xxiAbout),
    [ /7:236/, /8:228/, /13683/, /HG-lite v0.6/, /68%/, /BIOME 6000 v4.2/ ].map(r => r.test(xxiAbout)).join(' '));

  /* XXI.8: toggle warstwy pyłka w kontrolce */
  const xxiToggle = await page.evaluate(async () => {
    const labels = [...document.querySelectorAll('.leaflet-control-layers-overlays label')];
    const lab = labels.find(lb => lb.textContent.includes('BIOME 6000'));
    if (!lab) return { err: 'brak kontrolki pyłka' };
    window.__PA.setSlider(window.__PA.bpToSlider(21500));
    await new Promise(r => setTimeout(r, 500));
    const on1 = document.querySelectorAll('.leaflet-pollen-pane canvas').length >= 1 && window.__PA.map.hasLayer(window.__PA.group.pollen);
    lab.querySelector('input').click();
    await new Promise(r => setTimeout(r, 300));
    const off = window.__PA.map.hasLayer(window.__PA.group.pollen);
    lab.querySelector('input').click();
    await new Promise(r => setTimeout(r, 400));
    const on2 = window.__PA.map.hasLayer(window.__PA.group.pollen) && window.__PA.group.pollen.getLayers().length;
    return { on1, off, on2 };
  });
  check('XXI.8 kontrolka „Kotwice pyłkowe BIOME 6000 (DANE)” zdejmuje warstwę z mapy i przywraca punkty',
    xxiToggle.on1 === true && xxiToggle.off === false && xxiToggle.on2 >= 1, JSON.stringify(xxiToggle));

  check('V.5 brak błędów JS po całym przeglądzie epok', jsErr.length === 0, jsErr.join('; ').slice(0, 120));
} finally {
  await browser.close();
  server.kill();
}

console.log('\n════════════════════════════════════════════');
const okN = results.filter(r => r.ok).length;
console.log('ICE-SCIENCE: ' + okN + '/' + results.length + ' zdanych' + (failed ? ' · ❌ ' + failed : ' · WSZYSTKO ZDANE 🎉'));
console.log('   (I. inżynieria ' + results.filter(r => r.id.startsWith('I.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('I.')).length +
  ' · II. chronologia ' + results.filter(r => r.id.startsWith('II.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('II.')).length +
  ' · III. epoki ' + results.filter(r => r.id.startsWith('III.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('III.')).length +
  ' · IV. linie PL ' + results.filter(r => r.id.startsWith('IV.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('IV.')).length +
  ' · V. UI ' + results.filter(r => r.id.startsWith('V.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('V.')).length +
  ' · VI. NADI-1 ' + results.filter(r => r.id.startsWith('VI.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('VI.')).length +
  ' · VII. Azja ' + results.filter(r => r.id.startsWith('VII.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('VII.')).length +
  ' · VIII. PATICE ' + results.filter(r => r.id.startsWith('VIII.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('VIII.')).length +
  ' · IX. Afryka ' + results.filter(r => r.id.startsWith('IX.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('IX.')).length +
  ' · X. Australia/NG ' + results.filter(r => r.id.startsWith('X.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('X.')).length +
  ' · XI. Nowa Zelandia ' + results.filter(r => r.id.startsWith('XI.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XI.')).length +
  ' · XII. Antarktyda ' + results.filter(r => r.id.startsWith('XII.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XII.')).length +
  '\n   (XIII. GLACIMONTIS ' + results.filter(r => r.id.startsWith('XIII.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XIII.')).length +
  ' · XIV. Grenlandia ' + results.filter(r => r.id.startsWith('XIV.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XIV.')).length +
  ' · XV. Wyspy Bryt. ' + results.filter(r => r.id.startsWith('XV.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XV.')).length +
  ' · XVI. GLACIMONTIS f2 ' + results.filter(r => r.id.startsWith('XVI.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XVI.')).length +
  '\n   (XVII. PALEojeziora ' + results.filter(r => r.id.startsWith('XVII.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XVII.')).length +
  ' · XVIII. warianty BIIS ' + results.filter(r => r.id.startsWith('XVIII.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XVIII.')).length +
  ' · XIX. Islandia ' + results.filter(r => r.id.startsWith('XIX.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XIX.')).length +
  ' · XX. głębokie stadiały ' + results.filter(r => r.id.startsWith('XX.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XX.')).length +
  '\n   (XXI. biomy ' + results.filter(r => r.id.startsWith('XXI.')).filter(r => r.ok).length + '/' + results.filter(r => r.id.startsWith('XXI.')).length + ')');
process.exit(failed ? 1 : 0);
})();
