# Japanese Whisky Guide

ジャパニーズウイスキーを1本ずつ、どこの県の、どの原酒で、どんな味で、どう飲むとうまいかまで解説するガイドです。運営は大田区サンポット。

公開URL: https://ota-sanpot.github.io/whisky-site/

## 構成

| パス | 役割 |
|------|------|
| `site/index.html` | サイト本体（骨格の HTML のみ） |
| `site/styles.css` | 見た目（CSS） |
| `site/data.js` | 銘柄・蒸溜所などのデータ（`window.WDATA`） |
| `site/app.js` | 画面描画・検索・画面遷移の JavaScript |
| `site/404.html` | 旧サイトの URL に来た人を新しいトップへ移す |
| `site/favicon.svg`, `site/apple-touch-icon.png` | アイコン |
| `site/SOURCES.md` | 事実の裏取りの記録（出典と確認日） |
| `site/tests/` | テストとスクショ確認用のスクリプト |

## 公開の仕組み

main に push すると GitHub Actions（`.github/workflows/deploy.yml`）がテストを実行し、通った場合だけ `site/` の公開用ファイル（本体4ファイル＋404.html・アイコン類）を GitHub Pages に公開します。Pages の公開元は「GitHub Actions」にしておく必要があります。

## 手元での確認

```bash
npm ci
node --test site/tests/*.check.mjs
python3 -m http.server 8799 --directory site
bash site/tests/shots.sh /tmp/whisky-shots
```

## 銘柄を増やす手順

1. メーカー公式などの一次情報で裏取りし、`site/SOURCES.md` に出典と確認日を書く
2. `site/data.js`（`window.WDATA`）に銘柄を足す
3. 味の地図・飲み方の◎○△・次の1本は「編集部の見立て」として書き、事実と混ぜない
4. テストを通してから main に push する

## 旧版

2026年9月までの Next.js 版（世界のウイスキー156銘柄・記事・好み診断）は、タグ `legacy-nextjs-2026-09-18` に残しています。`src/` と `data/` はその名残で、いまは公開していません。
