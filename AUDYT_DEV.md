# PaleoAtlas — audyt developerski (ekspercki)

**Data:** 2026-08-03 · **Zakres:** backend, warstwa danych, narzędzia/pipeline, frontend, testy, bezpieczeństwo, proces.
**Metoda:** pełne czytanie `js/app.js` (1278 l.), `js/globe.js` (641 l.), `index.html` (172 l.), inspekcja `tools/*`
(17 builderów + suity), grep-i liczbowe, stan `/home/user/pptest`. Każda teza ma dowód z pliku/pomiaru.
**Relacja:** audyty produktowe → `AUDYT_PRODUKTOWY.md` (wartość) i `AUDYT_PM.md` (kolejka/witryny). Ten dokument
ocenia **warsztat inżynierski**. Wykaz wykonawczy: `ZADANIA.md` (tam wpisane są pozycje T*).

---

## 0. Werdykt w 5 zdaniach

Architektura **zero-backend** to świadoma, poprawna decyzja: portal działa z `file://`, kosztuje 0 zł, a powierzchnia
awarii jest prawie zerowa — „backendem" jest tu w istocie **pipeline danych offline** w `tools/`, i on jest najmocniejszą
stroną warsztatu (każda warstwa ma buildera + autorytatywne źródło). Frontend jest **powyżej przeciętnej**: dokumentuje
*dlaczego*, nie tylko *co* (komentarze o bugach WebKita, limity SVG, chronologia), rAF/throttling, renderery canvas dla
ciężkich poligonów, globus z LRU-cache pikselowym i fowizowanym podglądem. Słabe ogniwo to **proces**: brak kontroli
wersji (nie ma `.git` — repozytorium istnieje tylko jako katalog na jednym hoście!), brak CI (bateria 364 asercji
odpala się ręcznie), brak lockfile/requirements dla narzędzi Pythona oraz sprzężenie ładowania danych kolejnością
`<script>` (wzorzec splice). Wynik: **kod 8/10, proces 3/10** — i to proces trzeba domknąć przed P4 (języki/apki),
bo wielojęzyczność i wydania sklepowe bez CI i wersjonowania to proszenie się o regresję na produkcji.

Oceny (1–5): Strategia backendu (brak = feature) **4,8** · Warstwa danych **4,2** · Narzędzia/pipeline **4,0** ·
Frontend **4,3** · Testy **4,4** · Bezpieczeństwo **4,6** · **Proces/wersjonowanie/CI 1,5**.

---

## 1. Architektura systemu (jak jest — i dlaczego tak)

```
┌─ tools/ (Python: builder CSV/SHP/netCDF → js/data/*.js)   ← „backend" = pipeline offline
│     build_data.py · build_ice_*.py ×10 · build_biomes.py · build_paleocoast.py · build_offline_pack.py …
│     fetch_biodata.sh (pobranie surowców) · check_biomes.py (walidacja → biome_report.json)
▼
index.html → 23 <script> w sztywnej kolejności: dane (window.SITES/META/PALEO/ICE_*/…9,9 MB)
             → vendor (Leaflet 1.9.4, d3 v7) → globe.js → app.js (IIFE, window.__PA)
             NIE MA build-step / modułów / bundlera — celowo: niezmiennik „działa z dwukliku (file://)"
```

**Niezmiennik projektowy (zapisać w RUNBOOK):** żadnych `type=module`, bundlera ani fetch() danych — file:// ich nie
przepuszcza (CORS). Jeśli kiedyś wejdą moduły ES, offline-pack i file:// wymagają przeprojektowania.

## 2. „Backend" — strategia: brak

- **Dowód braku:** w `<head>`/JS zero własnych endpointów; jedyne zewnętrzne żądania = publiczne kafelki
  Esri/OSM/OTM (`app.js` definicje `tiles.*`) i to dopiero po wyjściu z trybu paleo.
- **Ocena:** dla produktu-biblioteki non-profit to właściwy wybór (koszt 0, prywatność, awaryjność ≈ 0).
- **Pułapka strategiczna:** funkcję backendu pełni pipeline w `tools/` — i on *faktycznie* jest kodem produkcyjnym,
  choć nie działa na serwerze. Wnioski w §3/§4: on potrzebuje wersjonowania i CI bardziej niż frontend.

## 3. Warstwa danych (de facto „baza danych" produktu)

**Format:** `js/data/*.js` = pojedyncze (zminifikowane linowo) przypisania na `window.*`; 9,9 MB łącznie
(`shelves.js` 3,2 MB, `ice_glacmont.js` 1,2 MB, `ice_quat.js` 1,1 MB, `world_land.js` 1,2 MB, `sites.js` 0,6 MB),
+ 56 rastrów PNG biomów. Parser JS na telefonie to główny koszt startu (~1 s) — zaakceptowany i zmierzony.

**Mocne:** rozdział generowane (`build_*.py`) vs ręcznie kuratowane (`paleo.js`) opisany w README; źródła i licencje
wpisane w nagłówkach plików; rozbieżności danych (Beyer vs pyłek) udokumentowane na stronie produktu.

**Luki (z dowodami):**
1. **Sprzężenie kolejnością `<script>` + wzorzec splice.** Pliki `ice_*.js` nie są samowystarczalne — *mutują*
   `PALEO.ice_sets` zdefiniowane wcześniej w `paleo.js`; poprawność zależy od kolejności 23 tagów w `index.html`
   (komentarze przy tagach dosłownie ją dokumentują: „podmienia poligony…"). Skutek: przestawienie wiersza cicho
   psuje warstwę bez błędu ładowania. **T2.1** — registry pattern (każdy plik danych rejestruje się,
   `app.js` składa zasoby; kolejność przestaje być kontraktem). Priorytet rośnie przy P3/P4 (więcej warstw).
2. **Brak znacznika wersji danych** w artefaktach (build-data/wersja źródeł nie wpisuje się do plików).
   Produktowo pokrywa P1.2 („wersja danych + data w O danych") — technicznie najtaniej: builder dopisuje
   `window.DATA_BUILD = {date, git?}`; czytane przez stronę. Scalenie z P1.2.
3. **Dwie definicje „duplikatu".** Mapa: `isDupe = s.rola includes 'DUPLIKAT'` (app.js), globus:
   `!s.duplikat_patrz` (globe.js `sitesVisible`). Dziś pokrywają się (3 rekordy mają oba pola), ale to
   **kruchy niezmiennik** — nowy duplikat z samym `duplikat_patrz` narysuje się na mapie. **T1.3** (jedna funkcja
   współdzielona) + test.
4. Pojemność cache'ów: `ICE_POLY_CACHE` (app.js) nieograniczona ale klucze ~54 przekroje × 3 warianty BIIS —
   ograniczone z natury ✓; `BIOME.cache` 56 × 0,26 MB Uint8Array — ograniczone z natury ✓. OK, tylko odnotować.

## 4. Narzędzia i pipeline (`tools/`)

**Stan:** 17 skryptów buildera (CSV/SHP/netCDF → JS), `close_generated_rings.js` (normalizacja OGC),
`build_offline_pack.py` (82 l. — z asercjami liczności podmian ✓), `fetch_biodata.sh`, `check_biomes.py`
(walidacja z raportem `biome_report.json`: regions/agreements/asserts/summary ✓).

**Luki:**
1. **Brak `requirements.txt`/lockfile.** Importy: `numpy, shapely, pyshp, netCDF4, pyproj, PIL, cv2` (+ stdlib).
   Odtworzenie środowiska = „zainstaluj, aż zadziała". **T1.1** (pin + nota „pip install -r tools/requirements.txt" w RUNBOOK).
2. **`fetch_biodata.sh` bez sum kontrolnych** — wget pobiera ~3 GB z figshare po stałych ID plików, zero
   weryfikacji sha256 (pobrany częściowo/uszkodzony plik przejdzie cicho do builda). **T1.2** (dopisać sumy po
   następnym pełnym pobraniu).
3. **Polityka mirror testów:** suity kanoniczne mają mirrory w `tools/` ✓, ale w `/home/user/pptest` leży
   dziesiątka skryptów typu `dbg.js`, `calib2.js`, `repro_mobile.js`, `verify_faza1.js` — scratch, który
   wygląda jak testy. **T2.4** nazwać to: `pptest/scratch/` albo dopisać w README „pptest poza 7 suitami =
   scratch diagnostyczny, nie zabezpiecza regresji". (Zero działania = też OK, byle zapisane.)
4. Brak sanity-checków przy pozostałych builderach (walidator istnieje tylko dla biomów); suity e2e łapią ich
   błędy po fakcie — działa, ale błąd buildera widać dopiero w teście mapy. P2: 3-linijkowe asercje „plik wyszedł
   i ma oczekiwaną strukturę" w samych builderach.

## 5. Frontend

**Warsztatowo mocne (dowody):**
- Panes z mapą zIndex'ów (landPane 330 … sitesPane 610) + wydzielone renderery canvas dla ciężkich poligonów —
  z komentarzem-dowodem (Q19: 4000+ pierścieni, „iOS Safari po cichu przestaje malować SVG" → canvas).
- Throttling gwintowany z UX: suwak max 1 render/klatkę rAF + flush na `change` (app.js); globus: LRU pikselowe
  BASE_PIX(7)/ICE_PIX(10), fowizacja przy dragu (DP ~0,25° dla lądów / ~0,35° dla lodu + krok 4 px zamiast 2 px)
  i pełna klatka końcowa — **zero zmiany jakości, sama kadencja**.
- Eskapowanie HTML: 49× `esc()` w app.js konsekwentnie przy każdym innerHTML z danymi (tooltipy, karty,
  słownik) — XSS z własnych danych praktycznie wykluczone (dane są lokalne → ryzyko i tak niskie, ale dyscyplina
  chroni przed przyszłym „ładowaniem z sieci").
- Modern pointer events (drag + pinch) na globusie; `worldCopyJump: true`; obsługa taintu canvas (file://)
  try/catch z jednorazowym `console.warn` zamiast crashem.
- `window.__PA` jako stabilny kontrakt testowy (suites go używają) + test-hooks globusa (`_dbg`, `_classProbe`,
  `_biprojCheck` — walidacja inline-projekcji vs d3 w środowisku testowym: rzadka, dobra praktyka).

**Zapachy / dług:**
1. **Obiekt `BIOME` jest „torem na stan renderu"** — prócz biomów trzyma `landKey`, `iceEnv`, `iceBv`,
   `pollenCurKey`, `preT`… Działa, ale kolejny refaktoring = rozbudzić dwa obiekty (RASTER-BIOME vs RENDERSTATE).
2. **Deep-linki:** routing hash obsługuje tylko widoki i rozdziały (`#tom1-3`); brak linku „epoka+mapa"
   (`#mapa@21000`) — to też funkcja produktowa (udostępnianie widoku LGM), patrz **T2.2** — i naturalny partner OG z P0.2.
3. `#srch-q:focus { outline: none; }` (styles.css:172) usuwa focus — już w P0.5; natomiast **`.gtgl:focus-visible`
   istnieje** (styles.css:424) — jest wzór do uogólnienia. P0.5 doprecyzować: ująć ogólne `:focus-visible`
   na wszystkie kontrolki + media `prefers-reduced-motion` (0 wystąpień dziś).
4. `renderTimeLayers()` przebudowuje wszystkie markery przy każdej zmianie (clearLayers + create×N) — przy
   obecnej liczbie punktów OK (pomiar: scrub 58% Σ kosztu po cache), ale przy P3 („skamieniałości" = tysiące
   punktów) poprosi o spatial index / clustering. Zapisać jako znany próg, nie jako zadanie dziś.
5. Wyszukiwarka: pełny rerender na każdy `input` — bez debounce; przy ~2 tys. rekordów OK.
6. Minifikacja: brak — i słusznie (czytelność + file://); ewentualny krok przy bramce v1.0: tylko data-files
   mogłyby iść przez kompresję `gzip/br` po stronie hostingu (GH Pages: brak kontroli nagłówków; CF Pages: tak).

## 6. Testy

**Stan:** 6 suit, **364 asercje**, Chromium headless przez puppeteer-core, własne porty per suita (8333/8335/…),
mirrory w `tools/`. Pokrycie (przykłady): E2E UI-84, mobile-32 (w tym M10 fixu canvas-iOS), globus-21 (inline-model
matematyczny), ice-178 (science-walidacje warstw z cytatami!), biomy-45 (klasy frakcyjne × regiony), landshots,
perfcheck (pamięt/latencja scrub). **To poziom „mały projekt badawczy z CI ducha"** — bardzo dobry.

**Luki:**
1. **Brak CI** — suita nie biegnie sama przy zmianie; dyscyplina zależy od operatora. Po T0.1 (git/GitHub)
   minimalny workflow: `node --check` + job z `chromium` na runnerze (suity są self-contained: startują serwer
   same). **T0.2.** GitHub-hosted runner ma Chrome → wykonalne bez zmian suit.
2. **Brak testów builderów** (poza check_biomes) — patrz §4.4.
3. **Brak testu a11y** (statyczny grep smoke: każda kontrolka ma title/aria — po P1.5 dodać asercję).
4. **Lekcja /tmp** (pełny tmpfs = fałszywe zwisy) zapisana w README, ale nie zautomatyzowana — suity powinny
   sprawdzać wolne miejsce w /tmp na starcie (2 linie kodu w każdej suicie). **T1.5?** — drobne, tanie.

## 7. Bezpieczeństwo

- **Zero sekretów** w repo (grep po token/key/secret/password — jedyny traf to słowo „token" w nazwie testu) ✓
- **Vendored deps:** Leaflet 1.9.4, d3 v7 — brak CDN → brak SRI-potrzeby; obowiązek: przegląd CVE 2×/rok (notować w changelogu).
- **CSP/nagłówki:** brak (nie da się z podstawowego serwera plików; GH Pages nie pozwala na custom nagłówki,
  CF Pages pozwala przez `_headers`). Po D1: dodać minimalny zestaw nagłówków (`X-Content-Type-Options`,
  `Referrer-Policy: no-referrer`, CSP `default-src 'self' data: blob:; img-src 'self' data: https:` itp. — złożone
  z tileURLs). **T1.6** razem z hostingiem.
- Powierzchnia ataku minimalna: zero kont, zero formularzy POST, zero localStorage.

## 8. Rejestr długu technicznego (uporządkowany)

| # | Temat | Dowód | Nakład | Bramka/waga |
|---|---|---|---|---|
| T0.1 | **git init + GitHub repo** | `fatal: not a git repository` | 0,2 dnia | razem z **D1** (hosting CF/GH potrzebuje repo) — najwyższy priorytet procesowy |
| T0.2 | **Minimalny CI** (Actions: node --check + suity na runnerze) | §6.1 | ~0,5 dnia | po T0.1; przed P4 (apki/języki = więcej regresji do złapania) |
| T1.1 | `tools/requirements.txt` (pin wersji) | §4.1 | 0,1 dnia | T0.2 |
| T1.2 | sha256 w `fetch_biodata.sh` | §4.2 | 0,2 dnia | po następnym pełnym fetch |
| T1.3 | Jedna definicja duplikatu (mapa↔globus) + test | §3.3 | 0,1 dnia | dowolnie; tania |
| T1.5 | suity: preflight wolnego /tmp | §6.4 | 0,1 dnia | przy najbliższej edycji suit |
| T1.6 | nagłówki bezpieczeństwa po hostingu | §7 | 0,2 dnia | po D1 (CF `_headers`) |
| T2.1 | registry pattern dla danych (koniec splice-order) | §3.1 | 0,5 dnia | **przed** falą warstw P3/P4 |
| T2.2 | deep-linki `#mapa@21000` (epoka+widok+zoom) | §5.2 | 0,3 dnia | synergia z OG (P0.2) — dobra okazja |
| T2.3 | offline-pack smoke w CI (build → file:// → net0) | §6.1 | 0,3 dnia | po T0.2 |
| T2.4 | nazwanie scratch w pptest (README/nota) | §4.3 | 0,05 dnia | dowolnie |

## 9. Rekomendacja kolejności (PM-view na dług)

1. **T0.1 + T0.2 = część bramki v1.0** (razem z D1-hostingiem; osobno nie mają sensu).
2. T1.1/T1.2/T1.6 — przy okazji hostingu i najbliższego fetch.
3. **T2.1 przed P3/P4** — to warunek bezpiecznego dokładania warstw danych i języków.
4. T2.2 — dorzucić do P1 (to też funkcja udostępniania, wzmacnia P0.2).
5. Reszta — taktycznie, przy najbliższych dotknięciach tych plików.

---

*Audyt powstał wyłącznie z lektury kodu i pomiarów `grep`/`wc`/`du` na kopii roboczej 2026-08-03
(portal w tym czasie działał na :8000; bateria ostatnio zielona: 364/364). Żadna liczba w tekście nie jest szacowana —
jest policzona z plików.*
