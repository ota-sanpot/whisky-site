#!/bin/bash
# 全画面を、スマホ・タブレット・PCの幅で撮る（目視確認用）
# 使い方: bash site/tests/shots.sh <出力先ディレクトリ>
# ヘッドレス Chrome は幅500px未満を描けないので、frame.html の iframe に指定幅で入れて撮る
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="${1:?出力先ディレクトリを指定してください}"
mkdir -p "$OUT"
FRAME="file://$PWD/tests/frame.html"
ROUTES=("top|" "list|#/list" "list_smoky|#/list?taste=smoky" "whisky_hibiki|#/whisky/hibiki-jh" "find|#/find?q1=none&q2=fresh" "compare|#/compare?a=yamazaki&b=hakushu" "map|#/map" "today|#/today?n=3" "distilleries|#/distilleries")
SIZES=("375,812" "375,2800" "768,1800" "1280,1800")
for entry in "${ROUTES[@]}"; do
  name="${entry%%|*}"
  hash="${entry#*|}"
  enc=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$hash")
  for size in "${SIZES[@]}"; do
    w="${size%,*}"
    h="${size#*,}"
    win_w=$(( w < 500 ? 500 : w ))
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 \
      --window-size="$win_w,$h" --screenshot="$OUT/${name}_${w}x${h}.png" "$FRAME?w=$w&h=$h&hash=$enc" >/dev/null 2>&1
  done
done
ls "$OUT"
