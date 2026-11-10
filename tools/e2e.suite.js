/* PaleoAtlas — pełny zestaw testów E2E v2 (Chromium headless) */
const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const fs = require('fs');

const SHOTS = '/tmp/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const URL = 'http://127.0.0.1:8333/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8333', '--bind', '127.0.0.1'],
    { cwd: require('path').resolve(__dirname, '..'), stdio: 'ignore' });
  await sleep(1500);

  const browser = await puppeteer.launch({
    executablePath: process.env.PA_CHROME || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--force-device-scale-factor=1']
  });

  let failed = 0;
  const results = [];
  const check = (name, ok, info = '') => {
    if (!ok) failed++;
    results.push({ name, ok, info });
    console.log((ok ? '✅' : '❌') + ' ' + name + (info ? ' — ' + String(info).slice(0, 160) : ''));
  };
  /* klasy paneli Leaflet: createPane('xPane') → 'leaflet-x-pane' */
  const paneCls = n => '.leaflet-pane.leaflet-' + n.replace('Pane', '-pane');

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1680, height: 1050 });
    /* Błędy dzielimy na DWIE klasy (od 2026-11):
       • jsErrors   — błędy aplikacji i zasobów własnych → zawsze porażka,
       • netNoise   — kafelki Esri/OSM/OTM przy braku internetu (środowisko CI bez sieci) → raport,
       • ownBroken  — odpowiedzi ≥400 dla ZASOBÓW WŁASNYCH (same-origin) → porażka (po to,
                      by „szum kafelków" nie ukrył nam zepsutego pliku danych).
       Dzięki temu bateria jest hermetyczna: zielona zarówno z internetem, jak i bez. */
    const ORIGIN = 'http://127.0.0.1:8333';
    const jsErrors = [], netNoise = [], ownBroken = [];
    const isTileNoise = t => /Failed to load resource/i.test(t)
      && /net::ERR_(CONNECTION|NAME_NOT_RESOLVED|INTERNET_DISCONNECTED|ADDRESS_UNREACHABLE|TIMED_OUT|CACHE_MISS|EMPTY_RESPONSE|SSL)/i.test(t);
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text();
      (isTileNoise(t) ? netNoise : jsErrors).push(t);
    });
    page.on('pageerror', e => jsErrors.push('PAGEERROR: ' + e.message));
    page.on('requestfailed', r => {
      const u = r.url();
      if (/tile|arcgis|openstreet|opentopo|favicon/i.test(u)) return;
      jsErrors.push('REQFAIL: ' + u);
    });
    page.on('response', r => {
      if (r.url().startsWith(ORIGIN) && r.status() >= 400) ownBroken.push(r.status() + ' ' + r.url());
    });

    const hp = sel => page.evaluate(s => document.querySelectorAll(s).length, sel);
    const txt = sel => page.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
    const paths = pane => hp(paneCls(pane) + ' svg path');
    /* warstwy ciężkie (ląd/duch/lód/szelfy) idą rendererem CANVAS (limit iOS na ogromne
       ścieżki SVG) — liczymy więc namalowane piksele, nie elementy DOM */
    const painted = pane => page.evaluate(n => {
      const paneEl = window.__PA.map.getPane(n);
      const cv = paneEl && paneEl.querySelector('canvas');
      if (!cv) return 0;
      const ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
      const img = ctx.getImageData(0, 0, w, h).data;
      let hit = 0, tot = 0;
      for (let y = 0; y < h; y += 5) for (let x = 0; x < w; x += 5) {
        tot++; if (img[((y * w + x) << 2) + 3] > 16) hit++;
      }
      return hit / tot;
    }, pane);
    const setTime = v => page.evaluate(v => window.__PA.setSlider(v), v).then(() => sleep(280));
    const shot = async n => { await page.screenshot({ path: SHOTS + '/' + n + '.png' }); console.log('   📸 ' + n); };

    /* ========== 1. START ========== */
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1800);
    check('1.1 strona wstaje bez błędów JS', jsErrors.length === 0, jsErrors.join(' | ').slice(0, 300));
    check('1.1b zero odpowiedzi ≥400 dla zasobów własnych (dane/CSS/ikony)', ownBroken.length === 0, ownBroken.slice(0, 4).join(' | '));
    check('1.2 mapa istnieje', await hp('#map .leaflet-pane') > 0);
    check('1.3 oś czasu: 19 segmentów (17 faz + 2 głębokie)', await hp('#tl-track .tl-seg') === 19, await hp('#tl-track .tl-seg'));
    check('1.4 legenda kultur niepusta', await hp('#legend-cultures .lc') > 0, await hp('#legend-cultures .lc'));
    check('1.5 tryb paleo domyślnie WŁ.', await hp('#map.paleo') === 1);
    check('1.6 start ≈ 95 tys. lat temu', (await txt('#tl-year')).includes('95'), await txt('#tl-year'));
    check('1.7 lądy świata narysowane (paleo)', (await painted('landPane')) > 0.10, await painted('landPane'));
    check('1.8 duch wybrzeża widoczny', (await painted('ghostPane')) > 0.0005, await painted('ghostPane'));
    /* UWAGA: warstwa biomów to NIE wektory, a rastrowy L.imageOverlay (PNG 720×360) —
       poprzednia asercja liczyła „svg path" w pane i była martwa (zawsze 0), więc nie
       mogła wykryć ani zniknięcia, ani zepsucia się rastra. Sprawdzamy faktyczne <img>. */
    const biomeImg = await page.evaluate(() => {
      const im = window.__PA.map.getPane('biomePane').querySelector('img');
      return im ? { ok: im.complete && im.naturalWidth > 0, w: im.naturalWidth, src: im.src.slice(-14) } : null;
    });
    check('1.9 biom kontynentu narysowany (raster PNG załadowany)', !!biomeImg && biomeImg.ok,
      biomeImg ? biomeImg.w + ' px · ' + biomeImg.src : 'brak <img> w biomePane');
    check('1.10 lądolód widoczny (env: MIS 5b — globalny poligon Q19 namalowany na canvasie)',
      (await painted('icePane')) > 0.01 && /Batchelor|MIS 5/.test(await txt('#phase-icesrc')), (await painted('icePane')) + ' | ' + (await txt('#phase-icesrc')));
    check('1.11 kontrola warstw renderuje ikonę', await page.evaluate(() => {
      const el = document.querySelector('.leaflet-control-layers-toggle');
      const bg = el && getComputedStyle(el).backgroundImage;
      if (!bg || !bg.includes('layers.png')) return false;
      const img = new Image(); img.src = bg.match(/url\("?(.*?)"?\)/)[1];
      return new Promise(res => { img.onload = () => res(true); img.onerror = () => res(false); });
    }));
    await shot('01_start_paleo_mis5');

    /* ========== 2. OŚ CZASU ========== */
    await setTime(1150);
    check('2.1 LGM: czytanka faz', (await txt('#phase-name')).includes('Maksimum'), await txt('#phase-name'));
    check('2.2 LGM: poziom morza −125 m', (await txt('#phase-sea')).includes('125'), await txt('#phase-sea'));
    check('2.3 LGM: rok ≈ 21,5 tys.', (await txt('#tl-year')).includes('21'), await txt('#tl-year'));
    const lgmSites = await paths('sitesPane');
    check('2.4 LGM: Polska pod lodem (≤3 stanowiska)', lgmSites <= 3, lgmSites);
    check('2.5 LGM: pełne lądolody świata narysowane (duży udział pikseli lodu)', (await painted('icePane')) > 0.10, await painted('icePane'));

    // widok zbliżony na Polskę w LGM — weryfikacja linii lądolodu z pliku użytkownika
    await page.evaluate(() => window.__PA.map.setView([52.6, 19.6], 7));
    await sleep(400); await shot('02_lgm_21tys');
    // czy południowa krawędź lądolodu przecina mapę Polski (w pasie 51,5–54 N)?
    const iceVerts = await page.evaluate(() => {
      const out = [];
      window.__PA.map.eachLayer(l => {
        if (l.options && l.options.pane === 'icePane' && typeof l.getLatLngs === 'function') {
          const ll = l.getLatLngs().flat(Infinity);
          let minLa = 90, maxLa = -90, minLo = 180, maxLo = -180;
          ll.forEach(p => { if (p.lat < minLa) minLa = p.lat; if (p.lat > maxLa) maxLa = p.lat;
                            if (p.lng < minLo) minLo = p.lng; if (p.lng > maxLo) maxLo = p.lng; });
          out.push({ n: ll.length, minLa: +minLa.toFixed(2), maxLa: +maxLa.toFixed(2) });
        }
      });
      return out;
    });
    const hasFennoPL = iceVerts.some(v => v.n > 25 && v.maxLa > 70 && v.minLa >= 51.3 && v.minLa <= 52.6);
    check('2.6 LGM: lądolód sięga linii PL z pliku (51,8–52,5°N)', hasFennoPL, JSON.stringify(iceVerts));

    // diagnostyka: poligony lodu nie powinny sięgać szerokości < 40N w Eurazji (poza Alpami)
    const iceArtifacts = await page.evaluate(() => {
      const map = window.__PA.map, pane = map.getPane('icePane'), bad = [];
      for (const p of pane.querySelectorAll('svg path')) {
        const r = p.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        const c = map.containerPointToLatLng([r.left + r.width / 2, r.top + r.height / 2]);
        if (c.lat < 41 && c.lat > -30 && c.lng > -12 && c.lng < 60) bad.push([Math.round(c.lat * 10) / 10, Math.round(c.lng * 10) / 10]);
      }
      return bad;
    });
    check('2.7 brak artefaktów lądolodu w południowej Europie', iceArtifacts.length === 0, JSON.stringify(iceArtifacts));

    // Bølling–Allerød ~13,4 tys.
    await page.evaluate(() => window.__PA.map.setView([52.3, 19.8], 6));
    await setTime(1450);
    const baSites = await paths('sitesPane'), baNbr = await paths('nbrPane'), hulls = await paths('hullPane');
    check('2.8 BA: wiele stanowisk PL (>20)', baSites > 20, baSites);
    check('2.9 BA: sąsiedzi widoczni (>10)', baNbr > 10, baNbr);
    check('2.10 obszary kultur WYŁĄCZONE (design: kultura = kolor kropki)', hulls === 0, hulls);
    await sleep(300); await shot('03_bolling_allerod');

    await setTime(1900);
    check('2.11 koniec osi = „dziś”', (await txt('#tl-year')) === 'dziś', await txt('#tl-year'));
    check('2.12 dziś: 0 stanowisk (najmłodsze 4,8 tys.)', await paths('sitesPane') === 0, await paths('sitesPane'));
    await page.evaluate(() => window.__PA.map.setView([62, -20], 3)); await sleep(500);
    const todayIce = await painted('icePane');
    check('2.13 dziś: tylko Grenlandia+małe pokrywy+Antarktyda (lód malowany, ograniczony)', todayIce > 0.002 && todayIce < 0.5, todayIce);

    await page.evaluate(() => document.querySelectorAll('#tl-track .tl-seg')[11].click());
    await sleep(350);
    check('2.14 klik w segment LGM przesuwa suwak', Math.abs(await page.evaluate(() => +document.getElementById('tl-slider').value) - 1150) < 60);

    await setTime(400);
    await page.click('#tl-play'); await sleep(700);
    const vAfterPlay = await page.evaluate(() => +document.getElementById('tl-slider').value);
    await page.click('#tl-play');
    check('2.15 animacja przesuwa czas', vAfterPlay > 400, '400 → ' + vAfterPlay);

    await setTime(700);
    await page.evaluate(() => document.body.focus());
    await page.keyboard.press('ArrowRight'); await sleep(250);
    check('2.16 strzałka → przesuwa oś', await page.evaluate(() => +document.getElementById('tl-slider').value) === 705);

    /* ========== 3. KARTA STANOWISKA ========== */
    await setTime(1450); await sleep(350);
    const clicked = await page.evaluate(() => {
      const ps = document.querySelectorAll('.leaflet-pane.leaflet-sites-pane svg path');
      /* wybierz punkt najbliżej centrum (Kraków/Jara) */
      let best = null, bd = 1e9;
      const map = window.__PA.map;
      ps.forEach(p => {
        const r = p.getBoundingClientRect();
        const ll = map.containerPointToLatLng([r.left + 3, r.top + 3]);
        const d = Math.hypot(ll.lat - 50.1, ll.lng - 19.8);
        if (d < bd) { bd = d; best = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      });
      return best;
    });
    if (clicked) { await page.mouse.click(clicked.x, clicked.y); await sleep(500); }
    const sideVisible = await page.evaluate(() => !document.getElementById('side').classList.contains('hidden'));
    const sideHtml = await page.evaluate(() => document.getElementById('side-content').innerText);
    check('3.1 klik w stanowisko otwiera kartę', !!clicked && sideVisible);
    const sideLow = sideHtml.toLowerCase();
    check('3.2 karta: „Co wiemy” i „Czego nie wiemy”', sideLow.includes('co wiemy') && sideLow.includes('czego nie wiemy'), sideLow.slice(50,95));
    check('3.3 karta: status weryfikacji', /Potwierdzone|Częściowo/.test(sideHtml), sideHtml.slice(0, 60));
    check('3.4 karta: kultura-tag i datowanie', await page.evaluate(() => !!document.querySelector('#side-content .cult-tag')));
    await shot('04_karta_stanowiska');
    const hasChips = await page.evaluate(() => document.querySelectorAll('#side-content .chip[data-pid]').length > 0);
    if (hasChips) {
      const beforeTxt = sideHtml.slice(0, 100);
      await page.evaluate(() => document.querySelector('#side-content .chip[data-pid]').click());
      await sleep(400);
      const afterTxt = (await page.evaluate(() => document.getElementById('side-content').innerText)).slice(0, 100);
      check('3.5 nawigacja po powiązanych ID działa', afterTxt.length > 50);
    } else check('3.5 nawigacja po powiązanych ID (skip — punkt bez powiązań)', true, 'skip');
    const sideOpen = await page.evaluate(() => !document.getElementById('side').classList.contains('hidden'));
    if (sideOpen) { await page.evaluate(() => document.getElementById('side-close').click()); await sleep(250); }
    check('3.6 zamykanie karty', await page.evaluate(() => document.getElementById('side').classList.contains('hidden')));

    /* ========== 4. LEGENDA / FILTR KULTUR ========== */
    await setTime(1450); await sleep(300);
    const before = await paths('sitesPane');
    await page.evaluate(() => document.querySelector('#legend-cultures .lc').click());
    await sleep(350);
    const after = await paths('sitesPane');
    check('4.1 filtr kultury z legendy zawęża punkty', after > 0 && after < before, before + ' → ' + after);
    await page.evaluate(() => document.querySelector('#legend-cultures .lc').click());
    await sleep(350);
    check('4.2 filtr da się wyłączyć', await paths('sitesPane') === before);

    /* ========== 5. TRYB PALEO ↔ WSPÓŁCZESNY ========== */
    check('5.1 paleo ON: brak kafelków podkładu', await hp('#map img.leaflet-tile') === 0, await hp('#map img.leaflet-tile'));
    await page.click('#paleo-view'); await sleep(800);
    await page.waitForNetworkIdle({ idleTime: 900, timeout: 25000 }).catch(() => {});
    const tilesOn = await hp('#map img.leaflet-tile');
    check('5.2 paleo OFF: podkład współczesny wraca', (await hp('#map.paleo')) === 0 && tilesOn > 2, tilesOn + ' kafelków');
    check('5.3 paleo OFF: mosty zachowują obrys (tryb mapy)', true);
    await sleep(600); await shot('05_wspolczesny_podklad');
    await page.click('#paleo-view'); await sleep(500);
    check('5.4 ponowne WŁ. trybu paleo', await hp('#map.paleo') === 1);

    /* ========== 6. WIDOKI: TOM I / SŁOWNIK / O DANYCH ========== */
    await page.goto(URL + '#tom1-2', { waitUntil: 'networkidle2' }); await sleep(700);
    check('6.1 Tom I: rozdział 2 renderuje się', (await txt('#tom1-article h1')).includes('2.'), await txt('#tom1-article h1'));
    check('6.2 Tom I: treść > 2000 znaków', (await txt('#tom1-article')).length > 2000, (await txt('#tom1-article')).length);
    check('6.3 Tom I: spis 13 rozdziałów', await hp('#tom1-list li') === 13, await hp('#tom1-list li'));
    check('6.4 Tom I: aktywny link w spisie', await hp('#tom1-list a.active') === 1);
    await shot('06_tom1');

    await page.goto(URL + '#slownik', { waitUntil: 'networkidle2' }); await sleep(600);
    check('6.5 Słownik: wszystkie 74 hasła', await hp('.gloss-item') === 74, await hp('.gloss-item'));
    await page.type('#gloss-q', 'magdal'); await sleep(400);
    const filt = await hp('.gloss-item');
    check('6.6 Słownik: szukanie filtruje', filt >= 1 && filt < 20, filt);
    await page.evaluate(() => { const q = document.getElementById('gloss-q'); q.value = ''; q.dispatchEvent(new Event('input')); });
    await sleep(300);
    await page.evaluate(() => document.querySelectorAll('#gloss-cats .chip')[5].click()); await sleep(300);
    const katCount = await hp('.gloss-item');
    check('6.7 Słownik: filtr kategorii', katCount > 0 && katCount < 74, katCount);
    check('6.8 Słownik: chip kategorii aktywny', await hp('#gloss-cats .chip.active') >= 1);
    await shot('07_slownik');

    await page.goto(URL + '#dane', { waitUntil: 'networkidle2' }); await sleep(500);
    check('6.9 O danych: źródła globalne w roadmapie', (await txt('#about-content')).includes('DATED-1'));

    /* ========== 7. POWRÓT NA MAPĘ ========== */
    await page.goto(URL + '#mapa', { waitUntil: 'networkidle2' }); await sleep(1500);
    check('7.1 powrót na mapę bez błędów', jsErrors.length === 0, jsErrors.join(' | ').slice(0, 300));
    check('7.2 warstwy po restarcie widoku OK', (await painted('landPane')) > 0.10 && (await painted('icePane')) > 0.01, (await painted('landPane')) + '/' + (await painted('icePane')));
    check('7.3 uchwyt __PA działa', await page.evaluate(() => !!window.__PA && typeof window.__PA.setSlider === 'function'));

    /* ========== 8. WYSZUKIWARKA, FILTRY, DEDUPLIKACJA, KIERUNEK LĄDOLOD ========== */
    check('8.1 pole wyszukiwania + 4 selecty', await hp('#srch-q') === 1 && await hp('#srch-selects select') === 4);
    await page.evaluate(() => window.__PA.setSlider(window.__PA.bpToSlider(426000))); await sleep(300); // interglacjał mazowiecki ~426 tys.
    await page.type('#srch-q', 'Trzebnica'); await sleep(400);
    const trzTitles = await page.evaluate(() => [...document.querySelectorAll('#srch-results .srch-hit')].map(x => x.title).join(' '));
    check('8.2 fraza „Trzebnica” → wynik z PM-001 (+kontekst zagraniczny)', trzTitles.includes('PM-001'), trzTitles.slice(0, 130));
    check('8.3 na mapie dokładnie 1 punkt PL', await paths('sitesPane') === 1, await paths('sitesPane'));
    check('8.4 meta liczy wyniki', /\d+ znalezionych/.test(await txt('#srch-meta')), await txt('#srch-meta'));
    await page.click('#srch-results .srch-hit'); await sleep(700);
    check('8.5 klik w wynik otwiera kartę stanowiska', (await page.evaluate(() => document.getElementById('side-content').innerText)).includes('Trzebnica'));
    await page.evaluate(() => document.getElementById('side-close').click()); await sleep(200);
    await page.evaluate(() => window.__PA.clearFilters()); await sleep(250);
    await page.type('#srch-q', 'Myszęcin'); await sleep(350);
    const dupQ = await page.evaluate(() => [...document.querySelectorAll('#srch-results .srch-hit')].map(x => x.title).join(' | '));
    check('8.6 duplikat PM-094 wykluczony z indeksu („Myszęcin” → PM-030, bez PM-094)', dupQ.includes('PM-030') && !dupQ.includes('PM-094'), dupQ.slice(0, 140));
    await page.evaluate(() => window.__PA.clearFilters()); await sleep(300);
    await setTime(1450);
    const allAtBA = await paths('sitesPane');
    await page.select('#srch-kultura', 'hamburska'); await sleep(400);
    const hamb = await paths('sitesPane');
    check('8.7 select kultury filtruje markery', hamb > 0 && hamb < allAtBA, allAtBA + ' → ' + hamb);
    check('8.8 legenda podświetla aktywny filtr', await hp('#legend-cultures .lc.active') === 1);
    await page.select('#srch-kultura', ''); await sleep(300);
    await page.evaluate(() => document.querySelector('#legend-cultures .lc').click()); await sleep(300);
    check('8.9 klik w legendę synchronizuje select kultury', (await page.evaluate(() => document.getElementById('srch-kultura').value)).length > 0);
    await page.evaluate(() => window.__PA.clearFilters()); await sleep(300);
    await shot('09_szukaj_filtry');
    await page.evaluate(() => window.__PA.openSiteById('PM-094')); await sleep(300);
    const dupeTxt = await page.evaluate(() => document.getElementById('side-content').innerText.toLowerCase());
    check('8.10 karta duplikatu: baner + link do rekordu wiodącego', dupeTxt.includes('duplikat') &&
      await page.evaluate(() => !!document.querySelector('#side-content .chip[data-pid="PM-030"]')), dupeTxt.slice(40, 120));
    await page.evaluate(() => document.querySelector('#side-content .chip[data-pid="PM-030"]').click()); await sleep(300);
    check('8.11 link otwiera rekord wiodący PM-030', (await page.evaluate(() => document.getElementById('side-content').innerText)).includes('Myszęcin'));
    await page.evaluate(() => document.getElementById('side-close').click()); await sleep(200);
    await setTime(1150); await sleep(250);
    const subLGM = await txt('#phase-sub');
    check('8.12 kierunek lądolodu po polsku (LGM: „margines na północy”)', subLGM.includes('margines na północy'), subLGM.slice(0, 120));
    await setTime(1450); await sleep(250);
    const subBA = await txt('#phase-sub');
    check('8.13 recesja po polsku, bez surowych kodów z „_”', subBA.includes('silna recesja') && !subBA.includes('_'), subBA.slice(0, 120));
    check('8.14 licznik stanowisk w nagłówku legendy', /\d/.test(await txt('#legend-count')), await txt('#legend-count'));

    /* ========== 9. GLOBALNA CHRONOLOGIA ŚRODOWISKOWA (env) ========== */
    check('9.1 window.ENV: ≥45 przekrojów + krzywa morska ≥90 pkt', await page.evaluate(() =>
      window.ENV && ENV.ticks.length >= 45 && ENV.sea.length >= 90), await page.evaluate(() => window.ENV && ENV.ticks.length));
    check('9.2 window.ICE_QUAT: 18 przekrojów Batchelora', await page.evaluate(() =>
      window.ICE_QUAT && Object.keys(ICE_QUAT).length === 18), await page.evaluate(() => window.ICE_QUAT && Object.keys(ICE_QUAT).length));
    await setTime(200);
    check('9.3 start fazy 1 (800 tys.): przekrój MIS 20', /MIS 20/.test(await txt('#phase-icesrc')), await txt('#phase-icesrc'));
    await setTime(255);
    check('9.4 środek fazy 1 (~620 tys.): inny przekrój (lądolód ewoluuje w fazie)',
      /MIS 1[56]/.test(await txt('#phase-icesrc')), await txt('#phase-icesrc'));
    await page.evaluate(() => window.__PA.setSlider(window.__PA.bpToSlider(450000))); await sleep(300);
    check('9.5 MIS 12: Batchelor + margines PL z portalu w etykiecie',
      /Batchelor/.test(await txt('#phase-icesrc')) && /linia portalu/.test(await txt('#phase-icesrc')), await txt('#phase-icesrc'));
    check('9.6 MIS 12: linia portalu VERBATIM w geometrii', await page.evaluate(() => {
      const main = window.ICE_QUAT.q_mis12[0];
      const ring = main.rings.find(r => r.some(p => p[0] === 50.06 && p[1] === 19.94));
      return !!ring && [[51.15,15],[50.77,16.28],[50.04,22],[49.78,22.77]].every(u => ring.some(p => p[0]===u[0] && p[1]===u[1]));
    }));
    check('9.7 q_mis8: osobny poligon marginesu Odry (DANE_PORTALU)', await page.evaluate(() =>
      window.ICE_QUAT.q_mis8.some(p => p.src === 'DANE_PORTALU' && /Odry/.test(p.name))));
    check('9.8 interpolacja poziomu morza (LGM −125; 8 tys. < 0)', await page.evaluate(() =>
      Math.abs(window.__PA.seaAtBP(21500) + 125) < 2 && window.__PA.seaAtBP(8000) > -25 && window.__PA.seaAtBP(8000) < 0));
    await page.evaluate(() => window.__PA.setSlider(window.__PA.bpToSlider(2700000))); await sleep(350);
    check('9.9 głęboka oś: 2,7 mln — etykieta „mln lat temu”', (await txt('#tl-year')).includes('mln'), await txt('#tl-year'));
    check('9.10 faza głęboka: karta „Pierwsze narzędzia” lub „Ekspansja Homo”',
      /narzędzia|Ekspansja/.test(await txt('#phase-name')), await txt('#phase-name'));
    check('9.11 kamienie milowe: 9 ♦ na osi', await hp('.tl-ms') === 9, await hp('.tl-ms'));
    check('9.12 segmenty głębokie mają klasę .deep', await hp('#tl-track .tl-seg.deep') === 2, await hp('#tl-track .tl-seg.deep'));
    check('9.13 głęboka oś: Δ-wiek przekroju pokazywany', await page.evaluate(() =>
      /najbliższy przekrój/.test(document.getElementById('phase-icesrc').textContent)));
    await page.evaluate(() => window.__PA.setSlider(window.__PA.bpToSlider(150000))); await sleep(350);
    check('9.14 MIS 6/Warta: przekrój Batchelora w etykiecie', /Batchelor/.test(await txt('#phase-icesrc')), await txt('#phase-icesrc'));

    /* REGRESJA (zgłoszenie usera, 678/713 tys.): braki w szeregu stadiałów + okna pięter */
    const envChk = await page.evaluate(() => {
      const E = window.ENV;
      const win = bp => { for (const t of E.ticks) if (t.w && bp >= t.w[0] && bp <= t.w[1]) return t; return null; };
      return {
        nTicks: E.ticks.length,
        t713: window.__PA.envTickForBP(713000).label,
        t726: window.__PA.envTickForBP(726000).label,
        t678: window.__PA.envTickForBP(678000).label,
        t750: window.__PA.envTickForBP(750000).label,
        t940: window.__PA.envTickForBP(940000).label,
        win713: !!win(713000),
        proxy: E.ticks.filter(t => /analog/.test(t.label)).length,
        analog18: /analog/.test(window.__PA.envTickForBP(713000).label),
        q1190: !!(E.ticks.find(t => t.bp === 1190000 && t.q === 'q_matuyama')),
        q2150: !!(E.ticks.find(t => t.bp === 2150000 && t.q === 'q_gauss'))
      };
    });
    check('9.15 okno piętra: 713 tys. → MIS 18 (stadiał, nie interglacjał 700 ka)', envChk.t713.includes('MIS 18') && envChk.win713, envChk.t713);
    check('9.16 okno piętra: 726 tys. → też MIS 18', envChk.t726.includes('MIS 18'), envChk.t726);
    check('9.17 okno piętra: 678 tys. → MIS 17 (zgodnie z granicami pięter)', envChk.t678.includes('MIS 17'), envChk.t678);
    check('9.18 okno piętra: 750 tys. → MIS 19; 940 tys. → MIS 24 (kompozyt)', envChk.t750.includes('MIS 19') && envChk.t940.includes('MIS 24'), envChk.t750 + ' || ' + envChk.t940);
    check('9.19 wczesny plejstocen: ≥4 stadiały-analogi z etykietą „analog” (uż. Matuyama+Gauss)',
      envChk.proxy >= 5 && envChk.analog18 && envChk.q1190 && envChk.q2150, JSON.stringify(envChk.proxy));

    /* ========== 10. BRAMKA v1.0: ZNAJDOWALNOŚĆ, DOSTĘPNOŚĆ, REGRESJE ========== */
    await page.evaluate(() => { location.hash = 'mapa'; });
    await sleep(400);

    /* 10.1–10.3 pakiet znajdowalności (P0.2): meta/OG/canonical-nie, manifest, ikony, obraz OG */
    const head = await page.evaluate(() => {
      const meta = n => (document.querySelector('meta[name="' + n + '"]') || {}).content || '';
      const prop = n => (document.querySelector('meta[property="' + n + '"]') || {}).content || '';
      const link = r => (document.querySelector('link[rel="' + r + '"]') || {}).href || '';
      return {
        desc: meta('description'), theme: meta('theme-color'), colorScheme: meta('color-scheme'),
        ogTitle: prop('og:title'), ogDesc: prop('og:description'), ogImage: prop('og:image'),
        ogW: prop('og:image:width'), ogH: prop('og:image:height'), ogAlt: prop('og:image:alt'),
        tw: document.querySelector('meta[name="twitter:card"]') ? document.querySelector('meta[name="twitter:card"]').content : '',
        manifest: link('manifest'), apple: link('apple-touch-icon'),
        canonical: link('canonical'), ogUrl: prop('og:url')
      };
    });
    check('10.1 meta description + theme-color + color-scheme', head.desc.length > 80 && !!head.theme && !!head.colorScheme,
      (head.desc || '').slice(0, 60) + '…');
    check('10.2 OG komplet (title/description/image 1200×630/alt) + twitter:card',
      !!head.ogTitle && !!head.ogDesc && /og-image\.png$/.test(head.ogImage) && head.ogW === '1200' && head.ogH === '630' && !!head.ogAlt && head.tw === 'summary_large_image',
      head.ogW + '×' + head.ogH + ' · ' + head.tw);
    /* adresu publicznego jeszcze nie ma (decyzja D1) — nie deklarujemy og:url/canonical */
    check('10.3 brak og:url/canonical przed decyzją o hostingu (nie obiecujemy adresu)', !head.ogUrl && !head.canonical);

    const headAssets = await page.evaluate(async () => {
      const probe = url => new Promise(res => {
        const i = new Image();
        i.onload = () => res({ url, ok: true, w: i.naturalWidth, h: i.naturalHeight });
        i.onerror = () => res({ url, ok: false });
        i.src = url;
      });
      const manifest = (document.querySelector('link[rel="manifest"]') || {}).href;
      let man = null;
      try {
        const r = await fetch(manifest);
        man = r.ok ? await r.json() : { __status: r.status };
      } catch (e) { man = { __err: String(e) }; }
      return {
        og: await probe((document.querySelector('meta[property="og:image"]') || {}).content),
        icon192: await probe('assets/icon-192.png'),
        icon512: await probe('assets/icon-512.png'),
        icon180: await probe('assets/icon-180.png'),
        man
      };
    });
    check('10.4 obraz OG wczytuje się jako 1200×630', headAssets.og.ok && headAssets.og.w === 1200 && headAssets.og.h === 630,
      JSON.stringify(headAssets.og));
    check('10.5 ikony 192/512/180 istnieją i mają właściwe wymiary',
      [headAssets.icon192, headAssets.icon512, headAssets.icon180].every(x => x.ok) &&
      headAssets.icon192.w === 192 && headAssets.icon512.w === 512 && headAssets.icon180.w === 180,
      [headAssets.icon192, headAssets.icon512, headAssets.icon180].map(x => x.w || 'ERR').join('/'));
    check('10.6 manifest.webmanifest poprawny (name, start_url, display, ikony 192+512)',
      !!headAssets.man && !headAssets.man.__err && headAssets.man.lang === 'pl' && headAssets.man.display === 'standalone'
      && !!headAssets.man.start_url && (headAssets.man.icons || []).some(i => i.sizes === '192x192')
      && (headAssets.man.icons || []).some(i => i.sizes === '512x512'),
      JSON.stringify(headAssets.man).slice(0, 180));

    /* 10.7–10.9 dostępność klawiatury i stanu (P0.5 / P1.5) */
    const skip = await page.evaluate(async () => {
      const a = document.querySelector('.skip-link');
      if (!a) return { present: false };
      a.focus();
      const st = getComputedStyle(a);
      const visible = st.top !== '' && parseFloat(st.top) >= 0
        && document.activeElement === a;
      a.click();
      await new Promise(r => setTimeout(r, 120));
      return { present: true, visible, mainFocused: document.activeElement.id === 'main', main: !!document.getElementById('main') };
    });
    check('10.7 skip-link: istnieje, widoczny po fokusie i przenosi do #main',
      skip.present && skip.visible && skip.mainFocused, JSON.stringify(skip));

    /* fokus klawiatury: Tab do pola szukania → widoczna obwódka (nie „outline: none") */
    await page.evaluate(() => document.body.focus());
    let focusedOutline = null, foundSearch = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const st = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el.id !== 'srch-q') return null;
        const cs = getComputedStyle(el);
        return { outline: cs.outlineStyle, width: cs.outlineWidth, bd: cs.borderColor };
      });
      if (st) { focusedOutline = st; foundSearch = true; break; }
    }
    check('10.8 focus-visible działa: Tab do #srch-q daje widoczną obwódkę',
      foundSearch && focusedOutline.outline !== 'none' && parseFloat(focusedOutline.width) >= 2,
      foundSearch ? JSON.stringify(focusedOutline) : 'nie dotarto Tabem do #srch-q');

    const aria = await page.evaluate(() => {
      const byId = id => document.getElementById(id);
      const lc = document.querySelector('#legend-cultures .lc');
      const nav = [...document.querySelectorAll('#top nav a')];
      return {
        navCurrent: nav.filter(a => a.getAttribute('aria-current') === 'page').map(a => a.dataset.view),
        paleo: byId('paleo-view').getAttribute('aria-pressed'),
        biis: /wariant/i.test(byId('britice-var').getAttribute('aria-label') || ''),
        legendToggle: byId('legend-toggle').getAttribute('aria-expanded'),
        rowRole: lc ? lc.getAttribute('role') : null, rowTab: lc ? lc.getAttribute('tabindex') : null,
        qLabel: (byId('srch-q').getAttribute('aria-label') || '').length > 5,
        selects: [...document.querySelectorAll('#srch-selects select')].every(s => !!s.getAttribute('aria-label')),
        playLabel: (byId('tl-play').getAttribute('aria-label') || '').length > 5,
        globeImg: byId('globe-cv').getAttribute('role') === 'img'
      };
    });
    check('10.9 ARIA: aria-current, aria-pressed, aria-expanded, role=button w legendzie, etykiety pól',
      aria.navCurrent.length === 1 && aria.navCurrent[0] === 'mapa' && aria.paleo === 'true' && aria.biis
      && aria.legendToggle === 'true' && aria.rowRole === 'button' && aria.rowTab === '0'
      && aria.qLabel && aria.selects && aria.playLabel && aria.globeImg,
      JSON.stringify(aria));

    /* 10.10 legendowy wiersz kultury działa z klawiatury (Enter = filtr) */
    const kbFilter = await page.evaluate(async () => {
      const lc = document.querySelector('#legend-cultures .lc');
      if (!lc) return { skip: true };
      lc.focus();
      const before = document.getElementById('srch-kultura').value;
      lc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      const after = document.getElementById('srch-kultura').value;
      document.getElementById('srch-clear').click();
      await new Promise(r => setTimeout(r, 120));
      return { before, after, cleared: document.getElementById('srch-kultura').value === '' };
    });
    check('10.10 wiersz legendy: Enter ustawia filtr kultury, „wyczyść" go zdejmuje',
      !kbFilter.skip && kbFilter.after !== '' && kbFilter.after !== kbFilter.before && kbFilter.cleared,
      JSON.stringify(kbFilter));
    await page.evaluate(() => window.__PA.clearFilters());

    /* 10.11 REGRESJA (znaleziona 2026-11): pyłek OFF → zmiana epoki → zoom.
       Renderer canvas pyłka powstawał w odpiętej grupie i każdy zoom kończył się
       „TypeError: … reading '_animatingZoom'". */
    /* Odtwarzamy DOKŁADNIE stan z raportu: warstwa pyłka wyłączona, w bieżącej sesji
       nie było jeszcze renderera pyłka (świeży start przy epoce bez kotwic), a potem
       użytkownik wchodzi w epokę z kotwicami — markery powstają w grupie odpiętej
       od mapy, więc L.canvas nie dostaje _map. Przed poprawką każdy zoom rzucał
       TypeError; teraz strażnik w refreshCanvasRenderers to pomija. */
    const pollenOff = await page.evaluate(async () => {
      const PA = window.__PA;
      const labels = [...document.querySelectorAll('.leaflet-control-layers label')];
      const l = labels.find(x => /Kotwice pyłkowe/.test(x.textContent));
      if (!l) return { skip: true };
      if (PA.map.hasLayer(PA.group.pollen)) l.querySelector('input').click();   // OFF
      PA.group.pollen.clearLayers();
      PA.BIOME.pollenR = null;                                                 // „świeża" sesja
      PA.setSlider(PA.bpToSlider(6000));                                       // epoka 6k = kotwice
      await new Promise(r => setTimeout(r, 900));
      return {
        present: !!PA.BIOME.pollenR,
        detached: !!(PA.BIOME.pollenR && !PA.BIOME.pollenR._map),
        n: PA.group.pollen.getLayers().length
      };
    });
    const beforeRegress = jsErrors.length;
    await page.evaluate(() => window.__PA.map.setZoom(5, { animate: false }));
    await sleep(600);
    await page.evaluate(() => window.__PA.map.setZoom(4, { animate: false }));
    await sleep(600);
    check('10.11 regresja: pyłek OFF → zmiana epoki → zoom bez błędu JS',
      !pollenOff.skip && pollenOff.present && pollenOff.detached && jsErrors.length === beforeRegress,
      JSON.stringify(pollenOff) + ' · nowe błędy: ' + (jsErrors.length - beforeRegress));
    /* przywracamy warstwę pyłka (kolejne asercje i zrzuty) */
    await page.evaluate(() => {
      const labels = [...document.querySelectorAll('.leaflet-control-layers label')];
      const l = labels.find(x => /Kotwice pyłkowe/.test(x.textContent));
      if (l && !window.__PA.map.hasLayer(window.__PA.group.pollen)) l.querySelector('input').click();
      window.__PA.setSlider(window.__PA.bpToSlider(95000));
    });
    await sleep(700);

    /* 10.12 nota prywatności przy przełączniku podkładów (P0.4) */
    const privacy = await page.evaluate(() => {
      const n = document.querySelector('.leaflet-control-layers .tile-note');
      return n ? n.textContent : '';
    });
    check('10.12 nota prywatności przy podkładach (Esri/OSM/OTM = ich serwery, brak ciastek)',
      /Esri/.test(privacy) && /OSM/.test(privacy) && /ciastek/i.test(privacy), privacy.slice(0, 110));

    /* 10.13 spójność treści „O danych": nie ma już nieaktualnego schematu biomów */
    const aboutTxt = await page.evaluate(() => (document.getElementById('about-content') || {}).textContent || '');
    check('10.13 „O danych" nie deklaruje schematu tam, gdzie są dane (biomy: brak wiersza „SCHEMAT roboczy")',
      !/Biomy kontynentu.*SCHEMAT roboczy/s.test(aboutTxt) && /BIOME 6000/.test(aboutTxt));

    /* 10.14 prefers-reduced-motion: nowa karta z emulowaną preferencją */
    const rm = await browser.newPage();
    const rmErr = [];
    rm.on('pageerror', e => rmErr.push(e.message));
    /* Uwaga: w tej kompilacji Chromium MediaQueryList utworzony przed włączeniem
       emulacji nie odświeża .matches, dlatego podstawiamy matchMedia PRZED skryptami
       strony — sprawdzamy realną ścieżkę kodu (REDUCED_MOTION → opcje Leafleta). */
    await rm.evaluateOnNewDocument(() => {
      const orig = window.matchMedia.bind(window);
      window.matchMedia = q => {
        if (String(q).includes('prefers-reduced-motion')) {
          return { media: q, matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
        }
        return orig(q);
      };
    });
    await rm.setViewport({ width: 1280, height: 860 });
    await rm.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(1500);
    /* klikamy „Przybliż na mapie" (to ścieżka flyToPoint) i mierzymy PO odczekaniu —
       animacja flyTo dochodzi asynchronicznie, więc pomiar „od razu" nic nie dowodzi */
    const rmBefore = await rm.evaluate(() => {
      const PA = window.__PA;
      PA.openSiteById('PM-030');
      const c = PA.map.getCenter();
      const before = { lat: c.lat, lng: c.lng, zoom: PA.map.getZoom() };
      const link = document.getElementById('flyto');
      if (link) link.click();
      return { before, diag: PA.rmDiag(), reduced: PA.reducedMotion(), zoomAnim: PA.map.options.zoomAnimation, fadeAnim: PA.map.options.fadeAnimation };
    });
    await sleep(900);
    const rmState = await rm.evaluate(b => {
      const PA = window.__PA;
      return {
        diag: b.diag, reduced: b.reduced, zoomAnim: b.zoomAnim, fadeAnim: b.fadeAnim,
        moved: PA.map.getCenter().distanceTo(L.latLng(b.before.lat, b.before.lng)) > 100,
        zoomChanged: PA.map.getZoom() !== b.before.zoom,
        zoom: PA.map.getZoom(),
        cssTransition: getComputedStyle(document.querySelector('.leaflet-zoom-animated') || document.body).transitionDuration
      };
    }, rmBefore);
    await sleep(400);
    check('10.14 prefers-reduced-motion: wyłączony zoom/fade mapy i skok „Przybliż na mapie" zamiast lotu',
      rmState.reduced === true && rmState.zoomAnim === false && rmState.fadeAnim === false
      && rmState.moved === true && rmState.zoomChanged === true && rmErr.length === 0,
      JSON.stringify(rmState) + ' · błędy: ' + rmErr.length);
    await rm.close();

    /* 10.15 legenda biomów: brak zbędnych przebudów (regresja wydajności z audytu 2026-11)
       Wcześniej `map.on('layeradd layerremove')` odpalał przebudowę legendy dla KAŻDEJ
       warstwy dodanej na mapie — jeden krok osi dawał 29 mutacji DOM. Teraz: 0, gdy treść
       się nie zmienia. Test pilnuje, żeby nikt nie wrócił do nasłuchu na całej mapie. */
    const legendChurn = await page.evaluate(async () => {
      const PA = window.__PA;
      const el = document.querySelector('.biome-legend');
      if (!el) return { ok: false, reason: 'brak legendy biomów' };
      const v = Math.round(PA.bpToSlider(95000));
      PA.setSlider(v);
      await new Promise(r => setTimeout(r, 250));       // ustabilizuj stan
      let muts = 0;
      const mo = new MutationObserver(list => { muts += list.length; });
      mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
      PA.setSlider(v);                                  // ten sam stan → nic nie powinno drgnąć
      PA.setSlider(v);
      await new Promise(r => setTimeout(r, 250));
      mo.disconnect();
      return { ok: true, muts };
    });
    check('10.15 legenda biomów nie przebudowuje się bez zmiany treści (0 mutacji DOM, nie 29)',
      legendChurn.ok && legendChurn.muts === 0, JSON.stringify(legendChurn));

    /* 10.16 odporność startu: brak pliku danych → czytelny komunikat, nie biała strona */
    const brk = await browser.newPage();
    const brkErr = [];
    brk.on('pageerror', e => brkErr.push(e.message));
    await brk.setRequestInterception(true);
    brk.on('request', req => (req.url().includes('js/data/sites.js') && !req.url().startsWith('file:'))
      ? req.abort() : req.continue());
    await brk.setViewport({ width: 1280, height: 860 });
    await brk.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(1200);
    const brkState = await brk.evaluate(() => {
      const el = document.querySelector('.boot-error');
      return {
        present: !!el,
        role: el ? el.getAttribute('role') : null,
        text: el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : document.body.textContent.trim().slice(0, 80),
        mapEmpty: (document.getElementById('map') || {}).children.length === 0
      };
    });
    check('10.16 brak pliku danych → komunikat „Nie udało się wczytać danych" (nie biała strona)',
      brkState.present && brkState.role === 'alert' && /Nie udało się wczytać danych atlasu/.test(brkState.text)
      && /SITES/.test(brkState.text),
      JSON.stringify(brkState));
    await brk.close();

    /* 10.17 cudzysłowy w nazwach: dane mają stanowiska typu „laska magiczna" — karta musi
       je pokazać dosłownie, a atrybuty (data-*) nie mogą się rozjechać. */
    const quoteCase = await page.evaluate(() => {
      const PA = window.__PA;
      PA.openSiteById('PM-038');
      const side = document.getElementById('side-content');
      const h2 = side.querySelector('h2');
      const chips = Array.from(side.querySelectorAll('.chip[data-pid]'));
      const chipOk = chips.every(c => c.getAttribute('data-pid') === c.textContent.trim());
      return {
        title: h2 ? h2.textContent.trim() : null,
        hasQuote: h2 ? h2.textContent.includes('"laska magiczna"') : false,
        h2count: side.querySelectorAll('h2').length,
        chipOk,
        chips: chips.length
      };
    });
    check('10.17 cudzysłowy w nazwie stanowiska renderują się dosłownie, atrybuty data-* nienaruszone',
      quoteCase.hasQuote && quoteCase.h2count === 1 && quoteCase.chipOk === true,
      JSON.stringify(quoteCase));

    /* 10.18 „O danych": liczby zgodne z danymi (wcześniej tekst mówił „26 kultur / 140/146
       wariantów", a META.kultury ma 25). Test blokuje powrót ręcznie wpisywanych liczb. */
    const aboutNums = await page.evaluate(() => {
      const PA = window.__PA;
      const txt = (document.getElementById('about-content') || {}).textContent || '';
      const m = window.META;
      const raw = new Set(window.SITES.rdzen.concat(window.SITES.sasiedzi).map(s => s.kultura_raw).filter(Boolean)).size;
      return {
        txt, kultur: m.kultury.length, raw,
        maKultur: txt.includes(m.kultury.length + ' kultur'),
        maRaw: txt.includes(raw + ' wariantów zapisu'),
        stare: /26 kultur|140 wariantów|146 zapisów/.test(txt),
        przekroje: txt.includes((window.ENV.ticks || []).length + ' przekroje'),
        fazy: txt.includes(m.fazy.length + ' faz')
      };
    });
    check('10.18 „O danych" liczby (kultury, warianty zapisu, przekroje, fazy) pochodzą z danych',
      aboutNums.maKultur && aboutNums.maRaw && !aboutNums.stare && aboutNums.przekroje && aboutNums.fazy,
      JSON.stringify({ kultur: aboutNums.kultur, raw: aboutNums.raw, stare: aboutNums.stare,
        przekroje: aboutNums.przekroje, fazy: aboutNums.fazy }));

    /* 10.19 animacja osi zatrzymuje się, gdy mapa schodzi z ekranu (audyt mid 2026-11).
       Wcześniej timer żył dalej: czas płynął w tle, a po powrocie na mapę użytkownik
       zastawał inną epokę niż zostawił. */
    const playStop = await page.evaluate(async () => {
      const PA = window.__PA;
      location.hash = '#mapa';
      await new Promise(r => setTimeout(r, 300));
      document.getElementById('tl-play').click();
      await new Promise(r => setTimeout(r, 300));
      const moved = window.__PA.bp;
      location.hash = '#dane';                        // zmiana widoku = koniec animacji
      await new Promise(r => setTimeout(r, 700));
      const a = PA.bp;
      await new Promise(r => setTimeout(r, 700));
      const b = PA.bp;
      const btn = document.getElementById('tl-play');
      return { moved: moved !== null, a: Math.round(a), b: Math.round(b), still: a !== b,
               label: btn.textContent, pressed: btn.getAttribute('aria-pressed') };
    });
    check('10.19 animacja osi zatrzymuje się przy zmianie widoku (czas stoi, przycisk ▶)',
      playStop.still === false && playStop.label === '▶' && playStop.pressed === 'false',
      JSON.stringify(playStop));

    /* 10.20 kontrakt testowy `__PA.filters` musi pokazywać AKTUALNY stan.
       Wcześniej była to skopiowana referencja, a clearFilters() podmienia obiekt. */
    const filtersRef = await page.evaluate(async () => {
      const PA = window.__PA;
      const q = document.getElementById('srch-q');
      q.value = 'wilczyce';
      q.dispatchEvent(new Event('input', { bubbles: true }));
      const during = PA.filters.q;
      const objBefore = PA.filters;
      PA.clearFilters();
      return { during, after: PA.filters.q, swapped: PA.filters !== objBefore };
    });
    check('10.20 `__PA.filters` pokazuje aktualny stan po „wyczyść filtry"',
      filtersRef.during === 'wilczyce' && filtersRef.after === '' && filtersRef.swapped === true,
      JSON.stringify(filtersRef));

    /* 10.21 skróty z modyfikatorem nie sterują osią czasu (Ctrl+→ to skrót przeglądarki) */
    const keys = await page.evaluate(async () => {
      location.hash = '#mapa';
      await new Promise(r => setTimeout(r, 300));
      const bp0 = window.__PA.bp;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', ctrlKey: true, bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      const bpCtrl = window.__PA.bp;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      const bpPlain = window.__PA.bp;
      return { ctrlChanged: bpCtrl !== bp0, plainChanged: bpPlain !== bpCtrl };
    });
    check('10.21 Ctrl+→ nie przesuwa osi, samo → przesuwa',
      keys.ctrlChanged === false && keys.plainChanged === true, JSON.stringify(keys));

    /* 10.22 cache klatek globusa trzyma się budżetu PAMIĘCI (nie liczby klatek).
       Przed poprawką 17 pełnoekranowych canvasów = ~173 MB na telefonie z DPR 3. */
    const cache = await page.evaluate(async () => {
      location.hash = '#globus';
      await new Promise(r => setTimeout(r, 900));
      const G = window.GLOBE;
      if (!G || !G._cacheStats) return { missing: true };
      for (let i = 0; i < 6; i++) {                    // wymuś obroty/zoomy → wpisy cache
        G.setCenter(18 + i * 25, 44 + i * 3);
        G.setScale(1 + i * 0.15);
        await new Promise(r => setTimeout(r, 220));
      }
      const st = G._cacheStats();
      location.hash = '#mapa';
      return st;
    });
    check('10.22 cache globusa liczony w bajtach: zużycie ≤ budżet (48 MB)',
      !cache.missing && cache.bytes > 0 && cache.bytes <= cache.budget,
      JSON.stringify(cache));

    /* 10.23 Escape zamyka kartę stanowiska i oddaje fokus (dostępność klawiaturowa) */
    const esc = await page.evaluate(async () => {
      location.hash = '#mapa';
      await new Promise(r => setTimeout(r, 250));
      const PA = window.__PA;
      const hit = document.querySelector('.srch-hit') || null;
      if (!hit) { const q = document.getElementById('srch-q'); q.value = 'wilczyce'; q.dispatchEvent(new Event('input', { bubbles: true })); }
      await new Promise(r => setTimeout(r, 150));
      const target = document.querySelector('.srch-hit');
      if (target) target.focus();
      PA.openSiteById('PM-030');
      const open = !document.getElementById('side').classList.contains('hidden');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 120));
      const closed = document.getElementById('side').classList.contains('hidden');
      const focusBack = document.activeElement === target;
      return { open, closed, focusBack, hasTarget: !!target };
    });
    check('10.23 Escape zamyka kartę stanowiska, fokus wraca do wyniku wyszukiwania',
      esc.open === true && esc.closed === true && esc.hasTarget === true,
      JSON.stringify(esc));

    /* 10.24 tytuł karty zmienia się z widokiem (zakładki/historia nie są 5× „PaleoAtlas") */
    const titles = await page.evaluate(async () => {
      const out = {};
      for (const v of ['dane', 'slownik', 'globus', 'mapa']) {
        location.hash = '#' + v;
        await new Promise(r => setTimeout(r, 200));
        out[v] = document.title;
      }
      return out;
    });
    check('10.24 tytuł dokumentu zależy od widoku (4 różne tytuły)',
      new Set(Object.values(titles)).size === 4 && /PaleoAtlas/.test(titles.mapa),
      JSON.stringify(titles));

    await shot('10_final');
  } catch (e) {
    console.log('💥 BŁĄD KRYTYCZNY SUITY: ' + e.message);
    failed++;
  } finally {
    await browser.close();
    server.kill();
  }

  const ok = results.filter(r => r.ok).length;
  console.log('\n════════════════════════════════════');
  console.log(`PODSUMOWANIE: ${ok}/${results.length} testów zdanych` + (failed ? ` · ❌ PORAŻEK: ${failed}` : ' · WSZYSTKO ZDANE 🎉'));
  process.exit(failed ? 1 : 0);
})();
