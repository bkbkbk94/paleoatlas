/* ============================================================================
   LAND-SHOTS — audyt „kształtu lądu w czasie" (nie lądolodu!): 13 regionów × 25 epok.
   Renderowane kształt lądu = WORLD_LAND (Natural Earth 50m, NEZMIENNY) + wyschnięty
   szelf SHELVES[poziom] (batymetria ETOPO2v2) wybrany przez shelfForSea(seaAtBP(bp)).
   Tryb paleo (domyślny start): kafelki znikają, ląd #cfc39f na oceanie #aecbd9
   → wyłączamy icePane/biomePane/ghostPane i mierzymy ułamek pikseli lądu w kadrze.
   Regiony: eur Europa/Fennoskandia · nam Ameryka Płn · sam Patagonia · ant Antarktyda
     gris Grenlandia+Islandia · gbi Wyspy Bryt. · svb Svalbard · asn Azja płn.
     afr Afryka Wsch. (Rift) · atl Atlas · aus Australia+Tasmania · png Nowa Gwinea · nzl Nowa Zelandia
   Epoki (bp): 1k dziś · 9k · YD 12,3k · BA 13,6k · 15k · 17,5k · LGM 21,5k · 30k · 40k
     · MIS4 65k · MIS5c 97k · MIS5d 115k · Eem 125k · 135k · MIS6 150k · MIS7c 200k
     · MIS8 275k · MIS10 350k · MIS12 450k · MIS16 650k · MIS22 880k · MIS36 1190k
     · 1750k · 2500k · 3300k (pliocen). Oczekiwane poziomy liczone jak app.js.
   Aserty:
     M0 klucze SHELVES == SHELF_LEVELS (dane ⇄ kod)
     M1 per epoka: tooltip „Wyschnięty szelf (poziom morza −X m)" == shelfForSea(seaAtBP)
     M2 per region: ułamki lądu niemalejące wzdłuż łańcucha głębokości (null,−5,…,−125)
     M3 per region: ułamek(dziś) == ułamek(Eem) == ułamek(pliocen) — geometria ta sama
   Wynik: shots/l_<reg>_<ep>.png + l_grid.json + l_checks.json
   ============================================================================ */
const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const REGIONS = [
  ['eur',  [61, 18],   3],
  ['nam',  [50, -95],  3],
  ['sam',  [-47, -71], 4],
  ['ant',  [-80, 25],  2],
  ['gris', [70, -34],  3],
  ['gbi',  [54.5, -3], 5],
  ['svb',  [79, 18],   4],
  ['asn',  [68, 100],  3],
  ['afr',  [1, 35],    4],
  ['atl',  [31.5, -6], 5],
  ['aus',  [-37, 146], 4],
  ['png',  [-5, 141],  5],
  ['nzl',  [-44, 170], 4]
];
const EPOCHS = [
  [1000, '0k'], [9000, '9k'], [12300, 'yd'], [13600, 'ba'], [15000, '15k'], [17500, '17k5'],
  [21500, 'lgm'], [30000, '30k'], [40000, '40k'], [65000, 'mis4'], [97000, 'mis5c'], [115000, 'mis5d'],
  [125000, 'eem'], [135000, '135k'], [150000, 'mis6'], [200000, 'mis7c'], [275000, 'mis8'],
  [350000, 'mis10'], [450000, 'mis12'], [650000, 'mis16'], [880000, 'mis22'], [1190000, 'mis36'],
  [1750000, 'leo1750'], [2500000, 'gau2500'], [3300000, 'plio3300']
];
/* repliki funkcji z app.js (linie ~66 i ~78) — do asertów, nie do renderu */
const SHELF_LEVELS = [-125, -110, -100, -95, -80, -75, -60, -55, -50, -30, -5];
function seaAtBP(bp, S) {
  const ka = bp / 1000;
  if (ka <= S[0][0]) return S[0][1];
  for (let i = 1; i < S.length; i++) {
    if (ka <= S[i][0]) {
      const [k0, m0] = S[i - 1], [k1, m1] = S[i];
      return m0 + (m1 - m0) * (ka - k0) / (k1 - k0);
    }
  }
  return S[S.length - 1][1];
}
function shelfForSea(sea) {
  if (sea >= 0) return null;
  let best = SHELF_LEVELS[0];
  SHELF_LEVELS.forEach(l => { if (Math.abs(l - sea) < Math.abs(best - sea)) best = l; });
  return best;
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8387', '--bind', '127.0.0.1'], { cwd: require('path').resolve(__dirname, '..') });
  await sleep(1200);
  const results = [], checks = { lvl: {}, notes: [] };
  const ok = (name, cond, info) => { results.push([name, !!cond, info === undefined ? '' : String(info)]); console.log((cond ? 'OK  ' : 'FAIL') + ' ' + name + (info !== undefined ? '  [' + info + ']' : '')); };
  const browser = await puppeteer.launch({ executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 760 });
    await page.goto('http://127.0.0.1:8387/', { waitUntil: 'networkidle2' });
    await sleep(1800);

    /* tryb paleo = domyślny start (app.js init: setPaleoView(true)) — upewniamy się */
    const paleoOn = await page.evaluate(() => document.getElementById('map').classList.contains('paleo'));
    if (!paleoOn) { await page.click('#paleo-view'); await sleep(600); }
    /* czysty audyt: chowamy UI + warstwy, których nie badamy (lód!, biom, duch, stanowiska) */
    await page.addStyleTag({ content:
      '#top,#legend,#side,#timeline,#phasecard,#about,#gloss,#globe-hud,'
      + '.leaflet-control-container{display:none!important} #mapwrap{inset:0!important} #map{inset:0!important}' });
    await page.evaluate(() => {
      window.__PA.map.invalidateSize();
      ['icePane', 'biomePane', 'ghostPane', 'hullPane', 'sitesPane', 'nbrPane'].forEach(p => {
        const el = window.__PA.map.getPane(p); if (el) el.style.display = 'none';
      });
    });
    await sleep(300);

    /* M0: porządek danych — klucze SHELVES == SHELF_LEVELS app.js */
    const shelfKeys = await page.evaluate(() => Object.keys(window.SHELVES).map(Number).sort((a, b) => a - b));
    ok('M0 klucze SHELVES == SHELF_LEVELS', JSON.stringify(shelfKeys) === JSON.stringify([...SHELF_LEVELS].sort((a, b) => a - b)), shelfKeys.join(','));

    const S = await page.evaluate(() => window.ENV.sea);

    /* ułamek pikseli lądu (#cfc39f) w WIDOCZNYM obszarze kanwy landPane (padding 0.4) */
    const landPx = () => page.evaluate(() => {
      const cv = document.querySelector('.leaflet-land-pane canvas');
      if (!cv) return -1;
      const pos = L.DomUtil.getPosition(cv);
      const msz = window.__PA.map.getSize();
      const dpr = cv.width / (msz.x * (1 + 0.8));
      const x0 = Math.max(0, Math.round(-pos.x * dpr)), y0 = Math.max(0, Math.round(-pos.y * dpr));
      const x1 = Math.min(cv.width, Math.round((-pos.x + msz.x) * dpr)), y1 = Math.min(cv.height, Math.round((-pos.y + msz.y) * dpr));
      const ctx = cv.getContext('2d'), d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data, w = x1 - x0;
      let hit = 0, tot = 0;
      for (let y = 0; y < y1 - y0; y += 4) for (let x = 0; x < w; x += 4) {
        const i = (y * w + x) << 2; tot++;
        if (d[i + 3] > 230 && Math.abs(d[i] - 207) <= 12 && Math.abs(d[i + 1] - 195) <= 12 && Math.abs(d[i + 2] - 159) <= 14) hit++;
      }
      return hit / tot;
    });
    /* warstwy szelfowe faktycznie narysowane + poziomy z ich tooltipów */
    const shelfLvls = () => page.evaluate(() => {
      const lv = []; let n = 0, etopo = 0;
      Object.values(window.__PA.map._layers).forEach(l => {
        const t = l.getTooltip && l.getTooltip();
        if (l.options && l.options.pane === 'landPane' && t && /Wyschnięty szelf/.test(t.getContent())) {
          n++; const m = t.getContent().match(/poziom morza (-?\d+) m/); lv.push(Number(m && m[1]));
          if (/ETOPO2v2/.test(t.getContent())) etopo++;
        }
      });
      return { n, lv: [...new Set(lv)], etopo };
    });

    const grid = {};
    const seenLvl = {};
    for (const [bp, lab] of EPOCHS) {
      const sea = seaAtBP(bp, S);
      const exp = shelfForSea(sea);
      seenLvl[lab] = { bp, sea, exp };
    }
    fs.writeFileSync('/tmp/shots/l_checks.json', JSON.stringify({ seenLvl }, null, 1));

    let firstRegion = true;
    for (const [rk, ctr, z] of REGIONS) {
      grid[rk] = {};
      await page.evaluate((c, zz) => { window.__PA.map.invalidateSize(); window.__PA.map.setView(c, zz); }, ctr, z);
      await sleep(350);
      for (const [bp, lab] of EPOCHS) {
        await page.evaluate(b => window.__PA.setSlider(window.__PA.bpToSlider(b)), bp);
        await sleep(340);
        grid[rk][lab] = await landPx();
        /* M1 tylko raz na epokę (na pierwszym regionie) */
        if (firstRegion) {
          const sl = await shelfLvls();
          const exp = seenLvl[lab].exp;
          const pass = exp === null ? sl.n === 0 : (sl.n > 0 && sl.lv.length === 1 && sl.lv[0] === exp);
          ok('M1 ' + lab + ': tooltip szelfu == ' + (exp === null ? 'brak' : exp + ' m'), pass,
             'sea=' + Math.round(seenLvl[lab].sea) + ' m, warstw=' + sl.n + ', lv=' + JSON.stringify(sl.lv) + ', etopo=' + sl.etopo);
          if (exp !== null) ok('M1b ' + lab + ': tooltip cytuje ETOPO2v2', sl.n === 0 || sl.etopo === sl.n, sl.etopo + '/' + sl.n);
        }
        await page.screenshot({ path: '/tmp/shots/l_' + rk + '_' + lab + '.png' });
      }
      firstRegion = false;
    }

    /* M2: monotoniczność w głąb: null, −5, −30, −50, −60, −75, −80, −95, −100, −110, −125 */
    const CHAIN = [['0k', 0], ['135k', 5], ['9k', 30], ['mis5c', 50], ['yd', 60], ['mis5d', 75],
                   ['ba', 80], ['15k', 95], ['mis12', 100], ['17k5', 110], ['lgm', 125]];
    for (const [rk] of REGIONS) {
      let lm = true, prev = -1, detail = [];
      for (const [lab] of CHAIN) {
        const v = grid[rk][lab]; detail.push(lab + '=' + (100 * v).toFixed(2));
        if (v < prev - 0.0009) lm = false; prev = Math.max(prev, v);
      }
      ok('M2 ' + rk + ': ułamek lądu niemaleje wzdłuż 0→−125 m', lm, detail.join(' '));
    }
    /* M3: identyczna geometria „null” (dziś=Eem=pliocen) */
    for (const [rk] of REGIONS) {
      const a = grid[rk]['0k'], b = grid[rk].eem, c = grid[rk].plio3300;
      ok('M3 ' + rk + ': dziś==Eem==pliocen', Math.abs(a - b) < 0.001 && Math.abs(a - c) < 0.001,
         (100 * a).toFixed(3) + '/' + (100 * b).toFixed(3) + '/' + (100 * c).toFixed(3));
    }

    /* tabela */
    const P = v => (v < 0 ? '  ERR ' : (100 * v).toFixed(2).padStart(6));
    console.log('\nułamek px lądu w kadrze (%) — region × epoka');
    console.log('reg'.padEnd(5) + EPOCHS.map(e => e[1].padStart(8)).join(''));
    for (const [rk] of REGIONS) console.log(rk.padEnd(5) + EPOCHS.map(e => P(grid[rk][e[1]])).join(' '));
    console.log('poziom'.padEnd(5) + EPOCHS.map(e => String(seenLvl[e[1]].exp === null ? '+' : -seenLvl[e[1]].exp).padStart(8)).join(''));

    fs.writeFileSync('/tmp/shots/l_grid.json', JSON.stringify(grid, null, 1));

    /* dokładki w widoku WSPÓŁCZESNYM (dla dokumentacji wizualnej: szelf półprzezroczysty na kafelkach) —
       klik przez evaluate (przycisk jest niewidoczny: UI schowane klasą CSS) */
    await page.evaluate(() => document.getElementById('paleo-view').click());
    await sleep(500);
    await page.evaluate(() => { window.__PA.map.getPane('icePane').style.display = 'none'; });
    await page.evaluate(c => window.__PA.map.setView(c, 3), [53, 10]);
    await page.evaluate(b => window.__PA.setSlider(window.__PA.bpToSlider(b)), 21500);
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 20000 }).catch(() => {});
    await sleep(500);
    await page.screenshot({ path: '/tmp/shots/l_normal_eur_lgm.png' });
    await page.evaluate(b => window.__PA.setSlider(window.__PA.bpToSlider(b)), 125000);
    await sleep(500);
    await page.screenshot({ path: '/tmp/shots/l_normal_eur_eem.png' });

    const fails = results.filter(r => !r[1]);
    console.log('\nLAND-SHOTS: ' + (results.length - fails.length) + '/' + results.length + (fails.length ? '  PORAŻKI: ' + fails.map(f => f[0]).join(' | ') : '  OK'));
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('OK — klatki w /tmp/shots/l_*.png');
})();
