# ジャパニーズウイスキー特化リニューアル モック 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 夜のバー調・スマホ優先の単一HTMLモック（トップ／銘柄3本／山崎蒸溜所／表示基準）を、裏取り済みの実データで作る。

**Architecture:** `mock/index.html` 1ファイルに CSS・データ（`<script type="application/json" id="wdata">`）・アプリJS（ハッシュルーター）を内包する。テストは Node 組み込みのテストランナーと、既存の devDependencies にある jsdom で行い、見た目はヘッドレス Chrome のスクショと内蔵ブラウザで確かめる。既存の Next.js（`src/`）には触らない。

**Tech Stack:** 素の HTML/CSS/JavaScript、Google Fonts（Noto Sans JP）、Node 26 `node --test`、jsdom 26（`whisky-site/node_modules`）、Google Chrome ヘッドレス。

**Spec:** `docs/superpowers/specs/2026-09-18-japanese-whisky-renewal-mock-design.md`

## Global Constraints

- 作るのは `mock/` 配下だけ。`src/`・`public/`・`package.json`・`jest.config.ts` は変更しない
- テストファイル名は `*.check.mjs`（jest の既定の testMatch に拾われないようにする）。実行は `node --test mock/tests/*.check.mjs`
- 外部依存は Google Fonts の Noto Sans JP のみ。フォントは Noto Sans JP だけで、日本語に斜体を当てない
- 長いダッシュ（—、―）を使わない
- 色は `:root` の変数で定義する。夜のバー（深い茶黒の背景×琥珀）
- スマホ基準幅 375px、左右の余白 16px、横スクロールは「次の1本」のカード列だけ。PC・タブレットは最大幅 720px で中央寄せ
- ボトル写真は使わない（色と文字だけの簡易なボトル図）
- 味の地図・飲み方の◎○△・次の1本には「編集部の見立て」と表示する
- 事実は一次情報で裏取り済みのものだけ。取れないものは「非公表」「未確認」と書く
- コミットは whisky-site リポ（ota-sanpot 名義）。`git add` はパスを明示し、push はしない
- コードのコメントは日本語、関数・変数名は英語

## ファイル構成

| ファイル | 役割 |
|------|------|
| `mock/index.html` | モック本体（CSS・データ・アプリJS） |
| `mock/SOURCES.md` | 裏取りの記録（事実・出典・確認日・未解決事項） |
| `mock/tests/helpers.mjs` | テスト共通（HTML読込、データ抽出、jsdomでの起動と画面遷移） |
| `mock/tests/data.check.mjs` | データの整合性テスト |
| `mock/tests/render.check.mjs` | 画面描画・検索・画面遷移のテスト |
| `mock/tests/shots.sh` | 全画面を3つの幅でスクショする確認用スクリプト |
| `/Users/nozaki/Desktop/CEO/.claude/launch.json` | 内蔵ブラウザ用のプレビュー設定を1件追加（CEOリポ側・コミットしない） |

---

### Task 1: 裏取りの記録・データ・データのテスト

**Files:**
- Create: `mock/SOURCES.md`
- Create: `mock/index.html`（骨組み＋データ）
- Create: `mock/tests/helpers.mjs`
- Create: `mock/tests/data.check.mjs`

**Interfaces:**
- Produces: `mock/index.html` 内の `<script type="application/json" id="wdata">`（以後のタスクはこの JSON を読む）。キー: `checkedAt`, `standards{jw,foreign,unknown}{label,desc}`, `standardRule{title,summary,items[{k,v}],sources[]}`, `distilleries[]{id,name,nameEn,kana,maker,pref,hasPage,(address,founded,lead,features[{k,v}],singleMalts[],sources[])}`, `whiskies[]{id,name,nameEn,short,kana,aliases[],maker,type,standard,standardNote,look{liquid,label,mark,char},components[{distillery|null,country,kind,note?}],originNote,componentsNote,casks,taste{line,x,y},serve{straight,rock,highball,mizuwari}(1-3),next[{id|null,name,why}],official[{k,v}],story[],specs[{k,v}],sources[{title,url,used}]}`
- Produces: `helpers.mjs` の `html()`, `readData()`, `load(hash)`→`{dom,window,document,errors}`, `go(env, hash)`
- Produces: HTML の骨組みの ID: `#app`（画面の差し込み先）, `#checked-at`（フッターの確認日）

- [ ] **Step 1: 裏取りの記録を書く**

`mock/SOURCES.md`:

```markdown
# 裏取りの記録（モック用）

確認日: 2026-09-18。公式ページ等の本文を取得して確認した（年齢確認の先にあって本文を読めていないものは「未解決・注意」に書く）。

## 響 JAPANESE HARMONY（サントリー）
| 事実 | 内容 | 出典 |
|------|------|------|
| 容量・度数 | 700ml・43% | サントリー商品情報 https://products.suntory.co.jp/d/4901777270688/ |
| 希望小売価格 | 8,000円（税別） | 同上 |
| 原材料 | モルト、グレーン | 同上 |
| 表示基準 | 「表示基準に合致した製品」と明記 | 同上 |
| 原酒 | 山崎・白州のモルト原酒、知多のグレーン原酒 | WHISKY Magazine Japan 2015-03-17（発表会でのチーフブレンダーの説明の報道） https://whiskymag.jp/hjh_2/ |
| 発売日 | 2015年3月10日 | WHISKY Magazine Japan 2015-01-29 https://whiskymag.jp/hjh_new/ |
| ボトル・ラベル | 二十四節気の24面カット、越前和紙ラベルに墨文字 | ウイスキー・オン・ザ・ウェブ https://www.suntory.co.jp/whisky/products/0000000038/0000000114.html |
| 蒸溜所の県 | 山崎＝大阪府、白州＝山梨県、知多＝愛知県 | https://www.suntory.co.jp/factory/yamazaki/about/ （工場一覧）、https://www.suntory.co.jp/whisky/products/0000000038/0000005530.html |

## シングルモルト余市（ニッカウヰスキー）
| 事実 | 内容 | 出典 |
|------|------|------|
| 説明・香り・味・余韻 | 公式の説明（要約して掲載） | https://www.nikka.com/brands/yoichi_miyagikyo/products/ |
| 度数・容量 | 45%・700ml | 同上 |
| 蒸溜所 | 1934年、ニッカのはじまりの地。石炭直火蒸溜、冷涼な気候 | https://www.nikka.com/products/malt/yoichi_miyagikyo/sp/distilleries/index.html |
| 発売 | いまの中味は2015年9月1日発売。年数表記品は2015年8月末で販売終了 | アサヒビール 2015-06-15 https://www.asahibeer.co.jp/news/2015/0615_3.html |
| 価格改定 | 2024年4月1日出荷分から改定（対象に余市を含む） | アサヒビール 2023-12-19 https://www.asahibeer.co.jp/news/2023/1219.html |
| 希望小売価格 | 7,000円（税別） | 未解決1を参照 |
| 表示基準 | 合致 | 未解決1を参照 |
| 宮城峡（次の1本） | 仙台・宮城峡、甘く華やかでなめらか | https://www.nikka.com/brands/yoichi_miyagikyo/products/ |

## 碧Ao（サントリー）
| 事実 | 内容 | 出典 |
|------|------|------|
| 容量・度数・価格・原材料 | 700ml・43%・6,000円（税別）・モルト、グレーン | https://www.suntory.co.jp/whisky/products/0000000075/0000007878.html |
| 原酒 | 5カ国（アイルランド、スコットランド、アメリカ、カナダ、日本）の自社蒸溜所の原酒のみ。スパニッシュオーク樽30年以上の山崎モルト原酒、8年以上のバーボン原酒を使用 | サントリー No.14955（2025-12-16） https://www.suntory.co.jp/news/article/14955.html |
| 刷新 | 2025年12月中旬以降に初のリニューアル。商品名を SUNTORY WORLD WHISKY から SUNTORY WHISKY へ | 同上 |
| 初回発売 | 2019年4月、数量限定 | WHISKY Magazine Japan 2019-09-09 https://whiskymag.jp/ao_release_2nd/ （サントリーの当時の発表ページは削除済み） |

## 山崎蒸溜所（サントリー）
| 事実 | 内容 | 出典 |
|------|------|------|
| 所在地 | 〒618-0001 大阪府三島郡島本町山崎5-2-1 | https://www.suntory.co.jp/factory/yamazaki/access/ |
| 沿革 | 1923年着工、1924年竣工。日本初のモルトウイスキー蒸溜所 | https://www.suntory.co.jp/factory/blog-d/000196.html |
| 水・立地 | 離宮の水（名水百選）、天王山と三川の合流点、霧・湿潤 | 同上 |
| 造り | 工程ごとに複数の要素を組み合わせ、多彩な原酒をつくり分け | https://www.suntory.co.jp/factory/yamazaki/about/ |
| 樽 | ミズナラ・ワイン・スパニッシュオーク・アメリカンオーク（製品説明より） | https://www.suntory.co.jp/whisky/products/0000000038/0000000099.html |
| 定番のシングルモルト | 山崎（年数表記なし）・12年・18年・25年 | 同上 |

## 表示基準
| 事実 | 内容 | 出典 |
|------|------|------|
| 制定 | 2021年2月、日本洋酒酒造組合 | https://www.asahibeer.co.jp/whisky_brandy/info/ |
| 要件 | 原材料・造り・熟成・瓶詰め・カラメル | 同上、https://www.yoshu.or.jp/pages/151/ |
| 本格施行 | 2024年4月1日 | 同上 |

## 未解決・注意
1. **余市の表示基準区分と希望小売価格**: アサヒビールの商品ページ（https://www.asahibeer.co.jp/products/whisky_brandy/nikkamaltwhisky/yoichi/yoichi.html ）は年齢確認（生年の入力）の先にあり、本文を直接は読めていない。価格7,000円（税別）は、2024年4月改定の公式発表（対象に余市を含む）と販売店の表記で一致。区分は検索結果の抜粋で「表示基準に合致」と表示。CEOの許可を得て年齢確認を通し、本文で確認する
2. **響の香り・味・余韻の詳細**: 公式ブランドサイトは年齢確認と利用規約への同意の先。モックでは商品情報ページの説明（要約）だけを載せる
3. **見本の差し替え**: 設計書のイチローズモルト&グレーン（ワールドブレンデッド）を碧Aoに差し替えた。メーカーの公式な商品ページがなく（公式サイトは準備中の表示）、原酒の国や蒸溜所数は販売店の説明しかないため。碧Aoは同じ「海外原酒を含む」型を公式情報だけで示せる
```

- [ ] **Step 2: テスト共通の部品を書く**

`mock/tests/helpers.mjs`:

```js
// モックのテスト共通部品（HTMLの読込・データ抽出・jsdomでの起動）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));
export const HTML_PATH = join(here, '..', 'index.html');

export const html = () => readFileSync(HTML_PATH, 'utf8');

// 埋め込みデータ（id="wdata"）を取り出す
export function readData() {
  const m = html().match(/<script type="application\/json" id="wdata">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('wdata が見つからない');
  return JSON.parse(m[1]);
}

// モックを jsdom で開く。jsdom 未実装の機能（scrollTo 等）の警告は無視し、それ以外のエラーを集める
export function load(hash = '') {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (!/Not implemented/.test(e.message)) errors.push(e.message);
  });
  virtualConsole.on('error', (...args) => errors.push(args.join(' ')));
  const dom = new JSDOM(html(), {
    url: `http://localhost/mock/index.html${hash}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });
  return { dom, window: dom.window, document: dom.window.document, errors };
}

// ハッシュを変えて、その場で描画し直す
export function go(env, hash) {
  env.window.location.hash = hash;
  env.window.__mock.render();
}
```

- [ ] **Step 3: データのテストを書く（失敗する）**

`mock/tests/data.check.mjs`:

```js
// データの整合性テスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, readData } from './helpers.mjs';

const data = readData();
const distilleryIds = new Set(data.distilleries.map((d) => d.id));
const whiskyIds = new Set(data.whiskies.map((w) => w.id));

test('見本の3銘柄と5蒸溜所がそろっている', () => {
  assert.deepEqual([...whiskyIds].sort(), ['ao', 'hibiki-jh', 'yoichi']);
  assert.deepEqual([...distilleryIds].sort(), ['chita', 'hakushu', 'miyagikyo', 'yamazaki', 'yoichi']);
  assert.deepEqual(data.distilleries.filter((d) => d.hasPage).map((d) => d.id), ['yamazaki']);
});

test('全銘柄に最初の一画面の項目がある', () => {
  for (const w of data.whiskies) {
    assert.ok(['jw', 'foreign', 'unknown'].includes(w.standard), `${w.id}: standard`);
    assert.ok(w.standardNote, `${w.id}: standardNote`);
    assert.ok(w.components.length >= 1, `${w.id}: components`);
    for (const c of w.components) {
      assert.ok(c.distillery === null || distilleryIds.has(c.distillery), `${w.id}: ${c.distillery}`);
      assert.ok(c.country && c.kind, `${w.id}: component の country/kind`);
    }
    assert.ok(w.taste.line, `${w.id}: taste.line`);
    for (const v of [w.taste.x, w.taste.y]) assert.ok(v >= -1 && v <= 1, `${w.id}: taste の範囲`);
    for (const k of ['straight', 'rock', 'highball', 'mizuwari']) {
      assert.ok([1, 2, 3].includes(w.serve[k]), `${w.id}: serve.${k}`);
    }
    assert.ok(w.next.length >= 2, `${w.id}: next`);
    for (const n of w.next) assert.ok(n.id === null || whiskyIds.has(n.id), `${w.id}: next → ${n.id}`);
    for (const k of ['liquid', 'label', 'mark', 'char']) assert.ok(w.look[k], `${w.id}: look.${k}`);
  }
});

test('丁寧に知る部分の項目がある', () => {
  for (const w of data.whiskies) {
    assert.ok(w.official.length >= 1, `${w.id}: official`);
    assert.ok(w.story.length >= 2, `${w.id}: story`);
    assert.ok(w.specs.length >= 6, `${w.id}: specs`);
    assert.ok(w.componentsNote && w.casks, `${w.id}: componentsNote/casks`);
  }
});

test('事実には出典が付いている', () => {
  const withPages = [...data.whiskies, ...data.distilleries.filter((d) => d.hasPage), data.standardRule];
  for (const item of withPages) {
    assert.ok(item.sources.length >= 1, `${item.id ?? 'standardRule'}: sources`);
    for (const s of item.sources) {
      assert.match(s.url, /^https:\/\//, `${item.id ?? 'standardRule'}: url`);
      assert.ok(s.title && s.used, `${item.id ?? 'standardRule'}: title/used`);
    }
  }
  assert.match(data.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test('区分の違う見本が1本ずつある', () => {
  const byId = Object.fromEntries(data.whiskies.map((w) => [w.id, w]));
  assert.equal(byId['hibiki-jh'].standard, 'jw');
  assert.equal(byId.ao.standard, 'foreign');
  assert.equal(byId.yoichi.components.length, 1);
});

test('長いダッシュを使っていない', () => {
  assert.ok(!/[—―]/.test(html()), '長いダッシュが入っている');
});
```

- [ ] **Step 4: テストが失敗することを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && node --test mock/tests/data.check.mjs`
Expected: FAIL（`ENOENT: no such file or directory ... mock/index.html`）

- [ ] **Step 5: 骨組みとデータを書く**

`mock/index.html`:

```html
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ジャパニーズウイスキー図鑑（仮）</title>
<meta name="description" content="ジャパニーズウイスキーを1本ずつ。産地、中身の原酒、味、飲み方まで。リニューアルのモックです。">
<meta name="theme-color" content="#15100c">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
body{margin:0}
</style>
</head>
<body>
<header class="site-header">
  <div class="wrap site-header-in">
    <a class="brand" href="#/"><span class="brand-dot" aria-hidden="true"></span><span class="brand-name">ジャパニーズウイスキー図鑑</span><span class="brand-tag">仮称・モック</span></a>
    <a class="header-search" href="#/">探す</a>
  </div>
</header>
<main id="app" class="wrap"></main>
<footer class="site-footer">
  <div class="wrap">
    <p>ジャパニーズウイスキー図鑑（仮称）のモックです。掲載している事実は、各ページの出典で<span id="checked-at"></span>に確認しました。</p>
    <p>運営：大田区サンポット</p>
    <p class="footer-note">20歳未満の飲酒は法律で禁止されています。飲酒運転は絶対にやめましょう。</p>
  </div>
</footer>
<script type="application/json" id="wdata">
{
  "checkedAt": "2026-09-18",
  "standards": {
    "jw": { "label": "ジャパニーズウイスキー", "desc": "日本洋酒酒造組合の表示基準に合う、とメーカーが示している銘柄。" },
    "foreign": { "label": "海外原酒を含む", "desc": "海外で造られた原酒を使っている、とメーカーが公表している銘柄。" },
    "unknown": { "label": "区分 未確認", "desc": "公表されている情報からは、どちらか判断できない銘柄。" }
  },
  "standardRule": {
    "title": "「ジャパニーズウイスキー」と名乗れる条件",
    "summary": "2021年2月に日本洋酒酒造組合が定めた自主基準です。移行期間を経て、2024年4月1日から本格的に施行されています。",
    "items": [
      { "k": "原材料", "v": "麦芽・穀類・日本国内で採水した水だけ。麦芽は必ず使う" },
      { "k": "造り", "v": "糖化・発酵・蒸留を、日本国内の蒸留所で行う" },
      { "k": "熟成", "v": "700リットル以下の木樽に詰め、日本国内で3年以上" },
      { "k": "瓶詰め", "v": "日本国内で詰め、アルコール分は40度以上" },
      { "k": "その他", "v": "色の微調整のためのカラメルは使ってよい" }
    ],
    "sources": [
      { "title": "日本洋酒酒造組合「ウイスキーにおけるジャパニーズウイスキーの表示に関する基準」", "url": "https://www.yoshu.or.jp/pages/151/", "used": "基準の名称と制定者" },
      { "title": "アサヒビール「『ウイスキーにおけるジャパニーズウイスキーの表示に関する基準』について」", "url": "https://www.asahibeer.co.jp/whisky_brandy/info/", "used": "要件（原材料・造り・熟成・瓶詰め・カラメル）、制定時期、本格施行日" }
    ]
  },
  "distilleries": [
    {
      "id": "yamazaki",
      "name": "山崎蒸溜所",
      "nameEn": "Yamazaki Distillery",
      "kana": "やまざき",
      "maker": "サントリー",
      "pref": "大阪府",
      "hasPage": true,
      "address": "大阪府三島郡島本町山崎5-2-1",
      "founded": "1923年に建設を始め、1924年に完成",
      "lead": "日本で最初のモルトウイスキー蒸溜所。サントリーの創業者・鳥井信治郎が、全国の候補地から選んだ土地です。",
      "features": [
        { "k": "水", "v": "古くから名水の地。近くに日本名水百選のひとつ「離宮の水」があります" },
        { "k": "立地", "v": "北に天王山、南に桂川・宇治川・木津川の合流点。霧が出やすく、熟成に向いた湿潤な環境です" },
        { "k": "造り", "v": "工程ごとに複数の要素を組み合わせて、多彩な原酒をつくり分けています" },
        { "k": "樽", "v": "ミズナラ樽、ワイン樽、スパニッシュオーク樽、アメリカンオーク樽などで熟成した原酒を、製品ごとに組み合わせます" }
      ],
      "singleMalts": ["山崎（年数表記なし）", "山崎12年", "山崎18年", "山崎25年"],
      "sources": [
        { "title": "サントリー 山崎蒸溜所「アクセス」", "url": "https://www.suntory.co.jp/factory/yamazaki/access/", "used": "所在地" },
        { "title": "サントリー公式ブログ「【100周年企画】ジャパニーズウイスキーの始まりの場所～山崎蒸溜所～」", "url": "https://www.suntory.co.jp/factory/blog-d/000196.html", "used": "着工・竣工の年、創業者が選んだ経緯、離宮の水、天王山と三川、霧と湿度" },
        { "title": "サントリー 山崎蒸溜所「ものづくりのこだわり」", "url": "https://www.suntory.co.jp/factory/yamazaki/about/", "used": "多彩な原酒のつくり分け" },
        { "title": "サントリー ウイスキー・オン・ザ・ウェブ「製品紹介 サントリーシングルモルトウイスキー 山崎」", "url": "https://www.suntory.co.jp/whisky/products/0000000038/0000000099.html", "used": "樽の種類、定番のシングルモルト" },
        { "title": "WHISKY Magazine Japan「響 JAPANESE HARMONY」発表（2015年3月17日）", "url": "https://whiskymag.jp/hjh_2/", "used": "響 JAPANESE HARMONY への山崎モルト原酒の使用" },
        { "title": "サントリー ニュースリリース No.14955（2025年12月16日）", "url": "https://www.suntory.co.jp/news/article/14955.html", "used": "碧Ao への山崎モルト原酒の使用" }
      ]
    },
    { "id": "hakushu", "name": "白州蒸溜所", "nameEn": "Hakushu Distillery", "kana": "はくしゅう", "maker": "サントリー", "pref": "山梨県", "hasPage": false },
    { "id": "chita", "name": "知多蒸溜所", "nameEn": "Chita Distillery", "kana": "ちた", "maker": "サントリー", "pref": "愛知県", "hasPage": false },
    { "id": "yoichi", "name": "余市蒸溜所", "nameEn": "Yoichi Distillery", "kana": "よいち", "maker": "ニッカウヰスキー", "pref": "北海道", "hasPage": false },
    { "id": "miyagikyo", "name": "宮城峡蒸溜所", "nameEn": "Miyagikyo Distillery", "kana": "みやぎきょう", "maker": "ニッカウヰスキー", "pref": "宮城県", "hasPage": false }
  ],
  "whiskies": [
    {
      "id": "hibiki-jh",
      "name": "響 JAPANESE HARMONY",
      "nameEn": "Hibiki Japanese Harmony",
      "short": "響 JH",
      "kana": "ひびき じゃぱにーずはーもにー",
      "aliases": ["hibiki", "ひびき", "ヒビキ", "響", "japanese harmony", "ジャパニーズハーモニー"],
      "maker": "サントリー",
      "type": "ブレンデッド",
      "standard": "jw",
      "standardNote": "メーカーの商品情報に「表示基準に合致した製品」と明記されています",
      "look": { "liquid": "#c8862f", "label": "#ece3d0", "mark": "#2a1d10", "char": "響" },
      "components": [
        { "distillery": "yamazaki", "country": "日本", "kind": "モルト原酒" },
        { "distillery": "hakushu", "country": "日本", "kind": "モルト原酒" },
        { "distillery": "chita", "country": "日本", "kind": "グレーン原酒" }
      ],
      "originNote": "3つの蒸溜所の原酒の組み合わせ。配合比率は非公表です。",
      "componentsNote": "山崎・白州のモルト原酒と知多のグレーン原酒を使う、という内容は、2015年の発表会でのサントリーの説明によります（WHISKY Magazine Japan の報道）。配合比率は公表されていません。",
      "casks": "樽の構成は公表されていません。",
      "taste": { "line": "花のように華やかで、やわらかく甘い", "x": -0.6, "y": -0.3 },
      "serve": { "straight": 2, "rock": 3, "highball": 3, "mizuwari": 2 },
      "next": [
        { "id": null, "name": "サントリー シングルモルト 山崎", "why": "響のモルト原酒のひとつを、単独で味わう" },
        { "id": null, "name": "サントリー シングルモルト 白州", "why": "もうひとつのモルト原酒。爽やかで軽快" },
        { "id": "ao", "name": "碧Ao", "why": "同じサントリーのブレンド。5カ国の原酒で厚みがある" }
      ],
      "official": [
        { "k": "特長", "v": "華やかな香りと、奥行きがありながらやわらかい味わい" }
      ],
      "story": [
        "日本の四季と日本人の繊細な感性、匠の技を結集する、というコンセプトで2015年3月に発売されました。",
        "熟成年数にこだわらず、サントリーが長年つくってきた多彩な原酒と職人の技で仕上げられています。",
        "響ブランドおなじみの、二十四節気を表す24面カットのボトル。ラベルには生成りの越前和紙を使い、「響」の文字を墨で書いています。"
      ],
      "specs": [
        { "k": "種類", "v": "ブレンデッドウイスキー" },
        { "k": "アルコール度数", "v": "43%" },
        { "k": "容量", "v": "700ml" },
        { "k": "熟成年数の表記", "v": "なし" },
        { "k": "原材料", "v": "モルト、グレーン" },
        { "k": "希望小売価格", "v": "8,000円（税別）" },
        { "k": "発売", "v": "2015年3月10日" }
      ],
      "sources": [
        { "title": "サントリー 商品情報「サントリーウイスキー響 JAPANESE HARMONY 700ml瓶」", "url": "https://products.suntory.co.jp/d/4901777270688/", "used": "容量、度数、希望小売価格、原材料、表示基準、コンセプト、味わいの特長" },
        { "title": "サントリー ウイスキー・オン・ザ・ウェブ「製品紹介 サントリーウイスキー響」", "url": "https://www.suntory.co.jp/whisky/products/0000000038/0000000114.html", "used": "ボトルとラベル" },
        { "title": "WHISKY Magazine Japan「響 JAPANESE HARMONY」発表（2015年3月17日）", "url": "https://whiskymag.jp/hjh_2/", "used": "原酒の構成（発表会でのサントリーの説明の報道）" },
        { "title": "WHISKY Magazine Japan「響 JAPANESE HARMONY」発売（2015年1月29日）", "url": "https://whiskymag.jp/hjh_new/", "used": "発売日" },
        { "title": "サントリー 山崎蒸溜所「ものづくりのこだわり」（工場一覧）", "url": "https://www.suntory.co.jp/factory/yamazaki/about/", "used": "山崎蒸溜所と白州蒸溜所の所在県" },
        { "title": "サントリー ウイスキー・オン・ザ・ウェブ「製品紹介 サントリーウイスキー知多」", "url": "https://www.suntory.co.jp/whisky/products/0000000038/0000005530.html", "used": "知多蒸溜所の所在県" }
      ]
    },
    {
      "id": "yoichi",
      "name": "シングルモルト余市",
      "nameEn": "Single Malt Yoichi",
      "short": "余市",
      "kana": "しんぐるもると よいち",
      "aliases": ["yoichi", "よいち", "ヨイチ", "余市", "single malt yoichi"],
      "maker": "ニッカウヰスキー",
      "type": "シングルモルト",
      "standard": "jw",
      "standardNote": "メーカー（アサヒビール）の商品ページで、表示基準に合う商品として案内されています",
      "look": { "liquid": "#a9621f", "label": "#2a2521", "mark": "#e9dfcc", "char": "余" },
      "components": [
        { "distillery": "yoichi", "country": "日本", "kind": "モルト原酒" }
      ],
      "originNote": "",
      "componentsNote": "余市蒸溜所のモルト原酒だけでつくるシングルモルトです。",
      "casks": "樽の種類や構成は、公式ページでは公表されていません。",
      "taste": { "line": "スモーキーで香ばしい、どっしり力強い", "x": 0.65, "y": 0.6 },
      "serve": { "straight": 3, "rock": 3, "highball": 2, "mizuwari": 1 },
      "next": [
        { "id": null, "name": "シングルモルト宮城峡", "why": "同じニッカのもう一つの蒸溜所。甘く華やかで、余市と対照的" },
        { "id": "hibiki-jh", "name": "響 JAPANESE HARMONY", "why": "煙の少ない、やわらかなブレンドと飲み比べる" }
      ],
      "official": [
        { "k": "香り", "v": "樽熟成のやわらかな香りと、豊かな果実の香り" },
        { "k": "味", "v": "しっかりしたピートと香ばしさがつくる、力強い味わい" },
        { "k": "余韻", "v": "オークの甘さとスモーキーさが、穏やかに長く続く" }
      ],
      "story": [
        "余市蒸溜所は1934年、ニッカウヰスキーのはじまりの地として北海道・余市に生まれました。スコットランドに似た冷涼な気候が、この地が選ばれた理由です。",
        "ポットスチルに石炭をくべて直火で熱する「石炭直火蒸溜」を今も続けています。世界でも珍しくなった方法で、原酒に独特の香ばしさが生まれます。",
        "いまの年数表記なしの余市は、2015年9月1日の発売です。このとき10年・12年・15年・20年などの年数表記品は販売を終え、ラインアップがまとめられました。"
      ],
      "specs": [
        { "k": "種類", "v": "シングルモルトウイスキー" },
        { "k": "アルコール度数", "v": "45%" },
        { "k": "容量", "v": "700ml" },
        { "k": "熟成年数の表記", "v": "なし" },
        { "k": "希望小売価格", "v": "7,000円（税別、2024年4月改定後）" },
        { "k": "発売", "v": "2015年9月1日（いまの中味）" }
      ],
      "sources": [
        { "title": "ニッカウヰスキー「商品特徴｜シングルモルト 余市・宮城峡」", "url": "https://www.nikka.com/brands/yoichi_miyagikyo/products/", "used": "商品説明、香り・味・余韻、度数、容量、宮城峡の特徴" },
        { "title": "ニッカウヰスキー「蒸溜所紹介｜シングルモルト 余市・宮城峡」", "url": "https://www.nikka.com/products/malt/yoichi_miyagikyo/sp/distilleries/index.html", "used": "余市蒸溜所の創業年、石炭直火蒸溜、気候" },
        { "title": "アサヒビール ニュースリリース（2015年6月15日）", "url": "https://www.asahibeer.co.jp/news/2015/0615_3.html", "used": "いまの中味の発売日、年数表記品の販売終了" },
        { "title": "アサヒビール ニュースリリース「国産洋酒・輸入洋酒の一部商品の価格改定について」（2023年12月19日）", "url": "https://www.asahibeer.co.jp/news/2023/1219.html", "used": "2024年4月1日出荷分からの価格改定（対象に余市を含む）" },
        { "title": "アサヒビール 商品情報「シングルモルト余市」", "url": "https://www.asahibeer.co.jp/products/whisky_brandy/nikkamaltwhisky/yoichi/yoichi.html", "used": "希望小売価格、表示基準" }
      ]
    },
    {
      "id": "ao",
      "name": "碧Ao",
      "nameEn": "Suntory Whisky Ao",
      "short": "碧Ao",
      "kana": "あお",
      "aliases": ["ao", "あお", "アオ", "碧", "suntory whisky ao", "world whisky"],
      "maker": "サントリー",
      "type": "ブレンデッド",
      "standard": "foreign",
      "standardNote": "アイルランド・スコットランド・アメリカ・カナダ・日本の原酒をブレンドしている、とメーカーが公表しています",
      "look": { "liquid": "#c07a2c", "label": "#1d4a5c", "mark": "#e9f0f2", "char": "碧" },
      "components": [
        { "distillery": "yamazaki", "country": "日本", "kind": "モルト原酒", "note": "スパニッシュオーク樽で30年以上熟成したものを含む" },
        { "distillery": null, "country": "アメリカ", "kind": "バーボン原酒", "note": "8年以上熟成したものを含む" },
        { "distillery": null, "country": "スコットランド", "kind": "原酒" },
        { "distillery": null, "country": "アイルランド", "kind": "原酒" },
        { "distillery": null, "country": "カナダ", "kind": "原酒" }
      ],
      "originNote": "日本以外の蒸溜所名は公表されていません。",
      "componentsNote": "5カ国とも、サントリーグループが製造し品質を管理する自社蒸溜所の原酒です（メーカー公表）。名前が公表されている蒸溜所は山崎だけで、配合比率も非公表です。",
      "casks": "日本の原酒には、スパニッシュオーク樽で30年以上熟成させた山崎モルト原酒が使われています（2025年12月の刷新時に公表）。アメリカの原酒は8年以上熟成のバーボン原酒。そのほかの樽の構成は公表されていません。",
      "taste": { "line": "厚みがあって複雑、しっかり濃いめ", "x": -0.2, "y": 0.35 },
      "serve": { "straight": 2, "rock": 3, "highball": 3, "mizuwari": 2 },
      "next": [
        { "id": "hibiki-jh", "name": "響 JAPANESE HARMONY", "why": "日本の原酒だけでつくるサントリーのブレンドと飲み比べる" },
        { "id": null, "name": "サントリー シングルモルト 山崎", "why": "碧Aoに使われている日本の原酒の蒸溜所" }
      ],
      "official": [
        { "k": "特長", "v": "5カ国の原酒の個性が重なった、厚みと複雑さのある豊かな味わい" }
      ],
      "story": [
        "2019年4月に数量限定で発売。サントリーグループが世界5大ウイスキー産地（アイルランド、スコットランド、アメリカ、カナダ、日本）にもつ自社蒸溜所の原酒だけをブレンドしたウイスキーで、メーカーは「世界初」としています。",
        "2025年12月に初めてのリニューアル。商品名を「SUNTORY WORLD WHISKY 碧Ao」から「SUNTORY WHISKY 碧Ao」に変え、中味とパッケージを一新しました。",
        "刷新後のラベルには越前和紙を使い、多様な原酒が重なり合う味わいを、いくつもの色が織りなすデザインで表しています。"
      ],
      "specs": [
        { "k": "種類", "v": "ブレンデッドウイスキー" },
        { "k": "アルコール度数", "v": "43%" },
        { "k": "容量", "v": "700ml（350mlもあり）" },
        { "k": "熟成年数の表記", "v": "なし" },
        { "k": "原材料", "v": "モルト、グレーン" },
        { "k": "希望小売価格", "v": "6,000円（税別）" },
        { "k": "発売", "v": "2019年4月（2025年12月に刷新）" }
      ],
      "sources": [
        { "title": "サントリー ウイスキー・オン・ザ・ウェブ「製品紹介 SUNTORY WHISKY 碧Ao」", "url": "https://www.suntory.co.jp/whisky/products/0000000075/0000007878.html", "used": "商品説明、容量、度数、希望小売価格、原材料" },
        { "title": "サントリー ニュースリリース No.14955「SUNTORY WHISKY『碧Ao』リニューアル新発売」（2025年12月16日）", "url": "https://www.suntory.co.jp/news/article/14955.html", "used": "5カ国の自社蒸溜所の原酒、山崎モルト原酒とバーボン原酒、商品名の変更、刷新の時期とラベル" },
        { "title": "WHISKY Magazine Japan「SUNTORY WORLD WHISKY『碧Ao』が10月に第2期の発売を開始」（2019年9月9日）", "url": "https://whiskymag.jp/ao_release_2nd/", "used": "初回の発売（2019年4月、数量限定）" },
        { "title": "サントリー 山崎蒸溜所「アクセス」", "url": "https://www.suntory.co.jp/factory/yamazaki/access/", "used": "山崎蒸溜所の所在県" }
      ]
    }
  ]
}
</script>
<script>
(() => {
  'use strict';
  const DATA = JSON.parse(document.getElementById('wdata').textContent);
  const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${y}年${m}月${d}日`;
  };
  document.getElementById('checked-at').textContent = fmtDate(DATA.checkedAt);
})();
</script>
</body>
</html>
```

- [ ] **Step 6: テストが通ることを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && node --test mock/tests/data.check.mjs`
Expected: PASS（6 tests, 0 fail）

- [ ] **Step 7: 余市の区分と価格を公式ページで確かめる（CEOの許可が要る）**

CEO が年齢確認の通過を許可した場合: 内蔵ブラウザで `https://www.asahibeer.co.jp/products/whisky_brandy/nikkamaltwhisky/yoichi/yoichi.html` を開き、年齢確認に CEO が指定した生年を入れて進む。本文で「表示基準に合致」の記載と、700ml の希望小売価格が 7,000円（税別）であることを確認する。
- 一致した場合: `mock/SOURCES.md` の「未解決・注意 1」を「確認済み（2026-09-18）」に書き換え、余市の表の「未解決1を参照」2か所を出典 URL に置き換える
- 価格が違った場合: `index.html` の yoichi の `specs` の希望小売価格を公式の値に直し、`SOURCES.md` にも反映する
- 区分の記載がなかった場合、または CEO が許可しなかった場合: `index.html` の yoichi を `"standard": "unknown"`、`"standardNote": "メーカーの商品ページで確認中です"` に変え、`data.check.mjs` の変更は不要（`yoichi` の区分は検査していない）。`SOURCES.md` の未解決1はそのまま残す

変更したら Step 6 のテストをもう一度実行して PASS を確かめる。

- [ ] **Step 8: コミット**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add mock/SOURCES.md mock/index.html mock/tests/helpers.mjs mock/tests/data.check.mjs
git commit -m "mock: 裏取りの記録と見本3銘柄・山崎蒸溜所のデータ、データのテストを追加

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: ルーター・トップ画面・検索

**Files:**
- Modify: `mock/index.html`（アプリの `<script>` を置き換え）
- Create: `mock/tests/render.check.mjs`

**Interfaces:**
- Consumes: Task 1 の `wdata`、`#app`、`#checked-at`、`helpers.mjs`
- Produces: `window.__mock = { search(q) → [{kind:'whisky'|'distillery', item}], norm(s) → string, parseHash(h) → {view,…}, render() }`
- Produces: 共通関数 `esc`, `badge(std, asLink)`, `bottle(w, size)`, `tasteMap({focus?})`, `quadOf(taste)`, `sourcesHtml(list)`, `viewNotFound()`, 定数 `SITE`, `W`, `D`, `SERVES`, `MARK`, `MARK_TEXT`, `QUADS`
- Produces: 画面関数の差し替え口（この時点ではスタブ）: `viewWhisky(id)`, `viewDistillery(id)`, `viewStandard()`。すべて `{ title, html }` を返す
- Produces: トップの DOM: `#search-form`, `#q`, `#results`（`.sec-head h2#results-h`, `.count`, `ul.cards > li > a.card`, 0件時 `p.empty`）, `#by-pref`（`.prefs > li.pref`、`p.pref-name`）, `#by-taste`（`.quads > a.quad`）, `a.std-card`

- [ ] **Step 1: トップと検索のテストを書く（失敗する）**

`mock/tests/render.check.mjs`:

```js
// 画面描画・検索・画面遷移のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const text = (el) => el.textContent.replace(/\s+/g, '');

test('トップ：掲載中の3銘柄が並び、エラーが出ない', () => {
  const env = load('');
  const cards = env.document.querySelectorAll('#results a.card[href^="#/whisky/"]');
  assert.equal(cards.length, 3);
  assert.equal(env.document.getElementById('checked-at').textContent, '2026年9月18日');
  assert.deepEqual(env.errors, []);
});

test('検索：ひびき・hibiki・ヒビキ・全角英字で響が出る', () => {
  const env = load('');
  for (const q of ['ひびき', 'hibiki', 'ヒビキ', 'ＨＩＢＩＫＩ', 'ジャパニーズ ハーモニー']) {
    const ids = env.window.__mock.search(q).map((r) => r.item.id);
    assert.ok(ids.includes('hibiki-jh'), q);
  }
});

test('検索：山崎で蒸溜所が先頭、山崎の原酒を使う銘柄も出る', () => {
  const env = load('');
  const found = env.window.__mock.search('山崎');
  assert.equal(found[0].kind, 'distillery');
  assert.equal(found[0].item.id, 'yamazaki');
  // jsdom 側で作られた配列は厳密比較で型が合わないため、テスト側の配列に作り直す
  const ids = [...found.filter((r) => r.kind === 'whisky').map((r) => r.item.id)].sort();
  assert.deepEqual(ids, ['ao', 'hibiki-jh']);
});

test('検索：URL の q で結果が出る', () => {
  const env = load('#/?q=%E3%82%88%E3%81%84%E3%81%A1');
  assert.equal(env.document.getElementById('q').value, 'よいち');
  const links = [...env.document.querySelectorAll('#results a.card')].map((a) => a.getAttribute('href'));
  assert.deepEqual(links, ['#/whisky/yoichi']);
});

test('検索：入力するとその場で結果と URL が変わる', () => {
  const env = load('');
  const input = env.document.getElementById('q');
  input.value = 'あお';
  input.dispatchEvent(new env.window.Event('input'));
  const links = [...env.document.querySelectorAll('#results a.card')].map((a) => a.getAttribute('href'));
  assert.deepEqual(links, ['#/whisky/ao']);
  assert.equal(env.window.location.hash, '#/?q=%E3%81%82%E3%81%8A');
});

test('検索：見つからない時は読みでの検索を案内する', () => {
  const env = load('#/?q=zzz');
  assert.match(env.document.querySelector('#results .empty').textContent, /ひらがな/);
  assert.equal(env.document.querySelectorAll('#results a.card').length, 0);
});

test('都道府県から探す：北から順に並び、山崎だけがリンク', () => {
  const env = load('');
  const prefs = [...env.document.querySelectorAll('#by-pref .pref-name')].map((p) => p.textContent);
  assert.deepEqual(prefs, ['北海道', '宮城県', '山梨県', '愛知県', '大阪府']);
  const links = [...env.document.querySelectorAll('#by-pref a')].map((a) => a.getAttribute('href'));
  assert.deepEqual(links, ['#/distillery/yamazaki']);
});

test('味から探す：4つの入口があり、象限で絞り込める', () => {
  const env = load('#/?taste=smoky-rich');
  assert.equal(env.document.querySelectorAll('#by-taste a.quad').length, 4);
  assert.ok(env.document.querySelector('#by-taste a.quad[aria-current="true"][href="#/?taste=smoky-rich"]'));
  const links = [...env.document.querySelectorAll('#results a.card')].map((a) => a.getAttribute('href'));
  assert.deepEqual(links, ['#/whisky/yoichi']);
});

test('味から探す：該当なしの象限は案内を出す', () => {
  const env = load('#/?taste=smoky-light');
  assert.ok(env.document.querySelector('#results .empty'));
});

test('トップ：表示基準の説明への入口がある', () => {
  const env = load('');
  const card = env.document.querySelector('a.std-card[href="#/standard"]');
  assert.ok(card);
  assert.equal(card.querySelectorAll('.badge').length, 3);
});

test('知らない URL は見つからない表示', () => {
  const env = load('#/nope');
  assert.equal(text(env.document.querySelector('h1')), 'ページが見つかりません');
  assert.match(env.document.title, /^ページが見つかりません｜/);
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && node --test mock/tests/render.check.mjs`
Expected: FAIL（`Cannot read properties of undefined (reading 'search')` など。`window.__mock` がまだない）

- [ ] **Step 3: アプリの `<script>` を置き換える**

`mock/index.html` の、`<script type="application/json" id="wdata">` の後ろにある `<script> … </script>`（Task 1 で書いた短いもの）を、次の内容に丸ごと置き換える:

```html
<script>
(() => {
  'use strict';

  // ===== 共通 =====
  const DATA = JSON.parse(document.getElementById('wdata').textContent);
  const W = new Map(DATA.whiskies.map((w) => [w.id, w]));
  const D = new Map(DATA.distilleries.map((d) => [d.id, d]));
  const SITE = 'ジャパニーズウイスキー図鑑（仮）';
  const PREF_ORDER = ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];
  const SERVES = [['straight', 'ストレート'], ['rock', 'ロック'], ['highball', 'ハイボール'], ['mizuwari', '水割り']];
  const MARK = { 3: '◎', 2: '○', 1: '△' };
  const MARK_TEXT = { 3: 'とても合う', 2: '合う', 1: '好みが分かれる' };
  // 味の地図の4象限（横：華やか←→スモーキー、縦：やわらか←→濃厚）。並びは地図の見た目どおり
  const QUADS = [
    { key: 'floral-rich', label: '華やか × 濃厚', test: (t) => t.x < 0 && t.y >= 0 },
    { key: 'smoky-rich', label: 'スモーキー × 濃厚', test: (t) => t.x >= 0 && t.y >= 0 },
    { key: 'floral-light', label: '華やか × やわらか', test: (t) => t.x < 0 && t.y < 0 },
    { key: 'smoky-light', label: 'スモーキー × やわらか', test: (t) => t.x >= 0 && t.y < 0 },
  ];
  const app = document.getElementById('app');

  // HTML に差し込む文字列を無害化する
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // 検索用の正規化（全角半角・大文字小文字・カタカナを揃え、空白と記号を除く）
  const norm = (s) => String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・\-‐ー_.,、。'"()（）「」&]/g, '');

  const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${y}年${m}月${d}日`;
  };
  const distName = (d) => d.name.replace(/蒸溜所$/, '');
  const quadOf = (t) => QUADS.find((q) => q.test(t));

  // 産地の短い表記（県名、海外は国名）
  function originText(w) {
    const places = w.components.map((c) => (c.distillery ? D.get(c.distillery).pref : c.country));
    return [...new Set(places)].join('・');
  }

  // 表示基準の区分バッジ。銘柄ページでは説明ページへのリンクにする
  function badge(std, asLink) {
    const s = DATA.standards[std];
    const cls = `badge badge--${esc(std)}`;
    return asLink
      ? `<a class="${cls}" href="#/standard" title="${esc(s.desc)}">${esc(s.label)}</a>`
      : `<span class="${cls}">${esc(s.label)}</span>`;
  }

  // 写真の代わりの簡易なボトル図
  function bottle(w, size) {
    const l = w.look;
    return `<span class="bottle bottle--${size}" style="--liquid:${esc(l.liquid)};--label:${esc(l.label)};--mark:${esc(l.mark)}" aria-hidden="true"><span class="bottle-neck"></span><span class="bottle-body"></span><span class="bottle-label">${esc(l.char)}</span></span>`;
  }

  // 味の地図。focus を渡すとその銘柄だけを強調する小さい版、渡さないと全銘柄のラベル付きの大きい版
  function tasteMap(opts) {
    const S = 200;
    const P = 14;
    const I = S - P * 2;
    const at = (t) => [P + ((t.x + 1) / 2) * I, P + (1 - (t.y + 1) / 2) * I];
    const dots = DATA.whiskies.map((w) => {
      const [cx, cy] = at(w.taste);
      if (opts.focus) {
        const on = w.id === opts.focus;
        return { on, svg: `<circle class="dot${on ? ' dot--focus' : ''}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${on ? 7 : 4}"><title>${esc(w.name)}</title></circle>` };
      }
      const right = w.taste.x > 0.45;
      return { on: false, svg: `<a href="#/whisky/${esc(w.id)}"><circle class="dot dot--all" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6"><title>${esc(w.name)}</title></circle><text class="dot-label" x="${(right ? cx - 10 : cx + 10).toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="${right ? 'end' : 'start'}">${esc(w.short)}</text></a>` };
    });
    // 強調する点を最後に描いて前面に出す
    dots.sort((a, b) => Number(a.on) - Number(b.on));
    const f = opts.focus ? W.get(opts.focus) : null;
    const aria = f ? `味の地図。${f.name}は${quadOf(f.taste).label}の位置` : '味の地図。掲載銘柄の位置';
    return `<div class="tmap tmap--${f ? 'sm' : 'lg'}"><span class="tmap-top">濃厚</span><span class="tmap-left">華やか</span><svg viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(aria)}"><rect class="tmap-frame" x="${P}" y="${P}" width="${I}" height="${I}" rx="10"/><line class="tmap-axis" x1="${S / 2}" y1="${P}" x2="${S / 2}" y2="${S - P}"/><line class="tmap-axis" x1="${P}" y1="${S / 2}" x2="${S - P}" y2="${S / 2}"/>${dots.map((d) => d.svg).join('')}</svg><span class="tmap-right">スモーキー</span><span class="tmap-bottom">やわらか</span></div>`;
  }

  // 出典の一覧（各ページの最後に置く）
  function sourcesHtml(list) {
    return `<section id="sources" aria-labelledby="sources-h"><h2 id="sources-h">出典</h2><ol class="sources">${list.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a><span class="source-used">${esc(s.used)}</span></li>`).join('')}</ol><p class="note">確認日：${esc(fmtDate(DATA.checkedAt))}</p></section>`;
  }

  function whiskyCard(w) {
    return `<li><a class="card" href="#/whisky/${esc(w.id)}">${bottle(w, 'sm')}<span class="card-body"><span class="card-name">${esc(w.name)}</span><span class="card-meta">${esc(w.maker)}・${esc(w.type)}</span><span class="card-meta">${esc(originText(w))}</span>${badge(w.standard, false)}</span></a></li>`;
  }

  function distilleryCard(d) {
    return `<li><a class="card card--dist" href="#/distillery/${esc(d.id)}"><span class="card-body"><span class="card-kind">蒸溜所</span><span class="card-name">${esc(d.name)}</span><span class="card-meta">${esc(d.pref)}・${esc(d.maker)}</span></span></a></li>`;
  }

  function viewNotFound() {
    return {
      title: `ページが見つかりません｜${SITE}`,
      html: `<section class="hero"><h1>ページが見つかりません</h1><p class="hero-lead">モックに入っているのは3銘柄と山崎蒸溜所です。</p><p><a class="btn" href="#/">トップへ戻る</a></p></section>`,
    };
  }

  // ===== 検索 =====
  const whiskyHay = new Map(DATA.whiskies.map((w) => [w.id, norm([
    w.name, w.nameEn, w.kana, ...w.aliases, w.maker, w.type,
    ...w.components.flatMap((c) => {
      const d = c.distillery ? D.get(c.distillery) : null;
      return d ? [d.name, d.nameEn, d.kana, d.pref] : [c.country];
    }),
  ].join('|'))]));
  const distilleryHay = new Map(DATA.distilleries.map((d) => [d.id, norm([d.name, d.nameEn, d.kana, d.maker, d.pref].join('|'))]));

  // ページのある蒸溜所を先に、続けて銘柄を返す
  function search(q) {
    const nq = norm(q);
    if (!nq) return [];
    const ds = DATA.distilleries
      .filter((d) => d.hasPage && distilleryHay.get(d.id).includes(nq))
      .map((item) => ({ kind: 'distillery', item }));
    const ws = DATA.whiskies
      .filter((w) => whiskyHay.get(w.id).includes(nq))
      .map((item) => ({ kind: 'whisky', item }));
    return [...ds, ...ws];
  }

  // ===== 画面：トップ =====
  function resultsHtml(r) {
    let head;
    let items;
    let clear = '';
    let emptyText = '';
    if (r.q) {
      head = `「${esc(r.q)}」の検索結果`;
      items = search(r.q);
      emptyText = '見つかりませんでした。ひらがな・カタカナ・英字の読みでも探せます（例：よいち、yoichi）。モックに入っているのは3銘柄です。';
    } else if (QUADS.some((q) => q.key === r.taste)) {
      const q = QUADS.find((x) => x.key === r.taste);
      head = `味：${esc(q.label)}`;
      items = DATA.whiskies.filter((w) => q.test(w.taste)).map((item) => ({ kind: 'whisky', item }));
      clear = '<a class="clear" href="#/">すべて表示</a>';
      emptyText = 'この味の銘柄は、モックにはまだありません。';
    } else {
      head = '掲載中の銘柄';
      items = DATA.whiskies.map((item) => ({ kind: 'whisky', item }));
    }
    const list = items.length
      ? `<ul class="cards">${items.map((x) => (x.kind === 'whisky' ? whiskyCard(x.item) : distilleryCard(x.item))).join('')}</ul>`
      : `<p class="empty">${emptyText}</p>`;
    return `<div class="sec-head"><h2 id="results-h">${head}</h2><span class="count">${items.length}件</span>${clear}</div>${list}`;
  }

  function viewTop(r) {
    const byPref = new Map();
    for (const d of DATA.distilleries) {
      if (!byPref.has(d.pref)) byPref.set(d.pref, []);
      byPref.get(d.pref).push(d);
    }
    const prefs = [...byPref.keys()].sort((a, b) => PREF_ORDER.indexOf(a) - PREF_ORDER.indexOf(b));
    const rule = DATA.standardRule;
    return {
      title: SITE,
      html: `
<section class="hero">
  <p class="eyebrow">JAPANESE WHISKY ATLAS</p>
  <h1>その一本を、<br>ちゃんと知る。</h1>
  <p class="hero-lead">ジャパニーズウイスキーを1本ずつ。どこの県の、どの原酒で、どんな味で、どう飲むとうまいか。</p>
  <form class="search" role="search" id="search-form">
    <label class="sr-only" for="q">銘柄名・蒸溜所名で探す</label>
    <input id="q" name="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="例：ひびき / hibiki / 山崎" value="${esc(r.q)}">
    <button type="submit">探す</button>
  </form>
  <p class="search-hint">ひらがな・カタカナ・英字でも引けます。棚のラベルの読みでどうぞ。</p>
</section>
<section class="sec" aria-labelledby="results-h">
  <div id="results">${resultsHtml(r)}</div>
</section>
<section class="sec" id="by-pref" aria-labelledby="pref-h">
  <div class="sec-head"><h2 id="pref-h">都道府県から探す</h2><span class="count">モックは5蒸溜所</span></div>
  <ul class="prefs">${prefs.map((p) => `<li class="pref"><p class="pref-name">${esc(p)}</p><ul>${byPref.get(p).map((d) => (d.hasPage ? `<li><a href="#/distillery/${esc(d.id)}">${esc(d.name)}</a></li>` : `<li class="soon">${esc(d.name)}<small>準備中</small></li>`)).join('')}</ul></li>`).join('')}</ul>
</section>
<section class="sec" id="by-taste" aria-labelledby="taste-top-h">
  <div class="sec-head"><h2 id="taste-top-h">味から探す</h2><span class="opinion">編集部の見立て</span></div>
  ${tasteMap({})}
  <div class="quads">${QUADS.map((q) => {
    const n = DATA.whiskies.filter((w) => q.test(w.taste)).length;
    return `<a class="quad" href="#/?taste=${q.key}"${r.taste === q.key ? ' aria-current="true"' : ''}><span class="quad-name">${esc(q.label)}</span><span class="quad-count">${n}本</span></a>`;
  }).join('')}</div>
</section>
<section class="sec">
  <a class="std-card" href="#/standard">
    <h2>${esc(rule.title)}</h2>
    <p>${esc(rule.summary)} このサイトでは全銘柄に、3つの区分のどれかを付けています。</p>
    <span class="badges">${['jw', 'foreign', 'unknown'].map((k) => badge(k, false)).join('')}</span>
  </a>
</section>`,
    };
  }

  function bindTop() {
    const form = document.getElementById('search-form');
    const input = document.getElementById('q');
    const results = document.getElementById('results');
    input.addEventListener('input', () => {
      const q = input.value;
      results.innerHTML = resultsHtml({ q, taste: '' });
      history.replaceState(null, '', q ? `#/?q=${encodeURIComponent(q)}` : '#/');
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      input.blur();
    });
  }

  // ===== 画面：銘柄 =====
  function viewWhisky(id) {
    return viewNotFound();
  }

  // ===== 画面：蒸溜所・表示基準 =====
  function viewDistillery(id) {
    return viewNotFound();
  }

  function viewStandard() {
    return viewNotFound();
  }

  // ===== ルーター =====
  function parseHash(h) {
    const raw = (h || '').replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    const params = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return { view: 'top', q: params.get('q') || '', taste: params.get('taste') || '' };
    if (parts.length === 2 && parts[0] === 'whisky') return { view: 'whisky', id: decodeURIComponent(parts[1]) };
    if (parts.length === 2 && parts[0] === 'distillery') return { view: 'distillery', id: decodeURIComponent(parts[1]) };
    if (parts.length === 1 && parts[0] === 'standard') return { view: 'standard' };
    return { view: 'notfound' };
  }

  function render() {
    const r = parseHash(location.hash);
    const v = r.view === 'top' ? viewTop(r)
      : r.view === 'whisky' ? viewWhisky(r.id)
        : r.view === 'distillery' ? viewDistillery(r.id)
          : r.view === 'standard' ? viewStandard()
            : viewNotFound();
    app.innerHTML = v.html;
    document.title = v.title;
    if (r.view === 'top') bindTop();
    return r;
  }

  window.addEventListener('hashchange', () => {
    const r = render();
    // 味の絞り込みは結果の位置へ、それ以外はページの先頭へ
    const results = document.getElementById('results');
    if (r.view === 'top' && r.taste && results && results.scrollIntoView) results.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  });

  document.getElementById('checked-at').textContent = fmtDate(DATA.checkedAt);
  render();
  window.__mock = { search, norm, parseHash, render };
})();
</script>
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && node --test mock/tests/*.check.mjs`
Expected: PASS（data 6件＋render 11件、0 fail）

- [ ] **Step 5: コミット**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add mock/index.html mock/tests/render.check.mjs
git commit -m "mock: ルーター・トップ画面・読みでの検索・都道府県と味からの入口を追加

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: 銘柄ページ

**Files:**
- Modify: `mock/index.html`（`// ===== 画面：銘柄 =====` の `viewWhisky` スタブを置き換え）
- Modify: `mock/tests/render.check.mjs`（末尾に追記）

**Interfaces:**
- Consumes: Task 2 の `esc`, `badge`, `bottle`, `tasteMap`, `sourcesHtml`, `viewNotFound`, `SITE`, `W`, `D`, `SERVES`, `MARK`, `MARK_TEXT`, `distName`
- Produces: 銘柄ページの DOM: `.w-head`（`h1.w-name`, `.badge`）, `.w-first > section` が順に `.w-origin`（`.chips .chip`、県は `.chip-where`、`a.chip[href="#/distillery/…"]`、`.origin-note`）, `.w-taste`（`.w-line`, `svg circle.dot--focus`）, `.w-serve`（`.serve-item` ×4）, `.w-next`（`a.next` または `div.next--off`）。各見立てに `.opinion`。その下 `.deep` に `#official`, `#casks`, `#story`, `#specs`, `#sources`

- [ ] **Step 1: 銘柄ページのテストを書く（失敗する）**

`mock/tests/render.check.mjs` の末尾に追記:

```js
import { readData, go } from './helpers.mjs';

const DATA = readData();

test('銘柄ページ：響の最初の一画面', () => {
  const env = load('#/whisky/hibiki-jh');
  const d = env.document;
  assert.equal(d.querySelector('h1').textContent, '響 JAPANESE HARMONY');
  assert.equal(d.querySelector('.w-head .badge').textContent, 'ジャパニーズウイスキー');
  assert.equal(d.querySelector('.w-head .badge').getAttribute('href'), '#/standard');
  const chips = [...d.querySelectorAll('.w-origin .chip')].map(text);
  assert.deepEqual(chips, ['大阪府山崎モルト', '山梨県白州モルト', '愛知県知多グレーン']);
  assert.ok(d.querySelector('.w-origin a.chip[href="#/distillery/yamazaki"]'));
  assert.equal(d.querySelectorAll('.w-origin a.chip').length, 1);
  assert.match(d.querySelector('.w-line').textContent, /華やか/);
  assert.ok(d.querySelector('.w-taste svg circle.dot--focus'));
  assert.equal(d.querySelectorAll('.w-serve .serve-item').length, 4);
  assert.ok(d.querySelector('.w-next a.next[href="#/whisky/ao"]'));
  assert.equal(d.querySelectorAll('.w-next .next--off').length, 2);
  assert.equal(d.title, '響 JAPANESE HARMONY｜ジャパニーズウイスキー図鑑（仮）');
  assert.deepEqual(env.errors, []);
});

test('銘柄ページ：最初の一画面は 産地→味→飲み方→次の1本 の順', () => {
  const env = load('#/whisky/hibiki-jh');
  const order = [...env.document.querySelectorAll('.w-first > section')].map((s) => s.className);
  assert.deepEqual(order, ['w-origin', 'w-taste', 'w-serve', 'w-next']);
});

test('銘柄ページ：見立ての項目には見立ての表示がある', () => {
  const env = load('#/whisky/yoichi');
  for (const sel of ['.w-taste', '.w-serve', '.w-next']) {
    assert.equal(env.document.querySelector(`${sel} .opinion`).textContent, '編集部の見立て', sel);
  }
});

test('銘柄ページ：飲み方は◎○△と読み上げ用の言葉で出る', () => {
  const env = load('#/whisky/yoichi');
  const items = [...env.document.querySelectorAll('.w-serve .serve-item')].map(text);
  assert.deepEqual(items, ['◎ストレートとても合う', '◎ロックとても合う', '○ハイボール合う', '△水割り好みが分かれる']);
});

test('銘柄ページ：碧Aoは海外原酒の区分と国別の原酒', () => {
  const env = load('#/whisky/ao');
  const d = env.document;
  const b = d.querySelector('.w-head .badge');
  assert.equal(b.textContent, '海外原酒を含む');
  assert.ok(b.classList.contains('badge--foreign'));
  const chips = [...d.querySelectorAll('.w-origin .chip')].map(text);
  assert.deepEqual(chips, ['大阪府山崎モルト', 'アメリカバーボン', 'スコットランド原酒', 'アイルランド原酒', 'カナダ原酒']);
  assert.match(d.querySelector('.w-origin .origin-note').textContent, /非公表|公表されていません/);
});

test('銘柄ページ：余市は1蒸溜所のシングルモルト', () => {
  const env = load('#/whisky/yoichi');
  const d = env.document;
  assert.equal(d.querySelector('.w-origin h2').firstChild.textContent, '産地・蒸溜所');
  assert.deepEqual([...d.querySelectorAll('.w-origin .chip')].map(text), ['北海道余市モルト']);
  assert.equal(d.querySelectorAll('.w-origin a.chip').length, 0);
  assert.equal(d.querySelector('.w-origin .origin-note'), null);
});

test('銘柄ページ：丁寧に知る部分が全銘柄にある', () => {
  for (const w of DATA.whiskies) {
    const env = load(`#/whisky/${w.id}`);
    const d = env.document;
    for (const id of ['official', 'casks', 'story', 'specs', 'sources']) {
      assert.ok(d.getElementById(id), `${w.id}: #${id}`);
    }
    assert.equal(d.querySelectorAll('#official dt').length, w.official.length, `${w.id}: official`);
    assert.equal(d.querySelectorAll('#casks .flow-item').length, w.components.length, `${w.id}: flow`);
    assert.equal(d.querySelectorAll('#story p').length, w.story.length, `${w.id}: story`);
    assert.equal(d.querySelectorAll('#specs dt').length, w.specs.length + 1, `${w.id}: specs＋表示基準`);
    const links = d.querySelectorAll('#sources a');
    assert.equal(links.length, w.sources.length, `${w.id}: sources`);
    for (const a of links) {
      assert.equal(a.getAttribute('target'), '_blank');
      assert.match(a.getAttribute('rel'), /noopener/);
    }
    assert.match(d.querySelector('#sources .note').textContent, /2026年9月18日/);
  }
});

test('銘柄ページ：存在しない id は見つからない表示', () => {
  const env = load('#/whisky/nope');
  assert.equal(text(env.document.querySelector('h1')), 'ページが見つかりません');
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && node --test mock/tests/render.check.mjs`
Expected: FAIL（銘柄ページのテスト7件が失敗。h1 が「ページが見つかりません」になるため）

- [ ] **Step 3: 銘柄ページを実装する**

`mock/index.html` の次のスタブ:

```js
  // ===== 画面：銘柄 =====
  function viewWhisky(id) {
    return viewNotFound();
  }
```

を、次に置き換える:

```js
  // ===== 画面：銘柄 =====
  const shortKind = (k) => k.replace(/原酒$/, '') || '原酒';

  // 最初の一画面の「産地・原酒」チップ。ページのある蒸溜所だけリンクにする
  function componentChip(c) {
    const d = c.distillery ? D.get(c.distillery) : null;
    const where = d ? d.pref : c.country;
    const inner = `<span class="chip-where">${esc(where)}</span>${d ? `<span class="chip-name">${esc(distName(d))}</span>` : ''}<span class="chip-kind">${esc(shortKind(c.kind))}</span>`;
    return d && d.hasPage
      ? `<a class="chip" href="#/distillery/${esc(d.id)}">${inner}</a>`
      : `<span class="chip">${inner}</span>`;
  }

  // 「原酒と樽」の構成図の1行
  function flowItem(c) {
    const d = c.distillery ? D.get(c.distillery) : null;
    const name = d
      ? (d.hasPage ? `<a href="#/distillery/${esc(d.id)}">${esc(d.name)}</a>` : esc(d.name))
      : '蒸溜所名 非公表';
    const where = d ? `${c.country}・${d.pref}` : c.country;
    return `<div class="flow-item"><span class="flow-where">${esc(where)}</span><span class="flow-name">${name}</span><span class="flow-kind">${esc(c.kind)}</span>${c.note ? `<span class="flow-note">${esc(c.note)}</span>` : ''}</div>`;
  }

  // 「次の1本」カード。モックにない銘柄はリンクにしない
  function nextCard(n) {
    const w = n.id ? W.get(n.id) : null;
    const inner = `<span class="next-name">${esc(n.name)}</span><span class="next-why">${esc(n.why)}</span>${w ? '' : '<span class="next-soon">ページ準備中</span>'}`;
    return w
      ? `<a class="next" href="#/whisky/${esc(w.id)}">${inner}</a>`
      : `<div class="next next--off">${inner}</div>`;
  }

  function viewWhisky(id) {
    const w = W.get(id);
    if (!w) return viewNotFound();
    const multi = w.components.length > 1;
    const std = DATA.standards[w.standard];
    const opinion = '<span class="opinion">編集部の見立て</span>';
    return {
      title: `${w.name}｜${SITE}`,
      html: `
<nav class="crumb" aria-label="現在地"><a href="#/">トップ</a> / 銘柄</nav>
<header class="w-head">
  ${bottle(w, 'lg')}
  <div class="w-title">
    <p class="w-maker">${esc(w.maker)}・${esc(w.type)}</p>
    <h1 class="w-name">${esc(w.name)}</h1>
    <p class="w-en">${esc(w.nameEn)}</p>
    ${badge(w.standard, true)}
  </div>
</header>
<div class="w-first">
  <section class="w-origin" aria-labelledby="origin-h">
    <h2 class="label" id="origin-h">${multi ? '中身の原酒と産地' : '産地・蒸溜所'}</h2>
    <ul class="chips">${w.components.map((c) => `<li>${componentChip(c)}</li>`).join('')}</ul>
    ${w.originNote ? `<p class="origin-note">${esc(w.originNote)}</p>` : ''}
  </section>
  <section class="w-taste" aria-labelledby="taste-h">
    <h2 class="label" id="taste-h">味のイメージ${opinion}</h2>
    <div class="w-taste-body"><p class="w-line">${esc(w.taste.line)}</p>${tasteMap({ focus: w.id })}</div>
  </section>
  <section class="w-serve" aria-labelledby="serve-h">
    <h2 class="label" id="serve-h">おすすめの飲み方${opinion}</h2>
    <ul class="serve">${SERVES.map(([k, label]) => `<li class="serve-item serve-${w.serve[k]}"><span class="serve-mark" aria-hidden="true">${MARK[w.serve[k]]}</span><span class="serve-name">${label}</span><span class="sr-only">${MARK_TEXT[w.serve[k]]}</span></li>`).join('')}</ul>
  </section>
  <section class="w-next" aria-labelledby="next-h">
    <h2 class="label" id="next-h">似ている銘柄・次の1本${opinion}</h2>
    <ul class="next-row">${w.next.map((n) => `<li>${nextCard(n)}</li>`).join('')}</ul>
  </section>
</div>
<div class="deep">
  <p class="deep-intro">もっと知る</p>
  <section id="official" aria-labelledby="official-h">
    <h2 id="official-h">香り・味・余韻</h2>
    <dl class="dl">${w.official.map((o) => `<dt>${esc(o.k)}</dt><dd>${esc(o.v)}</dd>`).join('')}</dl>
    <p class="note">メーカー公式の説明を要約しています。${w.official.length === 1 ? '香り・味・余韻を分けた説明は、公式ページにありません。' : ''}</p>
  </section>
  <section id="casks" aria-labelledby="casks-h">
    <h2 id="casks-h">原酒と樽</h2>
    <div class="flow">${w.components.map(flowItem).join('')}<div class="flow-arrow" aria-hidden="true">▼</div><div class="flow-result">${esc(w.name)}</div></div>
    <p class="note">${esc(w.componentsNote)}</p>
    <p class="note">${esc(w.casks)}</p>
  </section>
  <section id="story" class="story" aria-labelledby="story-h">
    <h2 id="story-h">造り手と歴史</h2>
    ${w.story.map((p) => `<p>${esc(p)}</p>`).join('')}
  </section>
  <section id="specs" aria-labelledby="specs-h">
    <h2 id="specs-h">スペック</h2>
    <dl class="dl">${w.specs.map((x) => `<dt>${esc(x.k)}</dt><dd>${esc(x.v)}</dd>`).join('')}<dt>表示基準</dt><dd>${esc(std.label)}。${esc(w.standardNote)}</dd></dl>
  </section>
  ${sourcesHtml(w.sources)}
</div>`,
    };
  }
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && node --test mock/tests/*.check.mjs`
Expected: PASS（data 6件＋render 19件、0 fail）

- [ ] **Step 5: コミット**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add mock/index.html mock/tests/render.check.mjs
git commit -m "mock: 銘柄ページ（最初の一画面と、原酒・歴史・スペック・出典）を追加

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: 蒸溜所ページ・表示基準ページ

**Files:**
- Modify: `mock/index.html`（`// ===== 画面：蒸溜所・表示基準 =====` のスタブ2つを置き換え）
- Modify: `mock/tests/render.check.mjs`（末尾に追記）

**Interfaces:**
- Consumes: Task 2 の共通関数、Task 3 の銘柄ページ（画面遷移のテストで使う）
- Produces: 蒸溜所ページの DOM: `h1.d-name`, `.d-meta`（所在地・創業・運営）, `#features`, `#used`（`ul.cards a.card` と `.used-role`、`ul.plain-list li`）, `#sources`。表示基準ページ: `h1.d-name`, `.std-items dt` ×5, `#kinds .badge` ×3, `#sources`

- [ ] **Step 1: テストを書く（失敗する）**

`mock/tests/render.check.mjs` の末尾に追記:

```js
test('蒸溜所ページ：山崎', () => {
  const env = load('#/distillery/yamazaki');
  const d = env.document;
  assert.equal(d.querySelector('h1').textContent, '山崎蒸溜所');
  assert.match(d.querySelector('.d-meta').textContent, /大阪府三島郡島本町山崎5-2-1/);
  assert.match(d.querySelector('.d-meta').textContent, /1923年/);
  assert.equal(d.querySelectorAll('#features dt').length, 4);
  const used = [...d.querySelectorAll('#used a.card')].map((a) => a.getAttribute('href'));
  assert.deepEqual(used, ['#/whisky/hibiki-jh', '#/whisky/ao']);
  assert.deepEqual([...d.querySelectorAll('#used .used-role')].map((s) => s.textContent), ['モルト原酒として使用', 'モルト原酒として使用']);
  assert.equal(d.querySelectorAll('#used .plain-list li').length, 4);
  assert.equal(d.querySelectorAll('#sources a').length, DATA.distilleries.find((x) => x.id === 'yamazaki').sources.length);
  assert.equal(d.title, '山崎蒸溜所｜ジャパニーズウイスキー図鑑（仮）');
  assert.deepEqual(env.errors, []);
});

test('蒸溜所ページ：ページのない蒸溜所は見つからない表示', () => {
  const env = load('#/distillery/hakushu');
  assert.equal(text(env.document.querySelector('h1')), 'ページが見つかりません');
});

test('銘柄と蒸溜所を行き来できる', () => {
  const env = load('#/whisky/hibiki-jh');
  const chip = env.document.querySelector('.w-origin a.chip');
  go(env, chip.getAttribute('href'));
  assert.equal(env.document.querySelector('h1').textContent, '山崎蒸溜所');
  const back = env.document.querySelector('#used a.card[href="#/whisky/hibiki-jh"]');
  go(env, back.getAttribute('href'));
  assert.equal(env.document.querySelector('h1').textContent, '響 JAPANESE HARMONY');
  assert.deepEqual(env.errors, []);
});

test('表示基準ページ：要件5つと3区分と出典', () => {
  const env = load('#/standard');
  const d = env.document;
  assert.match(d.querySelector('h1').textContent, /ジャパニーズウイスキー/);
  assert.deepEqual([...d.querySelectorAll('.std-items dt')].map((x) => x.textContent), ['原材料', '造り', '熟成', '瓶詰め', 'その他']);
  assert.deepEqual([...d.querySelectorAll('#kinds .badge')].map((x) => x.textContent), ['ジャパニーズウイスキー', '海外原酒を含む', '区分 未確認']);
  assert.equal(d.querySelectorAll('#sources a').length, 2);
});

test('銘柄ページのバッジから表示基準ページへ行ける', () => {
  const env = load('#/whisky/ao');
  go(env, env.document.querySelector('.w-head .badge').getAttribute('href'));
  assert.match(env.document.querySelector('h1').textContent, /名乗れる条件/);
});
```

- [ ] **Step 2: テストが失敗することを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && node --test mock/tests/render.check.mjs`
Expected: FAIL（蒸溜所・表示基準の4件が失敗。「ページが見つかりません」が出るため。「ページのない蒸溜所」の1件は通る）

- [ ] **Step 3: 2つのページを実装する**

`mock/index.html` の次のスタブ:

```js
  // ===== 画面：蒸溜所・表示基準 =====
  function viewDistillery(id) {
    return viewNotFound();
  }

  function viewStandard() {
    return viewNotFound();
  }
```

を、次に置き換える:

```js
  // ===== 画面：蒸溜所・表示基準 =====
  function viewDistillery(id) {
    const d = D.get(id);
    if (!d || !d.hasPage) return viewNotFound();
    // このサイトにある銘柄のうち、この蒸溜所の原酒を使っているもの
    const used = DATA.whiskies.flatMap((w) => w.components.filter((c) => c.distillery === d.id).map((c) => ({ w, c })));
    return {
      title: `${d.name}｜${SITE}`,
      html: `
<nav class="crumb" aria-label="現在地"><a href="#/">トップ</a> / 蒸溜所</nav>
<header class="d-head">
  <p class="w-maker">${esc(d.pref)}・${esc(d.maker)}</p>
  <h1 class="d-name">${esc(d.name)}</h1>
  <p class="w-en">${esc(d.nameEn)}</p>
  <p class="d-lead">${esc(d.lead)}</p>
</header>
<dl class="dl d-meta"><dt>所在地</dt><dd>${esc(d.address)}</dd><dt>創業</dt><dd>${esc(d.founded)}</dd><dt>運営</dt><dd>${esc(d.maker)}</dd></dl>
<div class="deep">
  <section id="features" aria-labelledby="features-h">
    <h2 id="features-h">この蒸溜所の特徴</h2>
    <dl class="dl">${d.features.map((f) => `<dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd>`).join('')}</dl>
  </section>
  <section id="used" aria-labelledby="used-h">
    <h2 id="used-h">この蒸溜所の原酒が使われている銘柄</h2>
    <h3 class="sub">このサイトで見られる銘柄</h3>
    <ul class="cards">${used.map(({ w, c }) => `<li><a class="card" href="#/whisky/${esc(w.id)}">${bottle(w, 'sm')}<span class="card-body"><span class="used-role">${esc(c.kind)}として使用</span><span class="card-name">${esc(w.name)}</span><span class="card-meta">${esc(w.maker)}・${esc(w.type)}</span>${badge(w.standard, false)}</span></a></li>`).join('')}</ul>
    <h3 class="sub">シングルモルト（定番品）</h3>
    <ul class="plain-list">${d.singleMalts.map((m) => `<li><span>${esc(m)}</span><small>ページ準備中</small></li>`).join('')}</ul>
    <p class="note">原酒の使用を公表で確認できた銘柄だけを載せています。</p>
  </section>
  ${sourcesHtml(d.sources)}
</div>`,
    };
  }

  function viewStandard() {
    const rule = DATA.standardRule;
    return {
      title: `表示基準について｜${SITE}`,
      html: `
<nav class="crumb" aria-label="現在地"><a href="#/">トップ</a> / 表示基準</nav>
<header class="d-head">
  <p class="w-maker">ジャパニーズウイスキーの表示基準</p>
  <h1 class="d-name std-title">${esc(rule.title)}</h1>
  <p class="d-lead">${esc(rule.summary)}</p>
</header>
<dl class="dl std-items">${rule.items.map((x) => `<dt>${esc(x.k)}</dt><dd>${esc(x.v)}</dd>`).join('')}</dl>
<div class="deep">
  <section id="kinds" aria-labelledby="kinds-h">
    <h2 id="kinds-h">このサイトの3つの区分</h2>
    <ul class="kinds">${['jw', 'foreign', 'unknown'].map((k) => `<li>${badge(k, false)}<p>${esc(DATA.standards[k].desc)}</p></li>`).join('')}</ul>
    <p class="note">区分はメーカーの公表内容で決めています。この基準は業界団体の自主基準で、法律による決まりではありません。</p>
  </section>
  ${sourcesHtml(rule.sources)}
</div>`,
    };
  }
```

- [ ] **Step 4: テストが通ることを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && node --test mock/tests/*.check.mjs`
Expected: PASS（data 6件＋render 24件、0 fail）

- [ ] **Step 5: コミット**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add mock/index.html mock/tests/render.check.mjs
git commit -m "mock: 山崎蒸溜所ページと表示基準ページ、銘柄との行き来を追加

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: 夜のバーの見た目と、実機幅での確認

**Files:**
- Modify: `mock/index.html`（`<style>` を置き換え）
- Create: `mock/tests/shots.sh`
- Modify: `/Users/nozaki/Desktop/CEO/.claude/launch.json`（`configurations` に1件追加。コミットしない）

**Interfaces:**
- Consumes: Task 2〜4 のクラス名（`.site-header`, `.brand*`, `.hero`, `.search`, `.cards`, `.card*`, `.badge--*`, `.bottle*`, `.tmap*`, `.dot*`, `.quads`, `.quad*`, `.prefs`, `.pref*`, `.std-card`, `.crumb`, `.w-*`, `.chip*`, `.serve*`, `.next*`, `.deep*`, `.dl`, `.flow*`, `.sources`, `.source-used`, `.d-*`, `.sub`, `.plain-list`, `.kinds`, `.std-*`, `.empty`, `.clear`, `.count`, `.opinion`, `.label`, `.note`, `.btn`, `.sr-only`, `.site-footer`）
- Produces: プレビュー設定 `whisky-mock`（ポート 8799）

- [ ] **Step 1: スクショ用のスクリプトを書く**

`mock/tests/shots.sh`:

```bash
#!/bin/bash
# モックの全画面を、スマホ・タブレット・PCの幅で撮る（目視確認用）
# 使い方: bash mock/tests/shots.sh <出力先ディレクトリ>
set -euo pipefail
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="${1:?出力先ディレクトリを指定してください}"
mkdir -p "$OUT"
URL="file://$PWD/index.html"
ROUTES=("top|" "search|#/?q=hibiki" "hibiki|#/whisky/hibiki-jh" "yoichi|#/whisky/yoichi" "ao|#/whisky/ao" "yamazaki|#/distillery/yamazaki" "standard|#/standard")
SIZES=("375,812" "375,2800" "768,1800" "1280,1800")
for entry in "${ROUTES[@]}"; do
  name="${entry%%|*}"
  hash="${entry#*|}"
  for size in "${SIZES[@]}"; do
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 \
      --window-size="$size" --screenshot="$OUT/${name}_${size/,/x}.png" "$URL$hash" >/dev/null 2>&1
  done
done
ls "$OUT"
```

- [ ] **Step 2: 見た目を入れる前のスクショを撮り、崩れていることを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && bash mock/tests/shots.sh /private/tmp/claude-501/-Users-nozaki-Desktop-CEO/cb959ff5-b633-465d-af33-ee76cb61f555/scratchpad/shots-before`
Expected: 28枚の PNG が出る。`hibiki_375x812.png` を開くと白背景・素のHTMLで、夜のバーの見た目になっていない

- [ ] **Step 3: `<style>` を置き換える**

`mock/index.html` の `<style>` から `</style>` まで（Task 1 の `body{margin:0}` だけのもの）を、次に置き換える:

```html
<style>
/* ===== 色と寸法（夜のバー）===== */
:root{
  --bg:#15100c; --bg-2:#1b1510; --surface:#221a14; --surface-2:#2b2119;
  --line:#3b2f25; --line-2:#4d3e30;
  --text:#f1e8da; --text-2:#c4b39c; --text-3:#9a8974;
  --amber:#dc9d42; --amber-2:#f2bd66; --amber-ink:#1b1209; --amber-dim:rgba(220,157,66,.14);
  --foreign:#8fb6c6; --foreign-dim:rgba(143,182,198,.14);
  --unknown:#aa9b8b; --unknown-dim:rgba(170,155,139,.14);
  --radius:14px; --gutter:16px; --maxw:720px; --header-h:52px;
  --font:"Noto Sans JP", system-ui, -apple-system, "Hiragino Sans", sans-serif;
  color-scheme:dark;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:var(--font);font-size:15px;line-height:1.75;overflow-wrap:anywhere}
a{color:inherit}
h1,h2,h3{font-feature-settings:"palt" 1}
.wrap{max-width:var(--maxw);margin:0 auto;padding:0 var(--gutter)}
.sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--amber-2);outline-offset:2px}

/* ===== ヘッダー・フッター ===== */
.site-header{position:sticky;top:0;z-index:10;background:rgba(21,16,12,.9);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.site-header-in{display:flex;align-items:center;justify-content:space-between;gap:10px;height:var(--header-h)}
.brand{display:flex;align-items:center;gap:8px;min-width:0;text-decoration:none}
.brand-dot{flex:none;width:10px;height:10px;border-radius:50%;background:var(--amber);box-shadow:0 0 12px var(--amber)}
.brand-name{font-weight:700;font-size:15px;letter-spacing:.04em;white-space:nowrap}
.brand-tag{font-size:10px;line-height:1.6;color:var(--text-3);border:1px solid var(--line-2);border-radius:999px;padding:0 7px;white-space:nowrap}
.header-search{flex:none;font-size:13px;color:var(--amber-2);text-decoration:none;border:1px solid var(--line-2);border-radius:999px;padding:4px 12px}
#app{padding-bottom:48px}
.site-footer{border-top:1px solid var(--line);padding:22px 0 36px;color:var(--text-3);font-size:12px;line-height:1.7}
.site-footer p{margin:0 0 6px}

/* ===== 共通の部品 ===== */
.crumb{padding:10px 0 4px;font-size:12px;color:var(--text-3)}
.crumb a{color:var(--text-2);text-decoration:none}
.label{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.12em;color:var(--text-2)}
.opinion{display:inline-block;font-size:10px;font-weight:500;line-height:1.7;letter-spacing:.04em;color:var(--text-3);border:1px dashed var(--line-2);border-radius:999px;padding:0 7px;white-space:nowrap}
.note{margin:8px 0 0;font-size:12px;line-height:1.7;color:var(--text-3)}
.btn{display:inline-block;padding:10px 18px;border-radius:999px;background:var(--amber);color:var(--amber-ink);font-weight:700;text-decoration:none}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;line-height:1;padding:6px 10px;border-radius:999px;text-decoration:none;white-space:nowrap}
.badge::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}
a.badge::after{content:"›";margin-left:2px;opacity:.7}
.badge--jw{color:var(--amber-2);background:var(--amber-dim);border:1px solid rgba(220,157,66,.45)}
.badge--foreign{color:var(--foreign);background:var(--foreign-dim);border:1px solid rgba(143,182,198,.45)}
.badge--unknown{color:var(--unknown);background:var(--unknown-dim);border:1px dashed rgba(170,155,139,.55)}
.badges{display:flex;flex-wrap:wrap;gap:6px}

/* ボトル図（写真の代わり） */
.bottle{position:relative;flex:none;width:52px;height:118px}
.bottle-neck{position:absolute;left:50%;top:0;width:16px;height:30px;transform:translateX(-50%);border-radius:4px 4px 2px 2px;background:linear-gradient(90deg,#3a2c20,#5d4634 50%,#3a2c20)}
.bottle-body{position:absolute;left:0;right:0;top:26px;bottom:0;border-radius:14px 14px 8px 8px;background:linear-gradient(90deg,rgba(0,0,0,.38),transparent 30%,rgba(255,255,255,.14) 55%,transparent 72%,rgba(0,0,0,.38)),var(--liquid);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 10px 24px rgba(0,0,0,.5)}
.bottle-label{position:absolute;left:7px;right:7px;top:50px;height:40px;display:grid;place-items:center;border-radius:4px;background:var(--label);color:var(--mark);font-weight:900;font-size:20px;line-height:1}
.bottle--sm{width:34px;height:76px}
.bottle--sm .bottle-neck{width:11px;height:20px}
.bottle--sm .bottle-body{top:17px;border-radius:10px 10px 6px 6px}
.bottle--sm .bottle-label{left:5px;right:5px;top:32px;height:26px;font-size:13px}

/* 味の地図 */
.tmap{display:grid;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto auto;grid-template-areas:". top ." "left map right" ". bottom .";align-items:center;justify-items:center;gap:3px;color:var(--text-3);font-size:10px;line-height:1}
.tmap svg{grid-area:map;display:block;width:100%;height:auto}
.tmap-top{grid-area:top}
.tmap-bottom{grid-area:bottom}
.tmap-left{grid-area:left;writing-mode:vertical-rl;letter-spacing:.12em}
.tmap-right{grid-area:right;writing-mode:vertical-rl;letter-spacing:.12em}
.tmap--sm{width:148px}
.tmap--lg{width:100%;max-width:420px;margin:0 auto;font-size:12px}
.tmap-frame{fill:var(--bg-2);stroke:var(--line-2)}
.tmap-axis{stroke:var(--line-2);stroke-dasharray:2 3}
.dot{fill:var(--text-3);opacity:.5}
.dot--focus{fill:var(--amber-2);opacity:1;stroke:rgba(242,189,102,.3);stroke-width:8}
.dot--all{fill:var(--amber);opacity:1}
.dot-label{fill:var(--text-2);font-size:11px;font-weight:700;font-family:var(--font)}

/* ===== トップ ===== */
.hero{margin:0 calc(var(--gutter) * -1);padding:28px var(--gutter) 18px;background:radial-gradient(120% 90% at 50% 0%,rgba(220,157,66,.16),transparent 70%)}
.eyebrow{margin:0 0 8px;font-size:11px;letter-spacing:.28em;color:var(--amber-2)}
.hero h1{margin:0;font-size:28px;line-height:1.4;font-weight:900;letter-spacing:.04em}
.hero-lead{margin:10px 0 18px;font-size:14px;color:var(--text-2)}
.search{display:flex;align-items:center;gap:8px;padding:4px 4px 4px 16px;border-radius:999px;background:var(--surface);border:1px solid var(--line-2)}
.search:focus-within{border-color:var(--amber);box-shadow:0 0 0 3px var(--amber-dim)}
.search input{flex:1;min-width:0;padding:10px 0;border:0;outline:0;background:transparent;color:var(--text);font:inherit;font-size:16px;-webkit-appearance:none;appearance:none}
.search input::placeholder{color:var(--text-3)}
.search button{flex:none;padding:10px 18px;border:0;border-radius:999px;background:var(--amber);color:var(--amber-ink);font:inherit;font-size:14px;font-weight:700;cursor:pointer}
.search-hint{margin:8px 0 0;font-size:12px;color:var(--text-3)}
.sec{margin-top:30px}
#results{scroll-margin-top:calc(var(--header-h) + 12px)}
.sec-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;margin-bottom:10px}
.sec-head h2{margin:0;font-size:18px;font-weight:700;letter-spacing:.04em}
.count{font-size:12px;color:var(--text-3)}
.clear{margin-left:auto;font-size:12px;color:var(--amber-2)}
.empty{margin:0;padding:14px 16px;border:1px dashed var(--line-2);border-radius:var(--radius);color:var(--text-2);font-size:14px}
.cards{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.card{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:var(--radius);background:var(--surface);border:1px solid var(--line);text-decoration:none}
.card:hover{border-color:var(--line-2)}
.card-body{display:flex;flex-direction:column;align-items:flex-start;min-width:0;flex:1}
.card-kind{font-size:11px;color:var(--amber-2);letter-spacing:.1em}
.card-name{font-size:15px;font-weight:700;line-height:1.45}
.card-meta{font-size:12px;line-height:1.6;color:var(--text-3)}
.card .badge{margin-top:6px;font-size:10.5px;padding:4px 8px}
.prefs{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.pref{padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line)}
.pref-name{margin:0 0 2px;font-size:12px;letter-spacing:.08em;color:var(--text-3)}
.pref ul{list-style:none;margin:0;padding:0}
.pref a{font-weight:700;text-decoration:underline;text-decoration-color:rgba(220,157,66,.55);text-underline-offset:3px}
.pref .soon{font-size:14px;color:var(--text-2)}
.pref .soon small{margin-left:6px;font-size:10px;color:var(--text-3)}
.quads{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}
.quad{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line);text-decoration:none}
.quad[aria-current="true"]{border-color:var(--amber);background:var(--amber-dim)}
.quad-name{font-size:14px;font-weight:700}
.quad-count{font-size:11.5px;color:var(--text-3)}
.std-card{display:block;padding:16px;border-radius:var(--radius);background:linear-gradient(135deg,var(--surface-2),var(--surface));border:1px solid var(--line-2);text-decoration:none}
.std-card h2{margin:0 0 6px;font-size:16px;line-height:1.5}
.std-card p{margin:0 0 12px;font-size:13px;color:var(--text-2)}

/* ===== 銘柄ページ：最初の一画面 ===== */
.w-head{display:flex;align-items:flex-end;gap:14px;padding:6px 0 14px}
.w-title{min-width:0}
.w-maker{margin:0;font-size:12px;letter-spacing:.04em;color:var(--text-2)}
.w-name{margin:2px 0 0;font-size:24px;line-height:1.3;font-weight:900;letter-spacing:.02em}
.w-en{margin:4px 0 8px;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-3)}
.w-first{display:grid;gap:12px}
.w-first > section{padding-top:12px;border-top:1px solid var(--line)}
.chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:baseline;gap:6px;padding:5px 10px;border-radius:10px;background:var(--surface);border:1px solid var(--line);font-size:14px;line-height:1.4;text-decoration:none}
a.chip{border-color:var(--line-2)}
a.chip:hover{border-color:var(--amber)}
.chip-where{font-size:11px;color:var(--text-3)}
.chip-name{font-weight:700}
a.chip .chip-name{text-decoration:underline;text-decoration-color:rgba(220,157,66,.55);text-underline-offset:3px}
.chip-kind{font-size:11px;color:var(--amber-2)}
.origin-note{margin:6px 0 0;font-size:11.5px;line-height:1.6;color:var(--text-3)}
.w-taste-body{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px}
.w-line{margin:0;font-size:17px;font-weight:700;line-height:1.6}
.serve{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}
.serve-item{display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 2px;border-radius:10px;background:var(--surface);border:1px solid var(--line);font-size:12px;color:var(--text-2)}
.serve-mark{font-size:19px;font-weight:700;line-height:1.2}
.serve-3{border-color:rgba(220,157,66,.55);color:var(--text)}
.serve-3 .serve-mark{color:var(--amber-2)}
.serve-2 .serve-mark{color:var(--text)}
.serve-1{opacity:.6}
.next-row{list-style:none;margin:0 calc(var(--gutter) * -1);padding:0 var(--gutter) 4px;display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.next-row::-webkit-scrollbar{display:none}
.next-row > li{flex:0 0 72%;max-width:260px;scroll-snap-align:start}
.next{display:flex;flex-direction:column;gap:4px;height:100%;padding:10px 12px;border-radius:12px;background:var(--surface);border:1px solid var(--line);text-decoration:none}
a.next{border-color:rgba(220,157,66,.5)}
.next-name{font-size:14px;font-weight:700;line-height:1.45}
.next-why{font-size:12px;line-height:1.6;color:var(--text-2)}
.next-soon{margin-top:auto;font-size:10.5px;color:var(--text-3)}

/* ===== 丁寧に知る部分・蒸溜所・表示基準 ===== */
.deep{display:grid;gap:26px;margin-top:30px}
.deep-intro{display:flex;align-items:center;gap:10px;margin:0;font-size:12px;letter-spacing:.16em;color:var(--amber-2)}
.deep-intro::after{content:"";flex:1;height:1px;background:var(--line-2)}
.deep h2{margin:0 0 10px;font-size:18px;font-weight:700;letter-spacing:.04em}
.dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:8px 14px;margin:0;font-size:14px;line-height:1.7}
.dl dt{padding-top:1px;font-size:12.5px;color:var(--text-3);white-space:nowrap}
.dl dd{margin:0}
.story p{margin:0 0 10px}
.flow{display:grid;gap:6px}
.flow-item{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--line)}
.flow-where{font-size:11px;color:var(--text-3)}
.flow-name{font-weight:700}
.flow-name a{color:var(--amber-2)}
.flow-kind{font-size:12px;color:var(--amber-2)}
.flow-note{flex-basis:100%;font-size:12px;color:var(--text-2)}
.flow-arrow{text-align:center;font-size:12px;line-height:1;color:var(--amber)}
.flow-result{padding:10px 12px;border-radius:10px;border:1px solid var(--amber);background:var(--amber-dim);font-weight:700;text-align:center}
.sources{display:grid;gap:10px;margin:0;padding-left:1.4em;font-size:13px;line-height:1.6;color:var(--text-2)}
.sources a{color:var(--amber-2)}
.source-used{display:block;font-size:11.5px;color:var(--text-3)}
.d-head{padding:6px 0 14px}
.d-name{margin:2px 0 0;font-size:26px;line-height:1.35;font-weight:900;letter-spacing:.04em}
.d-lead{margin:6px 0 0;font-size:15px;color:var(--text-2)}
.d-meta{padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.sub{margin:16px 0 8px;font-size:13px;font-weight:700;letter-spacing:.06em;color:var(--text-2)}
.used-role{font-size:11px;letter-spacing:.06em;color:var(--amber-2)}
.plain-list{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.plain-list li{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:8px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--line);font-size:14px}
.plain-list small{flex:none;font-size:11px;color:var(--text-3)}
.std-title{font-size:22px;line-height:1.5}
.std-items{padding:14px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.kinds{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.kinds li{padding:12px 14px;border-radius:12px;background:var(--surface);border:1px solid var(--line)}
.kinds p{margin:8px 0 0;font-size:13.5px;color:var(--text-2)}

/* ===== 広い画面 ===== */
@media (min-width:600px){
  .prefs{grid-template-columns:repeat(3,minmax(0,1fr))}
  .quads{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media (min-width:768px){
  body{font-size:16px}
  .hero{padding-top:44px}
  .hero h1{font-size:38px}
  .w-name{font-size:30px}
  .tmap--sm{width:176px}
  .next-row{margin:0;padding:0 0 4px}
  .next-row > li{flex-basis:calc((100% - 16px) / 3)}
}
</style>
```

- [ ] **Step 4: テストが引き続き通ることを確かめる**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && node --test mock/tests/*.check.mjs`
Expected: PASS（30件、0 fail。`<style>` の中に長いダッシュがないことも data テストが見る）

- [ ] **Step 5: スクショを撮って全画面を目視する**

Run: `cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site && bash mock/tests/shots.sh /private/tmp/claude-501/-Users-nozaki-Desktop-CEO/cb959ff5-b633-465d-af33-ee76cb61f555/scratchpad/shots-after`
Expected: 28枚。Read ツールで次を必ず目で見る: 7画面の `375x2800`（全体）、3銘柄の `375x812`（最初の一画面）、`top` と `hibiki` の `768x1800` と `1280x1800`。確認すること:
- 背景が深い茶黒で、文字が読める。琥珀色のアクセントが効いている
- 文字の被り・はみ出し・切れがない（特にヘッダーのブランド名、銘柄名、チップ、飲み方の4マス、味の地図のラベル）
- 横スクロールが出ていない（右端に余白の崩れがない）
- 銘柄ページの `375x812` で、産地・原酒、味のイメージ、飲み方までが見え、「次の1本」の見出しが画面内にかかっている

崩れがあれば `<style>` を直して Step 4〜5 を繰り返す。

- [ ] **Step 6: プレビュー設定を追加する**

`/Users/nozaki/Desktop/CEO/.claude/launch.json` の `configurations` 配列の最後の要素の後ろに、次の1件を追加する（直前の要素の `}` の後ろにカンマを付ける）:

```json
    {
      "name": "whisky-mock",
      "runtimeExecutable": "python3",
      "runtimeArgs": ["-m", "http.server", "8799", "--bind", "127.0.0.1", "--directory", "OtaSanpot/whisky-site/mock"],
      "port": 8799
    }
```

Run: `cd /Users/nozaki/Desktop/CEO && python3 -c "import json; c=json.load(open('.claude/launch.json')); print([x['name'] for x in c['configurations']][-1])"`
Expected: `whisky-mock`

- [ ] **Step 7: 内蔵ブラウザで、スマホ幅の最初の一画面を数値で確かめる**

1. `preview_start` に `{name: "whisky-mock"}`
2. `resize_window` に `{width: 375, height: 812}`
3. 3銘柄それぞれで `navigate` を `http://localhost:8799/#/whisky/<id>`（`hibiki-jh`, `yoichi`, `ao`）にし、`javascript_tool` で次を実行:

```js
({
  serveBottom: Math.round(document.querySelector('.w-serve').getBoundingClientRect().bottom),
  nextTop: Math.round(document.querySelector('.w-next').getBoundingClientRect().top),
  viewport: innerHeight,
  noHScroll: document.documentElement.scrollWidth <= innerWidth,
  font: getComputedStyle(document.body).fontFamily,
})
```

Expected: 3銘柄とも `serveBottom <= viewport`、`nextTop < viewport`、`noHScroll: true`、`font` が `"Noto Sans JP"` で始まる。
4. トップ（`http://localhost:8799/`）で検索窓に `ひびき` を入力し、`read_page` で結果に「響 JAPANESE HARMONY」だけが出ることを確認
5. 響のページで「山崎」のチップを押して山崎蒸溜所ページに移り、そこから響へ戻れることを確認
6. `read_console_messages` に `{onlyErrors: true}` でエラーが0件
7. `resize_window` に `{preset: "desktop"}` で幅を戻す

満たさない場合は `<style>`（一画面に入らない時は `.w-head` の余白、`.w-line` の文字サイズ、`.tmap--sm` の幅、`.serve-item` の余白の順に詰める）を直し、Step 4 から繰り返す。

- [ ] **Step 8: コミット**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
git add mock/index.html mock/tests/shots.sh
git commit -m "mock: 夜のバーの見た目（Noto Sans JPのみ・スマホ優先）とスクショ確認スクリプトを追加

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

（`launch.json` は CEO リポ側の設定で、ほかの未コミットの変更と混ざっているためコミットしない）

- [ ] **Step 9: 完了報告の材料をそろえる**

- `hibiki_375x812.png`、`ao_375x812.png`、`top_375x2800.png` を CEO に見せる
- 差し替え（イチローズ → 碧Ao）の理由と、`SOURCES.md` の未解決事項を報告する
- 全テストの結果（件数）を報告する

---

## 実装時の変更（2026-09-18）

- **スクショ**: ヘッドレス Chrome は幅500px未満のウィンドウを描けず、`--window-size=375,…` でも実際は500px幅で描いて左375pxを切り取っていた。`mock/tests/frame.html`（指定幅の iframe）を足し、`shots.sh` はその枠越しに撮るように変更
- **ヘッダー**: 幅400px未満では「仮称・モック」の札を隠す（「探す」ボタンと重なったため）
- **改行**: 味の一言は読点ごとの句（`.ph`、inline-block）に分けて句の途中で改行しない。カード名・チップ・象限名・都道府県の蒸溜所名は `word-break:keep-all`、見出しは `word-break:auto-phrase`。味の一言の文字は16px（768px以上は18px）。テストを1件追加（計31件）
- **テスト**: jsdom 側で作られた配列は `deepStrictEqual` で型が合わないため、比較前にテスト側の配列へ作り直す
- **余市の区分と価格（Task 1 Step 7）**: CEO指定の生年で年齢確認を通し、アサヒの商品ページ本文で「表示基準に合致」と「参考小売価格 7,000円（税別）」を確認。表記を「参考小売価格」に修正。同ページのカクテル紹介を「メーカーのおすすめ」（`makerServe`）として飲み方の欄に追加（設計書 8 の「メーカー推奨」）。テストを2件追加（計33件）
