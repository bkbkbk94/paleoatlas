const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8351','--bind','127.0.0.1'], {cwd: require('path').resolve(__dirname, '..')});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8351/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['a1_lgm_azja', 21500, [63, 110], 3],
    ['a2_dryas_azja', 12300, [63, 110], 3],
    ['a3_mis6_azja', 155000, [63, 130], 3],
    ['a4_beringia_lgm', 21500, [61, -168], 4],
    ['a5_lgm_neasia_zoom', 21500, [64, 140], 4]
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
  if (errs.length) console.log('BŁĘDY:', errs.join(' | ')); else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
