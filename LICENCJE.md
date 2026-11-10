# Licencje, źródła i cytowanie — PaleoAtlas

Dokument dla użytkowników, redakcji i recenzentów: **co czyim jest**, na jakich zasadach
i jak to poprawnie oznaczyć. Uzupełnia `LICENSE` (kod) i `LICENSE-TRESCI.md` (treści).

## 1. Własność projektu (© 2026 Malwowy)

| Warstwa | Licencja | Co obejmuje |
|---|---|---|
| **Kod** | **MIT** (`LICENSE`) | `index.html`, `css/`, `js/app.js`, `js/globe.js`, skrypty `tools/*` |
| **Treści, dane portalu, ilustracje** | **CC BY 4.0** (`LICENSE-TRESCI.md`) | opisy stanowisk, Tom I, słowniczek, legendy, warstwy opracowane w portalu (taksonomia kultur, schematy oznaczone jako „schemat portalu"), obraz OG, ikony |
| **Dane zewnętrzne** | licencje źródłowe (tabela §2) | rekonstrukcje lądolodów, biomy, batymetria, kotwice pyłkowe |

**Zasada rozdzielenia:** wszystko, co w portalu nosi etykietę **DANE**, pochodzi ze źródła
zewnętrznego i zachowuje **jego** licencję. Wszystko oznaczone jako **SCHEMAT / MODEL portalu**
jest nasze (CC BY 4.0).

## 2. Źródła zewnętrzne

| Zbiór | Rola w portalu | Licencja wg dokumentacji zbioru | Wymagane oznaczenie |
|---|---|---|---|
| **DATED-1** — Hughes i in. 2016, *Boreas*; PANGAEA 10.1594/PANGAEA.848117 | lądolód Eurazji 30–8 ka | PANGAEA (zwykle CC BY 4.0) ⚠ potwierdzić | autorzy + DOI zbioru (jest w tooltipie) |
| **NADI-1** — Dalton i in. 2023, *QSR* 321:108345; Zenodo 10.5281/zenodo.8161764 | lądolód Ameryki Płn. 25–10,5 ka | ⚠ potwierdzić na Zenodo | autorzy + DOI |
| **PATICE / PATICE-LAKES** — Davies i in. 2020, *ESR* 204:103152; Mendeley 10.17632/ztz59y79vv.1 | lądolód i paleojeziora Ameryki Płd. | **CC BY 4.0** | autorzy + DOI |
| **BRITICE-CHRONO** — Clark i in. 2022, *Boreas* 51:699; PANGAEA 10.1594/PANGAEA.945729 | lądolód Wysp Brytyjskich (3 warianty) | **CC BY 4.0** | autorzy + DOI |
| **ICE-6G_C (VM5a)** — Argus i in. 2014; Peltier i in. 2015 | Antarktyda, Grenlandia, Islandia (deglacjacja) | ⚠ potwierdzić u autorów modelu | cytowanie obu prac |
| **RGI 7.0** — RGI Consortium 2023, NSIDC, doi:10.5067/f6jmovy5navz | czapy lodowe Islandii „dziś" | **CC BY 4.0** | konsorcjum + DOI |
| **GLACIMONTIS** — Lima i in. 2026, *Sci. Data* 13:629; Zenodo 10.5281/zenodo.15600659 | lodowce górskie świata | **CC BY 4.0** | autorzy + DOI |
| **Batchelor i in. 2019** — *Nat. Commun.* 10:3713; OSF osf.io/7jen3 | lądolody półkuli płn. ≥30 ka | ⚠ potwierdzić (OSF) | autorzy + link OSF |
| **Beyer, Krapp & Manica 2020** — *Sci. Data* 7:236 | biomy 0–120 ka | ⚠ potwierdzić (figshare „pastclim") | autorzy + DOI |
| **Krapp i in. 2021** — *Sci. Data* 8:228 | biomy 121–799 ka | ⚠ potwierdzić | autorzy + DOI |
| **PALEO-PGEM** — Barreto i in. 2023, *GEB* 32:1034; figshare 10.6084/m9.figshare.20379663 | klimat do klasyfikatora biomów ≥810 ka | **CC BY 4.0** | autorzy + DOI |
| **BIOME 6000 v4.2** — Prentice i in. 2000; Harrison i in. 2001; Bigelow 2003; Pickett 2004 | kotwice pyłkowe 0/6/18 ka | zbiór akademicki (PMIP) ⚠ potwierdzić | autorzy + zestaw prac |
| **ETOPO2v2** — NOAA/NCEI | batymetria → dawne lądy | **domena publiczna** | NOAA/NCEI |
| **Natural Earth 50m** | kontury lądów, „duch" wybrzeża | **domena publiczna** | Natural Earth |
| **Esri** (Terrain/Physical/Hydro/Boundaries) | podkłady i granice | warunki Esri — **kafle pobierane z serwerów Esri, nie redystrybuowane** | „Esri, USGS, NOAA" |
| **OpenStreetMap** | podkład | **ODbL** (kafle) | „© OpenStreetMap contributors" |
| **OpenTopoMap** | podkład | **CC BY-SA** (kafle) | „© OpenTopoMap (CC-BY-SA)" |

⚠ = licencja **nie jest wprost podana w repozytorium**; przed publikacją v1.0 trzeba ją
potwierdzić na stronie zbioru i uzupełnić tę tabelę. Do tego czasu portalu nie należy
przedstawiać jako „wszystko CC BY 4.0" — dotyczy to **naszych** warstw, nie danych źródłowych.

## 3. Jak cytować

**Portal (dane i treści):**

> Malwowy (2026). *PaleoAtlas — interaktywny atlas stanowisk paleolitu i mezolitu* (wersja 1.0).
> CC BY 4.0.

**Pojedyncza warstwa, np. lądolód:**

> Malwowy (2026). *PaleoAtlas*, warstwa „Lądolód — Europa": rekonstrukcja wg Hughes i in. (2016),
> DATED-1, PANGAEA 10.1594/PANGAEA.848117. CC BY 4.0.

**W tekście:** „…zasięg lądolodu wg DATED-1 (Hughes i in. 2016), zaadaptowany w PaleoAtlas
(Malwowy 2026, CC BY 4.0)."

## 4. Ograniczenia, o których trzeba mówić

Portal **rozróżnia** dane i modele w interfejsie (etykiety DANE / MODEL / SCHEMAT, cytat
w tooltipie, „kotwica ≈ dziś" tam, gdzie pomiarów nie ma). Przy cytowaniu zachowaj to
rozróżnienie — inaczej schemat portalu zostanie przypisany publikacji, która go nie zawiera.
