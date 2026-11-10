/* ============================================================================
   PERFCHECK — weryfikacja optymalizacji „bez straty na jakości” (2026-08):
   a) mapa płaska: renderTimeLayers — przejście 1 (cache zimne) vs przejście 2
      (kotwice pyłkowe 0k/6k/18k z cache, poligony szelfu/lądolodu bez przebudowy),
   b) globus: klatka epoki MISS vs HIT (cache pikselowy),
   c) raport czasów (software canvas w headless — użytkownik na GPU szybciej).
   Port 8279. Mirror: paleoatlas/tools/perfcheck.js
============================================================================ */
const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const results = []; let failed = 0;
function check(id, cond, info) {
  results.push({ id, ok: !!cond }); if (!cond) failed++;
  console.log((cond ? '✅ ' : '❌ ') + id + (info !== undefined ? ' — ' + String(info).slice(0, 220) : ''));
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8279', '--bind', '127.0.0.1'], { cwd: '/home/user/paleoatlas' });
  await sleep(1200);
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 860 });
    await page.goto('http://127.0.0.1:8279/', { waitUntil: 'networkidle2' });
    await sleep(1800);

    /* Scenariusz A: zestaw epok wysysających z cache (0 ka=9948 markerów pyłka, LGM, 6 ka, MIS12…) */
    const hops = [0, 6000, 21500, 12500, 450000, 398000, 125000, 6000, 0];
    const pass = () => page.evaluate(hs => {
      const out = [];
      for (const bp of hs) {
        const t0 = performance.now();
        window.__PA.setSlider(window.__PA.bpToSlider(bp));
        out.push(performance.now() - t0);
      }
      return out;
    }, hops);
    const p1 = await pass();
    const p2 = await pass();
    const s1 = p1.reduce((a, b) => a + b, 0), s2 = p2.reduce((a, b) => a + b, 0);
    console.log('   przejście 1 [ms]:', p1.map(v => v.toFixed(0)).join(' '), ' Σ', s1.toFixed(0));
    console.log('   przejście 2 [ms]:', p2.map(v => v.toFixed(0)).join(' '), ' Σ', s2.toFixed(0));
    check('P.1 mapa płaska: 2. przejście po 9 epokach (cache pyłka/szelfu/lądolodów) ≤ 65% czasu 1. przejścia',
      s2 <= s1 * 0.65, `Σ ${s1.toFixed(0)} ms → ${s2.toFixed(0)} ms (${(100 * s2 / s1).toFixed(0)}%)`);
    const med = a => a.slice().sort((x, y) => x - y)[4];
    check('P.2 mediana klatki 2. przejścia ≤ 130 ms (software canvas bez GPU; stróż regresji renderTimeLayers) i nie gorsza niż 1. przejście',
      med(p2) <= 130 && med(p2) <= med(p1), 'mediana ' + med(p1).toFixed(0) + ' → ' + med(p2).toFixed(0) + ' ms · sufit 130');

    /* Scenariusz B: jakość netto — warstwa pyłka ma po przełączeniach identyczną liczbę markerów */
    const cnt = await page.evaluate(() => {
      window.__PA.setSlider(window.__PA.bpToSlider(0));
      const a = window.__PA.group.pollen.getLayers().length;
      window.__PA.setSlider(window.__PA.bpToSlider(125000));
      window.__PA.setSlider(window.__PA.bpToSlider(0));
      const b = window.__PA.group.pollen.getLayers().length;
      window.__PA.setSlider(window.__PA.bpToSlider(6000));
      const c = window.__PA.group.pollen.getLayers().length;
      return { a, b, c };
    });
    check('P.3 tożsamość warstw po cache: 0k=9948, powrót 0k=9948, 6k=1794 (zero regresji liczności)',
      cnt.a === 9948 && cnt.b === 9948 && cnt.c === 1794, JSON.stringify(cnt));

    /* Scenariusz C: globus HIT/MISS dodatkowy odczyt */
    await page.goto('http://127.0.0.1:8279/#globus', { waitUntil: 'networkidle2' });
    await sleep(1500);
    const g = await page.evaluate(() => new Promise(res => {
      window.GLOBE.setCenter(19, 54); window.GLOBE.setScale(2); window.GLOBE.markDirty();
      window.__PA.setSlider(window.__PA.bpToSlider(21500));
      setTimeout(() => {
        const miss = window.GLOBE._dbg.renderMs;
        window.__PA.setSlider(window.__PA.bpToSlider(21800));
        setTimeout(() => {
          const miss2 = window.GLOBE._dbg.renderMs;
          window.__PA.setSlider(window.__PA.bpToSlider(21500));
          setTimeout(() => res({ miss, miss2, hit: window.GLOBE._dbg.renderMs }), 350);
        }, 500);
      }, 500);
    }));
    console.log('   globus LGM Europa z2: MISS', g.miss.toFixed(0), '/', g.miss2.toFixed(0), 'ms → HIT', g.hit.toFixed(1), 'ms');
    check('P.4 globus: klatka HIT (LGM, Europa, zoom 2) po powrocie do epoki < 60 ms',
      g.hit < 60, `MISS ${g.miss.toFixed(0)} ms → HIT ${g.hit.toFixed(1)} ms`);
  } finally {
    await browser.close();
    server.kill();
  }
  console.log('\n════════════════════════════════════════════');
  const okN = results.filter(r => r.ok).length;
  console.log('PERFCHECK: ' + okN + '/' + results.length + ' zdanych' + (failed ? ' · ❌ ' + failed : ' · WSZYSTKO ZDANE 🎉'));
  process.exit(failed ? 1 : 0);
})();
