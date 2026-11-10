#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_data.py — przygotowanie danych portalu PaleoAtlas
=========================================================
Czyta CSV z katalogu ../uploads (lub ../dane_zrodlowe) i generuje
pliki JS z danymi do katalogu ../js/data/ (ładowane <script src>, więc
portal działa też po dwukliku na index.html — bez serwera i bez CORS).

Uruchomienie:  python3 tools/build_data.py
"""
import csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def find_uploads():
    for cand in (os.path.join(ROOT, 'dane_zrodlowe'), os.path.join(ROOT, 'uploads'), os.path.join(os.path.dirname(ROOT), 'uploads'), '/home/user/uploads'):
        if os.path.isdir(cand):
            return cand
    sys.exit('Nie znaleziono katalogu z CSV (uploads/)')
SRC = find_uploads()
OUT = os.path.join(ROOT, 'js', 'data')
os.makedirs(OUT, exist_ok=True)

F_RDZEN  = os.path.join(SRC, 'rdzen_paleolit_mezolit_portal_ROZSZERZONY 4.csv')
F_SASIAD = os.path.join(SRC, 'sasiedzi_zagraniczne 3.csv')
F_ZLOD   = os.path.join(SRC, 'zlodowacenia_biomy 3.csv')
F_TOM    = os.path.join(SRC, 'TOM_I_SWIAT_LOWCOW_V4_bez_debaty 3.csv')
F_SLOW   = os.path.join(SRC, 'slownik 3.csv')

# ---------------------------------------------------------------- kultury
CULTURES = [
    # id, nazwa wyświetlana, kolor, słowa kluczowe (lower, substring)
    ('aszelska',     'Kultura aszelska',                        '#b7791f', ['aszel']),
    ('mikocka',      'Kultura mikocko-prądnicka',               '#c0392b', ['mikoc', 'micoquian', 'prądnic', 'keilmesser']),
    ('mustierska',   'Przemysły mustierskie',                   '#e67e22', ['mustier', 'mouster', 'taubach', 'piekarski']),
    ('dolny_tech',   'Technokompleksy dolnego paleolitu',       '#a05a2c', ['otoczak', 'chopping', 'mikroodłupk', 'mikrolitycz', 'odłupkow', 'pre-aszel', 'dolny paleolit', 'dolnopaleolit', 'dolnopaleolityczn', 'heidelberg', 'erectus']),
    ('jerzmanowicka','Jerzmanowicki (LRJ)',                     '#5b2c6f', ['jerzmanowic', 'lincombian', 'lrj']),
    ('bohunicka',    'Bohunicien',                              '#af7ac5', ['bohunic']),
    ('szelecka',     'Szeletien',                               '#7d3c98', ['szele']),
    ('epigrawecka',  'Epigrawettien',                           '#48c9b0', ['epigrav', 'epigraw']),
    ('grawecka',     'Grawettien',                              '#1e8449', ['grawet', 'gravett', 'pavlov', 'kostien', 'willendorf', 'předmost']),
    ('oryniacka',    'Oryniak',                                 '#2e86c1', ['oryni', 'aurigna', 'protoaurig']),
    ('wolkuszanska', 'Wołkuszańska / krąg z liściakami',        '#cb4335', ['wołkusz', 'krems']),
    ('hamburska',    'Kultura hamburska',                       '#b7950b', ['hamburg', 'hambursk', 'creswell']),
    ('magdalenska',  'Magdalenien',                             '#d35400', ['magdalen', 'magdaleń']),
    ('federmesser',  'Federmesser / ABP (tylczaki łukowe)',     '#8e44ad', ['federmesser', 'abp', 'arch backed', 'lyngb', 'witow', 'bromme', 'tylczakami łukowymi', 'łukowe tylczaki', 'tylczaki łukowe']),
    ('ahrensburg',   'Ahrensburg / kompleks tylczakowy',        '#3498db', ['ahrensburg', 'callenhardt', 'tanged points']),
    ('swiderska',    'Kultura świderska',                       '#e74c3c', ['świder', 'swider', 'rydieńsk', 'otp', 'ytp', 'mazowieck']),
    ('kr_tarnowski', 'Krąg tarnowski (łukowo-tylczaki)',        '#f0a35e', ['tarnowski', 'łukowo-tylczak']),
    ('duvensee',     'Duvensee (wczesny mezolit)',              '#16a085', ['duvensee', 'duvensien', 'duvens']),
    ('maglemose',    'Maglemose',                               '#2980b9', ['maglemos']),
    ('beuronien',    'Beuronien (mezolit sudecki)',             '#009688', ['beuron']),
    ('komornicka',   'Kultura komornicka',                      '#138d75', ['komornic', 'stawinogiańsk']),
    ('janislawicka', 'Krąg janisławicki',                       '#f39c12', ['janisławic', 'kundajsk', 'kokrow', 'północnopolskie']),
    ('chojnicka',    'Ch. chojnicko-pieńkowska',                '#8d6e63', ['chojnic', 'pieńkowsk', 'bobrzańsk']),
    ('zedmar',       'Zedmar (paraneolit)',                     '#76d7c4', ['zedmar']),
    ('sporne',       'Materiały sporne / bez diagnozy',          '#808b96', []),
]
CULT_BY_ID = {c[0]: {'nazwa': c[1], 'kolor': c[2]} for c in CULTURES}
BLOK_FALLBACK = {
    'PD': 'dolny_tech', 'PS': 'mustierska', 'PG_EUP': 'oryniacka', 'PG_GRAV': 'grawecka',
    'PG_EPI': 'epigrawecka', 'MAG': 'magdalenska', 'SCH': 'ahrensburg', 'MEZ_W': 'maglemose',
    'MEZ_P': 'komornicka', 'SPOR': 'sporne',
}

def map_culture(text, blok_id):
    t = (text or '').lower()
    if not t.strip() or 'brak potwierdzonych' in t:
        return 'sporne'
    for cid, _n, _k, keys in CULTURES:
        if any(k in t for k in keys):
            return cid
    if 'niepewna' in t or 'wielofazow' in t or 'wielokulturow' in t or '?' in t:
        return 'sporne'
    return BLOK_FALLBACK.get(blok_id, 'sporne')

# ---------------------------------------------------------------- parsery
def read_dicts(path, delim):
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f, delimiter=delim))

def to_int(x, default=None):
    try:
        return int(float(str(x).replace(',', '.').strip()))
    except Exception:
        return default

def fmt(bp):
    if bp is None: return None
    return bp

# ---------------------------------------------------------------- rdzeń
sites = []
for r in read_dicts(F_RDZEN, ';'):
    od, do = to_int(r.get('data_norm_od_calBP')), to_int(r.get('data_norm_do_calBP'))
    lat, lon = r.get('lat', '').strip(), r.get('lon', '').strip()
    if not lat or not lon or od is None or do is None:
        print('  !! pominięty (brak gps/dat):', r.get('id_portal'))
        continue
    blok = r.get('chronologia_blok_id', '').strip()
    kult_raw = r.get('okres_kultura', '')
    cid = map_culture(kult_raw, blok)
    m = re.search(r'duplikat_patrz_(PM-\d+)', r.get('uzytek_portal', '') or '')
    sites.append({
        'id': r['id_portal'].strip(),
        'nazwa': r['nazwa_stanowiska'].strip(),
        'kraj': 'Polska',
        'kolekcja': 'rdzen',
        'lat': float(lat), 'lon': float(lon),
        'gps_precyzja': r.get('gps_precyzja', ''),
        'blok': blok,
        'blok_nazwa': r.get('chronologia_blok', ''),
        'blok_kolejnosc': to_int(r.get('chronologia_kolejnosc'), 99),
        'blok_zakres': r.get('chronologia_zakres', ''),
        'od': od, 'do': do,
        'kultura': cid,
        'kultura_raw': kult_raw,
        'typ': r.get('typ_stanowiska', ''),
        'homininy': [h.strip() for h in r.get('hominin', '').split(';') if h.strip()],
        'warstwa': r.get('warstwa', ''),
        'rola': [x.strip() for x in r.get('rola_portalu', '').split(';') if x.strip()],
        'status': r.get('weryfikacja_status', ''),
        'pewnosc_datowania': r.get('pewnosc_datowania', ''),
        'datowanie_tekst': r.get('datowanie', ''),
        'metoda': r.get('metoda_datowania', ''),
        'adna': r.get('aDNA', ''),
        'epoki': [e.strip() for e in r.get('epoki_tagi', '').split(';') if e.strip()],
        'region': r.get('region_geo_nazwa', ''),
        'woj': r.get('wojewodztwo', ''),
        'powiat': r.get('powiat', ''),
        'gmina': r.get('gmina_miejscowosc', ''),
        'fizgeo': r.get('lokalizacja_fizycznogeograficzna', ''),
        'co_wiemy': r.get('co_wiemy', ''),
        'czego_nie_wiemy': r.get('czego_nie_wiemy', ''),
        'zrodlo': r.get('glowne_zrodlo', ''),
        'zrodla2': r.get('zrodla_zweryfikowane', ''),
        'powiazane': [p.strip() for p in r.get('powiazane_id', '').split(';') if p.strip()],
        'duplikat_patrz': m.group(1) if m else '',
    })

# ---------------------------------------------------------------- sąsiedzi
neighbors = []
for r in read_dicts(F_SASIAD, ';'):
    od, do = to_int(r.get('data_norm_od_calBP')), to_int(r.get('data_norm_do_calBP'))
    blok = r.get('chronologia_blok_id_pl', '').strip()
    raw = ' '.join([r.get('nazwa_stanowiska', ''), r.get('powiazana_kultura_polska', '')])
    neighbors.append({
        'id': r['id_portal'].strip(),
        'nazwa': r['nazwa_stanowiska'].strip(),
        'kraj': r.get('kraj', ''),
        'kolekcja': 'sasiad',
        'lat': float(r['lat']), 'lon': float(r['lon']),
        'gps_precyzja': 'przyblizona',
        'blok': blok,
        'od': od, 'do': do,
        'kultura': map_culture(raw, blok),
        'kultura_raw': r.get('powiazana_kultura_polska', ''),
        'typ_powiazania': r.get('typ_powiazania', ''),
        'status': r.get('weryfikacja_status', ''),
        'co_wiemy': r.get('co_wiemy', ''),
        'czego_nie_wiemy': r.get('czego_nie_wiemy', ''),
        'zrodlo': r.get('glowne_zrodlo', ''),
    })

# ---------------------------------------------------------------- fazy klimatu (z pliku użytkownika)
def parse_linia(s):
    pts = []
    for part in (s or '').split('|'):
        part = part.strip()
        if not part or ':' not in part: continue
        nazwa, geo = part.rsplit(':', 1)
        try:
            la, lo = geo.split(',')
            pts.append({'nazwa': nazwa.strip(), 'lat': float(la), 'lon': float(lo)})
        except ValueError:
            pass
    return pts

fazy = []
for r in read_dicts(F_ZLOD, ';'):
    fazy.append({
        'id': r['id'].strip(),
        'nazwa': r['nazwa'].strip(),
        'od_tys': float(str(r['od_tys_lat_bp']).replace(',', '.')),
        'do_tys': float(str(r['do_tys_lat_bp']).replace(',', '.')),
        'opis_biomu': r.get('opis_biomu', ''),
        'kierunek_ladolodu': r.get('kierunek_ladolodu', ''),
        'kolor_biomu': r.get('kolor_biomu', '#cccccc'),
        'kolor_ladolodu': r.get('kolor_ladolodu') or '',
        'pewnosc': r.get('pewnosc', ''),
        'bloki': [b.strip() for b in r.get('powiazane_chronologia_blok_id', '').split(';') if b.strip()],
        'linia_pl': parse_linia(r.get('zasieg_ladolodu_linia_punkty', '')),
        'zrodla': r.get('zrodla', ''),
    })
# porządek: od najstarszej (max od_tys) do najnowszej
fazy.sort(key=lambda f: -f['od_tys'])

# ---------------------------------------------------------------- bloki (z rdzenia)
bloki = {}
for s in sites:
    if s['blok'] and s['blok'] not in bloki:
        bloki[s['blok']] = {'id': s['blok'], 'nazwa': s['blok_nazwa'], 'zakres': s['blok_zakres'], 'kolejnosc': s['blok_kolejnosc']}
bloki = sorted(bloki.values(), key=lambda b: b['kolejnosc'])

# ---------------------------------------------------------------- tom I
tom = []
for r in read_dicts(F_TOM, ','):
    if not r.get('Numer', '').strip().isdigit(): continue
    tom.append({'n': int(r['Numer']), 'tytul': r['Tytuł'].strip(), 'tresc': r['Treść']})
tom.sort(key=lambda x: x['n'])

# ---------------------------------------------------------------- słownik
slownik = []
for r in read_dicts(F_SLOW, ';'):
    slownik.append({
        'id': r['id'].strip(), 'termin': r['termin'].strip(), 'kategoria': r['kategoria'].strip(),
        'definicja': r['definicja'].strip(),
        'zobacz_tez': [z.strip() for z in (r.get('zobacz_tez') or '').split(';') if z.strip()],
    })

# ---------------------------------------------------------------- zapis
def dump(name, obj, varname):
    p = os.path.join(OUT, name)
    with open(p, 'w', encoding='utf-8') as f:
        f.write('// Wygenerowano przez tools/build_data.py — nie edytuj ręcznie.\n')
        f.write('window.%s = ' % varname)
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n')
    print('  zapisano', p, '%.1f KB' % (os.path.getsize(p) / 1024))

cult_list = [{'id': c[0], 'nazwa': c[1], 'kolor': c[2]} for c in CULTURES]

# ---------------------------------------------------------------- fazy GŁĘBOKIE (3,3 mln – 800 tys.)
# Rozszerzenie osi do pierwszych śladów homininów (poza rdzeniem portalu — tło
# globalne). Źródła przekrojów lądolodu: Batchelor i in. 2019 (późny Gauss i
# wczesny Matuyama), pozostałe odcinki: krzywa eustatyczna + stan interglacjalny.
DEEP_FAZY = [
    {'id': 'glep_narzedzia', 'nazwa': 'Pierwsze narzędzia kamienne — Lomekwi i Oldowan (Afryka)',
     'od_tys': 3300.0, 'do_tys': 1800.0,
     'opis_biomu': 'Najstarsze znane narzędzia kamienne: Lomekwi 3 (Kenia, ~3,3 mln lat) i tradycja oldowańska '
                   '(Gona, Etiopia, ~2,6 mln). Rodzaj Homo pojawia się ~2,8 mln lat temu. Afryka Wschodnia: '
                   'cykle wilgotno-suche napędzane precesją (okresowe „zazielenienie" Północnej Afryki). '
                   'W półkuli północnej rosną zlodowacenia późnego pliocenu (przekroje: późny Gauss ~2,7–2,8 mln, '
                   'wczesny Matuyama ~2,5 mln — Batchelor i in. 2019). Ziemia przed BMC — brak jakichkolwiek '
                   'śladów obecności człowieka.',
     'kierunek_ladolodu': '', 'kolor_biomu': '#bfa76a', 'kolor_ladolodu': '',
     'pewnosc': 'niska — epoka poza rdzeniem bazy portalu; warstwa tła globalnego',
     'bloki': [], 'linia_pl': [], 'glebokie': True,
     'zrodla': 'Harmand i in. 2015 (Lomekwi 3) | Semaw i in. 2003 (Gona, Oldowan) | Batchelor i in. 2019 (Nat. Commun. 10:3713)'},
    {'id': 'glep_ekspansja', 'nazwa': 'Ekspansja Homo — wyjście z Afryki i Acheul',
     'od_tys': 1800.0, 'do_tys': 800.0,
     'opis_biomu': 'Homo erectus opuszcza Afrykę: Dmanisi (Gruzja) po ~1,85 mln lat, wczesne ślady w Chinach '
                   '(Shangchen ~2,1 mln — jeszcze w poprzedniej epoce), Jawa (Sangiran), a po ~1,4–1,2 mln lat '
                   'Europa południowa (Orce, Atapuerca/Sima del Elefante). Tradycja rękojeści (Acheul) od ~1,76 mln '
                   '(Kokiselei 4, Kenia). Przełom środkowoplejstoceński (~1,25–0,7 mln): cykle glacjalne '
                   'wzmagały się z ~41 do ~100 tys. lat — coraz większe lądolody półkuli północnej.',
     'kierunek_ladolodu': '', 'kolor_biomu': '#a99e78', 'kolor_ladolodu': '',
     'pewnosc': 'niska — epoka poza rdzeniem bazy portalu; warstwa tła globalnego',
     'bloki': [], 'linia_pl': [], 'glebokie': True,
     'zrodla': 'Lordkipanidze i in. 2013 (Dmanisi) | Zhu i in. 2018 (Shangchen) | Batchelor i in. 2019'},
]
# kolejność: najstarsza → najmłodsza; fazy głębokie PRZED 17 fazami z CSV (CSV nietknięte)
fazy_all = DEEP_FAZY + fazy

# kamienie milowe epoki homininów (renderowane na osi czasu jako ♦)
MILESTONES = [
    {'bp': 3300000, 't': 'Lomekwi 3 (Kenia) — najstarsze narzędzia kamienne ~3,3 mln l.'},
    {'bp': 2800000, 't': 'rodzaj Homo (Ledi-Geraru, Etiopia) ~2,8 mln l.'},
    {'bp': 2600000, 't': 'Oldowan — Gona (Etiopia) ~2,6 mln l.'},
    {'bp': 2100000, 't': 'Shangchen (Chiny) — najstarsze ślady poza Afryką? ~2,1 mln l.'},
    {'bp': 1850000, 't': 'Dmanisi (Gruzja) — Homo erectus poza Afryką ~1,85 mln l.'},
    {'bp': 1760000, 't': 'Acheul — rękojeści (Kokiselei 4, Kenia) ~1,76 mln l.'},
    {'bp': 1400000, 't': 'Sima del Elefante (Atapuerca, Hiszpania) ~1,4–1,2 mln l.'},
    {'bp': 1200000, 't': 'Orce / Fuente Nueva (Hiszpania) ~1,2 mln l.'},
    {'bp': 900000, 't': 'Happisburgh (Anglia) — ludy północnej Europy ~0,9 mln l.'},
]

dump('sites.js', {'rdzen': sites, 'sasiedzi': neighbors}, 'SITES')
dump('meta.js', {'kultury': cult_list, 'bloki': bloki, 'fazy': fazy_all, 'milestones': MILESTONES}, 'META')
dump('glossary.js', slownik, 'GLOSSARY')
dump('tom1.js', tom, 'TOM1')

# raport kontroli
from collections import Counter
ck = Counter(s['kultura'] for s in sites)
cn = Counter(n['kultura'] for n in neighbors)
print('\nKultury (rdzeń):', dict(sorted(ck.items(), key=lambda x: -x[1])))
print('\nKultury (sąsiedzi):', dict(sorted(cn.items(), key=lambda x: -x[1])))
print('\nStanowiska rdzeń:', len(sites), '| sąsiedzi:', len(neighbors), '| fazy:', len(fazy),
      '| rozdziały:', len(tom), '| hasła:', len(slownik))
