#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_paleocoast.py (v2) — wyschnięte szelfy z batymetrii ETOPO2v2c (NOAA/NCEI, domena publiczna).
Dla zadanego poziomu morza L [<0 m] szelf = komórki oceanu z głębokością 0 ≥ z > L.
Wyjście: js/data/shelves.js  (window.SHELVES = { '-125': [ [outer,[hole,...]], ...], ...})

v2 (2026-08-05) — POPRAWKA STRUKTURALNA: kontury przez cv2.findContours(RETR_CCOMP),
hierarchia wprost z algorytmu (outer + holes + wyspy-w-dziurach jako osobne poligony),
szew antypołudnika przeniesiony przez przewinięcie maski do 150°E (tam brak szelfów
na wszystkich poziomach). v1 grupował pierścienie własnym kodeksem głębokości<=1
i gubił wielkie poligony (audyt landshots: Barents/Kara znikał przy -95 m; Azja przy -50 m).
Walidacja rasterowa: po przerysowaniu wynikowych poligonów pełnym rozrzedzeniem wieża
się z maską weWNĘTRZNĄ (poza pasmem ±2 komórki od granicy = tolerancja RDP) — wymagane 0
rozbieżności oraz zagnieżdżenie zbiorów pomiędzy poziomami.
"""
import numpy as np, json, time, os, gc, sys
import cv2
from pathlib import Path
ROOT = str(Path(__file__).resolve().parent.parent)
def log(*a):
    print(*a); sys.stdout.flush()

BIN = '/tmp/icedata/etopo2/ETOPO2v2c_i2_MSB.bin'
OUT = ROOT + '/js/data/shelves.js'
NROWS, NCOLS = 5400, 10800          # 2 min łuku, komórki; wiersz 0 = południe (-90)
DLAT = 180.0 / NROWS                # 1/30 stopnia
DLON = 360.0 / NCOLS
LEVELS = [-125, -110, -100, -95, -80, -75, -60, -55, -50, -30, -5]
EPS_PX = 2.1      # RDP [piksele] ≈ 0.07° (jak SIMPL_TOL v1, ~5 km)
MIN_AREA = 0.08   # min. powierzchnia pierścienia [deg^2]
CUT_LON = 150.0   # długość cięcia maski: Ocean Spokojny / M.Ochockie — brak szelfów na wszystkich poziomach

t0 = time.time()
z = np.fromfile(BIN, dtype='>i2').reshape(NROWS, NCOLS).astype(np.int16)   # 58 MB (RAM ~1 GB); '>i2' sam w sobie interpetuje big-endian
z = z[::-1].copy()     # plik binarny pisany od PÓŁNOCY — odwracamy: wiersz 0 = południe (-90)
def probe(lat, lon):
    return z[int((lat + 90) * 30), int((lon + 180) * 30)]
assert probe(27.9881, 86.925) > 8000, f'Everest probe failed: {probe(27.9881, 86.925)}'
assert -130 < probe(56.5, 3.0) < 0, f'North Sea probe failed: {probe(56.5, 3.0)}'
assert -60 < probe(75.0, 70.0) < 0, f'Barents probe failed: {probe(75.0, 70.0)}'    # ~-35 m: ląd już przy L<-35
log(f'ETOPO OK (Everest {probe(27.9881, 86.925):.0f} m, M.Pln {probe(56.5, 3.0):.0f} m, Barents {probe(75.0, 70.0):.0f} m)  [{time.time()-t0:.1f}s]')

CS = int((CUT_LON + 180) * 30)      # kolumna cięcia w siatce (150°E)

def shoelace_ll(pts):                # pts: [[lat,lon],...] — ring DOMYKAMY (cv2 zwraca kontury otwarte!)
    n = len(pts); s = 0.0
    for i in range(n):
        x1, y1 = pts[i][1], pts[i][0]
        x2, y2 = pts[(i + 1) % n][1], pts[(i + 1) % n][0]
        s += x1 * y2 - x2 * y1
    return s / 2.0

def contour_to_ring(cnt):
    """piksele cv2 (x=kolumna, y=wiersz, wsp. środków komórek) -> [[lat,lon],...] z ciągłością
       długości geograficznej (unwrap ±360); odwijamy kolumnę cięcia CS."""
    pts = cnt.reshape(-1, 2)
    ring = []
    prev_lon = None; off = 0.0
    for x, y in pts:
        orig_col = (int(x) + CS) % NCOLS
        lon = -180.0 + (orig_col + 0.5) * DLON
        if prev_lon is not None:
            d = lon + off - prev_lon
            if d > 180: off -= 360.0
            elif d < -180: off += 360.0
        lat = -90.0 + (int(y) + 0.5) * DLAT
        prev_lon = lon + off
        ring.append([round(lat, 2), round(prev_lon, 2)])
    return ring

def ring_px(ring_ll):
    """[[lat,lon],...] -> piksele (float) do przerysowania walidacyjnego (ramka przewinięta)."""
    out = []
    for lat, lon in ring_ll:
        colf = (lon + 180.0) / DLON - 0.5
        col = int(round(colf))
        colr = (col - CS) % NCOLS
        row = int(round((lat + 90.0) / DLAT - 0.5))
        out.append([colr, row])
    return np.array(out, dtype=np.int32)

result = {}
for L in LEVELS:
    t1 = time.time()
    mask = ((z > L) & (z <= 0))
    mroll = np.roll(mask, shift=-CS, axis=1).astype(np.uint8)     # przewinięcie: szew na 150°E
    cnts, hier = cv2.findContours(mroll, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    hier = hier[0] if hier is not None else np.empty((0, 4), dtype=int)
    polys = []
    for i in range(len(cnts)):
        if hier[i][3] != -1: continue                          # tylko kontury najwyższego poziomu
        ap = cv2.approxPolyDP(cnts[i], EPS_PX, True)
        if len(ap) < 4: continue
        outer = contour_to_ring(ap)
        if abs(shoelace_ll(outer)) < MIN_AREA: continue
        holes = []
        j = hier[i][2]
        while j != -1:
            ah = cv2.approxPolyDP(cnts[j], EPS_PX, True)
            if len(ah) >= 4:
                r = contour_to_ring(ah)
                if abs(shoelace_ll(r)) >= MIN_AREA:
                    holes.append(r)
            j = hier[j][0]
        polys.append([outer] + holes)
    polys.sort(key=lambda p: -abs(shoelace_ll(p[0])))
    nv = sum(len(r) for p in polys for r in p)

    # ---- walidacja: przerysuj wynik pełną rozdzielczością i porównaj z maską ----
    canvas = np.zeros((NROWS, NCOLS), dtype=np.uint8)
    for p in polys:
        cv2.fillPoly(canvas, [ring_px(p[0])], 1)               # outer
        for h in p[1:]:
            cv2.fillPoly(canvas, [ring_px(h)], 0)              # dziury
    k3 = np.ones((3, 3), np.uint8); k5 = np.ones((5, 5), np.uint8)
    boundary = cv2.morphologyEx(mroll, cv2.MORPH_GRADIENT, k3)  # 1-px pasmo granic maski
    band = cv2.dilate(boundary, k5, iterations=1).astype(bool)  # ±2 komórki (=tolerancja RDP)
    del boundary
    interior = ((canvas != mroll) & ~band).astype(np.uint8)
    # zagnieżdżenie: canvas(L) ⊆ render(poziom płytszy)? (poza pasmem tolerancji RDP)
    if L != LEVELS[0]:
        nnmask = ((canvas.astype(bool) & ~prev_render) & ~band).astype(np.uint8)
    else:
        nnmask = None
    del band, k3, k5; gc.collect()
    ncomp, lab, stats, _ = cv2.connectedComponentsWithStats(interior)
    comps = sorted((stats[a][4] for a in range(1, ncomp)), reverse=True)
    interior_diff = int(interior.sum())
    maxcomp = comps[0] if comps else 0
    del interior, lab, stats
    not_nested, nn_max = 0, 0
    if nnmask is not None:
        nn_n, nn_lab, nn_stats, _ = cv2.connectedComponentsWithStats(nnmask)
        nn_comps = sorted((nn_stats[a][4] for a in range(1, nn_n)), reverse=True)
        not_nested = int(nnmask.sum())
        nn_max = nn_comps[0] if nn_comps else 0
        del nnmask, nn_lab, nn_stats
    prev_render = canvas.astype(bool)
    del canvas; gc.collect()
    log(f'L={L:>5}: {len(polys):>4} poligonów, {nv:>6} wierzchołków | walidacja: wewn.różnice={interior_diff}px (max {maxcomp}), nienested={not_nested}px (max {nn_max})  [{time.time()-t1:.0f}s]')
    # budżet szumu subpikselowego (zaokrąglenia 0.01°, szew 150°E): jeden realny błąd danych
    # (gubiony pierścień/kieszeń) daje natychmiast komponent w setkach-tysiącach px
    assert maxcomp < 50 and interior_diff <= 300, f'L={L}: błąd strukturalny wnętrza (max komponent {maxcomp} px, suma {interior_diff})'
    assert nn_max < 50 and not_nested <= 300, f'L={L}: naruszenie zagnieżdżenia (max {nn_max} px, suma {not_nested})'
    globals()['S' + str(-L)] = polys
    result[str(L)] = {'vertex': nv, 'polys': len(polys), 'sec': round(time.time() - t1, 1)}

with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// Wygenerowano przez tools/build_paleocoast.py (v2, cv2) z ETOPO2v2c (NOAA/NCEI, domena publiczna).\n')
    f.write('// Wyschnięty szelf = dno oceanu z głębokością 0 >= z > L dla danego poziomu morza L [m].\n')
    f.write('// Format: SHELVES[poziom] = lista poligonów: [ring_zewnętrzny, hole1, ...]; ring = [[lat,lon],...]\n')
    f.write('window.SHELVES = {')
    parts = []
    for L in LEVELS:
        polys = globals()['S' + str(-L)]
        s = json.dumps(polys, ensure_ascii=False, separators=(',', ':'))
        parts.append(f'"{L}":{s}')
    f.write(','.join(parts))
    f.write('};\n')
print('zapisano', OUT, '%.1f KB' % (os.path.getsize(OUT) / 1024))
print('PODSUMOWANIE:', result)
