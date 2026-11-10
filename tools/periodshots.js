const puppeteer = require('/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8337','--bind','127.0.0.1'], {cwd:'/home/user/paleoatlas'});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  await p.setViewport({width:1500, height:980});
  await p.goto('http://127.0.0.1:8337/', {waitUntil:'networkidle2'}); await sleep(1600);
  const shots = [  // [nazwa, BP_lata, centrum, zoom]
    ['p1_sanian_do_karpat', 480000, [50.8, 18.5], 6],
    ['p2_saalian_mis6_eurazja', 155000, [58, 45], 3],
    ['p3_mis4_azja', 65000, [58, 45], 3],
    ['n1_lgm_swiat', 21500, [60, 30], 3],
    ['n2_lgm_europa_leszno', 21500, [53.4, 17.5], 5],
    ['n3_pomorska_doggerland', 15000, [56, 8], 4],
    ['n4_beringia_lgm', 21500, [64, 190], 3],
    ['n5_ba_gardno', 13600, [55, 17], 5],
    ['n6_wczesny_holocen', 10500, [56, 15], 4],
    ['n7_mis12_europa_san', 450000, [53, 20], 5],
    ['n8_mis8_odra_portal_vs_batchelor', 280000, [54, 16], 5],
    ['n9_gauss_2700ka_swiat', 2750000, [55, 30], 2],
    ['n10_matuyama_2500ka', 2500000, [55, 30], 2]
  ];
  for (const [name, bp, c, z] of shots) {
    await p.evaluate(([bp,c,z]) => { window.__PA.setSlider(window.__PA.bpToSlider(bp)); window.__PA.map.setView(c, z); }, [bp,c,z]);
    await sleep(600);
    await p.screenshot({path: '/tmp/shots/' + name + '.png'});
    console.log('📸', name);
  }
  await b.close(); server.kill();
})();
