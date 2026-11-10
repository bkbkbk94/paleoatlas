#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_biomes.py — warstwa biomów/ekotypów PaleoAtlas.

ŹRÓDŁA (publikowane, otwarte — pełne cytaty w README i w „O danych"):
  - Beyer, Krapp & Manica 2020, Sci. Data 7:236 — BIOME4 na klimacie HadCM3+HadAM3H
    (bias-corrected, 0,5°, migawki 0–120 ka; plik pastclim figshare: Beyer2020_all_vars_v1.0.0.nc),
  - Krapp, Beyer, Edmundson, Valdes & Manica 2021 — emulator statystyczny HadCM3
    (0,5°, co 1000 lat, 0–799 ka; Krapp2021_biome_v1.0.0.nc),
  - Barreto, Holden, Edwards & Rangel 2023, GEB 32:1034 — PALEO-PGEM-Series
    (1°, co 1000 lat, 5 mln lat -> bioclim: bio1/bio5/bio6/bio12/bio15/bio16/bio17, CC-BY 4.0)
    -> klasyfikator HG-lite portalu (nazwany, dokumentowany poniżej),
  - BIOME 6000 v4.2 (Prentice 2000; Harrison 2001; Bigelow 2003; Pickett 2004; Marchant;
    Ni; Sutra — PMIP2/BRIDGE) — stanowiska pyłkowe 0k/6k/18k(¹⁴C) jako WARSTWA KONTROLNA
    (osobny plik js/data/biome_pollen.js — renderowana punktowo przy migawkach kotwicznych).

PRODUKT:
  js/data/biome/<eps>.png           — 8-bit indeksowane PNG (klasy 0–28) 720×360 (0,5°)
  js/data/biome_meta.js             — BIOME_META: epoki, źródła, paleta, nazwy PL, zgodności
  js/data/biome_pollen.js           — stanowiska BIOME 6000 (kotwice pomiarowe)
  biome_report.json (stdout też)    — raport zgodności (HG-lite vs modele; wszystkie vs pyłek)

MACIERZ EPOK (55): holocen co 1 ka (1–11), ticki portalu 12,3–125, przecięcia 155–780,
głębokie 810–3300 ka. Zasada wyboru migawki w UI: najbliższa (jak envTickForBP).

KLASY: 0 = ocean · 1–28 = BIOME4 (lista w nagłówku Krapp):
  1 Tropical evergreen forest … 28 Land ice.

Całość jest osadzona na SIATCE Krapp (0,5°, lat -89,75..89,75 w górę).
"""
import numpy as np, json, os, re, time
import netCDF4 as nc
from PIL import Image

DATA = '/home/user/biodata'
OUTDIR = '/home/user/paleoatlas/js/data/biome'
NLON, NLAT = 720, 360
LAT0, DLAT = -89.75, 0.5
LON0, DLON = -179.75, 0.5
INT_MIN = -2147483648

# ---------------------------------------------------------------- epoki i źródła
SNAP = [(0, 'beyer', 0)]          # dziś — kotwica pyłkowa 0k (BIOME 6000)
for ka in [1,2,3,4]:
    SNAP.append((ka, 'beyer', ka))
for ka in [5,6,7,8,9,10,11,12.3,13.6,15,17.5,21.5,27,30,35,40,45,65,85,95,105,115,125,
           155,200,250,280,350,420,450,520,600,650,700,730,780]:
    SNAP.append((ka, 'mixed07', ka))   # rozstrzygnięcie w trybie: beyer jeśli ≤120 i pasuje do 2-ka; inaczej krapp
for ka in [810,940,1050,1190,1400,1550,1650,1750,1850,2000,2150,2300,2500,2750,3300]:
    SNAP.append((ka, 'pgem', ka))

BEYER_EVEN = set(list(range(12, 121, 2)))
def src_for(ka, want):
    if ka <= 4: return 'beyer'
    if want == 'pgem': return 'pgem'
    if ka <= 120:
        ke = int(round(ka))
        if ke % 2: ke += 1 if ka >= ke else -1
        if ke in BEYER_EVEN: return 'beyer'
    return 'krapp'

# ---------------------------------------------------------------- klasy / paleta / PL
PAL = {
 0:(174,203,217), 1:(10,95,0), 2:(26,125,26), 3:(47,150,51), 4:(99,176,75), 5:(61,143,102),
 6:(109,191,111), 7:(121,182,163), 8:(95,158,168), 9:(74,127,176), 10:(33,80,125),
 11:(75,125,184), 12:(200,168,75), 13:(201,154,63), 14:(184,154,85), 15:(143,179,95),
 16:(178,191,95), 17:(127,174,122), 18:(91,143,91), 19:(224,194,92), 20:(181,180,74),
 21:(232,224,122), 22:(176,190,190), 23:(158,175,178), 24:(142,166,170), 25:(126,159,164),
 26:(110,152,158), 27:(184,184,184), 28:(240,248,252) }
PL = {0:'ocean',
 1:'las tropikalny wieczniezielony',2:'las tropikalny półliściasty',3:'las tropikalny liściasty/łęgowy zrzucający',
 4:'las umiarkowany liściasty',5:'las umiarkowany iglasty',6:'las mieszany ciepły',7:'las mieszany chłodny',
 8:'las iglasty chłodny',9:'las mieszany zimny',10:'tajga zimozielona / las górski',11:'tajga liściasta / las górski',
 12:'sawanna tropikalna',13:'zarośla kserofityczne tropikalne',14:'zarośla kserofityczne umiarkowane',
 15:'zadrzewienia sklerofilne umiarkowane',16:'sawanna umiarkowana liściasta',17:'otwarte bory iglaste',
 18:'parkland borealny',19:'roślinność trawiasta tropikalna',20:'stepy umiarkowane',21:'pustynia',
 22:'tundra stepowa',23:'tundra krzaczasta',24:'tundra niska krzaczasta',25:'tundra półleżna krzaczasta',
 26:'tundra płowikowo-mchowa (cushion-forb)',27:'pustka goła (barren)',28:'lądolód'}
GRP = {'lasy tropikalne':[1,2,3],'lasy ciepłe umiarkowane':[4,5,6,7,8,9,15,17],'tajga i lasy borealne':[10,11],
 'sawanny i suche zadrzewienia':[12,13,14,16,18],'stepy i trawy':[19,20],'pustynie':[21],
 'tundry':[22,23,24,25,26],'pustka goła':[27],'lądolód':[28]}
OFGRP = {}
for g, lids in GRP.items():
    for k in lids: OFGRP[k] = g

# ---------------------------------------------------------------- paleta PNG (0..28 + wypełnienie)
def pal_bytes():
    px = []
    for i in range(256):
        px += list(PAL.get(i, (0, 0, 0)))
    return bytes(px)

def sane_ka(ka_val):
    return 0.0 if abs(ka_val) < 1e-9 else ka_val

def save_png(grid, path):
    """grid int8 [360,720] lat w górze -> PNG: górą północ (odwrócenie wierszy)."""
    im = Image.fromarray(grid[::-1].astype(np.uint8), mode='P')
    im.putpalette(pal_bytes())
    im.save(path, optimize=True)

# ---------------------------------------------------------------- źródła: ekstrakcja
def load_beyer():
    ds = nc.Dataset(f'{DATA}/beyer_all.nc')
    return ds, np.array(ds['time'][:]), np.array(ds['latitude'][:]), np.array(ds['longitude'][:])

def beyer_slice(ds, t, blat, ka):
    i = int(np.argmin(np.abs(t - (-ka * 1000))))
    b = np.array(ds['biome'][i, :, :], dtype=np.float32)
    b[b < -900] = np.nan
    g = np.full((NLAT, NLON), np.nan, dtype=np.float32)
    row0 = int(round((blat[0] - LAT0) / DLAT))          # -59,75 -> 60
    g[row0:row0 + b.shape[0], :] = b
    g[np.isnan(g)] = -1
    real_ka = sane_ka(-float(t[i]) / 1000.0)
    return g.astype(np.int16), real_ka

def load_krapp():
    ds = nc.Dataset(f'{DATA}/krapp_biome.nc')
    return ds, np.array(ds['time'][:])

def krapp_slice(ds, t, ka):
    i = int(np.argmin(np.abs(t - (-ka * 1000))))
    b = np.array(ds['biome'][i, :, :], dtype=np.int32)
    b[b == INT_MIN] = -1
    return b.astype(np.int16), sane_ka(-float(t[i]) / 1000.0)

# ---------------------------------------------------------------- HG-lite (głęboki czas, PGEM)
class PGEM:
    def __init__(self):
        self.ds = {}
        for v in ['bio1', 'bio5', 'bio6', 'bio12', 'bio15', 'bio16', 'bio17']:
            self.ds[v] = nc.Dataset(f'{DATA}/pgem_{v}.nc')
        d0 = self.ds['bio1']
        self.t = np.array(d0['time'][:])
        self.lat = np.array(d0['latitude'][:])     # 83.5 -> -64.5 (1°)
        self.lon = np.array(d0['longitude'][:])
        self.var = {v: list(x for x in self.ds[v].variables if x.startswith('bio'))[0] for v in self.ds}

    def slices(self, ka):
        i = int(np.argmin(np.abs(self.t - (-(ka * 1000) + 20))))
        out = {}
        for v, d in self.ds.items():
            a = np.array(d[self.var[v]][i, :, :], dtype=np.float32)
            a[a < -1000] = np.nan
            out[v] = a
        return out, sane_ka(-(float(self.t[i]) + 20) / 1000.0)

    def to_global(self, a1):
        """1 stopien (lat desc, lon 360) -> 0,5 stopnia siatka globalna (lat asc, lon 720): replikacja 2x2."""
        a2 = np.repeat(np.repeat(a1[::-1, :], 2, axis=0), 2, axis=1)   # (298, 720), lat asc
        g = np.full((NLAT, NLON), np.nan, dtype=np.float32)
        r0 = int(round((self.lat[-1] - LAT0) / DLAT))                  # -64,5 -> wiersz 50
        g[r0:r0 + a2.shape[0], :] = a2
        return g

def hglite(V):
    """HG-lite v0.6: reguły -> BIOME4 (1-28) z bioclim PGEM (bio1/5/6/12/15/16/17; stopnie C, mm).
       Struktura zgodna z BIOME4 (Prentice i in. 1992; Kaplan 2001): najpierw sucho skrajne,
       potem zimno (GDD5-proxy = bio5/bio6), potem tropikalny łańcuch las-sawanna-kserofit,
       na końcu lasy umiarkowane i stepy. PIERWSZA pasująca reguła wygrywa.
       Kalibracja/walidacja: tools/check_biomes.py (zgodność z Krapp2021 @0 ka, globalnie i per region)."""
    warm = V['bio5']; cold = V['bio6']; ap = V['bio12']; mat = V['bio1']; pwet = V['bio16']; pdry = V['bio17']
    wet = (pwet - pdry) / np.maximum(pdry + 5.0, 5.0)
    rules = [
        (np.isnan(ap), -1),                                          # ocean / brak
        ((ap < 80), 21),                                             # pustynia skrajna
        ((ap < 140) & (mat > 15), 21),                               # pustynia ciepła
        ((ap < 250) & (mat > 20), 21),                               # sucha pustynia gorąca (Australia C)
        ((ap < 150), 21),                                            # pustynia chłodna (płyta Patagonii)
        ((mat >= 20) & (ap < 400), 13),                              # kserofit tropikalny
        ((mat >= 18) & (ap < 330), 13),
        ((ap < 120) & (mat < 10), 27),                               # pustka goła (sucho-zimno)
        ((warm < 10) & (cold < -28), 26),                            # tundra skrajnie zimna
        ((warm < 10), 23),                                           # tundra krzaczasta
        ((cold < -30), 11),                                          # tajga liściasta (zimy surowe)
        ((warm < 19) & (ap < 300), 18),                              # parkland borealny
        (((cold < -15) & (warm < 22)) | ((warm < 17) & (mat < 7)) | (warm < 13), 10),  # tajga (kontynentalna)
        ((ap < 300), 14),                                            # kserofit/półpustynia umiarkowana
        ((mat >= 17) & (ap < 520), 14),                              # suche skraje tropiku
        ((mat < 14) & (ap < 450) & (pdry < 60), 20),                 # step chłodny (preria, Patagonia, Azja C)
        ((mat >= 17) & (ap < 1200) & (pdry < 80), 12),               # sawanna tropikalna (Indie, Sudan)
        ((mat >= 20) & (ap >= 800) & (pdry < 50) & (ap < 1800), 3),  # trop. las sezonowy (monsoon)
        ((mat < 18) & (mat >= 2) & (ap < 560) & (wet < 0.35), 14),   # stepno-kserofityczne umiarkowane
        ((mat < 2) & (ap < 520) & (wet < 0.3), 14),
        ((mat >= 18) & (pdry < 200) & (wet < 0.5), 12),              # sawanna wilgotniejsza
        ((mat >= 18), 1),                                            # trop. las zimozielony
        ((mat >= 13) & (cold >= 5) & (ap > 600) & (pdry > 30), 15),  # sklerofilne (mediter.)
        ((mat >= 12) & (cold >= 1) & (pdry < 175), 6),               # ciepły las mieszany
        ((cold >= -10) & (pdry < 175), 7),                           # chłodny las mieszany
        ((warm < 27) & (cold < -10) & (pdry < 150), 9),              # las mieszany zimny
        ((pdry >= 175) & (ap < 700), 20),                            # step na bardzo mokrym pdry-fallback
        ((ap >= 300), 20),                                           # step umiarkowany
    ]
    klass = np.full(ap.shape, 20, dtype=np.int16)
    for cond, k in rules[::-1]:      # od końca: wcześniejsza (wyżej priorytetowa) pasująca reguła WYGRYWA
        klass = np.where(cond, k, klass)
    return klass.astype(np.int16)

# ---------------------------------------------------------------- lód: Q19 + Antarktyda
def load_quat():
    src = open('/home/user/paleoatlas/js/data/ice_quat.js', encoding='utf-8').read()
    m = re.search(r'window\.ICE_QUAT\s*=\s*\{', src)
    i = m.end() - 1
    # domknięcie nawiasów (średniki występują w stringach — liczymy klamry poza stringami)
    d = 0; ins = False; esc = False
    for k in range(i, len(src)):
        c = src[k]
        if esc: esc = False; continue
        if c == '\\': esc = True; continue
        if c == '"': ins = not ins; continue
        if ins: continue
        if c == '{': d += 1
        elif c == '}':
            d -= 1
            if d == 0: return json.loads(src[i:k + 1])
    raise RuntimeError('ICE_QUAT parse')

def ice_mask(qkey, ICE):
    """raster 0,5° (720×360, lat asc): 1 gdzie wygładzenie lądolodu z przekroju Q19.
       fill na siatce przewiniętej (szew 150°E) i odwinięcie."""
    import cv2
    CS = int((150 + 180) / DLON)
    can = np.zeros((NLAT, NLON), np.uint8)
    if qkey and qkey in ICE:
        for poly in ICE[qkey]:
            for ring in poly['rings']:
                pts = [[int(round(((lon + 540) % 360 - 180 - 150) / DLON)), int(round((lat - LAT0) / DLAT))] for lat, lon in ring]
                if len(pts) >= 3:
                    a = np.array(pts, np.int32).reshape(-1, 1, 2)
                    a[..., 0] = (a[..., 0] % NLON)
                    cv2.fillPoly(can, [a], 1)
    return np.roll(can.astype(bool), shift=CS, axis=1)

def antarctica_mask():
    import cv2
    w = json.loads(open('/home/user/paleoatlas/js/data/world_land.js', encoding='utf-8').read().split('=', 1)[1].strip().rstrip(';'))
    can = np.zeros((NLAT, NLON), np.uint8)
    for f in w['features']:
        g = f['geometry']
        polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        for p in polys:
            for ring in p[:1]:
                pts = [[int(round((lon - LON0) / DLON)) % NLON, int(round((lat - LAT0) / DLAT))] for lon, lat in ring]
                if len(pts) >= 3:
                    cv2.fillPoly(can, [np.array(pts, np.int32)], 1)
    m = np.zeros((NLAT, NLON), bool)
    m[:] = can.astype(bool)
    return m

# ticki lądolodu dla głębokich epok (jak envTickForBP okna pięter, uproszczone: najbliższy)
def js_obj(src, name):
    import re as _re
    m = _re.search(_re.escape(name) + r'\s*=\s*\{', src)
    i = m.end() - 1
    d, ins, esc = 0, False, False
    for k in range(i, len(src)):
        c = src[k]
        if esc: esc = False; continue
        if c == '\\': esc = True; continue
        if c == '"': ins = not ins; continue
        if ins: continue
        if c == '{': d += 1
        elif c == '}':
            d -= 1
            if d == 0: return json.loads(src[i:k + 1])
    raise RuntimeError('parse ' + name)

def load_env():
    src = open('/home/user/paleoatlas/js/data/env.js', encoding='utf-8').read()
    return js_obj(src, 'window.ENV')

def ice_for(ka, ENV):
    """Dokladnie algorytm portalowy envTickForBP (okna w[] priorytetowo, potem najblizszy tick);
       zwraca tick.q albo None (tick z 'ice' zamiast 'q' = lod z ice_sets/now -> brak nadkladki Q19)."""
    bp = ka * 1000
    ticks = ENV['ticks']
    for t in ticks:
        w = t.get('w')
        if w and w[0] <= bp <= w[1]:
            return t.get('q')
    best, bd = None, 1e18
    for t in ticks:
        d = abs(bp - t['bp'])
        if d < bd:
            bd, best = d, t
    return best.get('q')

# ---------------------------------------------------------------- główna pętla
def main():
    t0 = time.time()
    os.makedirs(OUTDIR, exist_ok=True)
    by_ds, by_t, by_lat, by_lon = load_beyer()
    kr_ds, kr_t = load_krapp()
    pg = PGEM()
    ICE = load_quat()
    ENV = load_env()
    ANT = antarctica_mask()
    metas = []
    for ka, want, _ in SNAP:
        src = src_for(ka, want)
        if src == 'beyer':
            g, real = beyer_slice(by_ds, by_t, by_lat, ka)
            srctag = 'Beyer2020 (HadCM3/BIOME4)'
        elif src == 'krapp':
            g, real = krapp_slice(kr_ds, kr_t, ka)
            srctag = 'Krapp2021 (emulator HadCM3/BIOME4)'
        else:
            V, real = pg.slices(ka)
            G = {v: pg.to_global(V[v]) for v in V}
            g = hglite(G)
            srctag = 'Barreto2023 HG-lite (PALEO-PGEM)'
        # oceany poniżej siatki PGEM/Beyera: Antarktyda -> lądolód (klasa 28) + głębokie Q19
        ice_q = ice_for(ka, ENV)
        g = np.where((g < 0) & ANT, 28, g)          # Antarktyda spoza siatki źródła (zlodowacona na całej osi)
        if ice_q and ice_q in ICE:
            qm = ice_mask(ice_q, ICE)
            g = np.where((g >= 0) & qm, 28, g)      # spójność z lądolodem portalu (envTickForBP -> q)
        g[g < 0] = 0
        save_png(g, os.path.join(OUTDIR, f'{str(real).replace(".", "p")}.png'))
        metas.append({'ka': real if abs(ka - real) < 1e-6 else [ka, real], 'src': src, 'srctag': srctag,
                      'ice': ice_q if (ice_q and ice_q in ICE) else None,
                      'file': f'{str(real).replace(".", "p")}.png'})
        print(f'{ka:>6} ka  {src:>6}  (real {real})  OK  [{time.time()-t0:.0f}s]')
    by_ds.close(); kr_ds.close()
    [d.close() for d in pg.ds.values()]

    # ---------------------------------------------------------------- pyłek BIOME 6000 v4.2
    import xlrd
    wb = xlrd.open_workbook(f'{DATA}/b6k/BIOME4-2.xls')
    sh = wb.sheet_by_name('PublicationTable')
    hdr = [sh.cell_value(0, c) for c in range(sh.ncols)]
    BIOME_ID = {v.lower(): k for k, v in {
        1:'Tropical evergreen forest',2:'Tropical semi-deciduous forest',3:'Tropical deciduous forest/woodland',
        4:'Temperate deciduous forest',5:'Temperate conifer forest',6:'Warm mixed forest',7:'Cool mixed forest',
        8:'Cool conifer forest',9:'Cold mixed forest',10:'Evergreen taiga/montane forest',11:'Deciduous taiga/montane forest',
        12:'Tropical savanna',13:'Tropical xerophytic shrubland',14:'Temperate xerophytic shrubland',
        15:'Temperate sclerophyll woodland',16:'Temperate broadleaved savanna',17:'Open conifer woodland',
        18:'Boreal parkland',19:'Tropical grassland',20:'Temperate grassland',21:'Desert',22:'Steppe tundra',
        23:'Shrub tundra',24:'Dwarf shrub tundra',25:'Prostrate shrub tundra',26:'Cushion forb lichen moss tundra',
        27:'Barren',28:'Land ice'}.items()}
    # nazwy w v4.2 mogą się różnić — rozwiązujemy przez normalizację + słownik ręczny
    MANUAL = {
        'tropical rain forest': 1, 'tropical evergreen broadleaf forest': 1, 'tropical semi-evergreen broadleaf forest': 2,
        'tropical deciduous broadleaf forest and woodland': 3, 'tropical deciduous broadleaf forest': 3,
        'warm-temperate evergreen broadleaf forest': 6, 'warm-temperate evergreen broadleaf and mixed forest': 6,
        'warm-temperate rainforest': 6, 'warm temperate rainforest': 6, 'cool evergreen needleleaf forest': 8,
        'cool-temperate rainforest': 8, 'cool-temperate evergreen needleleaf and mixed forest': 8,
        'temperate evergreen needleleaf forest': 8, 'temperate deciduous broadleaf forest': 4,
        'cold deciduous forest': 11, 'cold evergreen needleleaf forest': 10, 'temperate sclerophyll woodland and shrubland': 15,
        'temperate evergreen needleleaf open woodland': 17, 'tropical savanna': 12, 'temperate deciduous broadleaf savanna': 16,
        'tropical xerophytic shrubland': 13, 'temperate xerophytic shrubland': 14, 'tropical grassland': 19,
        'temperate grassland': 20, 'steppe': 20, 'xerophytic woods/scrub': 14, 'temperate grassland and xerophytic shrubland': 14,
        'desert': 21, 'graminoid and forb tundra': 22, 'cushion-forb tundra (cushion forb, lichen and moss tundra)': 26,
        'cushion-forb, lichen and moss tundra': 26, 'erect dwarf-shrub tundra': 23, 'low and high shrub tundra': 23,
        'prostrate dwarf-shrub tundra': 25, 'tundra': 23, 'barren': 27, 'land ice': 28, 'desert (semi-desert)': 21,
        'temperate xerophytic woods/scrub': 14, 'tropical xerophytic woods/scrub': 13,
        'wet sclerophyll forest': 6}   # SEAPAC (Pickett 2004): wysoki eukaliptus -> warm mixed forest
    def bid(name):
        if not name: return None
        n = str(name).strip().lower()
        if n in BIOME_ID: return BIOME_ID[n]
        if n in MANUAL: return MANUAL[n]
        return None
    anchors = {'0k': [], '6k': [], '18k': []}
    miss = {}
    for r in range(1, sh.nrows):
        lon = sh.cell_value(r, 3); lat = sh.cell_value(r, 4); name = str(sh.cell_value(r, 1)); dset = str(sh.cell_value(r, 2)).strip()
        if not isinstance(lon, (int, float)) or not isinstance(lat, (int, float)): continue
        for ep, col in [('0k', 8), ('6k', 9), ('18k', 10)]:
            nm = sh.cell_value(r, col)
            c = bid(nm)
            if c is None and nm: miss[str(nm)] = miss.get(str(nm), 0) + 1
            if c: anchors[ep].append([round(float(lat), 3), round(float(lon), 3), c, name, dset])
    print('PYŁEK: 0k=%d 6k=%d 18k=%d; nierozpoznane nazwy: %s' % (len(anchors['0k']), len(anchors['6k']), len(anchors['18k']), miss or 'brak'))
    with open('/home/user/paleoatlas/js/data/biome_pollen.js', 'w', encoding='utf-8') as f:
        f.write('// Stanowiska pyłkowe BIOME 6000 v4.2 (Prentice 2000; Harrison 2001; Bigelow 2003; Pickett 2004'
                ' + ref. regionalne: Marchant Ameryka Płd.; Ni Chiny; Sutra Indie; SEAPAC) — DANE pomiarowe.\n')
        f.write('// [lat, lon, klasaBIOME4, nazwa-stanowiska, zbiór]. Epoki: 0k = dziś (potencjał), 6k = środkowy holocen,\n')
        f.write('// 18k = LGM w latach ^14C (~21-22 ka kal.). Format do renderowania punktowego + walidacji.\n')
        f.write('window.BIOME_POLLEN = ')
        f.write(json.dumps(anchors, ensure_ascii=False, separators=(',', ':')))
        f.write(';\n')
        f.write('window.BIOME_POLLEN_SRC = "BIOME 6000 v4.2 (PMIP2/BRIDGE): Prentice i in. 2000; Harrison i in. 2001; '
                'Bigelow i in. 2003; Pickett i in. 2004; Marchant i in. (Am. Płd.); Ni (Chiny); Sutra (Indie). '
                'Mapowanie do klas BIOME4: portal (v4.2 -> 28 klas).";\n')
    with open('/home/user/paleoatlas/js/data/biome_meta.js', 'w', encoding='utf-8') as f:
        f.write('// Migawki biomów (tools/build_biomes.py): źródła publikowane (Beyer2020/Krapp2021/Barreto2023) + HG-lite >800 ka.\n')
        f.write('window.BIOME_META = ')
        f.write(json.dumps({'epochs': metas,
                            'palette': {str(k): '#%02x%02x%02x' % v for k, v in PAL.items()},
                            'names': {str(k): v for k, v in PL.items()},
                            'groups': GRP,
                            'ofGroup': {str(k): v for k, v in OFGRP.items()}}, ensure_ascii=False, separators=(',', ':')))
        f.write(';\n')
    print('MIGAWKI + META + PYŁEK zapisane  [%.0fs]' % (time.time() - t0))

if __name__ == '__main__':
    main()
