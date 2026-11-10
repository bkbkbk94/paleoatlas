/* ============================================================================
   CONTINENT-SHOTS — audyt „kształtu w czasie": 12 regionów × 6 epok.
   Regiony (osobno kontynenty i wyspy):
     eur Europa/Fennoskandia · nam Ameryka Płn · sam Patagonia · ant Antarktyda
     gris Grenlandia+Islandia · gbi Wyspy Bryt. · svb Svalbard · asn Azja płn.
     afr Afryka Wsch. (Rift) · atl Atlas · aus Australia+Tasmania · png Nowa Gwinea · nzl Nowa Zelandia
   Epoki: lgm 21,5 ka · mis4 65 ka · mis6 155 ka · eem 125 ka · yd 12,3 ka · now 1 ka
   Wynik: shots/c_<region>_<epoka>.png + stdout-tabela ułamków px lodu (krok 4 px, alfa>16)
   ============================================================================ */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
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
  ['lgm', 21500], ['mis4', 65000], ['mis6', 155000], ['eem', 125000], ['yd', 12300], ['now', 1000]
];

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8385', '--bind', '127.0.0.1'], { cwd: '/home/user/paleoatlas' });
  await sleep(1200);
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 760 });
    await page.goto('http://127.0.0.1:8385/', { waitUntil: 'networkidle2' });
    await sleep(1800);
    /* czysty audyt warstw: chowamy panele UI (nad mapą), zostawiamy mapę + warstwy */
    await page.addStyleTag({ content:
      '#top,#legend,#side,#timeline,#phasecard,#about,#gloss,#globe-hud,'
      + '.leaflet-control-container{display:none!important} #mapwrap{inset:0!important} #map{inset:0!important}' });
    await page.evaluate(() => { window.__PA.map.invalidateSize(); });
    await sleep(300);
    /* ułamek lodu WIDOCZNY w kadrze mapy (bez marginesu padding=0.4 renderera canvas —
       tam rysuje się np. krawędź Antarktydy w kadrach południowych; pozycję kanwy
       bierzemy z transformacji Leafleta, prosto i wiarygodnie) */
    const icePx = () => page.evaluate(() => {
      const cv = document.querySelector('.leaflet-ice-pane canvas');
      if (!cv) return -1;
      const pos = L.DomUtil.getPosition(cv);
      const dpr = cv.width / (window.__PA.map.getSize().x * (1 + 0.8));
      const msz = window.__PA.map.getSize();
      const x0 = Math.max(0, Math.round(-pos.x * dpr)), y0 = Math.max(0, Math.round(-pos.y * dpr));
      const x1 = Math.min(cv.width, Math.round((-pos.x + msz.x) * dpr)), y1 = Math.min(cv.height, Math.round((-pos.y + msz.y) * dpr));
      const ctx = cv.getContext('2d'), d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data, w = x1 - x0;
      let hit = 0, tot = 0;
      for (let y = 0; y < y1 - y0; y += 4) for (let x = 0; x < w; x += 4) { tot++; if (d[((y * w + x) << 2) + 3] > 16) hit++; }
      return hit / tot;
    });
    const grid = {};
    for (const [rk, ctr, z] of REGIONS) {
      grid[rk] = {};
      await page.evaluate((c, zz) => { window.__PA.map.invalidateSize(); window.__PA.map.setView(c, zz); }, ctr, z);
      await sleep(350);
      for (const [ek, bp] of EPOCHS) {
        await page.evaluate(bp => window.__PA.setSlider(window.__PA.bpToSlider(bp)), bp);
        await sleep(420);
        grid[rk][ek] = await icePx();
        await page.screenshot({ path: '/tmp/shots/c_' + rk + '_' + ek + '.png' });
      }
    }
    // tabela
    const P = v => (100 * v).toFixed(2).padStart(6);
    console.log('fraccja px lodu w kadrze (%) — region × epoka');
    console.log('reg'.padEnd(5) + EPOCHS.map(e => e[0].padStart(7)).join(''));
    for (const [rk] of REGIONS) console.log(rk.padEnd(5) + EPOCHS.map(e => P(grid[rk][e[0]])).join(' '));
    fs.writeFileSync('/tmp/shots/c_grid.json', JSON.stringify(grid, null, 1));
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('OK — klatki w /tmp/shots/c_*.png');
})();
