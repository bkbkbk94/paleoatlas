#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_ice_nadi.py — NADI-1: North American Deglacial Isochrones v1
(Dalton, Dulfer, Margold i in. 2023, Quat. Sci. Rev. — doi:10.1016/j.quascirev.2023.108345;
 dane: Zenodo doi:10.5281/zenodo.8161764, wariant OPTIMAL, 49 przekrojów 25–1 ka cal BP)
→ js/data/ice_nadi.js. Podmienia schematyczne poligony Ameryki Północnej
(Laurentyjski/Kordylieraski/Arktyczny kanadyjski) w PALEO.ice_sets dla faz deglacjacji.
Grenlandia NIE jest objęta NADI-1 (poza NAISC) — zostaje poligon schematyczny portalu.

Regeneracja wymaga pobrania:
  curl -L 'https://zenodo.org/api/records/8161764/files/NADI-1%20shapefiles%20Dalton%20et%20al.%20QSR.zip/content' -o nadi1.zip
Shapefile jest w WGS84 (stopnie) — transformacja niepotrzebna.
"""
import shapefile, json, os
from pathlib import Path
ROOT = str(Path(__file__).resolve().parent.parent)

SRC = '/tmp/nadi/shp/NADI-1 shapefiles Dalton et al. QSR/'
OUT = ROOT + '/js/data/ice_nadi.js'
SIMPL_TOL = 0.04          # stopnie (~3-4 km na 60°N) — skala portalu
MIN_AREA_KM2 = 8000       # mniejsze plamy pomijamy (jak w build_ice_dated)

# mapowanie: klucz PALEO.ice_sets → (przekrój NADI ka cal BP, etykieta głównego poligonu)
SLICES = {
  'przedmaksymalny': ('25ka',  '25 ka — NAJSTARSZY przekrój publikacji (nasuwanie ku LGM; 27 ka poza zasięgiem NADI-1)'),
  'lgm':             ('22ka',  '22 ka — MAKSIMUM wg NADI-1: Laurentyd + Kordyliery + Innuit połączone (15,8 mln km²)'),
  'poznanska':       ('18ka',  '18 ka — początek cofki po LGM (margines płd. wciąż blisko maksimum)'),
  'pomorska':        ('15ka',  '15 ka — cofka po MWP-1A; lob Des Moines/Wisconsin wycofane'),
  'bolling_allerod': ('13.5ka','13,5 ka — Bølling–Allerød; korytarz między Kordylierami a Laurentydem w otwarciu'),
  'younger_dryas':   ('12.5ka','12,5 ka — Younger Dryas: readvance Valders/Marquette przy W Jeziorach'),
  'early_holocene':  ('10.5ka','10,5 ka — szczątki nad Zatoką Hudsona/Quebec (zanik ~8,2 ka)'),
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
    """pyshp shape (WGS84 deg) → [outer, hole1, ...] w (lat, lon)."""
    rings = []
    parts = list(sh.parts) + [len(sh.points)]
    for k in range(len(sh.parts)):
        seg = sh.points[parts[k]:parts[k + 1]]
        r = [[round(p[1], 3), round(p[0], 3)] for p in seg]
        if len(r) > 1 and r[0] == r[-1]:
            r = r[:-1]
        rings.append(r)
    return rings

sets_out = {}
for key, (age, label) in SLICES.items():
    r = shapefile.Reader(SRC + age + '_cal_OPTIMAL_NADI-1_Dalton_etal_QSR.shp')
    recs = sorted(((rec[0], shp) for rec, shp in zip(r.records(), r.shapes())), key=lambda x: -x[0])
    polys = []
    for rank, (area, shp) in enumerate(recs):
        if rank > 0 and area < MIN_AREA_KM2: continue
        rings = rings_from_shape(shp)
        rings = [rdp_open(rg + [rg[0]], SIMPL_TOL) for rg in rings]
        rings = [rg for rg in rings if len({(p[0], p[1]) for p in rg}) >= 3]
        if not rings: continue
        # jawna domkniętość (OGC LinearRing)
        rings = [rg if rg[0] == rg[-1] else rg + [rg[0]] for rg in rings]
        # kontrola antypołudnika: odrzucamy fragment ze skokiem >170° (nie powinno wystąpić: bbox −159..−52)
        def jump(rg):
            return max((abs(rg[i + 1][1] - rg[i][1]) for i in range(len(rg) - 1)), default=0)
        if any(jump(rg) > 170 for rg in rings):
            print(f'  !! {key}: pominięto poligon ze skokiem antypołudnika (rank {rank})'); continue
        name = ('Północnoamerykański kompleks lądolodów NAISC (NADI-1, ' + label + ')'
                if rank == 0 else f'Ameryka Płn. — izolowana pokrywa #{rank} (NADI-1)')
        polys.append({'name': name, 'src': 'NADI-1', 'rings': rings})
    sets_out[key] = polys
    tot = sum(len(rg) for p in polys for rg in p['rings'])
    print(f'{key:18s} [{age:6s}]: {len(polys)} poligonów, {tot} wierzchołków po uproszczeniu')

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// NADI-1: North American Deglacial Isochrones v1 — Dalton, Dulfer, Margold i in. 2023,\n')
    f.write('// Quaternary Science Reviews 321:108345, doi:10.1016/j.quascirev.2023.108345.\n')
    f.write('// Dane: Zenodo doi:10.5281/zenodo.8161764 — 49 przekrojów 25–1 ka cal BP co 0,5 tys. lat;\n')
    f.write('// użyto wariantu OPTIMAL (MIN/MAX = obwiednie niepewności w publikacji).\n')
    f.write('// Wygenerowano przez tools/build_ice_nadi.py — podmienia schematyczne poligony Ameryki Płn.\n')
    f.write('// w PALEO.ice_sets dla faz deglacjacji. Grenlandia poza zasięgiem NADI-1 (zostaje schemat).\n')
    f.write('(function(){\nconst N1 = ')
    f.write(json.dumps(sets_out, ensure_ascii=False, separators=(',', ':')))
    f.write(';\n')
    f.write('''const DROP_NA = /Laurentyjski|Kordylieraski|Arktyczny kanadyjski/;
Object.keys(N1).forEach(k => {
  if (!window.PALEO || !window.PALEO.ice_sets[k]) return;
  window.PALEO.ice_sets[k] = window.PALEO.ice_sets[k].filter(p => !(p.src === undefined && DROP_NA.test(p.name))).concat(N1[k]);
});
})();
''')
print('zapisano', OUT, '%.1f KB' % (os.path.getsize(OUT) / 1024))
