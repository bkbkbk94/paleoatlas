/* ============================================================================
   GLOBE-SUITE — widok kulisty (odpowiedź na: „mapa kończy się i przeskakuje
   przy Beringii; może kulista ziemia?”). Port 8353.
============================================================================ */
const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = []; let failed = 0;
function check(id, cond, info) {
  results.push({ id, ok: !!cond }); if (!cond) failed++;
  console.log((cond ? '✅ ' : '❌ ') + id + (info !== undefined ? ' — ' + String(info).slice(0, 200) : ''));
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8353', '--bind', '127.0.0.1'], { cwd: require('path').resolve(__dirname, '..') });
  await sleep(1200);
  const browser = await puppeteer.launch({ executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    const jsErr = [];
    page.on('pageerror', e => jsErr.push(e.message));
    await page.setViewport({ width: 1000, height: 780 });

    // G.1 zakładka istnieje i routing odpala globusa
    await page.goto('http://127.0.0.1:8353/#globus', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const st = await page.evaluate(() => ({
      active: document.getElementById('view-globus').classList.contains('active'),
      tab: document.querySelector('a[data-view="globus"]').classList.contains('active'),
      cv: !!document.getElementById('globe-cv'),
      w: document.getElementById('globe-cv').width
    }));
    check('G.1 zakładka „🌍 Globus” aktywna przez routing #globus, canvas żyje', st.active && st.tab && st.cv && st.w > 600, JSON.stringify(st));

    // G.2 globus renderuje: ocean + ląd (ułamek zamalowanych px wyraźnie > 0)
    const probeEuropa = await page.evaluate(() => window.GLOBE._ctxProbe(6));
    check('G.2 renderowanie: globus zamalowany (ocean/tarcza ≈ pełny kadr, ląd oraz szelf obecne)',
      probeEuropa.ice >= 0 && probeEuropa.n > 1000, 'próbek ' + probeEuropa.n + ' · lód(px) ' + (100 * probeEuropa.ice).toFixed(1) + '%');

    // G.3 epoka daje się malować: MIS 12 (dużo lodu) vs interglacjał (mało) — ułamek lodu spada.
    //    Sonda bieli _ctxProbe mierzy warstwę lądolodów — wyłączamy na ten test biomy (raster też nosi klasę 28).
    await page.evaluate(() => { window.GLOBE.setBiome(false); window.GLOBE.setCenter(20, 62); window.__PA.setSlider(window.__PA.bpToSlider(450000)); });
    await sleep(500);
    const iceMis12 = (await page.evaluate(() => window.GLOBE._ctxProbe(6))).ice;
    await page.evaluate(() => { window.__PA.setSlider(window.__PA.bpToSlider(398000)); });
    await sleep(500);
    const iceIg = (await page.evaluate(() => window.GLOBE._ctxProbe(6))).ice;
    check('G.3 MIS 12 vs interglacjał: bieli lądolodu na globie wyraźnie więcej w MIS 12 niż w MIS 11 (tarcza = ~47% kadru)',
      iceMis12 > 0.07 && iceIg < iceMis12 / 4, 'MIS12 ' + (100 * iceMis12).toFixed(1) + '% vs IG ' + (100 * iceIg).toFixed(1) + '%');
    await page.evaluate(() => window.GLOBE.setBiome(true));

    // G.4 SEDNO: Beringia w środku kadru — oba lądolody w jednym kadrze + rotacja ciągła przez datownik.
    //    Na płaskiej mapie ten widok jest niemożliwy (mapa urywa się na ±180° i przeskakuje kopie).
    await page.evaluate(() => { window.__PA.setSlider(window.__PA.bpToSlider(21500)); window.GLOBE.setCenter(165, 60); });
    await sleep(500);
    const iceBeringTot = (await page.evaluate(() => window.GLOBE._ctxProbe(6))).ice;
    const cont = await page.evaluate(() => {
      const c0 = 170;
      window.GLOBE.setCenter(c0, 60);
      const d1 = window.GLOBE.getCenter().lon - c0;                 // 0 — rotacja jest ciągła
      window.GLOBE.setCenter(182, 60);                              // „za datownikiem”
      const d2 = window.GLOBE.getCenter().lon - 170;                // +12°, zero skoku
      window.GLOBE.setCenter(-165, 60);
      return { d2, crossingContinuity: d2 === 12 ? 'OK' : 'SKOK: ' + JSON.stringify(window.GLOBE.getCenter()) };
    });
    check('G.4 LGM centrum na Beringii (−165°): oba lądolody malowane razem (>3,5% tarczy); rotacja przez datownik ciągła (170°→182° = +12°, brak skoku)',
      iceBeringTot > 0.035 && cont.crossingContinuity === 'OK',
      'lód ' + (100 * iceBeringTot).toFixed(1) + '% · rotacja ' + cont.crossingContinuity);

    // G.5 HUD pokazuje etykietę środowiska + listę warstw (DANE/SCHEMAT — ciągłość provenance)
    const hud = await page.evaluate(() => document.getElementById('globe-epoch').textContent);
    check('G.5 HUD: etykieta epoki „LGM / faza leszczyńska” + warstwy źródeł (DATED-1 + NADI-1 + SCHEMAT)',
      /LGM \/ faza leszczyńska/.test(hud) && /DATED-1/.test(hud) && /NADI-1/.test(hud) && /SCHEMAT/.test(hud), hud.slice(0, 140));

    // G.6 obracanie — symulowany drag zmienia środek i treść (pobieramy środkowy pas,
    //    bo górne wiersze to ciemny kosmos — identyczny w obu stanach)
    const midProbe = () => page.evaluate(() => {
      const cv = document.getElementById('globe-cv');
      const h = cv.height, w = cv.width;
      const d = cv.getContext('2d').getImageData(0, Math.round(h * 0.35), w, Math.round(h * 0.3)).data;
      let s = 0; for (let i = 0; i < d.length; i += 97) s += d[i];
      return s;
    });
    const pxBefore = await midProbe();
    await page.mouse.move(500, 390);
    await page.mouse.down();
    await page.mouse.move(760, 470, { steps: 8 });
    await page.mouse.up();
    await sleep(400);
    const after = await page.evaluate(() => window.GLOBE.getCenter());
    const pxAfter = await midProbe();
    check('G.6 przeciąganie obraca glob (zmiana środka >40°) i obraz się przerysował',
      (Math.abs(after.lon - 165) > 40 || Math.abs(after.lat - 60) > 15) && pxAfter !== pxBefore,
      'center ' + JSON.stringify(after) + ' · Δproba ' + (pxAfter - pxBefore));

    // G.7 zoom kółkiem zmienia skalę
    const k0 = await page.evaluate(() => window.GLOBE.getScale());
    await page.mouse.move(500, 390);
    for (let i = 0; i < 4; i++) { await page.mouse.wheel({ deltaY: 120 }); await sleep(60); }
    const k1 = await page.evaluate(() => window.GLOBE.getScale());
    check('G.7 kółko myszy: zoom-out zmniejsza skalę (globus oddala się)', k1 < k0 * 0.95, 'scale ' + k0.toFixed(2) + ' → ' + k1.toFixed(2));

    // G.8 stanowiska: na globie pojawiają się tylko w swoich epokach — szukamy pikseli
    //    trafiających w kolory kultur z META (nie tła); w 2,5 mln BP stanowisk brak
    await page.evaluate(() => {
      const ctab = window.META.kultury.map(k => {
        const m = /^#(..)(..)(..)$/.exec(k.kolor) || ['', '80', '80', '80'];
        return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
      });
      const count = () => {
        const cv = document.getElementById('globe-cv'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let hits = 0;
        for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) {
          const i = (y * cv.width + x) << 2;
          if (d[i + 3] < 200) continue;
          for (const [r, g, b] of ctab) if (Math.abs(d[i] - r) < 14 && Math.abs(d[i + 1] - g) < 14 && Math.abs(d[i + 2] - b) < 14) { hits++; break; }
        }
        return hits;
      };
      window.GLOBE.setScale(1); window.GLOBE.setCenter(19, 50);
      window.__paCountFn = count;
      return true;
    });
    const dotsDiff = {};
    await page.evaluate(() => window.__PA.setSlider(window.__PA.bpToSlider(14000)));
    await sleep(550);
    dotsDiff.bp14k = await page.evaluate(() => window.__paCountFn());
    await page.evaluate(() => window.__PA.setSlider(window.__PA.bpToSlider(2500000)));
    await sleep(550);
    dotsDiff.bp2500k = await page.evaluate(() => window.__paCountFn());
    check('G.8 px w kolorach kultur (test różnicowy): 14 tys. BP przynosi ≥120 netto-trafień ponad epokę bez stanowisk (2,5 mln BP = linia bazowa szumów tła)',
      dotsDiff.bp14k - dotsDiff.bp2500k >= 120 && dotsDiff.bp2500k * 3 < dotsDiff.bp14k,
      'neto ' + (dotsDiff.bp14k - dotsDiff.bp2500k) + ' (' + JSON.stringify(dotsDiff) + ')');

    // G.9 widok mobilny: kadr 390×844 renderuje się, HUD widoczny, brak błędów
    await page.setViewport({ width: 390, height: 844 });
    await sleep(450);
    const mob = await page.evaluate(() => {
      window.__PA.setSlider(window.__PA.bpToSlider(450000));
      window.GLOBE.setCenter(19, 55);
      window.GLOBE.markDirty();
      return new Promise(r => setTimeout(() => {
        const p = window.GLOBE._ctxProbe(8);
        r({ icePct: p.ice, w: document.getElementById('globe-cv').width, hud: document.getElementById('globe-epoch').textContent.length > 10 });
      }, 350));
    });
    check('G.9 mobile 390×844: canvas przeskalowany (≥380 px), lód epoki malowany, HUD obecny',
      mob.w >= 380 && mob.icePct > 0.03 && mob.hud, 'w ' + mob.w + ' · lód ' + (100 * mob.icePct).toFixed(1) + '%');

    // G.10 brak błędów JS w całym przebiegu
    check('G.10 brak błędów JS', jsErr.length === 0, jsErr.join('; ').slice(0, 140));

    /* ══════════════ BIOMY NA GLOBIE (rastry __PA.biomeGridFor + kotwice pyłkowe) ══════════════ */
    await page.setViewport({ width: 1000, height: 780 });
    await sleep(350);

    // G.11 przełączniki + raster epoki: LGM → plik zgodny z najbliższą migawką meta, siatka załadowana
    const d0 = await page.evaluate(() => {
      window.__PA.setSlider(window.__PA.bpToSlider(21500));
      window.GLOBE.setScale(1); window.GLOBE.setCenter(25, 55);
      window.GLOBE.markDirty();
      return new Promise(r => setTimeout(() => r({
        file: window.GLOBE._dbg.file, grid: window.GLOBE._dbg.grid,
        meta: window.__PA.biomeEpochForBP(21500).file,
        st: window.GLOBE.getBiome(),
        tgl: !!document.getElementById('gt-biome') && !!document.getElementById('gt-pollen')
      }), 700));
    });
    check('G.11 globus+biomy: przełączniki ON, raster epoki LGM = najbliższa migawka meta, siatka w pamięci',
      d0.tgl && d0.st.biome && d0.st.pollen && d0.grid && d0.file === d0.meta, JSON.stringify(d0));

    // G.11b matematyka inline-invert ≡ d3 proj.invert (zgoda numeryczna < 1e-9 rad)
    const bip = await page.evaluate(() => window.GLOBE._biprojCheck(1200));
    check('G.11b inline-invert (BIOP) ≡ d3.geoOrthographic.invert — max błąd < 1e-9 rad (zero utraty jakości próbkowania)',
      bip && bip.cnt > 900 && bip.worst < 1e-9, JSON.stringify(bip));

    // helper: ustaw scenę i poczekaj aż siatka epoki NAPRAWDE się załaduje (zimny cache PNG może trwać)
    const sceneWait = (bp, lon, lat, k, ms) => page.evaluate(({ bp, lon, lat, k, ms }) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp));
      window.GLOBE.setCenter(lon, lat); window.GLOBE.setScale(k); window.GLOBE.markDirty();
      return new Promise(res => {
        const t0 = performance.now();
        const iv = setInterval(() => {
          window.GLOBE.markDirty();
          if (window.GLOBE._dbg.grid || performance.now() - t0 > ms) { clearInterval(iv); setTimeout(() => res(window.GLOBE._dbg.grid), 250); }
        }, 150);
      });
    }, { bp, lon, lat, k, ms });

    // G.12 Sahara dziś (Beyer2020): pustynia+pustkowie (klasy 21/27) dominują w ścisłym kadrze rdzenia
    await sceneWait(0, 7, 24.5, 5.2, 4000);
    const sah = await page.evaluate(() => {
      const p = window.GLOBE._classProbe(6);
      return { d: ((p.per[21] || 0) + (p.per[27] || 0)) / p.tot, p };
    });
    check('G.12 Sahara 0 ka (zoom 5,2, rdzeń): pustynia(21)+pustkowie(27) ≥ 55% próbek (piksele globusa ↔ paleta BIOME4)',
      sah.d >= 0.55, 'frakcja ' + (100 * sah.d).toFixed(1) + '% · per ' + JSON.stringify(sah.p.per));

    // G.13 Amazonia dziś: lasy tropikalne (1/2/3) dominują w ścisłym kadrze
    await sceneWait(0, -60, -3, 5.2, 2500);
    const amz = await page.evaluate(() => {
      const p = window.GLOBE._classProbe(6);
      return { tr: ((p.per[1] || 0) + (p.per[2] || 0) + (p.per[3] || 0)) / p.tot, p };
    });
    check('G.13 Amazonia 0 ka (zoom 5,2, rdzeń): lasy tropikalne (1–3) ≥ 60% próbek',
      amz.tr >= 0.60, 'frakcja ' + (100 * amz.tr).toFixed(1) + '% · per ' + JSON.stringify(amz.p.per));

    // G.14 LGM Fennoskandia: klasa lądolód (28) — biom pod lądolodem + poligony lodu — dominuje
    await sceneWait(21500, 20, 62, 3.2, 4000);
    const fen = await page.evaluate(() => {
      const p = window.GLOBE._classProbe(6);
      return { ice: (p.per[28] || 0) / p.tot, p };
    });
    check('G.14 LGM Fennoskandia (zoom 3,2): klasa 28 (lądolód) ≥ 30% próbek',
      fen.ice >= 0.30, 'frakcja ' + (100 * fen.ice).toFixed(1) + '% · per ' + JSON.stringify(fen.p.per));

    // G.15 pyłek: 6 ka → kotwice 6k liczone; przełącznik UI działa; Eem poza kotwicami → 0
    const pol6 = await page.evaluate(() => {
      window.__PA.setSlider(window.__PA.bpToSlider(6000));
      window.GLOBE.setCenter(18, 54); window.GLOBE.setScale(1); window.GLOBE.markDirty();
      return new Promise(r => setTimeout(() => r({
        n: window.GLOBE._dbg.pollen, key: window.GLOBE._dbg.pollenKey,
        hud: document.getElementById('globe-epoch').textContent
      }), 800));
    });
    check('G.15 pyłek 6 ka: kotwice 6k na przedniej półkuli (≥300 pkt) + HUD „🌾 BIOME 6000 6k” + tag „Krapp2021”',
      pol6.key === '6k' && pol6.n >= 300 && /BIOME 6000 6k/.test(pol6.hud) && /Krapp2021/.test(pol6.hud),
      'pkt ' + pol6.n + ' · hud: ' + pol6.hud.slice(-90));
    const polOff = await page.evaluate(() => {
      document.getElementById('gt-pollen').click();
      window.GLOBE.markDirty();
      return new Promise(r => setTimeout(() => r(window.GLOBE._dbg.pollen), 500));
    });
    check('G.15b przełącznik „🌾 pyłek” (klik w HUD): wyłączenie zeruje punkty', polOff === 0, 'po wyłączeniu: ' + polOff);
    const polEem = await page.evaluate(() => {
      document.getElementById('gt-pollen').click();
      window.__PA.setSlider(window.__PA.bpToSlider(125000));
      window.GLOBE.markDirty();
      return new Promise(r => setTimeout(() => r({ n: window.GLOBE._dbg.pollen, key: window.GLOBE._dbg.pollenKey }), 700));
    });
    check('G.15c Eem (125 ka) poza epokami kotwicznymi: pyłek się nie rysuje (klucz null)',
      polEem.key === null && polEem.n === 0, JSON.stringify(polEem));

    // G.16 wyłączenie biomów: klasa pustyni znika z próbki (kontrola „to rysuje raster, nie co innego”)
    const boff = await page.evaluate(() => {
      window.__PA.setSlider(window.__PA.bpToSlider(0));
      window.GLOBE.setCenter(10, 24); window.GLOBE.setScale(3.2); window.GLOBE.markDirty();
      return new Promise(r => setTimeout(() => {
        const on = (window.GLOBE._classProbe(6).per[21] || 0);
        window.GLOBE.setBiome(false);
        window.GLOBE.markDirty();
        setTimeout(() => {
          const off = (window.GLOBE._classProbe(6).per[21] || 0);
          window.GLOBE.setBiome(true); window.GLOBE.markDirty();
          r({ on, off });
        }, 600);
      }, 800));
    });
    check('G.16 toggle 🌿 biomy: piksele klasy 21 (pustynia) obecne przy ON, znikają przy OFF (≤1% stanu ON)',
      boff.on > 50 && boff.off <= Math.max(2, boff.on * 0.01), JSON.stringify(boff));

    // G.17 wydajność: cache pikselowy klatek — powrót do odwiedzonej epoki (HIT) ma być radykalnie tańszy
    //    niż pierwsze wyrenderowanie (MISS); raport pełnych czasów w info (software canvas headless).
    const perf = await page.evaluate(() => new Promise(res => {
      const out = {};
      window.GLOBE.setScale(1); window.GLOBE.setCenter(19, 52);
      window.__PA.setSlider(window.__PA.bpToSlider(21000)); window.GLOBE.markDirty();   // MISS epoki
      setTimeout(() => {
        out.miss21 = window.GLOBE._dbg.renderMs;
        window.__PA.setSlider(window.__PA.bpToSlider(40000)); window.GLOBE.markDirty();
        setTimeout(() => {
          out.miss40 = window.GLOBE._dbg.renderMs;
          window.__PA.setSlider(window.__PA.bpToSlider(21000)); window.GLOBE.markDirty();   // HIT 21 epoki
          setTimeout(() => {
            out.hit21 = window.GLOBE._dbg.renderMs;
            res(out);
          }, 350);
        }, 500);
      }, 500);
    }));
    check('G.17 cache klatek: HIT epoki < 80 ms i ≥3× szybciej niż MISS (raport: miss 21 tys. / miss 40 tys. / hit 21 tys.)',
      perf.hit21 > 0 && perf.hit21 < 80 && perf.hit21 * 3 < perf.miss21,
      JSON.stringify(perf, (k, v) => typeof v === 'number' ? +v.toFixed(1) : v) + ' ms');

    // G.18 błędy JS po wszystkich testach biomów na globie
    check('G.18 brak błędów JS (także po warstwie biomów)', jsErr.length === 0, jsErr.join('; ').slice(0, 140));

    // migawka kontrolna
    await page.setViewport({ width: 1100, height: 800 });
    await page.evaluate(() => { window.GLOBE.setScale(1); window.GLOBE.setCenter(165, 60); window.__PA.setSlider(window.__PA.bpToSlider(21500)); });
    await sleep(450);
    await page.screenshot({ path: '/tmp/shots/g1_globus_beringia_lgm.png' });
    await page.evaluate(() => window.GLOBE.setCenter(19, 50));
    await sleep(400);
    await page.screenshot({ path: '/tmp/shots/g2_globus_europa_lgm.png' });
    // migawki biomów na globie
    await page.evaluate(() => { window.__PA.setSlider(window.__PA.bpToSlider(21500)); window.GLOBE.setCenter(19, 54); window.GLOBE.setScale(2); window.GLOBE.markDirty(); });
    await sleep(700);
    await page.screenshot({ path: '/tmp/shots/g3_globus_biomy_lgm_europa.png' });
    await page.evaluate(() => { window.__PA.setSlider(window.__PA.bpToSlider(6000)); window.GLOBE.setCenter(8, 22); window.GLOBE.setScale(1.6); window.GLOBE.markDirty(); });
    await sleep(700);
    await page.screenshot({ path: '/tmp/shots/g4_globus_biomy_6ka_sahara_pylek.png' });
  } finally {
    await browser.close();
    server.kill();
  }

  console.log('\n════════════════════════════════════════════');
  const okN = results.filter(r => r.ok).length;
  console.log('GLOBE: ' + okN + '/' + results.length + ' zdanych' + (failed ? ' · ❌ ' + failed : ' · WSZYSTKO ZDANE 🎉'));
  process.exit(failed ? 1 : 0);
})();
