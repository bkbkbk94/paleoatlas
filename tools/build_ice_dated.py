#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_ice_dated.py — DATED-1 (Hughes i in. 2016, Boreas; PANGAEA 10.1594/PANGAEA.848117)
→ js/data/ice_dated.js. Podmienia poligony eurazjatyckie w PALEO.ice_sets dla faz
40–8 ka. Margines w Polsce = dokładna linia z pliku użytkownika (splice do pierścienia).
"""
import shapefile, json, numpy as np
from pyproj import Transformer

SRC = '/tmp/icedata/dated1/DATED1 TimeSlices shp/'
OUT = '/home/user/paleoatlas/js/data/ice_dated.js'
SIMPL_TOL = 0.055
MIN_AREA_MKM2 = 0.008      # izolowane pokrywy < 8 tys. km2 pomijamy

tr = Transformer.from_crs("+proj=laea +lat_0=90 +lon_0=0 +datum=WGS84 +units=m", "EPSG:4326", always_xy=True)

# ---- linie PL użytkownika (z meta.js) ---------------------------------------
_m = open('/home/user/paleoatlas/js/data/meta.js', encoding='utf-8').read()
META = json.loads(_m[_m.index('=') + 1:_m.rindex(';')])
LINES = {f['id']: [[p['lat'], p['lon']] for p in (f.get('linia_pl') or [])] for f in META['fazy']}

# mapowanie: klucz zestawu PALEO.ice_sets → (plik TS, klucz linii PL, etykieta)
SLICES = {
  'mis3':            ('TS_3835min_poly', None, 'Eurazjatycki lądolód (DATED-1, 35–38 ka, wariant minimalny — MIS 3, największa niepewność)'),
  'przedmaksymalny': ('TS_27_poly',      None, 'Eurazjatycki lądolód (DATED-1, 27 ka — nasuwanie ku LGM)'),
  'lgm':             ('TS21_mc', 'lgm_faza_leszczynska', 'Eurazjatycki lądolód (DATED-1, 21 ka: Skandynawski + Brytyjski + Svalbard–Barents–Kara; margines PL = linia leszczyńska z danych portalu)'),
  'poznanska':       ('TS18_mc', 'faza_poznanska', 'Eurazjatycki lądolód (DATED-1, 18 ka; margines PL = linia poznańska z danych portalu)'),
  'pomorska':        ('TS17_mc', 'faza_pomorska', 'Eurazjatycki lądolód (DATED-1, 17 ka; margines PL = linia pomorska z danych portalu)'),
  'bolling_allerod': ('TS14_mc', None, 'Eurazjatycki lądolód (DATED-1, 14 ka — południe Szwecji / basen S Baltiku; z PL wycofany)'),
  'younger_dryas':   ('TS12_mc', None, 'Eurazjatycki lądolód (DATED-1, 12 ka — Salpausselkä/Ra, Loch Lomond)'),
  'early_holocene':  ('TS11_mc', None, 'Eurazjatycki lądolód (DATED-1, 11 ka — szczątki w C Skandynawii, znika ~9,5 ka)'),
}

def shoelace(pts):
    s = 0.0
    for i in range(len(pts) - 1):
        s += pts[i][1] * pts[i + 1][0] - pts[i + 1][1] * pts[i][0]
    return s / 2.0

def perp_dist(p, a, b):
    ax, ay = a[1], a[0]; bx, by = b[1], b[0]; px, py = p[1], p[0]
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return ((px - ax) ** 2 + (py - ay) ** 2) ** .5
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return ((px - (ax + t * dx)) ** 2 + (py - (ay + t * dy)) ** 2) ** .5

def rdp_open(pts, tol, pinned_idx=frozenset()):
    """RDP dla łuku otwartego; pinned_idx nigdy nie są usuwane."""
    n = len(pts)
    if n <= 3: return pts[:]
    keep = [False] * n; keep[0] = keep[-1] = True
    for i in pinned_idx:
        if 0 < i < n - 1: keep[i] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        # jeśli w (a,b) jest pin, rozgałęziamy na nim
        pin = next((i for i in range(a + 1, b) if keep[i]), None)
        if pin is not None:
            stack.append((a, pin)); stack.append((pin, b)); continue
        dmax, idx = tol, -1
        for i in range(a + 1, b):
            d = perp_dist(pts[i], pts[a], pts[b])
            if d > dmax: dmax, idx = d, i
        if idx >= 0:
            keep[idx] = True
            stack.append((a, idx)); stack.append((idx, b))
    return [pts[i] for i in range(n) if keep[i]]

def fwd(ring, i, j):
    """droga po pierścieniu od i do j włącznie, w natywnym porządku."""
    n = len(ring)
    if i <= j: return ring[i:j + 1]
    return ring[i:] + ring[:j + 1]

def dist2(a, b):
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2

def splice(ring, U):
    """Wymień w pierścieniu odcinek marginesu południowego w PL na linię użytkownika U (W→E).
       Zwraca (nowy_ring_otwarty, idx_linii_U) albo (None, powód)."""
    iw = min(range(len(ring)), key=lambda i: dist2(ring[i], U[0]))
    ie = min(range(len(ring)), key=lambda i: dist2(ring[i], U[-1]))
    if dist2(ring[iw], U[0]) > 1.4 ** 2 or dist2(ring[ie], U[-1]) > 1.4 ** 2:
        return None, f'brak dopasowania końców (dW={dist2(ring[iw],U[0])**.5:.2f}°, dE={dist2(ring[ie],U[-1])**.5:.2f}°)'
    def south_frac(path):
        ok = sum(1 for p in path if 13.0 < p[1] < 25.0 and 49.5 < p[0] < 55.6)
        return ok / max(1, len(path))
    p_we = fwd(ring, iw, ie); p_ew = fwd(ring, ie, iw)
    if south_frac(p_we) >= south_frac(p_ew):      # iść z W do E przez PL
        outer = fwd(ring, ie, iw)                  # reszta świata E→W
        core = outer[1:] if len(outer) > 1 else []
        newring = U[:] + core[::-1]                # U W→E, potem reszta E→W
        pin = set(range(len(U)))
    else:
        outer = fwd(ring, iw, ie)
        core = outer[1:] if len(outer) > 1 else []
        newring = U[::-1] + core[::-1]
        pin = set(range(len(U)))
    # usuń zdublowane punkty styku (koniec U vs początek reszty)
    return newring, pin

def ring_from_shape(sh):
    """pyshp shape → lista pierścieni [outer, hole1, ...] w (lat,lon)."""
    rings = []
    parts = list(sh.parts) + [len(sh.points)]
    for k in range(len(sh.parts)):
        seg = sh.points[parts[k]:parts[k + 1]]
        xs = np.array([p[0] for p in seg]); ys = np.array([p[1] for p in seg])
        lon, lat = tr.transform(xs, ys)
        r = [[round(float(lat[i]), 3), round(float(lon[i]), 3)] for i in range(len(seg))]
        if len(r) > 1 and (r[0][0] == r[-1][0] and r[0][1] == r[-1][1]):
            r = r[:-1]
        rings.append(r)
    return rings

sets_out = {}
for key, (fname, linek, label) in SLICES.items():
    r = shapefile.Reader(SRC + fname + '.shp')
    flds = [x[0] for x in r.fields[1:]]
    records = []
    for shape, rec in zip(r.shapes(), r.records()):
        d = dict(zip(flds, rec))
        area = None
        for k in ('Shape_Area', 'SHAPE_AREA', 'Area'):
            if k in d: area = d[k] / 1e12; break
        records.append((area or 0, shape))
    records.sort(key=lambda x: -x[0])
    polys = []
    for rank, (area, shape) in enumerate(records):
        if area < MIN_AREA_MKM2: continue
        rings = ring_from_shape(shape)
        # splice tylko do głównego (największego) pierścienia głównego rekordu
        for ri, ring in enumerate(rings):
            if rank == 0 and ri == 0 and linek and LINES.get(linek):
                newring, pin = splice(ring, LINES[linek])
                if newring is None:
                    print(f'  !! {key}: splice pominięty — {pin}')
                    rings[ri] = rdp_open(ring + [ring[0]], SIMPL_TOL)
                else:
                    rings[ri] = rdp_open(newring + [newring[0]], SIMPL_TOL, pin)
            else:
                rings[ri] = rdp_open(ring + [ring[0]], SIMPL_TOL)
        name = label if rank == 0 else f'Eurazja — izolowana pokrywa #{rank} (DATED-1)'
        # filtr zdegenerowanych części (<3 unikalne punkty) + jawna domkniętość (OGC LinearRing)
        rings = [r for r in rings if len({(p[0], p[1]) for p in r}) >= 3]
        rings = [r if (r[0][0] == r[-1][0] and r[0][1] == r[-1][1]) else r + [r[0]] for r in rings]
        polys.append({'name': name, 'src': 'DATED-1', 'rings': rings})
    sets_out[key] = polys
    tot = sum(len(rr) for p in polys for rr in p['rings'])
    print(f'{key:18s}: {len(polys)} poligonów, {tot} wierzchołków po uproszczeniu')

# Bølling–Allerød: lob gardzieński wg linii użytkownika — DATED-1 TS14 ma margines
# w S Skanii, więc lob dokładamy jako ODDZIELNY poligon z domknięciem wzdłuż wybrzeża Battyku.
sets_out['bolling_allerod'].insert(0, {
  'name': 'Lob gardzieński — margines PL wg danych portalu (stillstand ok. 14–13,6 ka; DATED-1 TS14 nie pokrywa)',
  'src': 'DANE_PORTALU',
  'rings': [LINES['interstadial_bolling_allerod'] + [[54.95, 19.6], [55.35, 20.9], [55.7, 21.4], [55.65, 18.5], [55.2, 16.0], [54.6, 14.6]]]
})

# ---- emisja: nadpisanie eurazjatyckich poligonów w PALEO.ice_sets ------------
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// DATED-1: Hughes, Gyllencreutz, Lohne, Mangerud, Svendsen 2016, Boreas 45(1).\n')
    f.write('// Dane: PANGAEA doi:10.1594/PANGAEA.848117 (TimeSlices_shp, linia "most credible").\n')
    f.write('// Wygenerowano przez tools/build_ice_dated.py — podmienia poligony EURAZJATYCKIE\n')
    f.write('// w PALEO.ice_sets dla faz 40–8 ka. Margines w Polsce = linia z pliku portalu (verbatim).\n')
    f.write('(function(){\nconst D1 = ')
    f.write(json.dumps(sets_out, ensure_ascii=False, separators=(',', ':')))
    f.write(';\n')
    f.write('''const DROP = /Fennoskandia|Wyspy Brytyjskie|Szkocja|BIIS|Svalbard|Barents|Kara/;
Object.keys(D1).forEach(k => {
  if (!window.PALEO || !window.PALEO.ice_sets[k]) return;
  window.PALEO.ice_sets[k] = window.PALEO.ice_sets[k].filter(p => !DROP.test(p.name)).concat(D1[k]);
});
})();
''')
import os
print('zapisano', OUT, '%.1f KB' % (os.path.getsize(OUT) / 1024))
