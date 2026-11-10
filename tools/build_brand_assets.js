/* ============================================================================
   BRAND ASSETS — odtwarzalne ikony i obraz OG (P0.2)
   ----------------------------------------------------------------------------
   Po co: ikona 192/512 + apple-touch 180 + obraz OG 1200×630 muszą być
   odtwarzalne z repo, a nie „skądś". Ikona pochodzi z assets/icon.svg,
   obraz OG to ZRZUT Z ATLASU (LGM nad Skandynawią) + typografia nałożona
   w HTML — zero stocków, zero zewnętrznych zależności.

   Uruchomienie:
       node tools/build_brand_assets.js
   (podnosi serwer statyczny na porcie 8399, renderuje przez Chromium)

   Zmienne środowiskowe jak w suitach: PA_CHROME, PA_PUPPETEER.
============================================================================ */
const puppeteer = require(process.env.PA_PUPPETEER || '/tmp/pptr/node_modules/puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8399;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const OG_HTML = (b64) => `<html><body style="margin:0;width:1200px;height:630px;
  font-family:'DejaVu Sans',system-ui,sans-serif;background:#0b0906">
<div style="position:relative;width:1200px;height:630px;overflow:hidden">
  <img src="data:image/png;base64,${b64}" style="position:absolute;left:0;top:0;width:1200px;height:630px">
  <div style="position:absolute;inset:0;background:linear-gradient(100deg,
       rgba(11,9,6,.96) 0%,rgba(11,9,6,.9) 34%,rgba(11,9,6,.28) 62%,rgba(11,9,6,.02) 100%)"></div>
  <div style="position:absolute;left:64px;top:74px;width:600px;color:#ece4d4">
    <div style="font-size:14px;letter-spacing:.30em;text-transform:uppercase;color:#d4a24a">atlas paleolitu i mezolitu</div>
    <div style="font-size:88px;font-weight:700;line-height:1;margin:16px 0 0">PaleoAtlas</div>
    <div style="font-size:27px;line-height:1.36;margin:22px 0 0">Zobacz, jak wyglądał świat przed nami —<br>mapa 3,3 mln lat z działającą osią czasu.</div>
    <div style="font-size:16px;line-height:1.75;margin:24px 0 0;color:#b7ac96">lądolód wg rekonstrukcji naukowych · biomy · dawne linie brzegowe<br>każda warstwa podpisana źródłem: DANE / SCHEMAT / MODEL</div>
    <div style="display:inline-block;margin-top:28px;font-size:14px;color:#7fb3c8;
         border:1px dashed rgba(127,179,200,.5);border-radius:999px;padding:7px 16px">bez kont i reklam · działa też offline (jeden plik)</div>
    <div style="margin-top:22px;font-size:13px;color:#8d8474">LGM, 21 tys. lat temu — zasięg lądolodu nad Skandynawią (zrzut z atlasu)</div>
  </div>
</div></body></html>`;

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: ROOT, stdio: 'ignore' });
  await sleep(1200);
  const browser = await puppeteer.launch({
    executablePath: process.env.PA_CHROME || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars']
  });

  try {
    /* ---------- 1. ikony z assets/icon.svg (tło #12100d — bez przezroczystości,
       bo iOS dokleja własne zaokrąglenie i przezroczysty róg wyszedłby czarny) ---------- */
    const svg = fs.readFileSync(path.join(ROOT, 'assets/icon.svg'), 'utf8');
    for (const size of [512, 192, 180]) {
      const page = await browser.newPage();
      await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
      const sized = svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`);
      await page.setContent(`<html><body style="margin:0;background:#12100d">
        <div style="width:${size}px;height:${size}px">${sized}</div></body></html>`);
      const out = path.join(ROOT, `assets/icon-${size}.png`);
      await page.screenshot({ path: out });
      console.log(`OK  assets/icon-${size}.png  ${size}×${size}  ${Math.round(fs.statSync(out).size / 1024)} kB`);
      await page.close();
    }

    /* ---------- 2. zrzut mapy do obrazu OG: tryb paleo, LGM, bez paneli ---------- */
    const map = await browser.newPage();
    await map.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await map.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2', timeout: 90000 });
    await sleep(2500);
    await map.evaluate(() => {
      const PA = window.__PA;
      /* warstwy „czytelne w miniaturze": ląd + lądolód; biomy/pyłek OFF (kolorowa plama) */
      PA.map.removeLayer(PA.group.biome);
      PA.map.removeLayer(PA.group.pollen);
      ['#top', '#legend', '#phasecard', '#timeline', '.leaflet-control-layers',
        '.leaflet-control-zoom', '.biome-legend', '.leaflet-control-attribution']
        .forEach(sel => { const el = document.querySelector(sel); if (el) el.style.display = 'none'; });
      document.getElementById('map').style.inset = '0';
      PA.setSlider(PA.bpToSlider(21000));            // LGM
      PA.map.setView([56.5, 17], 4, { animate: false });
      PA.map.invalidateSize();
    });
    await sleep(3000);
    const shot = await map.screenshot({ encoding: 'base64' });
    await map.close();

    const og = await browser.newPage();
    await og.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await og.setContent(OG_HTML(shot));
    await sleep(700);
    const outOg = path.join(ROOT, 'assets/og-image.png');
    await og.screenshot({ path: outOg });
    console.log(`OK  assets/og-image.png  1200×630  ${Math.round(fs.statSync(outOg).size / 1024)} kB`);
    await og.close();
  } catch (e) {
    console.error('BŁĄD: ' + e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.kill();
  }
})();
