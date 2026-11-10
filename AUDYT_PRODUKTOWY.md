# PaleoAtlas — audyt produktowy (perspektywa PO non-profit)

**Data:** 2026-08-06 · **Zakres:** portal web (mapa + osia 3,3 mln lat + globus), paczka offline, infrastruktura repo
**Zasada oceny:** wartość publiczna i edukacyjna ponad metryki; zero telemetrii — ocena oparta na pomiarach technicznych i recenzji UX.
**Metoda:** każda ocena ma podane dowody z kodu/pomiarów; nic nie jest „na czuja".

---

## 0. Werdykt w 5 zdaniach

PaleoAtlas to produkt **misji edukacyjnej rzadkiej w polskim internecie**: interaktywna mapa paleogeograficzna z uchwytem naukowej niepewności (DANE / SCHEMAT / MODEL), w pełni polskojęzyczna, bez trackingów, działająca offline. Najmocniejsze strony: **rygorystyka źródeł, prywatność, samowystarczalność techniczna, disciplina testowa (364 asercje auto-testów)**. Główne luki: **dostępność (prawie zero ARIA/klawiatura), znajdowalność (brak meta/OG/manifest — link się nie „rozwija" w social), mobilyne drobiazgi (autozoom iOS w wyszukiwaniach, kolizje paneli na wąskim ekranie), brak onboardingu dla laików**. Żadna luka nie jest strukturalna — większość P0 to zmiany o nakładzie minut–godzin. Werdykt: **produkt wart inwestycji; najpierw „znajdowalność + drobne UX mobilne", potem a11y jako stały kierunek**.

Oceny (1–5): Misja **4,7** · Rzetelność treści **4,6** · UX **3,4** · Dostępność **1,8** · Wydajność **4,4** · Prywatność/etyka **4,9** · Otwartość/licencje **4,0** · Utrzymanie **4,5** · Zasięg **2,3**.

---

## 1. Misja i wartość publiczna — 4,7/5

**Co produkt daje za darmo światu:** jedyny znany polskojęzyczny, interaktywny atlas paleo-świata z jedną osią czasu do 3,3 mln lat, sterowalnym lądolodem/poziomem morza/biomami i globusem hiperboloidalnie uczciwym (Beringia bez szwu). Grupy: nauczyciele geografii/biologii, muzea, studenci, media, hobbyści.

**Mocne:**
- Pełna odpowiedź na „jak wyglądała Polska/Europa/świat w epoce X" — zwięzła, wizualna, cytowalna.
- Tom I (narracja) + Słownik = pokrywa tryb „czytanie", nie tylko „klikanie".
- Offline-pack = działa na sali lekcyjnej bez internetu i na wycieczce.

**Ryzyko misji (nie-winna, ale do pilnowania):** złożoność przytłacza — osoba spoza tematu nie wie, od czego zacząć. → P1: „Start w 60 s" (3 proste wskazówki) opisane w §3.

---

## 2. Rzetelność i zaufanie do treści — 4,6/5

**Dowody:** trywarstwowa uczciwość DANE/SCHEMAT/MODEL egzekwowana w tooltipach, legendach i „O danych"; pełne cytaty z DOI/PANGAEA/Zenodo/Mendeley przy każdej warstwie (BRITICE-CHRONO, ICE-6G_C, RGI 7.0, GLACIMONTIS, DATED-1, BIOME 6000 v4.2, Beyer/Krapp/Barreto…); rozbieżności jawne (np. Beyer vs pyłek dla LGM Polski); walidacja HG-lite 68,4% grup @0 ka zapisana **wraz ze słabymi regionami** (Patagonia 0,17) — to wzorcowe.

**Luki (uczciwe, ale niedokończone):**
- **P1:** brak „Wersji danych" z datą w „O danych" (który build biome_meta/biome rastrów jest na żywo?). Dla cytowalności: `wolno cytować jak: PaleoAtlas v…, stan danych z …`.
- **P1:** przy warstwach brak jednolitego przycisku „kopiuj cytowanie" (tekst jest, kopiowanie ręczne).
- **P2:** HG-lite klasowe rozbieżności (tajga Polska LGM vs Beyer) — uczciwie zapisane w README, ale nie na stronie; 1 zdanie w „O danych" wystarczy.

---

## 3. UX — 3,4/5

**Mocne:** spójny motyw ciemny; timeline z segmentami faz i ♦ milowymi; animacja ▶; dolna szuflada stanowiska na mobile; kontrola warstw z grupowaniem DANE/MODEL; globus z krótkim hintem.

**Luki zmierzone (screeny mobilne z tej tury):**
- **P0 — autozoom iOS w polach wyszukiwania.** `#srch-q { font-size:.78rem }`, `#srch-selects select { font-size:.68rem }` → <16 px ⇒ iPhone **sam powiększa ekran** po dotknięciu pola (potem trzeba ręcznie oddalać). To najgłośniejszy codzienny dyskomfort mobilny. Łatka: 2 reguły CSS (`@media (max-width:760px){ input,select{font-size:16px} }`).
- **P0 — kolizje paneli przy ≤400 px:** karta fazy najeżdża na ikonę kontrolki warstw; legenda biomów potrafi wjechać pod pasek. Łatka: mniejsza karta fazy na mobile / przesunięcie kontrolki.
- **P1 — touch targets:** przyciski zoom Leafleta ~30 px (zalecenie Apple/WCAG ≥44 px); rozważyć powiększenie na mobile.
- **P1 — zero stanów „ładuję / nie udało się":** przy podkładach zewnętrznych (Esri/OSM) offline podkład po cichu znika; brak komunikatu. Jedna linia: „Podkład wymaga internetu".
- **P1 — onboarding laika:** pierwsza wizyta = mapa Polski 95 ka bez kontekstu „co robić". Propozycja: pasek powitalny (znikający) z 3 krokami: „Przeciągnij oś czasu · kliknij stanowisko · zobacz O danych". Lokalnie, znika po pierwszym użyciu — ale **bez localStorage** (obietnica prywatności), więc wersja: pokazuj na `#mapa` dopóki user nie zmieni epoki (heurystyka stanu w pamięci, nie na dysku).
- **P2 — filtry stanowisk nie mają resetu wizualnego na mobile** (jest `clearFilters`, ale ukryty).

---

## 4. Dostępność (WCAG) — 1,8/5

**Zmierzone:**
- Kontrasty AAA: tekst 15,03 · dim 8,46 · akcent 8,20 · dim/panel 7,87 ✔ (swietne).
- ARIA: **1** `aria-label` w całym UI (suwak osi) — za mało.
- Brak `prefers-reduced-motion` i `prefers-contrast` (0 w CSS).
- Klawiatura: tylko ←/→ dla suwaka; brak cyklu focus, brak widocznych outline (`:focus{outline:none}`).
- Semantyka: sekcje widoków to `<section>` ✔, ale zakładki nawigacji to linki kotwicowe bez `role="tab"`; kontrola warstw natywna Leafleta nieczytelna dla czytnika.
- Mapa sama w sobie nie-SR (canvas/SVG geometryczne) — akceptowalne, **jeśli** istnieje alternatywna ścieżka tekstowa: jest (Słownik/Tom I/karta stanowiska w DOM) — warto to uczynić czytelnikowym planem (skip-link „omnij mapę → lista stanowisk").

**Kierunek (nie wymóg prawny, etyka publiczna):** P1-epopeja a11y — etykiety aria na kontrolkach, tabindex, focus-visible, `role=tablist`, skip-link, honorować `prefers-reduced-motion` (animacja osi + przejścia). Uczciwie: pełna dostępność mapy wektorowej jest ograniczona z natury — cel to **parzystość informacji**, nie parzystość interakcji.

---

## 5. Wydajność i niezawodność — 4,4/5

**Zmierzone (headless software canvas):** scrub suwaka po raz drugi ≤65% pierwszego przejścia (58%, Σ1258→749 ms); mediana klatki raf 79–83 ms; globus HIT 4–19 ms vs MISS ~600–750 ms (odcięte od interakcji). Baterie: 84 desktop + 32 mobile + 178 ice + 21 globus + 45 biome + 4 perf = **364 asercje** chroniących regresje.

**Uwagi:** start to ~10 MB JS-data do sparsowania (~s na telefonie); po tej turze bez zapytań zewnętrznych przy starcie ✔. Znane granice: brak `cache-control` warstwy serwowania (przy hoście produkcyjnym dodać), takie tam. **P2:** HTTP/2 + kompresja brotli przy publikacji; **P2:** pomiar na realnym iPhonie (Lab) przed kampanią.

---

## 6. Prywatność i etyka — 4,9/5

- **Zero** trackerów/analityki/cookies/localStorage/sessionStorage (grep: 0 trafień) ✔ — wzorowo jak na non-profit.
- Jedyny wyciek: przełączenie podkładu na Esri/OSM/OTM = żądania do ich CDN (IP użytkownika). **P0:** przy przełączniku podkładu dodać okońko„ℹ połączy z serwerami Esri/OSM".
- Brak kont, brak kolekcji danych, offline-pack bez „telefonu domowego". Etyka designu: brak dark patterns, brak nudge'ów — utrzymać i dopisać do README jako gwarancję.

---

## 7. Otwartość i licencje — 4,0/5

- Źródła danych CC-BY/ODC/DL widoczne w UI ✔. **P0: brak pliku LICENSE dla samego repo/kodu i opisu praw autorskich treści narracji** (Tom I, słownik — Twój tekst). Rekomendacja: kod MIT/CC0, treści własne CC-BY-4.0, tabele: dopisać wiersz w „O danych".
- Narzędzia odtwarzalności: `tools/fetch_biodata.sh`, `build_biomes.py`, `build_offline_pack.py` ✔ — ktoś trzeci może złożyć dane od zera (dobry znak dla nauki).

---

## 8. Utrzymanie i odtwarzalność — 4,5/5

- README jak log operacyjny (changelog na szczycie, tabela testów, drzewo) — rzadkie i cenne.
- 364 asercje + screeningi wizualne; mirrory testów w `tools/` — disciplina ✔.
- **Bus factor = 1** — P1: 1-stronicowy „RUNBOOK: jak podnieść portal / przebudować pakiet / gdzie są źródła".
- Ryzyko długowieczności danych: figshare links (Beyer 1,5 GB…). P2: zaszyć hashe SHA-256 źródeł w `fetch_biodata.sh` (już cześciowo polityką miejsca; pełne hash-pinningi dla pewności).

---

## 9. Zasięg i znajdowalność — 2,3/5 (najsłabszy wymiar)

- `<head>` ma tylko viewport: **brak description, og:title/og:image (link się nie rozwija w Messengerze/Slacku), theme-color, manifestu PWA** (w domu na iOS — brak ikony/branding przy „dodaj do ekranu").
- **P0 pakiet znajdowalności (≈30 linii w index.html):** meta description PL, Open Graph (tytuł + opis + statyczny obrazek podglądu 1200×630 — wyrenderować z atlasa), Twitter card, theme-color, `manifest.webmanifest` z ikoną 🦣 (PNG 192/512). Koszt godzina, efekt: link wygląda jak produkt, nie jak html.
- Język: tylko PL (świadomie? to też misja — polskie źródło dla Polski). P2: warstwa EN opcjonalna (hreflang niepotrzebny przy SPA — osobny build).
- SEO: treść w JS (SPA) — Google zaindeksuje słabo. P1: statyczny „landing" tekst w `<noscript>`+sekcja crawlable (Tom I ma treść w JS — P2: prerender Tomu I do snippetów meta).
- Dystrybucja: kanały edukacyjne (muzea, CEN, FB grupy paleo). P2: krótkie wideo 45 s z animacji osi (natywny asset promocyjny bez kosztów).

---

## 10. Metryki sukcesu bez zysku (rama do adopcji)

Prawo produktu: **nie mierzymy ludzi**. Mierzymy użyteczność ‑bez telemetrii‑:
- liczba pobrań paczki offline (serwer logów zliczający strony — bez ciastek, bez IP w retention),
- sygnały zwrotne kanałami jawymi (formularz opcjonalny / e-mail / hasztag),
- ankiety nauczycieli 1×/rok, cytowania/medialne wzmianki,
- wewnętrzny wskaźnik zdrowia: % testów zielonych przy każdej publikacji.

---

## 11. Matryca ryzyk (top)

| Ryzyko | Prawd. | Wpływ | Mitygacja |
|---|---|---|---|
| Utrata jedynego maintainera | śr. | wys. | RUNBOOK (P1), LICENSE (P0) |
| Zmiana/wygaszenie źródeł (figshare/PANGAEA) | nisk. | śr. | hash-pinning + lokalne kopie surowców pobranych do archiwum produktu |
| iOS Safari — kolejne dziwy canvas/throttling | śr. | śr. | test `M10.*` już chroni; wybór „minimal canvas tricks" przy nowych warstwach |
| SPA słabo indeksowana | wys. | śr. | meta/OG (P0), noscript landing (P1) |
| Wzrost danych → pakiet offline >15 MB | nisk. | nisk. | kompresja rastrów (webp palety? — zostać przy PNG dla czytelności pikseli) — pilnować granicy |

---

## 12. Rekomendacje (priorytety)

**P0 — ten tydzień, mały nakład, duży zysk:**
1. Pakiet znajdowalności: meta description, OG + obrazek, theme-color, manifest + ikona. `index.html` (+ offline pack przebudować).
2. CSS mobile: inputy/selecty ≥16 px (koniec autozoomu iOS); rozplątanie kolizji karta fazy × warstwy ≤400 px.
3. Nota prywatności przy przełączniku podkładów (Esri/OSM = żądania do ich serwerów).
4. LICENSE: kod MIT/CC0 + treści CC-BY-4.0 + 1 wiersz w „O danych".
5. `prefers-reduced-motion` (1 media-query wyłączający animacje i auto-play) + focus-visible outline.

**P1 — kolejny miesiąc:**
6. A11y pass: aria-etykiety kontrolek, role=tablist, skip-link, klawiatura dla kontrolki warstw.
7. Onboarding 60 s (pasek powitalny bez zapisu stanu na dysku).
8. „Wersja danych + data" w „O danych"; „kopiuj cytowanie" przy warstwach.
9. Stany błędów podkładów („wymaga internetu").
10. RUNBOOK 1-str.

**P2 — kwartał:**
11. PWA manifest + lekki SW (offline cele produkcyjne, ostrożnie z poprzednimi doświadczeniami SW).
12. Landing crawlable / prerender snippetów Tomu I.
13. Wariant EN (osobny build).
14. Tryb nauczyciela (3 gotowe „lekcje": LGM Polska, Beringia, AFHP Sahara) — gotowe predefiniowane widoki.

**Czego nie robić (dyscyplina non-profit):** konta użytkowników, paywall warstw, reklamy, analityka behawioralna, „engagement" nudges, zapis preferencji na dysku bez pytania. Ten produkt ma być **biblioteką, nie platformą**.

---

*Audyt powstał na podstawie inspekcji kodu (grep/pomiary), profilu pamięci/CPU w headless Chromium, zrzutów mobilnych 390 px i wyników sześciu suit testowych. Wszystkie liczby w tekście są z tych pomiarów, nie szacunków.*
