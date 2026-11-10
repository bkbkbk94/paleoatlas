#!/usr/bin/env python3
# Buduje js/data/ice_glacmont.js z GLACIMONTIS (Zenodo 10.5281/zenodo.15600659, CC-BY 4.0):
# Lima A.C., Dulfer H.E., Hughes A.L.C., Margold M., Barr I., Laabs B.J.C., Flantua S.G.A. 2026,
# „Mountain glacier extents at the Last Glacial Maximum", Scientific Data 13:629,
# doi:10.1038/s41597-026-06841-z. Plik: EmpiricallyReconstructedPaleoglaciers.shp (EPSG:3857).
# FALA 1 = regiony wcześniej NIEOBECNE w portalu (Himalaje/Karakoram/Tibet/Pamir/Hindu Kusz,
# Chiny Sr., Ałtaj-Sajany, Syberia Wsch., Japonia, Alpy/Pireneje/KARPATY+TATRY/Bałkany,
# Kaukaz/Anatolia/Iran, Andy tropikalne + wyspy płd.-atl./indyjskie, Kordyliery górskie Ameryki).
# FALA 2 = podmiana dysków-schematów: New Zealand, Australia+Tasmania, Southeast Asia (Nowa Gwinea),
# North African Highlands (Atlas), Eastern Rift mountains (Kilimandżaro/Kenia) — rekord ma pole
# 'grp' (nz/aus/ng/afr/atlas) sterujące dropami schematów i nadpisaniem PA_*_LGM dla q_lgm.
# Okna wieku: deglaupp/deglalow (rok BP) → fazy portalu; 0/0 → okno publikacji 13,5–57 ka.ten
import json, math, collections
import shapefile
from shapely.geometry import Polygon, box, LineString
from shapely.ops import split
from pyproj import Transformer

SHP = '/tmp/glac_shp/Shapefiles/EmpiricallyReconstructedPaleoglaciers.shp'
T = Transformer.from_crs('EPSG:3857', 'EPSG:4326', always_xy=True)
MIN_KM2 = 3.0
def part_floor(rec_area, hypo):
    # rekordy-mozaiki duże: tylko większe kawałki; małe rekordy (np. Tatry 280 km²) — pełny detal od 3 km²
    if hypo: return max(MIN_KM2, rec_area / 250.0)
    return max(1.5, rec_area / 800.0)
def part_tol(part_area, hypo):
    if hypo: return 0.05
    if part_area >= 500: return 0.03
    if part_area >= 60: return 0.02
    return 0.012

EXCLUDE2 = set()   # fala 2: nic nie wykluczamy (dropy schematów per grp w writerze)
PHASES = {'przedmaksymalny': [24000, 30000], 'lgm': [19000, 24000], 'poznanska': [16000, 19000],
          'pomorska': [14000, 16000], 'bolling_allerod': [12900, 14000], 'younger_dryas': [11700, 12900]}

PL = {
 'Himalaya': 'Himalaje', 'Karakoram': 'Karakoram', 'Tibetan Plateau': 'Płaskowyż Tybetański',
 'Pamir Mountains': 'Pamir', 'Pamir Mountains, Tibetan Plateau': 'Pamir i Tybet',
 'Karakoram, Tibetan Plateau': 'Karakoram i Tybet', 'Hindu Kush': 'Hindu Kusz',
 'Tien Shan Mountains': 'Tien Szyan', 'Central China Mountains': 'Góry Chin Środkowych',
 'Kunlun Mountains': 'Kunlun',
 'Himalaya, Hindu Kush, Karakoram, Pamir Mountains, Tibetan Plateau': 'Tybet–Karakoram (maksymalistyczna)',
 'Central China Mountains, Himalaya, Karakoram, Tibetan Plateau': 'Chiny–Himalaje–Tybet (maksymalistyczna)',
 'Altai-Sayan region': 'Ałtaj–Sajany', 'Verkhoyansk mountain system': 'Wierchojańsk',
 'Kolyma Mountains': 'Góry Kołymskie', 'Chukotka Mountains': 'Czukotka (góry)',
 'Anadyr Highlands': 'Wyżyna Anadyrska', 'Koryak Mountains': 'Koriaki',
 'Kamchatka Peninsula': 'Kamczatka', 'Sikhote-Alin Area': 'Sichote-Alin',
 'Japanese Archipelago': 'Japonia',
 'Central European Highlands': 'Alpy / wyżyny Europy Śr.-Zach.',
 'Central European Highlands, Southeast European Highlands': 'Alpy–Bałkany',
 'Southwest European Highlands': 'Pireneje / Masyw Środkowy / Iberia',
 'Southeast European Highlands': 'Bałkany — wyżyny Płd.-Wsch.',
 'East European Highlands': 'KARPATY (w tym TATRY)',
 'South European Highlands': 'Europa Płd.',
 'Anatolian / Armenian Highlands': 'Anatolia / Armenia', 'Caucasus Mountains': 'Kaukaz',
 'Iranian Plateau': 'Wyżyna Irańska',
 'Northern Andes': 'Andy Płn. (tropiki)', 'Central Andes': 'Andy Śr. (tropiki)',
 'Southern Andes': 'Andy Płd. (27–38°S)',
 'South American Interior Ranges': 'Góry wnętrza Brazylii',
 'South American Coastal Ranges': 'Góry wybrzeża Chile',
 'Cordillera Centroamericana': 'Ameryka Środkowa — Kordyliery',
 'Rocky Mountains': 'Góry Skaliste', 'Intermountain West': 'Basen–Pasmo (USA)',
 'Pacific Coast Ranges': 'Góry Wybrzeża Pacyfiku', 'Alaska-Yukon Ranges': 'Alaska–Yukon',
 'Mexican Highlands': 'Wyżyny Meksyku',
 'Ethiopian Highlands': 'Wyżyny Etiopkie', 'South Atlantic Islands': 'Wyspy Atlantyku Płd. (S Georgia)',
 'Southern Indian Ocean Islands': 'Wyspy Oceanu Indyjskiego (Kerguelen)',
 'Polynesia': 'Polinezja', 'Jan Mayen': 'Jan Mayen', 'North Atlantic Islands': 'Wyspy Atl. Płn.',
 'Severnaya Zemlya': 'Ziemia Północna',
 # --- fala 2 ---
 'Great Dividing Range': 'Australia — Snowy Mountains (Góry Wododziałowe)',
 'Tasmania': 'Tasmania',
 'Eastern Rift mountains': 'Afryka — góry Riftu Wsch. (Kilimandżaro / Mt Kenya)',
 'Maghreb Mountains': 'Afryka — Maghreb (Atlas)',
 'North Island (New Zealand)': 'Nowa Zelandia — Wyspa Płn.',
 'South Island': 'Nowa Zelandia — Wyspa Płd.',
 'Stewart Island': 'Nowa Zelandia — Wyspa Stewarta',
 'Malay Archipelago': 'Nowa Gwinea i Archipelag Malajski'}

GRP = {'New Zealand': 'nz', 'Australia': 'aus', 'Southeast Asia': 'ng',
       'East African Highlands': 'afr', 'North African Highlands': 'atlas'}

def area_km2_ring(rr):
    a = 0.0
    for i in range(len(rr)):
        p = rr[i]; q = rr[(i + 1) % len(rr)]
        dln = q[0] - p[0]
        a += dln * (2 + math.sin(math.radians(p[1])) + math.sin(math.radians(q[1])))
    return abs(a / 2) * (6371 ** 2 * math.pi / 180)

def phases_for(up, lo):
    if lo <= 0: lo = 13500
    if up <= 0: up = 57000
    out = []
    for k, (a, b) in PHASES.items():
        if lo < b and up >= a:     # przecięcie [lo,up] z [a,b) — granice na styk liczymy hojnie
            out.append(k)
    return out

CTX_FLOOR = MIN_KM2; CTX_TOL = 0.012; CTX_HYPO = False
def emit_part(poly_pts_lonlat, cite, name):
    """jedna część w (lon,lat) → lista ringów (lat,lon) po filtrach i cięciu antymeridianu"""
    if len(poly_pts_lonlat) < 3: return []
    if area_km2_ring(poly_pts_lonlat) < CTX_FLOOR: return []
    A0 = area_km2_ring(poly_pts_lonlat)
    tol = part_tol(A0, CTX_HYPO)
    poly = Polygon(poly_pts_lonlat)
    if not poly.is_valid: return []
    eps = poly.simplify(tol, preserve_topology=True)
    geoms = [eps]
    # cięcie antymeridianu, gdy część przekracza lon 180
    xs = [p[0] for p in poly_pts_lonlat]
    if max(xs) - min(xs) > 350:
        geoms = []
        w = eps.intersection(box(-180, -90, 180, 90))
        e = eps.intersection(box(180, -90, 360, 90))
        for g, sh in [(w, 0), (e, -360)]:
            if g.is_empty: continue
            for p2 in ([g] if g.geom_type == 'Polygon' else g.geoms if g.geom_type in ('MultiPolygon',) else []):
                geoms.append(p2)
        geoms = [p2 for p2 in geoms if p2.area > 0]
    out = []
    for g in geoms:
        pts = []
        for x, y in g.exterior.coords:
            lo = x if x <= 180 else x - 360
            pts.append([round(y, 3), round(lo, 3)])
        dd = [pts[0]]
        for q in pts[1:]:
            if q != dd[-1]: dd.append(q)
        if dd[0] != dd[-1]: dd.append(dd[0])
        if len(dd) < 4: continue
        if area_km2_ring([(p[1], p[0]) for p in dd]) < 2.0: continue
        if any(abs(b[1] - a[1]) > 170 for a, b in zip(dd, dd[1:])): continue    # nie rozcinaj — pomiń patologię
        out.append(dd)
    return out

if __name__ == '__main__':
    sf = shapefile.Reader(SHP)
    flds = [f[0] for f in sf.fields[1:]]
    items = []
    stat = collections.Counter()
    n_all = 0; n_parts = 0; n_kept = 0; verts = 0
    for sr in sf.iterShapeRecords():
        r = dict(zip(flds, sr.record))
        if r['mrange2'] in EXCLUDE2: continue
        HYPO_FLAG = r['scitation'].startswith('Kuhlemann') is False and (r['scitation'].startswith('Kuhle') or r['scitation'].startswith(('Shangzhe', 'Kamp and Haserodt')))
        CTX_FLOOR = part_floor(r['area'], HYPO_FLAG)
        CTX_HYPO = HYPO_FLAG
        # części z wieloczęściowego shape
        n_all += 1
        parts = []
        pts = sr.shape.points
        idx = list(sr.shape.parts) + [len(pts)]
        for a_i in range(len(idx) - 1):
            seg = pts[idx[a_i]:idx[a_i + 1]]
            ll = [T.transform(x, y) for x, y in seg]
            parts.append(ll)
            n_parts += 1
        fazy = phases_for(r['deglaupp'], r['deglalow'])
        if not fazy: continue
        cite = r['scitation']
        reg = PL.get(r['mrange3'], r['mrange3'] or r['mrange2'])
        hypo = (cite.startswith('Kuhle') and not cite.startswith('Kuhlemann')) or cite.startswith(('Shangzhe', 'Kamp and Haserodt'))
        if r['deglaupp'] <= 0:
            age_txt = 'chronologia nieustalona (okno publikacji ~13,5–57 ka)'
        elif r['deglalow'] <= 0:
            age_txt = 'maks. ≤ %.1f ka (dolna granica nieustalona)' % (r['deglaupp'] / 1000)
        else:
            age_txt = 'maks. %.1f–%.1f ka' % (r['deglalow'] / 1000, r['deglaupp'] / 1000)
        nm = '%s — lodowce: %s (GLACIMONTIS; %s%s)' % (
            reg, cite, age_txt, '; HIPOTEZA sporna (maksymalistyczny glacjalizm — Kuhle/następcy)' if hypo else '')
        rings = []
        for ll in parts:
            for dd in emit_part(ll, cite, nm):
                rings.append(dd)
                n_kept += 1
                verts += len(dd)
        if not rings: continue
        items.append({'name': nm, 'src': 'GLACIMONTIS', 'cite': '%s (%s; doi:%s)' % (cite, r['yrpubli'], r['doi']),
                      'win': fazy, 'grp': GRP.get(r['mrange2'], ''), 'rings': rings})
        stat[r['mrange2']] += 1
    with open('/tmp/glac_w1.json', 'w') as f:
        json.dump(items, f, ensure_ascii=False)
    js_size = len(json.dumps(items, ensure_ascii=False).encode())
    print('rekordów wstrzykniętych:', len(items), '/', n_all)
    print('części geometrii wszystkich/utrzymanych:', n_parts, '/', n_kept, ' wierzchołków:', verts)
    print('json pt≈ bytes:', js_size)
    for k, v in stat.most_common():
        print(f'  {v:3d}  {k}')
