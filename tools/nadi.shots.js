const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8349','--bind','127.0.0.1'], {cwd: require('path').resolve(__dirname, '..')});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1000, height:760});
  await p.goto('http://127.0.0.1:8349/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['n1_lgm_21_5ka_ameryka', 21500, [50, -95], 3],
    ['n2_lgm_21_5ka_pelny', 21500, [55, -20], 2],
    ['n3_poznanska_17_5ka', 17500, [50, -95], 3],
    ['n4_pomorska_15ka', 15000, [50, -95], 3],
    ['n5_bolling_13_6ka', 13600, [50, -95], 3],
    ['n6_dryas_12_3ka', 12300, [50, -95], 3],
    ['n7_holocen_10_5ka', 10500, [50, -95], 3],
    ['n8_dzis_1ka', 1000, [50, -95], 3],
    ['n9_lgm_21_5ka_polska', 21500, [52, 19], 5]
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp,c,z]) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp,c,z]);
    await sleep(650);
    const env = await p.evaluate(() => {
      const e = window.__PA.envTickForBP(window.__PA.bp);
      return {env: e && e.label.slice(0,60), polys: window.__PA.envIcePolys(e).length,
              nadi: window.__PA.envIcePolys(e).filter(x => x.src === 'NADI-1').length,
              icesrc: document.getElementById('phase-icesrc').textContent.slice(0, 80)};
    });
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name, JSON.stringify(env));
  }
  if (errs.length) console.log('BŁĘDY:', errs.join(' | '));
  else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
