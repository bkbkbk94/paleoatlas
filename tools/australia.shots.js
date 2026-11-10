const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8371','--bind','127.0.0.1'], {cwd:'/home/user/paleoatlas'});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8371/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['au1_lgm_tasmania_z6', 21500, [-42.1, 146.2], 6],     // Tasmania: 3 dyski 1085 km²
    ['au2_lgm_kosciuszko_z7', 21500, [-36.7, 148.3], 7],   // kontynent: 15 km² (!)
    ['au3_lgm_nowagwinea_z6', 21500, [-4.7, 139.2], 6],    // Sudirman 3400 + Giluwe 188
    ['au4_dryas_region_z5', 12300, [-18, 142], 5],         // mł. dryas: BRAK readvance (łamał w B–A)
    ['au5_mis6_tasmania_z5', 155000, [-42.3, 146.5], 5],   // starsze maksimum 4500 km²
    ['au6_now_puncakjaya_z9', 1000, [-4.085, 137.18], 9]   // „dziś”: 0,2 km² POMIAR
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
              aus: polys.filter(x=>/^(Nowa Gwinea|Tasmania|Australia)/.test(x.name||'')).length};
    });
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name, JSON.stringify(env));
  }
  /* globus: Australia + Nowa Gwinea w LGM */
  await p.evaluate(() => { location.hash = '#globus'; });
  await sleep(1200);
  await p.evaluate(() => {
    window.__PA.setSlider(window.__PA.bpToSlider(21500));
    if (window.GLOBE && GLOBE.setCenter) { GLOBE.setCenter(140, -30); }
  });
  await sleep(700);
  await p.screenshot({path: '/tmp/shots/au7_globus_lgm.png'});
  console.log('📸 au7_globus_lgm');
  if (errs.length) console.log('BŁĘDY:', errs.join(' | ')); else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
