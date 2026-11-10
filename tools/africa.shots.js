const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8369','--bind','127.0.0.1'], {cwd:'/home/user/paleoatlas'});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8369/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['af1_lgm_eafrica', 21500, [2, 33], 5],      // Kili + Kenia + Ruwenzori (dyski LGM)
    ['af2_lgm_kili_zoom', 21500, [-3.07, 37.35], 7],
    ['af3_dryas_atlas', 12300, [31.2, -7.3], 6], // Atlas w mł. dryasie (readvance)
    ['af4_now_eafrica', 1000, [2, 33], 5]
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp,c,z]) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp,c,z]);
    await sleep(650);
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name);
  }
  console.log(errs.length ? 'BŁĘDY: ' + errs.join(' | ') : 'brak błędów JS');
  await b.close(); server.kill();
})();
