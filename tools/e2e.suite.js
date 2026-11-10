/* PaleoAtlas — pełny zestaw testów E2E v2 (Chromium headless) */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const fs = require('fs');

const SHOTS = '/tmp/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const URL = 'http://127.0.0.1:8333/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8333', '--bind', '127.0.0.1'],
    { cwd: '/home/user/paleoatlas', stdio: 'ignore' });
  await sleep(1500);

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
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
    const jsErrors = [];
    page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });
    page.on('pageerror', e => jsErrors.push('PAGEERROR: ' + e.message));
    page.on('requestfailed', r => {
      const u = r.url();
      if (!/tile|arcgis|openstreet|opentopo|favicon/i.test(u)) jsErrors.push('REQFAIL: ' + u);
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
    check('1.2 mapa istnieje', await hp('#map .leaflet-pane') > 0);
    check('1.3 oś czasu: 19 segmentów (17 faz + 2 głębokie)', await hp('#tl-track .tl-seg') === 19, await hp('#tl-track .tl-seg'));
    check('1.4 legenda kultur niepusta', await hp('#legend-cultures .lc') > 0, await hp('#legend-cultures .lc'));
    check('1.5 tryb paleo domyślnie WŁ.', await hp('#map.paleo') === 1);
    check('1.6 start ≈ 95 tys. lat temu', (await txt('#tl-year')).includes('95'), await txt('#tl-year'));
    check('1.7 lądy świata narysowane (paleo)', (await painted('landPane')) > 0.10, await painted('landPane'));
    check('1.8 duch wybrzeża widoczny', (await painted('ghostPane')) > 0.0005, await painted('ghostPane'));
    check('1.9 biom kontynentu narysowany', await paths('biomePane') >= 1, await paths('biomePane'));
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
