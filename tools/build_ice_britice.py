#!/usr/bin/env python3
# Buduje js/data/ice_britice.js — zarysy lądolodu brytyjsko-irlandzkiego (BIIS)
# z rekonstrukcji EMPIRYCZNEJ BRITICE-CHRONO (3 WARIANTY niepewności datowań: MINIMUM /
# OPTIMUM / MAKSIMUM; izochrony co 1 ka, 31→15 ka):
#   Clark C.D., Ely J.C., Fabel D., Bradley S.L. 2022: BRITICE-CHRONO maps and GIS data
#   of the last British-Irish Ice Sheet 31 to 15 ka. PANGAEA, doi:10.1594/PANGAEA.945729.
#   Artykuł: Clark C.D. i in. 2022, „Growth and retreat of the last British–Irish Ice Sheet,
#   31 000 to 15 000 years ago: the BRITICE-CHRONO reconstruction”, Boreas 51(4):699-758,
#   doi:10.1111/bor.12594.
# Wejście: /tmp/britice/emp/Data S3 BRITICE CHRONO empirical reconstruction GIS data/
#   Optimum/*_opt*.shp  (CRS: North Pole LAEA — ESRI:102016)
#   min/*_small.shp      (CRS: British National Grid — EPSG:27700 — uwaga, inny niż optimum!)
#   max/*_max.shp        (CRS: British National Grid — EPSG:27700)
# Uwaga: poligony optimum ZAWIERAJĄ także kontekstową FIS/BKIS — tnę do sektora BIIS
# (lon ∈ [-13, 11.4], lat ∈ [48, 61.4]; M. Północne zostaje — tam BIIS zespolony z FIS;
#  północ Shetland 61.4° = granica, dalej już kontekst FIS). min/max = czysty BIIS.
# Emisja: window.ICE_BRITICE_VARIANTS {min,opt,max} × 4 przekroje (27/21/18/15 ka),
# ringi DOMKNIĘTE w (lat, lon), src 'BRITICE-CHRONO'; funkcja window.BRITICE_SET_VARIANT(v)
# podmienia wpisy w PALEO.ice_sets w locie (przełącznik UI „🧊 BIIS”); start = OPTIMUM.
# Fazy: przedmaksymalny←27 ka, lgm←21 ka, poznanska←18 ka, pomorska←15 ka;
# bolling_allerod: bez lodu w GB (schemat szczątków usuwany).
import glob, math, os, json
import shapefile
from pyproj import Transformer
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

ROOT = '/tmp/britice/emp/Data S3 BRITICE CHRONO empirical reconstruction GIS data'
OUT = ROOT + '/js/data/ice_britice.js'
CLIP = box(-13.0, 48.0, 11.4, 61.4)
TOL = 0.06          # tolerancja upraszczania (stopnie)
MINA = 0.008        # min. powierzchnia części (deg²)

VARIANTS = [  # (klucz, podkatalog, wzorzec pliku, CRS, etykieta PL)
    ('min', 'min', 'ka_small', 'EPSG:27700', 'MINIMUM'),
    ('opt', 'Optimum', 'ka_opt', 'ESRI:102016', 'OPTIMUM'),
    ('max', 'max', 'ka_max', 'EPSG:27700', 'MAKSIMUM'),
]
SLICES = {'27': 'b27ka', '21': 'b21ka', '18': 'b18ka', '15': 'b15ka'}


def load_parts(path, tr):
    """Czyta shapefile → (ringi zewnętrzne (lat, lon) WGS84, powierzchnia km²) — tylko sektor BIIS."""
    r = shapefile.Reader(path)
    polys = []
    for i in range(len(r)):
        try:
            shp = r.shape(i)
        except Exception:
            continue
        if not shp.points:
            continue
        pts = shp.points
        parts = list(shp.parts) + [len(pts)]
        for a, b in zip(parts, parts[1:]):
            ring = pts[a:b]
            wgs = [tr.transform(x, y) for x, y in ring]
            polys.append(Polygon([(lo, la) for lo, la in wgs]))
    u = unary_union([p.buffer(0) for p in polys])
    if not u.is_valid:
        u = u.buffer(0)
    if u.is_empty:
        return [], 0.0
    u = u.intersection(CLIP)
    geoms = [u] if u.geom_type == 'Polygon' else list(getattr(u, 'geoms', []))
    out_rings, area_km2 = [], 0.0
    for g in geoms:
        if g.geom_type != 'Polygon':
            continue
        s = g.simplify(TOL, preserve_topology=True)
        if s.area < MINA:
            continue
        ring = [[round(y, 3), round(x, 3)] for x, y in s.exterior.coords]
        dd = [ring[0]]
        for q in ring[1:]:
            if q != dd[-1]:
                dd.append(q)
        if dd[0] != dd[-1]:
            dd.append(dd[0])
        if len(dd) >= 4:
            out_rings.append(dd)
            area_km2 += geod_area(dd)
    out_rings.sort(key=lambda r: -geod_area(r))
    return out_rings, area_km2


def geod_area(ring):
    """Powierzchnia geodezyjna ringu (lat,lon) w km² (sfera)."""
    lat0 = sum(p[0] for p in ring) / len(ring)
    kx = 111.32 * math.cos(math.radians(lat0))
    ky = 111.32
    a = 0.0
    for (la1, lo1), (la2, lo2) in zip(ring, ring[1:]):
        a += (lo1 * kx) * (la2 * ky) - (lo2 * kx) * (la1 * ky)
    return abs(a) / 2.0


def main():
    data = {}
    for vkey, sub, pat, crs, vlab in VARIANTS:
        tr = Transformer.from_crs(crs, 'EPSG:4326', always_xy=True)
        data[vkey] = {}
        for ka, key in sorted(SLICES.items()):
            hits = [h for h in glob.glob(os.path.join(ROOT, sub, f'{ka}*{pat}*.shp'))]
            if not hits:  # np. 15ka_optimum.shp (forma bez „opt_S2”)
                hits = glob.glob(os.path.join(ROOT, sub, f'{ka}*ka*.shp'))
            assert len(hits) >= 1, f'{vkey} {ka} ka: {hits}'
            rings, A = load_parts(hits[0], tr)
            assert rings, f'{vkey} {ka} ka: pusto po obróbce'
            data[vkey][key] = [{
                'name': f'Wyspy Brytyjskie — lądolód brytyjsko-irlandzki (BIIS) — BRITICE-CHRONO {vlab} {ka} ka (~{A / 1000:,.0f} tys. km² w sektorze BIIS)'.replace(',', ' '),
                'src': 'BRITICE-CHRONO', 'rings': rings}]
            print(f'{vkey} {ka}ka: {len(rings)} czesci, ~{A:,.0f} km2 -> {key}'.replace(',', ' '))

    head = '''// BRITICE-CHRONO: empiryczna rekonstrukcja lądolodu brytyjsko-irlandzkiego (BIIS) 31→15 ka
// co 1 ka — TRZY WARIANTY niepewności (MINIMUM / OPTIMUM / MAKSIMUM): Clark C.D., Ely J.C.,
// Fabel D., Bradley S.L. 2022, „BRITICE-CHRONO maps and GIS data of the last British-Irish
// Ice Sheet 31 to 15 ka”, PANGAEA doi:10.1594/PANGAEA.945729 (CC-BY-4.0); artykuł: Clark i in.
// 2022, Boreas 51(4):699-758, doi:10.1111/bor.12594. Wygenerowano przez tools/build_ice_britice.py.
// CRS źródeł: optimum = North Pole LAEA (ESRI:102016), min/max = British National Grid
// (EPSG:27700). Poligony optimum zawierają kontekst FIS/BKIS — tu wycięto sektor BIIS
// (lon [-13, 11.4], lat [48, 61.4]); Fennoskandia w portalu rysowana z DATED-1/NADI-1.
// Optimum (domyślne) podmienia schematyczne GBR_MAX/GBR_NORTH; przełącznik UI „🧊 BIIS”
// (karta fazy) woła BRITICE_SET_VARIANT — podmiana wpisów w PALEO.ice_sets w locie.

'''
    splice = '''
(function(){
window.ICE_BRITICE_VARIANTS = %s;
window.ICE_BRITICE = window.ICE_BRITICE_VARIANTS.opt;   // stały alias do przekrojów OPTIMUM
const MAPB = { "przedmaksymalny": "b27ka", "lgm": "b21ka", "poznanska": "b18ka", "pomorska": "b15ka" };
const NOTEB = {
  "przedmaksymalny": "przekrój 27 ka: główne maksimum BIIS ~27 ka (wg Clark i in. 2022; zespolenie z FIS przez M. Północne od ~28 ka)",
  "lgm": "przekrój 21 ka: po fazie maksymalnej („North Sea lobe” załamany ~22 ka; Syme Gap otwarty)",
  "poznanska": "przekrój 18 ka: szybka cofka o charakterze pulsacyjnym (Irlandia i pd. Wyspy właśnie bez lodu po impulsie 21–18 ka)",
  "pomorska": "przekrój 15 ka: ostatnia izochrona zbioru — wyspy niemal bez lodu (szczątki w centralnej Szkocji); całkowita deglacjacja do ~14 ka"
};
const DROPB = /^(Wyspy Brytyjskie|Szkocja)/;
const VLABEL = { min: "MINIMUM", opt: "OPTIMUM", max: "MAKSIMUM" };
const VDESC = {
  min: "najniższy zasięg zgodny z datowaniami (pliki „*_small” w Data S3)",
  opt: "rekonstrukcja preferowana autorów",
  max: "najwyższy zasięg zgodny z datowaniami"
};
window.BRITICE_SET_VARIANT = function (v) {
  if (!window.ICE_BRITICE_VARIANTS[v]) v = 'opt';
  window.BRITICE_VARIANT = v;
  Object.keys(MAPB).forEach(k => {
    if (!window.PALEO || !window.PALEO.ice_sets[k]) return;
    const kept = window.PALEO.ice_sets[k].filter(p => p.src !== 'BRITICE-CHRONO' && !(p.src === undefined && DROPB.test(p.name)));
    const items = window.ICE_BRITICE_VARIANTS[v][MAPB[k]] || [];
    window.PALEO.ice_sets[k] = kept.concat(items.map(it => ({ name: it.name + ' — ' + (NOTEB[k] || ''), src: it.src, rings: it.rings })));
  });
  window.BRITICE_SRC = "DANE — rekonstrukcja empiryczna BRITICE-CHRONO (izochrony co 1 ka, 31→15 ka): Clark C.D., Ely J.C., Fabel D., Bradley S.L. 2022, PANGAEA doi:10.1594/PANGAEA.945729; Clark i in. 2022, Boreas 51(4):699-758, doi:10.1111/bor.12594. Aktualny wariant: " + VLABEL[v] + " — " + VDESC[v] + " (przełącznik: przycisk „🧊 BIIS” na karcie fazy; domyślnie OPTIMUM). Sektor BIIS wycięty z publikowanej rekonstrukcji — Fennoskandia rysowana z DATED-1/NADI-1.";
};
/* start: usuń schematyczne zarysy Wysp (4 fazy + boling–allerod — wg BRITICE-CHRONO GB bez lodu od ~15–14 ka), zastosuj OPTIMUM */
['przedmaksymalny', 'lgm', 'poznanska', 'pomorska', 'bolling_allerod'].forEach(k => {
  if (!window.PALEO || !window.PALEO.ice_sets[k]) return;
  window.PALEO.ice_sets[k] = window.PALEO.ice_sets[k].filter(p => !(p.src === undefined && DROPB.test(p.name)));
});
window.BRITICE_SET_VARIANT('opt');
})();
''' % (json.dumps(data, ensure_ascii=True, separators=(',', ':')))
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(head + splice[1:])
    print('zapisano', OUT, os.path.getsize(OUT), 'B')


if __name__ == '__main__':
    main()
