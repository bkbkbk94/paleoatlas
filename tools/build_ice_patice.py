#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_ice_patice.py — PATICE: The evolution of the Patagonian Ice Sheet 35 ka → dziś
(Davies i in. 2020, Earth-Science Reviews 204:103152 — doi:10.1016/j.earscirev.2020.103152;
 dane: Mendeley Data doi:10.17632/ztz59y79vv.1, "Supplementary data.zip")
→ js/data/ice_patice.js. Podmienia schematyczne poligony Patagonii (PATAGONIA_MAX/MID)
w PALEO.ice_sets dla faz deglacjacji + wystawia window.ICE_PATICE dla przekrojów q (30/35 ka).

Regeneracja wymaga pobrania:
  curl -L 'https://data.mendeley.com/public-files/datasets/ztz59y79vv/files/10341f5f-726a-4cea-a065-3289d0ed8d53/file_downloaded' -o patice.zip
  unzip 'Supplementary data/Shapefiles/**'
Shapefile'y są w EPSG:32718 (WGS84 / UTM strefa 18S) — transformacja do WGS84 (stopnie).

Przekroje PATICE: 35, 30, 25, 20, 15, 13, 10, 5 ka + 0,2 ka (Mała Epoka Lodowcowa)
+ inwentarz współczesnych lodowców (2011 AD). Do ticków osi dobieramy NAJBLIŻSZY przekrój:
  27 ka przedmaksymalny → 25 ka | 21,5 ka lgm → 20 ka | 17,5 ka poznańska → 15 ka
  15 ka pomorska → 15 ka | 13,6 ka B–A → 13 ka | 12,3 ka mł. dryas → 13 ka
  10,5 ka wczesny holocen → 10 ka | 0 "dziś" → inwentarz 2011 AD (≥10 km²).
Rekordy z Age==0 w plikach Icesheet*.shp to poligony pomocnicze (poza akcją przekroju) — pomijamy.
"""
import shapefile, json, os
from math import sin
from pyproj import Transformer

SRC = '/tmp/patice/Supplementary data/Shapefiles/'
OUT = '/home/user/paleoatlas/js/data/ice_patice.js'
SIMPL_TOL = 0.02          # stopnie (~2 km) — Patagonia jest wąska, fiordy/loby wymagają szczegółu
MIN_AREA_KM2 = 10         # drobne plamy pomijamy (skala portalu)
TO_WGS = Transformer.from_crs('EPSG:32718', 'EPSG:4326', always_xy=True)

# plik → (wiek ka, klucz ICE_PATICE)
FILES = [
    ('Reconstruction/icesheet35ka.shp', 35, 'p35ka'),
    ('Reconstruction/Icesheet30ka.shp', 30, 'p30ka'),
    ('Reconstruction/Icesheet25ka.shp', 25, 'p25ka'),
    ('Reconstruction/Icesheet20ka.shp', 20, 'p20ka'),
    ('Reconstruction/Icesheet15ka.shp', 15, 'p15ka'),
    ('Reconstruction/Icesheet13ka.shp', 13, 'p13ka'),
    ('Reconstruction/Icesheet10ka.shp', 10, 'p10ka'),
    ('Reconstruction/Icesheet5ka.shp',   5, 'p5ka'),
]

PRETTY = {
    'PIS': 'scalony Lodowiec Patagoński (PIS)',
    'SPI': 'South Patagonian Icefield (SPI)',
    'NPI': 'North Patagonian Icefield (NPI)',
    'South Patagonian Icefield': 'South Patagonian Icefield (SPI)',
    'North Patagonian Icefield': 'North Patagonian Icefield (NPI)',
    'Chilean Lake Distict': 'kraina jezior Chile (czapolód)',
    'Chilean Lake District': 'kraina jezior Chile (czapolód)',
    'Cordillera Darwin': 'Cordillera Darwin (Ziemia Ognista)',
    'Gran Campo Nevado': 'Gran Campo Nevado',
    'Hudson Icefield': 'pole lodowe wulkanu Hudson',
    'arque Nacionale Corcovado 2': 'Parque Nacional Corcovado 2',
}

def perp_dist(p, a, b):
    ax, ay = a[1], a[0]; bx, by = b[1], b[0]; px, py = p[1], p[0]
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** .5
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return ((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2) ** .5

def rdp_open(pts, tol):
    n = len(pts)
    if n <= 3: return pts[:]
    keep = [False] * n; keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        dmax, idx = tol, -1
        for i in range(a + 1, b):
            d = perp_dist(pts[i], pts[a], pts[b])
            if d > dmax: dmax, idx = d, i
        if idx >= 0:
            keep[idx] = True
            stack.append((a, idx)); stack.append((idx, b))
    return [pts[i] for i in range(n) if keep[i]]

def rings_from_shape(sh):
    """pyshp shape w UTM 18S → [outer, hole1, ...] w (lat, lon) WGS84."""
    rings = []
    parts = list(sh.parts) + [len(sh.points)]
    for k in range(len(sh.parts)):
        seg = sh.points[parts[k]:parts[k + 1]]
        lons, lats = TO_WGS.transform([p[0] for p in seg], [p[1] for p in seg])
        r = [[round(la, 3), round(lo, 3)] for lo, la in zip(lons, lats)]
        if len(r) > 1 and r[0] == r[-1]:
            r = r[:-1]
        rings.append(r)
    return rings

def build_items(fn, age, key, modern=False):
    r = shapefile.Reader(fn)
    pairs = [(sr.record.as_dict(), sr.shape) for sr in r.iterShapeRecords()]
    pairs.sort(key=lambda p: -(p[0].get('SHAPE_Area') or (p[0].get('area_km2') or 0) * 1e6))
    items, unnamed = [], [0]
    for rec, shp in pairs:
        rec = rec
        if modern:
            area = (rec['area_km2'] or 0)
            if area < MIN_AREA_KM2: continue
            nm = (rec['GLAC_NAME'] or '').strip() or rec['Region'] or 'lodowiec'
        else:
            if abs((rec['Age'] or 0) - age) > 0.01: continue   # rekordy pomocnicze (Age 0) — pomijamy
            area = (rec['SHAPE_Area'] or 0) / 1e6
            if area < MIN_AREA_KM2: continue
            nm = (rec['Name'] or '').strip()
        rings = rings_from_shape(shp)
        rings = [rdp_open(rg + [rg[0]], SIMPL_TOL) for rg in rings]
        rings = [rg for rg in rings if len({(p[0], p[1]) for p in rg}) >= 3]
        if not rings: continue
        rings = [rg + [rg[0]] for rg in rings]  # jawna domkniętość OGC LinearRing
        if not nm:
            unnamed[0] += 1
            nm = 'pokrywa bez nazwy #%d' % unnamed[0]
        nm = PRETTY.get(nm, nm)
        label = ('Patagonia — %s (PATICE, inwentarz 2011 AD)' % nm) if modern \
                else ('Patagonia — %s (PATICE %g ka)' % (nm, age))
        items.append({'name': label, 'src': 'PATICE', 'rings': rings})
    return items

def ring_area_km2(rg):
    """pole pierścienia (lat, lon) na kuli — jak w audytach portalu"""
    toR = 3.141592653589793 / 180
    a = 0.0
    for i in range(len(rg)):
        p, q = rg[i], rg[(i + 1) % len(rg)]
        a += (q[1] - p[1]) * (2 + sin(p[0] * toR) + sin(q[0] * toR))  # rg=(lat,lon): Δlon × sin(lat)
    return abs(a / 2) * (6371.0 ** 2 * toR)

patice = {}
for fn, age, key in FILES:
    patice[key] = build_items(SRC + fn, age, key)
    tot = sum(ring_area_km2(rg) for it in patice[key] for rg in it['rings'])
    print('%s: %d poligonów, Σ %.0f km²' % (key, len(patice[key]), tot))
patice['now'] = build_items(SRC + 'Geomorphology/Glaciers.shp', 0, 'now', modern=True)

# łączymy poligony "now" w JEDEN wpis (tooltips i tak zbiorcze)
if patice['now']:
    allrings = [rg for it in patice['now'] for rg in it['rings']]
    patice['now'] = [{'name': 'Patagonia — współczesne pola lodowe (NPI, SPI, Cordillera Darwin, Gran Campo Nevado i lodowce wulkaniczne; PATICE/GLIMS 2011 AD)', 'src': 'PATICE', 'rings': allrings}]

hdr = """// PATICE: The evolution of the Patagonian Ice Sheet from 35 ka to the present day —
// Davies i in. 2020, Earth-Science Reviews 204:103152, doi:10.1016/j.earscirev.2020.103152.
// Dane: Mendeley Data doi:10.17632/ztz59y79vv.1 — empiryczne przekroje 35/30/25/20/15/13/10/5 ka
// + inwentarz współczesnych lodowców (2011 AD). Wygenerowano przez tools/build_ice_patice.py.
// Podmienia schematyczne poligony Patagonii (PATAGONIA_MAX/MID) w PALEO.ice_sets dla faz deglacjacji
// i dokleja przekroje 30/35 ka do q_30ka/q_35ka (patrz app.js envIcePolys). Ringi w (lat, lon).
"""
sets_map = {  # klucz PALEO.ice_sets → klucz ICE_PATICE + notka o dopasowaniu przekroju
    'przedmaksymalny': ('p25ka',  'PIS wciąż bliski maksimum 33–28 ka; najbliższy przekrój publikacji: 25 ka'),
    'lgm':             ('p20ka',  'scalony PIS od 37°S po Ziemię Ognistą, na zachodzie krawędź szelfu Pacyfiku'),
    'poznanska':       ('p15ka',  'szybka cofka 18–15 ka w toku; przekrój 15 ka nieco młodszy niż faza 17,5 ka'),
    'pomorska':        ('p15ka',  'PIS rozpadnięty na osobne masywy; wielkie jeziora przylodowcowe po stronie wschodniej'),
    'bolling_allerod': ('p13ka',  'readvance/stabilizacja w Antarctic Cold Reversal (14–13 ka)'),
    'younger_dryas':   ('p13ka',  'gdy półkula płn. była w młodszym dryasie, na płd. trwał Antarctic Cold Reversal'),
    'early_holocene':  ('p10ka',  'rozbite pola lodowe NPI/SPI/CDI, zbliżone do dzisiejszych'),
    'now':             ('now',    'inwentarz współczesnych lodowców PATICE/GLIMS (2011 AD; plamy ≥10 km²)'),
}
items_json = json.dumps({v[0]: patice[v[0]] for v in sets_map.values()}, separators=(',', ':'))
extra_json = json.dumps({k: v for k, v in patice.items() if k not in {v2[0] for v2 in sets_map.values()}}, separators=(',', ':'))

lines = [hdr, '(function(){', 'const P1 = %s;' % items_json, 'const P1X = %s;' % extra_json]
lines.append('const MAP = %s;' % json.dumps({k: v[0] for k, v in sets_map.items()}, separators=(',', ':')))
lines.append('const NOTE = %s;' % json.dumps({k: v[1] for k, v in sets_map.items()}))
lines.append("const DROP_SA = /Patagonia/;")
lines.append("""window.ICE_PATICE = Object.assign({}, P1, P1X);
/* pamiętamy schemat portalu jako fallback dla stadiałowych przekrojów Q19 ≥40 ka,
   gdzie ani Q19, ani PATICE nie podają czasorozróżnionego zasięgu PIS */
window.PA_PATAGONIA_SCHEMAT = { 'name': 'Patagonia (MIS ≥4) — SCHEMAT portalu: Q19 ani PATICE nie czasorozróżniają zasięgu PIS dla tego przekroju; rząd wielkości wg literatury (por. PATICE 35 ka)', 'pts': [[-38,-73],[-42,-72],[-46,-73],[-50,-73.5],[-53,-72],[-54,-69],[-52,-68.5],[-48,-71],[-43,-71],[-39,-72.5]] };
Object.keys(MAP).forEach(k => {
  if (!window.PALEO || !window.PALEO.ice_sets[k]) return;
  const kept = window.PALEO.ice_sets[k].filter(p => !(p.src === undefined && DROP_SA.test(p.name)));
  const items = window.ICE_PATICE[MAP[k]] || [];
  window.PALEO.ice_sets[k] = kept.concat(items.map(it => ({ name: it.name + ' — ' + (NOTE[k] || ''), src: it.src, rings: it.rings })));
});""")
lines.append('})();')
open(OUT, 'w').write('\n'.join(lines))
print('zapisano %s (%.1f KB)' % (OUT, os.path.getsize(OUT) / 1024))
for key, items in patice.items():
    print(key, len(items), 'poligonów')
