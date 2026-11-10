#!/usr/bin/env python3
# Z /tmp/ice6g.json (z build_ice_ice6g.py) pisze js/data/ice_ice6g.js
import json, os
from pathlib import Path
ROOT = str(Path(__file__).resolve().parent.parent)

d = json.load(open('/tmp/ice6g.json'))
rings, rings_globe = d['rings'], d['rings_globe']
rings_gren = d.get('rings_gren', {})
names = {'a26ka':'26 ka','a21ka':'21 ka','a17_5ka':'17,5 ka','a15ka':'15 ka',
         'a13_5ka':'13,5 ka','a12ka':'12 ka','a10_5ka':'10,5 ka','a0ka':'0 ka'}
out = {}
for k, rs in rings.items():
    entry = {'name': 'Antarktyda — pokrywa lodowa %s (ICE-6G_C, maska ≥50%%)' % names[k],
             'src': 'ICE6G', 'rings': rs}
    if rings_globe.get(k):
        entry['rings_globe'] = rings_globe[k]
    out[k] = [entry]
out_g = {}
for k, rs in rings_gren.items():
    gname = {'g26ka':'26 ka','g21ka':'21 ka','g17_5ka':'17,5 ka','g15ka':'15 ka',
             'g13_5ka':'13,5 ka','g12ka':'12 ka','g10_5ka':'10,5 ka','g0ka':'0 ka'}[k]
    out_g[k] = [{'name': 'Grenlandia — przekrój %s (ICE-6G_C, maska ≥50%%)' % gname,
                 'src': 'ICE6G', 'rings': rs}]
# Islandia: tylko przekroje fazy deglacjacji, w których maska modelu coś zmienia
# (26–17,5 ka = statyczny blok pełny → zostaje schemat portalu; 0 ka = modelowo bez
# lodu → współczesne czapy z inwentarzu RGI 7.0, plik ice_rgi_isl.js)
rings_isl = d.get('rings_isl', {})
out_i = {}
INAME = {'i15ka':'15 ka','i13_5ka':'13,5 ka','i12ka':'12 ka','i10_5ka':'10,5 ka'}
for k in INAME:
    rs = rings_isl.get(k) or []
    if not rs:
        continue
    out_i[k] = [{'name': 'Islandia — lądolód islandzki (IIS) — przekrój %s (ICE-6G_C, maska ≥50%%)' % INAME[k],
                 'src': 'ICE6G', 'rings': rs}]

hdr = """// ICE-6G_C (VM5a) — pokrywa lodowa Antarktydy, przekroje 26→0 ka (siatka 1°, sftgif ≥50%).
// Argus D.F., Peltier W.R., Drummond R., Moore A.W. 2014, „The Antarctica component of
// postglacial rebound model ICE-6G_C (VM5a) based upon GPS positioning, exposure age dating
// of ice thicknesses, and relative sea level histories”, Geophys. J. Int. 198(1):537-563,
// doi:10.1093/gji/ggu140; Peltier W.R., Argus D.F., Drummond R. 2015, „Space geodesy
// constrains ice-age terminal deglaciation: The global ICE-6G_C (VM5a) model”,
// J. Geophys. Res. Solid Earth 120:450-487, doi:10.1002/2014JB011176.
// Pliki: https://www.atmosp.physics.utoronto.ca/~peltier/datasets/Ice6G_C_VM5a/
// Por. rekonstrukcja empiryczna RAISED: Bentley M.J. i in. (The RAISED Consortium) 2014,
// QSR 100:1-9, doi:10.1016/j.quascirev.2014.06.025.
// Wygenerowano przez tools/build_ice_ice6g.py + tools/write_ice_ice6g_js.py.
// rings: ringi DOMKNIĘTE w (lat, lon), rozcięte po antymeridianie (±180°), lat >= -84.9
// (granica Mercatora) — dla mapy Leaflet. rings_globe: jeden pierścień w lon 0..360 —
// dla d3-geo (brak szwu przez półprzezroczysty wypełniacz). Podmienia schematowy pierścień
// Antarktydy w PALEO.ice_sets dla faz deglacjacji i „dziś”.
"""
hdr += "window.ICE6G_SRC = \"DANE — model GIA ICE-6G_C (VM5a): Argus, Peltier, Drummond & Moore 2014, Geophys. J. Int. 198:537-563, doi:10.1093/gji/ggu140; Peltier, Argus & Drummond 2015, JGR Solid Earth 120:450-487, doi:10.1002/2014JB011176 (maska 1°, sftgif ≥50%). Por. rekonstrukcja empiryczna RAISED (Bentley i in. 2014, QSR 100:1-9).\";\n"
s = hdr + "window.ICE_ICE6G = " + json.dumps(out, ensure_ascii=False) + ";\n"
s += "window.ICE_ICE6G_GR = " + json.dumps(out_g, ensure_ascii=False) + ";\n"
s += "window.ICE_ICE6G_IS = " + json.dumps(out_i, ensure_ascii=False) + ";\n"
s += """(function(){
const MAP = {"przedmaksymalny":"a26ka","lgm":"a21ka","poznanska":"a17_5ka","pomorska":"a15ka","bolling_allerod":"a13_5ka","younger_dryas":"a12ka","early_holocene":"a10_5ka","now":"a0ka"};
const NOTE = {"przedmaksymalny":"przekrój 26 ka: czapa w maksimum, ugruntowanie przy krawędzi szelfu; wg syntezy RAISED większość sektorów utrzymuje maksimum do ~18 ka",
"lgm":"przekrój 21 ka; powierzchnia maski modelu ~15,2 mln km² (dziś ~14,2); lądolód sięga krawędzi szelfu wokół prawie całego kontynentu",
"poznanska":"przekrój 17,5 ka: w ICE-6G_C (siatka 1°) maska jeszcze jak w LGM; wg RAISED pierwsza cofka linii ugruntowania — lokalnie już ~18 ka",
"pomorska":"przekrój 15 ka: maska modelowa nadal maksymalna; wg RAISED deglacjacja sektorów morskich (Ross, Weddell) już ruszyła",
"bolling_allerod":"przekrój 13,5 ka: początek redukcji maski w modelu, zgodnie z empirycznym początkiem cofki (MWP-1A ~14,6 ka)",
"younger_dryas":"przekrój 12 ka: cofka trwa; w rdzeniach lodowych Antarktydy to epoka Antarctic Cold Reversal (14,5-12,7 ka)",
"early_holocene":"przekrój 10,5 ka: główna faza cofki ugruntowania na szelfach Morza Rossa i Weddella",
"now":"przekrój 0 ka; współczesna powierzchnia rzeczywista ~13,6-14,0 mln km² łącznie z szelfami lodowymi (ugruntowana ~12,3 mln km²)"};
const DROP = /Antarktyd/;
Object.keys(MAP).forEach(k => {
  if (!window.PALEO || !window.PALEO.ice_sets[k]) return;
  const kept = window.PALEO.ice_sets[k].filter(p => !(p.src === undefined && DROP.test(p.name)));
  const items = window.ICE_ICE6G[MAP[k]] || [];
  window.PALEO.ice_sets[k] = kept.concat(items.map(it => ({ name: it.name + ' — ' + (NOTE[k] || ''), src: it.src, rings: it.rings, rings_globe: it.rings_globe })));
});
/* Grenlandia: te same przekroje ICE-6G_C — podmienia sztywny pierścień schematu (poza zasięgiem NADI-1) */
const MAPG = {"przedmaksymalny":"g26ka","lgm":"g21ka","poznanska":"g17_5ka","pomorska":"g15ka","bolling_allerod":"g13_5ka","younger_dryas":"g12ka","early_holocene":"g10_5ka","now":"g0ka"};
const NOTEG = {"przedmaksymalny":"przekrój 26 ka: czapa wykracza na szelf (por. Lecavalier i in. 2014, PNAS 111:17701 — maksimum od ~27 ka)",
"lgm":"przekrój 21 ka: czapa na krawędzi szelfu, ~2,5 mln km² (dziś ~1,74; rzeczywista ~1,71); w masce 1° cofka marginesów schodzi się niemal w całości w holocenie (por. Lecavalier i in. 2014, PNAS 111:17701)",
"poznanska":"przekrój 17,5 ka: cofka płd. krańców już w toku",
"pomorska":"przekrój 15 ka: szybka cofka podczas MWP-1A",
"bolling_allerod":"przekrój 13,5 ka",
"younger_dryas":"przekrój 12 ka: readvance młododryasowy mały (±lokalny)",
"early_holocene":"przekrój 10,5 ka",
"now":"przekrój 0 ka — zbliżony do współczesnego zasięgu (~1,7 mln km²)"};
const DROPG = /^Grenlandia/;
Object.keys(MAPG).forEach(k => {
  if (!window.PALEO || !window.PALEO.ice_sets[k]) return;
  const kept = window.PALEO.ice_sets[k].filter(p => !(p.src === undefined && DROPG.test(p.name)));
  const items = (window.ICE_ICE6G_GR || {})[MAPG[k]] || [];
  window.PALEO.ice_sets[k] = kept.concat(items.map(it => ({ name: it.name + ' — ' + (NOTEG[k] || ''), src: it.src, rings: it.rings })));
});
/* Islandia (IIS): maska 1° modelu jest statyczna 26→13,5 ka (brak regresji wejścia morskiego
   w tej siatce), pierwsza cofka dopiero 12 ka; do 0 ka stgit = 0 (brak czap).
   Splajsujemy więc tylko pomorską/B–A/MD/wcz. holocen; LGM i fazy starsze zostają
   schematem portalu (brak otwartych danych etapowych empirycznych); „dziś” = RGI 7.0
   (plik ice_rgi_isl.js). Punkty-walidacja: IcelandICE DB (Goffin i in. 2026,
   Zenodo doi:10.5281/zenodo.19453940) — 37 wiążących wieków zasięgu/grubości. */
const MAPIS = {"pomorska":"i15ka","bolling_allerod":"i13_5ka","younger_dryas":"i12ka","early_holocene":"i10_5ka"};
const NOTIS = {"pomorska":"przekrój 15 ka: maska modelowa jeszcze pełna (empirycznie: IIS do krawędzi szelfu; zapaść marginesów rusza ~15 ka — Norðdahl & Pétursson 2005; Benediktsson i in. 2022)",
"bolling_allerod":"przekrój 13,5 ka: w modelu maska nadal maksymalna — wg datowań deglacjacja nizin Islandii w toku (siatka 1° nie oddaje zapaści morskiej)",
"younger_dryas":"przekrój 12 ka: pierwszy krok cofki w tej siatce; sygnaturowy readvance fiordów północnych (mł. dryas) poniżej rozdzielczości modelu",
"early_holocene":"przekrój 10,5 ka: czapy śródlądowe — wg datowań główna deglacjacja kończy się ~10 ka; współczesne czapy (Vatnajökull i in.) w portalu z inwentarzu RGI 7.0 (stan ≈ rok 2000)"};
const DROPIS = /^Islandia/;
Object.keys(MAPIS).forEach(k => {
  if (!window.PALEO || !window.PALEO.ice_sets[k]) return;
  const kept = window.PALEO.ice_sets[k].filter(p => !(p.src === undefined && DROPIS.test(p.name)));
  const items = (window.ICE_ICE6G_IS || {})[MAPIS[k]] || [];
  window.PALEO.ice_sets[k] = kept.concat(items.map(it => ({ name: it.name + ' — ' + (NOTIS[k] || ''), src: it.src, rings: it.rings })));
});
})();
"""
open(ROOT + '/js/data/ice_ice6g.js', 'w').write(s)
print('bytes', os.path.getsize(ROOT + '/js/data/ice_ice6g.js'))
