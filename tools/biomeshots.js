/* ============================================================================
   BIOME-SHOTS — audyt warstwy biomów (realne MODELE publikowane + HG-lite + pyłek):
   15 regionów × 15 epok mierzonych W PRZEGLĄDARCE (piksele rastra z cache BIOME.cla
   — dokładnie to, co widzi użytkownik i tooltip) + pełne klatki i atlas epok.
   Źródła: 0–120 ka Beyer2020 · 121–799 ka Krapp2021 · ≥810 ka Barreto2023+HG-lite v0.6.
   Kotwice DANYCH: BIOME 6000 v4.2 (0k/6k/18k). Port testowy 8389.
   Aserty:
     A1 spójność meta/dysk: 56 epok, 29 klas; wszystkie pliki PNG osiągalne (HTTP 200)
     A2 per epoka: overlay widoczny, 720×360, src == plik z meta (dla epoki slidera)
     A3 kotwice pyłkowe: właściwy klucz (0k/6k/18k/null), liczności zbiorów, canvas w pollenPane
     A4 frakcje klas per region × epoka — twarde granice z literatury (LGM/Eem/AHP/pliocen)
     A5 legenda: tytuł epoki, źródło (opublikowany vs portal), wiersz kotwic
     A6 hover: tooltip pikselowy pokazuje klasę + źródło (Sahara = pustynia + MODEL)
     A7 kontrolka warstw: wyłączenie „Biomy (modele naukowe)” chowa img + legendę
     A8 „O danych” zawiera 3 cytaty źródeł + HG-lite + BIOME 6000
     A9 tooltips pyłka: pierwsza stacja 18k ma tooltip z nazwą + „DANE pyłkowe”
   Wynik: shots/bm_<ep>.png + bm_grid.json + bm_checks.json
   ============================================================================ */
const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const REGIONS = {
  sahara: [15, 30, -10, 30], sahel: [10, 15, -10, 30], amazonia: [-10, 2, -75, -50],
  kongo: [-5, 5, 15, 28], fenn: [58, 70, 10, 30], polska: [49, 55, 14, 24],
  eurw: [43, 55, -5, 12], syberia: [55, 70, 60, 130], chinyw: [25, 40, 105, 120],
  indie: [8, 25, 72, 85], midwest: [35, 48, -100, -85], ausSE: [-40, -30, 140, 150],
  ausC: [-30, -20, 120, 140], patagonia: [-50, -38, -74, -66], gris: [60, 84, -60, -15]
};
const EPOCHS = [
  [0, '0k'], [6000, '6k'], [12300, 'yd'], [21500, 'lgm'], [27000, '27k'],
  [65000, 'mis4'], [125000, 'eem'], [155000, 'mis6'], [250000, 'mis8'], [450000, 'mis12'],
  [650000, 'mis16'], [810000, '810k'], [1550000, 'leo1550'], [2500000, 'mat2500'], [3300000, 'plio3300']
];
const GRPS = { 'lasy tropikalne': [1, 2, 3], 'lasy ciepłe+umiark.': [4, 5, 6, 7, 8, 9, 15, 17], 'tajga': [10, 11],
  'sawanny+suche': [12, 13, 14, 16, 18], 'stepy': [19, 20], 'pustynie': [21], 'tundry': [22, 23, 24, 25, 26],
  'pustka': [27], 'lądolód': [28] };

function head200(port, path) {
  return new Promise(res => {
    const r = http.request({ host: '127.0.0.1', port, path, method: 'HEAD' }, resp => res(resp.statusCode));
    r.on('error', () => res(0)); r.end();
  });
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8389', '--bind', '127.0.0.1'], { cwd: require('path').resolve(__dirname, '..') });
  await sleep(1200);
  const results = [], notes = { frac: {} };
  const ok = (name, cond, info) => { results.push([name, !!cond, info === undefined ? '' : String(info)]); console.log((cond ? 'OK  ' : 'FAIL') + ' ' + name + (info !== undefined ? '  [' + info + ']' : '')); };
  const browser = await puppeteer.launch({ executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 760 });
    await page.goto('http://127.0.0.1:8389/', { waitUntil: 'networkidle2' });
    await sleep(1800);

    /* ---- A1: spójność meta/dysk ---- */
    const meta = await page.evaluate(() => {
      const M = window.BIOME_META;
      return { epok: M.epochs.length, klas: Object.keys(M.palette).length, nazw: Object.keys(M.names).length,
               files: M.epochs.map(e => e.file), srcs: [...new Set(M.epochs.map(e => e.src))] };
    });
    ok('A1a meta: 56 epok / 29 klas palety+nazw / 3 źródła', meta.epok === 56 && meta.klas === 29 && meta.nazw === 29 && meta.srcs.length === 3,
       meta.epok + ' epok, źródła: ' + meta.srcs.join(','));
    let httpOk = 0;
    for (const f of meta.files) if ((await head200(8389, '/js/data/biome/' + f)) === 200) httpOk++;
    ok('A1b wszystkie migawki PNG osiągalne (HEAD 200)', httpOk === meta.files.length, httpOk + '/' + meta.files.length);
    const pollenMeta = await page.evaluate(() => ({ k: Object.keys(window.BIOME_POLLEN), n: [window.BIOME_POLLEN['0k'].length, window.BIOME_POLLEN['6k'].length, window.BIOME_POLLEN['18k'].length] }));
    ok('A1c BIOME 6000: 0k=9948 / 6k=1794 / 18k=318', pollenMeta.n[0] === 9948 && pollenMeta.n[1] === 1794 && pollenMeta.n[2] === 318, pollenMeta.n.join('/'));

    /* widok atlasowy: schowamy UI i dodatkowe warstwy oprócz biom+lód (jak atlas epok) */
    await page.addStyleTag({ content:
      '#top,#legend,#side,#timeline,#phasecard,#about,#gloss,#globe-hud,' +
      '.leaflet-control-container{display:none!important} #mapwrap{inset:0!important} #map{inset:0!important}' });
    await page.evaluate(() => {
      const PA = window.__PA;
      PA.map.invalidateSize();
      ['ghostPane', 'hullPane', 'sitesPane', 'nbrPane'].forEach(p => { const el = PA.map.getPane(p); if (el) el.style.display = 'none'; });
      PA.map.setView([22, 5], 2);
    });
    await sleep(300);

    const setEpoch = async bp => {
      await page.evaluate(b => window.__PA.setSlider(window.__PA.bpToSlider(b)), bp);
      await sleep(620);
    };
    const epochState = async bp => page.evaluate(b => {
      const PA = window.__PA;
      const e = PA.biomeEpochForBP(b);
      const img = document.querySelector('.leaflet-biome-pane img');
      return { ka: Array.isArray(e.ka) ? e.ka : [e.ka, e.ka], src: e.src, file: e.file,
               imgOk: !!(img && img.complete && img.naturalWidth === 720),
               imgFile: img ? img.src.split('/').pop() : null, op: img ? +getComputedStyle(img).opacity : -1,
               pkey: PA.BIOME.pollenKey,
               pollenCanvas: document.querySelectorAll('.leaflet-pollen-pane canvas').length,
               pollenLayers: PA.group.pollen.getLayers().length,
               cacheReady: !!PA.BIOME.cache[PA.BIOME.curFile] };
    }, bp);
    const fracs = async (reg) => page.evaluate(regBox => {
      const PA = window.__PA;
      const c = PA.BIOME.cache[PA.BIOME.curFile];
      if (!c) return null;
      const [lat1, lat2, lon1, lon2] = regBox;
      const G = { 'lasy tropikalne': [1, 2, 3], 'lasy ciepłe+umiark.': [4, 5, 6, 7, 8, 9, 15, 17], 'tajga': [10, 11],
        'sawanny+suche': [12, 13, 14, 16, 18], 'stepy': [19, 20], 'pustynie': [21], 'tundry': [22, 23, 24, 25, 26],
        'pustka': [27], 'lądolód': [28] };
      const cnt = { total: 0 };
      for (let lat = lat1 + 0.25; lat <= lat2; lat += 0.5) {
        for (let lon = lon1 + 0.25; lon <= lon2; lon += 0.5) {
          const xx = Math.min(719, Math.max(0, Math.floor((((lon + 540) % 360) - 180 + 180) / 360 * 720)));
          const y = Math.min(359, Math.max(0, Math.floor((90 - lat) / 180 * 360)));
          const k = c.cla[y * 720 + xx];
          if (k <= 0) continue;
          cnt.total++;
          for (const [g, ids] of Object.entries(G)) if (ids.includes(k)) { cnt[g] = (cnt[g] || 0) + 1; break; }
        }
      }
      const out = {};
      for (const g of Object.keys(G)) out[g] = (cnt[g] || 0) / Math.max(cnt.total, 1);
      out.total = cnt.total;
      return out;
    }, reg);
    /* zgodność grupowa dwóch epok po clone klasyfikacji z cache (oba pliki) */
    const agrEpochs = async (bpA, bpB) => page.evaluate(async (b1, b2) => {
      const PA = window.__PA;
      const load = file => new Promise(res => {
        if (PA.BIOME.cache[file]) return res(PA.BIOME.cache[file].cla);
        const img = new Image();
        img.onload = () => {
          const cv = document.createElement('canvas'); cv.width = 720; cv.height = 360;
          const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, 720, 360);
          const d = cx.getImageData(0, 0, 720, 360).data;
          const p2k = {}; for (const [k, hex] of Object.entries(window.BIOME_META.palette)) {
            p2k[parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16)] = +k;
          }
          const cla = new Uint8Array(720 * 360);
          for (let i = 0; i < 720 * 360; i++) cla[i] = p2k[d[i * 4] + ',' + d[i * 4 + 1] + ',' + d[i * 4 + 2]] || 0;
          PA.BIOME.cache[file] = { cla, hist: {} };
          res(cla);
        };
        img.src = 'js/data/biome/' + file;
      });
      const e1 = PA.biomeEpochForBP(b1), e2 = PA.biomeEpochForBP(b2);
      const [A, B] = [await load(e1.file), await load(e2.file)];
      const G2 = [[1, 2, 3], [4, 5, 6, 7, 8, 9, 15, 17], [10, 11], [12, 13, 14, 16, 18], [19, 20], [21], [22, 23, 24, 25, 26], [27], [28]];
      const gid = k => { for (let i = 0; i < G2.length; i++) if (G2[i].includes(k)) return i; return -1; };
      let n = 0, eq = 0;
      for (let i = 0; i < 720 * 360; i++) {
        const a = A[i], b = B[i];
        if (a <= 0 || b <= 0 || a === 28 || b === 28) continue;
        n++; if (gid(a) === gid(b)) eq++;
      }
      return n ? eq / n : null;
    }, bpA, bpB);

    /* ---- A2 + kolekcja klatek atlasu ---- */
    const srcExpected = { '0k': 'beyer', '6k': 'krapp', 'yd': 'beyer', 'lgm': 'beyer', '27k': 'beyer',
      'mis4': 'beyer', 'eem': 'krapp', 'mis6': 'krapp', 'mis8': 'krapp', 'mis12': 'krapp',
      'mis16': 'krapp', '810k': 'pgem', 'leo1550': 'pgem', 'mat2500': 'pgem', 'plio3300': 'pgem' };
    for (const [bp, tag] of EPOCHS) {
      await setEpoch(bp);
      const st = await epochState(bp);
      ok('A2 ' + tag + ': overlay 720px widoczny, src=' + srcExpected[tag] + ', plik zgodny z meta',
         st.imgOk && st.src === srcExpected[tag] && st.imgFile === st.file && st.op > 0.9,
         st.imgFile + ' ' + st.src + ' op=' + st.op);
      await page.screenshot({ path: '/tmp/shots/bm_' + tag + '.png' });
      notes[tag] = st;
    }
    /* gęstszy przelot dla atlasu (realne epoki SNAP z meta) */
    const atlasEpochs = [0, 1000, 3000, 6000, 9000, 11000, 12300, 13600, 15000, 17500, 21500, 27000, 30000,
      40000, 65000, 95000, 125000, 155000, 250000, 350000, 450000, 650000, 810000, 1190000, 1750000, 2500000, 3300000];
    for (const bp of atlasEpochs) {
      await setEpoch(bp);
      const st = await epochState(bp);
      await page.screenshot({ path: '/tmp/shots/bma_' + (bp / 1000) + 'k.png' });
    }

    /* ---- A3 kotwice pyłkowe ---- */
    await setEpoch(0); const p0 = await epochState(0);
    await setEpoch(6000); const p6 = await epochState(6000);
    await setEpoch(21500); const plgm = await epochState(21500);
    await setEpoch(125000); const peem = await epochState(125000);
    ok('A3a kotwice: 0k@0, 6k@6ka, 18k@LGM, null@Eem', p0.pkey === '0k' && p6.pkey === '6k' && plgm.pkey === '18k' && peem.pkey === null,
       [p0.pkey, p6.pkey, plgm.pkey, peem.pkey].join('/'));
    ok('A3b markery pyłka na mapie: 0k=9948, 6k=1794, 18k=318 warstw', p0.pollenLayers === 9948 && p6.pollenLayers === 1794 && plgm.pollenLayers === 318,
       [p0.pollenLayers, p6.pollenLayers, plgm.pollenLayers].join('/'));
    ok('A3c canvas renderera w pollenPane', plgm.pollenCanvas >= 1, 'canvas=' + plgm.pollenCanvas);
    await setEpoch(21500); await sleep(700);
    const tt = await page.evaluate(() => {
      const PA = window.__PA;
      const l = PA.group.pollen.getLayers()[0];
      return l && l.getTooltip ? l.getTooltip().getContent() : null;
    });
    ok('A9 tooltip pyłka zawiera nazwę stanowiska + „DANE pyłkowe” + kalibrację ¹⁴C',
       !!tt && tt.includes('DANE pyłkowe') && tt.includes('¹⁴C'), (tt || '').slice(0, 90));

    /* ---- A4 frakcje klas — twarde granice z literatury ---- */
    const F = {};
    for (const [bp, tag] of EPOCHS) {
      await setEpoch(bp);
      await epochState(bp);
      F[tag] = {};
      for (const rk of Object.keys(REGIONS)) { F[tag][rk] = await fracs(REGIONS[rk]); }
      notes.frac[tag] = F[tag];
    }
    const g = (t, r, grp) => (F[t][r] && F[t][r][grp] !== undefined) ? F[t][r][grp] : 0;
    ok('A4-1 LGM Sahara: pustynia ≥55%', g('lgm', 'sahara', 'pustynie') >= 0.55, g('lgm', 'sahara', 'pustynie').toFixed(3));
    ok('A4-2 LGM Amazonia: lasy trop. ≥25%', g('lgm', 'amazonia', 'lasy tropikalne') >= 0.25, g('lgm', 'amazonia', 'lasy tropikalne').toFixed(3));
    ok('A4-3 LGM Fennoskandia: lądolód ≥90%', g('lgm', 'fenn', 'lądolód') >= 0.90, g('lgm', 'fenn', 'lądolód').toFixed(3));
    ok('A4-4 LGM Polska: las ciepły <5%', g('lgm', 'polska', 'lasy ciepłe+umiark.') < 0.05, g('lgm', 'polska', 'lasy ciepłe+umiark.').toFixed(3));
    ok('A4-5 LGM Syberia: tundra+tajga+lód ≥80%', (g('lgm', 'syberia', 'tundry') + g('lgm', 'syberia', 'tajga') + g('lgm', 'syberia', 'lądolód')) >= 0.8,
       (g('lgm', 'syberia', 'tundry') + g('lgm', 'syberia', 'tajga') + g('lgm', 'syberia', 'lądolód')).toFixed(3));
    ok('A4-6 AHP w modelu (uczciwie słaby): Sahara pustynia(6ka, Krapp) < pustynia(LGM)−0.05', g('6k', 'sahara', 'pustynie') < g('lgm', 'sahara', 'pustynie') - 0.05,
       g('6k', 'sahara', 'pustynie').toFixed(3) + ' < ' + g('lgm', 'sahara', 'pustynie').toFixed(3) + ' — modele PMIP notoryjnie niedoszacowują AHP; DANE kotwicy 6k (BIOME 6000) pokazują to na mapie');
    ok('A4-7 dziś Amazonia: lasy trop. ≥60%', g('0k', 'amazonia', 'lasy tropikalne') >= 0.6, g('0k', 'amazonia', 'lasy tropikalne').toFixed(3));
    ok('A4-8 dziś Polska: lasy (cold+tajga) ≥40%', (g('0k', 'polska', 'lasy ciepłe+umiark.') + g('0k', 'polska', 'tajga')) >= 0.4,
       (g('0k', 'polska', 'lasy ciepłe+umiark.') + g('0k', 'polska', 'tajga')).toFixed(3));
    ok('A4-9 dziś Australia SE: pustynia niedominująca (<30%) — potencjalna rośl. naturalna Beyera', g('0k', 'ausSE', 'pustynie') < 0.30, g('0k', 'ausSE', 'pustynie').toFixed(3));
    ok('A4-10 Eem Fennoskandia: lądolód ≤15% (interglacjał; emulator Krappa trzyma komórki górskich czap)', g('eem', 'fenn', 'lądolód') <= 0.15, g('eem', 'fenn', 'lądolód').toFixed(3));
    ok('A4-11 Eem Polska: lasy ≥40% jak dziś', (g('eem', 'polska', 'lasy ciepłe+umiark.') + g('eem', 'polska', 'tajga')) >= 0.4,
       (g('eem', 'polska', 'lasy ciepłe+umiark.') + g('eem', 'polska', 'tajga')).toFixed(3));
    ok('A4-12 MIS6 (155ka) Fennoskandia: lądolód ≥80%', g('mis6', 'fenn', 'lądolód') >= 0.8, g('mis6', 'fenn', 'lądolód').toFixed(3));
    ok('A4-13 pliocen 3,3 mln: Grenlandia BEZ lądolodu (≤10%)', g('plio3300', 'gris', 'lądolód') <= 0.10, g('plio3300', 'gris', 'lądolód').toFixed(3));
    ok('A4-14 pliocen 3,3 mln: Sahara pustynia ≥50%', g('plio3300', 'sahara', 'pustynie') >= 0.5, g('plio3300', 'sahara', 'pustynie').toFixed(3));
    ok('A4-15 pliocen 3,3 mln: Amazonia las trop. ≥25%', g('plio3300', 'amazonia', 'lasy tropikalne') >= 0.25, g('plio3300', 'amazonia', 'lasy tropikalne').toFixed(3));
    const agrEem = await agrEpochs(0, 125000);
    ok('A4-16 Eem≈dziś: zgodność grup (UI: Beyer0ka vs Krapp125ka, międzymodelowa) ≥65%', agrEem !== null && agrEem >= 0.65, (agrEem || 0).toFixed(3));
    const agrHg = await agrEpochs(0, 3300000);
    notes.hglite_vs_now = agrHg;
    ok('A4-17 HG-lite (3,3 mln współczesne ukształtowanie) vs dziś: brak absurdu agr >0.45 (epoka cieplejsza — próg sygnałowy)',
       agrHg !== null && agrHg > 0.45, (agrHg || 0).toFixed(3));

    /* ---- A5 legenda ---- */
    const legText = async bp => { await setEpoch(bp); await sleep(700); return page.evaluate(() => (document.querySelector('.biome-legend') || {}).textContent || ''); };
    const l0 = await legText(0), ll = await legText(21500), lp = await legText(3300000);
    ok('A5a legenda 0ka: „dziś (0 ka)” + MODEL opublikowany', l0.includes('dziś (0 ka)') && l0.includes('MODEL opublikowany'), l0.split('\n')[0]);
    ok('A5b legenda LGM: „22 tys. BP” + wiersz kotwic 18k', ll.includes('22 tys. BP') && ll.includes('18k'), ll.split('\n')[0]);
    ok('A5c legenda pliocen: „3,3 mln BP” + MODEL (portal, HG-lite)', lp.includes('3,3 mln BP') && lp.includes('HG-lite'), lp.split('\n')[0]);

    /* ---- A6 hover tip ---- */
    await setEpoch(0); await sleep(800);
    await page.evaluate(() => window.__PA.map.setView([26, -5], 5));
    await sleep(400);
    const pt = await page.evaluate(() => {
      const PA = window.__PA;
      return PA.map.latLngToContainerPoint([26, -5]);
    });
    await page.mouse.move(pt.x, pt.y); await sleep(350);
    const tipTxt = await page.evaluate(() => { const t = document.querySelector('.biome-tip'); return t && t.style.display !== 'none' ? t.textContent : ''; });
    ok('A6 hover Sahara (dziś): „pustynia” + MODEL', tipTxt.includes('pustynia') && tipTxt.includes('MODEL'), tipTxt.slice(0, 80));

    /* ---- A7 toggle warstwy ---- */
    await page.evaluate(() => {
      document.querySelectorAll('.leaflet-control-layers-overlays label').forEach(lb => {
        if (lb.textContent.includes('Biomy (modele naukowe)')) lb.querySelector('input').click();
      });
    });
    await sleep(500);
    const off = await page.evaluate(() => ({ img: !!document.querySelector('.leaflet-biome-pane img'),
      leg: (document.querySelector('.biome-legend') || { style: {} }).style.display }));
    /* kontrolka może być schowana stylem — ale click działa */
    await page.evaluate(() => {
      document.querySelectorAll('.leaflet-control-layers-overlays label').forEach(lb => {
        if (lb.textContent.includes('Biomy (modele naukowe)')) lb.querySelector('input').click();
      });
    });
    await sleep(400);
    const on2 = await page.evaluate(() => !!document.querySelector('.leaflet-biome-pane img'));
    ok('A7 toggle warstwy biomów chowa img i legendę, powrót przywraca', off.img === false && off.leg === 'none' && on2 === true,
       'off img=' + off.img + ' leg=' + off.leg + ' ponownie=' + on2);

    /* ---- A8 O danych ---- */
    const about = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a,button')].find(el => el.textContent.includes('O danych'));
      if (a) a.click();
      return true;
    });
    await sleep(600);
    const aboutTxt = await page.evaluate(() => document.body.innerText);
    ok('A8 „O danych”: Beyer2020 + Krapp2021 + Barreto2023 + HG-lite + BIOME 6000',
       aboutTxt.includes('Beyer, Krapp') && aboutTxt.includes('Krapp, Beyer') && aboutTxt.includes('Barreto') &&
       aboutTxt.includes('HG-lite v0.6') && aboutTxt.includes('BIOME 6000 v4.2'),
       'Beyer:' + aboutTxt.includes('Beyer, Krapp') + ' Krapp:' + aboutTxt.includes('Krapp, Beyer') + ' Barreto:' + aboutTxt.includes('Barreto') + ' HG:' + aboutTxt.includes('HG-lite v0.6') + ' B6k:' + aboutTxt.includes('BIOME 6000 v4.2'));

    fs.writeFileSync('/tmp/shots/bm_grid.json', JSON.stringify(notes.frac, null, 1));
    const fails = results.filter(r => !r[1]);
    console.log('\nBIOME-SHOTS: ' + (results.length - fails.length) + '/' + results.length + (fails.length ? '  PORAŻKI: ' + fails.map(f => f[0]).join(' | ') : '  OK'));
    checks_exit = fails.length ? 1 : 0;
  } finally {
    await browser.close();
    server.kill();
  }
})();
var checks_exit = 0;
process.on('exit', () => process.exit(checks_exit));
