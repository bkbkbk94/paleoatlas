const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8375','--bind','127.0.0.1'], {cwd: require('path').resolve(__dirname, '..')});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8375/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['ant1_lgm_polkula_z2', 21500, [-70, 20], 2],        // LGM: czapa z ICE-6G_C 21 ka
    ['ant2_now_polkula_z2', 1000, [-70, 20], 2],         // „dziś”: ICE-6G_C 0 ka
    ['ant3_lgm_krawedz_z4', 21500, [-66, 140], 4],       // brzeg czapy (Kemp/Enderby) LGM
    ['ant4_now_krawedz_z4', 1000, [-66, 140], 4],        // ten sam brzeg „dziś”
    ['ant5_degla_13_5ka_z2', 13600, [-70, 20], 2],       // B–A: przekrój 13,5 ka
    ['ant6_phasebar_lgm_z2', 21500, [-70, 20], 2]        // pasek fazy + tooltip przy LGM
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp,c,z]) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp,c,z]);
    await sleep(650);
    const env = await p.evaluate(() => {
      const e = window.__PA.envTickForBP(window.__PA.bp);
      const polys = window.__PA.envIcePolys(e);
      return {env: e && e.label.slice(0,40), polys: polys.length,
              ant: polys.filter(x=>/Antarktyd/.test(x.name||'')).map(x=>x.src||'SCHEMAT').join(',')};
    });
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name, JSON.stringify(env));
  }
  /* globus: widok od strony bieguna płd. przy LGM */
  await p.evaluate(() => { location.hash = '#globus'; });
  await sleep(1200);
  await p.evaluate(() => {
    window.__PA.setSlider(window.__PA.bpToSlider(21500));
    if (window.GLOBE && GLOBE.setCenter) { GLOBE.setCenter(150, -55); }
  });
  await sleep(700);
  await p.screenshot({path: '/tmp/shots/ant7_globus_lgm.png'});
  console.log('📸 ant7_globus_lgm');
  if (errs.length) console.log('BŁĘDY:', errs.join(' | ')); else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
