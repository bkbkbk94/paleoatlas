#!/usr/bin/env python3
# Buduje js/data/ice_rgi_isl.js — WSPÓŁCZESNE lodowce Islandii z inwentarzu
# Randolph Glacier Inventory 7.0, region 06 Islandia:
#   RGI 7.0 Consortium 2023: „Randolph Glacier Inventory – A Dataset of Global Glacier
#   Outlines, Version 7.0”, Boulder, Colorado USA, NSIDC DAAC, doi:10.5067/f6jmovy5navz
#   (CC-BY 4.0). 568 rekordów (jęzory czap rozliczane jako osobne lodowce), łącznie
#   ~11,1 tys. km²; daty zdalne zdjęć źródłowych (src_date) ~2000–2015 AD.
# Przetwarzanie: unia członów (RGI dzieli czapy na jęzory — scalam do czap macierzystych)
#   → podział na komponenty → nazwa z kanonicznej mapy czap Islandii po centroidzie
#   (Vatnajökull, Langjökull, Hofsjökull, Mýrdalsjökull, Drangajökull, Eyjafjallajökull,
#   Tindfjallajökull, Torfajökull, Snæfellsjökull) → upraszczanie ringów (0,0025° ~ 150 m).
# Emisja: window.ICE_RGI_ISL (po jednym wpisie na czapę + zbiorczy „pozostałe”) +
#   splice WYŁĄCZNIE do PALEO.ice_sets.now (inwentarz ≈ stan roku 2000, nie klimat optimum).
import glob, math, os, json
import shapefile
from shapely.geometry import Polygon
from shapely.ops import unary_union
from pathlib import Path
ROOT = str(Path(__file__).resolve().parent.parent)

SRC = glob.glob('/tmp/rgi/RGI2000-v7.0-G-06_iceland.shp')[0]
OUT = ROOT + '/js/data/ice_rgi_isl.js'
TOL = 0.0025        # ~150 m przy 65°N
MINA = 0.02         # min. pow. części (deg² ≈ 9 km² przy 65°N)

# kryteria nazw czap: (nazwa, lat, lon, promień km)
CAPS = [
    ('Vatnajökull',    64.40, -16.80, 95),
    ('Langjökull',     64.75, -20.00, 40),
    ('Hofsjökull',     64.83, -18.82, 35),
    ('Mýrdalsjökull',  63.63, -19.08, 40),
    ('Drangajökull',   66.15, -22.25, 60),
    ('Eyjafjallajökull', 63.63, -19.62, 18),
    ('Tindfjallajökull', 63.80, -19.55, 20),
    ('Torfajökull',    63.90, -19.17, 15),
    ('Snæfellsjökull', 64.81, -23.77, 18),
]


def hav_km(la1, lo1, la2, lo2):
    kx = 111.32 * math.cos(math.radians((la1 + la2) / 2))
    return math.hypot((lo1 - lo2) * kx, (la1 - la2) * 111.32)


def geod_area(ring):
    lat0 = sum(p[0] for p in ring) / len(ring)
    kx = 111.32 * math.cos(math.radians(lat0))
    a = 0.0
    for (la1, lo1), (la2, lo2) in zip(ring, ring[1:]):
        a += (lo1 * kx) * (la2 * 111.32) - (lo2 * kx) * (la1 * 111.32)
    return abs(a) / 2.0


def main():
    r = shapefile.Reader(SRC)
    polys = []
    n_rec = 0
    area_src = 0.0
    for sr in r.iterShapeRecords():
        rec = dict(zip([f[0] for f in r.fields][1:], sr.record))
        area_src += rec.get('area_km2') or 0
        shp = sr.shape
        if not shp.points:
            continue
        n_rec += 1
        pts = shp.points
        parts = list(shp.parts) + [len(pts)]
        for a, b in zip(parts, parts[1:]):
            ring = pts[a:b]
            p = Polygon(ring)
            if p.area >= 1e-6:
                polys.append(p)
    print(f'rekordow RGI: {n_rec}, Σ area_km2: {area_src:,.0f} km2'.replace(',', ' '))
    u = unary_union([p.buffer(0) for p in polys])
    geoms = [u] if u.geom_type == 'Polygon' else list(u.geoms)
    comps = []
    for g in geoms:
        if g.geom_type != 'Polygon':
            continue
        c = g.centroid
        comps.append({'geom': g, 'cx': c.x, 'cy': c.y})
    # nazwa czapy wg centroidu (najbliższa definicja w promieniu)
    named = {}
    for c in comps:
        best, bd = None, 1e9
        for (nm, la, lo, rkm) in CAPS:
            d = hav_km(c['cy'], c['cx'], la, lo)
            if d < rkm and d < bd:
                best, bd = nm, d
        (named.setdefault(best or '__male__', []).append(c))
    entries = []
    for nm, lst in sorted(named.items(), key=lambda kv: -sum(x['geom'].area for x in kv[1])):
        rings, A = [], 0.0
        for c in lst:
            g = c['geom'].simplify(TOL, preserve_topology=True)
            if g.area < MINA:
                # drobny lodowiec: bez uproszczenia (kształt Realny), min. ~0,5 km²
                if geod_area([[y, x] for x, y in c['geom'].exterior.coords]) < 0.5:
                    continue
                g = c['geom']
            ring = [[round(y, 3), round(x, 3)] for x, y in g.exterior.coords]
            dd = [ring[0]]
            for q in ring[1:]:
                if q != dd[-1]:
                    dd.append(q)
            if dd[0] != dd[-1]:
                dd.append(dd[0])
            if len(dd) >= 4:
                rings.append(dd)
                A += geod_area(dd)
        if not rings:
            continue
        if nm == '__male__':
            name = (f'Islandia — mniejsze lodowce i czapy lodowe ({len(lst)} komponentów, Σ ~{A:,.0f} km²)'
                    .replace(',', ' '))
        else:
            name = f'Islandia — czapa {nm} Σ ~{A:,.0f} km²'.replace(',', ' ')
        entries.append({'cap': nm, 'area': A, 'name': name, 'src': 'RGI-7', 'rings': rings})
        print(f'{nm:20s}: {len(rings)} czesci, ~{A:,.0f} km2'.replace(',', ' '))

    head = '''// RGI 7.0 — współczesne lodowce Islandii (region 06), z inwentarzu globalnego:
// RGI 7.0 Consortium 2023, „Randolph Glacier Inventory – A Dataset of Global Glacier
// Outlines, Version 7.0”, Boulder, Colorado USA, NSIDC DAAC, doi:10.5067/f6jmovy5navz
// (CC-BY 4.0; zdjęcia źródłowe ~2000–2015 AD). 568 rekordów-jęzorów scalonych do czap
// macierzystych (unia geometrii; nazwy z kanonicznej mapy czap Islandii).
// Wygenerowano przez tools/build_ice_rgi_isl.py. Ringi DOMKNIĘTE w (lat, lon).
// Splice: WYŁĄCZNIE do PALEO.ice_sets.now (inwentarz ≈ stan roku 2000 — nie optimum
// holoceńskie i nie historyczne maksimum małej epoki lodowej).

'''
    splice = '''
(function(){
window.RGI_ISL_SRC = "DANE — Randolph Glacier Inventory 7.0: RGI 7.0 Consortium 2023, Boulder, NSIDC DAAC, doi:10.5067/f6jmovy5navz (CC-BY 4.0). Inwentarz globalny lodowców (poza czapami lodowcowymi) — region 06 Islandia, Σ ~11 060 km² w 568 rekordach-jęzorach; tu scalone do czap macierzystych. Stan ≈ rok 2000 (zdj. Landsat; część atrybutów do 2015).";
window.ICE_RGI_ISL = %s;
(function(){
  if (!window.PALEO || !window.PALEO.ice_sets.now) return;
  window.PALEO.ice_sets.now = window.PALEO.ice_sets.now.concat(
    window.ICE_RGI_ISL.map(it => ({ name: it.name, src: it.src, rings: it.rings })));
})();
})();
''' % (json.dumps([{k: v for k, v in e.items() if k in ('name', 'src', 'rings')} for e in entries],
                  ensure_ascii=True, separators=(',', ':')))
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(head + splice[1:])
    print('zapisano', OUT, os.path.getsize(OUT), 'B')
    meta = {'caps': [(e['cap'], round(e['area'])) for e in entries]}
    json.dump({'meta': meta, 'total_src_km2': area_src}, open('/tmp/rgi_isl_meta.json', 'w'))


if __name__ == '__main__':
    main()
