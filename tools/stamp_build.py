#!/usr/bin/env python3
"""tools/stamp_build.py — stempel wersji danych (js/data/build_info.js)

Po co:
  1. REPRODUKOWALNOŚĆ — skrót SHA-256 wszystkich plików js/data/ pozwala sprawdzić,
     czy zbudowana paczka offline odpowiada aktualnym danym („co dokładnie wydaliśmy").
  2. ŚWIEŻOŚĆ — liczby obiektów zapisane w stemplu muszą zgadzać się z danymi.
     Jeśli ktoś dopisze stanowisko i zapomni przestemplować, walidator to zgłosi.
  3. PRZEJRZYSTOŚĆ — portal pokazuje użytkownikowi „wersja danych · data".

Użycie:  python3 tools/stamp_build.py   (po każdej zmianie w js/data/)
"""
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "js" / "data"
OUT = DATA / "build_info.js"

# 1. Skrót treści danych (bez samego stempla — inaczej nigdy nie byłby stabilny).
files = sorted(p for p in DATA.glob("*.js") if p.name != "build_info.js")
h = hashlib.sha256()
for p in files:
    h.update(p.name.encode())
    h.update(p.read_bytes())
data_hash = h.hexdigest()

# 2. Liczby obiektów — liczone przez ten sam silnik co walidator (kolejność z index.html),
#    żeby stempel nie mógł „udawać" innych danych niż widzi przeglądarka.
NODE = r"""
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = process.argv[1];
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script src="(js\/data\/[^"]+)"/g)].map(m => m[1]);
const ctx = { console: { log() {}, warn() {}, error() {} } };
ctx.window = ctx; vm.createContext(ctx);
for (const f of order) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const all = ctx.SITES.rdzen.concat(ctx.SITES.sasiedzi);
const ice = Object.values(ctx.PALEO.ice_sets).flat();
process.stdout.write(JSON.stringify({
  stanowiska: all.length,
  kultury: ctx.META.kultury.length,
  fazy: ctx.META.fazy.length,
  przekroje: ctx.ENV.ticks.length,
  migawkiBiomow: ctx.BIOME_META.epochs.length,
  hasla: ctx.GLOSSARY.length,
  rozdzialy: ctx.TOM1.length,
  poligonyLodu: ice.length,
  poligonyZeZrodlem: ice.filter(p => p.src).length
}));
"""
try:
    counts = json.loads(subprocess.run(
        ["node", "-e", NODE, str(ROOT)], capture_output=True, text=True, check=True, timeout=180
    ).stdout)
except (subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError) as e:
    sys.exit(f"BŁĄD: nie udało się policzyć danych przez node: {e}")

# 3. Wersja commit-u, jeśli jesteśmy w repozytorium (tylko informacyjnie).
try:
    commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT,
                            capture_output=True, text=True, check=True, timeout=10).stdout.strip()
except Exception:
    commit = ""

build = {
    "dataVersion": data_hash[:12],
    "dataHash": data_hash,
    "dataFiles": len(files),
    "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    "commit": commit,
    "counts": counts,
}

# 4. Tryb --check: porównuje TYLKO niezmienne pola (skrót i liczby). Data i commit
#    zmieniają się przy każdym uruchomieniu, więc porównywanie całego pliku w CI
#    dawałoby fałszywy alarm. Ten tryb jest bramką świeżości w .github/workflows/ci.yml.
if "--check" in sys.argv:
    if not OUT.exists():
        sys.exit("BŁĄD: brak js/data/build_info.js — uruchom python3 tools/stamp_build.py")
    cur = json.loads(subprocess.run(
        ["node", "-e", "const fs=require('fs'),vm=require('vm');const c={};c.window=c;vm.createContext(c);"
                     "vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
                     "process.stdout.write(JSON.stringify(c.BUILD||{}))", str(OUT)],
        capture_output=True, text=True, check=True, timeout=60).stdout)
    drift = []
    if cur.get("dataVersion") != build["dataVersion"]:
        drift.append("skrót danych: w pliku %s, w danych %s" % (cur.get("dataVersion"), build["dataVersion"]))
    for k, v in counts.items():
        if (cur.get("counts") or {}).get(k) != v:
            drift.append("%s: w pliku %s, w danych %s" % (k, (cur.get("counts") or {}).get(k), v))
    if drift:
        print("❌ Stempel nieaktualny — dane zmieniono bez przestemplowania:")
        for d in drift:
            print("   • " + d)
        print("   Napraw: python3 tools/stamp_build.py && git add js/data/build_info.js")
        sys.exit(1)
    print(f"✅ Stempel aktualny (dane {build['dataVersion']}, {build['dataFiles']} plików).")
    sys.exit(0)

OUT.write_text(
    "// Wygenerowane przez tools/stamp_build.py — nie edytuj ręcznie.\n"
    "// dataVersion = skrót treści js/data/*.js; counts = liczby obiektów (kontrola świeżości).\n"
    "window.BUILD = " + json.dumps(build, ensure_ascii=False, indent=1) + ";\n",
    encoding="utf-8",
)
print(f"OK  js/data/build_info.js · dane {build['dataVersion']} · {counts['stanowiska']} stanowisk · "
      f"{counts['fazy']} faz · {counts['przekroje']} przekrojów · {counts['migawkiBiomow']} migawek")
