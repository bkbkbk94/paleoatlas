// ============================================================================
// paleo.js — SCHEMATYCZNE rekonstrukcje paleogeograficzne (wersja robocza MVP)
// ----------------------------------------------------------------------------
// UWAGA NAUKOWA: poligony poniżej są uproszczonym schematem dydaktycznym,
// narysowanym odręcznie na podstawie rekonstrukcji literaturowych
// (m.in. Batchelor et al. 2019 Nat. Commun. „DATED-1”, Ehlers & Gibbard 2004,
// ICE-6G/Peltier, Clark & Mix 2002). Zachodnia granica lądolodu na terenie
// Polski jest DOKŁADNA — wpisano tu punkty z pliku zlodowacenia_biomy.csv.
// Docelowo należy podmienić te poligony na pełne zbiory (DATED-1 shapefiles,
// ICE-6G paleotopografia, GEBCO + krzywa poziomu morza) — patrz README.md.
// Format: [lat, lon] (kolejność Leaflet).
// ============================================================================
window.PALEO = (function () {

  // ---- wielokrotnie używane fragmenty (północne obwiednie Skandynawii) ----
  var FENNO_N = [ // północna obwiednia: zach. Norwegia → Barents → europejska Rosja
    [58, 5], [60, 4], [63, 6], [66, 10], [69, 14], [71, 19], [72, 24], [72, 30],
    [71, 38], [70, 46], [68, 50], [65, 48], [62, 43], [60, 38], [58, 32], [56, 27]
  ];
  var FENNO_N_SMALL = [ // tylko góry Skandynawii + N Szwecja
    [61, 8], [62, 12], [63, 15], [65, 18], [67, 20], [68, 16], [68, 12], [66, 9], [64, 8], [62, 7]
  ];
  var GBR_MAX = [ // brytyjsko-irlandzki lądolód (maksimum)
    [52, -3], [53, -6], [55, -7], [57, -8], [59, -8], [61, -6], [61, -3],
    [59, 0], [57, 1], [54, 1], [52, 0], [51, 1], [50, 0], [50, -3]
  ];
  var GBR_MID = [[55, -4], [56.5, -6], [58.5, -7], [58, -4], [56.5, -3], [55, -3.5]];
  var LAU_MAX = [ // laurentyjski lądolód — maksimum (do ~40-41°N)
    [60, -128], [64, -124], [68, -122], [71, -118], [73, -110], [74, -100], [73, -92],
    [72, -85], [70, -78], [68, -72], [64, -64], [60, -60], [55, -55], [52, -55],
    [50, -70], [46, -76], [43, -80], [41, -85], [40, -89], [41, -95], [44, -100],
    [47, -104], [49, -110], [53, -118], [57, -124]
  ];
  var LAU_MID = [
    [58, -90], [62, -92], [65, -88], [66, -80], [64, -72], [60, -68], [55, -65],
    [52, -62], [48, -70], [46, -75], [47, -82], [50, -85], [54, -88]
  ];
  var LAU_REM = [ // szczątkowy (młodszy dryas / wczesny holocen)
    [56, -78], [59, -75], [60, -68], [57, -62], [53, -60], [50, -65], [49, -70], [52, -74]
  ];
  var COR_MAX = [ // kordylieraski
    [60, -135], [63, -133], [66, -132], [69, -130], [66, -126], [62, -122],
    [58, -120], [54, -118], [50, -116], [48, -118], [50, -124], [54, -128], [58, -132]
  ];
  var COR_MID = [
    [55, -132], [58, -130], [61, -128], [60, -123], [56, -120], [52, -118], [49, -120], [51, -125], [54, -128]
  ];
  var INN = [ // arktyczny kanadyjski
    [75, -110], [77, -100], [78, -90], [78, -80], [77, -72], [74, -68], [72, -75], [73, -85], [74, -95], [74, -105]
  ];
  var GREENLAND = [
    [60, -44], [64, -52], [68, -54], [72, -56], [76, -68], [80, -65], [82, -50],
    [82, -35], [78, -22], [74, -20], [70, -22], [66, -24], [62, -32], [60, -38]
  ];
  var ICELAND = [[63.5, -22.5], [64.5, -21], [65, -19], [65.5, -15], [65, -13.5], [64, -14], [63.3, -17], [63.3, -20]];
  var BARENTS_MAX = [ // Svalbard + północna część morza Barentsa (fragment lądolodu Eurazjatyckiego)
    [74, -5], [77, 0], [79, 8], [80, 18], [80, 28], [78, 38], [76, 45], [74, 50], [72, 46], [71, 38], [71, 30], [72, 22], [73, 15]
  ];
  var SVALBARD = [[76.5, 10], [78, 14], [80, 18], [80.5, 24], [79, 30], [77, 26], [76, 20]];
  var TAYMYR = [[66, 70], [68, 74], [70, 76], [72, 78], [73, 82], [71, 84], [68, 82], [66, 76]]; // małe pokrywy N Syberii
  var ALPS = [[45.5, 6], [46.3, 7.5], [47, 9.5], [46.7, 12], [46, 13.5], [45.4, 12], [45.7, 9], [45.2, 7]];
  var PYRENEES = [[42.8, -1], [43, 1], [42.7, 2.5], [42.3, 1.5], [42.4, 0]];
  var PATAGONIA_MAX = [
    [-38, -73], [-42, -72], [-46, -73], [-50, -73.5], [-53, -72], [-54, -69],
    [-52, -68.5], [-48, -71], [-43, -71], [-39, -72.5]
  ];
  var PATAGONIA_MID = [[-44, -72], [-48, -73], [-51, -72], [-53, -70], [-51, -69.5], [-47, -71], [-44, -71.5]];
  var ANTARCTIC = [ // stała w całym okresie (lekkie rozszerzenie w glacjałach — pomijamy)
    [-70, -160], [-66, -130], [-64, -100], [-66, -70], [-69, -40], [-71, -10],
    [-70, 20], [-68, 50], [-66, 80], [-64, 110], [-63, 140], [-65, 165],
    [-75, 170], [-78, 90], [-78, 0], [-78, -90], [-75, -170]
  ];
  // Holocen / interglacjały: tylko Grenlandia, małe czapki, Antarktyda
  var ICE_HOLOCENE = [
    { name: 'Grenlandia', pts: GREENLAND },
    { name: 'Svalbard', pts: SVALBARD },
    { name: 'Archipelag Kanadyjski (szczątkowe)', pts: [[74, -100], [76, -92], [76, -82], [73, -78], [72, -86], [72.5, -96]] },
    { name: 'Antarktyda', pts: ANTARCTIC }
  ];

  // ---- mosty lądowe / obniżenie poziomu morza (poligon = wyschnięty szelf) ----
  var LB_DOGGER_LGM = [[49.8, -1], [50.5, -5], [51.5, -3], [52.5, 0], [53.5, 2], [55, 4], [57, 4], [59, 4], [60, 6], [58.5, 8], [57, 8], [56, 7], [55, 6], [54.2, 7], [53.3, 8], [52.5, 6], [51.5, 3], [50.5, 0], [49.5, -3]];
  var LB_DOGGER_DEG = [[52.5, 0], [53.5, 2], [55, 4], [57, 5], [58, 6], [56.5, 8], [55, 7], [54, 7], [53, 5], [52, 3]];
  var LB_DOGGER_REM = [[53, 2], [54.5, 3.5], [55.5, 5], [54.5, 6.5], [53.5, 5], [52.8, 3.5]];
  var LB_DOGGER_BANK = [[54, 2.5], [54.6, 3.2], [54.2, 4], [53.7, 3.2]];
  // Beringia: dwa poligony rozcięte na antypołudniku 180° — bez segmentu skaczącego −174→178,
  // który Leaflet narysowałby jako pas przez całą mapę wzdłuż ~60°N (błąd „ląd od Norwegii po Grenlandię”)
  var LB_BERINGIA_E = [ // strona czukocka (dł. geogr. dodatnie)
    [60, 160], [62, 164], [64, 168], [65.5, 173], [66, 177], [64.5, 179.5], [64, 176], [62.5, 170], [60.5, 164]
  ];
  var LB_BERINGIA_W = [ // strona alaskańska (dł. geogr. ujemne)
    [58, -155], [59.5, -160], [61.5, -166], [63.5, -173], [64.5, -179], [66, -179], [66.5, -172], [65, -165], [63, -161], [60.5, -157]
  ];
  var LB_BERINGIA_2 = [
    { name: 'Beringia — most lądowy Azja–Ameryka (cz. czukocka)', pts: LB_BERINGIA_E },
    { name: 'Beringia — most lądowy Azja–Ameryka (cz. alaskańska)', pts: LB_BERINGIA_W }
  ];
  var LB_SUNDA = [[8, 99], [6, 103], [2, 104], [-2, 108], [-5, 114], [-7, 110], [-5, 105], [-2, 101], [2, 99], [6, 97]];
  var LB_SAHUL = [[-10, 131], [-8, 137], [-11, 142], [-13, 145], [-18, 147], [-24, 153], [-30, 153], [-35, 150], [-39, 146], [-43, 146], [-43, 140], [-38, 138], [-34, 135], [-32, 128], [-26, 113], [-20, 113], [-15, 124], [-12, 130]];
  var LB_ECHINA = [[30, 121], [33, 122], [35, 124], [36.5, 127], [35, 129], [32, 130], [29, 128], [27, 124]];
  var LB_PGULF = [[29.5, 48], [28, 50], [25.5, 54], [24.5, 57], [26.5, 54], [28.5, 50]];
  var LB_NADRIAT = [[45.5, 13.5], [45, 13.8], [44, 14], [43, 14.5], [43.8, 13.5]];
  var LB_ARGENT = [[-37, -63], [-40, -60], [-45, -58], [-50, -57], [-54, -64], [-52, -66], [-47, -63], [-42, -62]];
  var LB_BALTIC_MD = [[55.5, 16], [57, 17.5], [59, 19], [60.5, 21.5], [60, 23], [58, 22], [56, 20.5], [55, 18]]; // jezioro/morze bałtyckie wczesny holocen (Ancylus) — orientacyjnie

  var LAND_LGM = [
    { name: 'Doggerland — wyschnięte Morze Północne', pts: LB_DOGGER_LGM },
    LB_BERINGIA_2[0], LB_BERINGIA_2[1],
    { name: 'Sunda — ląd SE Azji', pts: LB_SUNDA },
    { name: 'Sahul — Australia + Nowa Gwinea + Tasmania', pts: LB_SAHUL },
    { name: 'Wyschnięty szelf Morza Wschodniochińskiego', pts: LB_ECHINA },
    { name: 'Zatoka Perska (sucha)', pts: LB_PGULF },
    { name: 'Północny Adriatyk (ląd)', pts: LB_NADRIAT },
    { name: 'Szelf argentyński', pts: LB_ARGENT }
  ];
  var LAND_DEGL = [
    { name: 'Doggerland (kurczący się)', pts: LB_DOGGER_DEG },
    LB_BERINGIA_2[0], LB_BERINGIA_2[1],
    { name: 'Sunda (fragment)', pts: LB_SUNDA },
    { name: 'Sahul', pts: LB_SAHUL },
    { name: 'Szelf Wschodnich Chin', pts: LB_ECHINA },
    { name: 'Szelf argentyński', pts: LB_ARGENT }
  ];
  var LAND_YD = [
    { name: 'Doggerland', pts: LB_DOGGER_DEG },
    { name: 'Beringia — cz. czukocka (przemyk Baeringi otwiera się ok. 11 tys. lat temu)', pts: LB_BERINGIA_E },
    { name: 'Beringia — cz. alaskańska (przemyk otwiera się ok. 11 tys. lat temu)', pts: LB_BERINGIA_W },
    { name: 'Sahul', pts: LB_SAHUL }
  ];
  var LAND_EARLY_HOLO = [
    { name: 'Doggerland — ostatni pagórek archipelagu', pts: LB_DOGGER_REM },
    { name: 'Morze Ancylusa / wczesny Bałtyk (orientacyjnie)', pts: LB_BALTIC_MD }
  ];

  // ---- zestawy lądolodów dla faz bez dokładnej linii PL ----
  function fenno(edgeSouth, eastClose) {
    // buduj pierścień: krawędź południowa (W→E z pliku użytkownika) + domknięcie na północ
    var east = eastClose || [[54.5, 23.5], [55, 25], FENNO_N[15]];
    return FENNO_N.concat(east).concat(edgeSouth.slice().reverse());
  }

var GBR_NORTH = [[53.2, -3.5], [55, -6], [57, -7.5], [58.5, -6], [57.5, -3], [55.5, -2], [53.5, -1.8]];
  var W_SIB_MID = [[60, 60], [63, 65], [66, 70], [68.5, 74], [68, 78], [65, 80], [62, 76], [60, 71], [58, 66], [58, 62]];
  var W_SIB_BIG = [[60, 55], [64, 60], [68, 64], [71, 68], [73, 72], [73, 76], [71, 80], [69, 84], [66, 88], [63, 88], [61, 84], [59, 80], [57.5, 75], [56, 70], [55, 65], [55.5, 60], [58, 57]]; // wieś zaczniejsza od PL: MIS 6 (Taz) — ZNACZNIE większa niż LGM
  var V_NEASIA = [[61, 118], [64, 127], [67, 134], [69, 141], [68.5, 147], [65, 148.5], [62.5, 142], [60.5, 132], [59.5, 124]]; // pokrywy NE Azji (Verchojańsk/Czerski) — MIS 4 większe niż LGM
  // NE Azja w LGM/poznańskiej: wg Batchelor i in. 2019 zasięg w LGM jest WYRAŹNIE mniejszy
  // niż w MIS 4/6 — tylko rdzenie górskie (nie ciągła pokrywa jak V_NEASIA). SCHEMAT,
  // ponieważ DATED-1 kończy się na ~90°E, a Q19-LGM nie ma osobnych pierścieni dla NE Azji.
  var NEA_LGM_VERKH = [[63, 128], [66, 129], [68.5, 133], [68, 139], [65.5, 141.5], [63, 136]];
  var NEA_LGM_CHERSK = [[62.5, 143], [64.5, 144], [65.5, 149], [64, 152.5], [62, 149]];
  var NEA_LGM_SUNTKH = [[61, 138], [62.5, 139.2], [63, 144], [61.5, 144.5], [60.8, 141]];
  var HIMALAYA = [[27, 78], [30, 82], [32.5, 87], [31, 92.5], [28, 91], [26.5, 85]];
  var FENNO_N2 = [[58, 5], [60, 4], [63, 6], [66, 10], [69, 14], [71, 19], [72, 24], [72, 30], [71, 38], [70, 46], [68, 50], [65, 48], [62, 43], [60, 38], [58, 32], [56, 28]];

  var ICE_SETS = {
    // =========================================================================
    // Rekonstrukcje per okres. Źródła: DATED-1 (Hughes i in. 2016, Boreas),
    // Batchelor i in. 2019 (Nat. Commun., półkula płn. przez plejstocen),
    // Ehlers & Gibbard 2011, Toucanne i in. 2009 (Saalian), Clark i in. 2009 (LGM),
    // Marks i in. 2016/2018, Gardon & al. (Vistulian deglacjacja PL),
    // Toucanne+ / TC 2023 (PGM — MIS 6 większe w Syberii niż LGM).
    // Marginesy na terenie Polski: dokładne linie z zlodowacenia_biomy.csv.
    // =========================================================================

    // ---- 5.5–0 tys.: dziś ----
    now: ICE_HOLOCENE,
    // ---- 8–5.5 tys.: atlantyk ----
    atlantic: ICE_HOLOCENE,

    // ---- 11.7–8 tys.: wczesny holocen ----
    early_holocene: [
      { name: 'Skandynawski (szczątki, C Szwecja — znika ~9,5 tys. lat temu)', pts: [[59.5, 8], [60.5, 12], [61.5, 14], [62.5, 16], [63, 15], [62, 12], [60.5, 8]] },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (szczątki Quebec — znika ~8,2 tys. lat temu)', pts: LAU_REM },
      { name: 'Svalbard', pts: SVALBARD },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 12.9–11.7 tys.: młodszy dryas — readvance (Salpausselkä, Loch Lomond, Valders) ----
    younger_dryas: [
      { name: 'Fennoskandia (Ra/Salpausselkä — readvance młododryasowy)', pts: [[58.5, 12], [59, 11], [60, 10], [59.5, 13], [60.5, 16], [60, 20], [60.5, 24], [62, 26], [64, 28], [65, 29], [66, 26], [68, 23], [69, 20], [70, 17], [70, 13], [68, 11], [65, 10], [62, 8], [60, 9]] },
      { name: 'Szkocja (readvance Loch Lomond)', pts: GBR_MID },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (Valders readvance, szczątkowy)', pts: LAU_REM },
      { name: 'Kordylieraski (szczątkowy)', pts: COR_MID },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia (częściowo)', pts: ICELAND },
      { name: 'Svalbard', pts: SVALBARD },
      { name: 'Patagonia (readvance)', pts: PATAGONIA_MID },
      { name: 'Antarktyda (zaawansowanie północne, schemat)', pts: ANTARCTIC }
    ],

    // ---- 14–12.9 tys.: Bølling–Allerød — szybka cofka; PL: linia Świnoujście–Koszalin–Gdańsk (Gardno) ----
    bolling_allerod: [
      { name: 'Fennoskandia (linia Gardno/Young Baltic)', pts: FENNO_N2.concat([[56, 25], [54.5, 23], [54.35, 18.65], [54.19, 16.17], [53.91, 14.25]]).concat([[55, 12], [57, 10], [56, 8]]) },
      { name: 'Szkocja (lokalne lodowce, wzrost pod koniec okresu)', pts: GBR_MID },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (w cofce)', pts: LAU_MID },
      { name: 'Kordylieraski (w cofce)', pts: COR_MID },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia (fragmentarycznie)', pts: ICELAND },
      { name: 'Svalbard', pts: SVALBARD },
      { name: 'Patagonia (w cofce)', pts: PATAGONIA_MID },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 16–14 tys.: faza pomorska ----
    pomorska: [
      { name: 'Fennoskandia (faza pomorska — linia Szczecin–Bydgoszcz–Olsztyn–Suwałki)', pts: FENNO_N2.concat([[56, 27], [54.5, 24], [54.1, 22.93], [53.78, 20.48], [53.12, 18.0], [53.43, 14.55]]).concat([[54.5, 11], [56.5, 9]]) },
      { name: 'Wyspy Brytyjskie (BIIS — załamanie morskie, szczątki)', pts: GBR_MID },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (jeszcze blisko limitu, w cofce od ~19 tys.)', pts: LAU_MAX },
      { name: 'Kordylieraski (koalescencja do ~15 tys.)', pts: COR_MAX },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia', pts: ICELAND },
      { name: 'Kara–Barents–Svalbard (katabaza morska — kulminacja rozpadu do 15 tys.)', pts: BARENTS_MAX },
      { name: 'Patagonia', pts: PATAGONIA_MAX },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 19–16 tys.: faza poznańska — LIS/EIS po maksimum; EIS właśnie osiągał szczyt objętości (~19 ka) ----
    poznanska: [
      { name: 'Fennoskandia (faza poznańska — linia Poznań–Włocławek–Ostrołęka–Białystok)', pts: FENNO_N2.concat([[56, 27], [54, 24], [53.13, 23.16], [53.09, 21.58], [52.65, 19.07], [52.41, 16.93]]).concat([[53, 14], [53.8, 11], [55.5, 9]]) },
      { name: 'Wyspy Brytyjskie (BIIS — Szkocja + N Anglia)', pts: GBR_NORTH },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski', pts: LAU_MAX },
      { name: 'Kordylieraski', pts: COR_MAX },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia — IIS jeszcze pełny (schemat; zapaść marginesów rusza ~15 ka — Norðdahl & Pétursson 2005; od pomorskiej przekroje ICE-6G_C, „dziś” = RGI 7.0)', pts: ICELAND },
      { name: 'Svalbard–Barents–Kara', pts: BARENTS_MAX },
      { name: 'NE Azja — pokrywa wierchojańska (schemat; w LGM ≪ MIS 4/6 — poza zakresem DATED-1 i Q19-LGM)', pts: NEA_LGM_VERKH },
      { name: 'NE Azja — pokrywa czerska (schemat; w LGM ≪ MIS 4/6 — poza zakresem DATED-1 i Q19-LGM)', pts: NEA_LGM_CHERSK },
      { name: 'Alpy', pts: ALPS },
      { name: 'Tibet i Himalaje (glacjacje górskie)', pts: HIMALAYA },
      { name: 'Patagonia', pts: PATAGONIA_MAX },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 24–19 tys.: LGM — faza leszczyńska (Zielona Góra→…→Augustów) ----
    lgm: [
      { name: 'Fennoskandia (LGM — maksimum, linia leszczyńska)', pts: FENNO_N2.concat([[56, 27], [54.5, 24], [53.84, 22.98], [53.65, 22.46], [53.36, 20.43], [52.55, 19.71], [52.22, 18.25], [52.32, 17.57], [51.84, 16.57], [51.94, 15.51]]).concat([[53, 12], [54, 9], [55.5, 7.5]]) },
      { name: 'Wyspy Brytyjskie (BIIS — zespolony z FIS przez M. Północne)', pts: GBR_MAX },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (LIS — do Long Island/Ohio, koalescencja z Cord.)', pts: LAU_MAX },
      { name: 'Kordylieraski', pts: COR_MAX },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia — IIS w maksimum (schemat: pełna pokrywa do krawędzi szelfu ~0,3 mln km² wg Norðdahl & Pétursson 2005; max lokalne ~23–21 ka — Benediktsson i in. 2022, 2023)', pts: ICELAND },
      { name: 'Svalbard–Barents–Kara (morski lądolód)', pts: BARENTS_MAX },
      { name: 'NE Azja — pokrywa wierchojańska (schemat; w LGM ≪ MIS 4/6 — poza zakresem DATED-1 i Q19-LGM)', pts: NEA_LGM_VERKH },
      { name: 'NE Azja — pokrywa czerska (schemat; w LGM ≪ MIS 4/6 — poza zakresem DATED-1 i Q19-LGM)', pts: NEA_LGM_CHERSK },
      { name: 'NE Azja — Suntar-Chajata (schemat; w LGM ≪ MIS 4/6 — poza zakresem DATED-1 i Q19-LGM)', pts: NEA_LGM_SUNTKH },
      { name: 'Alpy', pts: ALPS },
      { name: 'Pireneje', pts: PYRENEES },
      { name: 'Tibet i Himalaje', pts: HIMALAYA },
      { name: 'Patagonia', pts: PATAGONIA_MAX },
      { name: 'Antarktyda (zaawansowany po szelf, schemat)', pts: ANTARCTIC }
    ],

    // ---- 30–24 tys.: stadiał przedmaksymalny — nasuwanie ku LGM ----
    przedmaksymalny: [
      { name: 'Fennoskandia (nasuwanie do LGM)', pts: FENNO_N2.concat([[56, 25], [54, 22], [53.6, 18], [53.4, 14], [53.2, 12]]).concat([[54.5, 9], [56.5, 8]]) },
      { name: 'Wyspy Brytyjskie (BIIS — nasuwanie)', pts: GBR_MAX },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski', pts: LAU_MAX },
      { name: 'Kordylieraski', pts: COR_MAX },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia — IIS nasuwający (schemat: pełna pokrywa wraz z szelfem, empiryczn. ~0,3 mln km² wg Norðdahl & Pétursson 2005; brak otwartych danych etapowych < 30 ka)', pts: ICELAND },
      { name: 'Svalbard–Barents', pts: BARENTS_MAX },
      { name: 'NE Azja — pokrywa wierchojańska (schemat; w LGM ≪ MIS 4/6 — poza zakresem DATED-1 i Q19-LGM)', pts: NEA_LGM_VERKH },
      { name: 'NE Azja — pokrywa czerska (schemat; w LGM ≪ MIS 4/6 — poza zakresem DATED-1 i Q19-LGM)', pts: NEA_LGM_CHERSK },
      { name: 'Alpy', pts: ALPS },
      { name: 'Patagonia', pts: PATAGONIA_MAX },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 60–30 tys.: MIS 3 — wg DATED-1: od czapek po spójny lądolód górski (interstadial Ålesund) ----
    mis3: [
      { name: 'Fennoskandia (MIS 3 — wariant: góry + N, Ålesund; znaczna niepewność)', pts: FENNO_N_SMALL },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (duży, fluktuujący)', pts: LAU_MID },
      { name: 'Kordylieraski', pts: COR_MID },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Svalbard', pts: SVALBARD },
      { name: 'Tajmyr', pts: TAYMYR },
      { name: 'NE Azja (pokrywy górskie — SCHEMAT; dla deglacji od ~27 ka są już WPISY GLACIMONTIS: Wierchojańsk Barr & Clark 2012)', pts: V_NEASIA },
      { name: 'Tibet i Himalaje', pts: HIMALAYA },
      { name: 'Patagonia (nasuwanie ku maksimum ~35–25 ka)', pts: PATAGONIA_MAX },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 75–60 tys.: MIS 4 — w Syberii/NE Azji/Kordylierach WIĘKSZE niż LGM (Batchelor 2019) ----
    mis4: [
      { name: 'Fennoskandia (MIS 4 — nasuwanie do Bałtyku/Danii; znikoma w PL)', pts: [[55, 12], [57, 12], [59, 14], [60, 18], [62, 22], [64, 26], [66, 28], [68, 24], [69, 18], [69, 13], [67, 10], [64, 8], [62, 7], [60, 8], [58, 9], [56, 10]] },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (duży)', pts: LAU_MID },
      { name: 'Kordylieraski (większy niż LGM!)', pts: COR_MAX },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia', pts: ICELAND },
      { name: 'Svalbard–Barents–Kara', pts: BARENTS_MAX },
      { name: 'Tajmyr', pts: TAYMYR },
      { name: 'Zachodnia Syberia (Kara)', pts: W_SIB_MID },
      { name: 'NE Azja (znacznie większa niż w LGM — SCHEMAT; Batchelor 2019: MIS 4/6 ≫ LGM)', pts: V_NEASIA },
      { name: 'Tibet i Himalaje', pts: HIMALAYA },
      { name: 'Alpy', pts: ALPS },
      { name: 'Patagonia (duża advance MIS 4)', pts: PATAGONIA_MAX },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 115–75 tys.: wczesna Wisła (MIS 5d/5b, Herning + Rederstal) ----
    early_vistulian: [
      { name: 'Fennoskandia (MIS 5d/5b — stadiały Herning i Rederstal)', pts: [[58, 10], [59.5, 13], [61, 17], [63, 21], [65, 25], [66.5, 28], [67, 24], [68, 18], [68, 13], [66, 10], [64, 8], [62, 7], [60, 8]] },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (formujący się — Keewatin/Quebec)', pts: LAU_MID },
      { name: 'Kordylieraski', pts: COR_MID },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia', pts: ICELAND },
      { name: 'Svalbard', pts: SVALBARD },
      { name: 'Tajmyr', pts: TAYMYR },
      { name: 'Zachodnia Syberia (W i C część, wg Batchelor 5b/5d ≥ MIS 4)', pts: W_SIB_MID },
      { name: 'NE Azja', pts: V_NEASIA },
      { name: 'Alpy (glacjacje górskie)', pts: ALPS },
      { name: 'Patagonia', pts: PATAGONIA_MID },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 130–115 tys.: interglacjał eemski ----
    eem: ICE_HOLOCENE,

    // ---- 230–130 tys.: Saalian MIS 6 — Drenthe (~175–160) + Warthe (~150–140).
    //      PENULTIMATE GLACIAL MAXIMUM: EIS większy niż LGM na wschodzie; Syberia Taz;
    //      Drenthe na zachodzie POŁUDNIEJ niż LGM (Holandia!); oznaczanie Siedlce–Łosice–Kornica
    warta: [
      { name: 'Fennoskandia (Saalian Drenthe/Warthe — PL: linia Warty Wrocław–Łódź–Bug)', pts: FENNO_N2.concat([[55, 28], [53, 31], [52.5, 34], [52.3, 22.6], [51.53, 21.17], [51.5, 19.47], [51.11, 17.03]]).concat([[50.9, 15], [51, 12.8], [51.2, 10.5], [51.6, 8], [52.2, 5.5], [53.3, 4.5], [54.3, 5.8]]) },
      { name: 'Wyspy Brytyjskie (Wolstonian — do Tamizy)', pts: GBR_MAX },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (Illinoian — miejscami POŁUDNIEJ niż LGM)', pts: LAU_MAX },
      { name: 'Kordylieraski', pts: COR_MAX },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia', pts: ICELAND },
      { name: 'Svalbard–Barents–Kara', pts: BARENTS_MAX },
      { name: 'Tajmyr', pts: TAYMYR },
      { name: 'Zachodnia Syberia (Taz — obszary WIĘKSZE niż LGM)', pts: W_SIB_BIG },
      { name: 'NE Azja', pts: V_NEASIA },
      { name: 'Alpy (Riss)', pts: ALPS },
      { name: 'Pireneje', pts: PYRENEES },
      { name: 'Tibet i Himalaje', pts: HIMALAYA },
      { name: 'Patagonia (duża)', pts: PATAGONIA_MAX },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 300–230 tys.: stadiał Odry (MIS 8) — PL: linia Kotlina Kłodzka→…→Roztocze ----
    odra: [
      { name: 'Fennoskandia (stadiał Odry — linia z pliku portalu)', pts: FENNO_N2.concat([[55, 26], [52, 23.5], [50.6, 23.3], [51.0, 22.5], [50.68, 21.75], [50.9, 20.6], [50.8, 19.12], [50.3, 18.9], [50.43, 16.65]]).concat([[50.5, 14.5], [51.5, 12], [52.5, 9], [53.5, 7], [54.5, 5]]) },
      { name: 'Wyspy Brytyjskie (MIS 8 — zasięg niepewny)', pts: GBR_MID },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (MIS 8 — pre-Illinoian)', pts: LAU_MAX },
      { name: 'Kordylieraski', pts: COR_MAX },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia', pts: ICELAND },
      { name: 'Svalbard–Barents', pts: BARENTS_MAX },
      { name: 'Tajmyr', pts: TAYMYR },
      { name: 'Zachodnia Syberia (MIS 8 < MIS 6)', pts: W_SIB_MID },
      { name: 'NE Azja', pts: V_NEASIA },
      { name: 'Alpy', pts: ALPS },
      { name: 'Pireneje', pts: PYRENEES },
      { name: 'Tibet i Himalaje', pts: HIMALAYA },
      { name: 'Patagonia', pts: PATAGONIA_MAX },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ],

    // ---- 440–300 tys.: interglacjał mazowiecki (Holsteinian, MIS 11) ----
    mazowiecki: ICE_HOLOCENE,

    // ---- 800–440 tys.: zlodowacenia południowopolskie — Sanian 2 = Elsterian (MIS 12!):
    //      MAKSIMUM plejstoceńskie w PL — do przedpola Karpat i Sudetów (linia z pliku portalu);
    //      Wielka Brytania: angliańska; Ameryka Płn.: Kansan (do Missouri)
    south_polish: [
      { name: 'Fennoskandia (Sanian/Elsterian — do Karpat i Sudetów)', pts: FENNO_N2.concat([[54, 26], [52, 25], [50.6, 24], [49.9, 23.2], [49.78, 22.77], [50.04, 22.0], [50.06, 19.94], [50.77, 16.28], [51.15, 15.0]]).concat([[51.6, 12.5], [51.3, 9.5], [52, 6.5], [53.8, 5]]) },
      { name: 'Wyspy Brytyjskie (Anglian — największe III PL zlodowacenie GB)', pts: GBR_MAX },
      { name: 'Grenlandia', pts: GREENLAND },
      { name: 'Laurentyjski (Kansan/Nebraskan — do Missouri)', pts: LAU_MAX },
      { name: 'Kordylieraski', pts: COR_MAX },
      { name: 'Arktyczny kanadyjski', pts: INN },
      { name: 'Islandia', pts: ICELAND },
      { name: 'Svalbard–Barents', pts: BARENTS_MAX },
      { name: 'Tajmyr', pts: TAYMYR },
      { name: 'Zachodnia Syberia', pts: W_SIB_MID },
      { name: 'NE Azja', pts: V_NEASIA },
      { name: 'Alpy (Günz)', pts: ALPS },
      { name: 'Pireneje', pts: PYRENEES },
      { name: 'Tibet i Himalaje', pts: HIMALAYA },
      { name: 'Patagonia', pts: PATAGONIA_MAX },
      { name: 'Antarktyda', pts: ANTARCTIC }
    ]
  };

  /* ================= AFRYKA: glacjacje górskie =================
     Afryka NIGDY (w kainozoiku) nie miała lądolodu kontynentalnego — w pliocen/plejstocen
     wyłącznie lodowce górskie na 4 masywach. Brak otwartych przekrojów czasowych GIS
     (Q19 wyklucza lodowce górskie z założenia; DATED-1/NADI-1/PATICE są regionalne),
     więc krąg = SCHEMAT kształtu, ale POWIERZCHNIE oparte na publikacjach:
       Kilimandżaro — maksimum ostatniego zlodowacenia >400 km² (Young & Hastenrath 1987,
         USGS Prof. Paper 1386-G; 1912: 11,4 km²; 2011: 1,76 km² — Cullen i in. 2013);
       góra Kenia, Ruwenzori — „several hundred km²” łącznie dla gór E Afryki (tamże);
       Atlas Wysoki — pola lodowe płaskowyżów Tazaghart/Iouzagner >25 km² + Toubkal i W Atlas
         (Hughes i in. 2017, Geol. Soc. London SP 433); fazy 30–88 / 19–25 / 11–13 ka wg
         Fink i in. 2014 (EGU) — najmłodszy pokój = odpowiednik mł. dryasu (readvance!).
     Cofka E Afryki od ~17–15 ka (Shanahan & Zreda 2000; Shanahan i in. 2015).
     Skale per tick są ARBITRALNYMI proporcjami schematu (nie z datowań) — etykiety to mówią. */
  function afrDisc(latC, lonC, km2, n) {
    var r = Math.sqrt(km2 / Math.PI) / 111.32, pts = [], N = n || 16;
    var f = km2 >= 50 ? 2 : 4;         // mikro-plamy „dziś”: 2 cyfry po przecinku → degeneracja!
    for (var i = 0; i < N; i++) {
      var a = i / N * 2 * Math.PI;
      pts.push([+(latC + r * Math.sin(a)).toFixed(f),
                +(lonC + r * Math.cos(a) / Math.cos(latC * Math.PI / 180)).toFixed(f)]);
    }
    return pts;
  }
  function afrGlac(eaScale, atScale) {
    return [
      { name: 'Afryka — Kilimandżaro: czapolód plejstocen. ~' + Math.round(400 * eaScale) + ' km² (SCHEMAT: krąg; maksimum >400 km² wg Young & Hastenrath 1987; brak otwartych przekrojów GIS)', pts: afrDisc(-3.07, 37.35, 400 * eaScale) },
      { name: 'Afryka — góra Kenia (Mt Kenya): glacjacje plejstocen. ~' + Math.round(300 * eaScale) + ' km² (SCHEMAT: krąg; dla gór E Afryki „several hundred km²” wg Young & Hastenrath 1987)', pts: afrDisc(-0.16, 37.32, 300 * eaScale) },
      { name: 'Afryka — Ruwenzori (Uganda/DK): glacjacje plejstocen. ~' + Math.round(300 * eaScale) + ' km² (SCHEMAT: krąg; jak wyżej; dziś 3 szczyty centralne)', pts: afrDisc(0.39, 29.87, 300 * eaScale) },
      { name: 'Afryka — Atlas Wysoki (Toubkal/Tazaghart): pola lodowe ~' + Math.round(90 * atScale) + ' km² (SCHEMAT: krąg; >25 km² same płaskowyże wg Hughes i in. 2017; readvance ¹⁰Be 11–13 ka wg Fink i in. 2014)', pts: afrDisc(31.06, -7.92, 90 * atScale) },
      { name: 'Afryka — Atlas Wysoki E (Irhil M’Goun–Meltsene): ~' + Math.round(60 * atScale) + ' km² (SCHEMAT: krąg; jak wyżej)', pts: afrDisc(31.5, -6.3, 60 * atScale) }
    ];
  }
  ICE_SETS.przedmaksymalny = ICE_SETS.przedmaksymalny.concat(afrGlac(1, 1));
  ICE_SETS.lgm = ICE_SETS.lgm.concat(afrGlac(1, 1));
  ICE_SETS.poznanska = ICE_SETS.poznanska.concat(afrGlac(1, 1));          // cofka EA od ~17–15 ka — peak wciąż
  ICE_SETS.pomorska = ICE_SETS.pomorska.concat(afrGlac(0.55, 0.6));       // cofka w toku (proporcja schematu!)
  ICE_SETS.bolling_allerod = ICE_SETS.bolling_allerod.concat(afrGlac(0.5, 0.55));
  ICE_SETS.younger_dryas = ICE_SETS.younger_dryas.concat(afrGlac(0.45, 0.75)); // ATLAS: readvance 11–13 ka (Fink 2014) — Atlas rośnie względem B-A, E Afryka cofa dalej
  ICE_SETS.early_holocene = ICE_SETS.early_holocene.concat(afrGlac(0.12, 0.06));
  var AFRICA_NOW = [
    { name: 'Afryka — Kilimandżaro (Kibo): DZIŚ 1,76 km² — POMIAR (Cullen i in. 2013, stan 2011; schemat kształtu — krąg; 1912: 11,4 km²; prognozy: zanik do poł. XXI w.)', src: 'POMIAR', pts: afrDisc(-3.07, 37.35, 1.76) },
    { name: 'Afryka — góra Kenia (Lewis Glacier): DZIŚ 0,15 km² — POMIAR (Prinz i in. 2018, stan 2016; schemat kształtu)', src: 'POMIAR', pts: afrDisc(-0.16, 37.32, 0.154) },
    { name: 'Afryka — Ruwenzori (Mt Stanley/Speke/Baker): DZIŚ 1,14 km² — POMIAR (Mölg i in. 2006, stan 2005; schemat kształtu; 1906: 6,51 km²). ATLAS: dziś 0 km² — ostatnie lodowce niszowe zanikły w XX w.', src: 'POMIAR', pts: afrDisc(0.39, 29.87, 1.14) }
  ];
  var AUS_NOW = [
    { name: 'Nowa Gwinea — Puncak Jaya (Carstensz + East Northwall Firn): DZIŚ ~0,2 km² — POMIAR (0,16–0,23 km² w 2022–2024 wg BMKG/Permana, monitoring Sentinel-2/PlanetScope/Pléiades; 1850: ~19,3 km²; 1942: ~13; 2000: 2,33; prognoza zaniku do ~2030). Tasmania i kontynent: 0 km² stałego lodu — Snowy/Kosciuszko nie odbudowały lodu po plejstocenie', src: 'POMIAR', pts: afrDisc(-4.083, 137.179, 0.2) }
  ];
  ICE_SETS.now = ICE_HOLOCENE.concat(AFRICA_NOW).concat(AUS_NOW);
  /* fallback dla stadiałowych przekrojów Q19 ≥40 ka (app.js envIcePolys): te same dyski
     maksimum — etykiety mają epochowo-neutralny sens (maksimum plejstocen. wg publikacji) */
  window.PA_AFRYKA_SCHEMAT = afrGlac(1, 1);

  /* AUSTRALIA + NOWA GWINEA + TASMANIA: glacjacje górskie — jak Afryka: brak otwartych
     przekrojów GIS → krąg = SCHEMAT kształtu, a POWIERZCHNIE z publikacji:
       Tasmania — 1085 km² w LGM, głównie czapolód Central Plateau + West Coast Ranges i
         systemy karowo-dolinne (Colhoun & Barrows 2011, w: Ehlers/Gibbard/Hughes,
         „Quaternary Glaciations — Extent and Chronology", 2 wyd., Elsevier DQVS 15);
         maksimum 17–20 ka z datowań kosmogenicznych 18 moren (Barrows i in. 2002,
         QSR 21:159–173); szybka deglacjacja — drobny lód mógł dotrwać do ~14 ka;
         BRAK readvance w ACR i młodym dryasie (tamże) — odwrotnie niż Atlas!
         Wcześniej rozleglej: śr. plejstocen 4000–5000 km², wcz. plejstocen ~7000 km²
         (tamże); Kiernan 1990 — czapolód Central Highlands ~6000 km².
       Kontynent — TYLKO masyw Kosciuszki: 12–15 km² w LGM (Colhoun & Barrows 2011;
         Barrows i in. 2001, Quat. Res. 55:179–189: fazy 32 / 19,1 / 16,8 ka; wczesny
         atak >59 ka rozleglejszy). Najmniej zlodowaciały kontynent świata.
       Nowa Gwinea — >3400 km² niemal ciągłego pola lodowego od Mt Jaya i Mt Idenburg
         po Star Mountains (Prentice i in. 2011, w: Barrows i in. 2011); Giluwe: czapolód
         do 188 km², 4 glacjacje: Gogon 293–306 / Mengane 136–158 / Komia ~62 /
         Tongo >20,3–11,5 ka — blisko maks. do ~15,4 ka, lód do pocz. holocenu
         (Barrows i in. 2011, QSR 30:2676–2689); lód odnotowany na ≥20 masywach wschodu
         wyspy (tamże; bez liczb — pominięte).
     Skale per tick = ARBITRALNE proporcje schematu (kotwice = powyższe publikacje). */
  function ausGlac(tasScale, ngScale, ausScale) {
    var defs = [
      ['Nowa Gwinea — Pasmo Sudirmana (Maoke; Carstensz/Mt Jaya → Star Mountains): pole lodowe ~%K% km² (SCHEMAT: krąg; >3400 km² niemal ciągłego pola od Mt Jaya/Mt Idenburg po Star Mtns wg Prentice i in. 2011 — realnie wydłużone ~450 km, nie kołowe)', 3400 * ngScale, -4.25, 138.0],
      ['Nowa Gwinea — Mt Giluwe: czapolód ~%K% km² (SCHEMAT: krąg; do 188 km² wg Barrows i in. 2011 QSR 30:2676; 4 glacjacje 293–306/136–158/~62/>20,3–11,5 ka, lód do pocz. holocenu)', 188 * ngScale, -6.05, 143.92],
      ['Tasmania — Central Plateau: czapolód ~%K% km² (SCHEMAT: krąg; LGM łącznie 1085 km², gł. tutaj + West Coast Ranges, wg Colhoun & Barrows 2011)', 700 * tasScale, -41.75, 146.55],
      ['Tasmania — West Coast Ranges (Frenchmans Cap): lodowce dolinne ~%K% km² (SCHEMAT: krąg; jak wyżej; maks. 17–20 ka wg datowań kosmogenicznych 18 moren — Barrows i in. 2002)', 320 * tasScale, -42.15, 145.85],
      ['Tasmania — Ben Lomond i płaskowyże NE: lodowce karowe ~%K% km² (SCHEMAT: krąg; wg Colhoun & Barrows 2011 — drobne systemy północno-wschodniej Tasmanii)', 65 * tasScale, -41.58, 147.55],
      ['Australia — Snowy Mountains (masyw Kosciuszki): lodowce karowo-dolinne ~%K% km² (SCHEMAT: krąg; 12–15 km² w LGM wg Colhoun & Barrows 2011 i Barrows i in. 2001, QR 55:179 — najmniej zlodowaciały kontynent świata)', 15 * ausScale, -36.455, 148.265]
    ];
    /* skala 0 → brak wpisu (dysk zerowy by się zdegenerował — por. fix mikro-plam Afryki) */
    return defs.filter(d => d[1] >= 0.05).map(d => ({ name: d[0].replace('%K%', Math.round(d[1])), pts: afrDisc(d[2], d[3], d[1]) }));
  }
  ICE_SETS.przedmaksymalny = ICE_SETS.przedmaksymalny.concat(ausGlac(1, 1, 1));
  ICE_SETS.lgm = ICE_SETS.lgm.concat(ausGlac(1, 1, 1));
  ICE_SETS.poznanska = ICE_SETS.poznanska.concat(ausGlac(0.8, 0.95, 0.9));   // Giluwe blisko maks. do ~15,4 ka; Snowy: nasunięcie 16,8 ka
  ICE_SETS.pomorska = ICE_SETS.pomorska.concat(ausGlac(0.35, 0.5, 0.25));    // szybka cofka NG 15,4→11,5 ka; Tasmania — drobny lód do ~14 ka
  ICE_SETS.bolling_allerod = ICE_SETS.bolling_allerod.concat(ausGlac(0.1, 0.25, 0));
  ICE_SETS.younger_dryas = ICE_SETS.younger_dryas.concat(ausGlac(0.05, 0.15, 0)); // BRAK readvance mł.-dryas. (Barrows i in. 2002) — Q19 ≠ Atlas!
  ICE_SETS.early_holocene = ICE_SETS.early_holocene.concat(ausGlac(0, 0.01, 0));  // NG: lód do pocz. holocenu; Tasmania/kontynent: 0
  /* q-przekroje (app.js envIcePolys): q_lgm = zasięg skali LGM (austGlac 1,1,1); starsze
     stadiały = WCZEŚNIEJSZE, WIĘKSZE maksima: Tasmania 4500 km² (śr. plejstocen 4000–5000;
     wcz. plejstocen ~7000), Kosciuszko 40 km² (wczesna glacjacja >59 ka rozleglejsza — pow.
     orientacyjna), Nowa Gwinea bez zmian (epokowo-neutralny schemat max). MIS 5a–d: zero. */
  window.PA_AUS_LGM = ausGlac(1, 1, 1);
  window.PA_AUS_SCHEMAT = [
    { name: 'Nowa Gwinea — Pasmo Sudirmana (Maoke): pole lodowe ~3400 km² (SCHEMAT: krąg; >3400 km² niemal ciągłego pola wg Prentice i in. 2011 — przekrój epokowo-neutralny, nie czasorozróżniony)', pts: afrDisc(-4.25, 138.0, 3400) },
    { name: 'Nowa Gwinea — Mt Giluwe: czapolód ~188 km² (SCHEMAT: krąg; do 188 km² wg Barrows i in. 2011 QSR 30:2676; glacjacje sięgają ~300 ka)', pts: afrDisc(-6.05, 143.92, 188) },
    { name: 'Tasmania — Central Plateau: czapolód ~3000 km² (SCHEMAT: krąg; śr.-plejstocen. maksimum 4000–5000 km² Tasmanii wg Colhoun & Barrows 2011; wcz. plejstocen ~7000 km²; Kiernan 1990: ~6000 km² Central Highlands)', pts: afrDisc(-41.75, 146.55, 3000) },
    { name: 'Tasmania — West Coast Ranges + płn.-zachód: ~1400 km² (SCHEMAT: krąg; jak wyżej — wcześniejsze glacjacje rozleglejsze niż LGM)', pts: afrDisc(-42.15, 145.85, 1400) },
    { name: 'Tasmania — Ben Lomond NE: ~100 km² (SCHEMAT: krąg; jak wyżej)', pts: afrDisc(-41.58, 147.55, 100) },
    { name: 'Australia — Snowy Mountains (Kosciuszko): wczesna glacjacja >59 ka ~40 km² (SCHEMAT: krąg; rozleglejsza niż późna 12–15 km² — Barrows i in. 2001 QR 55:179; pow. orientacyjna)', pts: afrDisc(-36.455, 148.265, 40) }
  ];

  /* NOWA ZELANDIA: największa górska glacjacja płk. płd. poza Andami. Jak wyżej: brak
     otwartego GIS przekrojów → krąg = SCHEMAT kształtu, Σ z publikacji:
       Σ NZ w LGM ~40 tys. km² scalonego kompleksu Southern Alps (lodowiec ~30 km szer.
       na ~700 km długości) — Porter 1975; Barrell 2011; Golledge i in. 2012, QSR.
       Rozbicie na sektory = przybliżenie portalu (schemat w schemacie — etykiety to mówią).
       Chronologia (10Be): maks. ~26–20 ka; początek szybkiej cofki ~18 ka (Putnam i in.
       2013, QSR 62:114 — Lake Ohau/Rakaia; Rother, Shulmeister i in.); ACR (~14,5–12,9 ka):
       READVANCE 1–3 km (Putnam i in. 2010, Nat. Geosci. 3:700) — zachowujemy poziom balu
       pomorskiego w B–A; młody dryas: COFKA/stop (Kaplan i in. 2010, Nature 467:194 —
       do 11,5 ka w promieniu ~1 km od stanu dzisiejszego). MIS 3: nasunięcie ~42 ka
       (Kelley i in. 2014, EPSL 405:194); MIS 4 ~65 ka = „Southern Glacial Maximum” —
       największy stan z ostatnich 130 tys. lat (Schaefer i in. 2015, QSR 114:410) →
       schemat głęboki = 1,15× LGM. Wyspa Płn.: glacjacje Ruapehu i Tongariro do ~1200 m
       (Eaves & Brook 2020, NZ J. Geol. Geophys.) — pow. orientacyjna.
     Skale per tick = ARBITRALNE proporcje schematu (kotwice = powyżej). */
  function nzGlac(scale, suffix) {
    var SUF = suffix || ' (SCHEMAT: krąg; Σ NZ w LGM ~40 tys. km² — Porter 1975/Barrell 2011/Golledge i in. 2012, QSR; rozbicie sektorowe = przybliżenie portalu)';
    var defs = [
      ['Nowa Zelandia — NW Nelson/Spenser Mtns: lodowce dolinne ~%K% km²' + SUF, 1500 * scale, -42.3, 172.3],
      ['Nowa Zelandia — West Coast: kompleks dolinno-predmontowy (Kumara–Moana) ~%K% km²' + SUF, 8000 * scale, -42.9, 171.1],
      ['Nowa Zelandia — system Rakaia (Canterbury): ~%K% km²' + SUF, 6500 * scale, -43.7, 170.6],
      ['Nowa Zelandia — system Rangitata: ~%K% km²' + SUF, 4000 * scale, -44.05, 170.35],
      ['Nowa Zelandia — system Waitaki (Tekapo–Pukaki–Ohau): ~%K% km² — największy kompleks; kotwica 10Be LGM: Putnam i in. 2013, QSR 62:114' + SUF, 10500 * scale, -44.1, 169.55],
      ['Nowa Zelandia — system Clutha (Wakatipu–Wanaka–Hawea): ~%K% km²' + SUF, 6000 * scale, -44.85, 168.8],
      ['Nowa Zelandia — Fiordland: lodowce fiordowe ~%K% km²' + SUF, 3000 * scale, -45.4, 166.8],
      ['Nowa Zelandia — wyspa Płn., Ruapehu: glacjacja do ~1200 m ~%K% km² (SCHEMAT: krąg; Eaves & Brook 2020, NZ J. Geol. Geophys.; pow. orientacyjna)', 35 * scale, -39.28, 175.57],
      ['Nowa Zelandia — wyspa Płn., Tongariro: glacjacja do ~1200 m ~%K% km² (SCHEMAT: krąg; jak wyżej — Eaves & Brook 2020; pow. orientacyjna)', 15 * scale, -39.13, 175.64]
    ];
    return defs.filter(d => d[1] >= 0.05).map(d => ({ name: d[0].replace('%K%', Math.round(d[1])), pts: afrDisc(d[2], d[3], d[1]) }));
  }
  /* ticki: cofka od ~18 ka; ACR: B–A TRZYMA poziom pomorskiej (readvance), YD = cofka */
  var NZ_TIERS = { przedmaksymalny: 1, lgm: 1, poznanska: 0.8, pomorska: 0.4, bolling_allerod: 0.4, younger_dryas: 0.22, early_holocene: 0.03 };
  ['przedmaksymalny', 'lgm', 'poznanska', 'pomorska', 'bolling_allerod', 'younger_dryas', 'early_holocene']
    .forEach(function (k) { ICE_SETS[k] = ICE_SETS[k].concat(nzGlac(NZ_TIERS[k])); });
  var NZ_NOW = [
    { name: 'Nowa Zelandia — Southern Alps (Aoraki/Mt Cook i reszta; 2 918 lodowców): DZIŚ 794 ± 34 km² — POMIAR (Baumann i in. 2021, J. Glaciol. 67:7–24, stan 2016; schemat kształtu — 1 dysk zbiorczy; 1978: 1 158 km² wg Chinn 2001; 7 lodowców >10 km²; obrysy jednostkowe: RGI 7.0 — pobranie po zalogowaniu NSIDC)', src: 'POMIAR', pts: afrDisc(-43.9, 169.9, 794) },
    { name: 'Nowa Zelandia — Ruapehu (wyspa Płn.): DZIŚ 3,0 km² — POMIAR (Eaves & Brook 2020; jedyny lód wyspy Płn.; 1988: ~4 km²; zanik prognozowany)', src: 'POMIAR', pts: afrDisc(-39.28, 175.57, 3) }
  ];
  ICE_SETS.now = ICE_HOLOCENE.concat(AFRICA_NOW).concat(AUS_NOW).concat(NZ_NOW);
  /* q-przekroje (app.js envIcePolys): q_lgm = skala LGM; starsze stadiały = MIS 4 „Southern
     Glacial Maximum” (~65 ka) ≈ 1,15× LGM (Schaefer i in. 2015); MIS 5a–d: stan jak dziś. */
  window.PA_NZ_LGM = nzGlac(1);
  window.PA_NZ_SCHEMAT = nzGlac(1.15, ' (SCHEMAT: krąg; maks. MIS 4 ~65 ka = Southern Glacial Maximum — Schaefer i in. 2015, QSR 114:410, największy stan 130 tys. lat; Σ LGM-analog ~40 tys. km² wg Porter 1975/Golledge i in. 2012)');

  // ---- przypisanie zestawów do faz z pliku zlodowacenia_biomy.csv ----
  return {
    by_faza: {
      'poludniowopolskie':        { ice: 'south_polish',   land: LAND_LGM },
      'interglacjal_mazowiecki':  { ice: 'mazowiecki',     land: [] },
      'zlodowacenie_odry':        { ice: 'odra',           land: LAND_LGM },
      'zlodowacenie_warty':       { ice: 'warta',          land: LAND_LGM },
      'interglacjal_eemski':      { ice: 'eem',            land: [] },
      'wczesny_wisly':            { ice: 'early_vistulian', land: LAND_DEGL },
      'stadial_mis4':             { ice: 'mis4',           land: LAND_DEGL },
      'interpleniglacjal_mis3':   { ice: 'mis3',           land: LAND_DEGL },
      'stadial_przedmaksymalny':  { ice: 'przedmaksymalny', land: LAND_LGM },
      'lgm_faza_leszczynska':     { ice: 'lgm',            land: LAND_LGM },
      'faza_poznanska':           { ice: 'poznanska',      land: LAND_LGM },
      'faza_pomorska':            { ice: 'pomorska',       land: LAND_DEGL },
      'interstadial_bolling_allerod': { ice: 'bolling_allerod', land: LAND_YD },
      'mlodszy_dryas':            { ice: 'younger_dryas',  land: LAND_YD },
      'wczesny_holocen':          { ice: 'early_holocene', land: LAND_EARLY_HOLO },
      'atlantyk':                 { ice: 'atlantic',       land: [{ name: 'Dogger Bank (ostatni suchy pagórek)', pts: LB_DOGGER_BANK }] },
      'przyszle_epoki':           { ice: 'now',            land: [] }
    },
    ice_sets: ICE_SETS
  };
})();
