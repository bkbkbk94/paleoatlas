const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8377', '--bind', '127.0.0.1'], { cwd: require('path').resolve(__dirname, '..') });
  await sleep(1200);
  const b = await puppeteer.launch({ executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({ width: 1100, height: 760 });
  await p.goto('http://127.0.0.1:8377/', { waitUntil: 'networkidle2' }); await sleep(1800);
  const shots = [
    ['l1_przedmax_25ka_polnoc', 27000, [-41.5, -72.5], 6],   // jeziora 25 ka na płn. krańcu (Elpalafquen, Golfo de Ancud)
    ['l2_lgm_20ka_pis', 21500, [-47.5, -72.0], 5],           // LGM: 13 zbiorników pod scalonym PIS
    ['l3_pomorska_15ka_pik', 15000, [-47.3, -71.6], 6],      // 15 ka: pik — Deseado, Chalenko-CP, Otway/Skyring
    ['l4_ba_13ka_chalenko', 13600, [-47.2, -71.7], 6],       // 13 ka: Lago Chalenko 4740 km²
    ['l5_yd_13ka_poludnie', 12300, [-52.3, -69.5], 6],       // 13 ka: Tehuelche, Skyring, Otway na płd.
    ['l6_wcz_holocen_10ka', 10500, [-49.8, -72.0], 6],       // 10 ka: Argentino, Viedma, Tar — ostatnie duże
    ['l7_dzis_bez_paleojezior', 500, [-49.8, -72.0], 6]      // „dziś”: brak paleowarstwy (kontrola)
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp, c, z]) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp, c, z]);
    await sleep(650);
    const env = await p.evaluate(() => {
      const e = window.__PA.envTickForBP(window.__PA.bp);
      const polies = window.__PA.envIcePolys(e);
      const lakes = polies.filter(x => x.lake);
      return { env: e && (e.ice || e.q || 'now'), LAKES: lakes.length, PATICE: polies.filter(x => x.src === 'PATICE').length };
    });
    await p.screenshot({ path: '/tmp/shots/' + name + '.png' });
    console.log('📸', name, JSON.stringify(env));
  }
  if (errs.length) console.log('BŁĘDY:', errs.join(' | ')); else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
