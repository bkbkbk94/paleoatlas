/* PaleoAtlas — testy E2E widoku MOBILNEGO (390×844, dotyk) */
const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const fs = require('fs');
const SHOTS = '/tmp/shots_mobile';
fs.mkdirSync(SHOTS, { recursive: true });
const URL = 'http://127.0.0.1:8335/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8335', '--bind', '127.0.0.1'], { cwd: require('path').resolve(__dirname, '..'), stdio: 'ignore' });
  await sleep(1200);
  const browser = await puppeteer.launch({
    executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--force-device-scale-factor=2']
  });
  let failed = 0; const results = [];
  const check = (n, ok, info = '') => { if (!ok) failed++; results.push({ n, ok }); console.log((ok ? '✅' : '❌') + ' ' + n + (info ? ' — ' + String(info).slice(0, 130) : '')); };

  try {
    const page = await browser.newPage();
    await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' });
    /* jak w suicie desktop: kafelki zewnętrzne bez internetu to szum środowiska,
       ale odpowiedzi ≥400 dla własnych zasobów = twardy błąd */
    const ORIGIN = 'http://127.0.0.1:8335';
    const errs = [], netNoise = [], ownBroken = [];
    const isTileNoise = t => /Failed to load resource/i.test(t)
      && /net::ERR_(CONNECTION|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|ADDRESS_UNREACHABLE|TIMED_OUT|CACHE_MISS|EMPTY_RESPONSE|SSL)/i.test(t);
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      (isTileNoise(t) ? netNoise : errs).push(t);
    });
    page.on('response', r => { if (r.url().startsWith(ORIGIN) && r.status() >= 400) ownBroken.push(r.status() + ' ' + r.url()); });
    const hp = s => page.evaluate(q => document.querySelectorAll(q).length, s);
    const shot = async n => { await page.screenshot({ path: SHOTS + '/' + n + '.png' }); console.log('   📸 ' + n); };
    const setTime = v => page.evaluate(v => window.__PA.setSlider(v), v).then(() => sleep(300));

    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1600);

    /* --- regresja antypołudnika (Beringia) — także nowe przekroje Batchelora --- */
    const jumps = await page.evaluate(() => {
      const out = [];
      const scan = (name, pts) => { for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if (Math.abs(a[1] - b[1]) > 170) out.push(name); } };
      Object.entries(window.PALEO.ice_sets).forEach(([k, arr]) => arr.forEach(p => (p.rings || [p.pts]).forEach(r => scan('ice:' + k + ':' + p.name, r))));
      if (window.ICE_QUAT) Object.entries(ICE_QUAT).forEach(([k, arr]) => arr.forEach(p => (p.rings || []).forEach(r => scan('q:' + k, r))));
      return [...new Set(out)];
    });
    check('M1.1 żaden poligon nie przeskakuje linii zmiany daty (poprawka Beringii + ICE_QUAT)', jumps.length === 0, jumps.join(';'));

    check('M1.2 brak błędów JS przy starcie', errs.length === 0, errs.join('|').slice(0, 200));
    check('M1.3 brak poziomego scrollowania strony', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2));

    /* --- karta fazy zwinięta domyślnie --- */
    const cardH0 = await page.evaluate(() => document.getElementById('phasecard').getBoundingClientRect().height);
    check('M2.1 karta fazy zwinięta domyślnie (<70px)', await page.evaluate(() => document.getElementById('phasecard').classList.contains('closed')) && cardH0 < 70, cardH0 + 'px');
    await shot('m01_start_zwinieta');
    await page.tap('#phasecard'); await sleep(350);
    const cardH1 = await page.evaluate(() => document.getElementById('phasecard').getBoundingClientRect().height);
    check('M2.2 dotknięcie rozwija kartę (>90px)', !await page.evaluate(() => document.getElementById('phasecard').classList.contains('closed')) && cardH1 > 90, cardH1 + 'px');
    await shot('m02_karta_rozwin');
    /* klik w przycisk paleo nie zwiń karty */
    await page.tap('#paleo-view'); await sleep(400);
    const openAfterBtn = await page.evaluate(() => !document.getElementById('phasecard').classList.contains('closed'));
    check('M2.3 przycisk paleo działa bez zwijania karty', openAfterBtn && await page.evaluate(() => document.querySelectorAll('#map.paleo').length) === 0);
    await page.tap('#paleo-view'); await sleep(400);
    check('M2.4 ponowne WŁ. paleo', await page.evaluate(() => document.querySelectorAll('#map.paleo').length) === 1);

    /* --- legenda zwinięta domyślnie --- */
    check('M3.1 legenda zwinięta domyślnie', await page.evaluate(() => getComputedStyle(document.getElementById('legend-body')).display === 'none'));
    await page.tap('#legend-head'); await sleep(300);
    check('M3.2 legenda rozwija się po dotknięciu', await page.evaluate(() => getComputedStyle(document.getElementById('legend-body')).display !== 'none'));

    /* --- wyszukiwarka na dotyk --- */
    await page.type('#srch-q', 'Dudka'); await sleep(450);
    check('M3.3 szukaj na dotyk: wyniki się pojawiają', await hp('#srch-results .srch-hit') >= 1, await hp('#srch-results .srch-hit'));
    await page.tap('#srch-results .srch-hit'); await sleep(800);
    check('M3.4 dotknięcie wyniku otwiera dolną szufladę', await page.evaluate(() => !document.getElementById('side').classList.contains('hidden')));
    await shot('m05_szukaj_dotyk');
    await page.evaluate(() => document.getElementById('side-close').click()); await sleep(200);
    await page.evaluate(() => window.__PA.clearFilters()); await sleep(300);
    await page.tap('#legend-head'); await sleep(300);   /* zwiń legendę, żeby nie zasłaniała mapy */

    /* --- oś czasu --- */
    await page.evaluate(() => document.querySelectorAll('#tl-track .tl-seg')[11].click()); await sleep(400);
    check('M4.1 dotknięcie segmentu LGM działa', (await page.evaluate(() => document.getElementById('tl-year').textContent)).includes('21'), await page.evaluate(() => document.getElementById('tl-year').textContent));
    const overlap = await page.evaluate(() => {
      const spans = [...document.querySelectorAll('#tl-ruler span')];
      const rs = spans.map(s => s.getBoundingClientRect());
      for (const a of rs) for (const b of rs) if (a !== b && a.left < b.right && b.left < a.right && a.width && b.width) return true;
      return false;
    });
    check('M4.2 etykiety podziałki nie zachodzą na siebie', !overlap);
    await page.tap('#tl-play'); await sleep(600);
    const v1 = await page.evaluate(() => +document.getElementById('tl-slider').value);
    await page.tap('#tl-play');
    check('M4.3 animacja na dotyk działa', v1 !== 1150, '1150 → ' + v1);

    /* --- MIS 3: weryfikacja wizualna artefaktu Norwegia–Grenlandia --- */
    await setTime(950);
    await page.evaluate(() => window.__PA.map.setView([62, 5], 4)); await sleep(500);
    check('M5.1 faza MIS 3 czytana', (await page.evaluate(() => document.getElementById('tl-phase').textContent)).includes('Interpleniglacjał'));
    await shot('m03_mis3_norwegia');

    /* --- panel stanowiska jako dolna szuflada --- */
    await page.evaluate(() => window.__PA.map.setView([52.3, 19.8], 6));
    await setTime(1450); await sleep(400);
    const pt = await page.evaluate(() => {
      const p = document.querySelector('.leaflet-pane.leaflet-sites-pane svg path');
      if (!p) return null; const r = p.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (pt) { await page.touchscreen.tap(pt.x, pt.y); await sleep(600); }
    const sheet = await page.evaluate(() => {
      const s = document.getElementById('side'); const cs = getComputedStyle(s);
      return { visible: !s.classList.contains('hidden'), bottom: cs.bottom, left: cs.left, width: s.getBoundingClientRect().width };
    });
    check('M6.1 stanowisko otwiera dolną szufladę', sheet.visible && sheet.bottom === '0px' && sheet.width >= 385, JSON.stringify(sheet));
    await shot('m04_szuflada_stanowisko');
    await page.evaluate(() => document.getElementById('side-close').click()); await sleep(250);
    check('M6.2 szuflada zamyka się', await page.evaluate(() => document.getElementById('side').classList.contains('hidden')));

    /* --- oś: 19 segmentów + kamienie milowe + głęboka chronologia env --- */
    check('M8.1 oś czasu: 19 segmentów', await hp('#tl-track .tl-seg') === 19, await hp('#tl-track .tl-seg'));
    check('M8.2 kamienie milowe renderują się (9 ♦)', await hp('.tl-ms') === 9, await hp('.tl-ms'));
    await page.evaluate(() => { window.__PA.setSlider(0); }); await sleep(400);
    check('M8.3 skrajny lewy koniec = 3,3 mln lat temu', (await page.evaluate(() => document.getElementById('tl-year').textContent)).includes('mln'),
      await page.evaluate(() => document.getElementById('tl-year').textContent));
    await shot('m06_gleboka_os');
    check('M8.4 na skraju osi karta fazy „Pierwsze narzędzia kamienne”', (await page.evaluate(() => document.getElementById('phase-name').textContent)).includes('narzędzia'));

    /* --- REGRESJA (zgłoszenie usera, iOS): „lód czasem znika całkowicie” w animacji ▶.
       Przyczyna: megabajtowe jednościeżkowe SVG przekrojów Q19; fix = renderer canvas.
       Test: w epokach z lodem piksele canvasu MUSZĄ być namalowane; w interglacjalu — nie nad Polską. --- */
    const icePx = () => page.evaluate(() => {
      const cv = document.querySelector('.leaflet-ice-pane canvas');
      if (!cv) return -1;
      const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
      const img = ctx.getImageData(0, 0, w, h).data;
      let hit = 0, tot = 0;
      for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
        tot++; if (img[((y * w + x) << 2) + 3] > 16) hit++;
      }
      return hit / tot;
    });
    await page.evaluate(() => { window.__PA.map.setView([56, 18], 4); window.__PA.setSlider(window.__PA.bpToSlider(450000)); });
    await sleep(700);
    check('M9.1 MIS 12: lód namalowany (canvas, mobilny)', (await icePx()) > 0.05, await icePx());
    await shot('m07_mis12_lod_canvas');
    await page.evaluate(() => { window.__PA.map.setView([64, 15], 4); window.__PA.setSlider(window.__PA.bpToSlider(270000)); });
    await sleep(700);
    check('M9.2 MIS 8 (Q19): lód namalowany', (await icePx()) > 0.03, await icePx());
    await page.evaluate(() => { window.__PA.map.setView([56, 18], 4); window.__PA.setSlider(window.__PA.bpToSlider(398000)); });
    await sleep(700);
    const pxIg = await icePx();
    check('M9.3 Interglacjał mazowiecki: brak lodu nad Polską (poprawne „znikanie”)', pxIg === 0, pxIg);
    /* REGRESJA (zgłoszenie usera): 713 tys. lat — dawniej brak lodu (dziura MIS 18);
       teraz okno piętra → stadiał: lód MUSI być namalowany + karta pokazuje MIS 18 */
    await page.evaluate(() => { window.__PA.map.setView([62, 15], 4); window.__PA.setSlider(window.__PA.bpToSlider(713000)); });
    await sleep(700);
    check('M9.4 713 tys.: lód namalowany (okno MIS 18)', (await icePx()) > 0.03, await icePx());
    check('M9.5 713 tys.: karta pokazuje MIS 18 z notką SCHEMAT-analog',
      (await page.evaluate(() => document.getElementById('phase-icesrc').textContent)).includes('MIS 18'),
      await page.evaluate(() => document.getElementById('phase-icesrc').textContent));
    await shot('m08_713ka_mis18_lod');

    /* --- M10: odświeżanie rendererów canvas po zoomie (regresja iOS: „duch” linii brzegowej
       zamarzał w rzucie sprzed pinch-zoomu; fix = wymuszone _update() na zoomend) --- */
    const ghostSig = t => page.evaluate(() => {
      const PA = window.__PA, map = PA.map, R = PA.RENDER_CANVAS.ghost;
      const cv = R._container;
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let cnt = 0;
      for (let i = 0; i < cv.width * cv.height; i += 97) {                  // rzadka sygnatura bitmapy
        const i4 = i * 4;
        if (d[i4 + 3] > 60 && Math.abs(d[i4] - 107) < 50 && Math.abs(d[i4 + 1] - 95) < 50) cnt++;
      }
      const pt = map.latLngToContainerPoint([54.38, 18.65]);                // Gdańsk
      const rc = cv.getBoundingClientRect(), rm = map.getContainer().getBoundingClientRect();
      const scaleX = cv.width / rc.width, scaleY = cv.height / rc.height;
      const gx = (pt.x - (rc.left - rm.left)) * scaleX, gy = (pt.y - (rc.top - rm.top)) * scaleY;
      let near = 0;
      for (let y = Math.max(0, Math.round(gy) - 7); y < Math.min(cv.height, Math.round(gy) + 7); y++)
        for (let x = Math.max(0, Math.round(gx) - 7); x < Math.min(cv.width, Math.round(gx) + 7); x++) {
          const i = (y * cv.width + x) * 4;
          if (d[i + 3] > 80 && Math.abs(d[i] - 107) < 40 && Math.abs(d[i + 1] - 95) < 40 && Math.abs(d[i + 2] - 69) < 40) near++;
        }
      return { zoom: map.getZoom(), hasGhost: map.hasLayer(PA.ghostCoast), cnt, near,
        rzoom: R._zoom, w: cv.width };
    });
    await page.evaluate(() => { window.__PA.setSlider(window.__PA.bpToSlider(95000)); window.__PA.map.setView([52.3, 19.8], 6); });
    await sleep(700);
    const g6 = await ghostSig('z6');
    check('M10.0 duch współczesnej linii brzegowej na mapie', g6.hasGhost === true && g6.cnt > 30, JSON.stringify(g6).slice(0, 110));
    await page.evaluate(() => window.__PA.map.setZoom(4));
    await sleep(900);
    const g4 = await ghostSig('z4');
    check('M10.1 renderer zsynchronizowany z nowym zoomem (R._zoom == mapa.getZoom)', g6.rzoom === 6 && g4.rzoom === g4.zoom && g4.zoom === 4 && g4.w > 0, 'rendererZoom z6=' + g6.rzoom + ' → z4=' + g4.rzoom);
    check('M10.2 bitmapa przerysowana po zoomie (nie stara tekstura)', g4.cnt !== g6.cnt && g4.cnt > 30, g6.cnt + ' → ' + g4.cnt);
    check('M10.3 Gdańsk znów na linii brzegowej (rzut poprawny po zoomie)', g4.near > 0, 'near=' + g4.near + ' @ z' + g4.zoom);
    await shot('m10_duch_po_oddaleniu');

    /* --- reszta widoków na telefonie --- */
    await page.goto(URL + '#slownik', { waitUntil: 'networkidle2' }); await sleep(600);

    check('M7.1 słownik na telefonie (74 hasła)', await hp('.gloss-item') === 74, await hp('.gloss-item'));
    check('M7.2 brak błędów JS po routingu', errs.length === 0, errs.join('|').slice(0, 200));
    check('M7.2b zero odpowiedzi ≥400 dla zasobów własnych', ownBroken.length === 0, ownBroken.slice(0, 3).join('|'));

    /* ========== M11. BRAMKA v1.0 NA TELEFONIE (P0.3 / P0.5) ========== */
    await page.bringToFront();
    await page.goto(URL, { waitUntil: 'networkidle2' }); await sleep(1200);
    const fs16 = await page.evaluate(() => {
      const px = sel => {
        const el = document.querySelector(sel);
        return el ? parseFloat(getComputedStyle(el).fontSize) : null;
      };
      return { q: px('#srch-q'), s1: px('#srch-selects select'), gloss: px('#gloss-q'), w: window.innerWidth };
    });
    check('M11.1 pola wyszukiwania i selecty ≥16 px na telefonie (koniec autozoomu iOS)',
      fs16.q >= 16 && fs16.s1 >= 16 && fs16.gloss >= 16, JSON.stringify(fs16));

    const noOverlap = await page.evaluate(() => {
      const card = document.getElementById('phasecard').getBoundingClientRect();
      const layers = document.querySelector('.leaflet-control-layers').getBoundingClientRect();
      const zoom = document.querySelector('.leaflet-control-zoom').getBoundingClientRect();
      const hit = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
      return {
        w: window.innerWidth, card: [Math.round(card.left), Math.round(card.right), Math.round(card.top)],
        layers: [Math.round(layers.left), Math.round(layers.top)],
        vsLayers: hit(card, layers), vsZoom: hit(card, zoom)
      };
    });
    check('M11.2 karta fazy nie wchodzi pod kontrolkę warstw ani zoom (≤430 px)',
      noOverlap.vsLayers === false && noOverlap.vsZoom === false, JSON.stringify(noOverlap));

    const tapTargets = await page.evaluate(() => {
      const r = document.getElementById('legend-head').getBoundingClientRect();
      const play = document.getElementById('tl-play').getBoundingClientRect();
      const sliderThumb = getComputedStyle(document.getElementById('tl-slider')).height;
      return { legendHead: Math.round(r.height), play: Math.round(play.height), slider: sliderThumb };
    });
    check('M11.3 cele dotyku: nagłówek legendy ≥32 px, przycisk osi ≥40 px',
      tapTargets.legendHead >= 32 && tapTargets.play >= 40, JSON.stringify(tapTargets));

    /* prawdziwa droga użytkownika klawiatury: Tab z początku dokumentu → skip-link
       (widoczny), Enter → przeniesienie fokusu do #main */
    await page.bringToFront();
    await page.evaluate(() => { document.body.focus(); });
    await page.keyboard.press('Tab');
    await sleep(120);
    const skipM = await page.evaluate(() => {
      const a = document.activeElement;
      const isSkip = !!a && a.classList && a.classList.contains('skip-link');
      return {
        present: !!document.querySelector('.skip-link'), isSkip,
        rectTop: a ? Math.round(a.getBoundingClientRect().top) : null
      };
    });
    await page.keyboard.press('Enter');
    await sleep(200);
    skipM.mainFocused = await page.evaluate(() => document.activeElement.id === 'main');
    check('M11.4 skip-link na telefonie: Tab → widoczny link, Enter → fokus w #main',
      skipM.present && skipM.isSkip && skipM.rectTop >= 0 && skipM.mainFocused, JSON.stringify(skipM));
  } catch (e) { console.log('💥 ' + e.message); failed++; }

  await browser.close(); server.kill();
  const ok = results.filter(r => r.ok).length;
  console.log('\n────────────────────────────');
  console.log(`MOBILNE: ${ok}/${results.length} zdanych` + (failed ? ` · ❌ ${failed}` : ' · WSZYSTKO ZDANE 🎉'));
  process.exit(failed ? 1 : 0);
})();
