# PaleoAtlas — RUNBOOK (1 strona: podnieś · sprawdź · przebuduj · wydaj)

Dokument dla drugiej osoby (bus factor). Wszystko poniżej działa lokalnie, bez kont i bez backendu.

## 0. Co to jest

Statyczny portal (HTML + CSS + JS, dane jako pliki `js/data/*.js`). **Nie ma serwera aplikacyjnego
ani bazy** — „backendem" jest pipeline w `tools/` (CSV/shapefile/netCDF → `js/data/*.js`).
Mapa używa Leafleta (lokalnie w `vendor/`), globus — d3 (lokalnie).

```
index.html · css/styles.css · js/app.js · js/globe.js
js/data/*.js          ← dane (generowane; NIE edytuj ręcznie poza paleo.js)
assets/               ← ikony + obraz OG (generowane: tools/build_brand_assets.js)
tools/                ← buildery danych (.py) + suity testowe (.js)
vendor/               ← Leaflet 1.9.4, d3.min.js (lokalnie, zero CDN)
```

## 1. Podniesienie lokalne

```bash
cd paleoatlas
python3 -m http.server 8000        # → http://localhost:8000
```
Alternatywnie otwórz `index.html` dwuklikiem (działa bez serwera) **albo** paczkę jednoplikową
`PaleoAtlas_OFFLINE.html` (patrz §4). Kafelki podkładów wymagają internetu — reszta nie.

## 2. Wymagania

| Cel | Potrzebne |
|---|---|
| samo uruchomienie portalu | przeglądarka |
| testy (6 suit) | `node` ≥ 18, Chromium/Chrome, `puppeteer-core` |
| przebudowa danych | Python 3.11 + `tools/requirements.txt` |
| paczka offline / ikony / OG | Python 3 (build), Chromium + node (ikony/OG) |

Jednorazowa instalacja narzędzi testowych:

```bash
mkdir -p /tmp/pptr && (cd /tmp/pptr && npm i puppeteer-core)
export PA_PUPPETEER=/tmp/pptr/node_modules/puppeteer-core
export PA_CHROME=$(command -v chromium || command -v google-chrome)   # ścieżka do przeglądarki
```

## 3. Testy — bramka jakości (obowiązkowa przed każdym wydaniem)

```bash
bash tools/run_tests.sh
```

Skrypt odpala po kolei: `e2e.suite.js` (desktop, ~99 asercji), `e2e.mobile.suite.js` (37), `ice.science.suite.js`
(178 — walidacja lądolodu), `globe.suite.js` (21), `biomeshots.js` (45) i doradczo `perfcheck.js`.
Każda suita sama podnosi serwer na własnym porcie (83xx/84xx) i robi zrzuty do `/tmp/shots*`.

- **Zielone = zero `❌`.** Wynik zbiorczy: `PODSUMOWANIE: n/n`, `MOBILNE: n/n` itd.
- Suity są **hermetyczne**: brak internetu nie czerwieni baterii (kafelki Esri/OSM/OTM to szum),
  ale każda odpowiedź ≥400 dla **własnych** zasobów jest błędem (asercje `1.1b` / `M7.2b`).
- Logi z `run_tests.sh`: `/tmp/pa-tests/<suita>.log`.
- Zmienne: `PA_CHROME`, `PA_PUPPETEER`, `PA_STRICT_PERF=1` (perf jako bramka), `PA_LOGDIR`.

Pojedyncza suita: `node tools/e2e.suite.js`.

## 4. Paczka offline (jeden plik)

```bash
python3 tools/build_offline_pack.py     # → ../PaleoAtlas_OFFLINE.html (~10,6 MB)
```
Inline'uje CSS, Leafleta, d3, **23 skrypty danych**, `app.js`, `globe.js`, 56 rastrów biomów
oraz ikonę apple-touch (data-URI); usuwa link do manifestu (nie ma dokąd prowadzić z `file://`).
Smoke-test po przebudowie: otwórz plik z dysku → mapa, oś czasu, globus, biomy; w DevTools
**0 żądań sieciowych**. Plik jest artefaktem wydania — nie commitujemy go do repo.

## 5. Przebudowa danych (gdy zmienią się źródła)

1. `python3 -m pip install -r tools/requirements.txt`
2. Włóż źródła: `uploads/` (CSV portalu) i — dla biomów — `biodata/` (`tools/fetch_biodata.sh`).
3. Uruchom właściwy builder (lista i kolejność w README §Struktura), np.
   `python3 tools/build_data.py` → `python3 tools/build_env.py` → `python3 tools/build_biomes.py`
   (pełna lista builderów i ich kolejność: README §Struktura).
4. **Weryfikacja przebudowy:** zmiany powinny być puste lub zamierzone —
   `git diff --stat js/data/`; liczności wypisuje każdy builder.
5. Zawsze po zmianie danych: pełna bateria (§3) + przebudowa paczki offline (§4) + wpis w changelogu.

## 6. Ikony i obraz OG (brand assets)

```bash
node tools/build_brand_assets.js
```
Renderuje `assets/icon-{512,192,180}.png` z `assets/icon.svg` i **obraz OG 1200×630 jako zrzut
z atlasu** (LGM nad Skandynawią + typografia). Oba artefakty są w repo (potrzebne do OG/manifestu).

## 7. Wydanie (bramka v1.0 — checklist)

- [ ] `for f in js/*.js js/data/*.js; do node --check "$f"; done` — składnia
- [ ] `bash tools/run_tests.sh` — bateria zielona
- [ ] `python3 tools/build_offline_pack.py` — paczka + smoke-test (0 żądań)
- [ ] HEAD: meta description, OG 1200×630, `manifest.webmanifest`, ikony (sprawdza test `10.1–10.6`)
- [ ] `LICENSE` + wiersz licencji w „O danych" (decyzja D2) · nota prywatności podkładów (jest)
- [ ] wpis w changelogu (README, góra) + tag `v1.0`

## 8. Deploy (statyczny hosting)

Portal to pliki — wystarczy wrzucić katalog repo (bez `uploads/`, `biodata/`, bez paczki offline):

- **Cloudflare Pages / GitHub Pages / Netlify**: brak kroku builda, publish directory = katalog repo.
- Po podłączeniu domeny uzupełnij `og:url` i `canonical` w `index.html` (dziś celowo ich nie ma).
- Nagłówki (CF `_headers`): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  cache `max-age` dla `assets/` i `vendor/`, `no-cache` dla `index.html`.
- Nie włączaj telemetrii/cookies — to sprzeczne z misją (patrz AUDYT_PM §4).

## 9. Typowe problemy

| Objaw | Przyczyna / rozwiązanie |
|---|---|
| `Cannot find module 'puppeteer-core'` | ustaw `PA_PUPPETEER` (§2) |
| `Failed to launch the browser process` | podaj `PA_CHROME`; w kontenerze potrzebne `--no-sandbox` (już jest w suitach) |
| Wszystkie kafelki `net::ERR_CONNECTION_CLOSED` | brak internetu — nie wpływa na wynik suit (szum), ale mapa podkładowa będzie pusta |
| Puste pola w ikonie/OG („□" zamiast emoji) | brak fontu emoji w systemie — dlatego ikony i OG są **rysowane** (SVG/HTML), nie z emoji |
| Port zajęty | suity mają różne porty 83xx/84xx; zamknij stary `python3 -m http.server` |
| Zmiana w `js/data/*.js` zniknęła | pliki generowane — uruchom builder (§5), nie edytuj ręcznie |

## 10. Gdzie co leży (mapa dokumentów)

| Plik | Rola |
|---|---|
| `README.md` | opis produktu, struktura, rygor danych, changelog (historia) |
| `ZADANIA.md` | wykaz wykonawczy: P0/P1/P2/P3/P4/T, decyzje D1–D6 |
| `AUDYT_PM.md` | strategia, persony, bramka v1.0, RICE, ryzyka |
| `AUDYT_PRODUKTOWY.md` | ocena wartości (9 wymiarów) |
| `AUDYT_DEV.md` | dług techniczny, proces, CI |
| `AUDYT_JUNIOR.md` | wydajność i odporność: zmierzone wąskie gardła, co naprawione, co świadomie odłożone (N1–N6) |
| `AUDYT_KONKURENCJA_KOSZTY.md` | rynek, licencje, koszty |
| `RAPORT_ZESPOLU_2026-11-10.md` | przegląd zespołu ekspertów + sprint P0 (stan po nim) |
