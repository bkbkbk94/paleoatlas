const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8381','--bind','127.0.0.1'], {cwd: require('path').resolve(__dirname, '..')});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8381/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['i1_lgm_schemat',   21500, [64.9, -18.0], 6],   // pełny IIS do szelfu — SCHEMAT z etykietą empiryczną (~0,3 mln km²)
    ['i2_15ka_ice6g',    15000, [64.9, -18.0], 6],   // pomorska: maska ICE-6G_C (modelowo jeszcze pełna)
    ['i3_12ka_ice6g',    12300, [64.9, -18.0], 6],   // mł. dryas: pierwsza cofka maski (68,6 tys.)
    ['i4_105ka_ice6g',   10500, [64.9, -18.0], 6],   // wcz. holocen: czapy śródlądowe wg modelu
    ['i5_now_rgi',        1000, [64.65, -17.6], 5],  // „dziś”: RGI 7.0 — Vatnajökull i pozostałe czapy (inwentarz)
    ['i6_now_vatnajokull',1000, [64.4, -16.9], 7]    // „dziś”: zbliżenie na Vatnajökull (12 członów, ~8 184 km²)
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp,c,z]) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp,c,z]);
    await sleep(650);
    const st = await p.evaluate(() => {
      const e = window.__PA.envTickForBP(window.__PA.bp);
      const pol = window.__PA.envIcePolys(e).filter(x => /Islandia/.test(x.name));
      return {isl: pol.length, src: pol[0] && pol[0].src || 'brak'};
    });
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name, JSON.stringify(st));
  }
  if (errs.length) console.log('BŁĘDY:', errs.join(' | ')); else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
