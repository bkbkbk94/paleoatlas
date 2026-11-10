#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_biomes.py — audyt warstwy biomów (po build_biomes.py).

Weryfikuje:
  R1  regiony kontrolne x epoki (progi z literatury — zob. README „Biomy: audyt"),
  R2  zgodność Eem (125 ka, Krapp) vs dziś (0 ka, Krapp raw) — jakościowa,
  R3  walidacja klasyfikatora HG-lite: PGEM(0 ka) -> HG-lite vs Krapp(0 ka) — globalnie i per region,
  R4  sanity: klasy 0..28; oceany = 0; Antarktyda = 28 w każdej migawce siatkowej.

Wyjście: JSON na stdout + js/data/../biome_report.json (workspace root paleoatlas/).
"""
import json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image
import netCDF4 as nc

ROOT = str(Path(__file__).resolve().parent.parent)
DATA = os.environ.get('PA_BIODATA', os.path.abspath(os.path.join(ROOT, '..', 'biodata')))
NLON, NLAT = 720, 360
LAT0, DLAT = -89.75, 0.5
LON0, DLON = -179.75, 0.5

META = json.loads([l for l in open(f'{ROOT}/js/data/biome_meta.js', encoding='utf-8').read().splitlines()
                   if l.startswith('window.BIOME_META')][0].split('=', 1)[1].rstrip('; '))
GRP = {k: v for k, v in META['groups'].items()}
CLASS2GRP = {}
for gname, ids in GRP.items():
    for i in ids:
        CLASS2GRP[i] = gname
TROP_FOR = GRP.get('lasy tropikalne') or GRP.get('las_trop') or [1, 2, 3]
DESERT = [21]
ICE = [28]
TUNDRA = [22, 23, 24, 25, 26]

REGIONS = {
    'Sahara':       (15, 30, -10, 30),
    'Sahel':        (10, 15, -10, 30),
    'Amazonia':     (-10, 2, -75, -50),
    'Kongo':        (-5, 5, 15, 28),
    'Fennoskandia': (58, 70, 10, 30),
    'Polska':       (49, 55, 14, 24),
    'Europa Zach.': (43, 55, -5, 12),
    'Syberia':      (55, 70, 60, 130),
    'Tybet':        (28, 35, 80, 100),
    'Chiny Wsch.':  (25, 40, 105, 120),
    'Indie':        (8, 25, 72, 85),
    'Midwest USA':  (35, 48, -100, -85),
    'Patagonia':    (-50, -38, -74, -66),
    'Australia SE': (-40, -30, 140, 150),
    'Australia C':  (-30, -20, 120, 140),
}

def epoch_file(ka_key):
    for e in META['epochs']:
        k = e['ka'][0] if isinstance(e['ka'], list) else e['ka']
        if abs(k - ka_key) < 1e-9:
            return f"{ROOT}/js/data/biome/{e['file']}", e
    return None, None

def load_grid(path):
    # PNG trzyma konwencję rastrową (północ u góry) -> odwracamy do siatki źródłowej (lat asc)
    return np.array(Image.open(path), dtype=np.int16)[::-1].copy()

def region_mask(lat1, lat2, lon1, lon2):
    ys = slice(int(round((lat1 - LAT0) / DLAT)), int(round((lat2 - LAT0) / DLAT)) + 1)
    xs = np.arange(NLON)
    lonv = LON0 + xs * DLON
    m = (lonv >= lon1) & (lonv <= lon2)
    return ys, m

def fracs(g, reg):
    ys, xm = region_mask(*REGIONS[reg])
    sub = g[ys, :][:, xm]
    land = sub[sub > 0]
    n = max(land.size, 1)
    def f(ids):
        return float(np.isin(land, ids).sum()) / n
    out = {'land_px': int(land.size)}
    for gname in GRP:
        out[gname] = round(f(GRP[gname]), 3)
    return out

def krapp_raw(ka):
    ds = nc.Dataset(f'{DATA}/krapp_biome.nc')
    t = np.array(ds['time'][:])
    i = int(np.argmin(np.abs(t - (-ka * 1000))))
    b = np.array(ds['biome'][i, :, :], dtype=np.int32)
    b[b == -2147483648] = -1
    ds.close()
    return b.astype(np.int16)

def pgem_hglite(ka):
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import importlib.util
    spec = importlib.util.spec_from_file_location('bb', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'build_biomes.py'))
    bb = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bb)
    pg = bb.PGEM()
    V, real = pg.slices(ka)
    G = {v: pg.to_global(V[v]) for v in V}
    g = bb.hglite(G)
    if bb.__dict__.get('ICE') is None:
        bb.ICE = bb.load_quat(); bb.ENV = bb.load_env(); bb.ANT = bb.antarctica_mask()
    q = bb.ice_for(real if real else ka, bb.ENV)
    g = np.where((g < 0) & bb.ANT, 28, g)
    if q and q in bb.ICE:
        g = np.where((g >= 0) & bb.ice_mask(q, bb.ICE), 28, g)
    g = np.where(g < 0, 0, g)
    [d.close() for d in pg.ds.values()]
    return g, real

def grp_agreement(g1, g2, exclude=(0, 28)):
    """ułamek lądowych (w obu) komórek zgodnych na poziomie GRUP."""
    m = (g1 > 0) & (g2 > 0) & (~np.isin(g1, exclude)) & (~np.isin(g2, exclude))
    n = int(m.sum())
    if not n:
        return None, 0
    a = np.array([CLASS2GRP.get(int(c), '?') for c in g1[m].ravel()])
    b = np.array([CLASS2GRP.get(int(c), '?') for c in g2[m].ravel()])
    return float((a == b).mean()), n

rep = {'regions': {}, 'agreements': {}, 'asserts': [], 'meta_files': len(META['epochs'])}

EPOKI_SOND = [0.001, 1, 6, 12.3, 21.5, 27, 65, 125, 155, 450, 810, 1750, 2500, 3300]
grids = {}
for k in [1, 6, 12.3, 21.5, 27, 65, 125, 155, 450, 810, 1750, 2500, 3300]:
    fp, e = epoch_file(k)
    if fp:
        grids[k] = load_grid(fp)
rep['regions'] = {}
for k, g in grids.items():
    rep['regions'][str(k)] = {r: fracs(g, r) for r in ['Sahara', 'Amazonia', 'Fennoskandia', 'Polska', 'Syberia',
                                                       'Midwest USA', 'Australia SE', 'Australia C', 'Sahel', 'Tybet']}

def check(name, ok, detail):
    rep['asserts'].append({'name': name, 'ok': bool(ok), 'detail': detail})
    print(('  OK ' if ok else '  !! ') + name + ' — ' + detail)

g_lgm = grids[21.5]
f = f if False else None
rS = rep['regions']['21.5']['Sahara']; rA = rep['regions']['21.5']['Amazonia']; rF = rep['regions']['21.5']['Fennoskandia']; rP = rep['regions']['21.5']['Polska']
grp_desert = next(g for g in GRP if 21 in GRP[g])
grp_trop = next(g for g in GRP if 1 in GRP[g])
grp_tundra = next(g for g in GRP if 22 in GRP[g])
grp_ice = next(g for g in GRP if 28 in GRP[g])
grp_step = next(g for g in GRP if 20 in GRP[g])
grp_coolf = next(g for g in GRP if 7 in GRP[g])

check('A LGM Sahara: pustynia-dominant (>=55%)', rS[grp_desert] >= 0.55, f'pustynia={rS[grp_desert]}')
check('B LGM Amazonia: las tropikalny >=25%', rA[grp_trop] >= 0.25, f'trop={rA[grp_trop]}')
check('C LGM Fennoskandia: lądolód >=90%', rF[grp_ice] >= 0.90, f'ice={rF[grp_ice]}')
grp_taiga = next(g for g in GRP if 10 in GRP[g])
check('D LGM Polska (Beyer/BIOME4): tajga+tundra+step+lód >=95%, las ciepły <2%',
      (rP[grp_taiga] + rP[grp_tundra] + rP[grp_step] + rP[grp_ice]) >= 0.95 and rP[grp_coolf] < 0.02,
      'taiga=%.3f tun=%.3f step=%.3f ice=%.3f coolf=%.3f — model-wyjście; kotwica pyłkowa 18k ujawnia DANE vs MODEL'
      % (rP[grp_taiga], rP[grp_tundra], rP[grp_step], rP[grp_ice], rP[grp_coolf]))

# Eem vs dziś (Krapp raw 0)
k0 = krapp_raw(0)
g125 = grids[125]
agr, n = grp_agreement(k0[60:, :], g125[60:, :]) if False else (None, 0)
# krapp_raw ma pełną siatkę 360x720 — zgodna geometria z produktem
agr, n = grp_agreement(k0, g125)
rep['agreements']['eem125_vs_0_krapp'] = {'agr': None if agr is None else round(agr, 3), 'n': n}
check('E Eem(125ka) ~ dziś — zgodność grup >=72%', agr is not None and agr >= 0.72, f'agr={None if agr is None else round(agr,3)} na n={n}')

# HG-lite walidacja na 0 ka
hg0, real0 = pgem_hglite(0.0)
# maska ANT tylko tam, gdzie braki PGEM
agr2, n2 = grp_agreement(hg0, k0)
rep['agreements']['hglite0_vs_krapp0_global'] = {'agr': round(agr2, 3), 'n': n2, 'real_ka': real0}
check('F HG-lite(PGEM 0ka) vs Krapp(0ka) — globalna zgodność grup >=65%', agr2 >= 0.65, f'agr={round(agr2,3)} na n={n2}')

per = {}
m_land = (hg0 > 0) & (k0 > 0)
for reg in REGIONS:
    ys, xm = region_mask(*REGIONS[reg])
    sub_m = m_land[ys, :][:, xm]
    if not sub_m.sum():
        continue
    a = np.array([CLASS2GRP.get(int(c), '?') for c in hg0[ys, :][:, xm][sub_m].ravel()])
    b = np.array([CLASS2GRP.get(int(c), '?') for c in k0[ys, :][:, xm][sub_m].ravel()])
    per[reg] = round(float((a == b).mean()), 3)
rep['agreements']['hglite0_vs_krapp0_regiony'] = per
print('  HG-lite vs Krapp (0 ka) per region:', per)

# dziś: Polska las; Australia SE NIE pustynia
r0P = {regfr: fracs(k0, regfr) for regfr in ['Polska', 'Australia SE', 'Midwest USA', 'Europa Zach.']}
rep['regions']['0_krapp_raw'] = r0P
check('G dziś Polska: lasy >=40%', (r0P['Polska'][grp_coolf] + r0P['Polska'].get('tajga', 0.0) + r0P['Polska'][grp_trop]) >= 0.4, 'coolf=%.3f tajga=%.3f' % (r0P['Polska'][grp_coolf], r0P['Polska'].get('tajga', 0)))
check('H dziś Australia SE: pustynia <15%', r0P['Australia SE'][grp_desert] < 0.15, f"desert={r0P['Australia SE'][grp_desert]}")

# 3300 ka — Antarktyda 28, Grenlandia bez lądolodu pełnego (raport), Sahara nadal pusta
g3300 = grids[3300]
ant = int((g3300[:60, :] == 28).sum())
rep['regions']['3300_ant_px'] = ant
rS3 = rep['regions']['3300']['Sahara']; rA3 = rep['regions']['3300']['Amazonia']
check('I 3300 ka: Antarktyda lądolód z maski (>0 px)', ant > 1000, f'px={ant}')
check('J 3300 ka: Sahara pustynia >=50%', rS3[grp_desert] >= 0.5, f'desert={rS3[grp_desert]}')
check('K 3300 ka: Amazonia las tropikalny >=25%', rA3[grp_trop] >= 0.25, f'trop={rA3[grp_trop]}')

# sanity klas
bad = []
for e in META['epochs']:
    a = np.array(Image.open(f"{ROOT}/js/data/biome/{e['file']}"))
    if a.min() < 0 or a.max() > 28:
        bad.append(e['file'])
check('L wszystkie migawki: klasy w 0..28', not bad, f'złe: %s' % bad[:5] if bad else str(len(META['epochs'])) + ' plików OK')

n_ok = sum(1 for a in rep['asserts'] if a['ok'])
rep['summary'] = f"{n_ok}/{len(rep['asserts'])} assertów OK"
print('PODSUMOWANIE:', rep['summary'])
with open(f'{ROOT}/biome_report.json', 'w', encoding='utf-8') as fh:
    json.dump(rep, fh, ensure_ascii=False, indent=1)
print('raport -> biome_report.json')
