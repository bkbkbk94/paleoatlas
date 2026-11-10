const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const server = spawn('python3', ['-m','http.server','8372','--bind','127.0.0.1'], {cwd: require('path').resolve(__dirname, '..')});
  await sleep(1200);
  const b = await puppeteer.launch({executablePath: process.env.PA_CHROME || '/usr/bin/chromium', headless:true, args:['--no-sandbox','--disable-dev-shm-usage']});
  const p = await b.newPage();
  await p.setViewport({width:1100, height:760});
  await p.goto('http://127.0.0.1:8372/', {waitUntil:'networkidle2'}); await sleep(1800);
  // B–A (13,6 ka): Sudirman 850 km²
  await p.evaluate(() => { window.__PA.setSlider(window.__PA.bpToSlider(13600)); window.__PA.map.setView([-4.6, 138.4], 6); });
  await sleep(650);
  await p.screenshot({path: '/tmp/shots/au8_bolling_papua_z6.png'});
  console.log('📸 au8_bolling (Sudirman ~850 km²)');
  // mł. dryas (12,3 ka): Sudirman 510 km² — widoczna cofka BEZ readvance
  await p.evaluate(() => { window.__PA.setSlider(window.__PA.bpToSlider(12300)); });
  await sleep(650);
  await p.screenshot({path: '/tmp/shots/au9_dryas_papua_z6.png'});
  console.log('📸 au9_dryas (Sudirman ~510 km² — cofka, nie readvance)');
  await b.close(); server.kill();
})();
