#!/bin/bash
# モックの全画面を、スマホ・タブレット・PCの幅で撮る（目視確認用）
# 使い方: bash mock/tests/shots.sh <出力先ディレクトリ>
# ヘッドレス Chrome は幅500px未満を描けないので、frame.html の iframe に指定幅で入れて撮る
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="${1:?出力先ディレクトリを指定してください}"
mkdir -p "$OUT"
FRAME="file://$PWD/tests/frame.html"
ROUTES=("top|" "search|#/?q=hibiki" "hibiki|#/whisky/hibiki-jh" "yoichi|#/whisky/yoichi" "ao|#/whisky/ao" "yamazaki|#/distillery/yamazaki" "standard|#/standard")
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
