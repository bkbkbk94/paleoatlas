#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_ice_quat.py — Batchelor i in. 2019 (Nature Communications 10:3713,
shapefiles: OSF osf.io/7jen3, przekroje "best estimate") → js/data/ice_quat.js.
Globalna (półkula płn.) chronologia lądolodów dla przekrojów ≥ 30 ka
(40/35/30 ka, MIS 4, 5a–5d, 6, 8, 10, 12, 16, 20–24, wczesny Matuyama, późny Gauss).
Dla obszaru PL margines = dokładna linia z danych portalu, jeżeli pasuje (splice);
jeżeli nie — osobny poligon DANE_PORTALU z informacją o rozbieżności.
"""
import shapefile, json, numpy as np, os, glob
from pyproj import Transformer

BASE = '/tmp/icedata/batchelor'
OUT = '/home/user/paleoatlas/js/data/ice_quat.js'
SIMPL_TOL = 0.06
MIN_PART_PTS = 8

tr_laea = Transformer.from_crs("+proj=laea +lat_0=90 +lon_0=0 +datum=WGS84 +units=m", "EPSG:4326", always_xy=True)

_m = open('/home/user/paleoatlas/js/data/meta.js', encoding='utf-8').read()
META = json.loads(_m[_m.index('=') + 1:_m.rindex(';')])
LINES = {f['id']: [[p['lat'], p['lon']] for p in (f.get('linia_pl') or [])] for f in META['fazy']}

SRC_TAG = 'Q19'
SRC_TXT = ('Batchelor i in. 2019, Nature Communications 10:3713 — rekonstrukcja „best estimate" '
           '(hipoteza na bazie syntezy danych empirycznych i modelowania; OSF osf.io/7jen3). '
           'Margines w PL, gdy pokryty — linia z danych portalu.')

# klucz → (folder, kotwica ka, kotwica etype, linia PL do splice, opis)
SLICES = [
  ('q_lgm',       'LGM',                  21,   None,               'LGM (26,5–19 ka — kompilacja światowa Ehlers & Gibbard wg Batchelor 2019)'),
  ('q_30ka',      '30_ka',                30,   None,               'ok. 30 ka (nasuwanie ku LGM)'),
  ('q_35ka',      '35_ka',                35,   None,               'ok. 35 ka (MIS 3)'),
  ('q_40ka',      '40_ka',                40,   None,               'ok. 40 ka (MIS 3)'),
  ('q_45ka',      '45_ka',                45,   None,               'ok. 45 ka (MIS 3)'),
  ('q_mis4',      'MIS_4',                65,   None,               'MIS 4 (71–57 ka)'),
  ('q_mis5a',     'MIS_5a',               82,   None,               'MIS 5a (~82 ka)'),
  ('q_mis5b',     'MIS_5b',               90,   None,               'MIS 5b (~90 ka)'),
  ('q_mis5c',     'MIS_5c',               103,  None,               'MIS 5c (~103 ka)'),
  ('q_mis5d',     'MIS_5d',               112,  None,               'MIS 5d (109–118 ka)'),
  ('q_mis6',      'MIS_6',                155,  'zlodowacenie_warty','MIS 6 / stadiał Warty wg portalu (191–130 ka)'),
  ('q_mis8',      'MIS_8',                280,  'zlodowacenie_odry', 'MIS 8 / stadiał Odry wg portalu (300–243 ka)'),
  ('q_mis10',     'MIS_10',               350,  None,               'MIS 10 (374–337 ka)'),
  ('q_mis12',     'MIS_12',               450,  'poludniowopolskie','MIS 12 — Sanu II / Elsterian, MAKSIMUM plejstocenu w PL (478–424 ka)'),
  ('q_mis16',     'MIS_16',               650,  None,               'MIS 16 — Nidy (676–621 ka)'),
  ('q_mis20_24',  'MIS_20-24',            860,  None,               'MIS 20–24 (ok. 800–940 ka — najstarsze zlodowacenia kompozytu)'),
  ('q_matuyama',  'Early_Matuyama_Chron', 2500, None,               'wczesny Matuyama (~2,5 mln lat — MIS ~100/98)'),
  ('q_gauss',     'Late_Gauss_Chron',     2750, None,               'późny Gauss (~2,7–2,8 mln lat)'),
]

def perp_dist(p, a, b):
    ax, ay = a[1], a[0]; bx, by = b[1], b[0]; px, py = p[1], p[0]
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0: return ((px-ax)**2 + (py-ay)**2) ** .5
    t = max(0, min(1, ((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy)))
    return ((px-(ax+t*dx))**2 + (py-(ay+t*dy))**2) ** .5

def rdp_open(pts, tol, pinned=frozenset()):
    n = len(pts)
    if n <= 3: return pts[:]
    keep = [False]*n; keep[0] = keep[-1] = True
    for i in pinned:
        if 0 < i < n-1: keep[i] = True
    stack = [(0, n-1)]
    while stack:
        a, b = stack.pop()
        pin = next((i for i in range(a+1, b) if keep[i]), None)
        if pin is not None:
            stack.append((a, pin)); stack.append((pin, b)); continue
        dmax, idx = tol, -1
        for i in range(a+1, b):
            d = perp_dist(pts[i], pts[a], pts[b])
            if d > dmax: dmax, idx = d, i
        if idx >= 0:
            keep[idx] = True
            stack.append((a, idx)); stack.append((idx, b))
    return [pts[i] for i in range(n) if keep[i]]

def shoelace(r):
    s = 0.0
    n = len(r)
    for i in range(n):
        a, b = r[i], r[(i+1) % n]
        s += a[1]*b[0] - b[1]*a[0]
    return s / 2.0

def cut_seam(ring_raw):
    """Złożenie długości do [-180,180] i cięcie pierścienia na kawałki przy szwie
       (linia zmiany daty). Każdy łańcuch jest zamykany wzdłuż szwu (jego końce
       leżą po tej samej stronie ±180), więc nic nie przeskakuje mapy."""
    def fold(lo):
        x = lo % 360
        if x > 180: x -= 360
        if x < -180: x += 360
        return x
    r = [[la, fold(lo)] for la, lo in ring_raw]

    def cross_append(cur, chains, a, b):
        d = b[1] - a[1]
        if d < 0:                      # wyjście w prawo (+180)
            t = (180.0 - a[1]) / (b[1] + 360.0 - a[1])
            la = a[0] + t * (b[0] - a[0])
            cur.append([la, 180.0]); chains.append(cur)
            return [[la, -180.0]]
        else:                          # wyjście w lewo (-180)
            t = (-180.0 - a[1]) / (b[1] - 360.0 - a[1])
            la = a[0] + t * (b[0] - a[0])
            cur.append([la, -180.0]); chains.append(cur)
            return [[la, 180.0]]

    chains = []
    cur = [r[0]]
    for i in range(1, len(r)):
        a, b = r[i-1], r[i]
        if abs(b[1] - a[1]) > 180:
            cur = cross_append(cur, chains, a, b)
        cur.append(b)
    # krawędź domykająca r[-1] → r[0]
    a, b = r[-1], r[0]
    if abs(b[1] - a[1]) > 180:
        cur = cross_append(cur, chains, a, b)
        # ogon pierścienia doklejamy logicznie do PIERWSZEGO łańcucha
        if chains:
            chains[0] = cur + chains[0]
        else:
            chains = [cur]
    else:
        chains.append(cur)

    out = []
    for ch in chains:
        if len(ch) < 3: continue
        if abs(shoelace(ch)) < 0.04: continue      # strzępki zerowej powierzchni przy szwie
        out.append(ch + [ch[0]])
    return out or [r]

def fwd(ring, i, j):
    n = len(ring)
    if i <= j: return ring[i:j+1]
    return ring[i:] + ring[:j+1]

def dist2(a, b): return (a[0]-b[0])**2 + (a[1]-b[1])**2

def splice(ring, U):
    iw = min(range(len(ring)), key=lambda i: dist2(ring[i], U[0]))
    ie = min(range(len(ring)), key=lambda i: dist2(ring[i], U[-1]))
    dW, dE = dist2(ring[iw], U[0])**.5, dist2(ring[ie], U[-1])**.5
    if dW > 1.4 or dE > 1.4:
        return None, f'brak dopasowania końców (dW={dW:.2f}°, dE={dE:.2f}°)'
    def south_frac(path):
        ok = sum(1 for p in path if 13.0 < p[1] < 25.0 and 49.5 < p[0] < 55.6)
        return ok / max(1, len(path))
    p_we = fwd(ring, iw, ie); p_ew = fwd(ring, ie, iw)
    if south_frac(p_we) >= south_frac(p_ew):
        core = fwd(ring, ie, iw)[1:]
        newring = U[:] + core[::-1]
    else:
        core = fwd(ring, iw, ie)[1:]
        newring = U[::-1] + core[::-1]
    return newring, set(range(len(U)))

def rings_from_file(prj_path, shp_path):
    """Wszystkie pierścienie pliku jako [lat,lon], z cięciem na szwie ±180."""
    is_degrees = open(prj_path).read().startswith('GEOGCS') and 'PROJCS' not in open(prj_path).read()
    r = shapefile.Reader(shp_path)
    flds = [f[0] for f in r.fields[1:]]
    fi = flds.index('FEATURE') if 'FEATURE' in flds else None
    frac_ice = None
    if fi is not None:
        recs = list(r.records())
        n_ice = sum(1 for rc in recs if rc[fi] == 'Ice')
        frac_ice = n_ice / max(1, len(recs))
    out = []
    for idx, (sh, rec) in enumerate(zip(r.shapes(), r.records())):
        if fi is not None and frac_ice is not None and frac_ice > 0.5 and rec[fi] != 'Ice':
            continue  # LGM: odfiltruj drobne nieoznaczone pierścienie arktyczne
        parts = list(sh.parts) + [len(sh.points)]
        for k in range(len(sh.parts)):
            seg = sh.points[parts[k]:parts[k+1]]
            if len(seg) < MIN_PART_PTS: continue
            xs = np.array([p[0] for p in seg]); ys = np.array([p[1] for p in seg])
            if is_degrees: lon, lat = xs, ys
            else: lon, lat = tr_laea.transform(xs, ys)
            ring = [[float(lat[i]), float(lon[i])] for i in range(len(seg))]
            if len(ring) > 1 and ring[0][0] == ring[-1][0] and ring[0][1] == ring[-1][1]:
                ring = ring[:-1]
            if len(ring) < 3: continue
            for piece in cut_seam(ring):
                if len(piece) >= 3: out.append(piece)
    return out

sets_out, report = {}, []
for key, folder, anchor, linek, label in SLICES:
    d = os.path.join(BASE, folder)
    shp = glob.glob(os.path.join(d, '*_best_estimate.shp'))[0]
    prj = glob.glob(os.path.join(d, '*_best_estimate.prj'))[0]
    rings = rings_from_file(prj, shp)
    # splice linii PL do pierścienia EIS (jeśli jest)
    note = ''
    if linek and LINES.get(linek):
        U = LINES[linek]
        cand = []
        for ri, ring in enumerate(rings):
            dW = min(dist2(p, U[0]) for p in ring) ** .5
            dE = min(dist2(p, U[-1]) for p in ring) ** .5
            if dW < 1.4 and dE < 1.4:
                cand.append((ri, max(dW, dE), len(ring)))
        if cand:
            # preferuj największy pierścień spośród pasujących (ciało EIS)
            cand.sort(key=lambda c: -c[2])
            ri = cand[0][0]
            newring, pin = splice(rings[ri], U)
            if newring is None:
                note = f'splice pominięty: {pin}'
            else:
                rings[ri] = newring
                note = f'splice OK (pierścień {len(rings[ri])} pkt, {len(cand)} kandydatów)'
        else:
            note = 'BRAK pierścienia pasującego do linii PL (margines Batchelora nie sięga PL — patrz przegląd)'
    # uproszczenie (z przyszpileniem wierzchołków leżących na szwie ±180)
    simp, dropped = [], 0
    for ring in rings:
        pin = frozenset(i for i, p in enumerate(ring) if abs(abs(p[1]) - 180) < 1e-9)
        s = rdp_open(ring + [ring[0]], SIMPL_TOL, pin)[:-1]
        if len(s) < 3: continue
        # po uproszczeniu: walidacja szwa i ewentualne ponowne cięcie;
        # jeśli dalej skacze — usuwamy zdegenerowany strzępek przy szwie
        def bad(rx):
            for i in range(len(rx)):
                a, b = rx[i], rx[(i + 1) % len(rx)]
                if abs(a[1] - b[1]) > 170: return True
            return False
        if bad(s):
            fixed = [f[:-1] for f in cut_seam([[round(a, 3), round(b, 3)] for a, b in s])]
            pieces = []
            for f in fixed:
                if len(f) >= 3 and not bad(f): pieces.append(f)
                elif abs(shoelace(f)) < 0.5: dropped += 1
            simp.extend(pieces)
        else:
            simp.append([[round(a, 3), round(b, 3)] for a, b in s])
    # GeoJSON/OGC LinearRing — jawna domkniętość (normalizacja topologii)
    simp = [s if (s and s[0][0] == s[-1][0] and s[0][1] == s[-1][1]) else s + [s[0]] for s in simp]
    nv = sum(len(x) for x in simp)
    km2 = sum(abs(shoelace(x)) for x in simp) * 111  # przybliżenie
    sets_out[key] = [{
        'name': f'Lądolody półkuli płn. — {label}',
        'src': SRC_TAG,
        'rings': simp
    }]
    report.append((key, folder, len(simp), nv, note))

for rep in report: print('%-11s %-20s pierścieni=%4d wierzch=%6d  %s' % rep)

# ---- stadiał Odry (MIS 8 wg korelacji Lindnera): synteza Batchelor 2019 nie
#      sięga Polski, a margines z danych portalu jest KANONICZNY → osobny poligon
#      jak lob gardzieński, z jawną notką o rozbieżności literatury.
FENNO_N2 = [[58, 5], [60, 4], [63, 6], [66, 10], [69, 14], [71, 19], [72, 24], [72, 30], [71, 38], [70, 46], [68, 50], [65, 48], [62, 43], [60, 38], [58, 32], [56, 28]]
odra_line = LINES.get('zlodowacenie_odry')
if odra_line:
    lobe = FENNO_N2 + [[55, 26], [52, 23.5]] + odra_line + [[50.5, 14.5], [51.5, 12], [52.5, 9], [53.5, 7], [54.5, 5]]
    sets_out.setdefault('q_mis8', []).append({
        'name': 'Lądolód stadiału Odry — margines PL wg danych portalu (korelacja szkoły Lindnera: Odra≈MIS 8; synteza Batchelor 2019 sugeruje zasięg NIE sięgający Polski — rozbieżność literatury)',
        'src': 'DANE_PORTALU',
        'rings': [lobe + [lobe[0]]]
    })
    print('q_mis8: doklejono poligon portalu (margines Odry),', len(lobe), 'pkt')

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// Batchelor C.L. i in. 2019, Nature Communications 10:3713 (doi:10.1038/s41467-019-11601-2).\n')
    f.write('// Shapefiles: OSF osf.io/7jen3 — „hypothesised ice-sheet reconstructions", wariant best_estimate.\n')
    f.write('// Wygenerowano przez tools/build_ice_quat.py. Marginesy PL = linie z danych portalu (verbatim), tam gdzie splice się powiódł.\n')
    f.write('window.ICE_QUAT_SRC = ' + json.dumps(SRC_TXT, ensure_ascii=False) + ';\n')
    f.write('window.ICE_QUAT = ')
    f.write(json.dumps(sets_out, ensure_ascii=False, separators=(',', ':')))
    f.write(';\n')
print('zapisano', OUT, '%.0f KB' % (os.path.getsize(OUT)/1024))
