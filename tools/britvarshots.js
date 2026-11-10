const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8379','--bind','127.0.0.1'], {cwd:'/home/user/paleoatlas'});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8379/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['v1_lgm_opt', 21500, [54.5, -5.5], 6, 'opt'],   // LGM 21 ka — OPTIMUM (domyślne ~770 tys. km²)
    ['v2_lgm_min', 21500, [54.5, -5.5], 6, 'min'],   // LGM — MINIMUM (~448 tys.)
    ['v3_lgm_max', 21500, [54.5, -5.5], 6, 'max'],   // LGM — MAKSIMUM (~996 tys.)
    ['v4_27ka_min', 27000, [53.6, -5.0], 6, 'min'],  // przedmaks. — MINIMUM (~527 tys.)
    ['v5_27ka_max', 27000, [53.6, -5.0], 6, 'max']   // przedmaks. — MAKSIMUM (~1 125 tys.)
  ];
  for (const [name, bp, c, z, variant] of shots) {
    await p.evaluate(([bp,c,z,variant]) => {
      window.__PA.setBritVar(variant);
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp,c,z,variant]);
    await sleep(650);
    const st = await p.evaluate(() => ({
      var: window.BRITICE_VARIANT,
      btn: document.getElementById('britice-var').textContent.trim(),
      bri: window.__PA.envIcePolys(window.__PA.envTickForBP(window.__PA.bp)).filter(x => x.src === 'BRITICE-CHRONO').length
    }));
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name, JSON.stringify(st));
  }
  if (errs.length) console.log('BŁĘDY:', errs.join(' | ')); else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
