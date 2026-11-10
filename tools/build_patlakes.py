#!/usr/bin/env python3
# build_patlakes.py — paleojeziora przylodowcowe Patagonii (PATICE, Davies i in. 2020)
# Wejście: /tmp/psupp/Supplementary data/Shapefiles/Reconstruction/Glacial_lake_{10..35}ka.shp
#          (Mendeley Data 10.17632/ztz59y79vv.1, CC-BY 4.0; CRS: WGS84 UTM 18S)
# Wyjście: paleoatlas/js/data/ice_patlakes.js — window.PATICE_LAKES + splice do PALEO.ice_sets
#          z mapowaniem faz portalu (jak PATICE-lód: 25→przedmaksymalny, 20→lgm, 15→pozn/pom,
#          13→B-A/YD, 10→early_holocene) — 30/35 ka doklejane dodatkowo do przekrojów głębokich.
import json, io, os
import shapefile
from pyproj import Transformer
from shapely.geometry import Polygon
from pathlib import Path
ROOT = str(Path(__file__).resolve().parent.parent)

RD = '/tmp/psupp/Supplementary data/Shapefiles/Reconstruction'
OUT = ROOT + '/js/data/ice_patlakes.js'
TR = Transformer.from_crs(32718, 4326, always_xy=True)   # UTM 18S → WGS84
PHASES = [35, 30, 25, 20, 15, 13, 10]
MIN_KM2 = 40.0        # pomijamy plamy mniejsze od progu — czytelność przy zoomach globalnych
ND = 3                # zaokrąglenie współrzędnych [deg]

SRC = ('DANE — PATICE (paleojeziora przylodowcowe): Davies B.J., Thorndycraft V.R., Fabel D., Martin J.R.M. 2020, '
       'Earth-Science Reviews 204:103152, „The evolution of the Patagonian Ice Sheet from 35 ka to the present day (PATICE)”, '
       'doi:10.1016/j.earscirev.2020.103152; dane: Mendeley Data 10.17632/ztz59y79vv.1 (CC-BY 4.0), pliki Glacial_lake_{10..35}ka.shp.')

def recget(d, *keys):
    for k in keys:
        v = d.get(k)
        if v is not None and str(v).strip() not in ('', 'n/a', 'n/i', 'n'):
            return str(v).strip()
    return ''

def clean_ref(ref):
    return ref.rstrip(' .;')

out = {}
tot_pol, kept_pol = 0, 0
for ka in PHASES:
    r = shapefile.Reader(os.path.join(RD, 'Glacial_lake_%dka.shp' % ka))
    lakes = []
    for sr in r.iterShapeRecords():
        d = sr.record.as_dict()
        name = recget(d, 'Name', 'Lake') or ('Palaeolake #%s' % recget(d, 'OBJECTID'))
        area = float(recget(d, 'Area') or 0)
        alt = recget(d, 'Altitude', 'Lake_altit')
        ref = clean_ref(recget(d, 'Reference', 'Ref'))
        note = recget(d, 'Comments', 'Notes', 'Notes_and_', 'Drainage', 'Age_constr')
        geom = sr.shape
        pts = []
        # wieloczęściowe poligony: każda część = osobny pierścień (shapefile-type 5/15)
        parts = list(geom.parts) + [len(geom.points)]
        for i in range(len(parts) - 1):
            seg = geom.points[parts[i]:parts[i + 1]]
            if len(seg) < 4:
                continue
            # RDP w metrach (UTM): 800 m — nierozróżnialne przy zoomach globalnych
            sp = Polygon(seg)
            if not sp.is_valid:
                sp = sp.buffer(0)
            sp = sp.simplify(800, preserve_topology=True)
            if sp.geom_type == 'MultiPolygon':
                sp = max(sp.geoms, key=lambda g: g.area)
            if sp.geom_type != 'Polygon' or sp.area < 1e6:   # <1 km² po uproszczeniu → pomiń pierścień
                continue
            seg2 = list(sp.exterior.coords)
            if len(seg2) < 4:
                continue
            ll = [TR.transform(x, y) for x, y in seg2]           # [(lon,lat)]
            ring = [[round(lat, ND), round(lon, ND)] for lon, lat in ll]
            if ring[0] != ring[-1]:
                ring.append(ring[0])
            if len(ring) >= 4:
                pts.append(ring)
        if not pts:
            continue
        tot_pol += 1
        if area and area < MIN_KM2:
            continue
        # szacunek pola, gdy brak kolumny Area (geodezyjnie)
        lakes.append({
            'name': name, 'area': round(area, 1), 'alt': alt,
            'ref': ref or 'PATICE', 'note': note[:120], 'rings': pts,
        })
    lakes.sort(key=lambda l: -l['area'])
    kept_pol += len(lakes)
    out['l%02dka' % ka] = lakes
    print('%d ka: %d jezior (z %d rekordów; próg %.0f km²), Σ %.0f km² — %s' %
          (ka, len(lakes), len(r), MIN_KM2, sum(l['area'] for l in lakes),
           '; '.join('%s %.0f' % (l['name'].replace('Palaeolake ', ''), l['area']) for l in lakes[:4])))

header = '''// PATICE-LAKES — paleojeziora przylodowcowe Lodowca Patagońskiego (10–35 ka).
// Źródło: PATICE — Davies B.J., Thorndycraft V.R., Fabel D., Martin J.R.M. 2020,
// „The evolution of the Patagonian Ice Sheet from 35 ka to the present day (PATICE)”,
// Earth-Science Reviews 204:103152, doi:10.1016/j.earscirev.2020.103152;
// dane: Mendeley Data 10.17632/ztz59y79vv.1 (CC-BY 4.0), pliki Glacial_lake_{10..35}ka.shp
// (CRS WGS84 UTM 18S → transformacja pyproj do WGS84; części <40 km² pominięte dla czytelności;
//  litery-mapy art.: 10, 13, 15, 20, 25, 30, 35 ka; 12 ka = brak przekroju w publikacji).
// Wygenerowano przez tools/build_patlakes.py.
window.PATICE_LAKES_SRC = %s;
''' % json.dumps(SRC, ensure_ascii=False)

body = json.dumps(out, ensure_ascii=False, separators=(',', ':'))

splice = '''
(function(){
/* Mapowanie przekrojów PATICE na fazy osi czasu portalu — IDENTYCZNE jak dla lodu PATICE
   (ice_patice.js): 25 ka→przedmaksymalny, 20 ka→LGM, 15 ka→poznańska i pomorska,
   13 ka→Bølling–Allerød i mł. dryas, 10 ka→wczesny holocen. 35/30 ka nie mają fazy osi —
   doklejane do przekrojów głębokich q_35ka/q_30ka (patrz app.js envIcePolys). */
const MAPL = { przedmaksymalny:'l25ka', lgm:'l20ka', poznanska:'l15ka', pomorska:'l15ka',
               bolling_allerod:'l13ka', younger_dryas:'l13ka', early_holocene:'l10ka' };
const NOTEL = {
  przedmaksymalny: 'najbliższy przekrój publikacji 25 ka; ówczesne jeziora gł. na północy (Elpalafquen)',
  lgm: 'przekrój 20 ka: jezioro Elpalafquen (płn.) + pierwsze duże zbiorniki na płd. (Deseado, Skyring)',
  poznanska: 'przekrój 15 ka: gwałtowny wzrost przy cofce PIS (Σ ~13,7 tys. km²)',
  pomorska: 'jak poznańska — 15 ka: Chalenko (jednoczy oba baseny) ~4,7 tys. km²; Skyring/Otway na płd.',
  bolling_allerod: 'przekrój 13 ka (≈ Antarctic Cold Reversal): jednolite jezioro Chalenko 4,7 tys. km² — objętościowo największe plejstocenskie jezioro Ameryki Płd. (Thorndycraft i in. 2019)',
  younger_dryas: 'przekrój 13 ka: na płn. płk. trwa mł. dryas, na płd. koniec ACR — Chalenko i Otway/Skyring wciąż ogromne',
  early_holocene: 'przekrój 10 ka: ostatnie duże przylodziskowe zbiorniki (Viedma, Argentino, Tar, Nahuel Huapi) — później drenaż do oceanów'
};
Object.keys(MAPL).forEach(k => {
  if (!window.PALEO || !window.PALEO.ice_sets[k]) return;
  const items = (window.PATICE_LAKES[MAPL[k]] || []).map(l => ({
    name: 'ŁÓD ' + (window.PATICE_LAKES_NOTE ? '' : '') + '', src: 'PATICE-LAKE',
    lname: l.name, lref: l.ref, lalt: l.alt, larea: l.area, lnote: l.note,
    lake: 1, lp: MAPL[k], rings: l.rings
  }));
  items.forEach(it => { it.name = it.lname + ' — paleojezioro przylodowcowe (PATICE ' + MAPL[k].slice(1, 3) + ' ka) — ' + (NOTEL[k] || ''); });
  window.PALEO.ice_sets[k] = window.PALEO.ice_sets[k].concat(items);
});
})();
'''

js = header + 'window.PATICE_LAKES = ' + body + ';\n' + splice
open(OUT, 'w', encoding='utf-8').write(js)
print('written %s: %d B, %d jezior z %d rekordów' % (OUT, os.path.getsize(OUT), kept_pol, tot_pol))
