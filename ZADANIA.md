# PaleoAtlas — lista „co jest do zrobienia" (stan na 2026-11-10)

Trwały rejestr zadań produktu. Odniesienia: ocena wartości → `AUDYT_PRODUKTOWY.md`,
strategia/kolejka → `AUDYT_PM.md`, rynki i koszty → `AUDYT_KONKURENCJA_KOSZTY.md`.
Priorytety i kolejność ustawia PM (AUDYT_PM.md §6–7); ten plik jest **wykazywem wykonawczym**.

**Statusy:** ⬜ do zrobienia · 🛠 w toku · ✅ zrobione · ⏳ czeka na usera · 🔒 zamrożone (nie robimy)
**Jednostka nakładu:** 1 dzień = jedna sesja agentska (jak dotąd ~1 zmiana + testy + changelog na sesję).

**North star (decyzja usera 2026-08-03):** *atlas całego świata, w językach całego świata, dostępny wszędzie.*
To **kompas, nie kolejka** — obowiązuje **zasada bliskości** (AUDYT_PM.md §0A): teraz H0 (v1.0 → P1),
potem H1 (P4, P3.1), wizja H2 wchodzi do planu tylko pojedynczymi bramkami. Daleki cel nie przysłania
tego, co blisko — poniższa lista liczy się pierwsza.

---

## DECYZJE (blokują resztę — do odpowiedzi usera)

| # | Decyzja | Propozycja PM | Status |
|---|---|---|---|
| D1 | **Hosting** stałego adresu: GitHub Pages / Cloudflare Pages / „na razie nie" | Cloudflare Pages (unlimited transfer gratis) lub GitHub Pages (najprościej); potrzebne konto usera | ⏳ |
| D2 | **Licencja tekstów własnych** (Tom I, słownik) + podpis autora | CC-BY-4.0 + nazwisko/inicjał do stopki | ⏳ |
| D3 | **Zielone światło „zrób P0"** (punkty P0.1–P0.6 niżej, ~1 dzień łącznie) | tak | ⏳ |
| D4 | *(nowe, z audytu kosztów)* Kierunek **„głęboki czas"**: czy rozszerzamy atlas poza 3,3 mln lat (patrz AUDYT_KONKURENCJA_KOSZTY.md §4) | najpierw v1.0; potem mały krok: skamieniałości PBDB | ⏳ |
| D5 | **Języki Europy Śr.-Wsch. — kierunek przyjęty** (decyzja usera 2026-08-03). Do potwierdzenia: zestaw fali 1 z propozycji **EN, UA, CZ, SK, DE**; reguła: język publikowany dopiero po korekcie native (model 0 zł: szkic maszynowy + społeczność/nauczyciele) | PM | ⏳ potwierdzenie fali 1 |
| D6 | **Apki Android/iOS — kierunek przyjęty** (decyzja usera 2026-08-03). Do podjęcia przy starcie P4.5/P4.6: kiedy Google Play ($25 jednorazowo), kiedy Apple ($99/rok; zwolnienie dla edu/nonprofit do sprawdzenia), nazwa wydawcy w sklepach | PM + user | ⏳ |

---

## P0 — bramka v1.0 („produkt da się komuś wysłać")

| # | Zadanie | Nakład | Zależność | Status |
|---|---|---|---|---|
| P0.1 | Stały publiczny URL (deploy statyczny; inicjal metryk bez ciastek z agregatów hostera) | 0,5 dnia + konto | **D1** | ⏳ |
| P0.2 | Pakiet znajdowalności: meta description, OG (tytuł/opis/obraz 1200×630 render z atlasu), theme-color, `manifest.webmanifest` + ikona 192/512 | ~0,3 dnia | — | ✅ 2026-11-10 — ikona rysowana z `assets/icon.svg` (emoji nie ma w każdym systemie), `tools/build_brand_assets.js`; `og:url`/canonical czekają na **D1** |
| P0.3 | CSS mobile: input/select ≥16 px (koniec autozoomu iOS) + rozplątanie kolizji karta fazy × kontrolki warstw ≤400 px | ~0,3 dnia | — | ✅ 2026-11-10 (testy M11.1–M11.2) |
| P0.4 | LICENSE: kod MIT lub CC0 + treści CC-BY-4.0 + wiersz w „O danych" + nota prywatności przy przełączniku podkładów Esri/OSM | ~0,2 dnia | **D2** | 🛠 nota prywatności i wiersz „Podkład" ✅, **LICENSE czeka na D2** (nazwisko/inicjał do stopki) |
| P0.5 | `prefers-reduced-motion` (media-query) + `:focus-visible` (outline) | ~0,2 dnia | — | ✅ 2026-11-10 — przy okazji naprawiony błąd: preferencja była booleanem i nigdy nie działała (test 10.14) |
| P0.6 | RUNBOOK.md (1 str.: start serwera, rebuild paczki offline, deploy, gdzie źródła) | ~0,2 dnia | — | ✅ 2026-11-10 (RUNBOOK.md + `tools/run_tests.sh` + `tools/requirements.txt`) |
| P0.7 | Po 2–6: `python3 tools/build_offline_pack.py` + pełna bateria suit (380 asercji) + changelog + tag `v1.0` | ~0,3 dnia | P0.2–6 | 🛠 paczka + bateria + changelog ✅ (2026-11-10); **tag `v1.0` czeka na D1/D2** |

## P1 — pierwsze wrażenie i cytowalność (po v1.0)

| # | Zadanie | Nakład | Status |
|---|---|---|---|
| P1.1 | Onboarding 60 s: pasek powitalny, znika po pierwszej zmianie epoki; **bez localStorage** (obietnica prywatności) | ~0,5 dnia | ⬜ |
| P1.2 | „Wersja danych + data buildu" w „O danych" („wolno cytować jak: …") | ~0,2 dnia | ⬜ |
| P1.3 | „Kopiuj cytowanie" przy warstwach (1 klik, format z DOI) | ~0,3 dnia | ⬜ |
| P1.4 | Stany błędów podkładów: „Podkład wymaga internetu" + graceful zniknięcie | ~0,2 dnia | ⬜ |
| P1.5 | A11y pass cz. 1: aria-etykiety kontrolek, role=tablist, skip-link „omiń mapę → lista stanowisk", klawiatura kontrolki warstw | ~0,5 dnia | ✅ 2026-11-10 — aria-current/pressed/expanded, `role=button`+Enter w legendzie i wynikach, skip-link, `<noscript>`; `role=tablist` nie dotyczy (nawigacja to linki widoków, nie taby) |
| P1.6 | Touch targets ≥44 px na mobile (zoom Leafleta, przyciski paneli) | ~0,2 dnia | 🛠 2026-11-10: nagłówek legendy 40 px, przycisk osi 40 px, pasek karty fazy 44 px; **kontrolki zoomu Leafleta nadal 26 px** (B7) |
| P1.7 | Rozwahywanie: widoczny reset filtrów stanowisk na mobile | ~0,1 dnia | ⬜ |

## P2 — zasięg i forma (mies. 2–3)

| # | Zadanie | Nakład | Status |
|---|---|---|---|
| P2.1 | Tryb nauczyciela: 3 gotowe „lekcje" jako predefiniowane widoki (LGM Polska · Beringia · zielona Sahara), każdy = jeden link | ~1 dzień | ⬜ |
| P2.2 | Landing crawlable (`<noscript>` + statyczny opis) + event. prerender snippetów Tomu I | ~0,5 dnia | ⬜ |
| P2.3 | Wideo 45 s z animacji osi czasu (asset do social, 0 zł) | ~0,5 dnia | ⬜ |
| P2.4 | PWA: manifest + lekki service worker (ostrożnie po „dziwach" iOS; pełne testy M*) | ~1 dzień | ⬜ |
| P2.5 | Wariant EN (osobny build; decyzja misji: PL first) | ~2 dni | ⬜ |

## P3 — „głęboki czas" (NOWE, po audycie kosztów; wymaga D4)

| # | Zadanie | Nakład | Uwagi | Status |
|---|---|---|---|---|
| P3.1 | Warstwa **skamieniałości PBDB** (CC0, API): odkrycia per epoka, jako „stanowiska głębokiego czasu"; etap próbny do 66 Ma | ~2–3 dni | bezpieczny pierwszy krok, bez zmiany osi | ⏳ D4 |
| P3.2 | **Oś głębokiego czasu**: skala łamana/log + podelement „ery/okresy" (3,3 mln → 66 mln … 541 mln lat) | ~1,5 dnia | wspólny fundament dla P3.3+ | ⏳ D4 |
| P3.3 | **Ląd/morze fanerozoiku** z PaleoDEM Scotese & Wright 2018 (CC BY 4.0, 0–540 Ma) + linie brzegowe Kocsis & Scotese 2021: pipeline netCDF→warstwy, oznaczenie MODEL | ~3–5 dni | pełny zakres 541 Ma w jednym źródle | ⏳ D4 |
| P3.4 | *(opcj.)* Klimatyczne pasy PANALESIS (CC BY 4.0, 45 przekrojów, 10 km) jako „biomy głębokiego czasu" (MODEL) | ~2 dni | po P3.3 | ⏳ D4 |
| P3.5 | Architektura modułowa paczki offline (baza + moduł „głęboki czas" ładowany na żądanie) | ~1,5 dnia | pilnuje granicy ~15 MB | ⏳ D4 |
| P3.6 | `tools/deeptime*` suite testów wizualnych (epoki × regiony, jak landshots/biomeshots) | ~1–2 dni | wymóg release'u | ⏳ D4 |

**Czego nie kupować/serwować przy rozbudowie:** Deep Time Maps ($125/mapa JPEG, „viewing only" — sprzeczne z misją),
klasyczne mapy Scotese (niestandardowa licencja non-commercial), wszystko co bez jawnego CC-BY/CC0.

## P4 — języki Europy Śr.-Wsch. + apki mobilne (NOWE, kierunek z decyzji usera 2026-08-03)

| # | Zadanie | Nakład | Uwagi | Status |
|---|---|---|---|---|
| P4.1 | **i18n plumbing**: wydobycie wszystkich napisów (UI, tooltipy, karty, legendy) do `js/i18n/<lang>.js`, przełącznik języka w nagłówku, `lang` w DOM, testy snapshot per język | ~2–3 dni | **Fundament — robić zaraz po v1.0**, zanim powstanie więcej napisów (dziś teksty są zakodowane w HTML/JS; każdy nowy feature bez i18n = praca × N języków). Słownik (74 hasła) i Tom I tłumaczone jako *dane*, nie UI | ⬜ po P0.7 |
| P4.2 | **Fala 1 tłumaczeń** UI + Słownik (wg D5): EN, UA, CZ, SK, DE; szkic maszynowy + korekta native | ~1 dzień/język ≈ 4–5 dni | reguła publikacji: korekta native; konkurencja nie ma żadnego języka CEE → pusta nisza powtórzona | ⬜ |
| P4.3 | Tom I (13 rozdziałów narracji) per język | ~1–2 dni/język | wstrzymać do pierwszego sygnału użycia wersji PL/EN (metryka z AUDYT_PM §4) | ⬜ |
| P4.4 | **PWA** (manifest + lekki SW; to samo zadanie co P2.4) | ~1 dzień | brama do appek; „dodaj do ekranu" bez sklepów działa od razu | ⬜ |
| P4.5 | **Google Play (TWA/Bubblewrap)** — publikacja istniejącego webu jako appka | ~1 dzień + **$25 jednorazowo** | konta osobiste po 13.11.2023: obowiązkowy closed test **12 testerów × 14 dni** → zaplanować 2 tyg. luzu proceduralnego; assetlinks na domenie → dlatego po D1 (stały URL) | ⏳ D6 |
| P4.6 | **iOS App Store (wrapper Capacitor)** | ~3–4 dni + **$99/rok** | zwolnienie opłaty dla nonprofit/akredytowanych edu/gov — sprawdzić przed płatnością; znane dziwy WebKit (M10) → bateria mobilna staje się bramką każdego release'u sklepowego | ⏳ D6 |
| P4.7 | (opc.) Capacitor Android „pełny" (WebView z całą paczką offline w środku, zero sieci) | ~2–3 dni | tylko jeśli TWA nie wystarczy (np. wymóg pełnego offline w sklepie) | ⬜ |

**Koszt appek łącznie:** ~100 zł jednorazowo (Play) + ~420 zł/rok (Apple, jeśli bez zwolnienia) — patrz audyt kosztów §7.
**Reguła architektury:** apka = wrapper na istniejący portal (jeden codebase), nie osobna aplikacja.

## T — dług techniczny i proces dev (NOWE, z `AUDYT_DEV.md` 2026-08-03)

| # | Zadanie | Nakład | Zależność | Status |
|---|---|---|---|---|
| T0.1 | **repo GitHub + git flow** (dziś: klon `bkbkbk96/paleoatlas`; rollback i kopie w historii) | ~0,2 dnia | razem z **D1** | ✅ repo istnieje; **publiczność i hosting nadal D1** |
| T0.2 | **Minimalny CI** (GitHub Actions: `node --check js/*.js` + suity na runnerze z chromium — suity startują serwer same) | ~0,5 dnia | po T0.1; **przed P4** (języki/apki = więcej permutacji regresji) | 🛠 2026-11-10: portability gotowe — suity i buildery bez zaszytych ścieżek (`PA_CHROME`/`PA_PUPPETEER`/`PA_BIODATA`), `tools/run_tests.sh` = jedna komenda; **został plik workflow** |
| T1.1 | `tools/requirements.txt` z pinami (numpy, shapely, pyshp, netCDF4, pyproj, Pillow, opencv-python) + nota w RUNBOOK | ~0,1 dnia | — | ✅ 2026-11-10 |
| T1.2 | `tools/fetch_biodata.sh`: sumy sha256 przy pobieraniu (dziś wget bez weryfikacji ~3 GB) | ~0,2 dnia | przy następnym pełnym fetch | ⬜ |
| T1.3 | Jedna współdzielona definicja „duplikatu" mapa↔globus (dziś: `isDupe` po `rola` vs globus po `duplikat_patrz` — kruchy niezmiennik) + test | ~0,1 dnia | — | ⬜ |
| T1.5 | Suita-preflight: każda suita sprawdza wolne miejsce w /tmp na starcie (lekcja „fałszywych zwisów") | ~0,1 dnia | przy najbliższej edycji suit | ⬜ |
| T1.6 | Nagłówki bezpieczeństwa po hostingu (CF `_headers`: X-Content-Type-Options, Referrer-Policy, CSP z allowlistą tileURLs) | ~0,2 dnia | po D1 | ⬜ |
| T2.1 | Registry pattern dla splice'ów danych — koniec kontraktu „kolejność 23 `<script>`" (każdy plik danych się rejestruje, składanie w app.js) | ~0,5 dnia | **przed falą warstw P3/P4** | ⬜ |
| T2.2 | Deep-linki `#mapa@21000` (epoka+widok+zoom w hashu) — wzmacnia udostępnianie z P0.2 (OG) | ~0,3 dnia | naturalnie po P0.2 | ⬜ |
| T2.3 | Offline-pack smoke w CI (rebuild → otwarcie file:// → asercja net0) | ~0,3 dnia | po T0.2 | ⬜ |
| T2.4 | Oznaczyć scratch w `/home/user/pptest` (README-nota: poza 7 suitami = diagnostyka, nie regresja) | ~0,05 dnia | — | ⬜ |

**Werdykt audytu dev:** kod 8/10, proces 3/10 — domknąć T0.1+T0.2 przy bramce v1.0, T2.1 przed P3/P4.

## NOWE (z sesji 2026-11-10 — wykryte przy pracy, nie z audytów)

| # | Zadanie | Nakład | Uwagi | Status |
|---|---|---|---|---|
| B1 | **Regresja „pyłek OFF → zmiana epoki → zoom"** (`TypeError … _animatingZoom`) | — | naprawione strażnikiem `_map` + stała asercja 10.11 | ✅ |
| B2 | **Martwa asercja rastra biomów** (1.9 liczyła „svg path", a warstwa to `<img>`) | — | teraz sprawdza `<img>` + `naturalWidth` | ✅ |
| B3 | **Hermetyczność baterii**: szum kafelków ≠ błąd, ale **404 dla własnych zasobów = błąd** | — | warunek CI bez internetu: `1.1b` / `M7.2b` | ✅ |
| B4 | **`prefers-reduced-motion` nigdy nie działał** (`!!` → boolean zamiast `MediaQueryList`) | — | naprawione; reaguje też na zmianę preferencji w trakcie sesji | ✅ |
| B5 | **Nota prywatności zasłaniała kartę fazy** na telefonie (doklejona do kontenera, nie do listy warstw) | — | nota tylko w rozwiniętej kontrolce | ✅ |
| B6 | **Buildery wymagały Pythona 3.12** (zagnieżdżone cudzysłowy w f-stringach) | 0,1 dnia | poprawione do 3.11 (`check_biomes.py`) | ✅ |
| B7 | **Kontrolki zoomu Leafleta 26 px** na telefonie (poniżej 44 px) | 0,1 dnia | podnieść razem z testem dotykowym; uwaga na kolizję z kartą fazy | ⬜ |
| B8 | **Wersja danych + data buildu** w „O danych" (P1.2) | 0,2 dnia | warunek cytowania; potrzebna decyzja: plik `js/data/BUILD` vs `git describe` | ⬜ |
| B9 | **`og:url` + canonical + `sitemap.xml`** | 0,1 dnia | po **D1** | ⏳ D1 |
| B10 | **Perf P.1** (2. przejście ≤65% czasu 1.) bywa 65–68% na software-canvas | 0,3 dnia | najpierw pomiar na sprzęcie z GPU, potem próg albo optymalizacja | ⬜ |

## AUDYT JUNIORA 2026-11-10 (raport: `AUDYT_JUNIOR.md`)

| # | Zadanie | Nakład | Status |
|---|---|---|---|
| J1 | Legenda biomów: nasłuch na całej mapie → grupy + filtr + rAF (29 → 0 przebudów/krok) | — | ✅ |
| J2 | Paleta biomów: klucz liczbowy zamiast stringów w pętli 259 200 px (15% CPU) | — | ✅ |
| J3 | Legenda: pomijanie zapisu identycznego HTML-a | — | ✅ |
| J4 | Strażnik danych: brak pliku → komunikat, nie biała strona (test 10.16) | — | ✅ |
| J5 | `esc()` escapuje cudzysłowy (atrybuty `data-*`; test 10.17) | — | ✅ |
| J6 | `cultOf()`: nieznana kultura nie przerywa rysowania mapy/karty | — | ✅ |
| J7 | Tooltip pyłków: escapowana nazwa | — | ✅ |
| J8 | Liczby w „O danych" z danych, nie z ręki (test 10.18) | — | ✅ |
| J9 | Dymek biomów: najnowsza pozycja kursora w klatce | — | ✅ |
| J10 | Usunięte martwe pole `state.zoomWarnShown` | — | ✅ |
| J11 | Favikona z marki (`assets/icon.svg` + PNG 192); offline: data-URI | — | ✅ |
| J12 | `alt=""` na rastrze biomów | — | ✅ |
| N1 | Diff markerów po ID przy kroku osi (dziś pełna przebudowa ~2–3 ms) | 0,3 dnia | ⬜ po P4 |
| N2 | Cache warstw lądolodu per (epoka, wariant BIIS) — skok 100–180 ms na telefonie | 0,5 dnia | ⬜ |
| N3 | Podział `js/app.js` (1,4 tys. linii, jedno IIFE) na moduły | 1 dzień | ⬜ przed P4 |
| N4 | Markup: szablony + `textContent` zamiast stringów `innerHTML` (~20 miejsc) | 0,5 dnia | ⬜ przy i18n |
| N5 | CSS: 12 × `!important` + powtórzone bloki w media queries | 0,2 dnia | ⬜ kosmetyka |
| N6 | Koalescencja suwaka w rAF — **nie robić** (po J1 krok 1–5 ms; psułaby testy) | — | 🚫 |

## 🔒 Zamrożone (dyscyplina non-profit — nie robimy)

Konta użytkowników · paywall warstw · reklamy · analityka behawioralna/cookies · nudge'y „engagement" ·
zapis preferencji na dysku bez pytania · SEO-farmy.
*(Apki mobilne usunięte z tej listy decyzją usera 2026-08-03 — patrz P4. Warunek trwały: apka = wrapper na portal,
jeden codebase; żadnych równoległych natywnych codebase'ów.)*

---

### Reguły utrzymania tego pliku
- Aktualizacja przy każdej sesji prac: status + data; changelog produktu zostaje w README (tam historia, tu plan).
- Żadna pozycja nie wchodzi do „w toku" bez testów do niej (standard: node --check + odpowiednia suita zielona).
- Nowa warstwa danych = zawsze para: builder w `tools/` + asercje w suicie (reguła z historii projektu).
