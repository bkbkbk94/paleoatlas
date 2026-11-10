# Audyt seniora — architektura, kontrakty danych, powtarzalność

**Data:** 2026-11-10 · **Zakres:** całe repozytorium · **Poprzednie:** `AUDYT_JUNIOR.md` (wydajność),
`AUDYT_MID.md` (cykle życia, pamięć)

---

## 1. Co ten audyt sprawdzał (i czym różni się od dwóch poprzednich)

Poprzednie dwa audyty pytały „**czy to działa i czy jest szybkie**". Audyt seniora pyta inne pytanie:
**„czy ktoś obcy — albo Ty za pół roku — będzie umiał to bezpiecznie zmieniać i czy będzie mógł
ufać temu, co atlas pokazuje?"**

Cztery pary oczu, cztery warstwy:

| Rola | Pytanie kontrolne |
|---|---|
| Architekt danych | Czy dane mają **kontrakt** — spisane zasady, których da się pilnować automatycznie? |
| Inżynier niezawodności | Czy błąd **wychodzi na jaw**, czy mapa po cichu pokazuje niepełną prawdę? |
| Kurator treści | Czy przy każdym kształcie na mapie wiadomo, **skąd pochodzi** i czy nie myli pomiaru ze szkicem? |
| Inżynier procesu | Czy da się **powtórzyć** wynik — czy „u mnie działa" jest jedyną gwarancją? |

## 2. Najważniejsze odkrycie: dane to układanka, która nie mówi, gdy się nie ułoży

`js/data/` to **19 skryptów**, które przeglądarka uruchamia w kolejności zapisanej w `index.html`.
Późniejsze modyfikują wcześniejsze (np. dopełniają listę lądolodów). Każdy zaczyna się od zdania:

```js
if (!window.PALEO || !window.PALEO.ice_sets[k]) return;   // jeśli czegoś brak — cicho wyjdź
```

**Skutek:** przy złej kolejności ładowania atlas nie pokaże błędu. Pokazuje **mniej lądolodu**,
a wygląda zupełnie normalnie. Sprawdziłem to eksperymentem: przy ładowaniu alfabetycznym
zamiast kolejności z `index.html` „dziś" miało 320 poligonów **bez ani jednego źródła**,
a w prawidłowej kolejności — 21 poligonów, 13 ze źródłem.

To jest dokładnie ten rodzaj wady, który w projektach open source kończy się cichym rozjechaniem
danych i utratą zaufania. Dlatego powstał **wykonywalny kontrakt** (§3).

## 3. Co zbudowałem — i dlaczego to nie jest „jeszcze jeden test"

### 3.1 `tools/validate_data.js` — kontrakt danych (53 kontrole, <1 s, bez przeglądarki)

Walidator **ładuje dane w tej samej kolejności co przeglądarka** i sprawdza:

- czy wszystkie pliki są podlinkowane i żaden nie jest osierocony,
- czy skrypty „składające" dane rzeczywiście się wykonały (liczba poligonów, udział źródeł),
- **trzy konwencje współrzędnych** (najczęstsze źródło cichych błędów — patrz §3.2),
- oś czasu: ciągłość faz, unikalność przekrojów, zakres poziomu morza,
- odwołania: kultura stanowiska istnieje, `powiazane` wskazuje istniejące ID, słownik po `id`,
- biomy: pliki rastrów istnieją, paleta zgadza się z nazwami klas,
- **świeżość stempla wydania** (§3.3).

Uruchamia się jako **pierwszy krok `tools/run_tests.sh`** — jeśli kontrakt jest złamany, testy
interfejsu nie mają sensu, więc bateria od razu się zatrzymuje z czytelnym komunikatem.

### 3.2 Trzy konwencje współrzędnych — udokumentowane, bo łatwo je pomylić

| Warstwa | Zapis | Uwaga |
|---|---|---|
| Stanowiska | `[szerokość, długość]` | zwykły zapis |
| Lądolody | `[szerokość, długość]` | `pts` albo `rings` |
| Szelfy | `[szerokość, długość]` | **o poziom zagnieżdżenia głębiej** |
| Kontynenty | **`[długość, szerokość]`** | bo to standard GeoJSON — jedyne takie miejsce |

Dodatkowo długości geograficzne bywają „rozwinięte" (−182°, 266°) — to celowe, tak zapisuje się
obszary przechodzące przez południk 180°, żeby nie rozjeżdżały się na dwa końce mapy.
Wszystko to jest teraz w **`DATA_CONTRACT.md`** — nie w głowie autora.

### 3.3 Stempel wydania — „co dokładnie pokazuję"

`tools/stamp_build.py` tworzy `js/data/build_info.js`: skrót SHA-256 treści danych, datę
i liczby obiektów. Trzy zastosowania:

1. **Portal pokazuje wersję danych** w „O danych" (np. `5edd32304334` · 281 stanowisk · 19 faz…).
2. **Strażnik w aplikacji** porównuje to, co się wczytało, ze stemplem. Gdy brakuje pliku,
   użytkownik widzi pasek: „Dane atlasu są niekompletne" — zamiast mapy, która „prawie wygląda dobrze".
3. **CI pilnuje świeżości:** zmiana danych bez przestemplowania = czerwony build.

### 3.4 CI — wreszcie istnieje

Wcześniej **390 asercji uruchamiano wyłącznie ręcznie**, na jednej maszynie, w jednym środowisku.
Dziś `.github/workflows/ci.yml` przy każdym pushu i pull requeście:

- **zadanie 1 (kilka sekund):** kontrakt danych + kontrola świeżości stempla + próbny build paczki offline,
- **zadanie 2 (~5 min):** pełna bateria w prawdziwym Chrome, logi zachowane jako artefakt na 14 dni.

Testy wydajności są **doradcze** — na maszynie CI czasy są zbyt niestabilne, żeby robić z nich bramkę.

## 4. Trzy realne wady naprawione

### 4.1 Pomiary udawały szkice (proweniencja)

Sześć poligonów podaje **zmierzoną powierzchnię** z publikacji: Kilimandżaro 1,76 km² (Cullen 2013),
góra Kenia 0,15 km² (Prinz 2018), Ruwenzori 1,14 km² (Mölg 2006), Puncak Jaya ~0,2 km² (2022–24),
Southern Alps 794 km² (Baumann 2021), Ruapehu 3,0 km² (Eaves & Brook 2020).
Wszystkie nie miały pola `src`, więc wspólny podpis tooltipa nazywał je
**„rekonstrukcją uproszczoną"** — czyli liczba z recenzowanej pracy była przedstawiana jako
rysunek autora. Dodałem `src: 'POMIAR'` i osobny podpis: *pomiar z literatury, obrys schematyczny*.
Walidator pilnuje, żeby żaden obiekt z pomiarem nie został bez oznaczenia.

### 4.2 Słownik: 58 odnośników „zob. też" prowadziło donikąd

Dane były **poprawne** — każde hasło ma stabilny `id` (`kultura_ahrensburska`), a odnośniki
wskazują właśnie te `id`. Błąd był w interfejsie: szukał haseł **po nazwie wyświetlanej**,
więc chip pokazywał surowy identyfikator („kultura_ahrensburska"), a kliknięcie dawało pustą listę.
Naprawa: rozwiązywanie po `id`, etykieta z nazwą hasła, defensywne pomijanie nieznanych odnośników.
Test 10.25 sprawdza, że w całym słowniku jest 69 odnośników, **żaden** nie jest surowym `id`,
a klik prowadzi do dokładnie jednego hasła.

### 4.3 „Cicha niekompletność" — teraz głośna

Patrz §3.3. Test 10.28 **celowo blokuje** jeden plik danych i sprawdza, że użytkownik widzi ostrzeżenie.

## 5. Czego NIE naprawiłem — i dlaczego (uczciwie)

W trakcie audytu trzy razy **moje własne założenie o danych było błędne**, a nie dane.
Zapisuję to, bo to też jest wynik:

| Moje założenie | Rzeczywistość |
|---|---|
| „Szelfy mają współrzędne do ±180°" | Część jest „rozwinięta" do 266° — celowo, dla obszarów przez południk 180° |
| „Przekroje środowiska rosną monotonicznie" | 4 miejsca są nierosnące — plik grupuje je wg źródła, nie wieku; dziś nieszkodliwe |
| „320 poligonów bez źródła = brak danych" | To skutek mojego alfabetycznego ładowania; w prawidłowej kolejności dane są kompletne |

**Wniosek metodyczny:** najpierw odtworzyć warunki z `index.html`, potem oceniać. Walidator robi to
teraz automatycznie — i dlatego jest wart więcej niż ten raport.

## 6. Dług architektoniczny (świadomie odłożony)

| Ryzyko | Ocena | Decyzja |
|---|---|---|
| `window.PALEO` jako globalny punkt styku 19 skryptów | realne, ale **nie teraz** | rozbicie na moduły ESM to przepisanie warstwy danych; ryzyko regresji większe niż zysk przed publikacją (S7) |
| Brak wersjonowania schematu danych | małe | stempel + kontrakt wystarczą do v1.0; wersjonowanie schematu przy pierwszym zewnętrznym kontrybutorze |
| 185 szkiców bez `src` | kosmetyczne | dozwolone, jeśli nazwa mówi „SCHEMAT"; ujednolicenie przy okazji (S8) |
| Brak i18n w kodzie (teksty w `app.js`) | średnie | zgodne z planem P4; kontrakt danych jest językowo neutralny, więc to nie blokuje |
| Zależności w `vendor/` (464 KB) | małe | przypięte wersje, brak CDN — dobrze dla offline i prywatności; audyt licencji w `LICENCJE.md` |
| Aplikacja jednoplikowa (10,6 MB) | zaleta i ograniczenie | mieści się w założeniu „działa wszędzie offline"; przy >20 MB wrócić do tematu |

## 7. Stan po audycie — liczby

| Miara | Przed | Po |
|---|---|---|
| Asercje w baterii | 390 | **394** (113 + 37 + 178 + 21 + 45) |
| Kontrole kontraktu danych | 0 | **53** (0 błędów, 3 ostrzeżenia = dług) |
| CI | brak | **2 zadania** (kontrakt + przeglądarka) |
| Wersja danych widoczna dla użytkownika | nie | tak (skrót + liczby + data) |
| Martwe odnośniki słownika | 58 | **0** |
| Pomiary podpisane jako szkice | 6 | **0** |
| Cicha niekompletność danych | możliwa | **wykrywana i pokazywana** |
| Pliki w paczce offline | 23 JS | 24 JS (doszedł stempel), nadal 0 żądań sieci |

## 8. Wnioski w jednym akapicie

Projekt był w dobrym stanie **funkcjonalnym** — audyty juniora i mid domknęły wydajność i pamięć.
Słabością była **warstwa zaufania i procesu**: dane składały się po cichu, pomiar wyglądał jak szkic,
odnośniki w słowniku nie działały, a 390 testów zależało od jednej maszyny. Po tym audycie atlas ma
**spisany i wykonywalny kontrakt**, **wersjonowane dane widoczne dla czytelnika**, **strażnika
integralności** i **CI**, które nie pozwoli tego po cichu zepsuć. To jest dokładnie ten próg, po którym
projekt można oddać w ręce drugiej osoby — i pokazać recenzentowi bez tłumaczenia się.

## 9. Co dalej (w kolejności)

1. **D1 (hosting)** — jedyna otwarta decyzja blokująca wydanie; bez niej tag `v1.0` czeka.
2. Spłata długu S8 (oznaczenia szkiców) → włączenie `--strict` w CI jako bramki wydania (S11).
3. Po pierwszym zewnętrznym kontrybutorze: wersjonowanie schematu danych + rozbicie `window.PALEO` (S7).
