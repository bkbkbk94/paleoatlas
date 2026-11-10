# PaleoAtlas — audyt konkurencji i kosztów (+ wariant rozbudowy na głębsze epoki)

**Data:** 2026-08-03 · **Zakres:** krajobraz konkurencji (z researchu, z cytowaniami), koszty produktu „jak jest",
oraz koszt/praca scenariusza rozszerzenia atlasu poza 3,3 mln lat (głęboki czas geologiczny).
**Relacja:** wykonawcza lista → [`ZADANIA.md`](ZADANIA.md); strategia → [`AUDYT_PM.md`](AUDYT_PM.md); wartości → [`AUDYT_PRODUKTOWY.md`](AUDYT_PRODUKTOWY.md).

---

## 0. Werdykt w 5 zdaniach

Krajobraz jest **pusty tam, gdzie stoimy**: najbliższy globalny konkurent (Ancient Earth) to jeden człowiek, jeden
globus i brak etykiet „co to za piksel"; najbliższy edukacyjny (EarthViewer) to aplikacja tableciarska wielkiej fundacji,
bez polszczyzny i bez trybu offline; nikt nie robi interaktywnego paleo-atlasu **po polsku, w przeglądarce, z jawny-
mi poziomami wiarygodności danych**. Koszty bieżące produktu: **0 zł/mies.** (hosting statyczny gratis, domena
opcjonalnie 50–85 zł/rok) — realnym kosztem jest wyłącznie **czas pracy**. Rozbudowa na kolejne epoki jest **tańsza,
niż się wydaje**: serie PaleoDEM (0–540 mln lat) i atlas PANALESIS (545 mln lat, 45 przekrojów z klimatem) są
**otwarto licencjonowane CC-BY-4.0**, a skamieniałości daje Paleobiology Database na **CC0** — koszt licencji = **0 zł**,
koszt to ~10–18 dni agentskich zależnie od zasięgu. Droga jest jedna pułapka: **Deep Time Maps ($125 za mapę JPEG,
„tylko do oglądania")** i klasyczne mapy Scotese (licencja niestandardowa, non-commercial) — obie sprzeczne z misją
otwartości. Rekomendacja: najpierw bramka v1.0, potem mały krok PBDB, potem decyzja o pełnym fanerozoiku.

---

## 1. Mapa konkurencji

| Produkt | Zakres | Model / cena | Siła | Luka (nasza szansa) |
|---|---|---|---|---|
| **Ancient Earth** (dinosaurpictures.org, Ian Webster) | globus 0–1 mld lat; mapy 0–540 mln z PaleoDEM; wyszukiwanie adresów | darmowy web, jednoosobowy | natychmiastowy „wow", mobile web, współdzielenie linków | jeden widok (globus), brak warstw/etykiet wiarygodności, brak PL, dokładność sam przyznaje „~100 km" [1] |
| **EarthViewer** (HHMI BioInteractive) | 4,5 mld lat: kontynenty, klimat, biodywerzystość, ślady miast | **darmowa** apka iPad/Android (117 MB) | zaplecze fundacji, scenariusze lekcji, recenzje (Editors' Choice PCMag) [2][3][4] | tylko tablety (oficjalnie), wymaga sieci do pełnej funkcji, brak PL, brak web-offline, zamknięty ekosystem |
| **GPlates** (EarthByte) | pełne rekonstrukcje tektoniczne (modele Müllera, Merditha 2021) | darmowy desktop open-source | narzędzie akademickie, eksport danych | nie jest produktem konsumenckim — *to nasze potencjalne źródło danych, nie wróg* |
| **PALEOMAP / C.R. Scotese** | mapy statyczne całej fanerozoiki + animacje | klasyczne mapy: licencja niestandardowa, non-commercial free, komercja na piśmie [5]; **PaleoDEM (Scotese & Wright 2018) = CC-BY-4.0** [1][6] | autorytet, kompletność, jakość kartograficzna | statyczne JPEG/serie, brak interakcji, PL zero; PaleoDEM możemy legalnie użyć jako dane |
| **Deep Time Maps** (Colorado Plateau Geosystems, R. Blakey) | serie map 500 mln lat (7 serii tematycznych) | **$125 / mapa (JPEG, academic)**, $200/h custom, biblioteki na stałe [9][10] | najlepsza „ręczna" kartografia, benchmark jakości | cena + licencja „viewing only" = nie do złożenia w produkt; dla nas tylko benchmark wizualny |
| **GeaCron** | atlas polityczny **od 3000 p.n.e.** (historia, nie geologia) | free z reklamami / Premium **39 €/rok** [7] (listowie serwisowe podają też opcję jednorazową ~$45 [8]) | rok-co-roku osia, etykiety, 7 języków (bez PL) | inna epoka całkiem; pokazuje, że „freemium atlas" istnieje gdzie indziej w czasie — nam nic nie grozi, a można podejrzeć UX osi |
| **PANALESIS** (Vérard i wsp.) | **nie produkt** — otwarte zbiory: paleogeografie 545 mln lat (1,3 GB, CC-BY-4.0) [11]; Atlas 2026: 45 przekrojów × (ląd/morze, wiek dna, klimat temp./opady), 10×10 km, 4,3 GB, CC-BY-4.0 [12][13] | darmowe dane | pełna spójność modelu, licencja idealna | brak UI — idealny *surowiec* dla naszej rozbudowy |
| **e-podręczniki.pl / atlasy drukowane (PL)** | geografia szkolna, nie paleo-interaktywność | darmowe (gov) / papier | dotarcie do klas | **nie ma konkurenta PL w naszej niszy** — pusty segment |

**Analog danych dla „stanowisk" głębokiego czasu:** Paleobiology Database (PBDB) — miliony odkryć
skamieniałości, publiczne API, **licencja CC0** [14][15].

## 2. Wnioski dla pozycjonowania

1. **Nisza realna i pusta:** „interaktywny atlas paleo z osią czasu i etykietami DANE/SCHEMAT/MODEL, po polsku,
   w przeglądarce, offline" — nikt tego nie robi; najbliżsi rozwiązują sąsiednie problemy.
2. **Benchmark UX:** Ancient Earth (natychmiastowość, adres-search, sharowanie) — nasze braki z audytu PO
   (onboarding, OG) to dokładnie to, co on ma, a my nie.
3. **Benchmark „klasa":** EarthViewer pokazuje, że scenariusze lekcji sprzedają produkt do szkół → nasze P2.1
   (3 gotowe lekcje) trafia w sprawdzony wzorzec.
4. **Benchmark jakości:** Deep Time Maps — aspiracyjny poziom kartografii; nasza siła nie będzie pięknem map,
   tylko **uczciwością etykiet i interakcją** (czego oni nie mają).
5. **Ryzyko:** jednoosobowy Ancient Earth pokazuje też scenariusz „projekt porzucony po latach" → RUNBOOK
   + stały hosting to ubezpieczenie ciągłości (bus factor z audytu PO).

## 3. Koszty produktu „jak jest" (rocznie)

| Pozycja | Dziś | Przy wzroście ruchu | Uwagi |
|---|---|---|---|
| Hosting | **0 zł** (Cloudflare Pages: transfer statyczny **bez limitu**, 500 buildów/mies.; GitHub Pages: 1 GB witryny / 100 GB mies. miękko) [16][17] | **0 zł** (CF nie mierzy statyki; GH przy przekroczeniu prosi o migrację, nie kasuje) | produkt 100% statyczny, 12 MB — mieści się w obu |
| Domena (opcjonalna) | 0 zł (`*.pages.dev` / `*.github.io` gratis) | .pl: rejestracja ~20–60 zł, odnowienie ~59–85 zł/rok (OVH ~72,56 zł brutto); home.pl odnowienie nawet ~150–180 zł → unikać [18][19] | branding + klasztor wyszukiwarek |
| Dane źródłowe | 0 zł (wszystkie warstwy już CC-BY/CC0/domena publiczna) | 0 zł | polityka: tylko jawne licencje otwarte |
| E-mail / konta / backend | 0 zł (nie istnieją z założenia) | 0 zł | brak bazy = brak awarii bazy |
| App Store / Google Play | **w zakresie po decyzji usera 2026-08-03**: Play $25 jednorazowo + Apple $99/rok | możliwe zwolnienie Apple dla edu/nonprofit — do sprawdzenia | szczegóły i haczyki proceduralne: §7; PWA nadal pierwsze |
| **Razem pieniądze** | **0 zł/rok** (opcjonalnie ~60–85 zł/rok za domenę) | bez zmian | |
| **Razem czas** | utrzymanie: ~0,5 dnia/mies. (bateria + changelog); rozwój wg ZADANIA.md | bateria rośnie z liczbą warstw (zasada: nowa warstwa = nowa suita) | to jedyny realny koszt |

## 4. Scenariusz rozbudowy na kolejne epoki („głęboki czas")

**Stan dziś:** oś do 3,3 mln lat; dane Holocen/plejstocen z empirycznych źródeł (DATED-1, NADI-1, PATICE, ICE-6G_C…).
**Kierunek:** 66 mln → 252 mln → 541 mln lat (fanerozoik), ew. do 1 mld lat.

### 4.1 Co jest dostępne i za ile (licencje zweryfikowane)

| Zasób | Zasięg | Licencja | Cena | Nadaje się? |
|---|---|---|---|---|
| **PaleoDEM** (Scotese & Wright 2018) — paleowysokości przez PaleoMAP | 0–540 mln lat | **CC-BY-4.0** | 0 zł | ✅ tak — podstawa ląd/morze (używa go Ancient Earth) [1][6] |
| **PaleoCoastlines** (Kocsis & Scotese 2021) | fanerozoik | CC-BY | 0 zł | ✅ tak — linie brzegowe (= dokładnie nasz format warstwy) [1] |
| **PANALESIS maps + Atlas 2026** | 545 mln lat, 45 przekrojów, klima temp./opady, 10×10 km | **CC-BY-4.0** | 0 zł | ✅ tak — „biomy/pasy klimatyczne głębokiego czasu" [11][12][13] |
| **PBDB** (Paleobiology Database) | skamieniałości do prekambryi, API | **CC0** | 0 zł | ✅ tak — „stanowiska" głębokiego czasu [14][15] |
| **Merdith et al. 2021** (model płyt 1 Ga, przez GPlates) | 560 mln–1 mld lat | otwarty akademicki | 0 zł | ⚠️ tak, ale pipeline GPlates = najcięższy etap [1] |
| Klasyczne mapy Scotese (scotese.com) | pełne | licencja niestandardowa, non-commercial only [5] | umowa | ❌ nie — sprzeczne z otwartością produktu |
| **Deep Time Maps** | 500 mln lat | „viewing only", JPEG | **$125/mapa** [9][10] | ❌ nie — koszt i licencja blokują użycie w produkcie |

**Wniosek kosztowy:** pełna rozbudowa da się zbudować na **0 zł licencji** — wyłącznie czas pracy.
Jedyne odstępstwo od dotychczasowej praktyki: dane głębokiego czasu to **MODEL pełną gębą** — etykiety
epistemiczne (nasz wyróżnik) przestają być zaletą, stają się **warunkiem uczciwości**.

### 4.2 Nakłady (dni agentskie; 1 dzień ≈ 1 sesja jak dotąd)

| Etap | Obejmuje | Nakład | Pozycje w ZADANIA.md |
|---|---|---|---|
| A. Skamieniałości (bezpieczny pilotaż) | PBDB API → build → warstwa per epoka + słownik automatów; bez zmiany osi | **2–3 dni** | P3.1 |
| B. Oś głębokiego czasu | skala łamana/log, ładownia ep okresów, zgodność z animacją ▶ | **1,5 dnia** | P3.2 |
| C. Ląd/morze fanerozoiku | PaleoDEM + PaleoCoastlines: netCDF/SHP → warstwy (jak shelves/biomes), maski, koloryn, etykieta MODEL | **3–5 dni** | P3.3 |
| D. Pasy klimatyczne (opc.) | PANALESIS Atlas: temp./opady → „biomy głębokiego czasu" (MODEL) | **2 dni** | P3.4 |
| E. Moduły paczki offline | baza + „głęboki czas" na żądanie (granica ~15 MB paczki) | **1,5 dnia** | P3.5 |
| F. Testy wizualne epoki×regiony | nowa suita `tools/deeptime*` (jak landshots/biomeshots) | **1–2 dni** | P3.6 |
| **Suma (pełny fanerozoik z testami)** | | **≈ 11–19 dni** | |
| + zakres do 1 mld lat (GPlates/Merdith) | rekonstrukcje z pyGPlates, walidacja | **+3–4 dni** | (P3.7, później) |

**Koszty pieniężne rozbudowy: 0 zł.** Koszty uboczne pilnowane: rozmiar repo/paczki (cf. P3.5),
czas baterii testów (+1 suita), ryzyko jakościowe (MODEL ≠ DANE — opisać w „O danych").

### 4.3 Rekomendowana sekwencja (PM)

1. **v1.0 najpierw** (bramka z AUDYT_PM.md §5) — głęboki czas bez stałego adresu = praca do szuflady.
2. **P3.1 (PBDB)** jako pierwszy krok: duży efekt („gdzie znaleźli dinozaury/mamuty"), zero zmian struktury osi.
3. Decyzja o P3.2–P3.6 dopiero po pierwszym sygnale użycia PBDB (ankieta nauczycieli / sygnały zwrotne).
4. **Nie kupować niczego** (DTM/Scotese-clasic) i nie brać danych bez jawnego CC-BY/CC0 — trwałe reguły.

## 5. Ryzyka kosztowe

| Ryzyko | P | Wpływ | Mitygacja |
|---|---|---|---|
| „Za darmo" hosting zmienia warunki | niskie | średni | produkt = statyczne pliki; migracja CF↔GH↔Netlify w 1 dzień (RUNBOOK P0.6) |
| Rozrost paczki offline >15 MB przy głębokim czasie | średni | niski | moduły P3.5; metryka rozmiaru w changelogu przy każdym rebuild |
| Dane głębokiego czasu bez etykiet MODEL podważą zaufanie | średni | **wysoki** (nasz core!) | reguła: każda warstwa deep-time rodzi się z przypiętą etykietą MODEL + cytatem |
| Czas baterii rośnie ponad komfort sesji | niski | niski | suity równoległe tam, gdzie porty nie kolidują; priorytetyzacja przy hotfixach |

## 6. Co z tym robimy (aktualizacja planu)

- Wykaz wykonawczy: **`ZADANIA.md`** (wpisane D4 + P3.1–P3.6, wszystkie ⏳ na decyzję).
- Bez nowych decyzji usera nic tu nie blokuje P0/P1 — audyt kosztów **potwierdza**: pieniądze nie są barierą
  w żadnym wariancie; bariera jest wyłącznie kolejka pracy i 4 decyzje (D1–D4).

---

## 7. Aneks (2026-08-03): języki Europy Śr.-Wsch. i apki mobilne — po decyzji usera

**Nowy zakres produktu (decyzja usera):** docelowy zasięg językowy = Europy Środkowo-Wschodniej; docelowe kanały
dystrybucji = web + **apki Android i iOS**. Wykaz: `ZADANIA.md` sekcja P4; decyzje: D5, D6.

**Języki — konkurencyjnie:** Ancient Earth i EarthViewer są wyłącznie anglojęzyczne; GeaCron ma 7 języków
(EN/ES/FR/PT/IT/DE/ZH) i **żadnego języka CEE** [7]. Pusta nisza powtarza się więc warstwowo: nie tylko polski,
ale i **ukraiński, czeski, słowacki** nie mają interaktywnego paleo-atlasu. Koszt tłumaczeń: **0 zł** przy modelu
„szkic maszynowy + korekta native" (społeczność/nauczyciele); stała reguła publikacji = korekta native. Koszt stały:
jednorazowe **i18n plumbing ~2–3 dni agentskie** — i to dlatego **zaraz po v1.0**: dziś napisy są zakodowane w
HTML/danych, więc każdy nowy feature powstający przed i18n mnoży robotę liczbą języków.

**Apki — koszty zweryfikowane (2026):**

| Pozycja | Koszt | Haczyki / procedury |
|---|---|---|
| Google Play (konto deweloperskie) | **$25 jednorazowo** [20][21] | konto osobiste utworzone po 13.11.2023: obowiązkowy closed test — **12 testerów zapisanych przez 14 dni** zanim wypuszczą produkcję [21]; TWA/Bubblewrap = publikujemy istniejący web bez nowego kodu, wymaga stałego URL (D1) |
| Apple Developer Program | **$99/rok**, auto-odnawialne [22] | konto osobiste: nazwisko jako „sprzedawca"; **zwolnienie z opłaty dla nonprofit / akredytowanych instytucji edukacyjnych / jednostek rządowych** — sprawdzić kwalifikowalność przed płatnością [23]; review App Store 1–7 dni na wydanie |
| Narzędzia (Capacitor, Bubblewrap, PWABuilder) | 0 zł (open source) | apka = wrapper na portal → **jeden codebase**, pełny offline w WebView |

**Kolejność PM (kanały):** PWA (brama do wszystkiego, 0 zł) → **Play TWA** (tanio; 2 tyg. proceduralnej rezerwy na
12-tester rule) → **iOS Capacitor** (ostatnie: koszt roczny + review + znane dziwy WebKit z M10 — bateria mobilna
staje się formalną bramką release'u). **Całkowicie: ~100 zł jednorazowo + ~420 zł/rok** (Apple, jeśli bez zwolnienia).
Fiskalnie optymalnie: najpierw Play, Apple dopiero gdy sygnały użycia uzasadnią abonament.

---

### Źródła
[1] [Ancient Earth globe — opis danych i dokładności](https://dinosaurpictures.org/ancient-earth) ·
[2] [HHMI: premiera EarthViewer (iPad, darmowa)](https://www.hhmi.org/news/hhmi-debuts-earthviewer-app-ipad) ·
[3] [PCMag: recenzja EarthViewer (Free, Editors' Choice)](https://www.pcmag.com/reviews/earthviewer-for-ipad) ·
[4] [EarthViewer APK — tylko tablety, 117 MB](https://m.apkpure.com/biointeractive-earthviewer/org.hhmi.earthviewer) ·
[5] [Licencja Ancient Earth / PALEOMAP (non-commercial, komercja na piśmie)](https://www.ancient-earth.com/guide/license.html) ·
[6] [Zenodo: materiały „The Cretaceous World" PALEOMAP, CC-BY-4.0](https://zenodo.org/records/10659112) ·
[7] [GeaCron: Free vs Premium 39 €/rok](http://sus.geacron.com/map/atlas/php/table_vsNEW.html) ·
[8] [AlternativeTo: GeaCron freemium/~$45](https://alternativeto.net/software/geacron/about/) ·
[9] [Deep Time Maps — cennik akademicki $125/mapa](https://deeptimemaps.com/academic-purchase/) ·
[10] [Deep Time Maps — zakup biblioteczny, 7 serii](https://deeptimemaps.com/library-purchase/) ·
[11] [Zenodo: Global paleogeographic maps PANALESIS, CC-BY-4.0](https://zenodo.org/records/15396265) ·
[12] [Zenodo: PANALESIS Phanerozoic Atlas v1.0, 4,3 GB, CC-BY-4.0](https://zenodo.org/records/19134591) ·
[13] [EarthArXiv: opis Atlasu PANALESIS (45 przekrojów, 10×10 km, klimat)](https://eartharxiv.org/repository/view/13640/) ·
[14] [Palaeoverse: PBDB Data Service — licencja CC0](https://workshop.palaeoverse.org/2025-CPEG-workshop/03_acquisition/) ·
[15] [Ten simple rules — PBDB CC0 i modele rekonstrukcji](https://tenrules.palaeoverse.org/) ·
[16] [Free website hosting 2026 — CF Pages unlimited / GH Pages 1 GB·100 GB](https://klymentiev.com/blog/free-website-hosting) ·
[17] [Static site hosting 2026 — limity GH/CF/Netlify](https://granite.so/hosting/static-sites) ·
[18] [Cennik domen .pl 2026 (OVH/home/nazwa)](https://eunoiacreativ.pl/blog/ile-kosztuje-hosting-domena-polska-2026) ·
[19] [Odnowienia domen 2026 (OVH 72,56 zł brutto .pl itd.)](https://businesshost.pl/blog/odnowienie-domeny-po-terminie) ·
[20] [Google Play — $25 jednorazowo, co obejmuje](https://www.iconikai.com/blog/google-play-developer-account-fee-2026) ·
[21] [Google Play — weryfikacja i reguła 12 testerów/14 dni dla kont osobistych](https://testerbee.com/blog/google-play-console-registration-fee-and-verification-time) ·
[22] [Apple Developer Program — $99/rok, indywidualne vs organizacja](https://ambsandigital.com/apple-developer-program-fee-2026/) ·
[23] [Apple Developer Program — zwolnienie z opłaty dla nonprofit/edu/gov + Google Play $25 dla porównania](https://spreadcast.app/resources/apple-developer-program)
