const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8373','--bind','127.0.0.1'], {cwd: require('path').resolve(__dirname, '..')});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8373/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['nz1_lgm_wyspa_z5', 21500, [-44.1, 169.9], 5],        // LGM: 7 sektorów ~40 tys. km²
    ['nz2_lgm_waitaki_z6', 21500, [-44.1, 169.7], 6],      // Waitaki/Rakaia z bliska
    ['nz3_mis4_sgm_z5', 65000, [-43.6, 170.0], 5],         // MIS 4 SGM ≈1,15× (65 ka)
    ['nz4_bolling_z6', 13600, [-44.1, 169.7], 6],          // B–A = poziom pomorskiej (ACR↑)
    ['nz5_dryas_z6', 12300, [-44.1, 169.7], 6],            // mł. dryas: cofka (Kaplan 2010)
    ['nz6_now_aoraki_z6', 1000, [-43.8, 170.2], 6]         // „dziś”: POMIAR 794 km²
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp,c,z]) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp,c,z]);
    await sleep(650);
    const env = await p.evaluate(() => {
      const e = window.__PA.envTickForBP(window.__PA.bp);
      const polys = window.__PA.envIcePolys(e);
      return {env: e && e.label.slice(0,44), polys: polys.length,
              nz: polys.filter(x=>/^Nowa Zelandia/.test(x.name||'')).length};
    });
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name, JSON.stringify(env));
  }
  /* globus: NZ w centrum przy LGM */
  await p.evaluate(() => { location.hash = '#globus'; });
  await sleep(1200);
  await p.evaluate(() => {
    window.__PA.setSlider(window.__PA.bpToSlider(21500));
    if (window.GLOBE && GLOBE.setCenter) { GLOBE.setCenter(170, -42); }
  });
  await sleep(700);
  await p.screenshot({path: '/tmp/shots/nz7_globus_lgm.png'});
  console.log('📸 nz7_globus_lgm');
  if (errs.length) console.log('BŁĘDY:', errs.join(' | ')); else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
