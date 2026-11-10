/* ============================================================================
   globe.js — widok kulisty (ortograficzny) portalu, renderowany w canvas 2D.
   Przyczyna: w płaskim Merkatorze Beringia leży dokładnie na szwie ±180°
   (mapa „kończy się”, a worldCopyJump tylko przeskakuje kopie świata).
   Na globie szwu nie ma w ogóle — Chukotka i Alaska sąsiadują naturalnie.

   Dane: TE SAME co płaska mapa (window.__PA.envIcePolys / SHELVES / WORLD_LAND /
   SITES) — poligony outers+holes, src/DANE_PORTALU/schemat przeniesione 1:1,
   biblioteka d3-geo (v7, vendor) robi przecinanie antypołudnika i horyzontu.
   Winda współrzędnych: GeoJSON RFC 7946 (outer CCW / holes CW) + lon→[−180,180].
============================================================================ */
(function () {
  const COLORS = {};
  (window.META.kultury || []).forEach(k => COLORS[k.id] = k.kolor);

  const LAND_COLOR = '#cfc39f', LAND_STROKE = '#6b5f45';
  const SHELF_LEVELS = [-125, -110, -100, -95, -80, -75, -60, -55, -50, -30, -5];

  let cv, ctx, wrap, hudEpoch;
  let inited = false, active = false, rafId = null;
  let center = { lon: 18, lat: 44 };         // widok startowy: Europa Płn.-Wsch. (Beringia 2 przeciągnięcia)
  let scaleK = 1.0;                          // mnożnik zoomu
  let dirty = true, lastBp = null;
  const FC = {};                              // cache: klucz epoki -> FeatureCollection lądolodu
  const SHFC = {};                            // cache: poziom -> FeatureCollection szelfu
  let LAND = null;                            // Natural Earth (FeatureCollection, już GeoJSON)

  /* --------------------- biomy (raster 0,5°) + kotwice pyłkowe (DANE) ----------------------
     Te same pliki co płaska mapa (window.__PA.biomeGridFor + BIOME_META/BIOME_POLLEN);
     hierarchia warstw identyczna: biom POD lądolodem, pyłek NAD lądolodem, POD stanowiskami. */
  let biomeOn = true, pollenOn = true, interacting = false;
  const DBG = { file: null, grid: false, pollen: 0, pollenKey: null, renderMs: 0,
    seg: { land: 0, biome: 0, ice: 0, pollenMs: 0, sites: 0, rest: 0 } };   // profil segmentów (wydajność)
  let palRgb = null, palCss = null, offCv = null, offCtx = null;
  let lastImg = null, lastOW = 0, lastOH = 0;          // reużywalny bufor ImageData (zero alokacji/klatkę)
  let LAND_SIMPLE = null;
  const FC_SIMPLE = {};                                  // uproszczone FC lądolodu per epoki (podgląd w ruchu)
  function simplifyRingDP(r, tol2) {                   // Douglas-Peucker (płaski [lon,lat]) — TYLKO podgląd w ruchu
    const keep = new Uint8Array(r.length); keep[0] = keep[r.length - 1] = 1;
    const stack = [[0, r.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const ax = r[a][0], ay = r[a][1], bx = r[b][0], by = r[b][1];
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-12;
      let mi = -1, md = -1;
      for (let i = a + 1; i < b; i++) {
        const t01 = ((r[i][0] - ax) * dx + (r[i][1] - ay) * dy) / len2;
        const ex = ax + t01 * dx - r[i][0], ey = ay + t01 * dy - r[i][1];
        const d2 = ex * ex + ey * ey;
        if (d2 > md) { md = d2; mi = i; }
      }
      if (md > tol2 && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    const out = [];
    for (let i = 0; i < r.length; i++) if (keep[i]) out.push(r[i]);
    return out.length >= 4 ? out : r;
  }
  function landSimplified() {                          // cache: Natural Earth po DP ~0,18° (~5-8× mniej segmentów)
    if (!LAND_SIMPLE) {
      const tol2 = 0.25 * 0.25;
      LAND_SIMPLE = {
        type: 'FeatureCollection',
        features: (window.WORLD_LAND.features || []).map(f => ({
          type: 'Feature', properties: f.properties || {},
          geometry: {
            type: f.geometry.type,
            coordinates: f.geometry.type === 'Polygon'
              ? f.geometry.coordinates.map(rr => simplifyRingDP(rr, tol2))
              : f.geometry.coordinates.map(pp => pp.map(rr => simplifyRingDP(rr, tol2)))
          }
        }))
      };
    }
    return LAND_SIMPLE;
  }
  let BIOP = null, LAST_PROJ = null;      // stałe bazy widoku + ostatni proj (testy porównawcze)
  /* --------- cache pikselowy klatek (zero zmiany jakości: identyczna rasteryzacja, tylko rzadziej) ---------
     BASE: ocean+siatka+szelf+ląd — zależy od (widok, poziom morza, tryb podglądu); HIT przy scrubie osi.
     ICE: lądolody+jeziora — zależy od (epoka, widok); HIT przy powrotach suwaka do tej samej epoki. */
  const BASE_PIX = new Map(), ICE_PIX = new Map();
  function layerCanvas(w, h) {
    const dpr = window.devicePixelRatio || 1;
    const cv2 = document.createElement('canvas');
    cv2.width = Math.round(w * dpr); cv2.height = Math.round(h * dpr);
    const cx2 = cv2.getContext('2d');
    cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { cv: cv2, ctx: cx2 };
  }
  function pxGet(map, key) { const v = map.get(key); if (v) { map.delete(key); map.set(key, v); } return v || null; }
  function pxSet(map, key, v, max) { map.set(key, v); while (map.size > max) map.delete(map.keys().next().value); }
  function blit(ly) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(ly.cv, 0, 0); ctx.restore();
  }
  function biomeProjConsts(w, h, R) {
    const rad = Math.PI / 180;
    const lc = center.lon * rad, fc = center.lat * rad;
    const sL = Math.sin(lc), cL = Math.cos(lc), sF = Math.sin(fc), cF = Math.cos(fc);
    BIOP = {
      cx: w / 2, cy: h / 2, R,
      ux: cF * cL, uy: cF * sL, uz: sF,
      ex: -sL, ey: cL,
      nx: -sF * cL, ny: -sF * sL, nz: cF
    };
  }
  function paletteRgb() {
    if (!palRgb) {
      palRgb = new Uint8Array(29 * 3); palCss = [];
      const pal = (window.BIOME_META || {}).palette || {};
      for (const k of Object.keys(pal)) {
        const hex = pal[k];
        palRgb[k * 3] = parseInt(hex.slice(1, 3), 16);
        palRgb[k * 3 + 1] = parseInt(hex.slice(3, 5), 16);
        palRgb[k * 3 + 2] = parseInt(hex.slice(5, 7), 16);
        palCss[k] = hex;
      }
    }
    return palRgb;
  }

  /* ------------------------- normalizacja geometrii ------------------------ */
  const normLon = lon => lon > 180 ? lon - 360 : lon < -180 ? lon + 360 : lon;
  function signedPlanar(r) {                    // >0 = CCW w płaszczyźnie (lon,lat)
    let s = 0;
    for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
    return s / 2;
  }
  function ringToGeo(ring) {                    // [lat,lon] -> [lon,lat], domknięcie + norm ±180
    const out = ring.map(p => [normLon(p[1]), p[0]]);
    const a = out[0], b = out[out.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) out.push([a[0], a[1]]);
    return out;
  }
  function polysToFC(polys) {                   // [{rings}|{pts}, name, src] -> FeatureCollection (RFC 7946)
    const feats = [];
    (polys || []).forEach(p => {
      const src = p.rings_globe || p.rings || [p.pts];   // rings_globe: wariant ciągły 0..360 bez szwu (ICE-6G_C Antarktyda)
      const grings = src.map(ringToGeo).filter(r => r.length >= 4);
      if (!grings.length) return;
      // orientacja: outer = CCW (dodatnia powierzchnia), holes = CW
      for (let i = 0; i < grings.length; i++) {
        const s = signedPlanar(grings[i]);
        if (i === 0 ? s < 0 : s > 0) grings[i] = grings[i].slice().reverse();
      }
      feats.push({
        type: 'Feature',
        properties: { n: p.name || '', s: p.src || 'SCHEMAT', lk: p.lake ? 1 : 0 },
        geometry: { type: 'Polygon', coordinates: grings }
      });
    });
    return { type: 'FeatureCollection', features: feats };
  }

  /* ----------------------- culling: features całkowicie na odwrotnej półkuli ------------
     Dla każdego feature (raz): centroid sferyczny + maks. odległość kątowa wierzchołków
     od centroidu. W klatce odrzucamy te, których CAŁY zasięg jest > 90° od środka widoku
     (z marginesem 2°) — matematyczna gwarancja niewidoczności, zero zmiany obrazu. */
  const ANG = new Map();                                    // feature -> {lam, phi, rad}
  function angSpan(f) {
    let s = ANG.get(f);
    if (!s) {
      const rad = Math.PI / 180, DEG = 180 / Math.PI;
      let sx = 0, sy = 0, sz = 0, n = 0;
      const walk = r2 => r2.forEach(pt => {
        const lam = pt[0] * rad, phi = pt[1] * rad;
        sx += Math.cos(phi) * Math.cos(lam); sy += Math.cos(phi) * Math.sin(lam); sz += Math.sin(phi); n++;
      });
      if (f.geometry.type === 'Polygon') f.geometry.coordinates.forEach(walk);
      else f.geometry.coordinates.forEach(pp => pp.forEach(walk));
      let cl = Math.atan2(sy, sx), cp = Math.asin(Math.max(-1, Math.min(1, sz / n)));
      let mx = 0;
      const walk2 = r2 => r2.forEach(pt => {
        const lam = pt[0] * rad, phi = pt[1] * rad;
        const c = Math.sin(cp) * Math.sin(phi) + Math.cos(cp) * Math.cos(phi) * Math.cos(lam - cl);
        const d = Math.acos(Math.max(-1, Math.min(1, c)));
        if (d > mx) mx = d;
      });
      if (f.geometry.type === 'Polygon') f.geometry.coordinates.forEach(walk2);
      else f.geometry.coordinates.forEach(pp => pp.forEach(walk2));
      s = { lam: cl, phi: cp, rad: mx };
      ANG.set(f, s);
    }
    return s;
  }
  function fcFront(fc) {                                    // przefiltruj FC do features częściowo widocznych
    const rad = Math.PI / 180;
    const sF = Math.sin(center.lat * rad), cF = Math.cos(center.lat * rad), cL = center.lon * rad;
    const lim = Math.PI / 2 + 2 * rad;                      // 90° + margines 2°
    const feats = fc.features.filter(f => {
      const a = angSpan(f);
      if (a.rad >= lim) return true;                        // ogromny feature (sf. zawinięty) — zawsze rysuj
      const c = sF * Math.sin(a.phi) + cF * Math.cos(a.phi) * Math.cos(a.lam - cL);
      return Math.acos(Math.max(-1, Math.min(1, c))) - a.rad <= lim;
    });
    return feats.length === fc.features.length ? fc : { type: 'FeatureCollection', features: feats };
  }

  function iceEpochKey(bp) {
    const env = window.__PA.envTickForBP(bp);
    const bv = (window.BRITICE_VARIANT || 'opt');   // wariant BIIS: odrębny cache na wariant
    if (!env) return 'set:now';
    if (env.ice) return 'set:' + env.ice + ':' + bv;
    if (env.q) return 'q:' + env.q + ':' + bv;
    return 'set:now';
  }
  function iceFCRaw(bp) { return iceFC(bp); }
  function iceFCSimple(bp) {                             // to samo FC po DP ~0,2° — TYLKO podgląd przeciągania
    const key = 's:' + iceEpochKey(bp);
    if (!FC_SIMPLE[key]) {
      const src = iceFC(bp), tol2 = 0.35 * 0.35;
      FC_SIMPLE[key] = {
        type: 'FeatureCollection',
        features: src.features.map(f => ({
          type: 'Feature', properties: f.properties,
          geometry: {
            type: 'Polygon',
            coordinates: f.geometry.coordinates.map(r2 => simplifyRingDP(r2, tol2))
          }
        }))
      };
    }
    return FC_SIMPLE[key];
  }
  function iceFC(bp) {
    const key = iceEpochKey(bp);
    if (!FC[key]) {
      const env = window.__PA.envTickForBP(bp);
      const polySrc = window.__PA.envIcePolysCached ? window.__PA.envIcePolysCached(env) : window.__PA.envIcePolys(env);
      FC[key] = polysToFC(polySrc);
      // walcz z „sferycznym odwrotem”: jeśli komplet > 2π steradian, odwróć orientację
      FC[key].features.forEach(f => {
        if (d3.geoArea(f.geometry) > 2 * Math.PI) {
          f.geometry.coordinates = f.geometry.coordinates.map(r => r.slice().reverse());
        }
      });
    }
    return FC[key];
  }
  function shelfFC(lvl) {
    if (!SHFC[lvl]) {
      const polys = (window.SHELVES[String(lvl)] || []).map(pp => ({ rings: pp }));
      SHFC[lvl] = polysToFC(polys);
      SHFC[lvl].features.forEach(f => {
        if (d3.geoArea(f.geometry) > 2 * Math.PI) {
          f.geometry.coordinates = f.geometry.coordinates.map(r => r.slice().reverse());
        }
      });
    }
    return SHFC[lvl];
  }
  function landFC() {
    if (!LAND) LAND = window.WORLD_LAND;
    return LAND;
  }
  function shelfForSea(sea) {
    if (sea >= 0) return null;
    let best = SHELF_LEVELS[0];
    SHELF_LEVELS.forEach(l => { if (Math.abs(l - sea) < Math.abs(best - sea)) best = l; });
    return best;
  }
  /* Raster biomów: próbkowanie przez ODWRÓCONY rzut (każdy piksel ekranu → lon/lat →
     najbliższa komórka 0,5°). W spoczynku krok 2 px urządzenia — przy skali 1 to dokładnie
     rozdzielczość danych (360 wierszy na tarczę ~760 px), przy zoomie nadpróbkowanie
     najbliższym sąsiadem: zero utraty jakości. W trakcie przeciągania podgląd 4 px,
     po puszczeniu schodzi klatka końcowa 2 px. */
  function drawBiomeLayer(w, h) {
    DBG.grid = false;
    if (!biomeOn || !window.__PA || !window.__PA.biomeGridFor) { DBG.file = null; return; }
    const got = window.__PA.biomeGridFor(window.__PA.bp);
    if (!got) { DBG.file = null; return; }
    DBG.file = got.epoch.file;
    if (!got.grid || !BIOP) return;                         // PNG doczytuje się w tle — markDirty przyjdzie z loadBiomeRaster
    const grid = got.grid, pal = paletteRgb();
    const bp = BIOP;
    const dkr = 360 / Math.PI;                              // komórki 0,5° → 720 na 2π (lon) i 360 na π (lat)
    const dpr = window.devicePixelRatio || 1;
    const s = (interacting ? 4 : 2) / dpr;                  // krok w jednostkach CSS
    const ow = Math.max(1, Math.ceil(w / s)), oh = Math.max(1, Math.ceil(h / s));
    if (!offCv) { offCv = document.createElement('canvas'); offCtx = offCv.getContext('2d'); }
    if (offCv.width !== ow || offCv.height !== oh) { offCv.width = ow; offCv.height = oh; lastImg = null; }
    if (!lastImg || lastOW !== ow || lastOH !== oh) { lastImg = offCtx.createImageData(ow, oh); lastOW = ow; lastOH = oh; }
    const img = lastImg;
    const d = img.data;
    d.fill(0);                                          // wyczyść poprzednią klatkę (bez nowej alokacji)
    const ux = bp.ux, uy = bp.uy, uz = bp.uz, ex = bp.ex, ey = bp.ey, nx = bp.nx, ny = bp.ny, nz = bp.nz;
    const cx = bp.cx, cy0 = bp.cy, R = bp.R;
    for (let y = 0; y < oh; y++) {
      const yu = ((y + 0.5) * s - cy0) / R;
      const yy = yu * yu;
      for (let x = 0; x < ow; x++) {
        const xu = ((x + 0.5) * s - cx) / R;
        const rho2 = xu * xu + yy;
        if (rho2 > 1) continue;                             // poza tarczą — zostaje tło
        const z = Math.sqrt(1 - rho2);
        const px = z * ux + xu * ex - yu * nx;
        const py = z * uy + xu * ey - yu * ny;
        const pz = z * uz - yu * nz;
        if (pz > 1 || pz < -1) continue;                    // szum zmiennopozycyjny na krawędzi
        const iy = ((Math.PI / 2 - Math.asin(pz)) * dkr) | 0;
        let ix = ((Math.atan2(py, px) + Math.PI) * dkr) | 0;
        if (ix > 719) ix = 719;
        const k = grid[(iy > 359 ? 359 : iy) * 720 + ix];
        if (!k) continue;                                   // 0 = ocean (zostaje kolor bazowy)
        const o = (y * ow + x) << 2;
        d[o] = pal[k * 3]; d[o + 1] = pal[k * 3 + 1]; d[o + 2] = pal[k * 3 + 2]; d[o + 3] = 242;   // ~0,95 jak na płaskiej mapie
      }
    }
    offCtx.putImageData(img, 0, 0);
    const sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;                      // najbliższy sąsiad — dokładne barwy klas
    ctx.drawImage(offCv, 0, 0, ow, oh, 0, 0, w, h);
    ctx.imageSmoothingEnabled = sm;
    DBG.grid = true;
  }

  /* Kotwice pyłkowe (DANE: BIOME 6000 v4.2) — z epok kotwicznych 0k/6k/18k, tylko przednia półkula */
  function drawPollenLayer(proj) {
    DBG.pollen = 0; DBG.pollenKey = null;
    if (!pollenOn || !window.BIOME_POLLEN || !window.__PA) return;
    const e = window.__PA.biomeEpochForBP(window.__PA.bp); if (!e) return;
    const key = window.__PA.biomePollenKeyFor(e); if (!key) return;
    const pts = window.BIOME_POLLEN[key]; if (!pts || !pts.length) return;
    paletteRgb();
    const cRad = Math.PI / 180, cLam = center.lon * cRad, cPhi = center.lat * cRad;
    DBG.pollenKey = key;
    pts.forEach(pt => {
      const lam = pt[1] * cRad, phi = pt[0] * cRad;
      const cosd = Math.sin(cPhi) * Math.sin(phi) + Math.cos(cPhi) * Math.cos(phi) * Math.cos(lam - cLam);
      if (cosd <= 0) return;
      const xy = proj([pt[1], pt[0]]);
      if (!xy) return;
      ctx.beginPath();
      ctx.arc(xy[0], xy[1], 2.3 / Math.sqrt(scaleK) + 0.9, 0, 7);
      ctx.fillStyle = palCss[pt[2]] || '#888';
      ctx.fill();
      ctx.strokeStyle = 'rgba(12,12,12,.7)'; ctx.lineWidth = 0.6; ctx.stroke();
      DBG.pollen++;
    });
  }

  const sitesVisible = bp =>
    window.SITES.rdzen.filter(s => !s.duplikat_patrz && s.od >= bp && s.do <= bp)
      .concat(window.SITES.sasiedzi.filter(s => s.od >= bp && s.do <= bp));

  /* rysowanie warstw (ctx parametryzowany — główny lub cache'owany offscreen; proj/path współdzielone) */
  function drawBase(c2, path, lvl) {
    path.context(c2);
    // ocean sferyczny
    c2.beginPath(); path({ type: 'Sphere' });
    c2.fillStyle = '#a9bfc9'; c2.fill();
    // siatka
    c2.beginPath(); path(d3.geoGraticule10());
    c2.strokeStyle = 'rgba(20,40,55,.10)'; c2.lineWidth = 0.6; c2.stroke();
    // dawne lądy (szelf) pod współczesnym lądem
    if (lvl !== null && window.SHELVES) {
      c2.beginPath(); path(fcFront(shelfFC(lvl)));
      c2.fillStyle = LAND_COLOR; c2.globalAlpha = 0.9; c2.fill();
      c2.globalAlpha = 1; c2.strokeStyle = 'rgba(138,127,92,.8)'; c2.lineWidth = 0.7; c2.stroke();
    }
    // ląd współczesny (Natural Earth)
    c2.beginPath(); path(fcFront(interacting ? landSimplified() : landFC()));
    c2.fillStyle = LAND_COLOR; c2.fill();
    if (!interacting) { c2.strokeStyle = 'rgba(107,95,69,.55)'; c2.lineWidth = 0.5; c2.stroke(); }
  }
  function drawIce(c2, path, bp, fast) {
    const _ice = fast ? iceFCSimple(bp) : iceFC(bp);
    const _iceF = fcFront(_ice);
    path.context(c2);
    // paleojeziora (lk) jako WODA przylegająca do krawędzi lodu — lód przykrywa je częściowo
    const _lakes = _iceF.features.filter(f => f.properties.lk);
    if (_lakes.length) {
      c2.beginPath(); path({ type: 'FeatureCollection', features: _lakes });
      c2.fillStyle = '#4d97d4'; c2.globalAlpha = 0.7; c2.fill();
      c2.globalAlpha = 1;
    }
    c2.beginPath(); path({ type: 'FeatureCollection', features: _iceF.features.filter(f => !f.properties.lk) });
    c2.fillStyle = '#e8f1f8'; c2.globalAlpha = 0.88; c2.fill();
    c2.globalAlpha = 1;
    /* ICE-6G_C Antarktyda: pierścień rozcięty do bieguna — obrys kreśliłby widoczny południk;
       brzeg i tak czytelny z wypełnienia */
    const _iceStroked = _iceF.features.every(f => f.properties.s === 'ICE6G') ? null
      : { type: 'FeatureCollection', features: _iceF.features.filter(f => f.properties.s !== 'ICE6G') };
    if (_iceStroked && !fast) {
      c2.beginPath(); path(_iceStroked);
      c2.strokeStyle = '#9fb8c8'; c2.lineWidth = 1.0; c2.stroke();
    }
  }

  /* ------------------------------- render ---------------------------------- */
  function render() {
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const R = Math.min(w, h) / 2 - 8;
    const proj = LAST_PROJ = d3.geoOrthographic()
      .rotate([-center.lon, -center.lat])
      .translate([w / 2, h / 2])
      .scale(R * scaleK)
      .clipAngle(90)
      .precision(interacting ? 5.0 : 1.0);             // w ruchu grubsze resamplowanie łuków; klatka końcowa 1,0 (subpx)
    biomeProjConsts(w, h, R * scaleK);
    const path = d3.geoPath(proj, ctx);
    const bp = window.__PA.bp;
    const env = window.__PA.envTickForBP(bp);

    ctx.clearRect(0, 0, w, h);

    /* ---- BASE: ocean+siatka+szelf+ląd (cache pikselowy per widok+poziom morza; przy dragu — uproszczenie) ---- */
    const lvl = shelfForSea(window.__PA.seaAtBP(bp));
    const viewKey = center.lon.toFixed(3) + '|' + center.lat.toFixed(3) + '|' + scaleK.toFixed(4) + '|' + w + 'x' + h + '|' + (window.devicePixelRatio || 1) + '|' + (interacting ? 'f' : 'c');
    let _t = performance.now();
    if (!interacting) {
      let ly = pxGet(BASE_PIX, 'B|' + lvl + '|' + viewKey);
      if (!ly) {
        ly = layerCanvas(w, h);
        ly.ctx.clearRect(0, 0, w, h);
        drawBase(ly.ctx, path, lvl);
        pxSet(BASE_PIX, 'B|' + lvl + '|' + viewKey, ly, 7);
      }
      blit(ly);
    } else {
      drawBase(ctx, path, lvl);
    }
    DBG.seg.land = performance.now() - _t;
    // biomy epoki (te same rastry co płaska mapa; POD lądolodem)
    _t = performance.now(); drawBiomeLayer(w, h); DBG.seg.biome = performance.now() - _t;
    // lądolody epoki (ta sama warstwa co płaska mapa); paleojeziora (lk) rysowane
    // wcześniej — jako WODA przylegająca do krawędzi lodu, lód przykrywa je częściowo
    _t = performance.now();
    // lądolody epoki (ta sama warstwa co płaska mapa) + paleojeziora — cache pikselowy per epoka+widok
    if (!interacting) {
      let ly = pxGet(ICE_PIX, 'I|' + iceEpochKey(bp) + '|' + viewKey);
      if (!ly) {
        ly = layerCanvas(w, h);
        ly.ctx.clearRect(0, 0, w, h);
        drawIce(ly.ctx, path, bp, false);
        pxSet(ICE_PIX, 'I|' + iceEpochKey(bp) + '|' + viewKey, ly, 10);
      }
      blit(ly);
    } else {
      drawIce(ctx, path, bp, true);
    }
    DBG.seg.ice = performance.now() - _t;
    path.context(ctx);                              // drawBase/drawIce przestawiają kontekst path — wracamy do głównego
    // kotwice pyłkowe (DANE) — NAD lądolodem, POD stanowiskami (jak płaska mapa)
    _t = performance.now(); drawPollenLayer(proj); DBG.seg.pollenMs = performance.now() - _t;
    _t = performance.now();
    // stanowiska — krople w kolorze kultury, tylko przednia półkula
    const cRad = Math.PI / 180;
    const cLam = center.lon * cRad, cPhi = center.lat * cRad;
    sitesVisible(bp).forEach(s => {
      const lam = s.lon * cRad, phi = s.lat * cRad;
      const cosd = Math.sin(cPhi) * Math.sin(phi) + Math.cos(cPhi) * Math.cos(phi) * Math.cos(lam - cLam);
      if (cosd <= 0) return;                               // odwrotna strona kuli
      const xy = proj([s.lon, s.lat]);
      if (!xy) return;
      ctx.beginPath();
      ctx.arc(xy[0], xy[1], 2.4 / Math.sqrt(scaleK) + 1.1, 0, 7);
      ctx.fillStyle = COLORS[s.kultura] || '#888';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 0.7; ctx.stroke();
    });
    DBG.seg.sites = performance.now() - _t;
    // poświata atmosfery (obrys tarczy)
    const g = ctx.createRadialGradient(w / 2, h / 2, R * scaleK * 0.985, w / 2, h / 2, R * scaleK * 1.02);
    g.addColorStop(0, 'rgba(140,170,190,0)');
    g.addColorStop(0.5, 'rgba(120,155,180,.35)');
    g.addColorStop(1, 'rgba(120,155,180,0)');
    ctx.beginPath(); ctx.arc(w / 2, h / 2, R * scaleK * 1.02, 0, 7);
    ctx.fillStyle = g; ctx.fill();

    if (hudEpoch) {
      const srcs = window.__PA.envIcePolys(env).map(p => p.src || 'SCHEMAT');
      const uniq = Array.from(new Set(srcs));
      hudEpoch.textContent = '🛰 ' + (env ? env.label : '') + ' · warstwy: ' + uniq.join(' + ');
      if (biomeOn && DBG.file) {
        const me = (window.BIOME_META || { epochs: [] }).epochs.find(x => x.file === DBG.file);
        hudEpoch.textContent += ' · 🌿 ' + (me ? me.srctag : DBG.file);
      }
      if (pollenOn && DBG.pollenKey)
        hudEpoch.textContent += ' · 🌾 BIOME 6000 ' + DBG.pollenKey + ': ' + DBG.pollen + ' pkt z tej półkuli (DANE)';
    }
  }

  /* ------------------------------ interakcja ------------------------------- */
  const pointers = new Map();
  let drag0 = null, pinch0 = null;
  function onDown(e) {
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    interacting = true;
    if (pointers.size === 1) drag0 = { x: e.clientX, y: e.clientY, lon: center.lon, lat: center.lat };
    else if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      pinch0 = { d: Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]), k: scaleK };
      drag0 = null;
    }
  }
  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (pointers.size === 1 && drag0) {
      const k = 0.28 / scaleK;                             // stopnie na px przeciągnięcia
      center.lon = drag0.lon - (e.clientX - drag0.x) * k;
      center.lat = Math.max(-85, Math.min(85, drag0.lat + (e.clientY - drag0.y) * k));
      dirty = true;
    } else if (pointers.size === 2 && pinch0) {
      const pts = Array.from(pointers.values());
      const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
      scaleK = Math.max(0.55, Math.min(6, pinch0.k * (d / Math.max(30, pinch0.d))));
      dirty = true;
    }
  }
  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size === 1) {
      const p = Array.from(pointers.values())[0];
      drag0 = { x: p[0], y: p[1], lon: center.lon, lat: center.lat };
    } else { drag0 = null; pinch0 = null; }
    interacting = pointers.size > 0;                        // koniec gestu → klatka końcowa w pełnej rozdzielczości
    dirty = true;
  }
  function onWheel(e) {
    e.preventDefault();
    scaleK = Math.max(0.55, Math.min(6, scaleK * (e.deltaY < 0 ? 1.14 : 0.88)));
    dirty = true;
  }

  function loop() {
    if (!active) return;
    const bp = window.__PA && window.__PA.bp;
    if (bp !== lastBp) { lastBp = bp; dirty = true; }
    if (dirty) { dirty = false; const t0 = performance.now(); render(); DBG.renderMs = performance.now() - t0;
      DBG.pix = { base: BASE_PIX.size, ice: ICE_PIX.size }; }
    rafId = requestAnimationFrame(loop);
  }

  function init() {
    if (inited) return;
    inited = true;
    wrap = document.getElementById('globe-wrap');
    cv = document.getElementById('globe-cv');
    hudEpoch = document.getElementById('globe-epoch');
    ctx = cv.getContext('2d');
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', () => { dirty = true; });
    const tB = document.getElementById('gt-biome'), tP = document.getElementById('gt-pollen');
    if (tB) tB.addEventListener('click', () => { biomeOn = !biomeOn; tB.classList.toggle('on', biomeOn); dirty = true; });
    if (tP) tP.addEventListener('click', () => { pollenOn = !pollenOn; tP.classList.toggle('on', pollenOn); dirty = true; });
  }

  window.GLOBE = {
    activate() {
      init();
      if (active) return;
      active = true; dirty = true;
      if (!rafId) rafId = requestAnimationFrame(loop);
    },
    deactivate() {
      active = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    },
    setCenter(lon, lat) { center = { lon, lat: Math.max(-85, Math.min(85, lat)) }; dirty = true; },
    getCenter() { return { lon: center.lon, lat: center.lat }; },
    setScale(k) { scaleK = Math.max(0.55, Math.min(6, k)); dirty = true; },
    getScale() { return scaleK; },
    markDirty() { dirty = true; },
    setBiome(b) { biomeOn = !!b; const t = document.getElementById('gt-biome'); if (t) t.classList.toggle('on', biomeOn); dirty = true; },
    setPollen(b) { pollenOn = !!b; const t = document.getElementById('gt-pollen'); if (t) t.classList.toggle('on', pollenOn); dirty = true; },
    getBiome() { return { biome: biomeOn, pollen: pollenOn }; },
    _dbg: DBG,
    _classProbe(step) {                                // dla testów: piksele canvasu → najbliższa klasa palety BIOME4
      const meta = window.BIOME_META; if (!meta) return null;
      const pal = paletteRgb();
      const st = step || 6;
      let data;
      try { data = ctx.getImageData(0, 0, cv.width, cv.height).data; }
      catch (e) { return { per: {}, matchedFrac: 0, tot: 0, tainted: true }; }    // file:// taintuje canvas

      const per = {}; let tot = 0, matched = 0;
      for (let y = 0; y < cv.height; y += st) for (let x = 0; x < cv.width; x += st) {
        const i = (y * cv.width + x) << 2;
        if (data[i + 3] < 200) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        let bk = 0, bd = 1e9;
        for (let k = 0; k <= 28; k++) {
          const dr = r - pal[k * 3], dg = g - pal[k * 3 + 1], db = b - pal[k * 3 + 2];
          const dd = dr * dr + dg * dg + db * db;
          if (dd < bd) { bd = dd; bk = k; }
        }
        if (bd <= 2025) { per[bk] = (per[bk] || 0) + 1; matched++; }    // dist ≤ 45 (blend 0,95 po podkładzie lądu)
        tot++;
      }
      return { per, matchedFrac: matched / Math.max(1, tot), tot };
    },
    _biprojCheck(n) {                                  // test: inline-invert (BIOP) vs d3 proj.invert — max błąd [rad]
      if (!BIOP || !LAST_PROJ) return null;
      let worst = 0, cnt = 0;
      const w = cv.width / (window.devicePixelRatio || 1), h = cv.height / (window.devicePixelRatio || 1);
      for (let i = 0; i < n * 4 && cnt < n; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        const ll = LAST_PROJ.invert([x, y]);
        if (!ll || !isFinite(ll[0]) || !isFinite(ll[1])) continue;
        cnt++;
        const xu = (x - BIOP.cx) / BIOP.R, yu = (y - BIOP.cy) / BIOP.R;
        const rho2 = xu * xu + yu * yu;
        if (rho2 > 1) continue;
        const z = Math.sqrt(1 - rho2);
        const px = z * BIOP.ux + xu * BIOP.ex - yu * BIOP.nx;
        const py = z * BIOP.uy + xu * BIOP.ey - yu * BIOP.ny;
        const pz = Math.max(-1, Math.min(1, z * BIOP.uz - yu * BIOP.nz));
        const lat2 = Math.asin(pz) * 180 / Math.PI;
        let lon2 = Math.atan2(py, px) * 180 / Math.PI;
        let dLon = Math.abs(lon2 - ll[0]); if (dLon > 360 - dLon) dLon = 360 - dLon;
        const dLat = Math.abs(lat2 - ll[1]);
        worst = Math.max(worst, dLon * Math.cos(ll[1] * Math.PI / 180) / 57.2958, dLat / 57.2958);
      }
      return { worst, cnt };
    },
    _ctxProbe(step) {                                   // dla testów: ułamek namalowanych pikseli lądolodu
      let d;
      try { d = ctx.getImageData(0, 0, cv.width, cv.height).data; }
      catch (e) { return { ice: 0, n: 0, tainted: true }; }   // file:// taintuje canvas
      let ice = 0, tot = 0;
      for (let y = 0; y < cv.height; y += (step || 7)) for (let x = 0; x < cv.width; x += (step || 7)) {
        tot++;
        const i = (y * cv.width + x) << 2;
        if (d[i] > 220 && d[i + 1] > 230 && d[i + 2] > 235 && d[i + 3] > 200) ice++;   // odcienice lodu #e8f1f8
      }
      return { ice: ice / tot, n: tot };
    }
  };
})();
