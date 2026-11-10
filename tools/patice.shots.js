const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8363','--bind','127.0.0.1'], {cwd:'/home/user/paleoatlas'});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8363/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['s1_lgm_patagonia', 21500, [-45, -72], 4],       // scalony PIS 37–55°S
    ['s2_pomorska_patagonia', 15000, [-45, -72], 4],  // rozpad na masywy + NPI/SPI
    ['s3_dryas_patagonia', 12300, [-45, -72], 4],     // 13 ka = ACR
    ['s4_lgm_zoom_spi', 21500, [-50.5, -73.5], 5],    // fiordy/loby SPI w LGM
    ['s5_now_patagonia', 1000, [-47, -73], 5],        // współczesne lodowce
    ['s6_35ka_q', 35000, [-45, -72], 4]               // PATICE 35 ka w przekroju Q
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp,c,z]) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp,c,z]);
    await sleep(650);
    const env = await p.evaluate(() => {
      const e = window.__PA.envTickForBP(window.__PA.bp);
      return {env: e && e.label.slice(0,50), polys: window.__PA.envIcePolys(e).length};
    });
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name, JSON.stringify(env));
  }
  /* globus: Patagonia w LGM na kuli (centerAndRender po API GLOBE) */
  await p.evaluate(() => { location.hash = '#globus'; });
  await sleep(1200);
  await p.evaluate(() => {
    window.__PA.setSlider(window.__PA.bpToSlider(21500));
    if (window.GLOBE && GLOBE.setCenter) { GLOBE.setCenter([-70, -42]); }
  });
  await sleep(700);
  await p.screenshot({path: '/tmp/shots/s7_globus_patagonia_lgm.png'});
  console.log('📸 s7_globus_patagonia_lgm');
  if (errs.length) console.log('BŁĘDY:', errs.join(' | ')); else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
