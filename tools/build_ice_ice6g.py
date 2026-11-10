#!/usr/bin/env python3
# Buduje js/data/ice_ice6g.js — zarysy pokrywy lodowej Antarktydy 26→0 ka
# z modelu GIA ICE-6G_C (VM5a): Argus D.F., Peltier W.R., Drummond R., Moore A.W. 2014,
# „The Antarctica component of postglacial rebound model ICE-6G_C (VM5a)…”,
# Geophys. J. Int. 198(1):537–563, doi:10.1093/gji/ggu140;
# Peltier W.R., Argus D.F., Drummond R. 2015, JGR Solid Earth 120:450–487, doi:10.1002/2014JB011176.
# Pliki: https://www.atmosp.physics.utoronto.ca/~peltier/datasets/Ice6G_C_VM5a/ (siatka 1°).
# Kryterium: frakcja lodu (sftgif, %) >= 50; Antarktyda = lat <= -60.
# Geometria: unia komórek → rozcięcie na południku 180° (unikamy skoku przez antymeridian)
# → konwersja lon>180 → upraszczanie → clamp lat >= -84.9 (granica Mercatora Leaflet).
# Emisja: ringi DOMKNIĘTE w (lat, lon), src 'ICE6G' + splice do PALEO.ice_sets (8 kluczy).
import glob, math, json, os
import numpy as np
from netCDF4 import Dataset
from shapely.geometry import box, LineString
from shapely.ops import unary_union, split

CLAT = -84.9      # clamp Mercator
TOL = 0.22        # tolerancja upraszczania (stopnie)
PER = '/tmp/ice6g/i6_%s.nc'
SLICES = {'26':'a26ka','21':'a21ka','17.5':'a17_5ka','15':'a15ka','13.5':'a13_5ka',
          '12':'a12ka','10.5':'a10_5ka','0':'a0ka'}

def load(fn):
    ds = Dataset(fn)
    lat = np.array(ds.variables['lat'][:]); lon = np.array(ds.variables['lon'][:])
    g = np.array(ds.variables['sftgif'][:]) / 100.0
    return lon, lat, g

def rings_for_slice(fn):
    lon, lat, g = load(fn)
    m = (g >= 0.5)
    polys = []
    for j, la in enumerate(lat):
        if la > -60: continue
        for i, lo in enumerate(lon):
            if m[j, i]:
                polys.append(box(lo-0.5, max(la-0.5, -90.0), lo+0.5, min(la+0.5, 90.0)))
    u = unary_union(polys)
    if u.geom_type == 'GeometryCollection' or u.geom_type == 'MultiPolygon':
        geoms0 = sorted(u.geoms, key=lambda p: p.area, reverse=True)
        big = geoms0[0]
    else:
        big = u
    # rozcięcie po południku 180 (antymeridian), bo maska obejmuje pełne 360°
    parts = split(big, LineString([(180.0, -91.0), (180.0, -59.0)]))
    geoms = [p for p in parts.geoms if p.area > 3.0]
    # kolejność: zachodnia (x<180), wschodnia (x>180)
    geoms.sort(key=lambda p: p.centroid.x)
    # powierzchnia frakcyjna (km²) — z pełnej siatki
    A = 0.0
    for j, la in enumerate(lat):
        if la > -60: continue
        cell = (2*math.pi*6371/360.)**2 * math.cos(math.radians(la))
        for i in range(len(lon)):
            if g[j, i] > 0: A += float(g[j, i]) * cell
    out = []
    for p in geoms:
        east = p.centroid.x > 180.0
        s = p.simplify(TOL, preserve_topology=True)
        pts = []
        for x, y in s.exterior.coords:
            if east:
                lo = x - 360.0          # x=180 → -180 (szew od strony wschodniej)
            else:
                lo = x                  # x∈[0,180]
            lo = max(min(lo, 180.0), -180.0)
            la = max(min(y, 90.0), CLAT)
            pts.append([round(la, 3), round(lo, 3)])
        # dedupe sąsiednich + domknięcie
        dd = [pts[0]]
        for q in pts[1:]:
            if q != dd[-1]: dd.append(q)
        if dd[0] != dd[-1]: dd.append(dd[0])
        # rozszczep krawędzie z |Δlon| > 90° (brzeg clampu po uproszczeniu: ±180 → ~0);
        # regresja antypołudnika M1.1 wymaga |Δlon| ≤ 170 na KAŻDEJ krawędzi
        dl = [dd[0]]
        for a, b in zip(dd, dd[1:]):
            g = abs(a[1] - b[1])
            n = 1
            while g / n > 90: n += 1
            for i in range(1, n + 1):
                dl.append([round(a[0] + (b[0]-a[0]) * i / n, 3), round(a[1] + (b[1]-a[1]) * i / n, 3)])
        dd = dl
        if len(dd) >= 4: out.append(dd)
    # wariant globusowy: JEDEN pierścień ZAWIERAJĄCY BIEGUN (RFC 7946 pole polygon) —
    # brzeg clampu (−84,9, pełne 360°) zwijany do pojedynczego wierzchołka (−90, 0);
    # densyfikacja krawędzi brzegowej ≤1,5° (krótkie łuki d3 → brak dartów).
    sg = big.simplify(TOL, preserve_topology=True)
    ptsg = []
    for x, y in sg.exterior.coords:
        ptsg.append([round(max(min(y, 90.0), CLAT), 3), round(x, 3)])
    dd0 = [ptsg[0]]
    for q in ptsg[1:]:
        if q != dd0[-1]: dd0.append(q)
    if dd0[0] != dd0[-1]: dd0.append(dd0[0])
    coast = [p for p in dd0 if p[0] > CLAT + 1e-9]     # ścieżka brzegowa (bez brzegu clampu)
    if len(coast) >= 3:
        dens = [coast[0]]
        for a, b in zip(coast, coast[1:]):
            dist = max(abs(b[0]-a[0]), abs(b[1]-a[1]))
            n = max(1, int(dist / 1.5))
            for i in range(1, n + 1):
                la = a[0] + (b[0]-a[0]) * i / n
                lo = a[1] + (b[1]-a[1]) * i / n
                dens.append([round(la, 3), round(lo, 3)])
        # domknięcie przez biegun: ostatni naroż clampu → biegun → pierwszy naroż clampu
        pole = [-90.0, dens[0][1]]
        gg = dens + [list(pole), list(pole)]
        gg[0] = list(pole)          # start w punkcie bieguna (domknięcie: gg[0]==gg[-1])
        gg = gg if gg[0] == gg[-1] else gg + [list(gg[0])]
    else:
        gg = []
    return A, out, ([gg] if len(gg) >= 4 else [])

def rings_gc(fn):
    """Grenlandia: lat >= 57, lon ∈ [-75,-10]; sftgif (%) >= 50. Unia komórek → 1 pierścień."""
    lon, lat, g = load(fn)
    lon2 = [l - 360 if l > 180 else l for l in lon]
    polys = []
    for j, la in enumerate(lat):
        if la < 57: continue
        for i, lo in enumerate(lon2):
            if lo < -75 or lo > -10: continue
            if g[j, i] >= 0.5:
                polys.append(box(lo-0.5, la-0.5, lo+0.5, la+0.5))
    if not polys: return 0.0, []
    u = unary_union(polys)
    geoms = [u] if u.geom_type == 'Polygon' else list(u.geoms)
    geoms = [p for p in geoms if p.area > 3.0]
    A = 0.0
    for j, la in enumerate(lat):
        if la < 57: continue
        cell = (2*math.pi*6371/360.)**2 * math.cos(math.radians(la))
        for i, lo in enumerate(lon2):
            if -75 <= lo <= -10 and g[j, i] > 0:
                A += float(g[j, i]) * cell
    out = []
    for p in sorted(geoms, key=lambda p: p.area, reverse=True)[:1]:
        s = p.simplify(TOL, preserve_topology=True)
        pts = [[round(y, 3), round(x, 3)] for x, y in s.exterior.coords]
        dd = [pts[0]]
        for q in pts[1:]:
            if q != dd[-1]: dd.append(q)
        if dd[0] != dd[-1]: dd.append(dd[0])
        if len(dd) >= 4: out.append(dd)
    return A, out

def rings_is(fn):
    """Islandia (IIS): lat ∈ [62.5, 67.2], lon ∈ [-26,-12]; sftgif (%) >= 50.
    Unia komórek → pierścienie członów. Uwaga: modelowa maska IIS jest statyczna
    26→13,5 ka (brak regresji morskiej w tej siatce), pierwsza cofka dopiero 12 ka;
    do 0 ka lód znika całkowicie (stgit = 0, brak czap — współczesne czapy z RGI 7.0)."""
    lon, lat, g = load(fn)
    lon2 = [l - 360 if l > 180 else l for l in lon]
    polys = []
    for j, la in enumerate(lat):
        if la < 62.5 or la > 67.2: continue
        for i, lo in enumerate(lon2):
            if lo < -26 or lo > -12: continue
            if g[j, i] >= 0.5:
                polys.append(box(lo-0.5, la-0.5, lo+0.5, la+0.5))
    if not polys: return 0.0, []
    u = unary_union(polys)
    geoms = [u] if u.geom_type == 'Polygon' else list(u.geoms)
    geoms = [p for p in geoms if p.area > 0.5]
    A = 0.0
    for j, la in enumerate(lat):
        if la < 62.5 or la > 67.2: continue
        cell = (2*math.pi*6371/360.)**2 * math.cos(math.radians(la))
        for i, lo in enumerate(lon2):
            if -26 <= lo <= -12 and g[j, i] > 0:
                A += float(g[j, i]) * cell
    out = []
    for p in sorted(geoms, key=lambda p: p.area, reverse=True):
        s = p.simplify(TOL, preserve_topology=True)
        pts = [[round(y, 3), round(x, 3)] for x, y in s.exterior.coords]
        dd = [pts[0]]
        for q in pts[1:]:
            if q != dd[-1]: dd.append(q)
        if dd[0] != dd[-1]: dd.append(dd[0])
        if len(dd) >= 4: out.append(dd)
    return A, out

if __name__ == '__main__':
    res = {}
    resg = {}
    resgr = {}
    resis = {}
    info = {}
    for t, key in SLICES.items():
        A, rings, ringg = rings_for_slice(PER % t)
        res[key] = rings
        resg[key] = ringg
        info[key] = A / 1e6
        A2, rings2 = rings_gc(PER % t)
        resgr['g' + key[1:]] = rings2
        info['g' + key[1:]] = A2 / 1e6
        A3, rings3 = rings_is(PER % t)
        resis['i' + key[1:]] = rings3
        info['i' + key[1:]] = A3 / 1e3
        nv = sum(len(r) for r in rings)
        nvg = sum(len(r) for r in ringg)
        mn = min(min(p[0] for p in r) for r in rings)
        jumps = sum(1 for r in rings for a, b in zip(r, r[1:]) if abs(a[1]-b[1]) > 180)
        jumpsg = sum(1 for r in ringg for a, b in zip(r, r[1:]) if abs(a[1]-b[1]) > 360)
        print(f"{t:>5} ka → {key}: A={info[key]:6.2f} mln km2  ringi(mapa)={len(rings)}/{nv}  ring(globus)={len(ringg)}/{nvg}  skoki180={jumps} | GREN {info['g'+key[1:]]:5.2f} mln | ISL {info['i'+key[1:]]:7.1f} tys.", flush=True)
    with open('/tmp/ice6g.json', 'w') as f:
        json.dump({'rings': res, 'rings_globe': resg, 'rings_gren': resgr, 'rings_isl': resis, 'area': info}, f)
    print('OK')
