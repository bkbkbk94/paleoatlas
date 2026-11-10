#!/usr/bin/env bash
# ============================================================================
#  PaleoAtlas — pełna bateria kontrolna (jedno polecenie, jak w RUNBOOK §3)
#  Uruchamia 6 suit po kolei na lokalnym serwerze statycznym.
#
#  Wymagania:
#    • node ≥ 18
#    • Chromium/Chrome (ścieżka w PA_CHROME; domyślnie `chromium` z PATH)
#    • puppeteer-core (PA_PUPPETEER; domyślnie /tmp/pptr/node_modules/puppeteer-core)
#
#  Kody wyjścia: 0 = wszystkie suity zielone · 1 = co najmniej jedna czerwona.
#  Perf (tools/perfcheck.js) jest DOMYŚLNIE raportem doradczym (mierzy czasy na
#  software-canvas; w CI bywa szum) — ustaw PA_STRICT_PERF=1, by był bramką.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

export PA_CHROME="${PA_CHROME:-$(command -v chromium || command -v chromium-browser || echo /usr/bin/chromium)}"
export PA_PUPPETEER="${PA_PUPPETEER:-/tmp/pptr/node_modules/puppeteer-core}"

if [ ! -e "$PA_CHROME" ]; then
  echo "❌ Nie znalazłem Chromium (PA_CHROME=$PA_CHROME). Zainstaluj przeglądarkę albo podaj ścieżkę."
  exit 1
fi
if [ ! -e "$PA_PUPPETEER" ]; then
  echo "❌ Nie znalazłem puppeteer-core (PA_PUPPETEER=$PA_PUPPETEER)."
  echo "   Szybka instalacja:  mkdir -p /tmp/pptr && (cd /tmp/pptr && npm i puppeteer-core)"
  echo "   albo:               PA_PUPPETEER=\$(node -p \"require.resolve('puppeteer-core')\")"
  exit 1
fi

LOGDIR="${PA_LOGDIR:-/tmp/pa-tests}"
mkdir -p "$LOGDIR"

SUITES=(e2e.suite.js e2e.mobile.suite.js ice.science.suite.js globe.suite.js biomeshots.js)
fail=0
declare -a FAILED=()

for s in "${SUITES[@]}"; do
  echo "──────────────────────────────────────────────────────────────"
  echo "▶ $s"
  if node "tools/$s" >"$LOGDIR/$s.log" 2>&1; then
    grep -E "PODSUMOWANIE|MOBILNE:|ICE-SCIENCE:|GLOBE:|BIOME-SHOTS" "$LOGDIR/$s.log" | tail -1
  else
    fail=1; FAILED+=("$s")
    grep -E "^❌|PODSUMOWANIE|MOBILNE:|ICE-SCIENCE:|GLOBE:|BIOME-SHOTS|💥" "$LOGDIR/$s.log" | tail -6
  fi
done

echo "──────────────────────────────────────────────────────────────"
echo "▶ perfcheck.js (doradczo)"
if node tools/perfcheck.js >"$LOGDIR/perfcheck.js.log" 2>&1; then
  grep -E "PERFCHECK:" "$LOGDIR/perfcheck.js.log" | tail -1
else
  grep -E "^❌|PERFCHECK:" "$LOGDIR/perfcheck.js.log" | tail -4
  if [ "${PA_STRICT_PERF:-0}" = "1" ]; then fail=1; FAILED+=("perfcheck.js"); else echo "   (raport doradczy — nie blokuje; PA_STRICT_PERF=1 = bramka)"; fi
fi

echo "──────────────────────────────────────────────────────────────"
if [ "$fail" = "0" ]; then
  echo "✅ BATERIA ZIELONA — logi: $LOGDIR"
else
  echo "❌ BATERIA CZERWONA: ${FAILED[*]} — logi: $LOGDIR"
fi
exit "$fail"
