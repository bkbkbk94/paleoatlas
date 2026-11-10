/* ============================================================================
   close_generated_rings.js — normalizacja topologii pierścieni w plikach
   generowanych (GeoJSON/OGC: LinearRing = jawna domkniętość):

     1. js/data/ice_quat.js   — domyka wszystkie pierścienie ICE_QUAT
     2. js/data/ice_dated.js  — domyka pierścienie DATED-1 (const D1 = {...})
                                + usuwa pierścienie zdegenerowane (<3 unikalne pkt)

   Działa jak step CI po tools/build_ice_quat.py / tools/build_ice_dated.py.
   Nagłówki komentarzy i teksty źródeł (SRC) pozostają bajt-po-bajcie.
============================================================================ */
const fs = require('fs');

function handleFile(path, extract, reinsert, eachPoly) {
  const srcTxt = fs.readFileSync(path, 'utf8');
  const m = srcTxt.match(extract);
  if (!m) throw new Error('nie znaleziono bloku JSON w ' + path);
  const json = JSON.parse(m[1]);
  let closed = 0, dropped = 0, already = 0;
  for (const key of Object.keys(json)) {
    const polys = json[key];
    for (const p of polys) {
      const R = p.rings || (p.pts ? [p.pts] : null);
      if (!R) continue;
      for (let i = R.length - 1; i >= 0; i--) {
        const r = R[i];
        const uniq = new Set(r.map(v => v[0] + ',' + v[1]));
        if (uniq.size < 3) { R.splice(i, 1); dropped++; continue; }
        const a = r[0], b = r[r.length - 1];
        if (a[0] === b[0] && a[1] === b[1]) { already++; }
        else { r.push([a[0], a[1]]); closed++; }
      }
      if (p.rings) p.rings = R;
    }
  }
  const out = reinsert(srcTxt, m, json);
  fs.writeFileSync(path, out);
  console.log(path, '→ domknięte:', closed, '| już były:', already, '| usunięte degeneraty:', dropped);
}

/* --- ice_quat.js: window.ICE_QUAT = {...}; */
handleFile(
  '/home/user/paleoatlas/js/data/ice_quat.js',
  /window\.ICE_QUAT = (\{[\s\S]*\});\s*$/m,
  (srcTxt, m, json) => srcTxt.replace(m[0], 'window.ICE_QUAT = ' + JSON.stringify(json) + ';')
);

/* --- ice_dated.js: const D1 = {...}; wewnątrz IIFE */
handleFile(
  '/home/user/paleoatlas/js/data/ice_dated.js',
  /const D1 = (\{[\s\S]*?\});/,
  (srcTxt, m, json) => srcTxt.replace(m[0], 'const D1 = ' + JSON.stringify(json) + ';')
);
