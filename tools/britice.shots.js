const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8367','--bind','127.0.0.1'], {cwd:'/home/user/paleoatlas'});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8367/', {waitUntil:'networkidle2'}); await sleep(1800);
  const shots = [
    ['b1_lgm_britain', 21500, [53.6, -2.6], 5],        // BRITICE-CHRONO 21 ka — maksimum BIIS
    ['b2_18ka_britain', 17500, [54, -2.6], 5],         // po impulsie zapaści 21–18 ka
    ['b3_15ka_britain', 15000, [55.5, -4.5], 5],       // szczątki (ostatnia izochrona zbioru)
    ['b4_ba_bez_lodu', 13600, [53.8, -2.6], 5],        // boling–allerod: Wyspy BEZ lodu
    ['b5_yd_lochlomond', 12300, [56.3, -4.6], 6]       // mł. dryas: DATED-1 12 ka (Loch Lomond readvance)
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp,c,z]) => {
      window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z);
    }, [bp,c,z]);
    await sleep(650);
    const env = await p.evaluate(() => {
      const e = window.__PA.envTickForBP(window.__PA.bp);
      const bri = window.__PA.envIcePolys(e).filter(x => x.src === 'BRITICE-CHRONO');
      return {env: e && e.label.slice(0,44), BRITICE: bri.length};
    });
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name, JSON.stringify(env));
  }
  if (errs.length) console.log('BŁĘDY:', errs.join(' | ')); else console.log('brak błędów JS');
  await b.close(); server.kill();
})();
