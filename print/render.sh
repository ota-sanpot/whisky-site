#!/bin/bash
# print/out/*.html を PDF と PNG に書き出す
# 使い方: bash print/render.sh [list|map|cards|all]   （既定は all）
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WHAT="${1:-all}"
node build.mjs
O="$PWD/out"
run() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=8000 "$@" >/dev/null 2>&1; }
if [[ "$WHAT" == all || "$WHAT" == list ]]; then
  run --no-pdf-header-footer --print-to-pdf="$O/japanese_whisky_distilleries_list.pdf" "file://$O/list.html"
fi
if [[ "$WHAT" == all || "$WHAT" == map ]]; then
  run --window-size=2480,1754 --force-device-scale-factor=2 --screenshot="$O/japanese_whisky_distilleries_map.png" "file://$O/map.html"
  run --no-pdf-header-footer --print-to-pdf="$O/japanese_whisky_distilleries_map.pdf" "file://$O/map.html"
fi
if [[ "$WHAT" == all || "$WHAT" == cards ]]; then
  mkdir -p "$O/cards"
  while read -r no id; do
    run --window-size=1080,1350 --screenshot="$O/cards/${no}_${id}.png" "file://$O/cards.html?id=$id"
  done < "$O/ids.txt"
fi
ls -la "$O" | grep -v html
