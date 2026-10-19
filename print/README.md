# 蒸溜所一覧の印刷物・画像

サイトのデータ（`site/data.js`）から、次の3つを作る。

| 作るもの | ファイル | 大きさ |
|---|---|---|
| 地方別の一覧表 | `out/japanese_whisky_distilleries_list.pdf` | A4縦・7ページ |
| 日本地図 | `out/japanese_whisky_distilleries_map.png` / `.pdf` | A3横（PNGは4960×3508） |
| 1蒸溜所1枚のカード | `out/cards/<番号>_<id>.png` | 1080×1350（インスタの縦長） |

```
bash print/render.sh          # 全部
bash print/render.sh list     # 一覧表だけ（map / cards も同様）
```

- 蒸溜所を足したら、`python3 print/geocode.py` で座標を取ってから render.sh（国土地理院の住所検索APIを使う。結果は `geo.json`）
- 地図の輪郭は「地球地図日本」（国土地理院）を dataofjapan/land 経由で取り込み、`simplify_map.py` で軽くしたもの（`japan_simplified.json`）。出典の明記が必要で、営利目的で使うときは国土地理院への利用報告が必要
- `out/` は作り直せるので git に入れない
