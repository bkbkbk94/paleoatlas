#!/usr/bin/env bash
# ============================================================================
# fetch_biodata.sh — przywraca SUROWE źródła danych biomów do /home/user/biodata
#
# Po co: produkty końcowe (js/data/biome/*.png, biome_meta.js, biome_pollen.js)
#        są już zbudowane i zwalidowane — surowe pliki .nc (≈3 GB) usuwamy
#        z workspace, bo i tak przekraczają limit snapshotu. Ten skrypt
#        pobiera je ponownie jednym poleceniem, gdy trzeba przebudować
#        warstwę (tools/build_biomes.py) lub puścić pełną walidację
#        (tools/check_biomes.py).
#
# Źródła (pełne cytaty: README + tabela „O danych” w portalu):
#   Beyer, Krapp & Manica 2020, Sci. Data 7:236   — pastclim v1.0.0
#   (artykuł figshare 19723405)
#   Krapp, Beyer, Edmundson, Valdes & Manica 2021, Sci. Data 8:228
#   Barreto, Holden, Edwards & Rangel 2023, GEB 32:1034 — PALEO-PGEM-Series
#   (artykuł figshare 20379663, CC-BY 4.0)
#   BIOME 6000 v4.2 — arkusz b6k/BIOME4-2.xls TRZYMANY lokalnie (4 MB,
#   nie usuwaj!) — źródło oryginału: BIOME 6000 project (Univ. of Reading).
# ============================================================================
set -euo pipefail
D=/home/user/biodata
mkdir -p "$D"
cd "$D"

echo '== Beyer 2020 all_vars (1,53 GB) =='
wget -O beyer_all.nc 'https://ndownloader.figshare.com/files/35116444'

echo '== Krapp 2021 biome (18 MB; tylko jeśli brak) =='
[ -f krapp_biome.nc ] || \
  wget -O krapp_biome.nc 'https://ndownloader.figshare.com/files/35127490'

echo '== PALEO-PGEM bioclim (bio1/5/6/12/15/16/17; ~1,5 GB) =='
for p in 'bio1 42383337' 'bio5 42383301' 'bio6 42383304' 'bio12 42383343' \
         'bio15 42383349' 'bio16 42383340' 'bio17 42383325'; do
  set -- $p
  [ -f "pgem_$1.nc" ] || wget -O "pgem_$1.nc" "https://ndownloader.figshare.com/files/$2"
  echo "  $1 OK"
done

echo 'GOTOWE — możesz uruchomić: python3 tools/build_biomes.py && python3 tools/check_biomes.py'
