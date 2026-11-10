# Kontrakt danych PaleoAtlas

Ten plik opisuje **zasady, na których opiera się cała mapa**, i pokazuje, jak je sprawdzić
jednym poleceniem. Powstał z audytu seniora (2026-11-10), bo okazało się, że największe
ryzyko projektu nie leży w kodzie, lecz w danych: 19 skryptów składa się w jedną całość
w określonej kolejności, a błąd w tej układance **nie daje żadnego komunikatu** — mapa po
prostu pokazuje mniej, niż powinna.

```bash
node tools/validate_data.js           # kontrakt: błędy → kod wyjścia 1
node tools/validate_data.js --strict  # dodatkowo ostrzeżenia traktuje jak błędy
node tools/validate_data.js --json    # wynik maszynowy (CI)
```

Walidator uruchamia się **jako pierwszy krok** `tools/run_tests.sh` i w CI
(`.github/workflows/ci.yml`). Nie potrzebuje przeglądarki ani internetu.

---

## 1. Kolejność ładowania — najważniejsza zasada

Pliki z `js/data/` muszą być w `index.html` **dokładnie w tej kolejności**, w jakiej są tam
wpisane. Późniejsze skrypty robią „splice" na wcześniejszych (np. `ice_ice6g.js` dokłada
poligony do zestawów zdefiniowanych wcześniej).

Każdy taki skrypt zaczyna się od strażnika w rodzaju:

```js
if (!window.PALEO || !window.PALEO.ice_sets[k]) return;   // ← cichy powrót
```

Jeśli kolejność jest zła, skrypt **nie robi nic i nie zgłasza błędu**. Dlatego:

- walidator ładuje dane **w kolejności z `index.html`** (nie alfabetycznie),
- walidator sprawdza, czy splice faktycznie się wykonał (liczba poligonów LGM ≥ 100,
  ≥ 50 % poligonów ma `src`),
- aplikacja porównuje na starcie liczby obiektów ze stemplem wydania i pokazuje pasek
  „Dane atlasu są niekompletne", jeśli coś nie doszło (`test 10.28`).

**Dodajesz nowy plik danych?** 1) wstaw `<script src="js/data/…">` w `index.html`
w odpowiednim miejscu, 2) `python3 tools/stamp_build.py`, 3) `node tools/validate_data.js`,
4) `bash tools/run_tests.sh`.

## 2. Trzy konwencje współrzędnych (i dlaczego to pułapka)

| Warstwa | Kolejność | Zakres długości | Struktura |
|---|---|---|---|
| `SITES.rdzen`, `SITES.sasiedzi` | `[lat, lon]` | −180…180 | `{lat, lon}` |
| `PALEO.ice_sets[*]` | `[lat, lon]` | −360…360 (dozwolone „rozwinięte") | `pts` **albo** `rings: [[…]]` |
| `SHELVES[poziom]` | `[lat, lon]` | −360…360 | `[ poligon, … ]`, poligon = `[ pierścień, … ]` |
| `WORLD_LAND` | **`[lon, lat]`** (GeoJSON) | −180…180 | FeatureCollection |
| `BIOME_POLLEN` | `[lat, lon, klasa]` | −180…180 | tablice punktów |

Uwaga na dwa miejsca, które łatwo pomylić:

- **`WORLD_LAND` to jedyna warstwa w kolejności `[lon, lat]`** — bo to standard GeoJSON.
- **Szelfy mają o jeden poziom zagnieżdżenia więcej** niż lód: `SHELVES[-125][0][0][0]` to
  pierwsza współrzędna pierwszego pierścienia pierwszego poligonu.
- Długości poza ±180° (np. −182°, 266°) są **celowe** — tak zapisuje się poligony
  przecinające południk 180°, żeby nie rozjeżdżały się na dwa końce mapy. Leaflet
  normalizuje je przy rysowaniu.

Walidator sprawdza te zakresy i zgłasza odstępstwa.

## 3. Proweniencja: skąd wiemy, że kształt jest prawdziwy

Każdy poligon lodu może mieć pole `src`. Zamknięta lista (`src` spoza niej = błąd):

`DATED-1`, `NADI-1`, `PATICE`, `PATICE-LAKE`, `ICE6G`, `RGI-7`, `BRITICE-CHRONO`,
`GLACIMONTIS`, `Q19`, `DANE_PORTALU`, `POMIAR`.

- **`src` obecny** → tooltip podaje pełne źródło i licencję.
- **`src: 'POMIAR'`** → obrys jest schematyczny, ale **powierzchnia pochodzi z publikacji**
  (cytacja w nazwie obiektu). Wprowadzone w audycie seniora: wcześniej te 6 obiektów
  (Kilimandżaro, Kenia, Ruwenzori, Puncak Jaya, Southern Alps, Ruapehu) nie miało `src`,
  więc UI podpisywał je „rekonstrukcją uproszczoną" — czyli **pomiar udawał szkic**.
- **brak `src`** → ręczny szkic autora („rekonstrukcja uproszczona"); 185 poligonów.
  To stan dozwolony, ale każdy nowy taki obiekt musi to mówić wprost.
- Pomiar nie może istnieć bez `src` — pilnuje tego walidator i `test 10.26`.
- Samo „km²" w nazwie **nie** jest obietnicą pomiaru: szkice cytują powierzchnie
  z literatury („czapolód ~400 km² (SCHEMAT: krąg…)") i to jest poprawne.

## 4. Oś czasu

- `ENV.ticks[].bp` to **lata przed dziś** (BP), rosnące w głąb czasu; `0` oznacza „dziś".
- Kolejność `ticks` **nie jest monotoniczna** w 4 miejscach (np. MIS 24 940 ka → MIS 23
  920 ka), bo plik grupuje przekroje wg źródła, a nie wg wieku. Dziś to nieszkodliwe —
  `envTickForBP` skanuje liniowo. **Nie wolno** „optymalizować" tego do wyszukiwania
  binarnego bez posortowania danych; walidator o tym przypomina.
- `META.fazy` muszą być ciągłe (bez luk i nakładek) i kończyć się na „dziś" (0).
- `META.milestones[].bp` muszą mieścić się w zakresie osi (3,3 mln – 0).

## 5. Identyfikatory i odwołania

- Stanowiska: `SITES.*[].id` unikalne; `kultura` ∈ `META.kultury[].id`; `powiazane`
  i `duplikat_patrz` wskazują istniejące ID.
- Słownik: każde hasło ma **stabilny `id`** (np. `kultura_ahrensburska`), niezależny od
  pisowni nazwy. `zobacz_tez` zawiera **identyfikatory**, nie nazwy. UI rozwiązuje je po
  `id` (test 10.25) — wcześniej szukał po nazwie, przez co 58 odnośników prowadziło
  donikąd i pokazywało surowe slugi.

## 6. Stempel wydania (`js/data/build_info.js`)

```bash
python3 tools/stamp_build.py   # po każdej zmianie w js/data/
```

Zapisuje: `dataVersion` (skrót SHA-256 treści `js/data/*.js`), `dataHash`, `dataFiles`,
`generatedAt`, `counts` (liczby obiektów) oraz skrót commita. Zastosowania:

- **świeżość** — walidator i CI porównują `counts` z rzeczywistymi danymi; zmiana danych
  bez przestemplowania = czerwone CI,
- **integralność w przeglądarce** — strażnik w `app.js` porównuje to, co się wczytało,
  ze stemplem i pokazuje pasek ostrzeżenia przy brakach,
- **przejrzystość** — „O danych" pokazuje użytkownikowi wersję danych i datę,
- **paczka offline** — ten sam skrót pozwala sprawdzić, że plik offline odpowiada
  aktualnym danym.

## 7. Co dokładnie sprawdza walidator (53 kontrole)

| Grupa | Przykłady |
|---|---|
| struktura | wszystkie skrypty podlinkowane, pliki istnieją, brak osieroconych plików |
| wczytanie | brak wyjątków, wszystkie wymagane obiekty globalne |
| splice | liczba poligonów LGM, udział poligonów z `src` |
| proweniencja | `src` z listy, nazwy, pomiar ⇒ `src` |
| geometria | zakresy, ≥ 3 punkty w pierścieniu, konwencja GeoJSON |
| oś czasu | ciągłość faz, unikalne `bp`, zakres poziomu morza, kamienie milowe |
| odwołania | kultura/ID/powiazane/słownik po `id` |
| biomy | pliki rastrów istnieją, paleta ↔ nazwy klas, kotwice pyłkowe |
| stempel | obecny, zgodny z danymi |

Ostrzeżenia (exit 0) to **dług techniczny**, nie awaria: 185 szkiców bez `src`,
5830 „rozwiniętych" długości w szelfach, 4 spadki `bp` w `ENV.ticks`.
Tryb `--strict` zamienia je w błędy — to bramka na wydanie v1.0, gdy dług zostanie spłacony.
