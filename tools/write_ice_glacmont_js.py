#!/usr/bin/env python3
# Z /tmp/glac_w1.json (z build_ice_glacmont.py) pisze js/data/ice_glacmont.js
# Fala 2: dropy dysków-schematów per faza (tylko tam, gdzie widać rekord grupy)
# + nadpisanie PA_NZ_LGM / PA_AUS_LGM / PA_AFRYKA_LGM dla przekroju q_lgm.
import json, os
from pathlib import Path
ROOT = str(Path(__file__).resolve().parent.parent)

items = json.load(open('/tmp/glac_w1.json'))
n2 = sum(1 for it in items if it.get('grp'))

hdr = """// GLACIMONTIS — empiryczne rekonstrukcje maksymalnych zasięgów lodowców górskich (lok. LGM, 57–14 ka).
// Lima A.C., Dulfer H.E., Hughes A.L.C., Margold M., Barr I., Laabs B.J.C., Flantua S.G.A. 2026,
// „Mountain glacier extents at the Last Glacial Maximum”, Scientific Data 13:629,
// doi:10.1038/s41597-026-06841-z; dane: Zenodo doi:10.5281/zenodo.15600659 (CC-BY 4.0),
// plik EmpiricallyReconstructedPaleoglaciers.shp — 15 014 rekonstrukcji z 209 prac, 271 łańcuchów.
// Wygenerowano przez tools/build_ice_glacmont.py + tools/write_ice_glacmont_js.py.
// FALA 1 = regiony wcześniej nieobecne w portalu; FALA 2 = podmiana dysków Nowej Zelandii,
// Australii/Tasmanii, Nowej Gwinei, Atlasu i Riftu Wsch. (Kilimandżaro/Kenia).
// Publikacja źródłowa w NAZWIE każdego poligonu, okno fazowe = deglalow–deglaupp z rekordu
// (0/0 → przyjęte okno 13,5–57 ka). Części <3 km² (rekordy-mozaiki: floor dynamiczny) pominięte;
// RDP adaptacyjny 0,012–0,05°. Ringi DOMKNIĘTE w (lat, lon).
// Rekordy z oknem ≥30 ka (np. Hughes i in. 2021 — Atlas, 50,2 ka) nie trafiają do żadnej fazy
// deglacjacji (okna faz 11,7–30 ka) — pozostają w bazie, tu pominięte.
"""
s = hdr
s += "window.GLAC_SRC = \"DANE — GLACIMONTIS: Lima, Dulfer, Hughes, Margold, Barr, Laabs & Flantua 2026, Scientific Data 13:629, doi:10.1038/s41597-026-06841-z; dane: Zenodo 10.5281/zenodo.15600659 (CC-BY 4.0) — empiryczne rekonstrukcje maks. zasięgów lodowców górskich (lok. LGM, 57-14 ka); publikacja źródłowa podana w nazwie poligonu.\";\n"
s += "window.GLAC_W1 = " + json.dumps(items, ensure_ascii=False) + ";\n"
s += """(function(){
/* przeciwdziałanie podwójnemu malowaniu:
   (a) schematy „NE Azja …” i „Tibet i Himalaje …” → fala 1 (3 fazy),
   (b) dyski NZ / Australia+Tasmania / Nowa Gwinea / Rift Wsch. / Atlas → fala 2,
       drop TYLKO w fazach, w których widać zapis z grupy (inaczej schemat zostaje,
       np. ożywiony Atlas w YD wg Fink i in. 2014 — brak rekordu GLACIMONTIS). */
const DROPR = /^(NE Azja|Tibet i Himalaje)/;
['przedmaksymalny', 'lgm', 'poznanska'].forEach(k => {
  const arr = window.PALEO && window.PALEO.ice_sets[k];
  if (arr) window.PALEO.ice_sets[k] = arr.filter(p => !(p.src === undefined && DROPR.test(p.name)));
});
const GRP_DROPS = {
  nz: /^Nowa Zelandia/, aus: /^(Australia —|Tasmania)/, ng: /^Nowa Gwinea/,
  afr: /^Afryka — (Kilimandżaro|góra Kenia|Ruwenzori)/, atlas: /^Afryka — Atlas/
};
/* podmiana faz×grupa SPOJNIE: dyski giną tylko przy wystarczalnym pokryciu rekordami;
   przy rzadkim pokryciu (np. NZ w pomorskiej/B–A = 1 okno 13,5–57 ka) zostaje narracyjny
   schemat (ACR≈pomorska, cofka w YD wg Kaplan 2010; Atlas: readvance YD wg Fink 2014)
   — a okno-widoczne rekordy danej grupy też się tam NIE doklejają (jedno źródło na grupę-fazę). */
const MIN_COUNT = { nz: 3, aus: 5, ng: 2, afr: 2, atlas: 1 };
const FAZY6 = ['przedmaksymalny', 'lgm', 'poznanska', 'pomorska', 'bolling_allerod', 'younger_dryas'];
const ACTIVE = {};
FAZY6.forEach(k => {
  const cnt = {};
  window.GLAC_W1.forEach(it => { if (it.grp && (it.win || []).indexOf(k) >= 0) cnt[it.grp] = (cnt[it.grp] || 0) + 1; });
  ACTIVE[k] = new Set(Object.keys(cnt).filter(g => cnt[g] >= (MIN_COUNT[g] || 2)));
  const arr = window.PALEO && window.PALEO.ice_sets[k];
  if (!arr) return;
  const rx = [...ACTIVE[k]].map(g => GRP_DROPS[g]).filter(Boolean);
  if (rx.length) window.PALEO.ice_sets[k] = arr.filter(p => !(p.src === undefined && rx.some(r => r.test(p.name))));
});
window.GLAC_W1.forEach(it => {
  (it.win || []).forEach(k => {
    if (it.grp && ACTIVE[k] && !ACTIVE[k].has(it.grp)) return;   // rzadkie pokrycie: zostaje schemat
    const arr = window.PALEO && window.PALEO.ice_sets[k];
    if (arr) arr.push({ name: it.name, src: it.src, cite: it.cite, grp: it.grp, rings: it.rings });
  });
});
/* q_lgm — te same dane zamiast dysków „zasięg skali LGM” (głębokie stadiały ≥ MIS 4
   zostają przy starych PA_*_SCHEMAT: GLACIMONTIS to lok. LGM 14–57 ka, nie MIS 4/6) */
const vis = g => window.GLAC_W1.filter(it => it.grp === g && (it.win || []).indexOf('lgm') >= 0)
  .map(it => ({ name: it.name, src: it.src, cite: it.cite, rings: it.rings }));
const nz = vis('nz');
if (nz.length) window.PA_NZ_LGM = nz;
const aus = vis('aus').concat(vis('ng'));
if (aus.length) window.PA_AUS_LGM = aus;
const afr = vis('afr').concat(vis('atlas'));
if (afr.length) window.PA_AFRYKA_LGM = afr;
})();
"""
open(ROOT + '/js/data/ice_glacmont.js', 'w').write(s)
print('bytes', os.path.getsize(ROOT + '/js/data/ice_glacmont.js'), '| rekordów fali 2:', n2, '/', len(items))
