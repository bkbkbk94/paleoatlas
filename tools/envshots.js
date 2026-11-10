const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8341','--bind','127.0.0.1'], {cwd: require('path').resolve(__dirname, '..')});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
  await p.setViewport({width:1500, height:950});
  await p.goto('http://127.0.0.1:8341/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['e1_3300ka_pliocen_swiat', 3300000, [45, 30], 2],
    ['e2_2700ka_gauss', 2700000, [58, 20], 3],
    ['e3_800ka_mis20', 800000, [56, 18], 4],
    ['e4_650ka_mis16', 650000, [56, 18], 4],
    ['e5_450ka_mis12_karpaty', 450000, [53, 19], 5],
    ['e6_280ka_odra_lob', 270000, [53, 18], 5],
    ['e7_155ka_warta_mis6', 150000, [53, 18], 5],
    ['e8_440ka_mazowiecki_mis10', 350000, [55, 25], 4]
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp,c,z]) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp,c,z]);
    await sleep(700);
    const env = await p.evaluate(() => {
      const e = window.__PA.envTickForBP(window.__PA.bp);
      const sea = window.__PA.seaAtBP(window.__PA.bp);
      return {bp: window.__PA.bp, env: e && e.label, polys: window.__PA.envIcePolys(e).length,
              sea: Math.round(sea), icesrc: document.getElementById('phase-icesrc').textContent};
    });
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name, JSON.stringify(env));
  }
  const dl = await p.evaluate(() => ({
    milestones: document.querySelectorAll('.tl-ms').length,
    segs: document.querySelectorAll('.tl-seg').length,
    fazy: (window.META.fazy || []).length
  }));
  console.log('DOM:', JSON.stringify(dl));
  console.log(errs.length ? '❌ BŁĘDY:\n' + errs.join('\n') : '✔ bez błędów JS');
  await b.close(); server.kill();
})().catch(e => { console.error(e); process.exit(1); });
