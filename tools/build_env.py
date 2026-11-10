#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_env.py — generuje js/data/env.js: GLOBALNA chronologia środowiskowa
(lądolody + poziom morza), niezależna od faz archeologicznych.

Warstwa lądolodu:
  • 0–27 ka   — zestawy portalu (DATED-1 + linie PL z danych portalu + reszta świata: schemat);
  • ≥30 ka    — ICE_QUAT (Batchelor i in. 2019, Nat. Commun. 10:3713, OSF osf.io/7jen3,
                „best estimate"), z marginesami PL z danych portalu tam, gdzie splice się powiódł;
  • interglacjały — stan bazowy: Grenlandia + Antarktyda + lodowce górskie (jak dziś).
Wybór: (1) jeśli BP wpada w OKNO piętra (klucz 'w' — granice MIS wg Railsback i in. 2015 / LR04)
  — ten przekrój; (2) w przeciwnym razie NAJBLIŻSZY przekrój (etykieta w UI pokazuje Δ wieku).

Poziom morza: krzywa eustatyczna portalu — punkty kotwiczne wg sprawdzonej literatury
(skala: uproszczenie; źródła poniżej), interpolacja liniowa w app.js.
"""
import json, os

OUT = '/home/user/paleoatlas/js/data/env.js'

# {bp_lat, ice|q, label} — ice: klucz PALEO.ice_sets; q: klucz window.ICE_QUAT
TICKS = [
  # --- holocen / deglacjacja (zestawy portalu, DATED-1 w tle) ---
  (0,      {'ice': 'now',             'label': 'współczesność (Grenlandia, Antarktyda, lodowce górskie)'}),
  (10500,  {'ice': 'early_holocene',  'label': 'wczesny holocen — szczątki lądolodów (DATED-1, ~10,5 ka; zanik 9,5–8,2 ka)'}),
  (12300,  {'ice': 'younger_dryas',   'label': 'młodszy dryas — readvance (Salpausselkä, Loch Lomond; DATED-1 12 ka)'}),
  (13600,  {'ice': 'bolling_allerod', 'label': 'Bølling–Allerød — cofka; lob gardzieński wg linii portalu; DATED-1 14 ka'}),
  (15000,  {'ice': 'pomorska',        'label': 'faza pomorska (DATED-1 15–17 ka; margines PL = linia portalu)'}),
  (17500,  {'ice': 'poznanska',       'label': 'faza poznańska (DATED-1 18 ka; margines PL = linia portalu)'}),
  (21500,  {'ice': 'lgm',             'label': 'LGM / faza leszczyńska (DATED-1 21 ka; margines PL = linia portalu)'}),
  (27000,  {'ice': 'przedmaksymalny', 'label': 'nasuwanie ku LGM (DATED-1 27 ka)'}),
  # --- Batchelor 2019 (globalna półkula płn.) ---
  (30000,  {'q': 'q_30ka',   'label': '~30 ka — Batchelor i in. 2019 (best estimate)'}),
  (35000,  {'q': 'q_35ka',   'label': '~35 ka — Batchelor i in. 2019 (MIS 3, best estimate)'}),
  (40000,  {'q': 'q_40ka',   'label': '~40 ka — Batchelor i in. 2019 (MIS 3, best estimate)'}),
  (45000,  {'q': 'q_45ka',   'label': '~45 ka — Batchelor i in. 2019 (MIS 3, best estimate)'}),
  (65000,  {'q': 'q_mis4',   'label': 'MIS 4 (71–57 ka) — Batchelor i in. 2019 (best estimate)'}),
  (82000,  {'q': 'q_mis5a',  'label': 'MIS 5a (~82 ka) — Batchelor i in. 2019'}),
  (90000,  {'q': 'q_mis5b',  'label': 'MIS 5b (~90 ka) — Batchelor i in. 2019'}),
  (103000, {'q': 'q_mis5c',  'label': 'MIS 5c (~103 ka) — Batchelor i in. 2019'}),
  (112000, {'q': 'q_mis5d',  'label': 'MIS 5d (109–118 ka) — Batchelor i in. 2019'}),
  (125000, {'ice': 'now',    'label': 'interglacjał eemski (MIS 5e, ~125 ka) — stan międzylodowcowy jak dziś'}),
  (155000, {'q': 'q_mis6',   'label': 'MIS 6 / stadiał Warty wg portalu — Batchelor i in. 2019; margines PL = linia portalu'}),
  (215000, {'ice': 'now',    'label': 'MIS 7e (~215 ka) — słaby interglacjał, stan jak dziś'}),
  (280000, {'q': 'q_mis8',   'label': 'MIS 8 / stadiał Odry wg portalu — Batchelor i in. 2019 + margines Odry wg danych portalu (rozbieżność korelacji: Batchelor MIS 8 nie sięga PL)'}),
  (320000, {'ice': 'now',    'label': 'MIS 9 (~320 ka) — interglacjał, stan jak dziś'}),
  (350000, {'q': 'q_mis10',  'label': 'MIS 10 (374–337 ka) — Batchelor i in. 2019'}),
  (400000, {'ice': 'now',    'label': 'MIS 11 (~400 ka) — długi interglacjał, stan jak dziś'}),
  (450000, {'q': 'q_mis12',  'label': 'MIS 12 / Sanu II — MAKSIMUM plejstoceńskie w PL — Batchelor i in. 2019; margines PL = linia portalu'}),
  (500000, {'ice': 'now',    'label': 'MIS 13 (~500 ka) — interglacjał, stan jak dziś'}),
  (600000, {'ice': 'now',    'label': 'MIS 15 (~600 ka) — interglacjał, stan jak dziś'}),
  (650000, {'w': [621000, 676000], 'q': 'q_mis16',  'label': 'MIS 16 / zlodowacenie Nidy (676–621 ka) — Batchelor i in. 2019'}),
  (700000, {'w': [676000, 712000], 'ice': 'now',    'label': 'MIS 17 (~700 ka) — interglacjał, stan jak dziś'}),
  (730000, {'w': [712000, 745000], 'q': 'q_mis20_24','label': 'MIS 18 (~730 ka) — silny stadiał; SCHEMAT: kształt = analog kompozytu MIS 20–24 (Batchelor i in. 2019), rząd wielkości wg LR04'}),
  (760000, {'w': [745000, 787000], 'ice': 'now',    'label': 'MIS 19 (~760 ka) — interglacjał (analog holocenu), stan jak dziś'}),
  (810000, {'w': [787000, 814000], 'q': 'q_mis20_24','label': 'MIS 20 (~810 ka) — Batchelor i in. 2019 (kompozyt MIS 20–24)'}),
  (850000, {'w': [814000, 866000], 'ice': 'now',    'label': 'MIS 21 (~850 ka) — słaby interglacjał, stan jak dziś'}),
  (880000, {'w': [866000, 897000], 'q': 'q_mis20_24','label': 'MIS 22 (~880 ka) — silny stadiał przełomu ś.-plejst.; Batchelor i in. 2019 (kompozyt MIS 20–24)'}),
  (940000, {'w': [935000, 954000], 'q': 'q_mis20_24','label': 'MIS 24 (~940 ka) — Batchelor i in. 2019 (kompozyt MIS 20–24)'}),
  (920000, {'w': [897000, 935000], 'ice': 'now',    'label': 'MIS 23 (~920 ka) — interglacjał, stan jak dziś'}),
  (980000, {'ice': 'now',    'label': 'przełom środkowoplejstoceński — odcinek międzylodowcowy (stan jak dziś)'}),
  (1190000,{'q': 'q_matuyama','label': 'MIS 36 (~1,19 mln) — silny stadiał przedprzełomowy; SCHEMAT: kształt = analog wczesnego Matuyamy (Batchelor i in. 2019), rząd wielkości wg LR04'}),
  (1100000,{'ice': 'now',    'label': 'wczesny plejstocen ~1,1 mln — cykl 41-tys.; stan jak dziś (lody gł. arktyczne/górskie)'}),
  (1250000,{'ice': 'now',    'label': 'wczesny plejstocen ~1,25 mln — interglacjał, stan jak dziś'}),
  (1550000,{'q': 'q_matuyama','label': 'MIS 52–54 (~1,55 mln) — stadiał wczesnego plejstocenu; SCHEMAT: kształt = analog wczesnego Matuyamy (Batchelor i in. 2019), rząd wielkości wg LR04'}),
  (1400000,{'ice': 'now',    'label': 'wczesny plejstocen ~1,4 mln — interglacjał, stan jak dziś'}),
  (1750000,{'q': 'q_matuyama','label': 'MIS 62 (~1,75 mln) — stadiał wczesnego plejstocenu; SCHEMAT: kształt = analog wczesnego Matuyamy (Batchelor i in. 2019), rząd wielkości wg LR04'}),
  (1600000,{'ice': 'now',    'label': 'wczesny plejstocen ~1,6 mln — interglacjał, stan jak dziś'}),
  (1800000,{'ice': 'now',    'label': '~1,8 mln — interglacjał, stan jak dziś'}),
  (2000000,{'ice': 'now',    'label': '~2,0 mln — interglacjał, stan jak dziś'}),
  (2150000,{'q': 'q_gauss',  'label': 'MIS 82 (~2,15 mln) — stadiał wczesnego plejstocenu (umiarkowany); SCHEMAT: kształt = analog późnego Gaussa (Batchelor i in. 2019), rząd wielkości wg LR04'}),
  (2200000,{'ice': 'now',    'label': '~2,2 mln — interglacjał, stan jak dziś'}),
  (2400000,{'ice': 'now',    'label': '~2,4 mln — interglacjał, stan jak dziś'}),
  (2500000,{'q': 'q_matuyama','label': 'wczesny Matuyama (~2,5 mln, MIS ~100/98) — Batchelor i in. 2019 — pierwsze duże zlodowacenie płn. półkuli'}),
  (2650000,{'ice': 'now',    'label': '~2,65 mln — interglacjał, stan jak dziś'}),
  (2750000,{'q': 'q_gauss',   'label': 'późny Gauss (~2,7–2,8 mln) — Batchelor i in. 2019 — lądolody płn. półkuli jeszcze ograniczone'}),
  (2900000,{'ice': 'now',    'label': '~2,9 mln — interglacjał późnego pliocenu, stan jak dziś'}),
  (3150000,{'ice': 'now',    'label': 'pliocen ~3,15 mln — cieplej niż dziś (PRISM), Grenlandia z lodem górskim'}),
]

separator = '-'
# krzywa eustatyczna [ka BP, m] — RK: Waelbroeck 2002; Spratt & Lisiecki 2016;
# pliocen: Miller i in. 2020 / PRISM (≈ +10..+25 m). Wartości uproszczone.
SEA = [
  [0,0],[7,0],[9,-20],[11,-50],[12.5,-60],[14,-85],[16,-105],[19,-122],[21.5,-125],
  [26,-120],[30,-105],[35,-90],[40,-78],[45,-70],[52,-65],[57,-70],[65,-90],[71,-80],
  [80,-55],[88,-60],[95,-45],[103,-50],[110,-65],[118,-70],[125,5],[135,-5],[145,-70],
  [150,-110],[160,-125],[170,-90],[185,-25],[200,-15],[215,0],[230,-25],[243,-45],
  [258,-70],[275,-95],[290,-70],[300,-60],[315,-5],[330,0],[340,-30],[350,-95],
  [365,-60],[374,-40],[390,5],[405,10],[415,0],[424,-15],[435,-40],[450,-100],
  [465,-70],[478,-30],[500,-5],[520,-45],[533,-10],[550,-85],[570,-40],[590,-20],
  [600,0],[620,-40],[650,-105],[676,-40],[700,-10],[720,-35],[745,-80],[760,-20],
  [780,-30],[800,-90],[815,-95],[840,-20],[865,-40],[880,-100],[910,-10],[940,-60],
  [970,-30],[1000,-45],[1070,-35],[1120,-85],[1150,-40],[1200,-90],[1250,-10],
  [1300,-50],[1350,-70],[1400,-20],[1500,-60],[1600,-75],[1700,-20],[1750,-70],
  [1850,-30],[1950,-60],[2100,-65],[2200,-20],[2300,-55],[2400,-30],[2500,-70],
  [2600,0],[2750,-55],[2900,-10],[3000,5],[3150,15],[3300,20]
]

out = {
  'ticks': [{'bp': bp, **v} for bp, v in TICKS],
  'sea': SEA,
  'meta': {
    'iceSources': {
      'portalSet<30ka': 'PALEO.ice_sets + DATED-1 (PANGAEA 10.1594/PANGAEA.848117) + linie PL z danych portalu',
      'q': 'Batchelor C.L. i in. 2019, Nature Communications 10:3713 (best estimate; OSF osf.io/7jen3)',
      'interglacjal': 'stan międzylodowcowy jak dziś (Grenlandia, Antarktyda, lodowce górskie) — schemat portalu',
      'analogi': 'przekroje MIS 18 + wczesny plejstocen (MIS 36/52-54/62/82): kształt = analog innej epoki (Batchelor 2019), rząd wielkości wg LR04 — SCHEMAT, opisany w etykiecie'
    },
    'seaSources': 'krzywa eustatyczna portalu (uproszczona): Waelbroeck i in. 2002; Spratt & Lisiecki 2016; pliocen: Miller i in. 2020 / PRISM'
  }
}
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// Wygenerowano przez tools/build_env.py — globalna chronologia środowiskowa.\n')
    f.write('// Lądolod: najbliższy przekrój (DATED-1 <30 ka; Batchelor 2019 ≥30 ka; interglacjały = stan jak dziś).\n')
    f.write('window.ENV = ')
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';\n')
print('zapisano', OUT, '%.0f KB' % (os.path.getsize(OUT) / 1024), '| ticks:', len(TICKS), '| sea pts:', len(SEA))
