/* ============================================================================
   PaleoAtlas — logika aplikacji
   Dane: window.SITES (rdzeń+sąsiedzi), window.META (kultury/bloki/fazy),
         window.PALEO (lądolody/landbridges), window.GLOSSARY, window.TOM1
============================================================================ */
(function () {
'use strict';

/* ============ STRAŻNIK DANYCH (odporność startu) ============
   Ten plik zakłada, że 23 skrypty z js/data/ wczytały się PRZED nim. Do tej pory brak
   jednego z nich kończył się wyjątkiem w połowie inicjalizacji: biała strona, pusta
   konsola, zero informacji dla użytkownika. Teraz mówimy wprost, czego brakuje. */
const REQUIRED_GLOBALS = ['SITES', 'META', 'PALEO', 'GLOSSARY', 'TOM1', 'ENV', 'SHELVES', 'BIOME_META'];
const missingGlobals = REQUIRED_GLOBALS.filter(n => !window[n]);
if (missingGlobals.length) {
  const host = document.getElementById('map') || document.body;
  host.innerHTML = '<div class="boot-error" role="alert">'
    + '<h2>Nie udało się wczytać danych atlasu</h2>'
    + '<p>Brakuje: <code>' + missingGlobals.join(', ') + '</code>.</p>'
    + '<p>Odśwież stronę (Ctrl+R). Jeśli otwierasz plik prosto z dysku, użyj wersji '
    + 'jednoplikowej <code>PaleoAtlas_OFFLINE.html</code> — zwykły <code>index.html</code> '
    + 'wymaga serwera (np. <code>python3 -m http.server</code>).</p></div>';
  console.error('PaleoAtlas: brak danych — ' + missingGlobals.join(', '));
  return;
}

/* ------------------------------------------------- stałe i słowniczki UI */
const CULT = {}; META.kultury.forEach(c => CULT[c.id] = c);
/* Jedna zła/nowa wartość `kultura` w danych nie może wywalić całej mapy (pętla rysująca
   punkty przerwie się w połowie) ani karty stanowiska („Cannot read properties of
   undefined"). Nieznana kultura dostaje neutralny szary i własną nazwę jako etykietę. */
const CULT_FALLBACK = { nazwa: 'kultura spoza słownika', kolor: '#8d8474' };
const cultOf = k => CULT[k] || (k ? { nazwa: String(k), kolor: CULT_FALLBACK.kolor } : CULT_FALLBACK);

/* Preferencja „mniej ruchu" (WCAG 2.3.3 / prefers-reduced-motion): wyłączamy animacje
   programowe (flyTo, płynny zoom, fade kafelków). Ruch inicjowany przez użytkownika
   (przeciąganie mapy, animacja osi po ▶) zostaje — to jego świadoma decyzja. */
/* UWAGA: tu MUSI być obiekt MediaQueryList, nie boolean — podwójna negacja
   (!!) zamieniłaby go w true/false i .matches byłby zawsze undefined
   (dokładnie taki błąd wyszedł w teście 10.14). */
const REDUCED_MOTION = (window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null);
const noMotion = () => !!(REDUCED_MOTION && REDUCED_MOTION.matches);
/* jedno miejsce decydujące, czy „lot" ma animację */
function flyToPoint(latlng, zoom) {
  if (noMotion()) map.setView(latlng, zoom, { animate: false });
  else map.flyTo(latlng, zoom, { duration: .6 });
}

const TYP_PL = {
  obozowisko_otwarte: 'Obozowisko otwarte', jaskinia_schronisko: 'Jaskinia / schronisko',
  pracownia_kopalnia: 'Pracownia / kopalnia', inne: 'Inne', kompleks_mikroregion: 'Kompleks / mikroregion',
  pochowek_cmentarzysko: 'Pochówek / cmentarzysko', artefakt_izolowany: 'Artefakt izolowany',
  eponim_kultury: 'Stanowisko eponimiczne', obozowisko_torfowe: 'Obozowisko torfowe',
  obozowisko_otwarte_pracownia: 'Obozowisko + pracownia', kopalnia_szybowa: 'Kopalnia szybowa'
};
const HOM_PL = {
  neandertalczyk: 'Neandertalczyk', Homo_sapiens: 'Homo sapiens', wczesny_Homo: 'wczesny Homo',
  neandertalczyk_wczesniej: 'neandertalczyk (wcześniej)', sporne: 'sporne'
};
const STATUS_PL = {
  POTWIERDZONE: 'Potwierdzone', CZESCIOWO: 'Częściowo potwierdzone',
  KWESTIONOWANE: 'Kwestionowane', ZWERYFIKOWANE: 'Zweryfikowane'
};
const STATUS_ICO = { POTWIERDZONE: '✅', CZESCIOWO: '◐', KWESTIONOWANE: '⚠', ZWERYFIKOWANE: '✅' };
const ROLA_SZ = s => s.rola.some(r => r.startsWith('FILAR')) ? 9 : (s.rola.some(r => r.startsWith('WEZEL')) ? 6.5 : 4.5);

/* fazy z META są posortowane od najstarszej — budujemy oś (17 równych segmentów) */
const FAZY = META.fazy;                    // [{id,nazwa,od_tys,do_tys,...}]
const SEG = 100;                            // kroków suwaka na fazę
const TL_MAX = FAZY.length * SEG;           // 1700

const SEG_SHORT = {
  glep_narzedzia: 'Lomekwi/Oldowan', glep_ekspansja: 'Ekspansja Homo',
  poludniowopolskie: 'Złod. połudn.', interglacjal_mazowiecki: 'Intergl. mazow.', zlodowacenie_odry: 'Odra',
  zlodowacenie_warty: 'Warta', interglacjal_eemski: 'Eem', wczesny_wisly: 'Wczesna Wisła',
  stadial_mis4: 'MIS 4', interpleniglacjal_mis3: 'MIS 3', stadial_przedmaksymalny: 'Przed-maks.',
  lgm_faza_leszczynska: 'LGM', faza_poznanska: 'Poznańska', faza_pomorska: 'Pomorska',
  interstadial_bolling_allerod: 'Bøll–All.', mlodszy_dryas: 'Mł. dryas', wczesny_holocen: 'Holocen',
  atlantyk: 'Atlantyk', przyszle_epoki: 'Neolit→dziś'
};

/* ================= GLOBALNA CHRONOLOGIA ŚRODOWISKOWA (osobna od faz!) ==========
   Lądolod i poziom morza płyną wg window.ENV (tools/build_env.py):
   <30 ka zestawy portalu (DATED-1 + linie PL), ≥30 ka Batchelor 2019 (best estimate),
   interglacjały = stan jak dziś. Wybór: najbliższy przekrój (Δ pokazywane w karcie). */
const ENV_TICKS = (window.ENV && ENV.ticks) || [];
const ENV_SEA = (window.ENV && ENV.sea) || [[0, 0]];
function envTickForBP(bp) {
  if (!ENV_TICKS.length) return null;
  /* priorytet: przekroje z oknem piętra (klucz w = [młodsza, starsza granica MIS]
     wg Railsback i in. 2015 / LR04) — wybór zgodny z realnymi granicami stadiałów,
     np. 713 tys. ląduje w MIS 18 (stadiał), a nie w sąsiednim interglacjale */
  for (const t of ENV_TICKS) {
    if (t.w && bp >= t.w[0] && bp <= t.w[1]) return t;
  }
  let best = ENV_TICKS[0], bd = Math.abs(bp - best.bp);
  for (const t of ENV_TICKS) {
    const d = Math.abs(bp - t.bp);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
function seaAtBP(bp) {
  const ka = bp / 1000;
  const S = ENV_SEA;
  if (ka <= S[0][0]) return S[0][1];
  for (let i = 1; i < S.length; i++) {
    if (ka <= S[i][0]) {
      const [k0, m0] = S[i - 1], [k1, m1] = S[i];
      return m0 + (m1 - m0) * (ka - k0) / (k1 - k0);
    }
  }
  return S[S.length - 1][1];
}
function shelfForSea(sea) {
  if (sea >= 0) return null;                 // eem/pliocen: linia brzegowa jak dziś lub węższa
  let best = SHELF_LEVELS[0];
  SHELF_LEVELS.forEach(l => { if (Math.abs(l - sea) < Math.abs(best - sea)) best = l; });
  return best;
}
function envKind(env) {                  // 'gl' = stadiał z lądolodami, 'ig' = międzylodowcowy
  if (!env) return 'ig';
  if (env.q) return 'gl';
  return env.ice === 'now' ? 'ig' : 'gl';
}
/* poligony lądolodu dla przekroju env: */
/* cache tablic poligonów: zawartość zależy tylko od (klucz epoki env, wariant BIIS);
   wielokrotne wywołania z tej samej epoki zwracają identyczną tablicę (bez mutacji po stronie wołających) */
const ICE_POLY_CACHE = {};
function envIcePolysCached(env) {
  const bv = (typeof window !== 'undefined' && window.BRITICE_VARIANT) || 'opt';
  const key = (!env || (!env.ice && !env.q) ? 'now' : env.ice ? 'i:' + env.ice : 'q:' + env.q) + ':' + bv;
  if (!ICE_POLY_CACHE[key]) ICE_POLY_CACHE[key] = envIcePolys(env);
  return ICE_POLY_CACHE[key];
}
function envIcePolys(env) {
  if (!env) return PALEO.ice_sets.now || [];
  if (env.ice) return PALEO.ice_sets[env.ice] || [];
  if (env.q && window.ICE_QUAT && ICE_QUAT[env.q]) {
    const extra = [];
    /* Antarktyda w przekrojach Q19: wpis „dziś” (ICE-6G_C 0 ka, DANE) jako KOTWICA —
       ale z jawną notką: ≥ MIS 3 nie istnieją otwarte przekroje empiryczne
       (RAISED/Bentley 2014 dochodzi tylko do LGM). Kopiujemy wpis (nie mutujemy „now”). */
    (PALEO.ice_sets.now || []).forEach(p => {
      if (/Antarktyd/.test(p.name)) extra.push(Object.assign({}, p, {
        name: p.name + ' — kotwica ≈ „dziś”: dla ≥ MIS 3 nie ma otwartych przekrojów empirycznych'
          + ' (RAISED — Bentley i in. 2014, QSR 100:1–9 — kończy się na LGM; starsze stadiały'
          + ' wielkościowo nieznane, modelowo ≈ „dziś” lub większe)'
      }));
    });
    /* Patagonia w przekrojach Q19: Q19 obejmuje Amerykę Płd. TYLKO w q_45ka i q_gauss
       (pojedynczy limit nieczasorozróżniony). Tam: dane z pliku. 30/35 ka: PATICE.
       Interstadialia MIS 5a–d: brak danych → stan jak dziś (bez schematu).
       Pozostałe stadiały (MIS 4/6/8…, Matuyama, 40 ka): schemat portalu z etykietą. */
    const PATICE_Q = { q_30ka: 'p30ka', q_35ka: 'p35ka', q_lgm: 'p20ka' };
    const Q19_HAS_SA = { q_45ka: 1, q_gauss: 1 };
    if (window.ICE_PATICE && PATICE_Q[env.q] && ICE_PATICE[PATICE_Q[env.q]]) {
      ICE_PATICE[PATICE_Q[env.q]].forEach(p => extra.push(p));
    } else if (/mis5[abcd]/.test(env.q) || Q19_HAS_SA[env.q]) {
      /* świadomie nic — patrz komentarz wyżej */
    } else if (window.PA_PAT_schemat) {
      /* etykieta epokowa (z ticka ENV) + pełne cytaty — patrz ice_patice.js */
      extra.push(window.PA_PAT_schemat((env.label || '').split(' — ')[0]));
    } else if (window.PA_PATAGONIA_SCHEMAT) {
      extra.push(window.PA_PATAGONIA_SCHEMAT);
    }
    /* paleojeziora przylodowcowe Patagonii (PATICE-LAKES): najbliższy publikowany
       przekrój dla q_30ka/q_35ka; <30 ka jeziora splicowane do PALEO.ice_sets;
       ≥40 ka: brak rekonstrukcji jezior (PATICE zaczyna się od 35 ka) */
    const PATLAK_Q = { q_30ka: 'l30ka', q_35ka: 'l35ka' };
    if (window.PATICE_LAKES && PATLAK_Q[env.q]) {
      (PATICE_LAKES[PATLAK_Q[env.q]] || []).forEach(l => extra.push({
        name: l.name + ' — paleojezioro przylodowcowe (PATICE ' + PATLAK_Q[env.q].slice(1, 3) + ' ka)',
        lname: l.name, lref: l.ref, lalt: l.alt, larea: l.area, lnote: l.note,
        lake: 1, lp: PATLAK_Q[env.q], rings: l.rings
      }));
    }
    /* Afryka (niezależny region): glacjacje górskie jako schemat z powierzchnią z publikacji —
       w każdym stadiałowym przekroju Q19 (ani Q19, ani inne bazy ich nie obejmują);
       w interstadialiach MIS 5a–d stan jak dziś (bez lodu afrykańskiego). */
    if (!/mis5[abcd]/.test(env.q)) {
      /* fala 2 GLACIMONTIS: q_lgm = dane empiryczne Rift+Atlas; głębsze stadiały = schemat */
      const afr = env.q === 'q_lgm' && window.PA_AFRYKA_LGM ? window.PA_AFRYKA_LGM : window.PA_AFRYKA_SCHEMAT;
      if (afr) afr.forEach(p => extra.push(p));
    }
    /* Australia + Nowa Gwinea + Tasmania (niezależny region): schemat z powierzchnią z
       publikacji (ani Q19, ani DATED-1 nie obejmują tych glacjacji górskich).
       q_lgm = zasięg skali LGM (Tasmania 1085 km²); starsze stadiały = WCZEŚNIEJSZE,
       WIĘKSZE maksima (Tasmania 4000–5000, w wcz. pljst. ~7000 km²); MIS 5a–d: bez lodu. */
    if (!/mis5[abcd]/.test(env.q)) {
      const aus = env.q === 'q_lgm' ? window.PA_AUS_LGM : window.PA_AUS_SCHEMAT;
      if (aus) aus.forEach(p => extra.push(p));
    }
    /* Nowa Zelandia: największa górska glacjacja płk. płd. poza Andami (Σ LGM ~40 tys. km²);
       q_lgm = skala LGM; starsze stadiały = MIS 4 ~65 ka (Southern Glacial Maximum, ~1,15×);
       MIS 5a–d: bez lodu. */
    if (!/mis5[abcd]/.test(env.q)) {
      const nz = env.q === 'q_lgm' ? window.PA_NZ_LGM : window.PA_NZ_SCHEMAT;
      if (nz) nz.forEach(p => extra.push(p));
    }
    return ICE_QUAT[env.q].concat(extra);
  }
  return PALEO.ice_sets.now || [];
}

/* `zoomWarnShown` usunięty: nigdzie nie był czytany ani zapisywany (martwe pole). */
const state = { bp: 800000, filters: { q: '', kultura: null, typ: null, hom: null, status: null } };

/* suwak → lata BP (tys → lata) */
function sliderToBP(v) {
  const p = Math.min(FAZY.length - 1, Math.floor(v / SEG));
  const f = FAZY[p], frac = (v - p * SEG) / SEG;
  return (f.od_tys - frac * (f.od_tys - f.do_tys)) * 1000;
}
function bpToSlider(bp) {
  for (let p = 0; p < FAZY.length; p++) {
    const f = FAZY[p];
    if (bp <= f.od_tys * 1000 && bp >= f.do_tys * 1000)
      return p * SEG + (f.od_tys * 1000 - bp) / ((f.od_tys - f.do_tys) * 1000) * SEG;
  }
  return TL_MAX;
}
function fazaForBP(bp) {
  for (const f of FAZY) if (bp <= f.od_tys * 1000 && bp >= f.do_tys * 1000) return f;
  return FAZY[FAZY.length - 1];
}
function fmtBP(bp) {
  if (bp >= 1000000) return (Math.round(bp / 100000) / 10).toString().replace('.', ',') + ' mln lat temu';
  if (bp >= 100000) return Math.round(bp / 1000) + ' tys. lat temu';
  if (bp >= 1000) return (Math.round(bp / 100) / 10).toString().replace('.', ',') + ' tys. lat temu';
  if (bp >= 100) return 'ok. ' + Math.round(bp) + ' lat temu';
  return 'dziś';
}
const isVisible = (s, bp) => s.do <= bp && bp <= s.od;

/* ---------- deduplikacja i filtry stanowisk ----------
   Rekordy oznaczone w bazie rola_portalu=DUPLIKAT (PM-094→PM-030, PM-099→PM-142,
   PM-128→PM-127) NIE są rysowane na mapie ani liczone w legendzie — portal ma
   linkować do rekordu wiodącego, nie dublować treści. Ich karty są dostępne
   (chips „powiązane”, wyszukiwarka nie indeksuje duplikatów). */
const isDupe = s => (s.rola || []).indexOf('DUPLIKAT') >= 0;
const filtersActive = () => {
  const f = state.filters;
  return !!(f.q || f.kultura || f.typ || f.hom || f.status);
};
function matchesFilters(s) {
  const f = state.filters;
  if (f.kultura && s.kultura !== f.kultura) return false;
  if (f.typ && s.typ !== f.typ) return false;
  if (f.status && s.status !== f.status) return false;
  if (f.hom && (s.homininy || []).indexOf(f.hom) < 0) return false;
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = [s.id, s.nazwa, s.kraj, s.kultura_raw, cultOf(s.kultura).nazwa, s.blok_nazwa,
      s.datowanie_tekst, s.woj, s.powiat, s.gmina, s.region, (s.epoki || []).join(' '),
      STATUS_PL[s.status], TYP_PL[s.typ]].filter(Boolean).join(' ').toLowerCase();
    if (hay.indexOf(q) < 0) return false;
  }
  return true;
}

/* =========================================================================== MAPA */
const map = L.map('map', { center: [52.3, 19.8], zoom: 6, minZoom: 3, maxZoom: 11, worldCopyJump: true, zoomControl: true, attributionControl: true,
  /* „mniej ruchu": bez płynnego zoomu i przenikania kafelków (Leaflet 1.9 czyta to przy starcie) */
  zoomAnimation: !noMotion(), fadeAnimation: !noMotion(), markerZoomAnimation: !noMotion() });
map.attributionControl.setPrefix('PaleoAtlas (MVP)');

/* Preferencja „mniej ruchu" bywa zmieniana w trakcie sesji (i w emulacji przeglądarki
   potrafi dojść po starcie dokumentu) — dlatego nie wystarczy jej odczytać przy
   tworzeniu mapy: stosujemy ją także teraz i przy każdej zmianie. Leaflet trzyma
   efektywne flagi w _zoomAnimated/_fadeAnimated, więc ustawiamy oba poziomy. */
function applyMotionPreference() {
  const reduce = noMotion();
  map.options.zoomAnimation = !reduce;
  map.options.fadeAnimation = !reduce;
  map.options.markerZoomAnimation = !reduce;
  map._zoomAnimated = !reduce && !!(L.Browser.any3d);
  map._fadeAnimated = !reduce && !!(L.Browser.any3d);
}
applyMotionPreference();
if (REDUCED_MOTION && REDUCED_MOTION.addEventListener) {
  REDUCED_MOTION.addEventListener('change', applyMotionPreference);
}

const P = name => { map.createPane(name); return name; };
['biomePane', 'landPane', 'ghostPane', 'hullPane', 'icePane', 'sitesPane', 'nbrPane'].forEach(P);
map.getPane('landPane').style.zIndex = 330;   // lądy (epoka) + wyschnięte szelfy
map.getPane('biomePane').style.zIndex = 337;  // biom kontynentu (nad lądami)
map.getPane('ghostPane').style.zIndex = 345;  // duch współczesnej linii brzegowej
map.getPane('hullPane').style.zIndex = 350;
map.getPane('icePane').style.zIndex = 360;
map.createPane('pollenPane');
map.getPane('pollenPane').style.zIndex = 365;  // kotwice pyłkowe BIOME 6000 (nad lądolodem)
map.getPane('nbrPane').style.zIndex = 605;
map.getPane('sitesPane').style.zIndex = 610;

/* RENDERERY CANVAS dla ciężkich warstw wektorowych.
   Przekroje Q19 (Batchelor) to JEDEN poligon o 4000+ pierścieni i ~100 tys. wierzchołków
   — jako pojedyncza ścieżka SVG potrafi mieć megabajt atrybutu "d"; iOS Safari po cichu
   przestaje ją malować (warstwa "znika całkowicie" — dokładnie zgłoszony efekt).
   Canvas nie ma takiego limitu, a do tego rysuje dużo szybciej przy animacji osi.
   Tooltipy działają z rendererem canvas (Leaflet liczy trafienia geometrycznie). */
const RENDER_CANVAS = {
  ice: L.canvas({ pane: 'icePane', padding: 0.4 }),
  land: L.canvas({ pane: 'landPane', padding: 0.4 }),
  ghost: L.canvas({ pane: 'ghostPane', padding: 0.2 })
};

/* kolor lądu w trybie paleo — ten sam dla kontynentów i wyschniętych szelfów,
   żeby wizualnie zlewały się w linie brzegowe z epoki */
const LAND_COLOR = '#cfc39f';
const LAND_STROKE = '#6b5f45';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
const tiles = {
  terrain: L.tileLayer(ESRI + 'World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri, USGS, NOAA · relief fizyczny' }),
  physical: L.tileLayer(ESRI + 'World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri, USGS, NOAA · mapa fizyczna' }),
  hydro: L.tileLayer(ESRI + 'Reference/World_Hydro_Reference_Overlay/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri · hydrografia', opacity: .95 }),
  borders: L.tileLayer(ESRI + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Esri · granice i miejscowości' }),
  osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenStreetMap contributors' }),
  otm: L.tileLayer('https://tile.opentopomap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenTopoMap (CC-BY-SA)' })
};
const group = {
  biome: L.layerGroup(), land: L.layerGroup(), ice: L.layerGroup(),
  pollen: L.layerGroup(), hulls: L.layerGroup(), rdzen: L.layerGroup(), sasiedzi: L.layerGroup()
};

/* BEZ doklejania kafelków na starcie: aplikacja startuje w trybie paleo (setPaleoView(true)
   na końcu init), więc zewnętrzne warstwy i tak byłyby od razu zdejmowane — rano oszczędzamy
   sztorm zapytań do Esri/OSM/OTM (telefon: szybszy start; tryb podglądu offline: zwisałyby
   na timeoutach do zamkniętej sieci). Zostaną dodane dopiero przy wyłączeniu trybu paleo. */
Object.values(group).forEach(g => g.addTo(map));

/* geometria kontynentów (Natural Earth 50m):
   - landCover: pełny ląd w trybie paleo (podkład zamiast współczesnych kafelków)
   - ghostCoast: "duch" dzisiejszej linii brzegowej dla orientacji */
const landCover = L.geoJSON(window.WORLD_LAND, {
  pane: 'landPane', interactive: false, renderer: RENDER_CANVAS.land,
  style: { stroke: false, fillColor: LAND_COLOR, fillOpacity: 1 }
});
const ghostCoast = L.geoJSON(window.WORLD_LAND, {
  pane: 'ghostPane', interactive: false, renderer: RENDER_CANVAS.ghost,
  style: { color: LAND_STROKE, weight: 1, dashArray: '3 4', opacity: .55, fill: false }
});

const layersCtl = L.control.layers(
  { 'Relief (Esri Terrain)': tiles.terrain,
    'Fizyczna kolorowa (Esri)': tiles.physical,
    'Współczesna OSM': tiles.osm,
    'Topograficzna OpenTopoMap': tiles.otm,
    'Ciemne tło (paleo)': L.layerGroup() },
  { '🌊 Rzeki i jeziora': tiles.hydro,
    '🏛️ Granice współczesne + miejscowości': tiles.borders,
    '👻 Współczesna linia brzegowa (duch)': ghostCoast,
    '🧊 Lądolód': group.ice,
    '🌿 Biomy (modele naukowe)': group.biome,
    '🌾 Kotwice pyłkowe BIOME 6000 (DANE)': group.pollen,
    '🟤 Dawne lądy (niski poziom morza)': group.land,
    '🇵🇱 Stanowiska — rdzeń (Polska)': group.rdzen,
    '🌍 Stanowiska zagraniczne (kontekst)': group.sasiedzi },
  { position: 'topright', collapsed: true }
).addTo(map);

/* Nota prywatności przy przełączniku podkładów (P0.4 / bramka v1.0).
   Podkłady to jedyne miejsce, w którym portal dotyka cudzych serwerów — i tylko tam,
   gdzie jest to konieczne (kafle wczytywane leniwie, wyłącznie po wyjściu z trybu paleo).
   Nota jest w DOM kontrolki, więc pokazuje się razem z jej rozwinięciem. */
(function tilePrivacyNote() {
  const box = layersCtl.getContainer();
  if (!box) return;
  /* Nota MUSI siedzieć w sekcji listy kontrolki — element doklejony do samego
     kontenera był widoczny także przy ZWINIĘTEJ kontrolce i nachodził na kartę fazy
     (wykryte przez test M2.2: dotknięcie karty trafiało w notę). */
  const list = box.querySelector('.leaflet-control-layers-list') || box;
  const note = document.createElement('div');
  note.className = 'tile-note';
  note.innerHTML = 'Podkłady (Esri · OSM · OpenTopoMap) pobierane są z serwerów tych dostawców — '
    + 'tylko po wyłączeniu trybu „lądy z epoki”. Reszta portalu nie wykonuje żadnych zapytań '
    + 'sieciowych i nie stawia ciastek. Wersja offline: <code>PaleoAtlas_OFFLINE.html</code>.';
  list.appendChild(note);
})();

/* ---------------- TRYB PALEO: lądy wyglądają jak w epoce z osi ----------------
   - ukrywa współczesne kafelki podkładu, rzeki i granice (były inne niż dziś)
   - pokazuje kontynenty (NE 50m) + wyschnięte szelfy + lądolód nad oceanem
   - zostawia "ducha" dzisiejszej linii brzegowej dla orientacji (przerywana linia) */
let paleoView = false, paleoPrev = null, autoGhost = false;
const paleoBtn = document.getElementById('paleo-view');
function setPaleoView(on) {
  if (on === paleoView) return;
  paleoView = on;
  paleoBtn.classList.toggle('on', on);
  paleoBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  paleoBtn.innerHTML = '🌎 Widok: lądy z epoki <b>' + (on ? 'WŁ.' : 'WYŁ.') + '</b>';
  const cont = map.getContainer();
  if (on) {
    paleoPrev = {
      base: ['terrain', 'physical', 'osm', 'otm'].find(k => map.hasLayer(tiles[k])) || null,
      hydro: map.hasLayer(tiles.hydro), borders: map.hasLayer(tiles.borders)
    };
    if (paleoPrev.base) map.removeLayer(tiles[paleoPrev.base]);
    if (paleoPrev.hydro) map.removeLayer(tiles.hydro);
    if (paleoPrev.borders) map.removeLayer(tiles.borders);
    cont.classList.add('paleo');
    if (!map.hasLayer(ghostCoast)) { ghostCoast.addTo(map); autoGhost = true; }
    renderTimeLayers();
  } else {
    cont.classList.remove('paleo');
    /* start bez kafelków (tryb paleo domyślny): pierwsze WYŁ. nie ma czego „przywracać" —
       wracamy do standardowego zestawu: relief + rzeki + granice (dawne domyślne warstwy startowe) */
    const pb = (paleoPrev && (paleoPrev.base || paleoPrev.hydro || paleoPrev.borders))
      ? paleoPrev : { base: 'terrain', hydro: true, borders: true };
    if (pb.base) map.addLayer(tiles[pb.base]);
    if (pb.hydro) map.addLayer(tiles.hydro);
    if (pb.borders) map.addLayer(tiles.borders);
    if (autoGhost && map.hasLayer(ghostCoast)) { map.removeLayer(ghostCoast); autoGhost = false; }
    renderTimeLayers();
  }
}
paleoBtn.onclick = () => setPaleoView(!paleoView);
/* jeśli użytkownik ręcznie wybierze inny podkład w trybie paleo — wyłącz tryb paleo */
map.on('baselayerchange', () => { if (paleoView) setPaleoView(false); });

/* Przełącznik wariantu niepewności BIIS (BRITICE-CHRONO): publikacja daje trzy
   zgodne z datowaniami zasięgi (MINIMUM / OPTIMUM / MAKSIMUM, izochrony co 1 ka).
   Domyślnie OPTIMUM — rekonstrukcja preferowana autorów; klik cyklicznie zmienia.
   Podmiana wpisów w PALEO.ice_sets (BRITICE_SET_VARIANT) + przerysowanie mapy i globu. */
const britBtn = document.getElementById('britice-var');
const BRIT_CYCLE = ['min', 'opt', 'max'];
const BRIT_VLAB = { min: 'MINIMUM', opt: 'OPTIMUM', max: 'MAKSIMUM' };
function setBritVar(v) {
  if (window.BRITICE_SET_VARIANT) window.BRITICE_SET_VARIANT(v);
  const cur = window.BRITICE_VARIANT || 'opt';
  britBtn.innerHTML = '🧊 BIIS: <b>' + BRIT_VLAB[cur] + '</b>';
  britBtn.setAttribute('aria-label', 'Wariant rekonstrukcji lądolodu brytyjskiego: ' + BRIT_VLAB[cur] + ' — kliknij, aby zmienić');
  britBtn.classList.toggle('on', cur === 'opt');   // „on” = wariant preferowany autorów
  renderTimeLayers();
  if (window.GLOBE) window.GLOBE.markDirty();
}
britBtn.onclick = () => {
  const cur = window.BRITICE_VARIANT || 'opt';
  setBritVar(BRIT_CYCLE[(BRIT_CYCLE.indexOf(cur) + 1) % BRIT_CYCLE.length]);
};
britBtn.addEventListener('click', e => e.stopPropagation());
window.setBritVar = setBritVar;


/* Przełącznik obszarów kultur (obwiednie wypukłe).
   WYŁĄCZONE na prośbę użytkownika (2026-08-03): „na razie zdejmij — kultura ma
   po prostu swój kolor kropki”. Forma zasięgów do przemyślenia (pomysły:
   alpha-shape zamiast convex hull, bufory wokół korytarzy, rastery gęstości KDE).
   Mechanizm (convexHull + pane hullPane + warstwa) zostaje w kodzie. */
const HULLS_ON = false;

/* ------------------------------------------------- algorytm: otoczka wypukła */
function convexHull(points) {                 // points: [[lon,lat],...]
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return null;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [], upper = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (const p of pts.slice().reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/* ===================== BIOMY: rzeczywista warstwa modelowa (56 migawek PNG 0,5°) =====================
   Źródła (MODELE naukowe): 0–120 ka — Beyer, Krapp & Manica 2020 (Sci. Data 7:236; BIOME4/HadCM3,
   maski lodu ICE-6G_C); 121–799 ka — Krapp i in. 2021 (Sci. Data 8:228; emulator HadCM3); ≥810 ka —
   klimat PALEO-PGEM (Barreto i in. 2023, GEB 32:1034) + klasyfikator regułowy portalu HG-lite v0.6
   (MODEL własny; walidacja zgodności grup z Krapp2021 na 0 ka w biome_report.json ~68% globalnie).
   Kotwice pomiarowe (DANE): BIOME 6000 v4.2 — pyłek 0k/6k/18k, rysowany punktowo tylko tam, gdzie jest.
   Lądolód w rastrze (klasa 28) = maska zgodna z warstwą lodu portalu (envTickForBP → przekrój Q19). */
const BIOME = {
  meta: window.BIOME_META || null,
  overlay: null, curFile: null,
  cache: {},                       // file -> {cla: Uint8Array(720×360), hist: 'klasa' -> px}
  failed: {},                      // file -> true gdy odczyt pikseli niemożliwy (np. otwarte przez file:// — canvas tainted)
  taintWarned: false,
  pal2id: null, pollenKey: null, tip: null, legend: null
};

/* iOS Safari / WebKit: po pinch-zoomie kompozytor bywa zostawia STARĄ teksturę warstwy canvas
   (warstwa translate3d nie dostaje nowej bitmapy) — wektory „zamarzają" w rzucie sprzed zoomu;
   zgłoszony objaw: „duch" współczesnej linii brzegowej nie oddala się razem z mapą (iOS 26).
   Wymuszamy przerysowanie na końcu KAŻDEGO zoomu: przypisanie width/height w _update czyści
   bitmapę, więc warstwa z całą pewnością dostaje nową teksturę. Na innych silnikach bez szkody
   (jedno dodatkowe, tanie przerysowanie po zakończeniu animacji). */
function refreshCanvasRenderers() {
  /* UWAGA (bug 2026-11): renderer pyłka może istnieć, ale NIE być podpięty do mapy —
     gdy użytkownik wyłączy warstwę „Kotwice pyłkowe", a potem zmieni epokę, markery
     powstają w odpiętej grupie i L.canvas nie dostaje _map. Bez tego strażnika każdy
     kolejny zoom kończył się „TypeError: … reading '_animatingZoom'" i przerywał
     dalsze odświeżanie warstw. Renderer bez mapy po prostu nie ma czego odświeżać. */
  [RENDER_CANVAS.ice, RENDER_CANVAS.land, RENDER_CANVAS.ghost, BIOME.pollenR]
    .forEach(r => { if (r && r._map && r._update) r._update(); });
}
map.on('zoomend', refreshCanvasRenderers);

function biomeEpochForBP(bp) {
  const E = (BIOME.meta || {}).epochs;
  if (!E || !E.length) return null;
  const ka = bp / 1000;
  let best = E[0], bd = 1e18;
  for (const e of E) {
    const k = Array.isArray(e.ka) ? e.ka[0] : e.ka;
    const d = Math.abs(ka - k);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
const biomeKaOf = e => Array.isArray(e.ka) ? e.ka[0] : e.ka;
const biomeRealOf = e => Array.isArray(e.ka) ? e.ka[1] : e.ka;
function biomeSrcTag(e) {
  if (e.src === 'beyer') return 'MODEL opublikowany — Beyer, Krapp & Manica 2020 (Sci. Data 7:236; BIOME4/HadCM3, lód ICE-6G_C)';
  if (e.src === 'krapp') return 'MODEL opublikowany — Krapp i in. 2021 (Sci. Data 8:228; emulator HadCM3)';
  return 'MODEL portalu — klimat Barreto i in. 2023 (GEB 32:1034) + klasyfikator HG-lite v0.6 (walidacja: zgodność grup z Krapp2021 @0 ka = 68%)';
}
/* Paleta kolor → klasa. Klucz jest LICZBĄ (r<<16|g<<8|b), nie sklejonym stringiem:
   wcześniej pętla po 720×360 px tworzyła 259 200 stringów „r,g,b” na każdy raster
   (profil CPU: ~15% czasu kroku osi + 8% na odśmiecanie). Map z kluczem liczbowym
   robi to samo bez alokacji. */
function biomePal2id() {
  if (!BIOME.pal2id) {
    BIOME.pal2id = new Map();
    for (const [k, hex] of Object.entries(BIOME.meta.palette)) {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      BIOME.pal2id.set((r << 16) | (g << 8) | b, +k);
    }
  }
  return BIOME.pal2id;
}
function loadBiomeRaster(e) {
  if (BIOME.cache[e.file] || BIOME.failed[e.file]) { renderBiomeLegend(); return; }
  const img = new Image();
  img.onload = () => {
    try {
      const cv = document.createElement('canvas');
      cv.width = 720; cv.height = 360;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, 720, 360);
      const d = cx.getImageData(0, 0, 720, 360).data;      // file:// taintuje canvas → SecurityError (wychwycone)
      const p2i = biomePal2id();
      const cla = new Uint8Array(720 * 360);
      const hist = {};
      for (let i = 0, o = 0; i < cla.length; i++, o += 4) {
        const k = p2i.get((d[o] << 16) | (d[o + 1] << 8) | d[o + 2]);
        cla[i] = (k === undefined) ? 0 : k;
        if (k > 0) hist[k] = (hist[k] || 0) + 1;
      }
      BIOME.cache[e.file] = { cla, hist };
    } catch (err) {
      BIOME.failed[e.file] = true;                          // bez siatek klas: podkład PNG na mapie dalej działa
      if (!BIOME.taintWarned) {
        BIOME.taintWarned = true;
        console.warn('PaleoAtlas: brak odczytu pikseli rastrów biomów (otwarto przez file://?). ' +
          'Warstwa wyświetla się, ale tooltipy klas i siatka dla globusu wymagają serwera http. Szczegół:', err && err.name);
      }
    }
    renderBiomeLegend();
    if (window.GLOBE && window.GLOBE.markDirty) window.GLOBE.markDirty();   // globus: odśwież po doczytaniu PNG
  };
  img.onerror = () => { BIOME.failed[e.file] = true; };
  img.src = 'js/data/biome/' + e.file;
}
function biomeClassAt(ll) {
  const c = BIOME.cache[BIOME.curFile];
  if (!c) return null;
  const lon = ((ll.lng + 540) % 360) - 180;
  const x = Math.min(719, Math.max(0, Math.floor((lon + 180) / 360 * 720)));
  const y = Math.min(359, Math.max(0, Math.floor((90 - ll.lat) / 180 * 360)));
  const k = c.cla[y * 720 + x];
  return k > 0 ? k : null;
}
function biomeGridFor(bp) {          // globus: siatka klas bieżącej epoki; przy braku w cache — doczytuje PNG w tle
  const e = biomeEpochForBP(bp);
  if (!e) return null;
  const c = BIOME.cache[e.file];
  if (!c) { loadBiomeRaster(e); return { epoch: e, grid: null }; }
  return { epoch: e, grid: c.cla };
}
function biomePollenKeyFor(e) {
  const ka = biomeKaOf(e);
  if (ka < 4) return '0k';
  if (ka >= 4 && ka < 9) return '6k';
  if (ka >= 17 && ka < 26) return '18k';
  return null;
}
function biomeFmtKa(ka) {
  if (ka <= 0) return 'dziś (0 ka)';
  if (ka < 1000) return String(Math.round(ka * 10) / 10).replace('.', ',') + ' tys. BP';
  return (Math.round(ka / 10) / 100).toFixed(2).replace('.', ',').replace(/(\d)0$/, '$1') + ' mln BP';
}
function pollenMarkersFor(key) {     // cache: markery budowane RAZ na klucz (0k=9948) — scrub osi nie tworzy ich od nowa
  if (!BIOME.pg) BIOME.pg = {};
  if (!BIOME.pg[key]) {
    if (!BIOME.pollenR) BIOME.pollenR = L.canvas({ pane: 'pollenPane', padding: 0.3 });
    const R = BIOME.pollenR;
    const age = key === '18k' ? 'ok. 18 tys. lat ¹⁴C ≈ 21–22 ka kal.' : (key === '6k' ? 'ok. 6 ka — środkowy holocen' : 'współczesność (potencjał naturalny, ~0 ka)');
    const arr = [];
    for (const pt of window.BIOME_POLLEN[key]) {
      const [lat, lon, k, name, dset] = pt;
      arr.push(L.circleMarker([lat, lon], {
        pane: 'pollenPane', renderer: R, radius: 3.2, weight: 0.8,
        color: '#1c1c1c', fillColor: BIOME.meta.palette[k] || '#555', fillOpacity: 0.95
      }).bindTooltip('<b>🌾 ' + esc(String(name).trim()) + '</b><br>' + (BIOME.meta.names[k] || ('klasa ' + k)) +
        ' — <b>DANE pyłkowe</b> (BIOME 6000 v4.2)<br><i>' + dset + ' · ' + age + '</i>', { sticky: true }));
    }
    BIOME.pg[key] = arr;
  }
  return BIOME.pg[key];
}
function renderBiomePollen(e) {
  const key = biomePollenKeyFor(e);
  BIOME.pollenKey = key;
  const want = (key && window.BIOME_POLLEN) ? pollenMarkersFor(key) : null;
  const wantN = want ? want.length : 0;
  if (BIOME.pollenCurKey === (key || null) && group.pollen.getLayers().length === wantN) return;   // bez zmian
  group.pollen.clearLayers();
  if (want) for (const m of want) group.pollen.addLayer(m);
  BIOME.pollenCurKey = key || null;
}
function renderBiomeLegend() {
  if (!BIOME.legend) return;
  const e = biomeEpochForBP(state.bp);
  const c = BIOME.cache[BIOME.curFile];
  const on = map.hasLayer(group.biome) && group.biome.getLayers().length && e && c;
  BIOME.legend.getContainer().style.display = on ? '' : 'none';
  if (!on) return;
  const top = Object.entries(c.hist).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const rest = Object.keys(c.hist).length - top.length;
  let h = '<div class="bl-title">Biomy — ' + biomeFmtKa(biomeRealOf(e)) + ' <span class="bl-car">▾</span></div>' +
          '<div class="bl-src">' + (e.src === 'pgem' ? 'MODEL (portal, HG-lite)' : 'MODEL opublikowany') + '</div>';
  for (const [k, n] of top) {
    h += '<div class="bl-row"><i style="background:' + BIOME.meta.palette[k] + '"></i><span>' + BIOME.meta.names[k] + '</span></div>';
  }
  if (rest > 0) h += '<div class="bl-rest">+ ' + rest + ' klas rzadszych</div>';
  if (BIOME.pollenKey) h += '<div class="bl-rest">🌾 kotwice: BIOME 6000 <b>' + BIOME.pollenKey + '</b> (' + window.BIOME_POLLEN[BIOME.pollenKey].length + ' stanowisk, DANE)</div>';
  /* zapis innerHTML to najdroższa część (wymusza przeliczanie stylów). Ten sam HTML
     wstawiamy raz — przy przeciąganiu osi w obrębie jednej migawki nic się nie zmienia. */
  if (h === BIOME.legendHTML) return;
  BIOME.legendHTML = h;
  BIOME.legend.getContainer().innerHTML = h;
}
function hideBiomeTip() { if (BIOME.tip) BIOME.tip.style.display = 'none'; }
function initBiomeUI() {
  if (!BIOME.meta) return;
  BIOME.tip = document.createElement('div');
  BIOME.tip.className = 'biome-tip';
  BIOME.tip.style.display = 'none';
  map.getContainer().appendChild(BIOME.tip);
  BIOME.legend = L.control({ position: 'bottomright' });  // bottomleft koliduje z kartą fazy (przycisk BIIS y~383)
  BIOME.legend.onAdd = () => {
    const d = L.DomUtil.create('div', 'biome-legend');
    L.DomEvent.disableClickPropagation(d);
    L.DomEvent.disableScrollPropagation(d);
    if (window.matchMedia && matchMedia('(max-width: 760px)').matches) d.classList.add('mini');
    L.DomEvent.on(d, 'click', () => { if (d.classList.contains('mini')) { d.classList.remove('mini'); d.classList.add('open'); } });
    d.style.display = 'none';
    return d;
  };
  BIOME.legend.addTo(map);
  let raf = 0, lastEv = null;
  map.on('mousemove', ev => {
    /* Trzymamy NAJNOWSZE zdarzenie: przy `if (raf) return` w klatce zostawała pozycja
       sprzed ~16 ms, więc dymek „gonił" kursor o jedną klatkę. */
    lastEv = ev;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      ev = lastEv;
      if (!map.hasLayer(group.biome) || !group.biome.getLayers().length || !BIOME.cache[BIOME.curFile]) { hideBiomeTip(); return; }
      const k = biomeClassAt(ev.latlng);
      if (k == null) { hideBiomeTip(); return; }
      const e = biomeEpochForBP(state.bp);
      let h = '<b>' + BIOME.meta.names[k] + '</b><br><i>' + biomeSrcTag(e) + '</i>';
      if (BIOME.pollenKey && window.BIOME_POLLEN) h += '<br>🌾 Na mapie: kotwice pomiarowe BIOME 6000 <b>' + BIOME.pollenKey + '</b> (DANE)';
      BIOME.tip.innerHTML = h;
      const pt = ev.containerPoint;
      BIOME.tip.style.left = (pt.x + 14) + 'px';
      BIOME.tip.style.top = (pt.y + 17) + 'px';
      BIOME.tip.style.display = 'block';
    });
  });
  map.on('mouseout', hideBiomeTip);
  /* UWAGA: wcześniej było `map.on('layeradd layerremove')`. Mapa odpala to zdarzenie
     dla KAŻDEJ dodanej warstwy, więc jeden krok osi (kilkaset punktów + poligony)
     przebudowywał legendę biomów kilkadziesiąt razy (pomiar: 29 mutacji DOM na krok,
     profil: ~6% czasu kroku). Słuchamy tylko grup, które legendę naprawdę zmieniają,
     i sklejamy serię zdarzeń w jedną klatkę. */
  let legendRaf = 0;
  const legendSoon = () => {
    if (legendRaf) return;
    legendRaf = requestAnimationFrame(() => { legendRaf = 0; renderBiomeLegend(); });
  };
  group.biome.on('layeradd layerremove', legendSoon);
  group.pollen.on('layeradd layerremove', legendSoon);
  /* Sama GRUPA też musi być obserwowana: zdjęcie warstwy „Biomy" z mapy nie odpala
     zdarzenia na grupie, tylko na mapie — a wtedy legenda musi zniknąć. Filtr po
     tożsamości obiektu jest O(1), więc zdarzenia od setek markerów nic nie kosztują. */
  map.on('layeradd layerremove', ev => {
    if (ev.layer === group.biome || ev.layer === group.pollen || ev.layer === BIOME.overlay) legendSoon();
  });
}
function renderBiome() {
  if (!BIOME.meta) return;
  const e = biomeEpochForBP(state.bp);
  if (!e) return;
  const url = 'js/data/biome/' + e.file;
  const changed = BIOME.curFile !== e.file;
  if (changed || !BIOME.overlay) {
    if (BIOME.overlay) group.biome.removeLayer(BIOME.overlay);
    BIOME.overlay = L.imageOverlay(url, [[-90, -180], [90, 180]], {
      pane: 'biomePane', interactive: false, opacity: 0.95, alt: '' /* dekoracyjny — treść opisuje legenda */
    });
    group.biome.addLayer(BIOME.overlay);
    BIOME.curFile = e.file;
    loadBiomeRaster(e);
    hideBiomeTip();
  }
  BIOME.overlay.setOpacity(paleoView ? 0.95 : 0.55);
  renderBiomePollen(e);
  renderBiomeLegend();
  /* sąsiednie epoki — cichy prefetch do cache przeglądarki (scrub osi bez czekania na PNG) */
  clearTimeout(BIOME.preT);
  BIOME.preT = setTimeout(() => {
    const ix = BIOME.meta.epochs.indexOf(e);
    [ix - 1, ix + 1, ix + 2].forEach(i => {
      const ne = BIOME.meta.epochs[i];
      if (ne && !BIOME.cache[ne.file]) { const im = new Image(); im.src = 'js/data/biome/' + ne.file; }
    });
  }, 220);
}

initBiomeUI();

/* ------------------------------------------------- render warstw czasowych */
function renderTimeLayers() {
  const bp = state.bp;
  const faza = fazaForBP(bp);
  const env = envTickForBP(bp);               // lądolod + poziom morza: chronologia GLOBALNA
  const sea = seaAtBP(bp);
  const icePolys = envIcePolysCached(env);

  /* BIOMY: rzeczywista warstwa modelowa (56 migawek 0-3,3 mln) + kotwice pyłkowe — moduł powyżej */
  renderBiome();

  /* dawne lądy = wyschnięty szelf dla poziomu morza fazy — DANE: batymetria
     ETOPO2v2 (NOAA/NCEI, domena publiczna), próg eustatyczny. Baseny zamknięte
     (Czarne, Kaspijskie, Aral) mają własne historie — poniżej tylko pierwsza
     aproksymacja; morza lądolodowe/plejstoceńskie jeziora przedpolowe nie są modelowane. */
  const lvl = shelfForSea(sea);
  const landKey = lvl + (paleoView ? ':p' : ':n');
  /* poligony szelfu zależą tylko od (poziom morza, tryb paleo) — przy tych samych wartościach
     pomijamy przebudowę: identyczny obraz, zero zmian jakości, szybszy scrub osi */
  if (!(BIOME.landKey === landKey && group.land.getLayers().length)) {
    BIOME.landKey = landKey;
    group.land.clearLayers();
    if (paleoView) landCover.addTo(group.land);
    (window.SHELVES[lvl] || []).forEach(poly => {
      const tt = '<b>🌊 Wyschnięty szelf (poziom morza ' + lvl + ' m)</b><br>' +
        '<i>Obrys z batymetrii ETOPO2v2 (NOAA/NCEI) — dane pomiarowe, nie schemat.</i>';
      group.land.addLayer(L.polygon(poly, {
        pane: 'landPane', renderer: RENDER_CANVAS.land, stroke: paleoView ? false : true,
        color: '#8a7f5c', weight: 1.0, dashArray: '4 4',
        fillColor: LAND_COLOR, fillOpacity: paleoView ? 1 : .55
      }).bindTooltip(tt, { sticky: true }));
    });
  }
  if (!paleoView && map.hasLayer(landCover)) map.removeLayer(landCover);

  /* lądolód — GLOBALNA chronologia: <30 ka zestawy portalu (DATED-1 dla Eurazji +
     NADI-1 dla Ameryki Płn. 25–10,5 ka + PATICE dla Ameryki Płd. 25–10,5 ka i „dziś”);
     ≥30 ka Batchelor i in. 2019 (best estimate, półkula płn.; SA: PATICE 30/35 ka,
     Q19 własne w 45 ka/Gauss, schemat w stadiałach, brak w interstadialiach MIS 5);
     interglacjały = stan jak dziś. Margines PL zawsze z danych portalu
     (splice verbatim lub osobny poligon). Grenlandia = schemat (poza NADI-1).
     Antarktyda = ICE-6G_C (VM5a) 26–10,5 ka + „dziś” (maska 1°); w fazach głębokich
     (≥ MIS 3) — niezmienny pierścień schematu. */
  const bvNow = window.BRITICE_VARIANT || 'opt';
  const iceSame = BIOME.iceEnv === env && BIOME.iceBv === bvNow && group.ice.getLayers().length;
  if (!iceSame) {                     /* ta sama epoka env → lądolody identyczne, pomijamy przebudowę */
  BIOME.iceEnv = env; BIOME.iceBv = bvNow;
  group.ice.clearLayers();
  /* epoki-analogi (MIS 18 + wczesny plejstocen): kształt pożyczony z innego przekroju —
     zaznaczamy to też w tooltipie poligonu, nie tylko w pasku fazowym */
  const analogNote = env && /analog/.test(env.label)
    ? '<br><i>⚠ Epoka-analog: kształt lądolodu pożyczony z innego przekroju (szczegóły w pasku fazowym); rząd wielkości wg LR04.</i>' : '';
  /* paleojeziora przylodowcowe (PATICE-LAKES): rysowane POD poligonami lodu —
     woda przylega do krawędzi lodu albo jest nim częściowo zasłonięta */
  const lakePolys = icePolys.filter(ic => ic.lake);
  const onlyIce = icePolys.filter(ic => !ic.lake);
  lakePolys.forEach(lc => {
    const lsrc = '<i>' + esc(window.PATICE_LAKES_SRC || 'PATICE (Davies i in. 2020)') + '</i>';
    const det = (lc.larea ? 'Powierzchnia ok. <b>' + String(Math.round(lc.larea)) + ' km²</b>. ' : '') +
      (lc.lalt ? 'Zwierciadło ok. ' + esc(String(lc.lalt)) + ' m n.p.m. ' : '') +
      (lc.lref ? '<br>Stan wg: ' + esc(lc.lref) + '.' : '') +
      (lc.lnote ? '<br>' + esc(lc.lnote) + '.' : '');
    group.ice.addLayer(L.polygon(lc.rings, {
      pane: 'icePane', renderer: RENDER_CANVAS.ice, color: '#3f7fbf', weight: 1.2,
      fillColor: '#6fb3e8', fillOpacity: .55
    }).bindTooltip('<b>💧 ' + esc(lc.lname || lc.name) + '</b> — paleojezioro przylodowcowe (DANE: PATICE ' + (lc.lp || '').replace('l', '').replace('ka', ' ka') + ')<br>' + det + '<br>' + lsrc, { sticky: true }));
  });
  onlyIce.forEach(ic => {
    const rings = ic.rings || [ic.pts];
    const src = ic.src === 'DATED-1'
      ? '<i>DATED-1: Hughes i in. 2016, Boreas — PANGAEA 10.1594/PANGAEA.848117. Margines w PL: dokładna linia z danych portalu.</i>'
      : ic.src === 'NADI-1'
        ? '<i>NADI-1: Dalton, Dulfer, Margold i in. 2023, Quat. Sci. Rev. 321:108345 — Zenodo 10.5281/zenodo.8161764; wariant OPTIMAL (izochrony co 0,5 tys. lat, wiek kalendarzowy). Grenlandia poza zasięgiem NADI-1.</i>'
      : ic.src === 'PATICE'
        ? '<i>🧊 PATICE: Davies i in. 2020, Earth-Science Reviews 204:103152 — doi:10.1016/j.earscirev.2020.103152; dane: Mendeley 10.17632/ztz59y79vv.1. Empiryczne przekroje 35/30/25/20/15/13/10/5 ka + inwentarz 2011 AD (geomorfologia 58 823 form, 1669 datowań).</i>'
      : ic.src === 'ICE6G'
        ? '<i>' + esc(window.ICE6G_SRC || 'ICE-6G_C (VM5a)') + '</i>'
      : ic.src === 'RGI-7'
        ? '<i>' + esc(window.RGI_ISL_SRC || 'RGI 7.0 (NSIDC)') + '</i>'
      : ic.src === 'BRITICE-CHRONO'
        ? '<i>' + esc(window.BRITICE_SRC || 'BRITICE-CHRONO (Clark i in. 2022)') + '</i>'
      : ic.src === 'GLACIMONTIS'
        ? '<i>' + esc(window.GLAC_SRC || 'GLACIMONTIS (Lima i in. 2026)') + (ic.cite ? ' Źródło tego poligonu: <b>' + esc(ic.cite) + '</b>.' : '') + '</i>'
      : ic.src === 'Q19'
        ? '<i>' + esc(ICE_QUAT_SRC || 'Batchelor i in. 2019') + '</i>'
        : ic.src === 'DANE_PORTALU'
          ? '<i>Margines w Polsce: dokładna linia z danych portalu; kształt własny (DATED-1/Batchelor nie pokrywa tego lobu lub rozbieżność korelacji).</i>'
          : '<i>Rekonstrukcja uproszczona wg literatury (Batchelor i in. 2019; Ehlers & Gibbard) — poza zasięgiem DATED-1.</i>';
    group.ice.addLayer(L.polygon(rings, {
      pane: 'icePane', renderer: RENDER_CANVAS.ice, color: '#bcd2e0', weight: 1.5, dashArray: '4 3',
      fillColor: '#e8f1f8', fillOpacity: .78
    }).bindTooltip('<b>🧊 ' + ic.name + '</b><br>' + src + analogNote, { sticky: true }));
  });
  }

  /* stanowiska widoczne w danym czasie (bez duplikatów; po filtrach wyszukiwarki) */
  const vis = { rdzen: [], sasiedzi: [] };
  SITES.rdzen.forEach(s => { if (!isDupe(s) && isVisible(s, bp) && matchesFilters(s)) vis.rdzen.push(s); });
  SITES.sasiedzi.forEach(s => { if (isVisible(s, bp) && matchesFilters(s)) vis.sasiedzi.push(s); });

  group.rdzen.clearLayers(); group.sasiedzi.clearLayers();
  vis.sasiedzi.forEach(s => {
    group.sasiedzi.addLayer(L.circleMarker([s.lat, s.lon], {
      pane: 'nbrPane', radius: 5.5, color: cultOf(s.kultura).kolor, weight: 2,
      fillColor: '#14100a', fillOpacity: .15
    }).on('click', () => openSite(s))
      .bindTooltip(tipText(s)));
  });
  vis.rdzen.forEach(s => {
    const jask = s.typ === 'jaskinia_schronisko';
    group.rdzen.addLayer(L.circleMarker([s.lat, s.lon], {
      pane: 'sitesPane', radius: ROLA_SZ(s), color: '#fff', weight: jask ? 1.6 : 2,
      dashArray: jask ? '2,2' : null,
      fillColor: cultOf(s.kultura).kolor,
      fillOpacity: s.status === 'KWESTIONOWANE' ? .35 : .9
    }).on('click', () => openSite(s))
      .bindTooltip(tipText(s)));
  });

  /* obszary kultur — tymczasowo WYŁĄCZONE (patrz HULLS_ON wyżej) */
  group.hulls.clearLayers();
  if (HULLS_ON) {
    const byKult = {};
    vis.rdzen.concat(vis.sasiedzi).forEach(s => {
      (byKult[s.kultura] = byKult[s.kultura] || []).push([s.lon, s.lat]);
    });
    Object.keys(byKult).forEach(k => {
      if (k === 'sporne' || byKult[k].length < 3) return;
      const hull = convexHull(byKult[k]);
      if (!hull) return;
      group.hulls.addLayer(L.polygon(hull.map(pt => [pt[1], pt[0]]), {
        pane: 'hullPane', color: cultOf(k).kolor, weight: 2, dashArray: '7 6',
        fillColor: cultOf(k).kolor, fillOpacity: .15
      }).bindTooltip('<b>Zasięg: ' + cultOf(k).nazwa + '</b><br>' + byKult[k].length +
        ' stanowisk w tym czasie.<br><i>Obwiednia wypukła — zasięg ORIENTACYJNY, nie rzeczywista granica.</i>',
        { sticky: true }));
    });
  }

  updateLegend(vis);
  updatePhaseCard(faza, icePolys.map(i => i.name), env, sea);
  return faza;
}

function tipText(s) {
  const k = cultOf(s.kultura);
  return '<b>' + esc(s.nazwa.length > 95 ? s.nazwa.slice(0, 95) + '…' : s.nazwa) + '</b><br>' +
    '<span style="color:' + k.kolor + '">●</span> ' + esc(k.nazwa) +
    (s.kraj && s.kraj !== 'Polska' ? ' · ' + esc(s.kraj) : '') + '<br>' +
    '<i>' + esc(fmtBP(s.od)) + ' – ' + esc(fmtBP(s.do)) + '</i> ' + (STATUS_ICO[s.status] || '');
}

/* szacunkowy poziom morza — globalna krzywa eustatyczna (env.js), najbliższy
   poziom szelfu ETOPO2v2 do odtworzenia dawnych lądów */
const SHELF_LEVELS = [-125, -110, -100, -95, -80, -75, -60, -55, -50, -30, -5];
/* kierunek_ladolodu w CSV ma częściowo surowe kody robocze — normalizujemy do
   czytelnego polskiego opisu (dane źródłowe pozostają nietknięte) */
const ICE_DIR_PL = {
  polnoc: 'margines na północy',
  polnoc_postepujacy: 'margines na północy — postępujący',
  polnoc_silna_recesja: 'margines na północy — silna recesja',
  polnoc_recesja_zachod_transgresja_wschod: 'północ: recesja na zachodzie, transgresja na wschodzie',
  brak_zwartego_ladolodu: 'brak zwartego lądolodu'
};
function iceDirPL(v) {
  v = (v || '').trim();
  if (!v) return '';
  if (ICE_DIR_PL[v]) return ICE_DIR_PL[v];
  return v.replace(/\s+/g, ' ').replace(/_/g, ' ').replace(/^ladolod/, 'lądolód');
}
function updatePhaseCard(f, iceNames, env, sea) {
  const dirTxt = iceDirPL(f.kierunek_ladolodu);
  const iceDir = dirTxt ? ' · 🧊 ' + dirTxt : '';
  document.getElementById('phase-name').textContent = f.nazwa.split('—')[0].trim();
  document.getElementById('phase-sub').innerHTML =
    esc(fmtBP(f.od_tys * 1000)) + ' – ' + esc(fmtBP(f.do_tys * 1000)) + esc(iceDir) +
    (f.opis_biomu ? '<br>' + esc(f.opis_biomu.slice(0, 160)) + (f.opis_biomu.length > 160 ? '…' : '') : '');
  const lvl = shelfForSea(sea);
  document.getElementById('phase-sea').textContent =
    sea >= 0.5 ? '🌊 Poziom morza ok. +' + Math.round(sea) + ' m (wyżej niż dziś) — paleolinia brzegowa: jak dziś lub węższa' :
    sea > -0.5 ? '🌊 Poziom morza: jak dziś' :
    '🌊 Poziom morza ok. ' + Math.round(sea) + ' m — szelf (próg ' + lvl + ' m) z batymetrii ETOPO2v2 (NOAA)';
  const iceTag = document.getElementById('phase-icesrc');
  if (iceTag && env) {
    const dTys = Math.round(Math.abs(env.bp - state.bp) / 1000);
    const dist = dTys >= 5 ? ' · najbliższy przekrój: Δ ' + dTys + ' tys. l.' : '';
    iceTag.textContent = '🛰 Środowisko (chronologia globalna): ' + env.label + dist;
  }
  const names = iceNames || [];
  document.getElementById('phase-ice').textContent = '🧊 Lądolody w tym przekroju: ' +
    (names.length ? names.slice(0, 4).join(' · ') + (names.length > 4 ? ' · +' + (names.length - 4) + ' innych' : '')
      : 'brak poza Grenlandią i Antarktydą');
}

function updateLegend(vis) {
  const counts = {};
  vis.rdzen.forEach(s => counts[s.kultura] = (counts[s.kultura] || 0) + 1);
  vis.sasiedzi.forEach(s => counts[s.kultura] = (counts[s.kultura] || 0) + 1);
  document.getElementById('legend-count').textContent = '· ' + (vis.rdzen.length + vis.sasiedzi.length) + ' pkt';
  const el = document.getElementById('legend-cultures');
  el.innerHTML = '';
  Object.keys(counts).sort((a, b) => counts[b] - counts[a]).forEach(k => {
    const row = document.createElement('div');
    row.className = 'lc' + (state.filters.kultura === k ? ' active' : '');
    row.innerHTML = '<i style="background:' + cultOf(k).kolor + '"></i><span>' + esc(cultOf(k).nazwa) + '</span><b>' + counts[k] + '</b>';
    row.title = 'Klik — pokaż tylko tę kulturę (ponownie: wyłącz filtr)';
    /* a11y: wiersz legendy jest przyciskiem filtru — musi dać się zaznaczyć Tabem i kliknąć Enterem/Spacją */
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-pressed', state.filters.kultura === k ? 'true' : 'false');
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    });
    row.onclick = () => {
      state.filters.kultura = (state.filters.kultura === k ? null : k);
      const sel = document.getElementById('srch-kultura');
      sel.value = state.filters.kultura || '';
      sel.classList.toggle('active', !!sel.value);
      renderTimeLayers(); renderSearch();
    };
    el.appendChild(row);
  });
  if (!Object.keys(counts).length) el.innerHTML = '<div style="font-size:.73rem;color:#8d8474">Brak stanowisk w tym czasie' +
    (filtersActive() ? ' (przy aktywnych filtrach).' : '.') + '</div>';
}

/* ---------------- wyszukiwarka i filtry stanowisk (panel legendy) ---------------- */
const srchEls = {
  q: document.getElementById('srch-q'), kultura: document.getElementById('srch-kultura'),
  typ: document.getElementById('srch-typ'), hom: document.getElementById('srch-hom'),
  status: document.getElementById('srch-status'),
  meta: document.getElementById('srch-meta'), results: document.getElementById('srch-results')
};
function addOpts(sel, items) {
  items.forEach(it => { const o = document.createElement('option'); o.value = it[0]; o.textContent = it[1]; sel.appendChild(o); });
}
addOpts(srchEls.kultura, META.kultury.map(c => [c.id, c.nazwa]).sort((a, b) => a[1].localeCompare(b[1], 'pl')));
addOpts(srchEls.typ, [...new Set(SITES.rdzen.map(s => s.typ).filter(Boolean))]
  .map(t => [t, TYP_PL[t] || t]).sort((a, b) => a[1].localeCompare(b[1], 'pl')));
addOpts(srchEls.hom, [...new Set(SITES.rdzen.reduce((a, s) => a.concat(s.homininy || []), []))]
  .map(h => [h, HOM_PL[h] || h]).sort((a, b) => a[1].localeCompare(b[1], 'pl')));
addOpts(srchEls.status, [['POTWIERDZONE', 'POTWIERDZONE'], ['ZWERYFIKOWANE', 'ZWERYFIKOWANE (sąsiedzi)'],
  ['CZESCIOWO', 'CZĘŚCIOWO'], ['KWESTIONOWANE', 'KWESTIONOWANE']]);

function ktys(bp) { return bp >= 1000 ? (Math.round(bp / 100) / 10 + '').replace('.', ',') + ' tys.' : Math.round(bp) + ' lat'; }
function renderSearch() {
  const act = filtersActive();
  srchEls.meta.classList.toggle('on', act);
  srchEls.results.classList.toggle('on', act);
  if (!act) { srchEls.results.innerHTML = ''; srchEls.meta.innerHTML = ''; return; }
  const pool = SITES.rdzen.filter(s => !isDupe(s)).concat(SITES.sasiedzi);
  const hits = pool.filter(matchesFilters).sort((a, b) => b.od - a.od);
  const inTime = hits.filter(s => isVisible(s, state.bp)).length;
  srchEls.meta.innerHTML = '<span><b>' + hits.length + '</b> znalezionych · w tej epoce na mapie: <b>' + inTime + '</b></span>' +
    '<button type="button" id="srch-clear">✕ wyczyść filtry</button>';
  document.getElementById('srch-clear').onclick = clearFilters;
  const MAXH = 40;
  srchEls.results.innerHTML = '';
  hits.slice(0, MAXH).forEach(s => {
    const d = document.createElement('div');
    const ok = isVisible(s, state.bp);
    d.className = 'srch-hit' + (ok ? '' : ' offtime');
    d.setAttribute('role', 'button');
    d.setAttribute('tabindex', '0');
    d.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.click(); }
    });
    d.title = (ok ? 'Widoczne w bieżącej epoce' : 'Spoza bieżącej epoki — klik przeniesie oś czasu') +
      ' · ' + (s.kolekcja === 'rdzen' ? s.id : s.id + ' · ' + s.kraj);
    d.innerHTML = '<i style="background:' + cultOf(s.kultura).kolor + '"></i>' +
      '<span class="nm">' + esc(s.nazwa.length > 90 ? s.nazwa.slice(0, 90) + '…' : s.nazwa) + '</span>' +
      '<span class="tm">' + ktys(s.od) + '</span>';
    d.onclick = () => {
      if (!isVisible(s, state.bp)) setSlider(bpToSlider(Math.round((s.od + s.do) / 2)));
      openSite(s);
      flyToPoint([s.lat, s.lon], Math.max(map.getZoom(), 7));
    };
    srchEls.results.appendChild(d);
  });
  if (hits.length > MAXH) {
    const more = document.createElement('div');
    more.id = 'srch-more';
    more.textContent = '+ ' + (hits.length - MAXH) + ' kolejnych — doprecyzuj filtry lub frazę';
    srchEls.results.appendChild(more);
  }
}
function clearFilters() {
  state.filters = { q: '', kultura: null, typ: null, hom: null, status: null };
  srchEls.q.value = '';
  [srchEls.kultura, srchEls.typ, srchEls.hom, srchEls.status].forEach(sel => { sel.value = ''; sel.classList.remove('active'); });
  renderTimeLayers(); renderSearch();
}
srchEls.q.addEventListener('input', () => { state.filters.q = srchEls.q.value.trim(); renderTimeLayers(); renderSearch(); });
[['kultura', 'kultura'], ['typ', 'typ'], ['hom', 'hom'], ['status', 'status']].forEach(pair => {
  srchEls[pair[0]].addEventListener('change', () => {
    state.filters[pair[1]] = srchEls[pair[0]].value || null;
    srchEls[pair[0]].classList.toggle('active', !!srchEls[pair[0]].value);
    renderTimeLayers(); renderSearch();
  });
});

/* ------------------------------------------------- karta stanowiska */
/* Escapowanie do HTML-a, w tym do WARTOŚCI ATRYBUTÓW (data-*, title, style).
   Wcześniej zamieniano tylko & < > — a wartość z cudzysłowem rozjeżdżała atrybut,
   np. data-z="…" w kartach słownika czy data-pid w powiązaniach stanowisk.
   Teraz escapujemy też " i ' (w treści tekstowej renderują się identycznie). */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function openSite(s) {
  const side = document.getElementById('side');
  side.classList.remove('hidden');
  const k = cultOf(s.kultura);
  const stCls = s.status === 'POTWIERDZONE' ? 'ok' : (s.status === 'CZESCIOWO' ? 'warn' : 'err');
  let h = '<h2>' + esc(s.nazwa) + '</h2>';
  h += '<span class="cult-tag" style="background:' + k.kolor + '">' + esc(k.nazwa) + '</span>';
  h += '<div class="badges">' +
    '<span class="badge ' + stCls + '">' + (STATUS_ICO[s.status] || '') + ' ' + esc(STATUS_PL[s.status] || s.status) + '</span>' +
    (s.typ ? '<span class="badge">' + esc(TYP_PL[s.typ] || s.typ) + '</span>' : '') +
    (s.warstwa ? '<span class="badge">warstwa ' + esc(s.warstwa) + '</span>' : '') +
    (s.blok_nazwa ? '<span class="badge">' + esc(s.blok_nazwa) + '</span>' : '') +
    (s.kraj && s.kraj !== 'Polska' ? '<span class="badge">' + esc(s.kraj) + '</span>' : '') +
    '</div>';

  if (isDupe(s)) {
    h += '<div class="dupe-note">⧉ <b>Rekord-duplikat.</b> To stanowisko ma już rekord wiodący' +
      (s.duplikat_patrz ? ': <span class="chip" data-pid="' + esc(s.duplikat_patrz) + '">' + esc(s.duplikat_patrz) + '</span>' : '') +
      '. Rekordy-duplikaty nie są rysowane na mapie (portal linkuje do rekordu wiodącego, nie dubluje treści).</div>';
  }

  h += '<div class="kv">' +
    '<b>Datowanie</b><span>' + esc(fmtBP(s.od)) + ' → ' + esc(fmtBP(s.do)) +
      (s.datowanie_tekst ? ' · ' + esc(s.datowanie_tekst) : '') + '</span>' +
    (s.metoda ? '<b>Metoda</b><span>' + esc(s.metoda) + '</span>' : '') +
    (s.pewnosc_datowania ? '<b>Pewność datowania</b><span>' + esc(s.pewnosc_datowania) + '</span>' : '') +
    (s.gps_precyzja ? '<b>Współrzędne</b><span>' + esc(s.gps_precyzja) + '</span>' : '') +
    (s.woj ? '<b>Położenie</b><span>' + esc([s.gmina, s.powiat, s.woj].filter(Boolean).join(', ')) + '</span>' : '') +
    (s.fizgeo ? '<b>Fizjografia</b><span>' + esc(s.fizgeo) + '</span>' : '') +
    (s.homininy && s.homininy.length ? '<b>Homininy</b><span>' + s.homininy.map(x => esc(HOM_PL[x] || x)).join(', ') + '</span>' : '') +
    (s.adna && s.adna !== 'nie' ? '<b>aDNA</b><span>' + esc(s.adna) + '</span>' : '') +
    '</div>';

  if (s.kultura_raw) h += '<h3>Okres / kultura (zapis źródłowy)</h3><p class="dim">' + esc(s.kultura_raw) + '</p>';
  if (s.typ_powiazania) h += '<h3>Typ powiązania z PL</h3><p>' + esc(s.typ_powiazania.replace(/_/g, ' ')) + '</p>';
  if (s.co_wiemy) h += '<h3>Co wiemy</h3><p>' + esc(s.co_wiemy) + '</p>';
  if (s.czego_nie_wiemy) h += '<h3>Czego nie wiemy</h3><p>' + esc(s.czego_nie_wiemy) + '</p>';
  if (s.zrodlo) h += '<h3>Główne źródło</h3><p class="dim">' + esc(s.zrodlo) + '</p>';
  if (s.zrodla2) h += '<h3>Źródła zweryfikowane</h3><p class="dim">' + esc(s.zrodla2) + '</p>';
  if (s.powiazane && s.powiazane.length) {
    h += '<h3>Powiązane stanowiska</h3><div class="chip-row">';
    s.powiazane.forEach(pid => { h += '<span class="chip" data-pid="' + esc(pid) + '">' + esc(pid) + '</span>'; });
    h += '</div>';
  }
  h += '<p style="margin-top:1rem"><a href="#" id="flyto">📍 Przybliż na mapie</a></p>';
  document.getElementById('side-content').innerHTML = h;

  document.getElementById('flyto').onclick = e => { e.preventDefault(); flyToPoint([s.lat, s.lon], 8); };
  document.querySelectorAll('#side-content .chip[data-pid]').forEach(ch => {
    ch.onclick = () => {
      const t = SITES.rdzen.find(x => x.id === ch.dataset.pid) || SITES.sasiedzi.find(x => x.id === ch.dataset.pid);
      if (t) { openSite(t); if (!isVisible(t, state.bp)) { const v = bpToSlider((t.od + t.do) / 2); setSlider(v); } }
    };
  });
}
document.getElementById('side-close').onclick = () => document.getElementById('side').classList.add('hidden');

/* ------------------------------------------------- oś czasu */
const slider = document.getElementById('tl-slider');
slider.max = TL_MAX;
const track = document.getElementById('tl-track');
FAZY.forEach((f, i) => {
  const seg = document.createElement('div');
  seg.className = 'tl-seg' + (f.kolor_ladolodu ? ' glacial' : '') + (f.glebokie ? ' deep' : '');
  seg.style.background = f.kolor_biomu || '#444';
  seg.title = f.nazwa + ' (' + fmtBP(f.od_tys * 1000) + ' – ' + fmtBP(f.do_tys * 1000) + ')';
  seg.innerHTML = '<span class="seg-label">' + esc(SEG_SHORT[f.id] || f.id) + '</span>';
  seg.onclick = () => setSlider(i * SEG + SEG / 2);
  track.appendChild(seg);
});
/* kamienie milowe homininów (♦) — pozycja wg bpToSlider */
(META.milestones || []).forEach(m => {
  const d = document.createElement('div');
  d.className = 'tl-ms';
  d.style.left = (bpToSlider(m.bp) / TL_MAX * 100) + '%';
  d.title = '📌 ' + fmtBP(m.bp) + ' — ' + m.t;
  d.textContent = '♦';
  d.onclick = e => { e.stopPropagation(); setSlider(bpToSlider(m.bp)); };
  document.getElementById('tl-track-wrap').appendChild(d);
});

function setSlider(v) {
  v = Math.max(0, Math.min(TL_MAX, v));
  slider.value = v;
  state.bp = sliderToBP(v);
  const f = renderTimeLayers();
  document.getElementById('tl-year').textContent = fmtBP(state.bp);
  document.getElementById('tl-phase').textContent = f.nazwa.split('(')[0].trim();
  document.querySelectorAll('.tl-seg').forEach((s, i) => s.classList.toggle('active', i === Math.floor(v / SEG) || (v >= TL_MAX && i === FAZY.length - 1)));
}
let sliderRaf = 0;
/* UX scrubu: przy ciągnięciu suwaka renderujemy maks. 1× na klatkę rAF (pośrednie wartości
   nie kolejkują pełnych przebudów warstw); po puszczeniu — natychmiastowy pełny render stanu. */
slider.addEventListener('input', () => {
  if (sliderRaf) return;
  sliderRaf = requestAnimationFrame(() => { sliderRaf = 0; setSlider(+slider.value); });
});
slider.addEventListener('change', () => {
  if (sliderRaf) { cancelAnimationFrame(sliderRaf); sliderRaf = 0; }
  setSlider(+slider.value);
});

let playTimer = null;
document.getElementById('tl-play').onclick = () => {
  const btn = document.getElementById('tl-play');
  const setPlayUI = playing => {
    btn.textContent = playing ? '⏸' : '▶';
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.setAttribute('aria-label', playing ? 'Zatrzymaj animację osi czasu' : 'Odtwórz animację osi czasu');
  };
  if (playTimer) { clearInterval(playTimer); playTimer = null; setPlayUI(false); return; }
  if (+slider.value >= TL_MAX) setSlider(0);
  setPlayUI(true);
  playTimer = setInterval(() => {
    const v = +slider.value + 2;
    if (v >= TL_MAX) { clearInterval(playTimer); playTimer = null; setPlayUI(false); }
    setSlider(v);
  }, 140);
};
document.addEventListener('keydown', e => {
  if (!document.getElementById('view-mapa').classList.contains('active')) return;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.key === 'ArrowRight') setSlider(+slider.value + 5);
  if (e.key === 'ArrowLeft') setSlider(+slider.value - 5);
});

document.getElementById('legend-head').onclick = () => {
  const b = document.getElementById('legend-body'), l = document.getElementById('legend');
  const open = l.classList.toggle('open');
  b.style.display = open ? 'block' : 'none';
  document.getElementById('legend-toggle').textContent = open ? '–' : '+';
  document.getElementById('legend-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
};

/* =========================================================================== ROUTING / WIDOKI */
function show(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  document.querySelectorAll('#top nav a').forEach(a => {
    const on = a.dataset.view === view;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (view === 'mapa') setTimeout(() => map.invalidateSize(), 50);
  if (window.GLOBE) (view === 'globus' ? window.GLOBE.activate() : window.GLOBE.deactivate());
}
function route() {
  const h = location.hash.replace('#', '') || 'mapa';
  if (h.startsWith('tom1')) {
    show('tom1');
    const m = h.match(/tom1-(\d+)/);
    if (m) openChapter(+m[1]);
  } else if (h === 'slownik') show('slownik');
  else if (h === 'globus') show('globus');
  else if (h === 'dane') show('dane');
  else show('mapa');
}
window.addEventListener('hashchange', route);
document.querySelectorAll('#top nav a').forEach(a => a.addEventListener('click', () => setTimeout(route, 0)));

/* =========================================================================== MINI-MARKDOWN (Tom I) */
function md(src) {
  const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = s => s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  const blocks = [];
  let para = [], list = [];
  const flush = () => {
    if (para.length) { blocks.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
    if (list.length) { blocks.push('<ul>' + list.map(li => '<li>' + inline(li) + '</li>').join('') + '</ul>'); list = []; }
  };
  escHtml(src).split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (/^\*\*\d+\./.test(t)) { flush(); blocks.push('<h3>' + inline(t.replace(/^\*\*(.+)\*\*$/, '$1')) + '</h3>'); }
    else if (/^\*\*(.+)\*\*$/.test(t) && t.length < 140) { flush(); blocks.push('<h4>' + inline(t.slice(2, -2)) + '</h4>'); }
    else if (/^[*•-]\s+/.test(t)) { para.length && flush(); list.push(t.replace(/^[*•-]\s+/, '')); }
    else if (t === '') flush();
    else { list.length && flush(); para.push(t); }
  });
  flush();
  return blocks.join('\n');
}

/* =========================================================================== TOM I */
const toc = document.getElementById('tom1-list');
TOM1.forEach(ch => {
  const li = document.createElement('li');
  li.innerHTML = '<a href="#tom1-' + ch.n + '" data-ch="' + ch.n + '">' + esc(ch.tytul) + '</a>';
  toc.appendChild(li);
});
toc.addEventListener('click', e => { if (e.target.tagName === 'A') { e.preventDefault(); location.hash = 'tom1-' + e.target.dataset.ch; } });
function openChapter(n) {
  const ch = TOM1.find(c => c.n === n) || TOM1[0];
  document.getElementById('tom1-article').innerHTML = '<h1>' + ch.n + '. ' + esc(ch.tytul) + '</h1>' + md(ch.tresc);
  document.querySelectorAll('#tom1-list a').forEach(a => a.classList.toggle('active', +a.dataset.ch === ch.n));
  document.getElementById('tom1-article').scrollTop = 0;
}

/* =========================================================================== SŁOWNIK */
const glossState = { q: '', kat: null };
function glossCats() {
  const cats = [...new Set(window.GLOSSARY.map(g => g.kategoria))].sort();
  const el = document.getElementById('gloss-cats');
  el.innerHTML = '';
  const all = document.createElement('span');
  all.className = 'chip' + (!glossState.kat ? ' active' : '');
  all.textContent = 'wszystkie (' + window.GLOSSARY.length + ')';
  all.onclick = () => { glossState.kat = null; glossCats(); renderGloss(); };
  el.appendChild(all);
  cats.forEach(c => {
    const n = window.GLOSSARY.filter(g => g.kategoria === c).length;
    const chip = document.createElement('span');
    chip.className = 'chip' + (glossState.kat === c ? ' active' : '');
    chip.textContent = c.replace(/_/g, ' ') + ' (' + n + ')';
    chip.onclick = () => { glossState.kat = (glossState.kat === c ? null : c); glossCats(); renderGloss(); };
    el.appendChild(chip);
  });
}
function renderGloss() {
  const q = glossState.q.toLowerCase();
  const list = window.GLOSSARY.filter(g =>
    (!q || g.termin.toLowerCase().includes(q) || g.definicja.toLowerCase().includes(q)) &&
    (!glossState.kat || g.kategoria === glossState.kat));
  const el = document.getElementById('gloss-list');
  el.innerHTML = '<h2>Hasła słownika (' + list.length + ')</h2>' + list.map(g =>
    '<div class="gloss-item"><span class="kat">' + esc(g.kategoria.replace(/_/g, ' ')) + '</span>' +
    '<h3>' + esc(g.termin) + '</h3><p>' + esc(g.definicja) + '</p>' +
    (g.zobacz_tez.length ? '<p class="dim">zob. też: ' + g.zobacz_tez.map(z =>
      '<span class="chip" data-z="' + esc(z) + '">' + esc(z) + '</span>').join(' ') + '</p>' : '') + '</div>'
  ).join('');
  el.querySelectorAll('.chip[data-z]').forEach(ch => ch.onclick = () => {
    glossState.q = ch.dataset.z; document.getElementById('gloss-q').value = ch.dataset.z; renderGloss();
  });
}
document.getElementById('gloss-q').addEventListener('input', e => { glossState.q = e.target.value; renderGloss(); });

/* =========================================================================== O DANYCH */
/* Liczby w tym tekście MUSZĄ pochodzić z danych, nie z ręcznej korekty: poprzednio
   „26 kultur / 140 wariantów" i „146 zapisów na 26 kultur" przeczyły sobie i danym
   (META.kultury = 25). Teraz każda liczba jest wyliczana przy starcie. */
const RAW_KULTURY = new Set(SITES.rdzen.concat(SITES.sasiedzi).map(s => s.kultura_raw).filter(Boolean)).size;
const FAZY_GLEBOKIE = FAZY.filter(f => f.glebokie).length;
const FAZY_KLIMAT = FAZY.length - FAZY_GLEBOKIE;
const MIGAWKI_BIOMOW = ((window.BIOME_META || {}).epochs || []).length;
document.getElementById('about-content').innerHTML = `
<p>Portal powstał na danych poddanych rygorystycznej weryfikacji naukowej: <b>${SITES.rdzen.filter(s => !isDupe(s)).length} stanowisk z Polski</b>
(warstwy A/B, statusy weryfikacji, rozdzielenie „co wiemy” / „czego nie wiemy”, źródła pierwotne)
oraz <b>${SITES.sasiedzi.length} stanowisk-sąsiadów</b> z ${new Set(SITES.sasiedzi.map(s => s.kraj)).size} krajów, dających kontekst porównawczy.
Trzy rekordy oznaczone w bazie jako duplikaty (PM-094→PM-030, PM-099→PM-142, PM-128→PM-127) są dostępne w kartach,
ale nie rysują się na mapie i nie liczą w statystykach.</p>

<h3 class="about-h">Oś czasu</h3>
<p>Oś jest <b>nieliniowa</b>: każda z <b>${FAZY.length} faz</b> — ${FAZY_KLIMAT} faz klimatycznych (z pliku <code>zlodowacenia_biomy.csv</code>) oraz
${FAZY_GLEBOKIE} fazy głębokie („Pierwsze narzędzia kamienne — Lomekwi i Oldowan” 3,3 mln–1,8 mln; „Ekspansja Homo —
wyjście z Afryki i Acheul” 1,8 mln–800 tys.) — zajmuje ten sam odcinek suwaka. Dzięki temu plejstoceńska
przeszłość — np. 200 tys. lat paleolitu środkowego — ma tak samo szeroką skalę jak 9 tys. lat paleolitu
schyłkowego. Suwak kierowany w prawo: <b>lewo = przeszłość (3,3 mln lat temu), prawo = dziś</b>.
Pod osią ${(META.milestones || []).length} diamentowych znaczników ♦ to kamienie milowe homininów (Lomekwi, rodzaj Homo, Oldowan,
Shangchen, Dmanisi, Acheul, Sima del Elefante, Orce, Happisburgh) — kliknięcie przesuwa suwak do epoki.</p>

<h3 class="about-h">Globalna chronologia środowiskowa (lądolód + poziom morza)</h3>
<p>Lądolód i dawne linie brzegowe <b>nie są sztywno przypięte do faz osi</b> — płyną osobną, globalną skalą:
<b>${ENV_TICKS.length} przekroje</b> od 3,15 mln lat do dziś. Przekroje MIS 16–24 mają <b>okna pięter</b> (granice stadiałów
wg Railsback i in. 2015 / LR04 — np. 713 tys. lat ląduje w stadiałowym MIS 18, nie w najbliższym interglacjale);
poza nimi portal wybiera <b>najbliższy przekrój</b> dla bieżącego roku —
karta fazy pokazuje jego etykietę („🛰 Środowisko (chronologia globalna): …”), a jeśli przekrój jest
oddalony o ≥5 tys. lat, dopisuje jawnie „najbliższy przekrój: Δ X tys. l.”. Poziom morza liczony jest
z uproszczonej krzywej eustatycznej (${ENV_SEA.length} punkty, interpolacja liniowa): Waelbroeck i in. 2002;
Spratt &amp; Lisiecki 2016; pliocen: Miller i in. 2020 / PRISM (do +20 m w pliocenie).</p>

<h3 class="about-h">Warstwy mapy</h3>
<table>
<tr><th>Warstwa</th><th>Źródło / status</th></tr>
<tr><td>Stanowiska</td><td>dane portalowe, datowanie znormalizowane (cal BP)</td></tr>
<tr><td>Kolory kultur</td><td>taksonomia ${META.kultury.length} kultur wyprowadzona z pola <code>okres_kultura</code> (${RAW_KULTURY} wariantów zapisu obecnych w danych)</td></tr>
<tr><td>Zasięgi kultur</td><td>tymczasowo wyłączone (obwiednie wypukłe bywały mylące) — wrócą w przemyślanej formie</td></tr>
<tr><td>Lądolód — Polska</td><td>dokładne linie z <code>zlodowacenia_biomy.csv</code> (wszykane w poligony globalne — verbatim)</td></tr>
<tr><td>Lądolód — Eurazja 30–8 tys. BP</td><td><b>DANE</b>: DATED-1 (Hughes i in. 2016, <i>Boreas</i>; PANGAEA 848117), linia „most credible” co 1 tys. lat</td></tr>
<tr><td>Lądolód — Ameryka Płn. 25–10,5 ka</td><td><b>DANE</b>: NADI-1 (Dalton i in. 2023, <i>Quat. Sci. Rev.</i>, doi:10.1016/j.quascirev.2023.108345; Zenodo 10.5281/zenodo.8161764), izochrony co 0,5 tys. lat, wariant OPTIMAL. Grenlandia poza NAISC → ICE-6G_C (wiersz niżej)</td></tr>
<tr><td>Lądolód — Ameryka Płd. 35–10,5 ka + „dziś”</td><td><b>DANE</b>: PATICE (Davies i in. 2020, <i>Earth-Science Reviews</i> 204:103152; Mendeley Data 10.17632/ztz59y79vv.1) — empiryczne przekroje 35/30/25/20/15/13/10/5 ka (do ticków osi dobierany najbliższy: 27→25, 21,5→20, 17,5→15, 13,6/12,3→13, 10,5→10) + inwentarz 2011 AD (plamy ≥10 km²). Stadiały MIS ≥4 (poza 45 ka i Gauss, gdzie Q19 ma własne pierścienie): <b>SCHEMAT</b> portalu z <b>etykietą epokową z ticka osi i pełnymi cytatami</b> (pustaka ≈ analog zasięgu LGM; przekroje empiryczne kończą się na 35 ka; zewnętrzne systemy moren zmapowane, lecz systematycznie niedatowane: Rabassa 2008, Coronato, Martínez &amp; Rabassa 2004; zasięg ponad-LGM — GPG ~1,09 mln lat — wyłącznie w epoce Matuyama: Hein i in. 2009, <i>Geology</i> 37:551); interstadialia MIS 5a–d: stan jak dziś</td></tr>
<tr><td>Paleojeziora przylodowcowe — Patagonia 10–35 ka</td><td><b>DANE empiryczne</b>: PATICE (Davies, Thorndycraft, Fabel &amp; Martin 2020, <i>Earth-Science Reviews</i> 204:103152, doi:10.1016/j.earscirev.2020.103152; dane: Mendeley Data 10.17632/ztz59y79vv.1, CC-BY 4.0 — pliki <code>Glacial_lake_{10,13,15,20,25,30,35}ka.shp</code>) — 49 zbiorników ≥40 km² (części mniejsze pominięte dla czytelności) rysowanych JAKO WODA pod poligonami lodu. Nazwa, wysokość zwierciadła i stan wg publikacji w tooltipie (Thorndycraft i in. 2019; Garcia i in. 2019; Horta i in. 2019; Tatur i in. 2002; Sagredo i in. 2011; Lovell i in. 2011/2012; Kilian i in. 2015; m.in.). Mapowanie faz = jak lód PATICE (25→przedmaksymalny, 20→LGM, 15→pozn./pom., 13→B–A/YD, 10→wcz. holocen). Kulminacja 13–15 ka: Σ ~13,7–13,9 tys. km² (m.in. <b>jezioro Chalenko ~4,7 tys. km²</b> — największe plejstoceńskie jezioro Ameryki Płd., Thorndycraft i in. 2019); ≥40 ka: brak rekonstrukcji (zbiór zaczyna się od 35 ka). Przekrój 12 ka w publikacji nie istnieje — w B–A/YD trzymamy 13 ka, w holocenie 10 ka</td></tr>
<tr><td>Lądolód — Wyspy Brytyjskie 31–15 ka</td><td><b>DANE empiryczne</b>: BRITICE-CHRONO (Clark, Ely, Fabel &amp; Bradley 2022, PANGAEA doi:10.1594/PANGAEA.945729, CC-BY 4.0; artykuł: Clark i in. 2022, <i>Boreas</i> 51:699–758, doi:10.1111/bor.12594) — rekonstrukcja co 1 tys. lat na bazie 639 nowych datowań (14C/OSL/TCN) + danych morfologicznych; do ticków osi dobierane izochrony 27 / 21 / 18 / 15 ka (przedmaksymalny / LGM / poznańska / pomorska). Portal udostępnia <b>wszystkie trzy warianty niepewności z publikacji</b> — przycisk <b>„🧊 BIIS”</b> na karcie fazy przełącza MINIMUM / OPTIMUM / MAKSIMUM (domyślnie OPTIMUM — preferowany przez autorów; np. LGM 21 ka: ~448 / ~770 / ~996 tys. km² w sektorze BIIS). Poligony optimum obejmują także kontekstową FIS/BKIS — serwerowo wycięto tylko sektor BIIS (Fennoskandia nadal z DATED-1). <b>Faza bolingu–allerödu: Wyspy bez lodu</b> (całkowita deglacjacja ~15–14 ka); lód wraca dopiero z readvance Loch Lomond (mł. dryas 12,9 ka) — ten schemat zostaje. Młodszy dryas i później = poza zakresem zbioru</td></tr>
<tr><td>Lodowce — Afryka (górskie)</td><td><b>DANE GLACIMONTIS</b> w oknach rekordów (GLACIMONTIS fala 2): Rift Wsch. (Kilimandżaro / Mt Kenya) — Chen i in. 2018 (maks. 24–32 ka), Osmaston 2004 (maks. 17–20 ka + rekord o chronologii nieustalonej, okno publikacji 13,5–57 ka); Atlas (Maghreb) — Hannah i in. 2017 (19–25 ka, Σ ~31 km² u Toubkala). Fazy bez pokrycia rekordami zachowują <b>SCHEMAT kształtu</b> (dysk) z powierzchnią z publikacji: <b>Atlas w mł. dryasie = readvance 11–13 ka wg ¹⁰Be (Fink i in. 2014)</b> — YD &gt; B–A, w przeciwieństwie do Tasmanii i NZ; Kilimandżaro/Mt Kenya/Ruwenzori w YD = 3 dyski (brak rekordów — brak znanego readvance młododryasowego); w pomorskiej/B–A dysków Riftu portal nigdy nie rysował (szybka deglacjacja E-Afryki przed ~14 ka). Rekord Hughes i in. 2021 (Atlas, 50,2 ka) leży poza oknami faz deglacjacji 11,7–30 ka — projektowo nie pokazujemy go na osi (zostaje w bazie zbioru). Lądolodu kontynentalnego Afryka nie miała NIGDY w kainozoiku; Q19 wyklucza lodowce górskie. „Dziś”: POMIARY (Cullen i in. 2013 — Kilimandżaro 1,76 km²; Mölg i in. 2006 — Ruwenzori 1,14 km²; Prinz i in. 2018 — Mt Kenya 0,15 km²); Atlas: 0 km²</td></tr>
<tr><td>Lodowce — Australia, Nowa Gwinea, Tasmania</td><td><b>DANE GLACIMONTIS</b> w oknach rekordów (GLACIMONTIS fala 2): Tasmania — 16 rekordów w LGM (m.in. Barrows i in. 2002, <i>QSR</i> 21:159, maks. 17,3–20,1 ka; Colhoun &amp; Barrows 2011) — zero dysków; dominujący rekord ~1,2–1,6 tys. km² (czapa Central Plateau ~1085 km² wg Colhoun &amp; Barrows 2011 + satelity West Coast); kontynent: dokładnie 1 rekord — <b>Snowy Mountains (Góry Wododziałowe)</b>, Barrows i in. 2001, <i>Quat. Res.</i> 55:179 (16,8–32 ka; kilkanaście km² — najmniej zlodowaciały kontynent świata); Nowa Gwinea i Archipelag Malajski: Prentice i in. 2005/2011 + Peterson i in. 2004 (pole Sudirmana/Jaya + Giluwe do 188 km²; największy rekord = czysto LGM 17,7–24 ka, część okien sięga pomorskiej ~15,4 ka — Barrows i in. 2011, <i>QSR</i> 30:2676: 4 glacjacje 293 ka–11,5 ka). Fazy po oknach rekordów = <b>narracyjny SCHEMAT</b>: szybka deglacjacja, <b>brak readvance w ACR i mł. dryasie</b> (Barrows i in. 2002) — odwrotnie niż Atlas. Starsze stadiały (≥ MIS 4): wcześniejsze, większe maksima Tasmanii (do ~4500 km²) — stary schemat. „Dziś”: <b>POMIAR</b> Puncak Jaya ~0,2 km² (2022–24, BMKG/Permana; 1850: 19,3 km²; prognoza zaniku do ~2030); Tasmania i kontynent: 0 km² stałego lodu. Q19/Batchelor wykluczają te glacjacje górskie z założenia</td></tr>
<tr><td>Lodowce — Nowa Zelandia</td><td><b>DANE GLACIMONTIS</b> w LGM i poznańskiej (GLACIMONTIS fala 2): 35 rekordów wyspy Płn.-Płd. (m.in. Barrell 2011 — scalony kompleks Southern Alps odpowiadający literaturowej sumie <b>~40 tys. km²</b>: Porter 1975; Golledge i in. 2012, <i>QSR</i>; chronologia ¹⁰Be: maks. ~26–20 ka, cofka od ~18 ka — Putnam i in. 2013, <i>QSR</i> 62:114), wyspa Płn. (Ruapehu/Tongariro) i wyspa Stewarta. Fazy rzadkich okien = <b>narracyjny SCHEMAT</b> (MIN_COUNT): <b>ACR ≈ poziom pomorskiej — readvance ~13 ka</b> (Putnam i in. 2010, <i>Nat. Geosci.</i> 3:700), <b>młody dryas = cofka</b> (Kaplan i in. 2010, <i>Nature</i> 467:194 — do 11,5 ka niemal stan dzisiejszy). Głębokie stadiały: MIS 3 nasunięcie ~42 ka (Kelley i in. 2014, <i>EPSL</i> 405:194); MIS 4 ~65 ka = <b>Southern Glacial Maximum</b>, największy stan 130 tys. lat (Schaefer i in. 2015, <i>QSR</i> 114:410) — szczery schemat portalu. „Dziś”: <b>POMIAR</b> 794 ± 34 km² / 2 918 lodowców (Baumann i in. 2021, <i>J. Glaciol.</i> 67:7–24, stan 2016; 1978: 1 158 km² — Chinn 2001) + Ruapehu 3,0 km²</td></tr>
<tr><td>Lodowce górskie świata — GLACIMONTIS (fale 1+2)</td><td><b>DANE empiryczne</b>: GLACIMONTIS (Lima, Dulfer, Hughes, Margold, Barr, Laabs &amp; Flantua 2026, <i>Scientific Data</i> 13:629, doi:10.1038/s41597-026-06841-z; Zenodo 10.5281/zenodo.15600659, CC-BY 4.0) — 15 014 rekonstrukcji maksymalnych zasięgów z 209 prac / 271 łańcuchów (lok. LGM 57–14 ka). Fala 1: Himalaje/Karakoram/Tybet/Pamir/Hindu Kusz, Chiny Śr., Ałtaj–Sajany, Syberia Wsch. (Wierchojańsk — Barr &amp; Clark 2012), Japonia, Alpy/Pireneje/<b>KARPATY+Tatry</b>/Bałkany, Kaukaz/Anatolia/Iran, Andy tropikalne + S Georgia/Kerguelen, górska Ameryka Płn. Fala 2: podmiana dysków NZ/Australii+Tasmanii/Nowej Gwinei/E-Afryki (Rift)/Atlasu (wiersze wyżej). Okno fazowe = zakres wieku maksimum z rekordu (0/0 → okno publikacji ~13,5–57 ka); <b>641 rekordów</b> (≥3 km²; rekordy-mozaiki: próg dynamiczny). Rekonstrukcje-Kuhlego oznaczone <b>HIPOTEZA sporna</b>. Zasada podmiany: <b>jedno źródło na grupę×fazę</b> (MIN_COUNT) — rzadkie okna zostają narracyjnym schematem z cytatem (NZ: Putnam 2010/Kaplan 2010; Atlas: Fink 2014; Tasmania: brak readvance — Barrows 2002); rekord Hughes i in. 2021 (Atlas, 50,2 ka) poza oknami faz 11,7–30 ka — pominięty projektowo. W przekroju <b>q_lgm</b> nadpisania PA_NZ_LGM / PA_AUS_LGM / PA_AFRYKA_LGM; głębsze stadiały = szczery SCHEMAT</td></tr>
<tr><td>Lądolód — Antarktyda „dziś” + deglacjacja 26–10,5 ka</td><td><b>DANE modelowe</b>: GIA ICE-6G_C (VM5a) — Argus, Peltier, Drummond &amp; Moore 2014, <i>Geophys. J. Int.</i> 198:537–563 (doi:10.1093/gji/ggu140) + Peltier, Argus &amp; Drummond 2015, <i>JGR Solid Earth</i> 120:450–487 (doi:10.1002/2014JB011176); maska siatki 1° (sftgif ≥ 50%), przekroje 26/21/17,5/15/13,5/12/10,5/0 ka → do ticków osi dobierany najbliższy (27→26, 21,5→21, 17,5→17,5, 15→15, 13,6→13,5, 12,3→12, 10,5→10,5). LGM: lądolód ugruntowany przy krawędzi szelfu niemal wokół całego kontynentu, powierzchnia maski ~15,2 mln km² (dziś ~14,2; rzeczywista ~13,6–14,0 mln km² łącznie z szelfami). Por. rekonstrukcja empiryczna RAISED (Bentley i in. 2014, <i>QSR</i> 100:1–9): maksimum w większości sektorów do ~18 ka, cofka w modelu łagodniejsza niż empiryczna. Fazy głębokie (≥ MIS 3): <b>kotwica ≈ „dziś”</b> (przekrój 0 ka, DANE) z jawną notką w tooltipie — przekroje empiryczne (RAISED/Bentley 2014) kończą się na LGM, starsza wielkość nieznana</td></tr>
<tr><td>Lądolód — Grenlandia 26–10,5 ka + „dziś”</td><td><b>DANE modelowe</b>: ta sama maska <b>ICE-6G_C (VM5a)</b> co Antarktyda (Argus i in. 2014, doi:10.1093/gji/ggu140; Peltier i in. 2015, doi:10.1002/2014JB011176), obszar lat ≥ 57°, lon ∈ [−75°, −10°] (Islandia wykluczona — bierze się tylko główny kontur). LGM: czapa na krawędzi szelfu ~2,5 mln km² (por. niezależnie ~2,6–2,8 wg syntez datowań: Vasskog i in. 2015; Lecavalier i in. 2014, <i>PNAS</i> 111:17701 — Grenlandia 1,3–1,6× objętościowo większa); „dziś” ~1,74 mln km² (rzeczywista ~1,71). W masce 1° cofka marginesów schodzi się w holocenie; młododryasowy readvance mały. Grenlandia poza zasięgiem NADI-1 — wcześniej sztywny <b>SCHEMAT</b> portalu (~1,75 mln km² niezależnie od epoki)</td></tr>
<tr><td>Lądolód — Islandia „dziś” + deglacjacja 15–10,5 ka</td><td><b>DANE (inwentarz):</b> <b>RGI 7.0</b> (Randolph Glacier Inventory: RGI 7.0 Consortium 2023, Boulder, NSIDC DAAC, doi:10.5067/f6jmovy5navz, CC-BY 4.0) — 568 rekordów-jęzorów Islandii (Σ ~11,1 tys. km², zdj. Landsat ~2000–2015 AD) scalonych w portalu do czap macierzystych: Vatnajökull ~8 184, Langjökull ~944, Hofsjökull ~889, Mýrdalsjökull ~598, Drangajökull ~145 km² + mniejsze; splajsowane wyłącznie do fazy „dziś”. <b>DANE modelowe (deglacjacja):</b> maska <b>ICE-6G_C (VM5a)</b> w sektorze Islandii — pomorska 15 ka / B–A 13,5 ka / mł. dryas 12 ka / wcz. holocen 10,5 ka (124,8 → 68,6 tys. km²); maska 1° modelu jest <b>statyczna 26→13,5 ka</b> (nie oddaje zapaści morskiej) i znika do 0 ka (stgit = 0 — brak czap), dlatego LGM/fazy starsze zostają <b>SCHEMATem</b> portalu z etykietą natury empirycznej (pełna pokrywa do krawędzi szelfu ~0,3 mln km², max lokalne ~23–21 ka: Norðdahl &amp; Pétursson 2005; Benediktsson i in. 2022/2023). <b>Walidacja testowa:</b> IcelandICE DB (Goffin i in. 2026, <i>Clim. Past</i> 22:825–843; Zenodo doi:10.5281/zenodo.19453940, CC-BY 4.0) — 37 wiążących wieków zasięgu (7 morskich PaleoExt + 30 lądowych PaleoH); readvance młododryasowy fiordów płn. poniżej rozdzielczości modelu</td></tr>
<tr><td>Widok „🌍 Globus”</td><td>projekcja ortograficzna (kula; d3-geo v7, canvas) — te same warstwy (lądolód, szelf, stanowiska); likwiduje szew płaskiej mapy na ±180° (Beringia ciągła). Mapa Leaflet/Merkator zostaje widokiem głównym (z worldCopyJump)</td></tr>
<tr><td>Lądolód półkuli płn. — 2,75 mln–30 tys. BP</td><td><b>REKONSTRUKCJA NAUKOWA</b>: Batchelor i in. 2019 (<i>Nature Communications</i> 10:3713), wariant „best estimate” (OSF osf.io/7jen3) — 18 przekrojów: ~30/35/40/45 ka, MIS 4, 5a–d, 6, 8, 10, 12, 16, kompozyt MIS 20–24, wczesny Matuyama (~2,5 mln), późny Gauss (~2,75 mln); margines w PL tam, gdzie pokryty — linia z danych portalu (splice verbatim)</td></tr>
<tr><td>Lądolód — MIS 8 (stadiał Odry)</td><td>Batchelor 2019 (best estimate) + <b>osobny lob Odry wg linii portalu</b> — synteza Batchelor dla MIS 8 nie sięga Polski; rozbieżność korelacji MIS 8 ↔ Odra w literaturze jest sygnalizowana w tooltipie i karcie fazy</td></tr>
<tr><td>Lądolód — epoki międzylodowcowe</td><td>stan jak dziś (Grenlandia, Antarktyda, lodowce górskie) — schemat portalu; pierścień Antarktydy „dziś” = ICE-6G_C 0 ka (patrz wiersz Antarktydy powyżej)</td></tr>
<tr><td>Biomy — holocen i deglacjacja (0–120 tys. BP)</td><td><b>MODEL opublikowany</b>: Beyer, Krapp &amp; Manica 2020 (<i>Scientific Data</i> 7:236, doi:10.1038/s41597-020-0552-1; dane: figshare „pastclim”) — 28 klas biomów BIOME4 na klimacie HadCM3+HadAM3H (korekcja błędu do współczesności, 0,5°), wbudowane maski lądolodów <b>ICE-6G_C</b> per migawka. Migawki: co 1 tys. l. (0–4 ka), dalej co ~2 tys. l. do 120 ka. LGM wg modelu: Sahara rozszerzona jako pustynia, FIS do ~52°N w Polsce, przedpole = tajga/tundra (sygnał modelowy — różnice względem pyłka pokazują wprost kotwice 🌾 BIOME 6000)</td></tr>
<tr><td>Biomy — głęboki plejstocen (121–799 tys. BP)</td><td><b>MODEL opublikowany</b>: Krapp, Beyer, Edmundson, Valdes &amp; Manica 2021 (<i>Scientific Data</i> 8:228, doi:10.1038/s41597-021-01009-3) — statystyczny emulator HadCM3 (regresja na 72 symulacjach × wymuszenia CO₂/orbitalne/lądolód, bias-corrected, co 1 tys. l., 0,5°); ta sama taksonomia BIOME4, klasa 28 = lądolód emulatora, dogrznany zasięgiem przekroju Q19 epoki (spójność z warstwą lodu portalu)</td></tr>
<tr><td>Biomy — przełom śr.-plejst. → pliocen (0,81–3,3 mln BP)</td><td><b>MODEL portalu</b>: klimat PALEO-PGEM-Series (Barreto, Holden, Edwards &amp; Rangel 2023, <i>Global Ecology and Biogeography</i> 32:1034–1045, doi:10.1111/geb.13683; dane figshare 10.6084/m9.figshare.20379663, CC-BY 4.0 — bio1/5/6/12/15/16/17, 1°, co 1 tys. l. do 5 mln) + <b>klasyfikator regułowy HG-lite v0.6</b> (sam bioclim — <b>bez paleogeografii i GDD pełnego</b>; konstrukcja na wzór progów BIOME4). <b>Walidacja</b> (tools/check_biomes.py → biome_report.json): zgodność GRUP biomowych z modelem Krapp2021 na 0 ka = <b>68% komórek lądowych globalnie</b> (Amazonia 99%, Polska 97%, Kongo 84%, Syberia 84%, Sahara 77%, Indie 73%; słabiej: umiark. mokra Patagonia 17%, Tybet 62% — komórki 0,5° uśredniają góry). Warstwa sygnuje to etykietą „MODEL portalu” w tooltipie i legendzie</td></tr>
<tr><td>Kotwice pyłkowe biomów (🌾 0k / 6k / 18k)</td><td><b>DANE pomiarowe</b>: BIOME 6000 v4.2 (Prentice i in. 2000; Harrison i in. 2001; Bigelow i in. 2003; Pickett i in. 2004 + syntezy regionalne: Marchant i in. — Ameryka Płd.; Ni i in. — Chiny; Sutra i in. — Indie; SEAPAC — Azja Płd.-Wsch.; PMIP2/BRIDGE) — odpowiednio 9 948 / 1 794 / 318 stanowisk z biomiem zrekonstruowanym z pyłku, rysowane punktowo <b>dokładnie tam, gdzie są pomiary</b> (bez mieszania DANYCH z MODELEM); widoczne przy migawkach 0–3 / 4–8 / 17–25 ka; „18k” = lata radiowęglowe (~21–22 ka kal.)</td></tr>
<tr><td>Wizualizacja biomów</td><td>rastery PNG 0,5° (${MIGAWKI_BIOMOW} migawek, paleta BIOME4 — ta sama klasyfikacja we wszystkich trzech źródłach); wybór migawki = najbliższa na osi; klasa 28 (lądolód) domyślnie przykryta białym poligonem warstwy lodu; na hover: nazwa biomy + źródło epoki; legenda = klasy obecne w bieżącej migawce; <b>oceany nie sa klasyfikowane</b> (biomy lądowe); te same rastry rysowane tez na <b>globie</b> (przelacznik „🌿 biomy” w HUD — probkowanie odwroconym rzutem, klatka koncowa = pelna rozdzielczosc danych)</td></tr>
<tr><td>Lądolód — MIS 18 i wczesny plejstocen (MIS 36/52–54/62/82)</td><td><b>SCHEMAT-analog</b>: kształt pożyczony z najbliższego przekroju (MIS 20–24 / wczesny Matuyama / późny Gauss), rząd wielkości wg LR04; etykieta i tooltip ⚠ jawnie to zaznaczają</td></tr>
<tr><td>Poziom morza</td><td>uproszczona krzywa eustatyczna portalu (102 pkt): Waelbroeck i in. 2002; Spratt &amp; Lisiecki 2016; pliocen: Miller i in. 2020 / PRISM; steruje progiem szelfu</td></tr>
<tr><td>Dawne lądy / wyschnięty szelf</td><td><b>DANE</b>: batymetria ETOPO2v2 (NOAA/NCEI, 2′) + próg z globalnej krzywej (−5…−125 m); baseny zamknięte (Czarne, Kaspijskie): przybliżenie 1. rzędu; paleojeziora przylodowcowe Patagonii: osobna warstwa DANYCH PATICE (wiersz wyżej)</td></tr>
<tr><td>Podkład</td><td>Esri Terrain / Physical / Hydro (rzeki, góry), OSM, OpenTopoMap — <b>jedyne warstwy pobierane z zewnątrz</b>, i tylko po wyłączeniu trybu „lądy z epoki” (nota prywatności przy przełączniku warstw). Reszta portalu działa bez sieci.</td></tr>
<tr><td>Granice współczesne</td><td>warstwa przełączalna (Esri Boundaries); miejsce na warstwy granic historycznych</td></tr>
<tr><td>Wyszukiwarka i filtry</td><td>po nazwie, miejscowości, regionie, kulturze, typie stanowiska, homininie i statusie — panel „Szukaj · legenda” na mapie</td></tr>
<tr><td>Kierunek lądolodu</td><td>wartości robocze z CSV są na wyświetlaczu tłumaczone na opis (np. <code>polnoc_silna_recesja</code> → „margines na północy — silna recesja”)</td></tr>
</table>

<h3 class="about-h">Roadmapa</h3>
<ul>
<li>warianty MIN/MAX NADI-1 jako osobna nakładka niepewności (obecnie tylko OPTIMAL); uzupełnienie Grenlandi o warstwę z danych,</li>
<li>biomy globalne z rekonstrukcji (BIOME 6000, PMIP4) zamiast schematu kontynentalnego; dla faz głębokich: paleoekologia Afryki (savanna/corridors),</li>
<li>stanowiska faz głębokich (Afryka, Eurazja) wg tego samego schematu CSV — kamienie milowe ♦ już czekają na osi,</li>
<li>dokładniejsza batymetria GEBCO + regionalne krzywe eustatyczne z odbiciem izostatycznym (GIA),</li>
<li>granice historyczne jako osobne warstwy czasowe (mechanizm już przewidziany w architekturze),</li>
<li>rozszerzenie na cały świat — model danych jest na to gotowy (plik sąsiadów ma ten sam schemat),</li>
<li>wersja EN; eksport danych widoku; dalszy rozwój wariantu mobilnego.</li>
</ul>
<p>Zrealizowane: ✅ osobna globalna chronologia lądolodu i poziomu morza (${ENV_TICKS.length} przekroje + okna pięter MIS 16–24, 3,15 mln–dziś),
✅ pełny import Batchelor i in. 2019 (18 przekrojów półkuli płn., OSF osf.io/7jen3) z liniami marginesu PL wsykanymi verbatim,
✅ oś czasu od 3,3 mln lat (pierwsze narzędzia kamienne) z 9 kamieniami milowymi homininów,
✅ DATED-1 dla Eurazji 30–8 tys. BP z liniami marginesu z danych portalu,
✅ NADI-1 dla Ameryki Płn.: deglacjacja co 0,5 tys. lat (25–10,5 ka, Dalton i in. 2023 QSR; Zenodo 10.5281/zenodo.8161764) w miejsce schematu,
✅ PATICE dla Ameryki Płd.: empiryczny Lodowiec Patagoński (Davies i in. 2020 ESR; Mendeley 10.17632/ztz59y79vv.1) — przekroje 35–10 ka, rozpad PIS na masywy po 15 ka, readvance w ACR, współczesne lodowce (2011 AD),
✅ glacjacje górskie płk. płd.: Afryka (4 masywy) i Australia+Nowa Gwinea+Tasmania (Sudirman >3400 km², Giluwe, Tasmania 1085 km² w LGM; kontynent: zaledwie 12–15 km² Kosciuszki; „dziś” POMIAR Puncak Jaya ~0,2 km²) z kotwicami z publikacji i uczciwą etykietą SCHEMAT,
✅ widok kulisty „🌍 Globus” (d3-geo) — bez szwu na datowniku; porządki azjatyckie (Tajmyr/NE Azja wg Batchelora),
✅ paleolinie brzegowe z batymetrii ETOPO2v2 (próg z globalnej krzywej),
✅ wyszukiwarka stanowisk z filtrami (kultura · typ · hominina · status), ✅ tryb mobilny (zwijane panele, dolna szuflada karty),
✅ deduplikacja rekordów, ✅ mapowanie ${RAW_KULTURY} zapisów <code>okres_kultura</code> na ${META.kultury.length} kultur (w tym korekta hamburskiej i epigraweckiej).</p>
<p class="muted">Zbudowano automatycznie z CSV narzędziem <code>tools/build_data.py</code> — aktualizacja danych = nowe CSV + uruchomienie skryptu.</p>`;

/* =========================================================================== START */
/* RWD: na małych ekranach karta fazy i legenda są domyślnie ZWINIĘTE */
const mobileMQ = window.matchMedia('(max-width: 760px)');
const phasecard = document.getElementById('phasecard');
function applyMobileInit() {
  if (mobileMQ.matches) phasecard.classList.add('closed');
  else phasecard.classList.remove('closed');
  phasecard.setAttribute('aria-expanded', phasecard.classList.contains('closed') ? 'false' : 'true');
  const lg = document.getElementById('legend');
  if (mobileMQ.matches && lg.classList.contains('open')) {
    lg.classList.remove('open');
    document.getElementById('legend-body').style.display = 'none';
    document.getElementById('legend-toggle').textContent = '+';
  }
}
if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', applyMobileInit);
function phasecardToggle() {
  if (!mobileMQ.matches) return;
  const closed = phasecard.classList.toggle('closed');
  phasecard.setAttribute('aria-expanded', closed ? 'false' : 'true');
}
/* klik w sam pasek/kartę zwija–rozwija; klik w przycisk (paleo, BIIS) ma swoje akcje */
phasecard.addEventListener('click', e => { if (e.target.closest && e.target.closest('button')) return; phasecardToggle(); });
phasecard.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target === phasecard) { e.preventDefault(); phasecardToggle(); }
});
paleoBtn.addEventListener('click', e => e.stopPropagation());
applyMobileInit();

glossCats(); renderGloss();
route();
setSlider(bpToSlider(95000)); // start: MIS 5 / wczesna Wisła — widoczne kontury lądolodu i epoka neandertalczyka
setPaleoView(true);           // start w trybie „lądy z epoki”
window.setPaleoView = setPaleoView;
/* uchwyt diagnostyczny (testy, osadzanie, przyszłe SDK) */
window.__PA = {
  map, setSlider, bpToSlider, renderSearch, clearFilters,
  envTickForBP, seaAtBP, envIcePolys, envIcePolysCached, fazaForBP, setBritVar,
  biomeEpochForBP, biomeClassAt, biomePollenKeyFor, biomeGridFor, BIOME, renderBiome, group,
  /* diagnostyka preferencji ruchu (testy P0.5): trzy odczyty powinny być zgodne */
  reducedMotion: () => noMotion(),
  rmDiag: () => ({
    stored: !!(REDUCED_MOTION && REDUCED_MOTION.matches),
    fresh: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    media: (REDUCED_MOTION && REDUCED_MOTION.media) || null,
    type: Object.prototype.toString.call(REDUCED_MOTION),
    mmIsNative: /\[native code\]/.test(String(window.matchMedia))
  }),
  RENDER_CANVAS, refreshCanvasRenderers, ghostCoast,
  get bp() { return state.bp; }, filters: state.filters,
  openSiteById: id => {
    const s = SITES.rdzen.find(x => x.id === id) || SITES.sasiedzi.find(x => x.id === id);
    if (s) openSite(s);
    return !!s;
  }
};
})();
