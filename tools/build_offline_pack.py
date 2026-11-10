#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Buduje samowystarczalny plik offline całego PaleoAtlas:
   jeden HTML ze WZCYSTKIM inline (css, leaflet, d3, wszystkie js/data/*.js,
   app.js, globe.js + 56 rastrów biomów jako data-URI).

   Wejście:  index.html + wskazane w nim zasoby (relatywne)
   Wyjście:  ../PaleoAtlas_OFFLINE.html (katalog nadrzędny repo — wierzch listy plików)

   Uwagi:
   - 'js/data/biome/' + e.file  →  __BIOME_URI(e.file)  (3 miejsca w app.js; asercje!)
   - PNG biomów też jako Image nie taintują canvasu (data-URI) → siatki klas,
     tooltipy i biomy na globusie działają OFFLINE w 100% (w przeciwieństwie do file://).
   - leaflet.css: images/layers.png + images/marker-icon.png → data-URI (ikonka kontrolki).
   - Sekcja UTRZYMANIE: po zmianach portalu przebuduj:  python3 tools/build_offline_pack.py
"""
import base64, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT.parent / 'PaleoAtlas_OFFLINE.html'

def b64(p):
    return 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode()

def fail(msg):
    sys.exit('BŁĄD BUILD: ' + msg)

html = (ROOT / 'index.html').read_text(encoding='utf8')

# ---------------------------------------------------------------- 1. CSS inline
def inline_css(m):
    href = m.group(1)
    css = (ROOT / href).read_text(encoding='utf8')
    if 'leaflet.css' in href:
        for img in ('images/layers.png', 'images/marker-icon.png'):
            uri = b64(ROOT / 'vendor/leaflet' / img)
            css = css.replace(img, uri)
        for dead in ('images/marker-shadow.png', 'images/layers-2x.png', 'images/marker-icon-2x.png'):
            if dead in css:  # retina warianty — wstaw też, jeśli referencjonowane
                css = css.replace(dead, b64(ROOT / 'vendor/leaflet' / dead))
    return '<style>/* inline: ' + href + ' */\n' + css + '\n</style>'

html, n_css = re.subn(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
assert n_css == 2, f'oczekiwano 2 arkuszy CSS, mam {n_css}'

# ---------------------------------------------------------------- 1b. ikony / manifest
# Plik offline jest JEDNYM plikiem otwieranym z dysku: manifest i zewnętrzne ikony
# nie mają dokąd prowadzić (przeglądarka próbowałaby je pobrać i „pstrykać" siecią).
# Dlatego: ikonę apple-touch wbudowujemy jako data-URI, a link do manifestu usuwamy.
icon = b64(ROOT / 'assets/icon-180.png')
html, n_icon = re.subn(r'<link rel="apple-touch-icon" href="assets/icon-180.png">',
                       f'<link rel="apple-touch-icon" href="{icon}">', html)
assert n_icon == 1, f'oczekiwano 1 ikony apple-touch, mam {n_icon}'
html, n_man = re.subn(r'\n?<link rel="manifest"[^>]*>', '', html)
assert n_man == 1, 'brak linku manifestu do usunięcia'
html = html.replace('<link rel="image_src" href="assets/og-image.png">', '')
# favicon: od 2026-11 jest to plik marki (assets/icon.svg), a nie data-URI emoji —
# w paczce jednoplikowej musi być wbudowany, inaczej przeglądarka szuka go na dysku
svg_uri = 'data:image/svg+xml;base64,' + base64.b64encode(
    (ROOT / 'assets/icon.svg').read_bytes()).decode()
html, n_fav_svg = re.subn(r'<link rel="icon" href="assets/icon\.svg" type="image/svg\+xml">',
                          f'<link rel="icon" href="{svg_uri}" type="image/svg+xml">', html)
assert n_fav_svg == 1, f'oczekiwano 1 favicony SVG, mam {n_fav_svg}'
html, n_fav_png = re.subn(r'<link rel="icon" sizes="192x192" href="assets/icon-192\.png">',
                          f'<link rel="icon" sizes="192x192" href="{b64(ROOT / "assets/icon-192.png")}">', html)
assert n_fav_png == 1, f'oczekiwano 1 favicony PNG, mam {n_fav_png}'

# ---------------------------------------------------------------- 2. rastry biomów → BIOME_PNG
pngs = sorted((ROOT / 'js/data/biome').glob('*.png'))
assert len(pngs) == 56, f'oczekiwano 56 PNG, mam {len(pngs)}'
png_map = {p.name: b64(p) for p in pngs}
boot = (
  '/* wstrzyknięte rastry biomów (build_offline_pack.py) */\n'
  'window.BIOME_PNG = ' + json.dumps(png_map, separators=(',', ':')) + ';\n'
  "window.__BIOME_URI = function (f) { return (window.BIOME_PNG && window.BIOME_PNG[f]) || ('js/data/biome/' + f); };\n"
)

# ---------------------------------------------------------------- 3. skrypty inline
def inline_js(m):
    src = m.group(1)
    body = (ROOT / src).read_text(encoding='utf8')
    if src == 'js/app.js':
        body, n1 = re.subn(re.escape("'js/data/biome/' + e.file"), '__BIOME_URI(e.file)', body)
        body, n2 = re.subn(re.escape("'js/data/biome/' + ne.file"), '__BIOME_URI(ne.file)', body)
        assert n1 >= 2 and n2 == 1, f'podmiany biome-uri: {n1}+{n2} (oczekiwano ≥2+1)'
    if '</script' in body.lower():
        fail(f'{src} zawiera </script> — inlinowanie niebezpieczne')
    return '<script>/* inline: ' + src + ' */\n' + body + '\n</script>'

first = True
def inline_js_with_boot(m):
    global first
    out = ('<script>' + boot + '</script>\n' if first else '') + inline_js(m)
    first = False
    return out

html, n_js = re.subn(r'<script src="([^"]+)"></script>(?:\s*<!--.*?-->)?', inline_js_with_boot, html, flags=re.S)
assert n_js >= 20, f'za mało skryptów: {n_js}'
assert 'src="' not in html.replace('data:', ''), 'zostało jakieś src= (poza data:)'

OUT.write_text(html, encoding='utf8')
mb = OUT.stat().st_size / 1048576
print(f'OK  {OUT}  {mb:.1f} MB  (css={n_css}, js={n_js}, png={len(pngs)})')
