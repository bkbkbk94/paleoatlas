# PaleoAtlas — audyt produkt menadżera (PM)

**Data:** 2026-08-03 · **Zakres:** strategia produktu, użytkownicy, roadmapa wydaniowa, priorytety, operacje.
**Relacja do poprzedniego dokumentu:** [`AUDYT_PRODUKTOWY.md`](AUDYT_PRODUKTOWY.md) ocenił produkt jako PO non-profit
(9 wymiarów, dowody z kodu, P0/P1/P2). **Ten dokument nie powtarza tej oceny** — patrzy okiem PM-a:
czy produkt *dotrze* do ludzi, *komu* ma służyć najpierw, *co wydać* kiedy i *jak o tym decydować*.
Uzupełniają się; w razie różnicy priorytetów obowiązujący jest ten dokument (PM ustawia kolejkę, PO pilnuje wartości).

---

## 0. Werdykt w 5 zdaniach

Produkt jest **dojrzały wewnętrznie** (rygor danych, 364 asercje, działa offline), ale **publicznie nie istnieje**:
nie ma stałego adresu — ta tura pokazała to w terenie („Sandbox Not Found", ulotny URL podglądu, „klikam i nic się
nie dzieje"; produkt ratuje się 10-megabajtową paczką offline wysyłaną „na żądanie"). Z punktu widzenia PM-a to nie
problem techniczny, tylko **problem produktowy nr 1**: kanał dotarcia jest kruchy, więc wszystkie inne inwestycje
(funkcje, treści) mają zerowy mnożnik. Dobra wiadomość: produkt jest **w 100% statyczny** (bez bazy, bez backendu,
12 MB repo) → hosting publiczny kosztuje **0 zł** i jest sprawą decyzji, nie pracy. Roadmapa poniżej porządkuje to tak:
**najpierw adres i udostępnialność (bramka v1.0), potem drobiazgi UX mobilnego, potem dalsze funkcje**. Werdykt PM:
**zamrozić rozwój funkcji do czasu bramki v1.0** — każdy nowy feature przed „adresem" to praca do szuflady.

Ocena PM (1–5): Wartość wyróżniająca **4,6** · Gotowość do publikacji **2,1** · Dopasowanie do odbiorców **3,6** ·
Operatywność (procesy) **4,4** · Zdolność do wzrostu bez budżetu **2,4**.

---

## 0A. North star i „zasada bliskości" (dopisane 2026-08-03, decyzja usera)

**Wizja docelowa (kompas, nie backlog):** *atlas całego świata, w językach całego świata, dostępny wszędzie, gdzie
się da* — web, PWA, sklepy, paczka offline, docelowo mirrory i formaty całkowicie offline (np. ZIM/Kiwix).
Cel odległy i ambitny — **nie konsumuje bieżącej kolejki**.

**Zasada bliskości (stała reguła PM):** praca porusza się horyzontami; dalszy horyzont nigdy nie zabiera mocy
bliższemu. Wizja wyznacza kierunek decyzji architektonicznych (np. i18n jako plumbing, dane jako moduły),
ale **nie wchodzi do planu dnia**.

| Horyzont | Zawartość | Bramka wejścia |
|---|---|---|
| **H0 — teraz (obowiązuje)** | bramka v1.0 (P0), potem P1 „pierwsze wrażenie" | — (jesteśmy tu) |
| **H1 — po H0** | P4: i18n + fala 1 języków CEE + apki (PWA→Play→iOS); P3.1: pilotaż PBDB | **G1:** v1.0 opublikowane + ≥1 realny sygnał użycia (agregaty hostera / nauczyciel / pobrania paczki) + bateria zielona |
| **H2 — wizja (kompas)** | pełny świat × świat języków × wszystkie kanały; pełny głęboki czas | **G2:** fala 1 rzeczywiście używana, apki wydane; każdy element H2 przyjmowany **pojedynczo** przez bramkę — nigdy hurtem |

Dwie tarcze wykonawcze: (1) maks. **2 równoległe strumienie prac** naraz; (2) test przed każdą nową robotą:
*„czy to zbliża H0/H1?"* — jeśli nie, ląduje w szufladzie H2, nie w planie.

---

## 1. Fakty terenowe (dowody, nie opinie)

| Fakt | Skąd | Wniosek PM |
|---|---|---|
| Produkt ~12 MB repo, 131 plików, 0 zapytań sieciowych przy starcie, 0 trackerów | inspekcja repo, bootshot | Da się hostować jako czysty static → **0 zł/mies., zero awarii backendu** — bo backendu nie ma |
| Paczka offline `PaleoAtlas_OFFLINE.html` = 10,5 MB, 1 plik, pełny globus i siatki klas | smoke-test file:// | Drugi *form factor* produktu: „nośnik lekcyjny". To cecha, nie kompromis — nazywać ją tak w komunikacji |
| Adres podglądu Areny jest ulotny (`Sandbox Not Found` po uśpieniu) | zrzuty usera IMG_3083 | **Nie budować dystrybucji na preview Areny** — to narzędzie deweloperskie, nie hosting |
| 364 asercje auto-testów (84+32+178+21+45+4), zielone | README „Ostatni wynik" | Bramki jakości istnieją → proces wydawniczy może być **lekki** (1 osoba, 1 godzina/release) |
| Brak: LICENSE, manifest, og:/meta description (grep `index.html`: 0 trafień), stały URL | inspekcja | Link do produktu dziś „nie istnieje ani nie rozwija się" w komunikatorach — bariera poleceń = 100% |

---

## 2. Dla kogo i po co (persony → JTBD → dziś przeszkadza)

Priorytet person PM (kto daje najwięcej wartości publicznej na godzinę pracy):

| # | Persona | Zadanie do wykonania (JTBD) | Co dziś przeszkadza | Priorytet wpływu |
|---|---|---|---|---|
| 1 | **Nauczyciel(ka) geo/historii/biologii** | „Pokaż klasie, jak wyglądała Polska w zlodowaceniu" — na tablicy, bez konta, z zaufanego źródła | brak stałego linku do wysłania; pola szukające powiększają iPhone; brak „wersji danych" do zacytowania | **najwyższy** (multiplikator: klasa 30 osób) |
| 2 | **Entuzjasta/hobbysta 25–60** | „Sprawdź, co było tutaj 20 tys. lat temu" — z linku od znajomego, na telefonie, w 3 min | link się nie rozwija w Messengerze (brak OG); pierwsza wizyta bez kontekstu „co kliknąć" | wysoki |
| 3 | **Uczeń/student do pracy/odpowiedzi** | „Zacytuj wiarygodnie, z datą i źródłem" | brak przycisku „kopiuj cytowanie", brak daty buildu danych | średni |
| 4 | **Badacz/dziennikarz** | „Zweryfikuj, skąd masz te granice lodu" | jest dobrze: pełne cytaty z DOI; ulepszyć: „wersja danych" | niski (już obsłużeni) |

**Decyzja PM:** projektujemy *pod personę 1 i 2*; persona 4 ma już komplet (i tak weryfikuje wszystko, co robimy).

---

## 3. Pozycjonowanie (dlaczego my, a nie inni)

Globalne alternatywy: Ancient Earth, GeaCron, World History Maps, założone podręczniki. Unikalna propozycja
PaleoAtlas (nie kopiowalna w godzinę przez konkurencję):

1. **Epistemiczny podpis warstw**: każdy piksel ma etykietę DANE / SCHEMAT / MODEL z cytatem — tego nikt z „dużych" nie robi.
2. **Polskojęzyczna pełnia**: 26 kultur, 74 hasła, Tom I — jedyna taka mapa paleo po polsku.
3. **Offline/prywatność**: paczka 1-plikowa + zero telemetrii → legalna i praktyczna na sali lekcyjnej i w terenie.
4. **Zakres czasu 3,3 mln lat**: od Lomekwi 3 po dziś, z lądolodem i poziomem morza sterowanymi ręcznie.

Jednozdaniowe pozycjonowanie (do meta description i OG): *„PaleoAtlas — zobacz, jak wyglądał świat przed nami:
mapa paleolitu z działającą osią czasu, lądolodem i oznaczonymi źródłami każdej warstwy. Po polsku, bez kont i reklam."*

---

## 4. Model produktu

**Core loop:** pytanie („jak wyglądało X wtedy?")→ przeciągam oś czasu → widzę odpowiedź na mapie/globusie →
klikam warstwę/hasło → zaufanie rośnie (cytat) → polecam nauczycielowi/znajomemu.

**Lejek bez telemetrii** (nie mierzymy ludzi; mierzymy oporem kanałów):

```
dotarcie (link polecony) → wejście (strona się otwarza!) → aktywacja (zmienił epokę 1×)
→ eksploracja (stanowisko/globus) → powrót/polecenie
```

Blokery dziś, per etap: dotarcie = brak OG/stałego URL (P0) · wejście = Sandbox Not Found/paczka ręczna (P0-hosting)
· aktywacja = brak onboardingu (P1) · eksploracja = autozoom iOS, kolizje paneli (P0-mobile) · powrót = brak PWA/home (P2).

**Metryka północna (przyjęta, bez zbierania danych):** *liczba „sesji poznawczych" w tygodniu* — mierzona pośrednio:
(a) agregaty statycznego hostera (Cloudflare/Pages podają liczbę odsłon bez cookies), (b) jawne sygnały zwrotne
(e-mail/hasztag/cytowania), (c) 1×/rok ankieta nauczycieli. Cel 6 miesięcy po publikacji: **≥300 odsłon/tydz. i
≥5 zwrotnych sygnałów/mies.** — dla non-profit to wystarczający dowód sensu utrzymania.

---

## 5. Bramka v1.0 (definition of done dla „publikacji")

v1.0 = produkt, który **można komuś wysłać i nie trzeba tłumaczyć**. Warunki bramki (wszystkie = bramka zamknięta):

- [ ] **Stały publiczny URL** (hosting statyczny; patrz §7) — *decyzja usera + 30 min pracy*
- [ ] Pakiet znajdowalności: meta description, og:title/description/image (render 1200×630), theme-color, manifest + ikonka 🦣
- [ ] Mobile CSS: input/select ≥16 px (koniec autozoomu iOS); rozplątanie kolizji karta fazy × kontrolki ≤400 px
- [ ] LICENSE (kod MIT lub CC0; teksty własne CC-BY-4.0) + wiersz w „O danych"
- [ ] Nota prywatności przy przełączniku podkładów (Esri/OSM = ich serwery)
- [ ] `prefers-reduced-motion` + `:focus-visible`
- [ ] RUNBOOK 1-str. (jak podnieść/prebudować/wydać) — bus factor 1 → ≥1,5
- [ ] Bateria 6 suit zielona po zmianach + rebuild paczki offline

Po bramce: tag `v1.0`, wpis w changelogu, **pierwsza świadoma dystrybucja** (§8).

---

## 6. Roadmapa 30/60/90 (po bramce v1.0)

| Okno | Nazwa | Prace (z audytu PO, przemapowane) | Kryterium wejścia |
|---|---|---|---|
| **Tydz. 0–1** | **Publikacja** | Hosting + pakiet znajdowalności + mobile CSS + LICENSE + nota prywatności + reduced-motion + RUNBOOK → **v1.0** | decyzja usera o hostingu |
| **Tydz. 2–4** | **Pierwsze wrażenie** | Onboarding 60 s (bez localStorage, pamięć w sesji), „wersja danych + data" w O danych, „kopiuj cytowanie", stany błędów podkładów („wymaga internetu"), touch targets ≥44 px | v1.0 opublikowane |
| **Mies. 2** | **Dotarcie do klas** | Tryb nauczyciela: 3 gotowe lekcje (LGM Polska · Beringia · „zielona Sahara") jako predefiniowane widoki + jeden link każda; aria-etykiety kontrolek + role=tablist + skip-link | ≥1 realna klasa użyła (sygnał zwrotny) |
| **Mies. 3** | **Forma i zasięg** | Landing crawlable + prerender snippetów Tomu I; wideo 45 s z animacji osi (asset zero-koszt do social); rozważenie PWA (lekki SW — ostrożnie po historii); ~~decyzja o wariancie EN~~ → **2026-08-03: rozszerzone decyzją usera do wielojęzyczności CEE + appek mobilnych** — szczegóły: ZADANIA.md sekcja P4, koszty: audyt konkurencji §7 | spójna v1.x, zero regresów w baterii |

**Zamrożone** (świadomie poza roadmapą): konta, komentarze, telemetria behawioralna, A/B testy, reklamy,
„gamifikacja", powiadomienia push. Produkt = **biblioteka, nie platforma** (zgodnie z audytem PO).

---

## 7. Priorytetyzacja RICE (dlaczego taka kolejność)

Reach = ilu użytkowników dotknie w 6 mies.; Impact 0,5–3; Confidence %; Effort w osobodniach (1 dzień = sesja agentska).

| Zadanie | R | I | C | E | RICE | Uwaga |
|---|---|---|---|---|---|---|
| Stały URL (hosting statyczny) | wszyscy (100%) | 3 | 95 | 0,1 | **2850** | bez tego reszta ≤0 efektu |
| OG/meta/manifest | 800 | 2 | 90 | 0,1 | **14 400** | kanał poleceń mobilnych = #1 |
| Mobile CSS (autozoom/kolizje) | 400 | 2 | 85 | 0,2 | **3400** | teraz rani każdą sesję iPhone |
| LICENSE + wersja danych | 150 | 1,5 | 90 | 0,2 | **1012** | odblokowuje cytowanie/podmioty publiczne |
| Onboarding 60 s | 400 | 1,5 | 70 | 0,5 | **840** | bez localStorage — heurystyka sesji |
| A11y pass | 60 | 2,5 | 90 | 2 | **67** | nie natura mapy; równość informacji |
| Tryb nauczyciela | 300 | 2,5 | 75 | 1,5 | **375** | po v1.0 — multiplikator klas |
| PWA/SW | 200 | 1 | 60 | 1,5 | **80** | niskie C po „dziwach" iOS/SW |
| Wariant EN | 1000 | 1,5 | 60 | 3 | **300** | misja preferuje PL → dopiero po przemyśleniu |

*RICE traktować porządkowo, nie dosłownie — ale rządy wielkości się zgadzają z intuicją: **adres i udostępnialność przed
funkcjami**.*

---

## 8. Dystrybucja bez budżetu (po v1.0)

- **Bezpośrednia:** link w podpisach, grupy nauczycieli (FB/Dyskord), e-podręczniki i katalogi OER, muzea archeologiczne (digital-edu).
- **Wykorzystane atuty:** paczka offline jako „nośnik na pendrive dla szkoły bez internetu" (unikat!), cytowalność (DOI podpięte), filmik 45 s z animacji osi (natywny asset do social, 0 zł).
- **Czego nie robić:** SEO-farm, reklamy, drzwi z telemetrią „na próbę". Zasięg rośnie polecaniem — to pasuje do produktu-biblioteki.

---

## 9. Operacje i ryzyka

**Proces wydania (lekki, już istnieje):** zmiana → `node --check` → 6 suit (364 asercje; suity sekwencyjnie)
→ rebuild paczki offline → changelog na szczycie README. Koszt ≈ 1 h/release. **PM utrzymuje tę dyscyplinę jako
bramkę — żaden release bez zielonej baterii.**

| Ryzyko | P | I | Mitygacja | Właściciel |
|---|---|---|---|---|
| Brak decyzji o hostingu → produkt nadal niewidoczny | wys. | wys. | **decyzja usera w tym tygodniu**; jak nie — tymczasowo: paczka offline + „wysyłka na żądanie" | user |
| Bus factor 1 | śr. | wys. | RUNBOOK w bramce v1.0 | agent |
| iOS Safari — kolejne dziwy (canvas/SW) | śr. | śr. | M10.* w baterii; zasada „minimal canvas tricks" | agent |
| Licencje podkładów (Esri/OSM/OTM) przy wzroście | nisk. | śr. | nota atrybucji + prywatności (bramka v1.0) | agent |
| Rozrost paczki offline >15 MB | nisk. | nisk. | pilnować rozmiar w changelogu | agent |

**Role tak jak są:** user = właściciel/mecenas (decyzje, adres, tożsamość licencyjna) · agent = PM+PO+dev+QA w jednym (wykonanie, pomiary, raport w changelogu).

---

## 10. ★ CO DO ZROBIENIA TERAZ (zapis decyzyjny)

Kolejność działań od dziś. **[A]** = robi agent (kod/testy/pliki), **[U]** = wymaga decyzji/dostępu usera.

| # | Zadanie | Kto | Nakład | Zależność | Status |
|---|---|---|---|---|---|
| 1 | **Decyzja: hosting.** GitHub Pages (repo publiczne; adres `*.github.io`) albo Cloudflare/Netlify (bez repo). Potrzebne konto usera. Bez tego punkty 2–4 mają obniżony sens | **[U]** | 15 min decyzji | — | ⏳ czeka na usera |
| 2 | Pakiet znajdowalności: meta description + OG + og:image 1200×630 (render z atlasa) + theme-color + `manifest.webmanifest` z 🦣 | [A] | ~1 h | — | ⬜ gotowe do startu |
| 3 | CSS mobile: input/select ≥16 px + rozplątanie kolizji paneli ≤400 px | [A] | ~1 h | — | ⬜ gotowe do startu |
| 4 | LICENSE (MIT/CC0 + CC-BY-4.0) + nota prywatności przy podkładach + wiersz w „O danych" | [A] + **[U]** potwierdzenie autora treści | ~40 min | decyzja licencji | ⬜ |
| 5 | `prefers-reduced-motion` + `:focus-visible` | [A] | ~30 min | — | ⬜ |
| 6 | RUNBOOK.md (1 str.: start serwera, rebuild paczki, jak wydać) | [A] | ~30 min | — | ⬜ |
| 7 | Rebuild paczki offline (`tools/build_offline_pack.py`) + pełna bateria 6 suit + changelog | [A] | ~1 h | po 2–6 | ⬜ |
| 8 | Tag `v1.0` + plan dystrybucji §8 (po opublikowaniu) | [A] + [U] | — | po 1–7 | ⬜ |

**Agent może zrobić 2, 3, 5, 6 od razu bez żadnej decyzji** — wszystkie są lokalne, odwracalne i zgodne z audytem PO.
Punkty 1 i 4 (licencja-treści) czekają na 2 zdania usera.

**Potrzebuję od Ciebie (odpowiedz choćby jednym słowem przy każdym):**
1. Hosting: **GitHub Pages** (polecane: darmo, trwałość, wersjonowanie w gratisie) / **Cloudflare/Netlify** / „na razie nie".
2. Licencja tekstów własnych (Tom I, słownik): **CC-BY-4.0** (polecana dla edukacji) — podpis autora do stopki: *jakie nazwisko/inicjał?*
3. Zielone światło „**zrób P0**" → wykonuję punkty 2–7 w tej kolejności i raportuję tabelą wyników.

---

*Audyt PM powstał na podstawie inspekcji repo (12 MB, 131 plików), zapisu incydentów dostępności z tej tury
(ulotny URL, Sandbox Not Found, paczka jako obejście), wyników baterii (364 asercje) i audytu PO z 2026-08-06.
Wszystko, co oznaczone „pomiar", pochodzi z pomiarów — reszta to osąd produktowy oznaczony jako decyzja.*
