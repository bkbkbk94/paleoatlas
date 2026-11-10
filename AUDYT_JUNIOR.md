# Audyt „błędów juniora" — PaleoAtlas (2026-11-10)

**Zakres:** `js/app.js` (1,4 tys. linii), `js/globe.js` (640), `index.html`, `css/styles.css`,
`tools/*` (kontekst), dane w `js/data/`.
**Metoda:** czytanie kodu + **pomiar**, nie „na oko": profil CPU (CDP Profiler), licznik mutacji
DOM, pomiary czasu kroku osi (desktop i telefon z 4× słabszym procesorem), skrypty kontrolne
spójności danych. Każda liczba w tym dokumencie jest zmierzona lub policzona z danych.

> Kryterium: „błąd juniora" = wzorzec, który w małym projekcie uchodzi, a w większym kosztuje
> (wydajność, odporność, maintaining). Nie każdy taki wzorzec jest **awarią** — dlatego dzielę
> je na trzy koszyki.

---

## W skrócie (dla nietechnicznych)

Portal **działał poprawnie**, ale miał cztery słabości, które nie bolały, dopóki nikt nie
próbował niczego zmieniać:

1. **Przesuwanie osią czasu było 3× droższe niż musi być** — jeden błąd (nasłuch na całej mapie)
   powodował, że legenda biomów przebudowywała się **29 razy na jeden krok**.
2. **Jeden brakujący plik danych = biała strona** bez żadnej informacji (teraz: czytelny komunikat).
3. **Liczby w „O danych" były wpisane ręcznie** i już się rozjechały (tekst mówił „26 kultur",
   dane mają 25; „140/146 wariantów" w dwóch miejscach, faktycznie 268).
4. **Odwołania do słownika kultur bez zabezpieczenia** — jedna nowa/nieznana kultura w danych
   przerwałaby rysowanie mapy w połowie i wywaliła kartę stanowiska.

Wszystkie cztery naprawione i obwarowane testami (103 asercje, w tym 4 nowe).

**Efekt liczbowy** (przeciąganie osi po 1 jednostce, ten sam sprzęt, przed → po):

| Miara | Desktop | Telefon (CPU 4× słabszy) |
|---|---|---|
| Średni czas kroku osi | 13,9 ms → **5,0 ms** | 49,4 ms → **16,6 ms** |
| 90. percentyl | 6,3 ms → **5,2 ms** | 25,4 ms → **10,2 ms** |
| Najgorszy skok (zmiana epoki) | 180 ms → **58 ms** | 602 ms → **182 ms** |
| Przebudowy legendy biomów / krok | 29 → **0** | 29 → **0** |

---

## 1. Naprawione — realne problemy

| # | Gdzie | Co było nie tak | Dlaczego to boli | Dowód |
|---|---|---|---|---|
| J1 | `js/app.js` `initBiomeUI()` | `map.on('layeradd layerremove', …)` — nasłuch na **całej mapie**, a Leaflet odpala to zdarzenie dla każdej dodanej warstwy | Jeden krok osi dodaje kilkaset punktów i poligonów → legenda biomów (`innerHTML`) przebudowywana dziesiątki razy na krok | licznik mutacji DOM: **29 → 0**; profil CPU ~6% czasu kroku |
| J2 | `loadBiomeRaster()` | klucz palety sklejany jako string `r+','+g+','+b` w pętli po **259 200 pikselach** | 259 tys. alokacji stringów na każdy wczytany raster → 15% CPU + 8% czasu na odśmiecanie | profil CPU: `img.onload@app.js` 15,4%, GC 7,8% |
| J3 | `renderBiomeLegend()` | brak porównania z poprzednią treścią; zapis `innerHTML` przy każdym wywołaniu | Zapis `innerHTML` wymusza przeliczenie stylów nawet gdy HTML jest identyczny | (część zysku z J1) |
| J4 | start aplikacji | brak jakiegokolwiek strażnika: przy 404 jednego z 23 plików danych wyjątek w połowie inicjalizacji | Użytkownik widzi **białą stronę**; nie wie, czy to jego sieć, czy awaria | nowy test **10.16**: symulowany brak `sites.js` → komunikat `role="alert"` |
| J5 | `esc()` | escapowało `& < >`, ale **nie cudzysłowy** | `esc()` jest używane w wartościach atrybutów (`data-pid`, `data-z`, `data-ch`); wartość z `"` rozjeżdża atrybut. W bazie jest już 10 nazw z cudzysłowem („laska magiczna") | nowy test **10.17** |
| J6 | `CULT[k]` w 6 miejscach (`tipText`, markery, legenda, karta, otoczki, wyszukiwarka) | brak zabezpieczenia przed nieznaną kulturą | Jedna zła wartość w danych → wyjątek w `forEach` → mapa rysuje się **częściowo**, karta stanowiska nie otwiera się | `cultOf()` z neutralnym fallbackiem |
| J7 | `pollenMarkersFor()` | nazwa stanowiska pyłkowego wstawiana do tooltipa **bez escapowania** (a tooltip to `innerHTML`) | Dane z BIOME 6000 to tekst z publikacji — może zawierać `<` | `esc()` w tooltipie |
| J8 | „O danych" (`about-content`) | liczby wpisane ręcznie: „26 kultur", „140 wariantów", „146 zapisów" | **Już się rozjechały**: `META.kultury` = 25, unikalnych `kultura_raw` = 268 | nowy test **10.18** |
| J9 | dymek biomów (`mousemove`) | throttle `if (raf) return` zostawiał **pierwsze** zdarzenie w klatce | Dymek „gonił" kursor o ~16 ms (widać przy szybkim ruchu) | teraz trzymane jest najnowsze zdarzenie |
| J10 | `state.zoomWarnShown` | pole nigdzie nie czytane ani zapisywane | Martwy kod — myli przy czytaniu stanu | usunięte |
| J11 | `index.html` favicon | `data:image/svg+xml,…🦣` (emoji w atrybucie) | Ta sama wada, którą naprawiliśmy w ikonach PWA: bez fontu emoji wychodzi puste pole; favicon nie miał nic wspólnego z marką | teraz `assets/icon.svg` + PNG 192; paczka offline wbudowuje oba jako data-URI |
| J12 | `renderBiome()` | overlay rastrowy bez `alt` | Czytnik ekranu odczytywał nazwę pliku PNG | `alt: ''` (warstwa dekoracyjna, treść niesie legenda) |

## 2. Zmierzone, ale **nie** naprawione (świadoma decyzja)

| # | Co | Liczba | Dlaczego zostawiam |
|---|---|---|---|
| N1 | Przebudowa **wszystkich** markerów przy każdym kroku osi (brak diffu po ID) | ~2–3 ms / 280 punktów | Zysk mały, ryzyko regresji (styl, tooltipy, filtry) większe. Wracać, gdy dojdą języki (P4) i warstwy |
| N2 | Skok **100–180 ms na telefonie** przy zmianie epoki lądolodu (tworzenie poligonów) | 1× na epokę | To koszt Leafleta, nie błąd logiki. Realne lekarstwo: cache gotowych warstw per `(epoka, wariant BIIS)` — zadanie na osobny sprint |
| N3 | `js/app.js` — 1 400 linii w jednym IIFE | — | Działa; dzielenie na moduły ma sens **przed** i18n, nie w środku sprintu wydaniowego |
| N4 | ~20 miejsc buduje HTML stringami | — | Wszystko escapowane (`esc`), ale przy tłumaczeniach lepiej szablony + `textContent`. Odnotowane dla P4 |
| N5 | CSS: 12 × `!important`, kilka bloków powtórzonych w media queries | 12 | Kosmetyka, zero wpływu na użytkownika; porządkować przy okazji zmiany layoutu |
| N6 | `slider` → brak koalescencji w `requestAnimationFrame` | — | Po J1 krok to 1–5 ms, więc koalescencja nic nie da (i psułaby testy synchroniczne) |

## 3. Czego audyt **nie** znalazł (też wynik)

Sprawdzone i **czyste** — warto wiedzieć, żeby nie „naprawiać" na zapas:

- **`var`**: 0 wystąpień; oba pliki w `'use strict'`.
- **`==` / `!=`**: tylko 2 świadome porównania z `null` (`k == null`, `s == null`) — poprawny wzorzec.
- **`eval`, `new Function`, `document.write`**: brak.
- **Globalne wycieki**: poza świadomym API (`window.__PA` dla testów, `window.GLOBE`, `window.setPaleoView`) brak.
- **`onclick=` w HTML**: 0 — wszystko przez `addEventListener`.
- **XSS z wejścia użytkownika**: brak wektorów — wyszukiwarka **nie wstawia** zapytania do HTML-a,
  portal nie ma nic zapisywanego po stronie serwera, brak `localStorage`.
- **Spójność danych**: 281 stanowisk, **0** nieznanych kultur, **0** duplikatów ID, **0** rekordów
  z `od <= do`, 74 hasła słownika — każde z listą „zobacz też", wszystkie kolory kultur w `#rrggbb`.
- **Pamięć**: `requestAnimationFrame` w globusie anulowany przy `deactivate()`, `setTimeout`
  prefetchu czyszczony przed kolejnym, listenery `matchMedia`/`resize` dodawane raz.

## 4. Jak to sprawdzić samemu

```bash
# pełna bateria (5 suit; wymaga Chromium + puppeteer-core)
LD_LIBRARY_PATH=/tmp/nssstub PA_CHROME=/tmp/chromium-wrap \
PA_PUPPETEER=/tmp/pptr/node_modules/puppeteer-core bash tools/run_tests.sh

# tylko testy bramki v1.0 + audytu (sekcja 10)
node tools/e2e.suite.js | grep -E "10\.|PODSUMOWANIE"
```

Pomiar kroku osi (przy uruchomionym `python3 -m http.server 8123`):

```js
// w konsoli przeglądarki
const PA = window.__PA, max = +document.getElementById('tl-slider').max, t = [];
for (let i = 0; i < 40; i++) {
  const t0 = performance.now(); PA.setSlider(Math.round(max * i / 40)); t.push(performance.now() - t0);
}
console.log('średnio', (t.reduce((a, b) => a + b) / t.length).toFixed(1), 'ms');
```

## 5. Wnioski dla zespołu

1. **Mierzyć przed optymalizacją.** Pierwsza hipoteza („debounce w wyszukiwarce") okazała się
   fałszywa — wpisywanie kosztowało 2–3 ms. Prawdziwy koszt siedział w nasłuchu na całej mapie.
2. **Nasłuchy „globalne" (na mapie, na `document`) to najczęstsze źródło niezamierzonej pracy.**
   Zasada: słuchać **tego obiektu**, który naprawdę zmienia widok.
3. **Liczby w tekstach wiązać z danymi.** Trzy różne wartości „liczby kultur" w jednym pliku
   to nie literówka, to brak źródła prawdy.
4. **Każda naprawa = asercja.** Cztery nowe testy (10.15–10.18) blokują powrót tych błędów.
