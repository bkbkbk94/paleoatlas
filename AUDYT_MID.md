# Audyt „błędów średniego poziomu" — PaleoAtlas (2026-11-10)

**Zakres:** sposób, w jaki części portalu współpracują: cykle życia widoków, timery, stan
współdzielony, kontrakty API, obsługa błędów, pamięć, dostępność klawiaturowa, tytuły i historia.
**Metoda:** czytanie kodu pod kątem wzorców + **potwierdzanie w działającej aplikacji**.
Każde znalezisko ma dowód z uruchomionej strony; te, których nie udało się potwierdzić,
są opisane jako „smell" i **nie** zostały zmienione.

> „Błąd średniego poziomu" = kod działa w happy path, ale przy zmianie widoku, drugim
> kliknięciu, wolnej sieci, słabszym sprzęcie albo cudzym odczycie stanu zachowuje się źle.
> W poprzednim audycie (`AUDYT_JUNIOR.md`) szukaliśmy błędów lokalnych i wydajności.

---

## W skrócie

Sześć realnych wad, wszystkie potwierdzone pomiarem w przeglądarce i naprawione:

1. **Animacja osi czasu grała dalej po wyjściu z mapy** — przez 1,4 s pobytu w „O danych"
   czas przeskoczył o 4 000 lat, a po powrocie użytkownik zastawał inną epokę. Timer nie był
   nigdzie zatrzymywany.
2. **`window.__PA.filters` był martwą referencją** — po „wyczyść filtry" nadal pokazywał
   stare zapytanie (`wilczyce`). Kontrakt testowy kłamał.
3. **Ctrl+→ przesuwało epokę** — globalny skrót klawiaturowy nie sprawdzał modyfikatorów.
4. **Cache globusa ograniczony liczbą klatek, nie pamięcią** — 17 pełnoekranowych canvasów:
   **~79 MB na desktopie, ~173 MB na telefonie**. Realne ryzyko ubicania karty przez Safari.
5. **Raster biomów mógł pobierać się dwa razy** (mapa i globus w tej samej klatce) — brak
   znacznika „w locie".
6. **Karta stanowiska nie miała wyjścia z klawiatury** — tylko przycisk ✕ myszką; Escape nic
   nie robił, fokus zostawał w panelu.

Dodatkowo, mniejsze: brak zabezpieczenia kontekstu 2D globusa, `setTimeout(50)` przy
przełączaniu widoków (wyścig timerów), jeden wadliwy rekord mógł przerwać rysowanie mapy
w połowie, wszystkie 5 widoków miało **ten sam tytuł karty**.

**Testy:** 5 nowych asercji (10.19–10.23) + 10.24 = **109 asercji w suitcie desktopowej**,
cała bateria 390 asercji. Każda naprawa ma test, który ją blokuje przed cofnięciem.

---

## 1. Naprawione — z dowodem

| # | Gdzie | Objaw (zmierzony) | Przyczyna | Naprawa |
|---|---|---|---|---|
| M1 | `app.js` — `tl-play`, `show()` | Po kliknięciu ▶ i wejściu w „O danych": bp 88 600 → 84 600 w 1,4 s, przycisk nadal ⏸ | `setInterval` nie był zatrzymywany przy zmianie widoku ani przy ukryciu karty | jedno `stopAxisPlay()`: przycisk, `show()`, `visibilitychange` |
| M2 | `app.js` — `window.__PA` | Po `clearFilters()`: `__PA.filters.q === 'wilczyce'` (stara wartość) | `filters: state.filters` kopiowało **referencję**, a `clearFilters()` podmienia cały obiekt | `get filters()` — zawsze aktualny stan |
| M3 | `app.js` — keydown | `Ctrl+→`: bp 95 000 → 93 000 | brak sprawdzenia `ctrlKey/metaKey/altKey` | skróty z modyfikatorem pomijane |
| M4 | `globe.js` — `pxSet` | `_cacheStats()`: **80,7 MB** przy budżecie 48 MB (pierwsza wersja poprawki) | limit = liczba wpisów (7 + 10), a wpis to cały ekran: 4,7 MB desktop / 10,2 MB telefon | budżet **48 MB** dzielony po połowie między dwa cache; liczba wpisów wyliczana z rozmiaru klatki |
| M5 | `app.js` — `loadBiomeRaster` | podwójne dekodowanie 259 200 px, gdy mapa i globus poproszą o raster w tej samej klatce | sprawdzanie tylko cache/porażki, bez stanu „pobieram" | `BIOME.loading[file]` jako blokada in-flight |
| M6 | `app.js` — karta stanowiska | Escape nie zamykał; fokus zostawał w panelu | brak obsługi Escape i zapamiętania elementu, z którego otwarto kartę | `closeSiteCard()` + powrót fokusu (`focus({preventScroll:true})`) |
| M7 | `app.js` — `renderTimeLayers` | wyjątek przy jednym rekordzie przerywał pętlę → mapa rysowana częściowo, legenda nieaktualna | brak izolacji pojedynczego rekordu | `eachSafe()` + jedno ostrzeżenie w konsoli z listą ID |
| M8 | `globe.js` — `init()` | brak kontekstu 2D wywracał inicjalizację całego portalu | brak sprawdzenia `getContext` | guard + komunikat w konsoli, globus po prostu się nie włącza |
| M9 | `app.js` — `show()` | przy szybkim przełączaniu widoków kumulowały się opóźnione `invalidateSize` | `setTimeout(…, 50)` bez anulowania | `requestAnimationFrame` z anulowaniem poprzedniego |
| M10 | `app.js` — `show()` | 5 widoków = jeden tytuł karty (historia i zakładki nierozróżnialne) | brak mapy tytułów | `VIEW_TITLES` + test 10.24 |

## 2. Zmierzone i **nie** zmienione (świadomie)

| # | Obserwacja | Dlaczego zostawiam |
|---|---|---|
| S1 | `route()` wywoływane dwa razy na kliknięcie w nawigację (hashchange + `setTimeout(route, 0)`) | Zmierzone: 0 przerysowań listy słownika, koszt ~0 ms. Usunięcie groziłoby regresją przy kliknięciu w **ten sam** widok (hashchange wtedy nie leci) |
| S2 | `biomeEpochForBP()` wołane 4–5× na render (liniowy skan 56 epok) | ~0,05 ms; mikrooptymalizacja bez wpływu na UX |
| S3 | Globus czyta `window.__PA.bp` w każdej klatce (sprzężenie modułów przez global) | Działa i jest proste; właściwym rozwiązaniem jest szyna zdarzeń — razem z N3 (podział `app.js`) |
| S4 | Brak deep-linku do stanowiska (`#stanowisko-PM-030`) | To funkcja produktowa (udostępnianie linku do karty), nie błąd — do decyzji przy publikacji |
| S5 | `md()` — własny mini-markdown na regexach | Treść własna i escapowana; pełny parser to zbędna zależność |
| S6 | `SITES.rdzen.find()` przy kliknięciu chipa (liniowo po 281 rekordach) | ~0,01 ms; mapa ID byłaby szybsza, ale to nie problem |

## 3. Kontrakty i spójność (co warto wiedzieć)

- **`window.__PA` jest publicznym kontraktem** — używają go wszystkie suity. Po audycie:
  `bp` i `filters` to **gettery** (żywy stan), reszta to funkcje diagnostyczne. Zmiana pola
  na getter nie zmienia sposobu czytania, ale blokuje klasę błędu M2.
- **Dwa źródła czasu:** `slider.value` i `state.bp`. `setSlider()` zapisuje oba; testy
  porównują je pośrednio (10.x, `bpToSlider`/`sliderToBP`). Rozjazd byłby widoczny od razu.
- **Globus i mapa dzielą dane, nie stan:** oba czytają `__PA.envIcePolysCached`, `SHELVES`,
  `BIOME`. Cache globusa jest **jego** własnością i nie wpływa na mapę płaską.
- **Brak globalnego stanu „tryb" poza `paleoView`** — dobrze; `HULLS_ON` jest stałą, nie flagą runtime.

## 4. Jak to sprawdzić samemu

```bash
# testy audytu (sekcja 10 obejmuje oba audyty: junior + mid)
LD_LIBRARY_PATH=/tmp/nssstub PA_CHROME=/tmp/chromium-wrap \
PA_PUPPETEER=/tmp/pptr/node_modules/puppeteer-core node tools/e2e.suite.js | grep -E "10\.|PODSUMOWANIE"
```

W konsoli przeglądarki:

```js
window.GLOBE._cacheStats()     // {base, ice, max, bytes, budget} — pamięć cache globusa
window.__PA.filters            // żywy stan filtrów (getter)
```

## 5. Wnioski

1. **Timer bez właściciela to dług.** Każdy `setInterval` powinien mieć jedno miejsce
   zatrzymania i co najmniej dwa zdarzenia, które je wołają (koniec zadania + wyjście z widoku).
2. **Publiczne API nie może trzymać kopii stanu.** Getter zamiast referencji — jedna linia,
   a usuwa całą klasę „test czyta nieprawdę".
3. **Limit zasobu liczy się w koszcie, nie w sztukach.** „Maks. 17 klatek" brzmi rozsądnie,
   a oznacza 173 MB na telefonie.
4. **Stan „w locie" to też stan.** Brak znacznika „pobieram" daje podwójną pracę dokładnie
   tam, gdzie nikt nie patrzy (dwie warstwy proszą o ten sam plik w jednej klatce).
5. **Potwierdzaj w działającej aplikacji.** Z dziesięciu podejrzeń dwa okazały się nieistniejące
   (S1, S6) — bez pomiaru poprawki byłyby stratą czasu i ryzykiem.
