# PaleoAtlas — portal stanowisk paleolitu i mezolitu

Interaktywny atlas: mapa + oś czasu (od **3,3 mln lat temu** — pierwsze narzędzia kamienne,
Lomekwi 3 — do dziś), lądolód, biomy, dawne linie brzegowe i stanowiska kultur.
Lądolód i poziom morza płyną **osobną, globalną chronologią środowiskową** (54 przekroje),
niezależną od faz opisowych osi. Wersja **MVP** do omówienia kierunku dalszej rozbudowy.

## Uruchomienie

Najprościej — kliknij dwa razy `index.html` (działa bez serwera, dane ładowane jako skrypty JS).
Lub lokalny serwer:

```bash
cd paleoatlas && python3 -m http.server 8000
# → http://localhost:8000
```

Mapa potrzebuje internetu tylko do podkładów kafelkowych (Esri/OSM). Dane portalu są lokalne.

## Struktura

```
paleoatlas/
├── index.html              # szkielet UI (mapa / Tom I / słownik / o danych) + meta/OG/manifest
├── manifest.webmanifest    # PWA-lite: nazwa, theme-color, ikony 192/512 (bez service workera)
├── assets/                 # ikony 192/512/180 + obraz OG 1200×630 (generowane: tools/build_brand_assets.js)
├── RUNBOOK.md              # 1 strona: podnieś · przetestuj · przebuduj paczkę · wydaj · troubleshooting
├── css/styles.css
├── js/app.js               # cała logika: oś czasu, warstwy, panele, widoki
├── js/data/
│   ├── sites.js            # ← generowane ze źródłowych CSV (stanowiska PL + sąsiedzi)
│   ├── meta.js             # ← generowane (26 kultur, 10 bloków, 17 faz klimatycznych)
│   ├── glossary.js         # ← generowane (74 hasła)
│   ├── tom1.js             # ← generowane (13 rozdziałów)
│   ├── paleo.js            # ← RĘCZNIE kuratowany: lądolody spoza DATED-1/NADI-1/PATICE (Grenlandia, Himalaje, fazy głębokie…) + biomy
│   ├── ice_dated.js        # ← generowane: DATED-1 (Eurazja 30–8 ka, PANGAEA) + linie PL wszycane verbatim
│   ├── ice_nadi.js         # ← generowane: NADI-1 (Ameryka Płn. 25–10,5 ka co 0,5 tys. lat, Zenodo; wariant OPTIMAL)
│   ├── ice_patice.js       # ← generowane: PATICE (Ameryka Płd. 35–10 ka + inwentarz 2011 AD, Mendeley; przekroje empiryczne)
│   ├── ice_patlakes.js     # ← generowane: PATICE-LAKES (49 paleojezior przylodowcowych Patagonii 10–35 ka, Mendeley; warstwa wody POD lodem)
│   ├── ice_ice6g.js        # ← generowane: ICE-6G_C VM5a, maska 1° sftgif≥50%: Antarktyda 26–0 ka (ringi mapa ±180 + rings_globe z biegunem), Grenlandia 26–0 ka, Islandia deglacjacyjnie 15–10,5 ka
│   ├── ice_rgi_isl.js      # ← generowane: RGI 7.0 (NSIDC, CC-BY) — współczesne czapy lodowe Islandii: 568 jęzorów → 9+ nazwanych czap (~11,0 tys. km²), splajsowane TYLKO do „dziś”
│   ├── ice_britice.js      # ← generowane: BRITICE-CHRONO (PANGAEA 945729) — empiryczny BIIS 27/21/18/15 ka, 3 warianty (MIN/OPT/MAX; przełącznik „🧊 BIIS”), wycinek sektora Wysp
│   ├── ice_glacmont.js     # ← generowane: GLACIMONTIS (Zenodo, CC-BY) — 641 rekordów lodowców górskich z okien wieku; fala 1 (nowe regiony) + fala 2 (podmiana dysków NZ/AUS/NG/Rift/Atlas)
│   ├── ice_quat.js         # ← generowane: Batchelor i in. 2019 (OSF osf.io/7jen3) — półkula płn., 18 przekrojów 2,75 mln–30 ka
│   ├── env.js              # ← generowane: GLOBALNA chronologia (54 przekroje lodu + krzywa poziomu morza, 102 pkt)
│   ├── shelves.js          # ← generowane: wyschnięte szelfy z ETOPO2v2 (11 progów poziomu morza)
│   └── world_land.js       # ← kontynenty Natural Earth 50m (tryb paleo, domena publiczna)
├── vendor/leaflet/         # Leaflet 1.9.4 (lokalnie)
└── tools/
    ├── requirements.txt    # pinowane zależności pipeline'u danych (numpy/shapely/pyshp/netCDF4/pyproj/Pillow/cv2)
    ├── run_tests.sh        # pełna bateria jedną komendą (PA_CHROME / PA_PUPPETEER / PA_STRICT_PERF)
    ├── build_brand_assets.js # ikony z assets/icon.svg + obraz OG jako zrzut z atlasu (LGM nad Skandynawią)
    ├── build_data.py       # konwerter CSV → JS (stanowiska, meta, słownik, tom; +2 fazy głębokie + milówki)
    ├── build_ice_dated.py  # DATED-1 (shapefiles PANGAEA) → ice_dated.js + splice linii PL
    ├── build_ice_nadi.py   # NADI-1 (shapefiles Zenodo) → ice_nadi.js — podmianka schematu Ameryki Płn.
    ├── build_ice_patice.py # PATICE (shapefiles Mendeley, UTM18S→WGS84) → ice_patice.js — podmianka schematu Ameryki Płd.
    ├── build_patlakes.py   # PATICE-LAKES (Glacial_lake_{10..35}ka.shp Mendeley, UTM18S→WGS84, RDP 800 m, ≥40 km²) → ice_patlakes.js + splice do PALEO.ice_sets
    ├── build_ice_ice6g.py  # ICE-6G_C (netCDF 1° z U. Toronto) → maski Antarktydy: cięcie antymeridianu, clamp −84,9, wariant rings_globe z biegunem
    ├── write_ice_ice6g_js.py # → ice_ice6g.js + splice do PALEO.ice_sets (8 kluczy degla+„now”), ringi (lat,lon)
    ├── build_ice_rgi_isl.py# RGI 7.0 region 06 (SHP NSIDC → unia geometrii per czapa macierzysta, próg MINA z fallbackiem dla małych czap) → ice_rgi_isl.js + splice tylko do fazy „now”
    ├── build_ice_britice.py# BRITICE-CHRONO (shapefiles PANGAEA, North-Pole LAEA); klip sektora BIIS → ice_britice.js + splice
    ├── build_ice_glacmont.py / write_ice_glacmont_js.py # GLACIMONTIS (SHP Zenodo) → ice_glacmont.js + splice
    ├── build_ice_quat.py   # Batchelor 2019 (shapefiles OSF) → ice_quat.js (+ splice linii PL, cięcie antypołudnika)
    ├── build_env.py        # zlepek chronologii środowiskowej (przekroje + krzywa eustatyczna) → env.js
    ├── build_paleocoast.py # ETOPO2v2 (NOAA) → shelves.js (szelfy per poziom morza)
    ├── close_generated_rings.js # normalizacja OGC: jawna domkniętość pierścieni + filtr degeneratów
    ├── nadi.shots.js       # migawki kontrolne deglacjacji Ameryki Płn. (E2E, Chromium)
    ├── asia.shots.js       # migawki kontrolne Azji/Beringii (E2E, Chromium)
    ├── patice.shots.js     # migawki kontrolne Ameryki Płd. (PATICE: LGM/15 ka/mł. dryas/„dziś”/35 ka + globus; E2E, Chromium)
    ├── patlakes.shots.js   # migawki kontrolne paleojezior Patagonii (PATICE-LAKES: 25/20/15/13/10 ka, „dziś” = kontrola bez warstwy; E2E, Chromium)
    ├── africa.shots.js     # migawki kontrolne Afryki (glacjacje górskie: LGM/zbliżenie Kili/Atlas YD/„dziś”; E2E, Chromium)
    ├── australia.shots.js  # migawki kontrolne Australazji (Tasmania LGM, Kosciuszko, Nowa Gwinea, B–A vs mł. dryas, MIS 6, globus; E2E, Chromium)
    ├── newzealand.shots.js # migawki kontrolne NZ (LGM 7 sektorów, MIS 4 SGM vs LGM, ACR≈pomorska vs cofka w YD, „dziś”, globus; E2E, Chromium)
    ├── antarctica.shots.js # migawki kontrolne Antarktydy (ICE-6G_C: LGM/„dziś” płk. płd., brzeg czapy z4 LGM vs dziś, B–A 13,5 ka, globus; E2E, Chromium)
    ├── britice.shots.js  # migawki kontrolne Wysp (BRITICE-CHRONO: LGM/18 ka/15 ka, B–A bez lodu, YD Loch Lomond z DATED-1; E2E, Chromium)
    ├── britvarshots.js   # migawki wariantów BIIS (LGM: opt/min/max; 27 ka: min vs max — różnica zasięgu widoczna gołym okiem; E2E, Chromium)
    ├── icelandshots.js   # migawki kontrolne Islandii (LGM — schemat pełnej pokrywy; 15/12/10,5 ka — etapy maski ICE-6G_C; „dziś” — czapy z RGI 7.0 i Vatnajökull z7; E2E, Chromium)
    ├── continentshots.js # audyt „kształtu zlodowienia w czasie”: 13 regionów (kontynenty i wyspy osobno) × 6 epok (LGM/MIS 4/MIS 6/Eem/MD/dziś) — pasy + atlas + ułamki px z korekcją paddingu canvasu; E2E, Chromium
    ├── landshots.js     # audyt „kształtu lądu w czasie": 13 regionów × 25 epok (dziś→pliocen) — szelf per poziom, tooltipy, monotoniczność 0→−125 m; E2E, Chromium; wykrył i wymusił naprawę v2 shelves.js (cv2, nienested)
    ├── fetch_biodata.sh  # przywraca surowe źródła .nc biomów z figshare (usuwane z repo po zbudowaniu — patrz changelog)
    ├── build_biomes.py  # producent warstwy biomów: 56 migawek PNG 0,5° (Beyer2020 0–120 ka · Krapp2021 121–799 ka · Barreto2023+HG-lite ≥810 ka), lody wg envTickForBP + pyłek BIOME 6000 → biome_meta/biome_pollen.js
    ├── check_biomes.py  # audyt danych biomów (12 assertów regionowych + walidacja HG-lite 68% grup @0 ka) → biome_report.json
    ├── biomeshots.js    # audyt warstwy biomów: 15 regionów × 15 epok frakcji klas w przeglądarce + kotwice pyłkowe + legenda/tooltip (45 asercji, E2E, port 8389; atlas atlas_biomy_epoki.png)
    ├── globe.suite.js      # widok kulisty: routing, render, datownik, epoki + BIOMY na globie i pyłek (21 asercji E2E)
    ├── perfcheck.js        # wydajność: cache warstw mapy (2. przejście 58%) + cache klatek globusa HIT<60 ms (4 asercje)
    ├── ice.science.suite.js# walidacja lądolodu przeciwko literaturze (170 asercji: I–XX)
    ├── e2e.suite.js        # testy E2E desktop (Chromium headless)
    ├── e2e.mobile.suite.js # testy E2E mobilne (390×844 + dotyk)
    └── periodshots.js      # migawki mapy dla wybranych okresów
```

## Aktualizacja danych

1. Podmień/plik CSV w katalogu `uploads/` (nazwy plików jak dotychczas),
2. uruchom `python3 tools/build_data.py`,
3. **przestempluj dane:** `python3 tools/stamp_build.py` (wersja + liczby; bez tego CI czerwone),
4. **sprawdź kontrakt:** `node tools/validate_data.js`,
5. odśwież stronę. Skrypt wypisuje raport kontroli (pominięte rekordy, rozkład kultur).

> **Kolejność plików `js/data/` w `index.html` ma znaczenie** — to nie lista „do wczytania”,
> a sekwencja składania: późniejsze skrypty modyfikują wcześniejsze. Zasady (konwencje
> współrzędnych, proweniencja, identyfikatory, stempel wydania) opisuje
> **[DATA_CONTRACT.md](DATA_CONTRACT.md)** — przeczytaj go przed dodaniem nowej warstwy.

## Tryb paleo — „lądy takie, jakie były w epoce”

Przycisk **🌎 Widok: lądy z epoki** (karta fazy, lewy górny róg; domyślnie WŁ.) przełącza
mapę ze współczesnego podkładu w widok „z epoki”:

- współczesne kafelki, rzeki i granice znikają (bo ich układ był inny niż dziś),
- rysuje się **ocean + kontury kontynentów** (Natural Earth 50m, `js/data/world_land.js`),
- dokładają się **wyschnięte szelfy z epoki** — obliczone z pomiarowej batymetrii
  **ETOPO2v2 (NOAA/NCEI, 2′ ≈ 3,7 km)** dla progu eustatycznego fazy (Doggerland, Beringia,
  Sunda, Sahul, szelf argentyński… to *wynik pomiarów*, nie rysunek odręczny),
  rysowane tym samym kolorem — zlewają się z kontynentami w dawną linię brzegową,
- **lądolód** pokrywa zlodowaciałe obszary (PL: dokładna linia z Twojego pliku),
- przerywana linia pokazuje **„ducha” dzisiejszego wybrzeża** — punkt odniesienia.
- karta fazy pokazuje **szacunkowy poziom morza** (np. −125 m w LGM); szelfy są
  spójne z tą wartością (LGM → pełny zestaw mostów lądowych, holocen → brak).

Uwaga: kontynenty na przestrzeni 3,3 mln lat przesunęły się tektonicznie o
kilkanaście–kilkadziesiąt km (płyty dryfują cm/rok) — przy skali mapy świata
to ułamek piksela, więc jedyną realną zmianą konturów lądów są **wahania poziomu
morza** (i zasięg lądolodu). Wyjątek regionalny: cieśnina panamska zamknęła się
~3 mln l. temu — ewentualna osobna poprawka, gdy oś obejmie Amerykę Śr. szczegółowo.

## Oś czasu — zmienna skala

Oś ma **19 równych segmentów**: 17 faz klimatycznych z `zlodowacenia_biomy.csv`
+ **2 fazy głębokie** generowane przez `build_data.py`:

1. **Pierwsze narzędzia kamienne — Lomekwi i Oldowan** (3,3 mln – 1,8 mln l.),
2. **Ekspansja Homo — wyjście z Afryki i Acheul** (1,8 mln – 800 tys. l.).

Każda faza ma ten sam odcinek na osi niezależnie od realnej długości, więc
200-tysięcioletni paleolit środkowy zajmuje tyle samo miejsca co 9 tysięcy lat
paleolitu schyłkowego (każda epoka „ma własną skalę"). Segmenty z lądolódem są
kreskowane niebiesko, kolor segmentu = kolor biomu z pliku źródłowego; fazy
głębokie mają osobny pasek dekoracyjny. Podziałka: **lewo = przeszłość (3,3 mln lat
temu), prawo = dziś**; etykiety ≥ 1 mln lat pokazują „mln lat temu".

Pod osią leży **9 diamentowych znaczników ♦ — kamieni milowych homininów**
(Lomekwi 3,3 mln · rodzaj Homo 2,8 mln · Oldowan 2,6 mln · Shangchen 2,1 mln ·
Dmanisi 1,85 mln · Acheul 1,76 mln · Sima del Elefante 1,4 mln · Orce 1,2 mln ·
Happisburgh 0,9 mln); kliknięcie przesuwa suwak do epoki.

Stanowisko jest widoczne, gdy wybrany moment mieści się w jego przedziale
`data_norm_od/do_calBP`. Kliknięcie segmentu = skok w środek fazy. Przycisk ▶ = animacja.
Strzałki ← → krok po osi.

## Globalna chronologia środowiskowa (lądolód + poziom morza)

Osobny pomysł wdrożony na prośbę użytkownika: warstwy środowiskowe **nie są
sztywno związane z fazami osi** — płyną własną, globalną skalą czasu
(`js/data/env.js`, generowana przez `tools/build_env.py`):

- **54 przekroje lądolodu** od 3,15 mln lat do dziś:
  - **< 30 ka** — zestawy portalu: DATED-1 (Eurazja co 1 tys. lat) + **NADI-1**
    (Ameryka Płn. co 0,5 tys. lat, 25–10,5 ka) + **PATICE**
    (Ameryka Płd., najbliższy przekrój z 35/30/25/20/15/13/10 ka + inwentarz 2011 AD) +
    **ICE-6G_C** (Antarktyda 26/21/17,5/15/13,5/12/10,5/0 ka + „dziś”) + linie
    marginesu PL z danych portalu (verbatim),
  - **≥ 30 ka** — **18 przekrojów Batchelor i in. 2019** (*Nature Communications*
    10:3713, wariant „best estimate", shapefiles OSF osf.io/7jen3): ~30/35/40/45 ka,
    MIS 4, 5d/5b/5c/5a, 6, 8, 10, 12, 16, kompozyt MIS 20–24, wczesny Matuyama
    (~2,5 mln — pierwsze duże zlodowacenie płn. półkuli), późny Gauss (~2,7–2,8 mln);
    Antarktyda „dziś” (ICE-6G_C 0 ka) dołączana do każdego przekroju, Patagonia ze schematów portalu,
  - **epoki międzylodowcowe** (Eem, MIS 7e, 9, 11, wczesny plejstocen, pliocen) —
    stan jak dziś (Grenlandia, Antarktyda, lodowce górskie),
  - **stadiały bez własnego przekroju** (MIS 18 — Batchelor dla MIS 18 nie publikuje;
    wczesny plejstocen: MIS 36, 52–54, 62, 82) — **analogi kształtu** z najbliższego
    podobnego przekroju (kompozyt MIS 20–24 / wczesny Matuyama / późny Gauss),
    z rzędem wielkości wg LR04 — etykiety jawnie zawierają „SCHEMAT: kształt = analog…”,
    a tooltip poligonu ma osobną notkę ⚠,
- **krzywa poziomu morza** (102 punkty interpolowane liniowo): uproszczenie wg
  Waelbroeck i in. 2002, Spratt & Lisiecki 2016; pliocen: Miller i in. 2020 / PRISM
  (w pliocenie **do +20 m ponad dzisiejszy stan**). Poziom steruje doborem progu
  szelfu ETOPO2v2 — w skaliach międzylodowcowych mosty lądowe znikają automatycznie.

Wybór przekroju: **(1) okno piętra** — przekroje MIS 16–24 mają zapisane granice
stadiałów (wg Railsback i in. 2015 / LR04: MIS 18 = 745–712 ka itd.), więc np. 713 tys.
lat ląduje w MIS 18 (lodowiec), a nie w „najbliższym" interglacjale 700 ka;
**(2) najbliższy przekrój** tam, gdzie okien nie ma. Karta fazy pokazuje etykietę
(„🛰 Środowisko (chronologia globalna): …"), a gdy przekrój jest oddalony
o ≥5 tys. lat, jawnie dopisuje **„najbliższy przekrój: Δ X tys. l."** — bez ukrywania
przybliżenia.

Szczegóły importu (`tools/build_ice_quat.py`): transformacja z projekcji
North_Pole_LAEA do WGS84 (folder LGM jest już geograficzny), rozcinanie pierścieni
na antypołudniku z interpolacją szerokości przy ±180° (przypięcie wierzchołków cięcia
przed uproszczeniem RDP + powtórna walidacja po uproszczeniu), filtrowanie części
nie-lodowych w pliku LGM (913 → 823 części „Ice"). Margines w Polsce tam, gdzie
przekrój do niego sięga (MIS 12, MIS 6), jest **wszycany verbatim z danych portalu**;
dla MIS 8 synteza Batchelora nie sięga Polski, więc dokładany jest **osobny lob Odry
wg linii portalu** — tooltip i karta fazy jawnie sygnalizują tę rozbieżność korelacji.

## Rygor naukowy — co jest danymi, a co schematem

| Element | Status |
|---|---|
| Stanowiska, datowania, kultury, opisy | **dane zweryfikowane** (Twoje CSV) |
| Linie zasięgu lądolodu na terenie Polski | **dane** (dokładne punkty z Twojego pliku, wszycane verbatim w poligony globalne) |
| Lądolód Eurazji 30–8 tys. BP | **DATED-1** (Hughes i in. 2016, *Boreas*; PANGAEA 848117) — most-credible |
| Lądolód Ameryki Płn. 25–10,5 ka | **NADI-1** (Dalton, Dulfer, Margold i in. 2023, *Quat. Sci. Rev.* 321:108345; Zenodo 10.5281/zenodo.8161764) — izochrony co 0,5 tys. lat, wariant OPTIMAL; Grenlandia poza zasięgiem → **ICE-6G_C** (wiersz niżej) |
| Lądolód Wysp Brytyjskich 31–15 ka | **BRITICE-CHRONO** (Clark, Ely, Fabel & Bradley 2022, PANGAEA doi:10.1594/PANGAEA.945729, CC-BY 4.0; Clark i in. 2022, *Boreas* 51:699–758, doi:10.1111/bor.12594) — empiryczna rekonstrukcja co 1 tys. lat (639 nowych datowań 14C/OSL/TCN) w **trzech wariantach niepewności**: MINIMUM / OPTIMUM / MAKSIMUM — przełącznik **„🧊 BIIS” na karcie fazy** (domyślnie OPTIMUM; LGM ≈ 448/770/996 tys. km² w sektorze BIIS); ticki: przedmaksymalny→27 ka, LGM→21 ka, poznańska→18 ka, pomorska→15 ka (najbliższa izochrona); poligony optimum zawierają kontekst FIS/BKIS — serwerowo wycięto sektor BIIS (Fennoskandia nadal z DATED-1); **Bølling–Allerød: Wyspy bez lodu** (deglacjacja ~15–14 ka); mł. dryas = DATED-1 12 ka (Loch Lomond) |
| Lądolód Ameryki Płd. 35–10,5 ka + „dziś” | **PATICE** (Davies i in. 2020, *Earth-Science Reviews* 204:103152; Mendeley Data 10.17632/ztz59y79vv.1) — empiryczne przekroje 35/30/25/20/15/13/10 ka (58 823 formy geomorf., 1669 datowań) + inwentarz 2011 AD; stadiały MIS ≥4 poza 45 ka/Gauss (gdzie Q19 ma własne pierścienie): **SCHEMAT portalu z etykietą epokową z ticka i pełnymi cytatami** (≤35 ka: PATICE — wyżej; moreny zewn. niedatowane: Rabassa 2008; Coronato, Martínez & Rabassa 2004; zasięg ponad-LGM — GPG ~1,09 mln — TYLKO epoka Matuyamy: Hein i in. 2009, *Geology* 37:551); MIS 5a–d: stan jak dziś |
| Paleojeziora przylodowcowe Patagonii 10–35 ka | **PATICE-LAKES** (Davies, Thorndycraft, Fabel & Martin 2020, *Earth-Science Reviews* 204:103152; Mendeley Data 10.17632/ztz59y79vv.1, CC-BY 4.0 — pliki `Glacial_lake_{10,13,15,20,25,30,35}ka.shp`) — 49 zbiorników ≥40 km² rysowanych JAKO WODA pod poligonami lodu; mapowanie faz jak lód PATICE (25→przedmaksymalny, 20→LGM, 15→pozn./pom., 13→B–A/YD, 10→wcz. holocen); kulminacja 13–15 ka: Σ ~13,7–13,9 tys. km² (m.in. **Lago Chalenko ~4,7 tys. km²** — największe plejstocenskie jezioro Ameryki Płd., Thorndycraft i in. 2019); ≥40 ka: brak rekonstrukcji (zbiór zaczyna się od 35 ka); przekroje q_35ka/q_30ka doklejane |
| Lodowce Afryki (górskie) | **DANE GLACIMONTIS** w oknach rekordów (fala 2): Rift Wsch. — Chen i in. 2018 (24–32 ka), Osmaston 2004 (17–20 ka + okno nieustalone 13,5–57 ka); Atlas (Maghreb) — Hannah i in. 2017 (19–25 ka, Σ ~31 km², Toubkal). Fazy bez pokrycia: **SCHEMAT** (dysk) — Atlas w mł. dryasie = **readvance 11–13 ka (¹⁰Be, Fink i in. 2014)**, YD > B–A; E-Afryka w YD = 3 dyski; w pomorskiej/B–A dyski Riftu nie istnieją (szybka deglacjacja przed ~14 ka). Rekord Hughes i in. 2021 (Atlas, 50,2 ka) poza oknami faz 11,7–30 ka — pominięty projektowo. „dziś” = POMIARY (Cullen 2013, Mölg 2006, Prinz 2018) |
| Lodowce Australia/Nowa Gwinea/Tasmania (górskie) | **DANE GLACIMONTIS** w oknach rekordów (fala 2): Tasmania — 16 rekordów LGM (Barrows i in. 2002, QSR 21:159; Colhoun & Barrows 2011; czapa Central Plateau ~1085 km² + satelity); kontynent: dokładnie 1 rekord — Snowy Mountains/Góry Wododziałowe (Barrows i in. 2001, Quat. Res. 55:179, 16,8–32 ka — najmniej zlodowaciały kontynent); Nowa Gwinea + Archipelag Malajski: Prentice i in. 2005/2011, Peterson i in. 2004 (Sudirman/Jaya + Giluwe 188 km²; część okien do ~15,4 ka — Barrows i in. 2011, QSR 30:2676). Po oknach: **narracyjny SCHEMAT** — szybka deglacjacja, brak readvance ACR/YD (Barrows i in. 2002); starsze stadiały: Tasmania ~4500 km² (schemat); „dziś” = POMIAR Puncak Jaya ~0,2 km² (2022–24, BMKG), reszta 0 km² |
| Lodowce Nowej Zelandii | **DANE GLACIMONTIS** w LGM/poznańskiej (fala 2): 35 rekordów wyspy Płd. (m.in. Barrell 2011 — scalony kompleks Southern Alps ~40 tys. km² wg Porter 1975/Golledge i in. 2012; ¹⁰Be: maks. ~26–20 ka, cofka od ~18 ka — Putnam i in. 2013, QSR 62:114), wyspy Płn. i Stewarta. Rzadkie okna: **narracyjny SCHEMAT** (MIN_COUNT) — **ACR ≈ pomorska (readvance ~13 ka — Putnam i in. 2010, *Nat. Geosci.* 3:700)**, **mł. dryas = cofka (Kaplan i in. 2010, *Nature* 467:194)**; MIS 3 ~42 ka (Kelley i in. 2014); MIS 4 ~65 ka = Southern Glacial Maximum (Schaefer i in. 2015, QSR 114:410 — schemat); „dziś” = **POMIAR** 794 ± 34 km² / 2 918 lodowców (Baumann i in. 2021, *J. Glaciol.* 67:7–24) + Ruapehu 3,0 km² |
| Lądolód Antarktydy „dziś” + deglacjacja 26–10,5 ka | **DANE modelowe GIA ICE-6G_C (VM5a)** — Argus, Peltier, Drummond & Moore 2014, *Geophys. J. Int.* 198:537–563 (doi:10.1093/gji/ggu140) + Peltier, Argus & Drummond 2015, *JGR Solid Earth* 120:450–487 (doi:10.1002/2014JB011176); maska siatki 1° (sftgif ≥ 50%), przekroje 26/21/17,5/15/13,5/12/10,5/0 ka → tick dobierany najbliższy (27→26, 21,5→21, 17,5→17,5, 15→15, 13,6→13,5, 12,3→12, 10,5→10,5); LGM ~15,2 mln km² vs „dziś” ~14,2 (rzeczywista ~13,6–14,0 mln km² z szelfami); por. rekonstrukcja empiryczna **RAISED** (Bentley i in. 2014, *QSR* 100:1–9); fazy głębokie (≥ MIS 3) = **kotwica ≈ „dziś”** (ICE-6G_C 0 ka, DANE) z jawną notką w tooltipie — przekroje empiryczne (RAISED/Bentley 2014) kończą się na LGM, starsza wielkość nieznana |
| Lądolód — Islandia: „dziś” + deglacjacja 15–10,5 ka | **„dziś” = DANE (inwentarz):** **RGI 7.0** (RGI 7.0 Consortium 2023, Boulder NSIDC DAAC, doi:10.5067/f6jmovy5navz, CC-BY 4.0) — 568 rekordów-jęzorów (Σ ~11,1 tys. km², zdjęcia ~2000–2015 AD) scalonych w portalu unią do czap macierzystych: Vatnajökull ~8 184, Langjökull ~944, Hofsjökull ~889, Mýrdalsjökull ~598, Drangajökull ~145 km² + mniejsze (wpisy splajsowane wyłącznie do fazy „dziś”). **Deglacjacja = DANE modelowe:** maska **ICE-6G_C (VM5a)** w sektorze Islandii — pomorska 15 ka / B–A 13,5 ka / mł. dryas 12 ka / wcz. holocen 10,5 ka (124,8 → 68,6 tys. km² ważone frakcją); maska siatki 1° jest statyczna 26→13,5 ka (nie oddaje zapaści morskiej IIS — znane ograniczenie) i pusta w 0 ka, więc LGM i fazy starsze zostają **SCHEMATem** z uczciwą etykietą empiryczną (pełna pokrywa do krawędzi szelfu ~0,3 mln km², maksimum lokalne ~23–21 ka: Norðdahl & Pétursson 2005; Benediktsson i in. 2022/2023). **Walidacja testowa:** IcelandICE DB (Goffin, Tarasov, Benediktsson & Licciardi 2026, *Clim. Past* 22:825–843, doi:10.5194/cp-22-825-2026; baza: Zenodo 10.5281/zenodo.19453940, CC-BY 4.0) — 37 kalibrowanych punktów zasięgu (7 morskich + 30 lądowych) testowanych przeciw maskom (etapowe poligony empiryczne IIS nie istnieją otwarcie — DATED-1 wyklucza Islandię, BRITICE to wyłącznie BIIS) |
| Lądolód półkuli płn. 2,75 mln–30 tys. BP | **Batchelor i in. 2019** (*Nature Communications* 10:3713, wariant „best estimate”; OSF osf.io/7jen3) — 18 przekrojów |
| Lądolód — MIS 8 (lob Odry) | Batchelor 2019 + osobny poligon wg Twojej linii (Batchelor MIS 8 nie sięga PL — rozbieżność korelacji, sygnalizowana w tooltipie) |
| Lądolód — międzylodowcowce + Antarktyda/Patagonia w przekrojach Q | stan jak dziś / schemat portalu — oznaczone w tooltipie |
| Poziom morza | **krzywa eustatyczna portalu** (uproszczona, 102 pkt): Waelbroeck 2002; Spratt & Lisiecki 2016; pliocen: Miller 2020/PRISM (do +20 m) |
| Dawne lądy / wyschnięty szelf | **ETOPO2v2 (NOAA)** batymetria + próg z globalnej krzywej (−5…−125 m); baseny zamknięte (Czarne, Kaspijskie) i jeziora przedpolowe: przybliżenie 1. rzędu |
| Kontury kontynentów / „duch” wybrzeża | Natural Earth 50m (domena publiczna) |
| Biomy kontynentu | **MODELE naukowe** (Beyer 2020 / Krapp 2021 / PALEO-PGEM + HG-lite) — 56 migawek + kotwice BIOME 6000; szczegóły w „O danych” |
| Obszary kultur | **tymczasowo wyłączone** (na prośbę użytkownika) — wrócą w przemyślanej formie |

## Lądolody per okres — decyzje interpretacyjne faz portalu

> **Uwaga (obecna architektura):** warstwa lądolodu przebiega wg **globalnej chronologii
> środowiskowej** (sekcja wyżej), nie per faza. Poniższa tabela dokumentuje interpretację
> okresów portalu i to, skąd dany przekrój bierze poligony; wiersze ≥ 30 tys. są dziś
> realizowane przez przekroje Batchelor 2019 (Q19), wiersze < 30 tys. przez DATED-1.

Kluczowe decyzje interpretacyjne:

| Okres | Wyróżniki rekonstrukcji |
|---|---|
| 800–440 tys. — Sanian/Elsterian (MIS 16/12) | **maksimum w PL — do przedpola Karpat i Sudetów** (linia z Twojego pliku!), Anglian w GB, Kansan do Missouri |
| 440–300 / 130–115 (Holstein, Eem) | jak dziś (Grenlandia + czapki) |
| 300–230 — Odra (MIS 8) | linia Odry z pliku; GB niepewna; Syberia < MIS 6 |
| 230–130 — Warta (MIS 6) | **PENULIMATE GLACIAL MAXIMUM**: Holandia południej niż LGM (Drenthe), Wolstonian do Tamizy, **zachodnia Syberia Taz — większa niż LGM**, Illinoian (miejscami południej niż LGM) |
| 115–75 — wczesna Wisła (MIS 5d/5b) | stadiały Herning/Rederstal; LIS w nukleacji |
| 75–60 — MIS 4 | **Kordyliery i NE Azja większe niż LGM** (Batchelor 2019); Fennoskandia do Bałtyku/Danii |
| 60–30 — MIS 3 | **największa niepewność**: wariant góry + N (interstadial Ålesund, DATED-1) |
| 30–24 — przedmaksymalny | **DATED-1 TS27** (27 ka); Ameryka Płn.: **NADI-1 25 ka** (najstarszy przekrój publikacji); Ameryka Płd.: **PATICE 25 ka** (PIS bliski maksimum 33–28 ka) + paleojeziora 25 ka (8 zbiorników, Σ ~2,0 tys. km² — gł. na płn., Elpalafquen); Wyspy: **BRITICE-CHRONO 27 ka** — nasuwanie ku maksimum (~0,74 mln km²; tu i niżej: wariant OPTIMUM — przełącznik „🧊 BIIS” na karcie fazy oferuje też MINIMUM/MAKSIMUM z publikacji); Antarktyda: **ICE-6G_C 26 ka**; Islandia: SCHEMAT portalu (empirycznie pełna pokrywa — brak otwartych przekrojów etapowych < 30 ka) |
| 24–19 — LGM | **DATED-1 TS21** + linia leszczyńska (Twoja) verbatim; Ameryka Płn.: **NADI-1 22 ka** — maksimum, NAISC scalone (LIS do Long Island/Ohio); Ameryka Płd.: **PATICE 20 ka** — scalony PIS 37–55°S, zachód = krawędź szelfu Pacyfiku, wschód = loby na stepie (359 tys. km²) + paleojeziora 20 ka (13 zbiorników, Σ ~6,3 tys. km² — Magellan, Tehuelche, Tar); Wyspy: **BRITICE-CHRONO 21 ka** — BIIS maksymalny, zespolony z FIS przez M. Północne; Antarktyda: **ICE-6G_C 21 ka** — ugruntowanie przy krawędzi szelfu, 15,2 mln km²; Islandia: SCHEMAT z etykietą empiryczną — maksimum lokalne ~23–21 ka, pokrywa do krawędzi szelfu ~0,3 mln km² (Norðdahl & Pétursson 2005; Benediktsson i in. 2022/2023) |
| 19–16 / 16–14 — poznańska/pomorska | **DATED-1 TS18 / TS17** + linie poznańska/pomorska (Twoje) verbatim; Ameryka Płn.: **NADI-1 18 / 15 ka**; Ameryka Płd.: **PATICE 15 ka** — szybka cofka 18–15, PIS rozpadnięty na ≥6 masywów (SPI, NPI, kraina jezior Chile, GCN, Darwin…) + paleojeziora 15 ka: kulminacja Σ ~13,7 tys. km² (Deseado, Chalenko-CP, Otway/Skyring); Wyspy: **BRITICE-CHRONO 18 / 15 ka** — impulsy zapaści morskiej, do 15 ka szczątki (zpaść BIIS ~4×); Antarktyda: **ICE-6G_C 17,5 / 15 ka** (maska wciąż maksymalna; wg RAISED cofka zaczęła się lokalnie już ~18 ka); Islandia: poznańska = dalej schemat; **pomorska = ICE-6G_C 15 ka** (124,8 tys. km², maska 1°) |
| 14–12.9 — Bølling–Allerød | **DATED-1 TS14** (S Skania) + osobny lob gardzieński wg Twojej linii (DATED-1 nie pokrywa go w PL); Ameryka Płn.: **NADI-1 13,5 ka**; Ameryka Płd.: **PATICE 13 ka** — readvance w Antarctic Cold Reversal + paleojeziora 13 ka: Σ ~13,9 tys. km² (**Lago Chalenko 4,7 tys. km²** — największe plejstocenskie jezioro Ameryki Płd.); Wyspy: **bez lodu w całości** (BRITICE-CHRONO: deglacjacja ~15–14 ka); Antarktyda: **ICE-6G_C 13,5 ka** — start redukcji maski (MWP-1A ~14,6 ka); Islandia: **ICE-6G_C 13,5 ka** — maska pełna (start cofki marginalnej sektora płd.) |
| 12.9–11.7 — młodszy dryas | **DATED-1 TS12** (Salpausselkä/Ra, Loch Lomond); Ameryka Płn.: **NADI-1 12,5 ka** (readvance Valders/Marquette); Ameryka Płd.: **PATICE 13 ka** — u nas NA WIDOKU asymetria półkul: ACR vs mł. dryas (paleojeziora nadal ogromne: Chalenko, Otway, Skyring); Antarktyda: **ICE-6G_C 12 ka** — cofka trwa (ACR 14,5–12,7 ka w rdzeniach); Islandia: **ICE-6G_C 12 ka** — cofka ku czapom (readvance fiordów płn. poniżej rozdzielczości modelu) |
| 11.7–8 — wczesny holocen | **DATED-1 TS11** — szczątki C Szwecja; Ameryka Płn.: **NADI-1 10,5 ka** — szczątki nad Hudsonem (zanik ~8,2 ka); Ameryka Płd.: **PATICE 10 ka** — NPI/SPI/CDI zbliżone do dzisiejszych + ostatnie duże paleojeziora (Argentino, Viedma, Tar, Nahuel Huapi; Σ ~3,4 tys. km²); Antarktyda: **ICE-6G_C 10,5 ka** — główna cofka ugruntowania na szelfach Ross/Weddell; Islandia: **ICE-6G_C 10,5 ka** (68,6 tys. km² — ostatni przekrój modelu z lodem) |
| 8–0 | jak dziś; Islandia: **RGI 7.0** — czapy Vatnajökull ~8,2 tys., Langjökull ~0,9 tys., Hofsjökull ~0,9 tys., Mýrdalsjökull ~0,6 tys. km² (inwentarz ~2000–2015 AD) |

> **Ameryka Płd. i Antarktyda w przekrojach ≥ 40 ka:** PIS = SCHEMAT portalu z etykietą
> epokową z ticka (Davies 2020 dla ≤35 ka; Rabassa 2008; Hein 2009 = GPG tylko Matuyama);
> Antarktyda = kotwica ≈ „dziś” (ICE-6G_C 0 ka) z notką RAISED/Bentley 2014.

Powyższa tabela pozostała jako dokumentacja interpretacji okresów (np. co obejmuje
„penultimate glacial maximum”); o bieżącym, wyświetlanym przekroju decyduje globalna
chronologia `env.js` — jej etykiety i źródła widać w karcie fazy i tooltipach.

Źródła rekonstrukcji: DATED-1 (Hughes i in. 2016, *Boreas*) — Eurazja < 30 ka;
**NADI-1** (Dalton i in. 2023, *Quat. Sci. Rev.* 321:108345; Zenodo 10.5281/zenodo.8161764) —
Ameryka Płn. 25–10,5 ka (następca Dalton i in. 2020, wiek kalendarzowy);
**PATICE** (Davies i in. 2020, *Earth-Science Reviews* 204:103152; Mendeley Data 10.17632/ztz59y79vv.1) —
Ameryka Płd.: empiryczny Lodowiec Patagoński 35–10 ka (bazowy zasięg z 58 823 form geomorfologicznych
i 1669 datowań), rozpad PIS na masywy po 15 ka, readvance w Antarctic Cold Reversal (13 ka),
współczesne lodowce 2011 AD (plamy ≥10 km²); w przekrojach ≥40 ka Q19 obejmuje SA tylko w 45 ka
i Gauss — tam dane z pliku, w stadiałach schemat portalu z etykietą, w interstadialiach MIS 5 stan jak dziś;
**glacjacje górskie Australazji** (audyt „dawaj Australię i okolice”): Tasmania 1085 km² w LGM
(Colhoun & Barrows 2011 — rozdział w Ehlers/Gibbard/Hughes, 2 wyd.), kontynent zaledwie 12–15 km²
(masyw Kosciuszki; Barrows i in. 2001, *Quaternary Research* 55:179–189; maks. ~19 ka kosmogenicznie —
najmniej zlodowaciały kontynent świata), Nowa Gwinea >3400 km² ciągłego pola Mt Jaya–Star Mtns
(Prentice i in. 2011) + czapolód Giluwe 188 km² z 4 glacjacjami Gogon 293–306 ka → Tongo >20,3–11,5 ka
(Barrows i in. 2011, *Quat. Sci. Rev.* 30:2676–2689); Barrows i in. 2002 (*QSR* 21:159–173) —
maks. 17–20 ka i **brak readvance w ACR/mł. dryasie** (w przeciwieństwie do Atlasu!);
Starsze stadiały: wcześniejsze maksima Tasmanii 4000–5000 km² (wcz. pljst. ~7000; Kiernan 1990: ~6000);
„dziś”: Puncak Jaya ~0,2 km² POMIAR (BMKG/Permana, 2022–24; 1850: ~19,3 km²; zanik prognozowany do ~2030);
**Nowa Zelandia** (audyt „teraz Nowa Zelandia”): największa górska glacjacja płk. płd. poza Andami —
Σ ~40 tys. km² w LGM (Porter 1975; Barrell 2011; Golledge i in. 2012, *QSR* 61), nadane 7 sektorom
wyspy Płd. (West Coast, Rakaia, Rangitata, **Waitaki** ~10,5 tys., Clutha, Fiordland, NW Nelson)
+ Ruapehu/Tongariro na wyspie Płn. (Eaves & Brook 2020); podpis późnoglacjalny NZ: cofka od ~18 ka
(Putnam i in. 2013, *QSR* 62:114), **ACR = readvance ~13 ka** (Putnam i in. 2010, *Nat. Geosci.*
3:700) ale **młody dryas = cofka** (Kaplan i in. 2010, *Nature* 467:194 — do 11,5 ka niemal stan
dzisiejszy); MIS 4 ~65 ka = **Southern Glacial Maximum** (Schaefer i in. 2015, *QSR* 114:410 —
największy stan z 130 tys. lat, w portalu ~1,15× LGM), MIS 3 ~42 ka (Kelley i in. 2014, EPSL);
„dziś”: **POMIAR 794 ± 34 km² / 2 918 lodowców** (Baumann i in. 2021, *J. Glaciol.* 67:7–24,
stan 2016; 1978: 1 158 km² — Chinn 2001) + Ruapehu 3,0 km² (Eaves & Brook 2020);
**Antarktyda** (audyt „to jeszcze Antarktyda”): statyczny schemat portalu podmieniony na
**DANE modelowe ICE-6G_C (VM5a)** (Argus, Peltier, Drummond & Moore 2014, *GJI* 198:537,
doi:10.1093/gji/ggu140; Peltier, Argus & Drummond 2015, *JGR Solid Earth* 120:450) —
maski siatki 1° (sftgif ≥ 50%) dla 26/21/17,5/15/13,5/12/10,5/0 ka: w LGM lądolód
ugruntowany przy krawędzi szelfu wokół niemal całego kontynentu (~15,2 mln km²; dziś ~14,2),
redukcja maski w modelu 15→10,5 ka (15,20→14,33 mln), do ticków dobierany najbliższy przekrój;
dla porównania rekonstrukcja empiryczna **RAISED** (Bentley i in. 2014, *QSR* 100:1–9) ma
start cofki ~18 ka i szybszą deglacjację niż maska 1° — różnica opisana w notkach fazowych.
Technicznie: pierścień dla mapy Leaflet rozcinany po antymeridianie (±180°, bez skoków),
clamp Mercatora −84,9, krawędzie |Δlon| ≤ 90°; dla globusu osobny wariant **rings_globe** —
poligon z wierzchołkiem biegunowym wg RFC 7946 (bez „akordów” i dartów przez
półprzezroczysty wypełniacz), obrys pomijany dla tej warstwy na globie. Fazy głębokie
(≥ MIS 3) zostają na niezmiennym schemacie portalu — model czasorozróżnia tylko 26–0 ka;
Batchelor i in. 2019 (*Nature Communications* 10:3713, OSF osf.io/7jen3) — półkula płn.
2,75 mln–30 ka (18 przekrojów, patrz `js/data/ice_quat.js`); Ehlers & Gibbard 2004/2011
(podstawę dla schematów LGM poza DATED-1 w `js/data/paleo.js`); marginesy w Polsce:
dokładne linie z pliku portalu (kanon danych).

## Biomy i ekotypy — 56 migawek 0–3,3 mln lat

Druga warstwa globalna po lądolodzie: **rzeczywista siatka biomów 0,5° (28 klas BIOME4,
720×360)** zamiast dawnego schematowego tintu Europy. Zbudowana wyłącznie z publikowanych
zestawów + jednego jawnego MODELU portalu (z walidacją), a skalibrowana **punktowymi
danymi pyłkowymi** — zgodnie z zasadą: żadnych schematów tam, gdzie są dane; model zawsze
z etykietą źródła (tooltip + legenda + „O danych”).

| Odcinek osi | Źródło | Status |
|---|---|---|
| 0–120 tys. BP (56→22 migawki: co 1 ka holocen, co 2 ka dalej) | **Beyer, Krapp & Manica 2020**, *Sci. Data* 7:236 (BIOME4 na HadCM3+HadAM3H, korekcja do współczesności; maski lodu ICE-6G_C per migawka) | MODEL opublikowany |
| 121–799 tys. BP (co 1 ka; u nas: ticki+przecięcia) | **Krapp, Beyer, Edmundson, Valdes & Manica 2021**, *Sci. Data* 8:228 (statystyczny emulator HadCM3, bias-corrected) | MODEL opublikowany |
| 0,81–3,3 mln BP (15 migawek) | klimat **PALEO-PGEM-Series** (Barreto, Holden, Edwards & Rangel 2023, *GEB* 32:1034–1045, CC-BY 4.0) + **klasyfikator regułowy portalu HG-lite v0.6** (sam bioclim bio1/5/6/12/15/16/17 → 28 klas, reguły na wzór BIOME4) | **MODEL portalu** — etykieta wszędzie |
| kotwice 0k / 6k / 18k(¹⁴C) | **BIOME 6000 v4.2** (Prentice 2000; Harrison 2001; Bigelow 2003; Pickett 2004 + syntezy regionalne; PMIP2/BRIDGE): 9 948 / 1 794 / 318 stanowisk | **DANE pomiarowe** — rysowane punktowo dokładnie tam, gdzie są |

Kluczowe właściwości:

- **jedna taksonomia** (BIOME4, 28 klas) i jedna paleta we wszystkich źródłach → przeloty
  po osi bez zrywów kolorystycznych; **klasa 28 (lądolód) osadzona w rastrze dokładnie
  według `envTickForBP`** (build czyta `env.js` tym samym algorytmem co portal) → biom
  nigdy nie „najeżdża” na lód ani go nie ujawnia pod spodem;
- **wybór migawki = najbliższa na osi**; legenda (prawy dół) pokazuje klasy obecne
  w bieżącej migawce + źródło epoki; na mobile legenda = zwijany pasek (nie kradnie tapów);
- **tooltip pikselowy** (hover): nazwa biomy po polsku + pełna etykieta MODEL z cytatem;
  przy kotwicach informacja o obecności stanowisk BIOME 6000 (🌾, osobna warstwa w kontrolce);
- **HG-lite — uczciwa walidacja** (`tools/check_biomes.py` → `biome_report.json`):
  zgodność **grup** biomowych z Krapp2021 na współczesność (0 ka, gdzie oba pokrywają
  ten sam glob) = **68% komórek lądowych globalnie**; Amazonia 99%, Polska 97%, Kongo 84%,
  Syberia 84%, Sahara 77%, Indie 73%; słabiej: mokra umiarkowana Patagonia 17% (Nothofagus
  poniżej rozdzielczości reguł), Tybet 62% (uśrednianie wysokości w komórce 1°),
  Europa Zach. 64% (gradient oceaniczny). Warstwa tego nie ukrywa — pełny raport w repo;
- **uczciwe rozbieżności źródeł też zostają**: Beyer2020 dla LGM daje nad Polską tajgę
  (sygnał modelowy HadCM3 bez aerozolu pyłowego); pyłkowe kotwice 18k pokazują tam tundry/stepy
 -tundrowe — obie informacje są na mapie jednocześnie i NIE są ze sobą mieszane;
- dane: `js/data/biome/*.png` (56 plików indeksowanych, ~1 MB łącznie) + `biome_meta.js`
  + `biome_pollen.js`; producent: `tools/build_biomes.py`; audyt danych: `tools/check_biomes.py`;
  surowe .nc nie są trzymane w repo (≈3 GB) — przywracanie: `bash tools/fetch_biodata.sh`
  (12/12 assertów regionowych i sanity); audyt E2E: `tools/biomeshots.js` (45/45) +
  sekcja **XXI** w `tools/ice.science.suite.js` (8/8).

### Źródła globalne

Zrealizowane:
- ✅ **DATED-1** (Hughes i in. 2016, *Boreas*; PANGAEA 10.1594/PANGAEA.848117) — Eurazjatycki
  kompleks lądolodowy co 1 tys. lat dla 25–10 ka (+ 27, 28–29, 30–32, 35–38 ka), linia
  „most credible”, transformacja LAEA→WGS84 + uproszczenie (`tools/build_ice_dated.py`);
  margines w Polsce wszycany verbatim z `zlodowacenia_biomy.csv` (leszczyńska, poznańska,
  pomorska; lob gardzieński jako osobny poligon — DATED-1 nie pokrywa go),
- ✅ **ETOPO2v2** (NOAA/NCEI, domena publiczna) — siatka 2′; wyschnięty szelf wycięty
  progami eustatycznymi −5…−125 m (`tools/build_paleocoast.py`), z dziurami basenowymi
  i rozwiązaną linią zmiany daty na poziomie siatki.
- ✅ **Beyer, Krapp & Manica 2020** (*Sci. Data* 7:236; figshare „pastclim”) — biomy BIOME4
  0–120 ka (migawki 0,5°, lód ICE-6G_C wbudowany); źródło warstwy biomów na holocen+
  deglacjację+MIS 3–5d (`tools/build_biomes.py`),
- ✅ **Krapp, Beyer, Edmundson, Valdes & Manica 2021** (*Sci. Data* 8:228) — emulator
  HadCM3/BIOME4 co 1 ka do 799 ka (0,5°); źródło biomów głębokiego plejstocenu,
- ✅ **Barreto, Holden, Edwards & Rangel 2023** (*Global Ecology and Biogeography*
  32:1034–1045, doi:10.1111/geb.13683; figshare 10.6084/m9.figshare.20379663, CC-BY 4.0) —
  PALEO-PGEM-Series: bio1/5/6/12/15/16/17 co 1 ka do 5 mln lat (1°) → klasyfikator
  HG-lite v0.6 portalu dla ≥810 ka (MODEL etykietowany, walidacja 68% grup @0 ka),
- ✅ **BIOME 6000 v4.2** (Prentice/Harrison/Bigelow/Pickett i syntezy regionalne;
  PMIP2/BRIDGE) — 12 060 rekordów punktowych (0k/6k/18k-¹⁴C) jako warstwa-kotwica
  DANYCH (🌾) przy migawkach 0 / 6 / 21,5 ka.

Kolejność dalszych prac:
- ✅ **Batchelor i in. 2019** (*Nature Communications*) — ZREALIZOWANE (18 przekrojów,
  patrz sekcja „Globalna chronologia środowiskowa”),
- ✅ **NADI-1** (Dalton, Dulfer, Margold i in. 2023, QSR 321:108345; Zenodo
  10.5281/zenodo.8161764) — ZREALIZOWANE: 7 przekrojów deglacjacji Ameryki Płn.
  (25/22/18/15/13,5/12,5/10,5 ka, wariant OPTIMAL) w miejsce schematu; następca
  Dalton i in. 2020, którego pierwotnie planowano. Do rozważenia: warianty MIN/MAX
  jako nakładka niepewności oraz Grenlandia z danych (poza NAISC),
- ✅ **PATICE** (Davies i in. 2020, *Earth-Science Reviews* 204:103152; Mendeley
  10.17632/ztz59y79vv.1) — ZREALIZOWANE: Lodowiec Patagoński z danych — przekroje
  35/30/25/20/15/13/10 ka przypięte do ticków (27→25, 21,5→20, 17,5→15, 15→15, 13,6/12,3→13,
  10,5→10) + inwentarz współczesny 2011 AD; 35/30 ka także w przekrojach Q19 (q_35ka/q_30ka).
  Do rozważenia: jeziora przylodowcowe (Glacial_lake_*ka.shp) jako nakładka hydro oraz
  linie niepewności marginesu (limit_uncertainty_*ka.shp),
- ✅ **glacjacje górskie płk. południowej** — ZREALIZOWANE: Afryka (4 masywy),
  Australia + Nowa Gwinea + Tasmania (Sudirman >3400 km² / Giluwe 188 / Tasmania 1085 w LGM /
  Kosciuszko 12–15) oraz **Nowa Zelandia** (Σ LGM ~40 tys. km², 7 sektorów wyspy Płd. +
  Ruapehu/Tongariro; ACR-readvance ale YD-cofka; MIS 4 = Southern Glacial Maximum; „dziś”
  POMIAR 794 ± 34 km² wg Baumann 2021) — wszystkie jako schemat kształtu z powierzchniami
  i chronologią cytowanymi z publikacji. Efekt uboczny: portal pokazuje TERAZ trzy odmienne
  wzorce późnoglacjalne płk. płd. (Atlas YD↑, region australijski YD↓, NZ ACR↑/YD↓),
- ✅ **ICE-6G_C (VM5a) — Antarktyda z danych** (audyt „to jeszcze Antarktyda”) — ZREALIZOWANE:
  maski lądolodu 26/21/17,5/15/13,5/12/10,5/0 ka z modelu GIA Argus i in. 2014 (GJI 198:537)
  + Peltier i in. 2015 (JGR 120:450), siatka 1°, sftgif ≥ 50% — w miejsce statycznego
  pierścienia schematu we WSZYSTKICH przekrojach deglacjacji i przy „dziś”; LGM: ugruntowanie
  przy krawędzi szelfu, 15,2 mln km² (dziś 14,2); por. rekonstrukcja empiryczna RAISED
  (Bentley i in. 2014, QSR 100:1–9). Technicznie: rozcięcie pierścienia na antymeridianie
  (mapa, brak skoków ±180°) + wariant rings_globe rozcięty do bieguńskiego wierzchołka
  RFC 7946 (globus, bez „akordów”), clamp −84,9 (granica Mercatora), |Δlon| ≤ 90° wszędzie.
  Fazy głębokie (≥ MIS 3): dalej schemat portalu (model czasorozróżnia tylko 26–0 ka).
  Do rozważenia: maski ICE-6G_C dla Grenlandii i płn. półkuli (jako alternatywa/dopełnienie DATED/NADI),
- **PMIP4 / PaleoMIST** — maski LGM; **BIOME 6000** — globalne rekonstrukcje biomów,
- precyzyjna batymetria GEBCO + regionalne krzywe eustatyczne (z GIA) dla szelfów,
- rozszerzenie bazy stanowisk na Afrykę/Eurazję dla faz głębokich (3,3 mln–800 tys.) —
  kamienie milowe ♦ są już na osi; kolekcja stanowisk wg tych samych CSV.

## Mechanizmy gotowe na przyszłość

- **Skala światowa**: rdzeń i `sasiedzi_zagraniczne.csv` mają ten sam schemat
  (id, lat/lon, od/do calBP, kultura) — kolejne kraje to tylko kolejne CSV/wiersze,
- **Granice historyczne**: warstwa granic jest osobnym przełącznikiem — docelowo lista
  zbiorów `{od_calBP, do_calBP, geojson}` ładowana jak dzisiejsze granice,
- **Kolory kultur**: spójna taksonomia 26 kultur (`tools/build_data.py`) — 146 wariantów
  zapisu sprowadzonych do wspólnych identyfikatorów; łatwo dopisać kultury nowych regionów,
- **Duplikaty**: rekordy `DUPLIKAT` (PM-094→PM-030, PM-099→PM-142, PM-128→PM-127 —
  z pola `uzytek_portal`) NIE są rysowane na mapie, nie liczą się w legendzie ani obszarach
  kultur i nie występują w wyszukiwarce; ich karty pozostają dostępne (chipy „powiązane”)
  i pokazują baner z odnośnikiem do rekordu wiodącego.

## Wyszukiwarka i filtry stanowisk

Panel **„Szukaj · legenda”** (lewy dolny róg mapy) łączy wyszukiwarkę, filtry i legendę:

- **fraza** szuka po: nazwie, miejscowości/gminie/powiecie/województwie, regionie,
  zapisie kultury (także w opisach sąsiadów — np. „Trzebnica” znajdzie też Bilzingsleben,
  którego opis odwołuje się do Trzebnicy), dacie opisowej, ID (np. `PM-030`) i kraju,
- **4 filtry**: kultura (26), typ stanowiska, hominina, status weryfikacji — działają na
  markery mapy + liczby w legendzie + obszary kultur (hulle liczone z przefiltrowanych),
- **lista wyników**: kolor kultury, wiek; wyniki spoza bieżącej epoki są wyszarzone —
  kliknięcie przesuwa oś czasu do epoki stanowiska, otwiera kartę i przybliża mapę,
- legenda pokazuje licznik punktów na mapie; kliknięcie kultury w legendzie synchronizuje
  się z filtrem (i odwrotnie). Rekordy-duplikaty są z indeksu wykluczone.

## Znane ograniczenia MVP

- treść Tomu I renderowana prostym konwerterem markdown (bez przypisów/ilustracji, jeśli są w planach),
- plik `slownik_kategorie.csv 2.json` był uszkodzony (zawierał komunikat błędu pobierania) —
  kategorie słownika odtworzono z samego słownika,
- wartości pola `kierunek_ladolodu` mają w CSV częściowo formę roboczą (`polnoc_silna_recesja`)
  — na karcie fazy tłumaczone na opis („margines na północy — silna recesja”).

## Testy

Automatyczne zestawy E2E (Chromium headless):
- **bateria jedną komendą:** `bash tools/run_tests.sh` — **najpierw kontrakt danych** (`node tools/validate_data.js`,
  53 kontrole, <1 s, bez przeglądarki), potem 6 suit w Chromium (hermetycznie: brak internetu
  nie czerwieni baterii, ale każda odpowiedź ≥400 dla **własnych** zasobów jest błędem — asercje `1.1b`/`M7.2b`).
  Ścieżki przeglądarki i puppeteera ustawia się przez `PA_CHROME` / `PA_PUPPETEER` (domyślnie
  `/usr/bin/chromium` i `/tmp/pptr/node_modules/puppeteer-core`) — to warunek CI (T0.2),
- **CI:** `.github/workflows/ci.yml` — każdy push i pull request uruchamia kontrakt danych,
  kontrolę świeżości stempla i pełną baterię w przeglądarce (wcześniej wszystko ręcznie),
- **desktop: 113 testów** (`tools/e2e.suite.js`) — start bez błędów, 19 segmentów osi (17 + 2 głębokie),
  9 kamieni milowych ♦, globalna chronologia: ≥45 przekrojów ENV i ≥90 pkt krzywej morza,
  18 kluczy lądolodu Q19 (Batchelor), ewolucja lodu wewnątrz fazy 1 (MIS 20→MIS 16/12),
  splice linii Sanu/Warty w geometrii Q19 (punkty verbatim), DANE_PORTALU dla MIS 8,
  interpolacja poziomu morza, etykiety „mln lat temu", Δ-wiek najbliższego przekroju,
  tryb paleo (1426 poligonów lądów + 1420 linii-ducha), zero stanowisk na „dziś", animacja,
  klawiatura, karta stanowiska z sekcjami Co wiemy/Czego nie wiemy, nawigacja po powiązanych ID,
  filtr kultur, przełącznik paleo, **wyszukiwarka i filtry** (fraza, 4 selecty, duplikat poza indeksem,
  baner karty duplikatu z linkiem do rekordu wiodącego, synchronizacja legenda↔select, kierunek
  lądolodu po polsku bez surowych kodów), Tom I/słownik, brak 404,
  **bramka v1.0 (10.1–10.14):** meta description/theme-color, OG komplet (obraz 1200×630 + alt),
  brak og:url/canonical przed decyzją o hostingu, ikony 192/512/180, `manifest.webmanifest`,
  skip-link (Tab → #main), focus-visible na polu szukania, komplet ARIA (aria-current/pressed/
  expanded, role=button w legendzie), obsługa Entera w legendzie, nota prywatności podkładów,
  spójność „O danych", brak martwej asercji rastra biomów (1.9 sprawdza faktyczny `<img>`
  zamiast nieistniejących „svg path"), **regresja pyłku** (pyłek OFF → zmiana epoki → zoom
  bez TypeError) i **prefers-reduced-motion** (brak zoom/fade, skok zamiast lotu),
- **mobilne: 37 testów** (`tools/e2e.mobile.suite.js`, 390×844 + dotyk) — **regresja
  antypołudnika** (żaden poligon nie skacze > 170° dł. geogr. — ochrona przed „pasem
  Norwegia–Grenlandia"), karta fazy zwinięta domyślnie i rozwijana dotykiem, legenda
  zwinięta/rozwijana, **wyszukiwarka na dotyk z otwarciem dolnej szuflady**, etykiety
  podziałki bez nakładania, animacja na dotyk, panel stanowiska jako dolna szuflada,
  brak poziomego scrolla,
  **M11 (bramka v1.0):** pola wyszukiwania i selecty ≥16 px (koniec autozoomu iOS), karta fazy
  nie wchodzi pod kontrolkę warstw ani zoom (≤430 px), cele dotyku (nagłówek legendy 40 px,
  przycisk osi 40 px), skip-link z klawiatury (Tab → widoczny, Enter → #main),
  **regresja renderingu lodu na iOS** (lód „znikał całkowicie" — ogromne jednościeżkowe SVG
  przekrojów Q19 przekraczały limit Safari; fix: renderer **canvas** dla warstw ląd/duch/lód/
  szelfy — testy próbkują piksele canvasu: w epokach zlodowaceń lód jest namalowany,
  w interglacjalu nad Polską — poprawnie — go nie ma),

- **walidacja naukowa lądolodu: 170 asercji** (`tools/ice.science.suite.js`) — dwadzieścia warstw:
  I. inżynieria danych (zakresy współrzędnych 67 tys. pkt, domknięcie pierścieni OGC,
  brak skoków antypołudnika, źródło src + nazwa w każdym poligonie, DOI/cytowania w nagłówkach);
  II. chronologia (54 przekroje rozwiązują się do geometrii, okna pięter bez nakładania,
  interglacjały = zbiór „now”, wzrost lodu pliocen<Gauss<Matuyama, krzywa morza: zakres fizyczny
  + **16 kotwic literaturowych** — LGM −125±5 Lambeck 2014 PNAS; Eem +4…+9 Dutton & Lambeck 2012;
  MIS 12 ≈ −100 Rohling 2009; pliocen +5…+25 Miller 2020/PRISM m.in., tol. 12 m);
  III. **kontrprzykłady per epoka** (25): pliocen bez lodu w Europie; Gauss „limited” 1,5–2,5× dziś;
  Matuyama ≥2,8× dziś; MIS 18/24 (okna) 2,8–4× dziś; MIS 12: max + linia Sanu ≤49,5°N;
  MIS 6: Warta ≤51,2°N i ≥115% pow. MIS 12 (Batchelor fig.5); MIS 8: Batchelor poza PL (−0),
  lob Odry wg portalu ≤52°N + notka o rozbieżności; MIS 5d/4: sekwencja Herning→Kastrup;
  MIS 3: wariant 40ka ≪ 45ka (Ålesund); deglacjacja E-Hol≪YD≪B-A≪Pomorska≪Poznańska≪LGM
  (obszary DATED-1) i marginesy PL 51,8→52,4→53,1°N; mł. dryas: Salpausselkä ≤61,5°N w S Finlandii;
  IV. kanon: **35/35 punktów z 7 linii brzegowych CSV verbatim** w geometrii;
  V. UI: tooltipe cytują Batchelor 2019 + OSF osf.io/7jen3, pasek fazowy pokazuje Δ i notki
  (rozbieżność MIS 8, SCHEMAT-analog, okno piętra), lód rysowany/nie zgodnie ze stanem epoki (canvas);
  VI. NADI-1: 7/7 zestawów deglacjacji z danymi, 430 pierścieni domkniętych/bez antypołudnika,
  drabina powierzchni NA netto 2585 < 2813(LGM) > 2703 > 2349 > 1894 > 1638 > 1272 deg²,
  scalenie NAISC w 22 ka (99,3% w dominancie), margines płd. 39,5→47,2°N (LGM→10,5 ka),
  Grenlandia w zestawach NADI = **ICE-6G_C** (1 wpis src=ICE6G na zestaw; warstwa opisana w tooltipie);
  VII. Azja: brak statycznego boksu „Tajmyr” w zestawach deglacjacji (DATED-1 zdeglacjował Tajmyr
  do ~15 ka), NE Azja w LGM = empiryczne rdzenie Wierchojańska z GLACIMONTIS (52 deg² ≪ 0,4×
  MIS 6 (218) i MIS 4 (163), Batchelor 2019: LGM ≪ MIS 4/6), schematyczne boksy „NE Azja”
  i „Tibet i Himalaje” podmienione danymi w fazach deglacjacji (etykieta SCHEMAT tylko w MIS ≥3),
  Beringia sucha (0 pierścieni w korytarzu 59–64,5°N/166–162°W);
  VIII. PATICE: 8 przekrojów + inwentarz „dziś” zarejestrowane; Σ-km² zgodne z DBF (±4%;
  35 ka = 490 tys. km² vs 492,6 publik.) i drabina 464>358>120>115/115>63>21 tys. km²
  (27→„dziś”); ACR: mł. dryas = 95,7% wartości 15 ka (stabilizacja/readvance, nie załamanie);
  anatomia LGM: 38,0°S–55,5°S, zachód ≤ −75,7°W; po 15 ka rozpad na ≥6 masywów (SPI/NPI w nazwach);
  „dziś” 20,8 tys. km² w 273 ringach; q_35ka wyłącznie PATICE, q_45ka wyłącznie Q19 (bez podwójnego
  rysowania), interstadialia MIS 5 bez lodu SA, MIS 6 fallback z etykietą „SCHEMAT portalu”;
  tooltips LGM: trzy warstwy DANE naraz (DATED-1 + NADI-1 + PATICE), render z6: LGM 7,7% px,
  15 ka 3,1%, YD 3,0% (ACR widoczne), dziś 0,7%;
  IX. Afryka: Rift Wsch. z GLACIMONTIS (Chen 24–32 ka; Osmaston 17–20 ka + okno nieustalone)
  — ≥2 rekordy w przedmaksymalnym/poznańskiej, ≥1 w pomorskiej/B–A, zero dysków Riftu po podmianie,
  Σ LGM ∈ [150, 550] km²; Atlas: LGM/przedmaksymalny = Hannah 2017 (~31 km², Toubkal), od poznańskiej
  = narracyjny schemat z **readvance YD > B–A** (¹⁰Be 11–13 ka, Fink 2014 — cytat w nazwie dysku);
  YD = 3 szczere dyski E-Afryki; „now” = 3 masywy z POMIARU (Σ 1–6 km²); q_lgm = PA_AFRYKA_LGM
  (dane), starsze q-stadiały = schemat, MIS 5 = 0; piksele z8: LGM Kilimandżaro ≥10× „dziś”;
  X. Australia/Nowa Gwinea/Tasmania: LGM w całości z DANYCH — Tasmania 16 rekordów
  (Barrows 2002; Colhoun & Barrows 2011), dominujący rekord ∈ [800, 1800] km² (czapa 1085 + satelity),
  Snowy Mountains dokładnie 1 rekord ≤ 30 km² (Barrows 2001 — najmniej zlodowaciały kontynent),
  Nowa Gwinea ≥3 rekordy (Prentice 2005/2011; Peterson 2004); Σ NG: poznańska ∈ [0,3×, 0,65×] LGM
  + rekord sięgający pomorskiej (Giluwe ~15,4 ka — Barrows 2011); po oknach = narracyjny schemat:
  **region (Tasmania) YD < B–A** (brak readvance — Barrows 2002) przy jednoczesnym YD > B–A Atlasu;
  „now” = wyłącznie Puncak Jaya POMIAR 0,2 km² (Tasmania/kontynent: 0); piksele z6
  Nowa Gwinea LGM ≥15× „dziś”, Tasmania LGM ≥ 2,5× pomorskiej; tooltips z Prentice/Barrows/Colhoun;
  XI. Nowa Zelandia: 35 rekordów GLACIMONTIS w LGM (Barrell 2011 i in.; Σ jak w literaturze
  ~40 tys. km² — Porter 1975/Golledge 2012) + 13 w poznańskiej; rzadkie okna (pomorska/B–A/YD)
  = 9 świadomych dysków: **ACR-podpis: B–A ≈ pomorska (readvance ~13 ka wg Putnam 2010),
  mł. dryas < B–A (cofka wg Kaplan 2010, Nature 467:194)** — trzy wzorce późnoglacjalne SH
  w jednym portalu (Atlas YD>B–A, Tasmania YD<B–A, NZ ACR-stabilizacja);
  „now” = POMIAR 794 ± 34 km² (Baumann 2021) + Ruapehu 3 km²; q_lgm = PA_NZ_LGM (dane),
  MIS 4/6 = Southern Glacial Maximum ~44 tys. km² (Schaefer 2015 — schemat), MIS 5 = 0;
  piksele z5 wyspy Płd.: LGM ≥0,15% px i ≥20× „dziś”.
  XII. Antarktyda (ICE-6G_C VM5a): 8 przekrojów 26–0 ka zarejestrowane (src ICE6G);
  ringi mapy domknięte, lat ≥ −84,9, zero skoków antypołudnika (|Δlon| ≤ 90°) +
  rings_globe jako poligon RFC 7946 z wierzchołkiem biegunowym; powierzchnie
  renderowanych ringów 13–14 („dziś”) i 14–15 (LGM) mln km²; stosunek LGM/dziś ∈
  [1,03, 1,15], cofka monotoniczna 15→0 ka (15,20→13,20 mln po clampie); splice
  dokładnie do 8 kluczy degla+„now” (mis3/eem schemat nietknięty); ICE6G_SRC z
  DOI ggu140 + 2014JB011176 i wzmianką RAISED/Bentley 2014; q-przekroje ≥ MIS 4
  dostają Antarktydę „dziś” z DANYCH (nie schematu); tooltipy LGM z pełnym cytatem;
  piksele z2: czapa ≥1,5% px w LGM i „dziś”, LGM ≥ 0,95× dziś;
  XIII. GLACIMONTIS (fale 1+2): 641 rekordów src=GLACIMONTIS z cytatem i oknem wieku;
  Tatry: Zasadni & Kłapyta 2014 Σ ~246 km² (opublikowane ~280), okno przedmaksymalny+lgm,
  centroid w Tatrach; Wierchojańsk: Barr & Clark Σ ~48 tys. km² w LGM; etykieta HIPOTEZA sporna
  tylko dla Kuhle/Shangzhe/Kamp (Kuhlemann poprawnie niewrazony); piksele: Tatry z7 LGM ≥ 1,4× pomorskiej;
  XIV. Grenlandia (ICE-6G_C): 8 przekrojów 26–0 ka, ring domknięty w boksie bez Islandii;
  „dziś” 1,74 mln km² (rzecz. ~1,71), LGM ~2,50 mln (×1,44); splice do 8 kluczy degla+„now”;
  notki fazowe z Lecavalier & Peltier; NADI-1 nietknięty; tooltip z pełnym cytatem ggu140;
  XV. Wyspy Brytyjskie (BRITICE-CHRONO, PANGAEA 945729): 4 przekroje optimum 27/21/18/15 ka w
  sektorze BIIS (klip −13…11,4°E / ≤61,4°N; kontekst FIS/BKIS odcięty); Σzgodne z Clark 2022
  (maks. 0,73–0,79 mln km²; 18 ka < 21 ka; 15 ka ≪ 18 ka o ~66%, geografia: margines na krawędzi
  szelfu celtyckiego, nic powyżej Shetland); splice w 4 fazach + **boling–allerod z zerowym
  lodem brytyjskim**; mł. dryas = DATED-1 12 ka (Loch Lomond); tooltipy cytują PANGAEA 945729 +
  Clark 2022 (Boreas); piksele z6: LGM 33,9% vs B–A 4,5%;
  XVI. GLACIMONTIS fala 2 (inżynieria podmiany): JEDNO ŹRÓDŁO na grupę×fazę — w żadnej fazie
  grupa nie ma jednocześnie rekordu i dysku; reguła MIN_COUNT chroni narracje rzadkich okien
  (NZ w pomorskiej/B–A/YD = 9 dysków, Atlas od poznańskiej = 2); LGM = zero dysków wszystkich
  grup; poznańska — pełna podmiana poza Atlasem (Hannah 19–25 ka); Hughes 2021 (Atlas, 50,2 ka)
  poza fazami 11,7–30 ka — projektowo nieobecny; q-przekroje: PA_NZ/AUS/AFRYKA_LGM = poligony;
  XVII. PATICE-LAKES: 7 przekrojów jezior 10–35 ka, 49 zbiorników ≥40 km², ringi domknięte
  w sektorze Patagonii; krzywa objętościowa 25→13 ka monotoniczna do piku Σ ~13,7–13,9 tys. km²
  (**Lago Chalenko 4741 km²** — największe plejstoc. jezioro Ameryki Płd., Thorndycraft 2019),
  załamanie do 3,4 tys. w 10 ka; splice w 7 fazach osi (mapowanie jak lód PATICE), „now” i fazy
  ≥ MIS 4 = 0 jezior; q_35ka/q_30ka doklejane, ≥40 ka nic; woda POD lodem; render z6 (kadr
  Chalenko): 9 warstw w B–A, woda ~0,5% pikseli i ≥1,8× LGM, holocen < B–A, „dziś” ~0;
  tooltip 💧 z pełnym cytatem PATICE (Mendeley ztz59y79vv) + stan wg Thorndycraft i in. 2019;
  XVIII. Warianty BRITICE-CHRONO (niepewność datowań): ICE_BRITICE_VARIANTS = min/opt/max
  × 4 przekroje; ścisłe min < opt < max we wszystkich przekrojach (LGM 0,45/0,77/1,00 mln km²,
  15 ka: max ≈ 2× opt); BRITICE_SET_VARIANT zamienia wpisy w locie — 1/fazę, zero duplikatów,
  zero wskrzeszonych schematów, liczności warstw nie-BIIS bez zmian, referencje ringów żywe;
  ICE_BRITICE = stały alias OPTIMUM; przycisk „🧊 BIIS” zmienia etykietę i warstwę, wariant
  przetrwa zmianę epoki; piksele z7 (Morze Irlandzkie, LGM): 35,0% ≤ 35,6% ≤ 39,1%
  (max ≥ 1,14× min); globus: cache per-wariant, LGM nad Wyspami 16,3/17,0/17,2%.
  XIX. Islandia: RGI 7.0 „dziś” — 568 jęzorów → 9+ nazwanych czap (Σ ∈ [10,7; 11,3]
  tys. km² vs inwentarz 11 060 km²; Vatnajökull ~8 184 km²; ringi domknięte; punkty
  kanoniczne: centrum Vatnajökull i Mýrdalsjökull wewnątrz swoich czap); ICE-6G_C IIS:
  4 przekroje deglacjacji 15/13,5/12/10,5 ka (124,8 → 68,6 tys. km²; statyczność maski
  15→13,5 ka udokumentowana jako mechanika siatki 1°); splice dokładnościowy: pomorska/
  B–A/MD/wcz. holocen = po 1 wpisie ICE-6G i 0 schematów, LGM/starsze = schemat z natury
  empirycznej, Antarktyda/Grenlandia nietknięte; walidacja IcelandICE DB (Goffin i in.
  2026): 37 punktów kal. — 15 ka pokrywa 26/37 (lądowe), 12/10,5 ka = 13, pokrycia
  nierosnące w czasie, punkty morskie 0/7 (maska 1° nie sięga szelfu); piksele z6:
  LGM ≥22%, pomorska ≈ LGM ±20%, mł. dryas ≤ 0,82× pomorskiej (cofka), „dziś” ≤ 0,6×
  LGM lecz ≥4% (czapy RGI malują); tooltipy z pełnymi cytatami: ggu140 (ICE-6G_C) i
  RGI 7.0/NSIDC doi f6jmovy5navz („dziś”).
  XX. Głębokie stadiały płk. płd. (etykiety epokowe): 9 przekrojów ≥40 ka — dokładnie 1 wpis
  PIS, nazwa niesie etykietę ticka ENV + token „SCHEMAT portalu” + cytaty (Davies 2020 dla
  ≤35 ka; Rabassa 2008 dla moren zewnętrznych); klauzula zasięgu ponad-LGM (GPG ~1,09 mln,
  Hein 2009) TYLKO w 4 tickach Matuyamy — gdzie jest udowodniona; Antarktyda we wszystkich
  17 przekrojach Q19 = dokładnie 1 wpis-kotwica z notką RAISED/Bentley 2014, a źródłowy
  wpis fazy „dziś” nie jest mutowany (owijka = kopia przy renderze); w przeglądarce (MIS 4)
  tooltip PIS ma Rabassa/Davies, tooltip Antarktydy — Bentley/kotwica.
  **XXI. BIOMY** (8): BIOME_META 56 epok × 29 klas × 3 źródła; wybór migawki na osi — wszystkie
  56 plików renderuje się overlayem 720×360; klasa 28 osadzona 1:1 z `envTickForBP` (56/56);
  sondy klas przez hit-test pikselowy (dziś/LGM/pliocen — prawda źródeł); kotwice BIOME 6000
  (klucze, liczności 9948/1794/318, tooltip „DANE pyłkowe” + kalibracja ¹⁴C); legenda mówi
  prawdę o pochodzeniu per epoka („MODEL opublikowany” vs „MODEL (portal, HG-lite)”);
  „O danych” zawiera trzy cytaty + HG-lite v0.6 z walidacją 68%; kontrolka warstwy pyłka
  zdejmuje/przywraca punkty,
- **audyt biomów E2E: 45 asercji** (`tools/biomeshots.js`) — meta⇄dysk (56/56 HEAD),
  overlay per epoka, frakcje klas w 15 regionach × 15 epok mierzone pikselami rastra
  W PRZEGLĄDARCE z granicami z literatury (LGM: Sahara pustynia-dominant ≥55%, Amazonia
  las trop. ≥25%, Fennoskandia lądolód ≥90%; AHP w modelu — uczciwie słaba; Eem≈dziś
  międzymodelowo ≥65%; pliocen: Grenlandia bez lądolodu, Sahara nadal pusta; HG-lite
  3,3 mln vs dziś >0,45 — brak absurdu), legenda/tooltip/toggle/„O danych” + klatki
  `shots/bm_*.png` i atlas `shots/atlas_biomy_epoki.png` (27 epok),

Ostatni wynik: **99/99 + 37/37 (mobilne, +M10/M11) + 178/178 + 21/21 + 45/45 + 3–4/4 (perfcheck) zdanych** · audyty kształtu: lód 13 regionów × 6 epok (atlas `atlas_kontynenty_epoki.png`), **ląd 13 × 25 epok — 74/74 M0–M3, z naprawą danych szelfowych v2 (cv2, zagnieżdżenie 0→−125 m)** (atlas `atlas_lad_epoki.png`, `tools/landshots.js`) oraz **biomy: 15 regionów × 15 epok frakcji klas + walidacja HG-lite 68% grup @0 ka (`biome_report.json`)** (atlas `atlas_biomy_epoki.png`, `tools/biomeshots.js`) + migawki kontrolne epok: pliocen, Gauss 2,75 mln,
LGM/Bølling–Allerød/mł. dryas/10,5 ka nad Ameryką Płn. (`tools/nadi.shots.js`),
Azja: LGM vs mł. dryas nad Tajmyrem, MIS 6 nad Wierchojańskiem, Beringia przy LGM (`tools/asia.shots.js`),
Ameryka Płd.: LGM scalony PIS, 15 ka rozpad na masywy, ACR 13 ka, „dziś” inwentarz 2011 AD, 35 ka w przekroju Q19 + globus (`tools/patice.shots.js`),
paleojeziora Patagonii: 25 ka na płn. (Elpalafquen), 20 ka pod scalonym PIS, 15 ka pik — Deseado/Chalenko-CP/Otway-Skyring, 13 ka **Lago Chalenko 4,7 tys. km²**, 10 ka Argentino/Viedma/Tar, „dziś” = kontrola bez warstwy (`tools/patlakes.shots.js`),
Afryka: 4 masywy glacjalne w LGM (E Afryka + Atlas), Atlas w readvance młododryasowym, „dziś” = pomiarowe mikroplamy (`tools/africa.shots.js`),
Australazja: Tasmania w LGM i w MIS 6 (starsze maksimum), Suchy Sam!/Nowa Gwinea LGM (Sudirman+Giluwe, Sahul odsłonięty), B–A vs mł. dryas w PNG (cofka bez readvance), Kosciuszko 15 km² jako kreska, „dziś” Puncak Jaya + globus (`tools/australia.shots.js`),
Nowa Zelandia: LGM 7 sektorów wyspy Płd., MIS 4 SGM ≈1,15× LGM (65 ka), B–A≈pomorska (ACR) vs mł. dryas (cofka), „dziś” POMIAR 794 km² nad Aoraki + globus (`tools/newzealand.shots.js`),
Antarktyda: płk. płd. w LGM i „dziś” z ICE-6G_C, brzeg czapy z4 LGM vs dziś (margines −1°…−2°), B–A 13,5 ka, globus z widokiem od bieguna płd. (`tools/antarctica.shots.js`),
Wyspy Brytyjskie: LGM — BIIS maksymalny zespolony z FIS przez M. Północne, 18 ka — po impulsie zapaści, 15 ka — szczątki, B–A — całkowity brak lodu, mł. dryas — readvance Loch Lomond z DATED-1 12 ka (`tools/britice.shots.js`); warianty niepewności: LGM min/opt/max (margines pd. przesuwa się o setki km) + 27 ka min vs max (`tools/britvarshots.js`),
Islandia: LGM — schemat pełnej pokrywy, 15 ka / 12 ka / 10,5 ka — etapy cofki maski ICE-6G_C, „dziś” — realne czapy z RGI 7.0 oraz Vatnajökull z7 z żebrami lodowcowymi (`tools/icelandshots.js`),
globus: Beringia w centrum + Europa przy LGM — wzrokowo, `tools/globe.suite.js`),
Matuyama, MIS 20/16/12/8/6, LGM, Bølling–Allerød, dziś — sprawdzone wzrokowo).

## Licencja

- **Kod** (HTML/CSS/JS, `tools/*`) — **MIT** — plik `LICENSE`.
- **Treści, dane portalu i ilustracje** — **CC BY 4.0** — plik `LICENSE-TRESCI.md`.
  Warunek: podać autora i źródło („Malwowy, 2026, PaleoAtlas, CC BY 4.0”).
- **Dane z publikacji zewnętrznych** (DATED-1, NADI-1, PATICE, BRITICE-CHRONO, ICE-6G_C,
  RGI 7.0, GLACIMONTIS, BIOME 6000, Batchelor 2019, PALEO-PGEM, ETOPO2v2, Natural Earth)
  zachowują licencje swoich źródeł — zestawienie, oznaczenia i sposób cytowania:
  **`LICENCJE.md`** (6 pozycji oznaczonych ⚠ wymaga potwierdzenia przed publikacją).

## Changelog

- **Audyt seniora — architektura i kontrakt danych (2026-11-10).** Wykonywalny kontrakt
  (`tools/validate_data.js`, 53 kontrole) ładowany **w kolejności z `index.html`** — łapie to,
  czego testy w przeglądarce nie widzą; pierwszy krok `run_tests.sh`. **CI wreszcie istnieje**
  (`.github/workflows/ci.yml`: kontrakt + świeżość stempla + pełna bateria). **Stempel wydania**
  (`js/data/build_info.js`, `tools/stamp_build.py`) — wersja danych w „O danych" i strażnik
  integralności w `app.js` (brak pliku → widoczny pasek „dane niekompletne", test 10.28).
  **Proweniencja pomiarów**: 6 poligonów (Kilimandżaro, Kenia, Ruwenzori, Puncak Jaya,
  Southern Alps, Ruapehu) ma `src: 'POMIAR'` — wcześniej tooltip podpisywał pomiar
  „rekonstrukcją uproszczoną". **Słownik**: odnośniki „zob. też" rozwiązuje się po stabilnym
  `id`, nie po nazwie — 58 martwych odnośników (surowe slugi, pusta lista po kliknięciu)
  naprawione, test 10.25. Zasady w **`DATA_CONTRACT.md`**, raport w **`AUDYT_SENIOR.md`**.
  Bateria: **394 asercje** (113+37+178+21+45), kontrakt 0 błędów / 3 ostrzeżenia (dług).

- **Licencja (2026-11-10, decyzja D2): kod MIT, treści CC BY 4.0 — © 2026 Malwowy.**
  Dodane `LICENSE`, `LICENSE-TRESCI.md` i **`LICENCJE.md`** — zestawienie licencji źródeł
  zewnętrznych (DATED-1, NADI-1, PATICE, BRITICE-CHRONO, ICE-6G_C, RGI 7.0, GLACIMONTIS,
  BIOME 6000, Batchelor 2019, PALEO-PGEM, ETOPO2v2, Natural Earth) z wymaganym sposobem
  oznaczenia przy publikacji. Sześć pozycji oznaczono ⚠ (licencja nie podana w repo —
  **do potwierdzenia na stronach zbiorów przed v1.0**). Sekcja „Licencja i cytowanie"
  w widoku „O danych". Przy okazji: README wciąż opisywało biomy jako „SCHEMAT roboczy" —
  poprawione (to już warstwa modelowa, 56 migawek).
- **Audyt „błędów średniego poziomu" (2026-11-10) — 10 napraw, 6 nowych testów.**
  Raport: **`AUDYT_MID.md`**. Wszystko potwierdzone w działającej aplikacji, nie „z czytania":
  - **Animacja osi grała dalej po wyjściu z mapy.** ▶ → „O danych": w 1,4 s czas przeskoczył
    o 4 tys. lat, przycisk wciąż ⏸, a po powrocie użytkownik zastawał inną epokę. Teraz jedno
    `stopAxisPlay()` wołane z przycisku, ze zmiany widoku i z `visibilitychange` (test 10.19).
  - **`window.__PA.filters` był martwą referencją** — po „wyczyść filtry" nadal pokazywał
    `wilczyce`. `clearFilters()` podmienia obiekt stanu, więc kopia referencji kłamała.
    Teraz getter (test 10.20).
  - **Ctrl+→ przesuwało epokę** (95 → 93 tys. lat) — globalny skrót nie sprawdzał modyfikatorów
    (test 10.21).
  - **Cache klatek globusa ograniczony liczbą, nie pamięcią:** 17 pełnoekranowych canvasów to
    **~79 MB na desktopie i ~173 MB na telefonie** (DPR 3). Teraz budżet **48 MB** dzielony
    między dwa cache, liczba wpisów wyliczana z rozmiaru klatki; `GLOBE._cacheStats()` podaje
    zużycie (test 10.22: 40 MB ≤ 48 MB).
  - **Karta stanowiska bez wyjścia z klawiatury:** Escape zamyka i **oddaje fokus** tam, gdzie
    był (test 10.23).
  - Mniejsze: raster biomów pobierany raz (blokada in-flight), jeden wadliwy rekord nie przerywa
    rysowania mapy (`eachSafe` + jedno ostrzeżenie), guard kontekstu 2D globusa, `rAF` zamiast
    `setTimeout(50)` przy zmianie widoku, **tytuł karty per widok** (test 10.24).
  - Świadomie **nie** zmienione (zmierzone jako nieproblematyczne): podwójne `route()`
    (0 przerysowań), `biomeEpochForBP` ×5 (0,05 ms), sprzężenie globusa przez `__PA.bp`
    (do N3), brak deep-linku do stanowiska (funkcja, nie błąd).
  - **Bateria: 109/109 + 37/37 + 178/178 + 21/21 + 45/45 = 390 asercji.**
- **Audyt „błędów juniora" (2026-11-10) — 12 napraw, 4 nowe testy, ~3× szybsza oś czasu.**
  Pełny raport: **`AUDYT_JUNIOR.md`** (z liczbami i metodą). Najważniejsze:
  - **Wydajność osi czasu (największa znaleziona wada).** Legenda biomów nasłuchiwała
    `layeradd`/`layerremove` na **całej mapie**, więc każdy krok osi (kilkaset dodanych
    warstw) przebudowywał ją od nowa — **29 mutacji DOM na krok**, ~6% czasu. Teraz nasłuch
    jest na grupach warstw + filtr po tożsamości obiektu + sklejanie w jednej klatce:
    **0 zbędnych przebudów**. Dodatkowo paleta klas biomów porównywana kluczem **liczbowym**
    zamiast sklejanego stringa `r,g,b` — w pętli po 259 200 pikselach każdego rastra
    (profil: 15% CPU + 8% odśmiecania), oraz pomijanie zapisu identycznego HTML-a legendy.
    Pomiar (krok = 1 jednostka, przed → po): desktop **13,9 → 5,0 ms**, telefon z 4×
    słabszym procesorem **49,4 → 16,6 ms**, najgorszy skok **602 → 182 ms**.
  - **Odporność startu:** brak jednego z 23 plików danych nie daje już **białej strony** —
    jest komunikat `role="alert"` („Nie udało się wczytać danych atlasu: brakuje SITES…")
    z podpowiedzią o wersji offline. Test **10.16** symuluje brak `sites.js`.
  - **Escapowanie cudzysłowów:** `esc()` obsługuje teraz `"` i `'`, bo jest używane także
    w wartościach atrybutów (`data-pid`, `data-z`), a w bazie jest 10 nazw stanowisk
    z cudzysłowem („laska magiczna"). Test **10.17**.
  - **Nieznana kultura nie wywraca mapy:** `cultOf()` z neutralnym fallbackiem zamiast
    `CULT[...]` w 6 miejscach (jedna zła wartość przerywała rysowanie punktów w połowie).
  - **Liczby w „O danych" liczone z danych** — tekst podawał „26 kultur" (jest 25),
    „140" i „146 wariantów zapisu" równocześnie (jest 268). Test **10.18** blokuje powrót
    ręcznie wpisywanych liczb.
  - **Drobne:** escapowana nazwa w tooltipie pyłków, dymek biomów bierze **najnowszą**
    pozycję kursora (a nie pierwszą w klatce), `alt=""` na rastrze biomów, usunięte martwe
    pole `state.zoomWarnShown`, **favikona z marki** (`assets/icon.svg` + PNG 192) zamiast
    emoji w data-URI (ta sama wada, którą naprawiliśmy w ikonach PWA) — paczka offline
    wbudowuje obie jako data-URI.
  - **Bateria: 103/103 + 37/37 + 178/178 + 21/21 + 45/45** (384 asercje). Czego audyt
    **nie** znalazł (0× `var`, 0× `eval`, brak wycieków globalnych, dane spójne, brak
    wektora XSS) — też jest w raporcie; „N1–N6" to świadomie odłożone optymalizacje.
- **Sprint P0 (2026-11-10) — bramka v1.0 bez decyzji blokujących + dwie znalezione wady.**
  Zrobione to, co audyty PM/PO wskazały jako „agent może od razu" (P0.2, P0.3, P0.5, P0.6, P1.5,
  T1.1) i część P0.4 bez zależności licencyjnej; **P0.1/P0.7 (tag v1.0) czekają na D1/D2**.
  - **Znajdowalność (P0.2):** `index.html` dostał meta description, theme-color, color-scheme,
    pełny pakiet OG (title/description/image 1200×630/alt) + twitter:card, `manifest.webmanifest`
    (ikony 192/512 „any" i „maskable"), apple-touch-icon 180. **`og:url`/`canonical` celowo
    nieobecne** — nie deklarujemy adresu przed decyzją o hostingu (pilnuje tego test 10.3).
    Nowy `tools/build_brand_assets.js` renderuje **obraz OG z samego atlasu** (LGM nad
    Skandynawią + typografia) i ikony z `assets/icon.svg` — bez stocków i bez fontów emoji
    (w środowisku bez fontu emoji ikona „🦣" wychodziła jako puste pole).
  - **Mobile CSS (P0.3):** pola i selecty `16 px` na telefonie (koniec autozoomu iOS), nota
    prywatności podkładów przeniesiona **do rozwiniętej kontrolki warstw** (wcześniej, doklejona
    do kontenera, była widoczna także po zwinięciu i nachodziła na kartę fazy — wykryte przez
    M2.2: dotknięcie karty trafiało w notę), karta fazy `right: 64 px` (nie wchodzi pod kontrolkę
    warstw), zwinięta karta = sam pasek tytułu ≥44 px (BIIS/paleo dopiero po rozwinięciu),
    nagłówek legendy 40 px, legenda 250 px.
  - **A11y (P0.5 + P1.5):** globalny `:focus-visible` (koniec `outline: none` na `#srch-q`),
    skip-link „Pomiń mapę → treść", `aria-current` w nawigacji, `aria-pressed` na przełącznikach
    (paleo, animacja osi), `aria-expanded` (legenda, karta fazy), `aria-label` pól i kontrolek,
    `role="button"` + Tab/Enter w wierszach legendy i wynikach wyszukiwania, `role="img"` na
    globusie, `<noscript>` z opisem treści.
  - **`prefers-reduced-motion` (P0.5):** wyłączony płynny zoom/fade Leafleta (także przy zmianie
    preferencji w trakcie sesji) i „lot" → skok w `flyToPoint`; CSS wyłącza przejścia.
    **Przy okazji złapano własny błąd:** `REDUCED_MOTION` był booleanem (`!!`), więc `.matches`
    było zawsze `undefined` i mechanizm nigdy nie działał — teraz trzyma `MediaQueryList`
    (kontrola: test 10.14).
  - **RUNBOOK.md (P0.6):** jedna strona — podniesienie, wymagania (`PA_CHROME`/`PA_PUPPETEER`),
    bateria, paczka offline, przebudowa danych + weryfikacja diffu, brand assets, checklist
    wydania, deploy statyczny (CF/GH Pages, nagłówki), troubleshooting, mapa dokumentów.
  - **`tools/requirements.txt` (T1.1)** z pinami + `tools/run_tests.sh` (jedna komenda, hermetyczna;
    `PA_STRICT_PERF=1` czyni perf bramką).
  - **BUG (znaleziony przy generowaniu obrazu OG, nie z audytu):** po wyłączeniu warstwy
    „Kotwice pyłkowe" i wejściu w epokę z kotwicami każdy zoom kończył się
    `TypeError: … reading '_animatingZoom'` — renderer `L.canvas` pyłka powstawał w grupie
    odpiętej od mapy, a `refreshCanvasRenderers` wołał `_update()` bez sprawdzenia `_map`.
    Naprawione strażnikiem; dodana **stała regresja 10.11** (odtwarza dokładnie ten stan).
  - **BUG w testach (martwa asercja):** `1.9 biom kontynentu narysowany` liczyła „svg path"
    w `biomePane`, a biomy to `L.imageOverlay` (PNG 720×360) — asercja była zawsze fałszywa
    i nie mogła wykryć zepsutego rastra. Teraz sprawdza `<img>` + `naturalWidth`.
  - **Hermetyczność baterii:** szum kafelków Esri/OSM/OTM (brak internetu w CI) nie czerwieni
    już suit, ale dodano kontrolę **404 dla zasobów własnych** (`1.1b`, `M7.2b`) — czyli
    „offline" nie ukryje zepsutego pliku danych.
  - **Portability (T0.2, krok 1):** 22 suity i 13 builderów nie mają już zaszytych
    `/home/user/paleoatlas` i `/home/user/biodata` — ścieżki liczą się z położenia pliku,
    źródła przez `PA_BIODATA`/`PA_UPLOADS`, przeglądarka przez `PA_CHROME`/`PA_PUPPETEER`.
    `tools/check_biomes.py` wymagał Pythona 3.12 (zagnieżdżone cudzysłowy w f-stringach) —
    poprawione do 3.11.
  - **Spójność treści:** z „O danych" zniknął nieaktualny wiersz „Biomy kontynentu — SCHEMAT
    roboczy" (biomy są już warstwą modelową z 56 migawkami); wiersz „Podkład" mówi wprost,
    że kafelki to jedyne zapytania zewnętrzne i tylko po wyjściu z trybu paleo.
  - **Paczka offline** przebudowana (10,6 MB): inline ikony apple-touch, bez linku do manifestu
    (na `file://` nie ma go skąd pobrać) — smoke-test: 0 żądań sieciowych, 0 błędów JS,
    biomy z data-URI (720 px), lądolód 31% kadru w LGM, globus rysuje.
  - **Bateria po zmianach: 99/99 + 37/37 + 178/178 + 21/21 + 45/45** (380 asercji; perfcheck
    doradczo 3–4/4 — P.1 bywa 65–68% progu na software-canvas).
- **Paczki do ręcznego przeniesienia projektu (GitHub w nowym czacie Areny).** W `/home/user/`:
  `PaleoAtlas_GITHUB.zip` (136 plików, **3,8 MB** — cały katalog `paleoatlas/` + nowy `.gitignore`)
  i `PaleoAtlas_TESTY.zip` (25 plików, **0,1 MB** — suity z `pptest/` bez regenerowalnych zrzutów
  `shots/`). Oba zweryfikowane (`testzip` OK). Pozostały niezależnie: `PaleoAtlas_OFFLINE.html`
  (10,5 MB, odtwarzalny: `python3 tools/build_offline_pack.py`) oraz surowce `/home/user/biodata/`
  (odtwarzalne: `tools/fetch_biodata.sh`) — do repo dziennego nie wchodzą.
- **`AUDYT_MID.md`** — audyt „błędów średniego poziomu": cykle życia widoków, timery, stan
  współdzielony, kontrakty API, pamięć (cache globusa w bajtach), obsługa błędów, dostępność
  klawiaturowa. 10 napraw, 6 testów, 6 świadomie odłożonych obserwacji (S1–S6).
- **`AUDYT_JUNIOR.md`** — audyt „błędów juniora" z **pomiarami** (profil CPU, mutacje DOM, czasy kroku
  osi na desktopie i telefonie): 12 napraw (wydajność, odporność startu, escapowanie, spójność liczb),
  6 świadomie odłożonych optymalizacji (N1–N6) i lista rzeczy sprawdzonych jako czyste.
- **`AUDYT_DEV.md`** — ekspercki audyt developerski (backend/dane/narzędzia/frontend/testy/proces), z pełnej lektury
  kodu i grepów: strategia zero-backend uznana za poprawną („backendem" jest pipeline w `tools/`); werdykt **kod 8/10,
  proces 3/10**. Znaleziska: **brak `.git` i CI** (główny dług), brak `tools/requirements.txt`, `fetch_biodata.sh` bez
  sha256, sprzężenie danych kolejnością 23 `<script>` (wzorzec splice w `ice_*.js` mutuje `PALEO.ice_sets`) — → T2.1
  registry przed falą warstw; dwie definicje „duplikatu" mapa↔globus (`isDupe` po `rola` vs `duplikat_patrz`) — kruchy
  niezmiennik → T1.3; `#srch-q:focus{outline:none}` (P0.5) przy istniejącym już wzorze `.gtgl:focus-visible`; mocne
  strony: 49× `esc()` przy innerHTML, LRU/fowizacja globusa, canvas dla ciężkich poligonów, `__PA` jako kontrakt
  testowy. Oceny: backend-strategia 4,8 · dane 4,2 · narzędzia 4,0 · frontend 4,3 · testy 4,4 · bezp. 4,6 ·
  proces/CI 1,5. Rejestr T0.1–T2.4 wpisany do `ZADANIA.md`; T0.1+T0.2 = część bramki v1.0 (razem z D1).
- **North star + „zasada bliskości" (decyzja usera 2026-08-03).** Wizją docelową jest *atlas całego świata,
  w językach całego świata, dostępny wszędzie* — cel odległy, zapisany jako **kompas, nie backlog**:
  AUDYT_PM.md §0A (horyzonty H0/H1/H2 z bramkami G1/G2; max 2 równoległe strumienie; test „czy zbliża H0/H1?"),
  nota w nagłówku ZADANIA.md. Daleki cel nie przysłania bliskiego: kolejka bez zmian — **H0: v1.0 → P1**.
- **Rozszerzenie wizji produktu (decyzja usera 2026-08-03): języki Europy Śr.-Wsch. + apki Android/iOS + web.**
  Zapisane jako **sekcja P4 w `ZADANIA.md`** + decyzje D5/D6 oraz **§7 aneksu w `AUDYT_KONKURENCJA_KOSZTY.md`**;
  z listy „zamrożonych" usunięte apki mobilne (warunek: wrapper na portal, jeden codebase). Nakłady i koszty
  (zweryfikowane 2026): i18n plumbing ~2–3 dni zaraz po v1.0 (napisy dziś zakodowane w HTML — każdy nowy feature
  przed i18n mnoży robotę ×N języków); fala 1 = EN/UA/CZ/SK/DE (~1 dzień/język, model 0 zł: szkic maszynowy +
  korekta native — konkurencja nie ma żadnego języka CEE); Tom I wstrzymany do sygnału użycia. Apki: PWA →
  **Google Play TWA**: $25 jednorazowo + closed test 12 testerów × 14 dni (konta osobiste); **iOS Capacitor**:
  $99/rok, zwolnienie dla nonprofit/edu do sprawdzenia; razem ~100 zł jednorazowo + ~420 zł/rok. Kolejność PM
  bez zmian: **v1.0 najpierw** — TWA wymaga stałego URL (D1).
- **`ZADANIA.md` + `AUDYT_KONKURENCJA_KOSZTY.md`** — trwały wykaz zadań wykonawczych (decyzje D1–D4 na userze,
  P0/P1/P2 z audytów + nowe **P3 „głęboki czas"**) oraz audyt konkurencji i kosztów z researchu (19 cytowań):
  nisza PL pusta (Ancient Earth = 1 globus bez etykiet wiarygodności, EarthViewer = appka HHMI bez PL i bez offline,
  GeaCron od 3000 p.n.e., Deep Time Maps $125/mapa „viewing only" — odradzone); koszty bieżące **0 zł/mies.**
  (hosting statyczny CF Pages unlimited / GH Pages 100 GB, domena opcj. ~60–85 zł/rok); rozbudowa na kolejne epoki
  **0 zł licencji** dzięki CC-BY-4.0 (PaleoDEM 0–540 mln lat, PANALESIS 45 przekrojów z klimatem) i CC0 (PBDB
  skamieniałości) — koszt to **~11–19 dni agentskich** (sekwencja: v1.0 → PBDB → oś głębokiego czasu → PaleoDEM
  → moduły paczki offline → testy).
- **`AUDYT_PM.md`** — drugi, niezależny audyt: perspektywa **produkt menadżera** (strategia/wydania, nie ocena wartości).
  Kluczowa diagnoza: produkt publicznie nie istnieje (brak stałego URL — ulotny preview Areny, Sandbox Not Found), a
  jest w 100% statyczny → hosting za 0 zł jako **decyzja, nie praca**. Zawartość: persony 1–4 z JTBD (prio: nauczyciel
  i entuzjasta), pozycjonowanie (podpis DANE/SCHEMAT/MODEL, PL-pełnia, offline-1-plik, 3,3 mln lat), lejek bez
  telemetrii + metryka północna (≥300 odsłon/tydz. bez cookies), **bramka v1.0** (8 warunków), roadmapa 30/60/90,
  priorytetyzacja RICE (adres i udostępnialność przed funkcjami), proces wydania jako bramka jakości, matryca ryzyk
  z właścicielami oraz **§10 „co do zrobienia teraz"**: punkty 2/3/5/6 agent może robić od razu, 1 i 4 czekają na
  decyzję usera (hosting + autorstwo licencji). Uzupełnia `AUDYT_PRODUKTOWY.md`.
- **`AUDYT_PRODUKTOWY.md`** — audyt produktu z perspektywy właściciela non-profit: 9 wymiarów z ocenami
  (misja 4,7 · rzetelność 4,6 · UX 3,4 · a11y 1,8 · wydajność 4,4 · prywatność 4,9 · otwartość 4,0 ·
  utrzymanie 4,5 · zasięg 2,3), dowody liczbowe per teza (kontrasty AAA: 15,03/8,46/8,20/7,87; ARIA: 1
  etykieta; trackery: 0; start: ~10 MB JS / sterta ~80 MB), matryca ryzyk, roadmapa P0/P1/P2 i lista
  „czego nie robić" (konta, reklamy, telemetria, dark patterns).
- **Nowy artefakt: `PaleoAtlas_OFFLINE.html` — cały portal w jednym pliku (~10,5 MB).**
  Budowla: `tools/build_offline_pack.py` → wszystkie CSS/JS inline (23 skrypty w oryginalnej
  kolejności) + 56 rastrów biomów jako data-URI (mapa `window.BIOME_PNG` + `__BIOME_URI`,
  podmiana dokładnie 3 literałów URL w app.js z asercjami liczności) + ikonki kontrolki warstw.
  Działa w 100% **offline i bez serwera** (pomiar: 0 żądań sieciowych, 0 błędów JS), włącznie
  z siatkami klas biomów, tooltipami i globusem — data-URI nie taintują canvasu, więc odczyt
  pikseli działa (inaczej niż przy otwarciu katalogu przez file://). Plik nie jest nadpisywany
  przy zwykłych zmianach portalu — tylko `python3 tools/build_offline_pack.py`. Przeznaczenie:
  stabilne otwieranie z podglądu plików, gdy podgląd na żywo (serwer) jest niedostępny.
  Smoke-test: mapa ✓ ghost ✓ suwak zmienia migawkę 96→22 ka ✓ globus z rastrem ✓.
- **Start bez sztormu zapytań do kafelków zewnętrznych.** Strona startuje w trybie paleo, a mimo to
  wcześniej doklejała podkłady Esri/hydro/granice, po czym od razu je zdejmowała — na słabszym
  sprzęcie (telefon) dawało to falę zapytań sieciowych przy każdym wejściu, a w osadzonym podglądzie
  offline zamulało timerami timeoutów. Teraz kafelki doklejają się dopiero przy pierwszym wyłączeniu
  trybu paleo (wtedy wraca standardowy zestaw: relief + rzeki + granice). Pomiary pamięci startu:
  sterta JS ~80 MB (stabilna między epokami), DOM ~1 tys. węzłów — aplikacja nie przekracza
  bezpiecznych limitów pamięci mobilnych. Bateria po zmianie: **84/84 + 32/32 + 45/45 + 21/21 +
  178/178 + 4/4**.
- **iOS Safari: „duch” linii brzegowej nie skalował się z mapą po pinch-zoomie (canvas „zamarzał”
  w starym rzucie).** WebKit zostawia starą teksturę kompozytowanej warstwy canvas (translate3d);
  fix: wymuszone `_update()` wszystkich rendererów canvas (lód / lądy / duch / pyłek) na `zoomend` —
  przypisanie width/height czyści bitmapę, więc warstwa na pewno dostaje nową teksturę (bez szkody
  i kosztu zauważalnego na innych silnikach). Dodatkowo ekspozycja `__PA.RENDER_CANVAS`/`ghostCoast`
  pod testy. Nowe testy mobilne **M10.0–M10.3** (obecność ducha, synchronizacja `_zoom` renderera,
  przerysowanie bitmapy, Gdańsk znów na linii brzegowej po zoomie).
- **Lekcja diagnostyczna: „fałszywe zwisy” aplikacji to pełny /tmp, nie kod.** Podczas badań
  wypełnienie tmpfs do 100% (profile Chromium + `--disable-dev-shm-usage` piszą do /tmp)
  objawiało się zero-procesorowymi „zawiechami” rendererów i martwym CDP — udawało nieskończoną
  pętlę w aplikacji. Zasada utrzymaniowa: przed baterią testów pilnować wolnego miejsca w /tmp
  (suity piszą shots do /tmp; profile nieżywych przeglądarek sprzątać).
- **Odporność na otwarcie przez `file://` (dwuklik w `index.html`).** Odczyt pikseli rastrów biomów
  (`loadBiomeRaster`) i sondy testowe globusa (`_classProbe`/`_ctxProbe`) są teraz chronione try/catch —
  wcześniej otwarcie strony jako pliku (bez serwera http) wywoływało SecurityError (canvas tainted)
  i przerywało doczytanie siatek klas. Podkład PNG bioma działa także spod file://; siatki klas
  (tooltipy pikselowe, warstwa biomów na globusie) wymagają serwera http — strona komunikuje to
  jednorazowym ostrzeżeniem w konsoli zamiast wyjątkiem. Dodatkowo: audyt „samoprzeładowań" —
  6 scenariuszy wejścia (HTTP root / index.html / #globus / file:// / klikanie zakładek / idle 45 s)
  w prawdziwym Chromium: zawsze dokładnie 1 nawigacja + 1 load, 0 błędów — kod strony nigdy sam
  nie przeładowuje. Testy: biomeshots 45/45, globesuite 21/21.
- **GLOBUS: biomy i kotwice pyłkowe na kuli + duży pakiet wydajnościowy (bez straty jakości).**
  Widok 🌍 rysuje te same rastry 0,5° co mapa płaska (próbkowanie odwrotnym rzutem; inline-invert
  ≡ d3 z dokładnością 4e-15 rad — test G.11b), przelączniki HUD „🌿 biomy” / „🌾 pyłek”
  (kotwice BIOME 6000 punktowo na przedniej półkuli, licznik w HUD), tag źródła epoki w HUD.
  Wydajność: bufor ImageData bez realokacji; podgląd w ruchu (geometria uproszczona DP ~16%,
  resamplowanie 5 px, biom 4 px) + klatka końcowa pełna (resampling 1 px, biom 2 px = rozdzielczość
  danych); culling features na odwrotnej półkuli (centroid+promień kątowy, margines 2°); **cache
  pikselowy klatek** BASE/ICE (LRU) — powrót do odwiedzonej epoki ~7-19 ms zamiast ~700 ms;
  mapa płaska: pyłek budowany raz na klucz (0k=9948 markerów), pomijanie identycznych przebudowań
  szelfu/lądolodu między epokami, prefetch sąsiednich migawek biomów, scrub suwaka max 1 render/rAF.
  Regresje znalezione przez baterię: XVIII.7 (raster biomów kalibruje starą sondę bieli BIIS —
  pomiary tej sondy od teraz przy OFF jak G.3). Bateria: **178/178 + 84/84 + 28/28 + 21/21 (globus)
  + 45/45 + 4/4 perfcheck (2. przejście mapy 58% czasu 1.; HIT globusa 15-19 ms)**.

- **PORZĄDKI / objętość workspace (108 MB → ok. 48 MB w snapshocie, 537 plików).**
  Wcześniej: `pptest/shots` (102 MB screenów z audytów) + surowe .nc (~3 GB) przekraczały limit
  snapshotu — najbezpieczniej było je usunąć. Usunięto: stare screeny (zostają 3 atlasy, 2 finalne
  ujęcia, 4 podglądy biomów — wszystko inne regenerują suity), duplikat `b6k/biome_v42.zip`
  oraz surowe `beyer_all.nc` (1,53 GB) i `pgem_bio*.nc` (~1,5 GB) **po pomyślnej odbudowie
  i walidacji produktu**. Przywracanie źródeł jednym poleceniem: `bash tools/fetch_biodata.sh`.
  Screeny wszystkich suitów lądują odtąd w `/tmp/shots` (poza workspace). Walidacja po odbudowie:
  `check_biomes.py` 12/12 + `biomeshots.js` 45/45 (frakcje identyczne jak przed sprzątaniem).


- **BIOMY: realna warstwa modelowa 0–3,3 mln lat zamiast schematu (56 migawek 0,5°, 28 klas BIOME4)
  + kotwice pyłkowe BIOME 6000 jako jedyne DANE.** Źródła: holocen–120 ka Beyer/Krapp/Manica 2020
  (*Sci. Data* 7:236; sondy: LGM Sahara pustynia 82%, Fennoskandia 100% lód, Amazonia trop-forest 28%
  — dokładnie jak w publikacji), 121–799 ka Krapp i in. 2021 (*Sci. Data* 8:228), 0,81–3,3 mln
  klimat Barreto i in. 2023 (*GEB* 32:1034, CC-BY) + **klasyfikator regułowy HG-lite v0.6 portalu**
  (jawnie MODEL; iteracja v0.2→v0.6 po audycie: naprawiona odwrócona kolejność wygrywania reguł,
  granica tajgi na (cold,warm,mat) — Polska 0.10→0.97 zgodności grup z Krapp2021 @0 ka; globalnie
  68%, raport `biome_report.json`). Lądolód w rastrze 1:1 z `envTickForBP` (56/56). Pyłek
  **BIOME 6000 v4.2** (9 948/1 794/318 stanowisk 0k/6k/18k-¹⁴C): 🌾 osobna warstwa (canvas),
  tooltip z nazwą stanowiska/zbiorem i kalibracją (18k = ~21–22 ka kal.). UI: overlay PNG 720×360
  w `biomePane`, tooltip pikselowy (nazwa + źródło MODEL z cytatem), dynamiczna legenda klas
  bieżącej epoki w **prawym dolnym rogu** — przeniesiona z lewego-dołu po wykryciu kolizji
  z przyciskiem „🧊 BIIS” (icesuite XVIII.6); na mobile = zwijany pasek (nie kradnie tapów
  markerów — regresja mobile M6.1). Kontrolka: „🌿 Biomy (modele naukowe)” + „🌾 Kotwice
  pyłkowe BIOME 6000 (DANE)”. „O danych”: +5 wierszy. Testy: nowa sekcja **XXI** w ice.science
  (8/8) + **tools/biomeshots.js (45/45)** + `tools/check_biomes.py` (12/12) + atlas
  `atlas_biomy_epoki.png` (27 epok). Bateria po zmianie: **178/178 + 84/84 + 28/28 + 10/10 + 45/45**.

- **Audyt „kształtu lądu w czasie" — 13 regionów × 25 epok + NAPRAWA danych szelfowych (v2):**
  nowy generator `tools/landshots.js` (E2E, Chromium, port 8387; tryb paleo, kanwa lądu z korekcją
  paddingu 0.4) mierzy ułamek pikseli lądu w kadrze i czyta poziom z tooltipów warstw; epoki: dziś, 9 ka,
  mł. dryas, B–A, 15 ka, 17,5 ka, LGM, 30 ka, 40 ka, MIS 4/5c/5d/Eem, 135 ka, MIS 6/7c/8/10/12/16/22/36,
  1,75 mln, 2,5 mln, pliocen 3,3 mln. **Znaleziony i naprawiony błąd danych `js/data/shelves.js` (v1):**
  poziomy nie były zagnieżdżone subsetami — np. szelf Morza Barentsa/Karskiego (batymetria ~−35 m, więc ląd
  już od −40 m) renderował się przy −80 m, ale ZNIKAŁ przy −95/−75/−60 m (ostatni zewn. pierścień gubiony
  przy grupowaniu pierścieni głębokością ≤1: wyspa-w-kieszeni → hole; podobny spadek Azji −30→−50 m).
  `tools/build_paleocoast.py` przepisany na **v2: cv2.findContours(RETR_CCOMP) + hierarchia z algorytmu
  (outer+holes+wyspy), szew antypołudnika przeniesiony przez przewinięcie maski na 150°E, walidacja rasterowa
  pełnej rozdzielczości vs maska ETOPO (wnętrze: 0 dużych rozbieżności; budżet szumu subpikselowego) oraz
  jawne zagnieżdżenie zbiorów między poziomami. Efekt: 484–548→192–548 poligonów/poziom, plik 4,5→3,2 MB;
  Doggerland, Beringia, Sahul (Torres/Arafura), Sahal–Hokkaido spójne; pasy `shots/lstrip_*.png` +
  atlas `atlas_lad_epoki.png`; aserty M0–M3 (klucze SHELVES == SHELF_LEVELS; tooltip „Wyschnięty szelf
  −X m" == shelfForSea(seaAtBP) + cytat ETOPO2v2; ułamki lądu niemalejące 0→−125 m; dziś==Eem==pliocen)
  **74/74 zielone.**
- **Audyt „kształtu zlodowienia w czasie” — 13 regionów × 6 epok (kontynenty i wyspy osobno):**
  nowy generator `tools/continentshots.js` (E2E, Chromium) rysuje siatkę kontrolną — LGM 21,5 ka,
  MIS 4 ~65 ka, MIS 6 ~155 ka, Eem 125 ka, mł. dryas 12,3 ka i „dziś” — dla 13 zakresów:
  Europa/Fennoskandia, Ameryka Płn., Patagonia, Antarktyda, Grenlandia+Islandia, Wyspy
  Brytyjskie, Svalbard/Barents, Azja płn., Afryka Wsch., Atlas, Australia+Tasmania, Nowa Gwinea,
  Nowa Zelandia; mierzy też ułamek pikseli lodu W WIDOCZNYM kadrze (uwaga inżynierska: renderer
  warstwy lodu rysuje canvas z paddingiem 0.4 → 1,8× pola widoku — bez korekcji pomiar łapał
  niewidoczną krawędź Antarktydy w kadrach południowych; metryka skorygowana o pozycję kanwy).
  **Wynik kontroli wzrokowej (pasy `shots/strip_*.png` + atlas `atlas_kontynenty_epoki.png`): zgodnie
  z założeniami i danymi** — MIS 6 ≥ LGM w Eurazji/Am. Płn./Grenlandii/Svalbardzie/Azji (PGM);
  MIS 4 ≈ LGM dla BIIS/EIS to wrodzona cecha „best estimate” Q19 (BRITICE-CHRONO zaczyna się od
  31 ka i nie rozstrzyga MIS 4); eem czyste (samo czapy/jądra); mł. dryas: Loch Lomond (DATED-1
  12 ka) + Salpausselkä + ACR Patagonii; „dziś”: RGI Islandia + inwentarze (PATICE/pomiary) +
  schematowe czapki Svalbardu (kandydat kiedyś na RGI reg. 07). NZ: ułamek kadru MIS 4 (schemat
  1,15×Σ) niższy niż LGM (35 rekordów) — spójne z konstrukcją (Σ km² ≠ ułamek kadru).

- **Patagonia i Antarktyda w stadiałach ≥ 40 ka — jawne etykiety epokowe z cytatami**
  (koniec ogólnika „MIS ≥4”): (a) **Lodowiec Patagoński** — dla 9 przekrojów (40 ka,
  MIS 4/6/8/10/12/16/20–24, Matuyama) schemat portalu ma nazwę zaczynającą się od etykiety
  ticka osi („MIS 4 (71–57 ka)”, „MIS 36 (~1,19 mln)”…) i pełną genealogię: przekroje
  empiryczne kończą się na 35 ka (PATICE — Davies i in. 2020, ESR 204:103152), Q19 nie
  czasorozróżnia PIS poza 45 ka/Gaussem; zewnętrzne systemy moren zmapowane, lecz
  systematycznie niedatowane (Rabassa 2008; Coronato, Martínez & Rabassa 2004); klauzula
  o zasięgu ponad-LGM — Greatest Patagonian Glaciation ~1,09 mln lat (Hein i in. 2009,
  Geology 37:551–554) — pojawia się TYLKO w epokach Matuyamy, gdzie jest udowodniona.
  (b) **Antarktyda** — dotychczasowy wpis „dziś” (ICE-6G_C 0 ka, DANE) w przekrojach Q19
  dostaje przyrostek „kotwica ≈ „dziś”…”: RAISED (Bentley i in. 2014, QSR 100:1–9) kończy
  się na LGM, starsza wielkość nieznana; wpis źródłowy fazy „dziś” nietknięty (owijka =
  kopia przy renderze). Implementacja runtime’owa (builderów danych nie rusza): funkcja
  `PA_PAT_schemat(stage)` w `js/data/ice_patice.js` + dwa punkty `envIcePolys` w `app.js`;
  walidacja **XX.1–XX.4** (icesuite 166→170) — splice’y, klauzule GPG, notka RAISED w 17
  przekrojach Q19, tooltipy MIS 4 w przeglądarce.

- **Islandia — „dziś” z RGI 7.0, deglacjacja z ICE-6G_C (domknięcie ostatniego
  schematowego sektora zachodu półkuli płn.):** audyt źródeł wykazał, że **empiryczne
  etapowe poligony IS nie istnieją otwarcie** — DATED-1 wyklucza Islandię, BRITICE to
  wyłącznie BIIS, Q19 zaczyna się ≥30 ka, a najnowsza synteza Goffin i in. 2026
  (*Clim. Past* 22:825–843, doi:10.5194/cp-22-825-2026) publikuje wyłącznie bazę
  wiążących wieków (IcelandICE DB, Zenodo 10.5281/zenodo.19453940; 37 punktów: 7
  morskich + 30 lądowych) i kod modelu GSM, bez poligonów zasięgu. Portal bierze więc:
  **„dziś” = RGI 7.0** (RGI 7.0 Consortium 2023, NSIDC doi:10.5067/f6jmovy5navz, CC-BY
  4.0) — 568 rekordów-jęzorów scalonych unią do czap macierzystych: Vatnajökull ~8 184,
  Langjökull ~944, Hofsjökull ~889, Mýrdalsjökull ~598, Drangajökull ~145 km² + mniejsze
  (Σ ~11,0 tys. km² wg inwentarza 11 060 km²) — `js/data/ice_rgi_isl.js` splajsowany
  TYLKO do fazy „dziś”; **deglacjacja = maska ICE-6G_C (VM5a)** w sektorze Islandii:
  pomorska 15 ka / B–A 13,5 ka / mł. dryas 12 ka / wcz. holocen 10,5 ka (124,8 → 68,6
  tys. km² ważone frakcją). Maska siatki 1° jest statyczna 26→13,5 ka (nie oddaje
  zapaści morskiej IS — udokumentowane ograniczenie) i pusta w 0 ka (stgit = 0), więc
  **LGM i fazy starsze zostają SCHEMATem** — teraz z uczciwą etykietą empiryczną:
  pełna pokrywa do krawędzi szelfu ~0,3 mln km², maksimum lokalne ~23–21 ka (Norðdahl
  & Pétursson 2005; Benediktsson i in. 2022/2023). Walidacja testowa: maski mierzone
  przeciwko 37 kalibrowanym punktom IcelandICE DB (lądowe pokryte w 15 ka; szelfowe
  poza zasięgiem siatki). Buildery: `tools/build_ice_rgi_isl.py` + rozszerzone
  `tools/build_ice_ice6g.py` / `write_ice_ice6g_js.py`; walidacja **XIX.1–XIX.7**
  (icesuite 159→166) + 6 migawek `tools/icelandshots.js` (wzrokowa kontrola OK).

- **Wyspy Brytyjskie — pełna niepewność BRITICE-CHRONO (warianty MIN/OPT/MAX w portalu):**
  publikacja Clark i in. 2022 (PANGAEA 945729) dostarcza TRZY zgodne z datowaniami zasięgi BIIS
  — portal dotąd rysował tylko wariant OPTIMUM. Teraz `js/data/ice_britice.js` zawiera wszystkie
  trzy × 4 przekroje (27/21/18/15 ka; wykryto i obsłużono **dwa różne CRS źródeł**: optimum =
  North Pole LAEA ESRI:102016, min/max = British National Grid EPSG:27700) oraz funkcję
  `BRITICE_SET_VARIANT(v)` podmieniającą wpisy `PALEO.ice_sets` w locie. Przełącznik
  **„🧊 BIIS” na karcie fazy** cyklicznie MINIMUM → OPTIMUM → MAKSIMUM (domyślnie OPTIMUM =
  preferowany przez autorów). Siła wariantów: LGM 21 ka ≈ **448 / 770 / 996 tys. km²** (sektor
  BIIS), 27 ka ≈ 527 / 754 / 1 125 tys., 18 ka ≈ 210 / 363 / 698 tys., 15 ka ≈ 106 / 122 /
  238 tys. — największy rozrzut względny w późnej deglacjacji (max ≈ 2× optimum w 15 ka).
  Tooltip i cytat zawsze nazywają AKTUALNY wariant; globus ma cache per-wariant (klucz epoki
  rozszerzony o wariant). Builder: `tools/build_ice_britice.py` (28 kB); warstwa walidacji
  **XVIII** (7 asercji, icesuite 152→159) + migawki `tools/britvarshots.js` (5 kadrów min/max).
- **Paleojeziora przylodowcowe Patagonii — PATICE-LAKES (nowa warstwa-woda; kontynuacja audytu
  pokrycia):** z tego samego zbioru Mendeley Data 10.17632/ztz59y79vv.1 (CC-BY 4.0) co PATICE —
  pliki `Glacial_lake_{10,13,15,20,25,30,35}ka.shp` (CRS WGS84 UTM 18S → WGS84; RDP 800 m):
  **49 zbiorników ≥40 km²**, z nazwą, wysokością zwierciadła i odniesieniem publikacyjnym
  (m.in. Thorndycraft i in. 2019; Garcia i in. 2019; Horta i in. 2019; Tatur i in. 2002;
  Sagredo i in. 2011; Lovell/Kilian). Mapowanie faz = jak lód PATICE (25→przedmaksymalny,
  20→LGM, 15→pozn./pom., 13→B–A/YD, 10→wcz. holocen); przekroje q_35ka/q_30ka doklejane,
  ≥40 ka = brak rekonstrukcji (zbiór zaczyna się od 35 ka — odnotowane w „O danych”).
  Krzywa objętościowa: 0,12 tys. km² (35 ka) → 13,7–13,9 tys. (pik 13–15 ka: **Lago Chalenko
  4741 km² = największe plejstocenskie jezioro Ameryki Płd.**) → 3,4 tys. (10 ka) — fizyka
  jezior przylodziskowych w jednym zestawie faz. Jeziora rysowane jako WODA (`#6fb3e8`,
  pane `icePane` **pod poligonami lodu**; na globusie kolor `#4d97d4`). Builder:
  `tools/build_patlakes.py` → `js/data/ice_patlakes.js` (69 kB); warstwa walidacji **XVII**
  (8 asercji) + migawki `tools/patlakes.shots.js` (7 kadrów, weryfikacja wzrokowa).
- **GLACIMONTIS fala 2 (domknięcie podmiany dysków hemisfery płd. i Afryki):** poligony
  GLACIMONTIS zastąpiły dyski-schematy Nowej Zelandii (35 rekordów w LGM — m.in. Barrell 2011),
  Australii/Tasmanii (16 rekordów Tasmania + 1 Snowy Mountains, Barrows 2002/2001), Nowej Gwinei
  + Archipelagu Malajskiego (Prentice 2005/2011, Peterson 2004), Riftu Wsch. (Chen 2018,
  Osmaston 2004) i Atlasu (Hannah 2017) — sufit: **jedno źródło na grupę×fazę** (MIN_COUNT):
  rzadkie okna zostają narracyjnym schematem z cytatem (NZ: ACR ≈ pomorska — Putnam 2010,
  mł. dryas = cofka — Kaplan 2010; Atlas: **readvance YD > B–A — Fink 2014**, cytat ¹⁰Be
  doklejony do nazw dysków; Tasmania: brak readvance — Barrows 2002). Rekord Hughes i in. 2021
  (Atlas, 50,2 ka) poza oknami faz 11,7–30 ka — pominięty projektowo. W przekroju q_lgm schematy
  „zasięgu skali LGM” nadpisane poligonami (PA_NZ/AUS/AFRYKA_LGM). 641 rekordów łącznie;
  warstwa walidacji **XVI** (5 asercji); stare asercje IX/X/XI/XIII/XVI przeprofilowane na
  zmierzone okna rekordów (m.in. Σ NG: poznańska ∈ [0,3×, 0,65×] LGM — największy rekord
  Prentice 2005 ma okno czysto LGM 17,7–24 ka; dominująca Tasmania = rekord łączony ~1,6 tys. km²).
- **Wyspy Brytyjskie — BRITICE-CHRONO z danych (odpowiedź na braki pokrycia lądolodów):** zbiór
  Clark, Ely, Fabel & Bradley 2022 (PANGAEA doi:10.1594/PANGAEA.945729, CC-BY 4.0; artykuł:
  Clark i in. 2022, „Growth and retreat of the last British–Irish Ice Sheet, 31 000 to 15 000 years
  ago: the BRITICE-CHRONO reconstruction”, *Boreas* 51:699–758, doi:10.1111/bor.12594) —
  **empiryczna rekonstrukcja OPTIMUM co 1 tys. lat** (31→15 ka) na bazie 639 nowych datowań —
  zastępuje schematyczne pierścienie Wysp w 4 fazach deglacjacji (izochrony 27/21/18/15 ka)
  i usuwa lód brytyjski z bolingu–allerödu (wg zbioru: deglacjacja ~15–14 ka); młodszy dryas
  pokrywa już DATED-1 12 ka (readvance Loch Lomond). Poligony optimum zawierają też kontekstowy
  lądolód fennoskandzki/barenski — w portalu serwerowo wycięty sektor BIIS
  (klip: lon −13…11,4°, lat ≤ 61,4°; Fennoskandia nadal z DATED-1, obrysy się kotwiczą).
  Przy okazji naprawiono filtr GLACIMONTIS (rekordy **Kuhlemann** były błędnie oznaczane
  „HIPOTEZA sporna” — startswith „Kuhle”) i doprowadzono etykiety schematów Azji do konwencji
  (jawne „SCHEMAT” dla MIS ≥3). Builder: `tools/build_ice_britice.py` → `js/data/ice_britice.js`
  (12 kB); nowa warstwa walidacji **XV** (6 asercji) + migawki `tools/britice.shots.js`
  (LGM / 18 ka / 15 ka / B–A bez lodu / YD Loch Lomond).
- **Antarktyda — ICE-6G_C (VM5a) z danych (audyt „to jeszcze Antarktyda”):** usunięto
  statyczny schematyczny pierścień Antarktydy z przekrojów deglacjacji i „dziś” —
  na jego miejsce **8 masek modelu GIA ICE-6G_C (VM5a)** 26/21/17,5/15/13,5/12/10,5/0 ka
  (Argus i in. 2014, *GJI* 198:537–563, doi:10.1093/gji/ggu140; Peltier i in. 2015,
  *JGR Solid Earth* 120:450–487; siatka 1°, sftgif ≥ 50%). LGM: ugruntowanie przy krawędzi
  szelfu, ~15,2 mln km² vs „dziś” ~14,2; cofka 15→10,5 ka widoczna jako kolejne przekroje;
  w przekrojach q ≥ 30 ka Antarktyda „dziś” dołączana już z DANYCH (nie ze schematu).
  Tooltipy cytują pełne proweniencje + wskazują rekonstrukcję empiryczną RAISED
  (Bentley i in. 2014, *QSR* 100:1–9) i jej wcześniejszą cofkę ~18 ka. Technicznie:
  cięcie pierścienia po antymeridianie (mapa), wariant rings_globe z biegunem wg RFC 7946
  (globus; obrys tej warstwy pomijany na globie, by nie rysować południka cięcia),
  clamp −84,9 (Mercator), krawędzie |Δlon| ≤ 90° (regresja antypołudnika M1.1).
  Nowa warstwa XII walidacji (9 asercji) + migawki `tools/antarctica.shots.js`;
- **Walidacja naukowa lądolodu (na prośbę użytkownika):** osobny zestaw 53 asercji
  `tools/ice.science.suite.js` — od inżynierii danych (OGC, antypołudnik, źródła), przez
  chronologię okien pięter i 16 kotwic poziomu morza, po kontrprzykłady literaturowe
  każdej epoki (liczby wg Batchelor 2019/DATED-1/Margold 2011/Lambeck 2014/LR04 m.in.)
  i kanon 7 linii brzegowych PL (35 pkt verbatim). Przy okazji: **normalizacja OGC**
  — pierścienie Q19/DATED-1/lobów są teraz jawnie domknięte (LinearRing), usunięto 2
  zdegenerowane części DATED-1 (<3 unikalne wierzchołki); buildery emitują postać
  domkniętą (`tools/close_generated_rings.js` jako krok CI).

- **Chronologia: braki + okna pięter (zgłoszenie użytkownika „brak lodu o 678/713 tys.")**
  — dodano brakujące stadiały: **MIS 18** (745–712 ka) i **MIS 24** (~940 ka, z kompozytu
  MIS 20–24) oraz wczesnoplejstoceńskie stadiały-analogi **MIS 36 / 52–54 / 62 / 82**
  (etykieta „SCHEMAT: kształt = analog…", rząd wielkości wg LR04; tooltip ⚠). Wybór
  przekroju: najpierw **okno piętra** (granice MIS wg Railsback 2015/LR04), potem
  najbliższy przekrój — 713 tys. lat pokazuje już lody, 678 tys. pozostaje w MIS 17
  (interglacjał — zgodnie z granicami pięter; faza portalu obejmuje cały cykl).

- **FIX mobile (zgłoszenie użytkownika): „lód czasem znika całkowicie"** — przekroje
  Q19 renderowane jako JEDNA ścieżka SVG o ~4000 podścieżek (megabajtowy atrybut `d`)
  przekraczały cichy limit malowania iOS Safari → warstwa znikała w połowie epok.
  Ląd/duch/lód/szelfy przeszły na **renderer canvas** (Leaflet canvas w dedykowanych
  panelach; tooltipy działają dalej — trafienia liczone geometrycznie); bonus: płynniejsza
  animacja ▶ na telefonach. Zgłoszenie zapisane jako regresja w testach mobilnych (M9.x:
  próbkowanie pikseli canvasu). Uwaga poboczna: brak lodu nad Europą w interglacjałach
  jest zgodny z danymi — karta fazy podaje wtedy, co zostało poza kadrem (Grenlandia ·
  Svalbard · Antarktyda).
- **OSOBNA GLOBALNA CHRONOLOGIA + OŚ OD 3,3 MLN LAT (pomysł użytkownika):** lądolód i
  poziom morza nie są już sztywno przywiązane do 17 faz osi — płyną wg własnej, globalnej
  skali (`js/data/env.js`, 48 przekrojów; karta fazy podaje etykietę i odległość Δ do
  najbliższego przekroju). **Batchelor i in. 2019** (OSF osf.io/7jen3) zaimportowany w pełni:
  18 przekrojów półkuli płn. 2,75 mln–30 ka (splice marginesów PL verbatim dla MIS 12/6,
  osobny lob Odry dla MIS 8). Nowa krzywa poziomu morza (102 pkt, 3,3 mln–dziś,
  interpolowana liniowo, w tym +20 m w pliocenie) steruje progiem szelfu ETOPO2v2.
  Oś przedłużona z 800 tys. do **3,3 mln lat**: 2 nowe segmenty głębokie (Lomekwi/Oldowan,
  Ekspansja Homo) + 9 kamieni milowych ♦ homininów; etykiety „mln lat temu".
- **Widok „🌍 Globus” (kulista Ziemia):** nowa zakładka z projekcją ortograficzną (d3-geo v7,
  vendor, canvas 2D) — odpowiedź na raport „mapa kończy się i przeskakuje przy Beringii”.
  Na globie datownika nie ma: Chukotka i Alaska sąsiadują naturalnie, rotacja jest ciągła
  przez ±180°. Renderuje **te same dane** co mapa płaska: lądolody epoki (DATED-1/NADI-1/PATICE/ICE-6G_C/Q19/
  schematy), wyschnięte szelfy ETOPO2v2 na poziomie morza fazy, stanowiska w kolorach kultur
  (tylko przednia półkula + okno czasowe). HUD pokazuje etykietę środowiska i listę warstw
  (DANE/SCHEMAT) jak karta fazy. Płaska mapa Leaflet pozostaje widokiem głównym
  (ma `worldCopyJump` — stąd wcześniejsze „przeskakiwanie”, które globus usuwa z natury).
  Pierścienie normalizowane do RFC 7946 (CCW/CW) + kontrola `d3.geoArea > 2π`.
- **PATICE — Lodowiec Patagoński z danych (audyt „sprawdź lądolód w Ameryce Płd.”):** audyt
  wykazał: (1) schemat PATAGONIA_MAX ≈ 250 tys. km² vs literackie ~493 tys. km² (maksimum),
  statyczny przez całą deglacjację 27→15 ka; (2) brak lodu SA w 10,5 ka i przy „dziś”;
  (3) w przekrojach Q19 schemat doklejany WSZĘDZIE — nawet w interstadialiach MIS 5 i tam,
  gdzie Q19 ma własne pierścienie (podwójne rysowanie w 45 ka i Gauss). Zintegrowano
  **PATICE** (Davies i in. 2020, *Earth-Science Reviews* 204:103152; Mendeley Data
  10.17632/ztz59y79vv.1 — transformacja UTM 18S→WGS84, RDP 0,02°, plamy ≥10 km²):
  przekroje empiryczne 35/30/25/20/15/13/10/5 ka (ticki 27→25, 21,5→20, 17,5→15, 15→15,
  13,6/12,3→13, 10,5→10) + współczesne lodowce 2011 AD. Portal pokazuje teraz: lokalne
  maksimum 33–28 ka (35 ka = 490 tys. km²), załamanie 20→15 ka (359→120 tys. km²),
  **rozpad PIS na osobne masywy** (SPI/NPI/kraina jezior/GCN/Darwin), **readvance
  w Antarctic Cold Reversal** (13 ka — gdy na płn. Bølling–Allerød/mł. dryas) i dzisiejsze
  pola lodowe (20,8 tys. km²). Przekroje Q19: 30/35 ka = PATICE; 45 ka/Gauss = tylko Q19;
  interstadialia MIS 5 = stan jak dziś; pozostałe stadiały = schemat z jawną etykietą.
- **Australia + Nowa Gwinea + Tasmania (audyt „teraz sprawdź lądolód… — dawaj Australię i okolice”):**
  audyt wykazał CAŁKOWITY brak lodu regionu w portalu — a w literaturze region jest
  dobrze spenetrowany (datowania kosmogeniczne 36Cl/10Be). Jak Afryka: brak otwartych
  przekrojów GIS → dyski = **SCHEMAT kształtu** z powierzchniami z publikacji:
  Nowa Gwinea (pasmo Sudirmana/Maoke >3400 km² niemal ciągłego pola Mt Jaya–Star Mtns wg
  Prentice i in. 2011 + czapolód Giluwe do 188 km² z 4 glacjacjami 293 ka – 11,5 ka wg
  Barrows i in. 2011, QSR 30:2676), Tasmania 1085 km² w LGM (czapolód Central Plateau +
  West Coast Ranges; Colhoun & Barrows 2011), kontynent: TYLKO masyw Kosciuszki 12–15 km²
  (Barrows i in. 2001, QR 55:179 — najmniej zlodowaciały kontynent świata!).
  Deglacjacia z kotwicami: maks. 17–20 ka (Barrows i in. 2002, QSR 21:159 — 18 moren
  kosmogenicznie), Giluwe blisko maks. do 15,4 ka, lód w PNG do pocz. holocenu;
  **kluczowy kontrast z Atlasem: BRAK readvance w ACR i młodzym dryasie** — portal pokazuje
  to jako YD < B–A dla regionu. Starsze stadiały (MIS 4/6+): wcześniejsze, WIĘKSZE maksima
  (Tasmania ~4500 km²; śr. pljst. 4000–5000, wcz. pljst. ~7000 wg tamże, Kiernan 1990).
  „Dziś”: POMIAR Puncak Jaya ~0,2 km² (2022–24; 1850: ~19,3 km²; BMKG/Permana —
  zanik prognozowany do ~2030); Tasmania i kontynent 0 km². Nowe warstwy w `envIcePolys`
  (q-przekroje), testy X (10 asercji), migawki `tools/australia.shots.js`.
- **Nowa Zelandia (audyt „także teraz Nowa Zelandia”):** drugie mrowisko górskie płk. płd. —
  audyt NZ wykazał brak regionu w portalu przy najlepszej znajomości datowań kosmogenicznych
  na świecie (36Cl/10Be, LDEO Schaefera/Putnama). Integracja jak dla SH: 9 dysków-SCHEMATÓW
  z Σ z publikacji — **LGM ~40 tys. km²** (Porter 1975; Barrell 2011; Golledge i in. 2012, *QSR*):
  West Coast, Rakaia, Rangitata, Waitaki (~10,5 tys. z kotwicą Putnam 2013 Lake Ohau), Clutha,
  Fiordland, NW Nelson + wyspa Płn. (Ruapehu/Tongariro do ~1200 m; Eaves & Brook 2020).
  Chronologia stronnicwa: maks. 26–20 ka, szybka cofka od ~18 ka, **ACR: readvance ~13 ka
  (Putnam i in. 2010, Nat. Geosci.) → B–A trzyma poziom pomorskiej**, ale **młody dryas =
  cofka** (Kaplan i in. 2010, Nature 467:194) → YD < B–A. MIS 4 ~65 ka = **Southern Glacial
  Maximum** (Schaefer i in. 2015, QSR 114:410) → przekroje głębokie ~1,15× LGM. „Dziś”:
  POMIAR 794 ± 34 km² / 2 918 lodowców (Baumann i in. 2021, *J. Glaciol.*, stan 2016) +
  Ruapehu 3,0 km². Dochód naukowy: portal pokazuje już 3 wzorce późnoglacjalne SH — test XI.5
  pilnuje, by Atlas (YD↑), region australijski (YD↓) i NZ (ACR↑/YD↓) nie zderzyły się regresją.
  Testy XI (10 asercji), migawki `tools/newzealand.shots.js`.
  Budowniczy `tools/build_ice_patice.py`, migawki `tools/patice.shots.js`, walidacja = warstwa
  VIII suitu naukowego (15 asercji).
- **Afryka — glacjacje górskie (pytanie użytkownika „czy tam w ogóle były lodowce?”):**
  audyt pokazał 0 pierścieni w Afryce na wszystkich przekrojach (poprawne co do lądolodu —
  Afryka nie miała go nigdy w kainozoiku — ale pomijające udokumentowane lodowce górskie).
  Dodano 5 dysków-schematów z powierzchnią z publikacji: Kilimandżaro >400 km² (Young &
  Hastenrath 1987, USGS PP-1386-G), Mt Kenya + Ruwenzori (po kilkaset km², tamże),
  Atlas Wysoki 2 dyski (Hughes i in. 2017; Fink i in. 2014). Chronologia: maksimum 27–17,5 ka,
  cofka E Afryki od pomorskiej, **Atlas ma readvance w młodszym dryasie** (moraines 11–13 ka
  wg ¹⁰Be — podczas gdy E Afryka cofa monotonicznie), wczesny holocen = szczątki,
  „dziś” = 3 masywy z POMIAREM powierzchni (Kilimandżaro 1,76 km²/2011; Ruwenzori 1,14/2005;
  Mt Kenya 0,15/2016; Atlas 0 km²). W przekrojach Q19 schemat pojawia się w stadiałach
  (jak Patagonia-fallback), w interstadialiach MIS 5 — nie. Wszystkie etykiety niosą hasło
  SCHEMAT + cytowanie; kształt = krąg, więc forma pozostaje symboliczna o właściwej wielkości.
  Walidacja = warstwa IX suitu (8 asercji), migawki `tools/africa.shots.js`.
- **Porządki azjatyckie (audyt „A Azja jest ok?”):** usunięto statyczny boks **„Tajmyr”**
  z okien LGM→mł. dryas — DATED-1 realnie zdeglacjował Tajmyr do ~15 ka, a boks (66–73°N,
  70–84°E) trwał nieruchomo do mł. dryasa i zawyżał pokrywę (przy LGM był zresztą redundantny
  wobec DATED-1 sięgającego 89,8°E). Jednolity boks **„NE Azja”** (30° szerokości) zastąpiono
  trzema-dwiema dyskretnymi **czapkami górskimi** (Wierchojańsk / Czerski / Suntar-Chajata)
  — wg Batchelor i in. 2019 zasięg NE Azji w LGM jest wyraźnie mniejszy niż w MIS 4/6
  (portal mierzy: 83 vs 163–218 deg²); etykiety uczciwie mówią „schemat, poza zakresem
  DATED-1 i Q19-LGM”. **Beringia zostaje sucha** (korytarz migrantów — lód tylko na
  obrzeżach: Ahklun/Alaska z NADI-1, St. Lawrence z Q19). Boksy starych zestawów
  MIS (mis3/mis4/warta/odra/south_polish), niedowiązane do okien chronologii globalnej,
  bez zmian (tam Q19 decyduje o obrazie).
- **DANE zamiast schematu (lądolód Ameryki Płn. 25–10,5 ka):** import **NADI-1**
  (Dalton, Dulfer, Margold i in. 2023, *Quat. Sci. Rev.* 321:108345; shapefiles Zenodo
  10.5281/zenodo.8161764, wariant OPTIMAL, WGS84 natywnie). 7 przekrojów dobranych do
  okien portalu (25/22/18/15/13,5/12,5/10,5 ka) zastąpiło schematyczne prostokąty
  Laurentyjski/Kordylieraski/Arktyczny kanadyjski w zestawach deglacjacji; 49 poligonów,
  430 pierścieni, uproszczenie RDP 0,04°, jawne domknięcie OGC. Scalone NAISC przy 22 ka
  (99% powierzchni w jednym rekordzie — zgodnie z publikacją), cofka marginesu płd.
  39,5°N → 47,2°N do 10,5 ka. Grenlandia świadomie zostaje schematem (poza NAISC) —
  tooltip rozdziela oba źródła na tym samym widoku (walidowane testem VI.9).
- **DANE zamiast schematu (lądolód Eurazji 40–8 ka):** import DATED-1 (PANGAEA) —
  slice'y 10–25 ka co tysiąc + 27/35–38 ka; ponieważ „most credible” dla fazy pomorskiej
  lepiej odpowiada TS17 niż TS15 (zmierzona zgodność z linia użytkownika), mapowanie
  faz do slice'ów zwalidowano numerycznie; linie leszczyńska/poznańska/pomorska
  wszycane verbatim do pierścienia DATED-1; lob gardzieński jako osobny poligon
  (DATED-1 TS14 ma już margines w S Skanii). Reszta świata + > 40 ka: nadal schemat
  wg literatury — oznaczone osobnym opisem źródła w tooltipie i zakładce „O danych”.
- **DANE zamiast schematu (dawne lądy):** Doggerland/Beringia/Sunda/Sahul/szelf
  argentyński itd. generowane z batymetrii ETOPO2v2 (NOAA) — 11 progów eustatycznych
  −5…−125 m; dziury basenowe (Landsort, Gotland), obwiednie przez linię zmiany daty
  rozwiązane na etapie siatki; karta fazy pokazuje próg (np. „szelf (próg −125 m) z
  batymetrii ETOPO2v2 (NOAA)”).
- **hulle kultur wyłączone** (na prośbę użytkownika — „kultura ma swój kolor kropki”);
  mechanizm convex hull zostaje w kodzie (`HULLS_ON = false`), pomysły na właściwą
  formę: alpha-shape / KDE / bufory korytarzy.
- **UX:** karta fazy pokazuje etykietę pochodzenia lądolodu (DATED-1 vs schemat) oraz
  próg batymetrii szelfu; tooltipy lądolodu i szelfu cytują źródła.
- **wyszukiwarka + filtry:** panel „Szukaj · legenda” — fraza pełnotekstowa, filtry kultura/
  typ/hominina/status, lista wyników ze skokiem osi do epoki stanowiska, współdziałanie
  z filtrem 1-kulturowym z legendy (dwukierunkowa synchronizacja).
- **kultury (fix):** słowa kluczowe taksonomii nie łapały polskich pisowni „hamburska”
  i „epigrawecka” (szukano „hamburg”/„epigrav”) — 6 rekordów trafiało do złych kultur
  (m.in. Mirkowice → Federmesser zamiast hamburska); poprawione w `build_data.py` +
  regeneracja (`hamburska 9→12 rdzeń, epigrawecka sąsiedzi +1`).
- **deduplikacja:** PM-094→PM-030 (Myszęcin), PM-099→PM-142 (Liny), PM-128→PM-127
  (Kamieńskie) — z mapy, legendy i hulów znikają; karty pokazują baner z linkiem
  do rekordu wiodącego; nowe pole `duplikat_patrz` w `sites.js`.
- **UX fazy:** surowe kody `kierunek_ladolodu` (np. `polnoc_silna_recesja`) tłumaczone
  na kartę fazy „margines na północy — silna recesja” (mapa kodów w `app.js`, CSV nietknięty);
  nagłówek legendy pokazuje licznik punktów na mapie.
- **fix (mobilne + mapa):** Beringia przecinała linię zmiany daty (skok −174°→+178° dł. geogr.)
  — Leaflet rysował zamykający segment przez całą mapę wzdłuż ~60°N (widoczny jako „ląd od
  Norwegii po Grenlandię"). Beringia rozcięta na 2 poligony po obu stronach 180° + test regresji
  sprawdzający WSZYSTKIE poligony paleo pod tym kątem.
- **RWD:** karta fazy domyślnie zwinięta na telefonie (dotknięcie rozwija), legenda zwinięta,
  panel stanowiska jako bottom-sheet, legenda i panel nad osią czasu (nie zasłaniane),
  większy uchwyt suwaka dla palca, ukrycie ciasnych etykiet segmentów, podziałka „LGM"
  na stałej pozycji 55,9% osi, kompaktowy nagłówek.
