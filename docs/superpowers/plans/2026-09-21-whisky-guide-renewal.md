# Japanese Whisky Guide リニューアル（Phase 1＋2）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1枚のHTMLに詰まっている Japanese Whisky Guide を4ファイルに分け、96銘柄に味わい5段階・余韻・シーン・掲載日を足したうえで、一覧・診断・比較・味わいMAP・今日の1本・地方別の蒸溜所一覧をそろえて「自分に合う1本が見つかるサイト」にする。

**Architecture:** 素のHTML・CSS・JavaScriptのまま。`index.html`（骨組み）・`styles.css`（見た目）・`data.js`（`window.WDATA`）・`app.js`（画面とルーター）の4ファイルに分け、`app.js` は今までどおり1つのIIFEの中に「共通部品 → 画面（view）→ ルーター」の順で並べる。画面はすべてハッシュルーティング（`#/list` など）で、状態はURLに持たせる。データは手で書いた事実（出典つき）と、規則で自動算出した見立て（味わい5段階など）を同じレコードに持ち、画面側で「サイト独自の目安」と明記して区別する。

**Tech Stack:** HTML / CSS / JavaScript（フレームワークなし）、Node 20 の標準テストランナー（`node --test`）＋ jsdom、GitHub Actions ＋ GitHub Pages

**Spec:** `docs/superpowers/specs/2026-09-21-whisky-guide-renewal-design.md`

## Global Constraints

仕様書と CLAUDE.md から。**すべてのタスクに、この節の要件が含まれる。**

- **価格を載せない。** `specs` の `k` に「価格」を入れない。サイトのどこにも「円（税別）」「円（税込）」を書かない
- **長いダッシュ（`—` `―`）を使わない。** 読点・句点・「つまり」に置き換える
- **事実と見立てを分ける。** 事実（産地・蒸溜所・原酒・度数・容量・表示基準の区分・歴史）は公式ページで裏取りして `sources` に出典と確認日を持たせる。見立て（味の一言・味わい5段階・余韻・シーン・こんな人におすすめ・診断・次の1本・比較の説明文）は画面に「サイト独自の目安」または「編集部の見立て」と明記する
- **このタスク群で新しい事実を足さない。** 銘柄・蒸溜所の追加や、公式からの新しい引用は今回の範囲外（既存96銘柄・20蒸溜所のまま）
- **フォントは Noto Sans JP のみ。** serif を足さない。日本語に italic を当てない
- **コメントは日本語。** 識別子は既存コードに合わせて JavaScript の camelCase（CLAUDE.md の snake_case は Python 側の規約）
- **モバイル基準。** 基準幅375px、左右の余白16px、本文15px（768px以上で16px）、押せるものは高さ44px以上、意図しない横スクロールを作らない
- **テストが通らなければ公開しない。** `node --test site/tests/*.check.mjs` が全部通ってからコミットする
- **git は ota-sanpot 名義。** このリポジトリのローカル設定が `ota-sanpot <uavpliyc3@gmail.com>` になっているので、`git commit` はそのままでよい。リポジトリ外へ `cd` しない、`git add -A` を使わない（対象ファイルを明示して `git add` する）
- **公開（push）は最後の Task 11 でまとめて行う。** 途中のタスクはコミットまで
- コミットメッセージの末尾に次の1行を入れる:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## ファイル構成（このリニューアル後の姿）

| パス | 役割 |
|------|------|
| `site/index.html` | 骨組みだけ。meta・ヘッダー・`<main id="app">`・フッター・`data.js`と`app.js`の読み込み |
| `site/styles.css` | 見た目のすべて |
| `site/data.js` | `window.WDATA = {...};` 銘柄96・蒸溜所20・表示基準 |
| `site/app.js` | 共通部品・画面・ルーター（1つのIIFE） |
| `site/404.html` | 旧URLから新トップへの転送（変えない） |
| `site/favicon.svg` / `site/apple-touch-icon.png` | アイコン（変えない） |
| `site/tools/enrich_profile.mjs` | 味わい5段階・余韻・シーンを規則から算出して `data.js` に書き戻す道具（公開しない） |
| `site/tests/helpers.mjs` | テスト共通部品 |
| `site/tests/data.check.mjs` | データの整合性テスト |
| `site/tests/profile.check.mjs` | 算出規則（`enrich_profile.mjs`）のテスト |
| `site/tests/render.check.mjs` | 画面描画・遷移のテスト |
| `site/tests/frame.html` / `site/tests/shots.sh` | スクリーンショットの道具 |
| `site/SOURCES.md` | 裏取りの記録（公開しない） |

## 全タスク共通の約束

**データの形（`window.WDATA`）**

```js
{
  checkedAt: '2026-09-18',                 // 事実の確認日
  standards: { jw:{label,desc}, foreign:{...}, spirits:{...}, other:{...}, unknown:{...} },
  standardRule: { title, items:[...], sources:[...] },
  distilleries: [{ id, name, nameEn, kana, maker, pref, address, founded, lead, features:[{k,v}], sources:[{title,url,used}] }],
  whiskies: [{
    id, name, nameEn, short, kana, aliases:[], maker, type,
    standard: 'jw'|'foreign'|'spirits'|'other'|'unknown', standardNote,
    limited?: '宮城県限定',                 // 限定品だけ
    look?: { liquid, label, mark, char },
    components: [{ distillery: 'yamazaki'|null, country: '日本', kind: 'モルト原酒' }],
    originNote?, componentsNote?, casks?,
    taste: { line, x, y },                 // x: 華やか-1 ↔ スモーキー+1、y: やわらか-1 ↔ 濃厚+1
    serve: { straight:1|2|3, rock, highball, mizuwari },
    makerServe?, next?: [{id,name,why}],
    official?: [{k,v}], story?: [], specs?: [{k,v}], sources: [{title,url,used}],
    // ↓ Task 2 で足す
    profile: { sweetness:1..5, fruitiness:1..5, smokiness:1..5, richness:1..5, drinkability:1..5 },
    finish: '短め'|'中くらい'|'長い',
    scenes: ['初めての1本', ...],
    addedAt: '2026-09-19'
  }]
}
```

**テストの書き方**

- ファイル名は `*.check.mjs`（`*.test.*` にすると既存の Jest 設定が拾ってしまう）
- 画面のテストは `await load('#/...')` で開く（Task 1 以降、`load` は非同期）
- 日本語の比較は空白を落としてから（`const text = (el) => el.textContent.replace(/\s+/g, '')`）
- 1テスト1つのふるまい。テスト名は日本語で「何がどうなるか」を書く

---

### Task 1: 4ファイルに分ける（見た目と機能は変えない）

いまの `site/index.html`（8744行）を `index.html` / `styles.css` / `data.js` / `app.js` に割る。**この段階では画面の中身を1文字も変えない。** 既存の52テストが、分けたあとも全部通ることがゴール。

**Files:**
- Modify: `site/index.html`（`<style>` と2つの `<script>` を外に出す）
- Create: `site/styles.css`, `site/data.js`, `site/app.js`
- Modify: `site/tests/helpers.mjs`（外部ファイル対応・`load` を非同期に）
- Modify: `site/tests/render.check.mjs`（`await load(...)` へ機械的に置換）
- Modify: `site/tests/data.check.mjs`（`html()` を見ていた検査を `allSource()` に）
- Modify: `.github/workflows/deploy.yml`（公開するファイルを追加）
- Modify: `README.md`（ファイル構成の説明）

**Interfaces:**
- Consumes: なし（ここが出発点）
- Produces:
  - `site/data.js` … `window.WDATA`（中身はいまの `#wdata` と同一）
  - `site/app.js` … IIFE。末尾で `window.__app = { search, norm, parseHash, render };`（名前を `__mock` から `__app` に変える）
  - `site/tests/helpers.mjs` …
    ```js
    export const SITE_DIR;                   // site/ の絶対パス
    export const HTML_PATH;                  // site/index.html
    export function html();                  // index.html の文字列
    export function appJs();                 // app.js の文字列
    export function css();                   // styles.css の文字列
    export function allSource();             // html()+css()+appJs()+data.js の文字列（文言の検査用）
    export function readData();              // data.js から window.WDATA を取り出す
    export async function load(hash = '');   // jsdom で開いて load 完了まで待つ → {dom, window, document, errors}
    export function go(env, hash);           // ハッシュを変えて描き直す
    ```

- [ ] **Step 1: 分割後の姿を決めるテストを書く**

`site/tests/data.check.mjs` の末尾に足す:

```js
test('4つのファイルに分かれていて、index.html から読み込んでいる', () => {
  const dir = dirname(HTML_PATH);
  for (const f of ['styles.css', 'data.js', 'app.js']) assert.ok(existsSync(join(dir, f)), f);
  const s = html();
  assert.match(s, /<link rel="stylesheet" href="styles\.css">/);
  assert.match(s, /<script src="data\.js"><\/script>/);
  assert.match(s, /<script src="app\.js"><\/script>/);
  assert.ok(!/<style>/.test(s), 'index.html に <style> が残っている');
  assert.ok(!/id="wdata"/.test(s), 'index.html にデータが残っている');
  assert.ok(s.length < 4000, `index.html が大きすぎる（${s.length}文字）`);
});
```

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/data.check.mjs
```

期待: `styles.css` が無い、で落ちる。

- [ ] **Step 3: 分割スクリプトを書いて実行する**

作業用のスクリプト（リポジトリには残さない）を作る:

```bash
cat > /tmp/split_once.mjs <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs';
const p = 'site/index.html';
const s = readFileSync(p, 'utf8');
const style = s.match(/<style>\n([\s\S]*?)<\/style>/)[1];
const data = s.match(/<script type="application\/json" id="wdata">\n([\s\S]*?)<\/script>/)[1];
const app = s.match(/<script>\n([\s\S]*?)<\/script>\n<\/body>/)[1];

writeFileSync('site/styles.css', style);
writeFileSync('site/data.js', 'window.WDATA = ' + data.trim() + ';\n');
writeFileSync(
  'site/app.js',
  app
    .replace("JSON.parse(document.getElementById('wdata').textContent)", 'window.WDATA')
    .replace('window.__mock', 'window.__app')
);

const head = s.slice(0, s.indexOf('<style>')) + '<link rel="stylesheet" href="styles.css">\n';
const body = s.slice(s.indexOf('</head>'), s.indexOf('<script type="application/json" id="wdata">'));
writeFileSync(p, head + body + '<script src="data.js"></script>\n<script src="app.js"></script>\n</body>\n</html>\n');
EOF
node /tmp/split_once.mjs && rm /tmp/split_once.mjs
```

確認:

```bash
wc -c site/index.html site/styles.css site/data.js site/app.js
head -3 site/data.js | cut -c1-60
tail -3 site/app.js
```

期待: `index.html` が3KB前後、`data.js` が `window.WDATA = {` で始まる、`app.js` の末尾が `})();`。

- [ ] **Step 4: テスト共通部品を外部ファイル対応にする**

`site/tests/helpers.mjs` を丸ごと次の内容にする:

```js
// テスト共通部品（ファイルの読込・データ抽出・jsdomでの起動）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));
export const SITE_DIR = join(here, '..');
export const HTML_PATH = join(SITE_DIR, 'index.html');

const read = (name) => readFileSync(join(SITE_DIR, name), 'utf8');
export const html = () => read('index.html');
export const css = () => read('styles.css');
export const appJs = () => read('app.js');
export const dataJs = () => read('data.js');

// 文言の検査用に、公開するソースをひとまとめにする
export const allSource = () => [html(), css(), dataJs(), appJs()].join('\n');

// data.js から window.WDATA の中身を取り出す
export function readData() {
  const m = dataJs().match(/^window\.WDATA = ([\s\S]*);\s*$/);
  if (!m) throw new Error('window.WDATA が見つからない');
  return JSON.parse(m[1]);
}

// jsdom で開く。外部ファイル（styles.css・data.js・app.js）を実際に読み込ませ、
// jsdom 未実装の機能（scrollTo 等）の警告は無視して、それ以外のエラーを集める
export async function load(hash = '') {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (e) => {
    if (!/Not implemented/.test(e.message)) errors.push(e.message);
  });
  virtualConsole.on('error', (...args) => errors.push(args.join(' ')));
  const dom = new JSDOM(html(), {
    url: pathToFileURL(HTML_PATH).href + hash,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
  });
  if (dom.window.document.readyState !== 'complete') {
    await new Promise((resolve) => dom.window.addEventListener('load', resolve));
  }
  return { dom, window: dom.window, document: dom.window.document, errors };
}

// ハッシュを変えて、その場で描画し直す
export function go(env, hash) {
  env.window.location.hash = hash;
  env.window.__app.render();
}
```

- [ ] **Step 5: 既存テストを非同期に直す**

```bash
cd /Users/nozaki/Desktop/CEO/OtaSanpot/whisky-site
perl -0pi -e "s/test\('([^']*)', \(\) => \{/test('\$1', async () => {/g" site/tests/render.check.mjs
perl -0pi -e 's/const env = load\(/const env = await load(/g' site/tests/render.check.mjs
perl -0pi -e 's/window\.__mock/window.__app/g' site/tests/render.check.mjs
grep -c 'await load(' site/tests/render.check.mjs
```

`data.check.mjs` では、公開ソース全体を見るべき3つの検査を `html()` から `allSource()` に変える（価格・長いダッシュ・モック表記）。`import` に `allSource` を足す。

- [ ] **Step 6: テストを全部走らせる**

```bash
node --test site/tests/*.check.mjs
```

期待: 53件すべて成功（既存52件＋Step 1 の1件）。失敗したら `app.js` の置換漏れ（`__mock` が残っている、`DATA` の取得元が変わっていない）を疑う。

- [ ] **Step 7: 公開の仕組みとREADMEを合わせる**

`.github/workflows/deploy.yml` の Assemble を書き換える:

```yaml
      - name: Assemble
        run: |
          mkdir -p _site
          cp site/index.html site/styles.css site/data.js site/app.js _site/
          cp site/404.html site/favicon.svg site/apple-touch-icon.png _site/
          touch _site/.nojekyll
```

`README.md` の「ファイル構成」を、この計画の『ファイル構成』の表に合わせて書き直す。

- [ ] **Step 8: 見た目が変わっていないことを目で確かめる**

```bash
bash site/tests/shots.sh
```

期待: 7画面×4サイズが今までどおり出る（スクリーンショットは `/tmp` に出る。`shots.sh` の出力先を見て、トップ・銘柄ページの375px幅を1枚ずつ開いて崩れがないことを確認する）。

- [ ] **Step 9: コミット**

```bash
git add site/index.html site/styles.css site/data.js site/app.js site/tests/helpers.mjs site/tests/data.check.mjs site/tests/render.check.mjs .github/workflows/deploy.yml README.md
git commit -m "$(cat <<'EOF'
site: HTML・CSS・データ・画面コードの4ファイルに分ける

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 味わい5段階・余韻・シーン・掲載日を足す

96銘柄すべてに `profile` / `finish` / `scenes` / `addedAt` を持たせる。値は仕様書 §4.2 の規則で算出する。規則は道具として切り出し、単体でテストする。

**Files:**
- Create: `site/tools/enrich_profile.mjs`
- Create: `site/tests/profile.check.mjs`
- Modify: `site/data.js`（道具で書き換える）
- Modify: `site/tests/data.check.mjs`（新しい項目の検査を足す）

**Interfaces:**
- Consumes: Task 1 の `readData()` / `site/data.js`
- Produces:
  ```js
  // site/tools/enrich_profile.mjs
  export function specValue(w, key);        // specs から値を取る（無ければ null）
  export function abvOf(w);                 // 度数の数値（'43%' → 43、無ければ null）
  export function ageOf(w);                 // 年数表記の数値（'12年' → 12、'なし'・無指定 → null）
  export function textOf(w);                // 判定に使う文章（味の一言＋公式の説明＋樽の説明）
  export function profileOf(w);             // { sweetness, fruitiness, smokiness, richness, drinkability }
  export function finishOf(w, profile);     // '短め' | '中くらい' | '長い'
  export function scenesOf(w, profile);     // ['初めての1本', ...]
  export function addedAtOf(w);             // '2026-09-18' | '2026-09-19'
  export function enrich(data);             // data を破壊せず、項目を足した新しい data を返す
  ```
  データ側: 全96銘柄に `profile` / `finish` / `scenes` / `addedAt`

- [ ] **Step 1: 算出規則のテストを書く**

`site/tests/profile.check.mjs` を新規作成:

```js
// 味わい5段階・余韻・シーンの算出規則のテスト（すべてサイト独自の目安）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readData } from './helpers.mjs';
import { abvOf, ageOf, profileOf, finishOf, scenesOf, enrich } from '../tools/enrich_profile.mjs';

const DATA = readData();
const byId = Object.fromEntries(DATA.whiskies.map((w) => [w.id, w]));

test('度数と年数表記を数字で取り出す', () => {
  assert.equal(abvOf(byId['hibiki-jh']), 43);
  assert.equal(abvOf(byId['shizuoka-pot-still-w']), null); // 度数の記載がない銘柄
  assert.equal(ageOf(byId['yamazaki-12']), 12);
  assert.equal(ageOf(byId['hibiki-jh']), null);            // 年数表記なし
});

test('スモーキーと濃厚は味の地図の位置から決まる', () => {
  const p = profileOf({ ...byId['hibiki-jh'], taste: { line: '', x: 1, y: 1 }, official: [], specs: [] });
  assert.equal(p.smokiness, 5);
  assert.equal(p.richness, 5);
  const q = profileOf({ ...byId['hibiki-jh'], taste: { line: '', x: -1, y: -1 }, official: [], specs: [] });
  assert.equal(q.smokiness, 1);
  assert.equal(q.richness, 1);
});

test('言葉で甘さとフルーティさが上がる', () => {
  const base = { taste: { line: '', x: 0, y: 0 }, official: [], specs: [], type: 'ブレンデッド', serve: {} };
  assert.equal(profileOf(base).sweetness, 3);
  assert.equal(profileOf({ ...base, taste: { line: '甘い', x: 0, y: 0 } }).sweetness, 4);
  assert.equal(profileOf({ ...base, taste: { line: '甘く、蜂蜜のよう', x: 0, y: 0 } }).sweetness, 5);
  assert.equal(profileOf({ ...base, taste: { line: 'ドライですっきり', x: 0, y: 0 } }).sweetness, 2);
  assert.equal(profileOf({ ...base, taste: { line: 'りんごのよう', x: 0, y: 0 } }).fruitiness, 4);
});

test('飲みやすさは度数と言葉とスモーキーさで決まる', () => {
  const light = { taste: { line: '軽やか', x: -1, y: -1 }, official: [], specs: [{ k: 'アルコール度数', v: '40%' }], type: 'ブレンデッド', serve: {} };
  assert.equal(profileOf(light).drinkability, 5);
  const heavy = { taste: { line: '力強い', x: 1, y: 1 }, official: [], specs: [{ k: 'アルコール度数', v: '55%' }], type: 'シングルモルト', serve: {} };
  assert.equal(profileOf(heavy).drinkability, 1);
});

test('余韻は公式の記述から、なければ濃厚さから決める', () => {
  assert.equal(finishOf({ official: [{ k: '余韻', v: '長く続く' }] }, { richness: 1 }), '長い');
  assert.equal(finishOf({ official: [{ k: '余韻', v: '短いキレ' }] }, { richness: 5 }), '短め');
  assert.equal(finishOf({ official: [] }, { richness: 5 }), '長い');
  assert.equal(finishOf({ official: [] }, { richness: 1 }), '短め');
  assert.equal(finishOf({ official: [] }, { richness: 3 }), '中くらい');
});

test('シーンのタグは条件どおりに付く', () => {
  const easy = { type: 'ブレンデッド', serve: { highball: 3, mizuwari: 2 }, maker: 'サントリー', specs: [] };
  const s = scenesOf(easy, { drinkability: 4, smokiness: 2 });
  assert.ok(s.includes('初めての1本'));
  assert.ok(s.includes('普段飲み'));
  assert.ok(s.includes('食事と一緒に'));
  assert.ok(!s.includes('バーで飲みたい'));

  const limited = { type: 'シングルモルト', serve: { highball: 1, mizuwari: 1 }, maker: '本坊酒造', limited: '数量限定', specs: [] };
  const t = scenesOf(limited, { drinkability: 4, smokiness: 2 });
  assert.ok(t.includes('特別な日'));
  assert.ok(!t.includes('初めての1本'), '限定品は初めての1本にしない');
  assert.ok(!t.includes('バーで飲みたい'), '限定品はバーで飲みたいにしない');

  const aged = { type: 'シングルモルト', serve: {}, maker: 'サントリー', specs: [{ k: '熟成年数の表記', v: '18年' }] };
  const u = scenesOf(aged, { drinkability: 2, smokiness: 3 });
  assert.ok(u.includes('プレゼント'));
  assert.ok(u.includes('特別な日'));
  assert.ok(u.includes('バーで飲みたい'));
});

test('enrich は元のデータを壊さず、全銘柄に項目を足す', () => {
  const out = enrich(DATA);
  assert.equal(out.whiskies.length, DATA.whiskies.length);
  assert.equal(out.whiskies[0].name, DATA.whiskies[0].name);
  for (const w of out.whiskies) {
    assert.ok(w.profile && w.finish && w.scenes && w.addedAt, w.id);
  }
});
```

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/profile.check.mjs
```

期待: `../tools/enrich_profile.mjs` が見つからず落ちる。

- [ ] **Step 3: 算出の道具を書く**

`site/tools/enrich_profile.mjs` を新規作成:

```js
// 味わい5段階・余韻・シーン・掲載日を規則から算出する道具。
// ここで作る値はすべて「サイト独自の目安」で、事実ではない。
// 使い方: node site/tools/enrich_profile.mjs   （site/data.js を書き換える）

const clamp = (n) => Math.min(5, Math.max(1, Math.round(n)));

// specs から値を取り出す
export function specValue(w, key) {
  const hit = (w.specs || []).find((s) => s.k === key);
  return hit ? hit.v : null;
}

// 度数の数値（'43%' → 43。記載がなければ null）
export function abvOf(w) {
  const v = specValue(w, 'アルコール度数');
  const m = v && String(v).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
}

// 年数表記の数値（'12年' → 12。'なし' や記載なしは null）
export function ageOf(w) {
  const v = specValue(w, '熟成年数の表記');
  const m = v && String(v).match(/(\d+)\s*年/);
  return m ? Number(m[1]) : null;
}

// 判定に使う文章（味の一言・公式の説明・樽の説明）
export function textOf(w) {
  return [w.taste?.line || '', ...(w.official || []).map((o) => o.v), w.casks || ''].join(' ');
}

// 味わい5段階
export function profileOf(w) {
  const t = textOf(w);
  const abv = abvOf(w);

  const smokiness = clamp(3 + w.taste.x * 2);
  const richness = clamp(3 + w.taste.y * 2);

  let fruit = 3 - w.taste.x * 1.5;
  if (/フルーティ|果実|りんご|洋梨|バナナ|柑橘|プラム|ベリー|桃|メロン/.test(t)) fruit += 1;
  const fruitiness = clamp(fruit);

  let sweet = 3;
  const hasSweet = /甘/.test(t);
  if (hasSweet) sweet += 1;
  if (/蜂蜜|はちみつ|バニラ|キャラメル|黒糖|チョコ/.test(t)) sweet += 1;
  if (!hasSweet && /ドライ|キレ|すっきり/.test(t)) sweet -= 1;
  const sweetness = clamp(sweet);

  let drink = 3;
  if (abv !== null && abv < 45) drink += 1;
  if (/軽やか|やわらか|なめらか|すっきり|飲みやすい/.test(t)) drink += 1;
  if (smokiness >= 4) drink -= 1;
  if (abv !== null && abv >= 50) drink -= 1;
  const drinkability = clamp(drink);

  return { sweetness, fruitiness, smokiness, richness, drinkability };
}

// 余韻の長さ
export function finishOf(w, profile) {
  const v = (w.official || []).find((o) => o.k === '余韻');
  if (v) {
    if (/長/.test(v.v)) return '長い';
    if (/短/.test(v.v)) return '短め';
    return '中くらい';
  }
  if (profile.richness >= 4) return '長い';
  if (profile.richness <= 2) return '短め';
  return '中くらい';
}

// シーンのタグ
const BIG_MAKERS = ['サントリー', 'ニッカウヰスキー', 'キリン'];

export function scenesOf(w, profile) {
  const out = [];
  const age = ageOf(w);
  const isMalt = /シングルモルト|ピュアモルト|ブレンデッドモルト/.test(w.type);
  const isBlendOrGrain = /ブレンデッド|グレーン/.test(w.type);

  if (profile.drinkability >= 4 && profile.smokiness <= 3 && !w.limited) out.push('初めての1本');
  if (!w.limited && isBlendOrGrain && profile.drinkability >= 3) out.push('普段飲み');
  if (age !== null || (BIG_MAKERS.includes(w.maker) && /シングルモルト/.test(w.type))) out.push('プレゼント');
  if ((age !== null && age >= 12) || w.limited) out.push('特別な日');
  if (w.serve.highball === 3 || w.serve.mizuwari === 3) out.push('食事と一緒に');
  if (isMalt && !w.limited) out.push('バーで飲みたい');
  return out;
}

// 掲載日（最初の見本3本が2026-09-18、残りは2026-09-19に追加した）
const FIRST_THREE = ['hibiki-jh', 'yoichi', 'ao'];
export function addedAtOf(w) {
  return FIRST_THREE.includes(w.id) ? '2026-09-18' : '2026-09-19';
}

// データ全体に項目を足す（元のデータは変えない）
export function enrich(data) {
  const whiskies = data.whiskies.map((w) => {
    const profile = profileOf(w);
    return { ...w, profile, finish: finishOf(w, profile), scenes: scenesOf(w, profile), addedAt: addedAtOf(w) };
  });
  return { ...data, whiskies };
}
```

- [ ] **Step 4: テストを走らせて、通ることを確かめる**

```bash
node --test site/tests/profile.check.mjs
```

期待: `enrich は元のデータを壊さず...` 以外の6件が成功。最後の1件は `data.js` にまだ項目が無くても `enrich` の戻り値を見ているので、これも成功する。

- [ ] **Step 5: data.js に書き戻す実行部分を足して、走らせる**

`site/tools/enrich_profile.mjs` の **先頭**に次の import を足し（ESM の import はファイルの先頭に置く）、

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
```

**末尾**に実行部分を足す:

```js
// 直接実行されたときだけ site/data.js を書き換える
if (process.argv[1] && process.argv[1].endsWith('enrich_profile.mjs')) {
  const p = join(dirname(dirname(fileURLToPath(import.meta.url))), 'data.js');
  const src = readFileSync(p, 'utf8');
  const json = src.match(/^window\.WDATA = ([\s\S]*);\s*$/)[1];
  const out = enrich(JSON.parse(json));
  writeFileSync(p, 'window.WDATA = ' + JSON.stringify(out) + ';\n');
  console.log(`${out.whiskies.length}銘柄に profile / finish / scenes / addedAt を書き込みました`);
}
```

実行して、結果をざっと見る:

```bash
node site/tools/enrich_profile.mjs
node -e "
const d = require('fs').readFileSync('site/data.js','utf8').match(/^window\.WDATA = ([\s\S]*);\s*\$/)[1];
const w = JSON.parse(d).whiskies;
const n = (k) => w.reduce((a,x)=>a+x.profile[k],0)/w.length;
console.log('平均', {甘:n('sweetness'),果:n('fruitiness'),煙:n('smokiness'),濃:n('richness'),飲:n('drinkability')});
const c = {}; w.forEach(x=>x.scenes.forEach(s=>c[s]=(c[s]||0)+1));
console.log('シーン', c);
console.log('シーン0件', w.filter(x=>!x.scenes.length).map(x=>x.id));
console.log('響', JSON.stringify(w.find(x=>x.id==='hibiki-jh').profile), w.find(x=>x.id==='hibiki-jh').scenes.join('/'));
console.log('余市', JSON.stringify(w.find(x=>x.id==='yoichi').profile), w.find(x=>x.id==='yoichi').scenes.join('/'));
"
```

期待: 各平均が2〜4の範囲に入り、シーンが極端に偏らない。**シーンが0件の銘柄が出たら、その銘柄を一覧で拾えなくなるので、次の Step で手当てする。**

- [ ] **Step 6: 結果を見て手で調整する（必要なときだけ）**

規則の結果が明らかにおかしい銘柄（例：ピートが強いのに `smokiness` が2、シーンが0件）があれば、`site/data.js` の該当銘柄だけ手で直す。直した理由は `site/SOURCES.md` の末尾「見立ての手直し」に1行ずつ残す（例: `yoichi: smokiness 4→5（公式「力強いピート」）`）。手直しが無ければ何もしない。

- [ ] **Step 7: データのテストを足す**

`site/tests/data.check.mjs` に足す:

```js
test('全銘柄に味わい5段階・余韻・シーン・掲載日がある', () => {
  const FINISH = ['短め', '中くらい', '長い'];
  const SCENES = ['初めての1本', '普段飲み', 'プレゼント', '特別な日', '食事と一緒に', 'バーで飲みたい'];
  for (const w of data.whiskies) {
    for (const k of ['sweetness', 'fruitiness', 'smokiness', 'richness', 'drinkability']) {
      const v = w.profile[k];
      assert.ok(Number.isInteger(v) && v >= 1 && v <= 5, `${w.id}: profile.${k} = ${v}`);
    }
    assert.ok(FINISH.includes(w.finish), `${w.id}: finish`);
    assert.ok(Array.isArray(w.scenes) && w.scenes.length >= 1, `${w.id}: scenes が空`);
    for (const s of w.scenes) assert.ok(SCENES.includes(s), `${w.id}: 知らないシーン ${s}`);
    assert.match(w.addedAt, /^\d{4}-\d{2}-\d{2}$/, `${w.id}: addedAt`);
  }
});
```

- [ ] **Step 8: テストを全部走らせる**

```bash
node --test site/tests/*.check.mjs
```

期待: 全件成功（Task 1 の53件＋profile 6件＋データ1件＝60件）。

- [ ] **Step 9: コミット**

```bash
git add site/tools/enrich_profile.mjs site/tests/profile.check.mjs site/tests/data.check.mjs site/data.js site/SOURCES.md
git commit -m "$(cat <<'EOF'
data: 96銘柄に味わい5段階・余韻・シーン・掲載日を足す（すべてサイト独自の目安）

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 銘柄一覧 `#/list`（検索・絞り込み・並び替え）

仕様書 §5.2。これ以降の画面（詳細・診断・比較・MAP・今日の1本・蒸溜所）から戻ってくる場所になるので、先に作る。

**Files:**
- Modify: `site/app.js`（共通部品に地方・味わい・タイプ・並び替えを足し、`viewList` / `bindList` / ルーターを足す）
- Modify: `site/styles.css`（絞り込みのUI）
- Modify: `site/tests/render.check.mjs`（一覧のテストを足す）

**Interfaces:**
- Consumes: Task 2 の `w.profile` / `w.scenes` / `w.addedAt`、既存の `whiskyCard(w, why)` / `whiskyHay` / `norm` / `badge`
- Produces（`app.js` 内。以降のタスクが使う）:
  ```js
  const REGIONS;                    // [{key,label,prefs:[...]}, ...] 仕様書の10地方
  function regionOf(pref);          // → REGIONS の要素 | null
  function regionKeysOf(w);         // 銘柄が属する地方キーの配列
  const TYPE_GROUPS;                // [{key,label,test(w)}, ...]
  function typeGroupOf(w);          // → TYPE_GROUPS の要素（必ず1つ返る）
  const TASTE_FILTERS;              // [{key,label,test(profile)}, ...]
  const SCENES;                     // ['初めての1本', ...] 6種
  const SORTS;                      // [{key,label}, ...]
  const STAPLES;                    // 編集部が選ぶ定番8本の id
  function abvNum(w);               // 度数の数値 | null
  function listMatch(w, f);         // 絞り込み1件ぶんの判定
  function sortList(arr, sort);     // 並び替え（新しい配列を返す）
  function listHref(f);             // 絞り込みから '#/list?...' を作る
  function viewList(r);             // → {title, html}
  function bindList();              // 入力とURLの同期
  ```
  `window.__app` に `listMatch` / `sortList` / `regionOf` / `typeGroupOf` を足す。

- [ ] **Step 1: 絞り込みと並び替えのテストを書く**

`site/tests/render.check.mjs` の末尾に「===== 銘柄一覧 =====」の節を作って足す:

```js
test('一覧：最初は全銘柄が出て、件数が出る', async () => {
  const env = await load('#/list');
  const d = env.document;
  assert.equal(d.querySelectorAll('#results a.card[href^="#/whisky/"]').length, DATA.whiskies.length);
  assert.match(d.querySelector('#results-count').textContent, new RegExp(`${DATA.whiskies.length}本`));
  assert.deepEqual(env.errors, []);
});

test('一覧：おすすめ順では編集部が選ぶ定番が先頭に並ぶ', async () => {
  const env = await load('#/list');
  const first = [...env.document.querySelectorAll('#results a.card')].slice(0, 8).map((a) => a.getAttribute('href'));
  assert.deepEqual(first, [
    '#/whisky/hibiki-jh', '#/whisky/yamazaki', '#/whisky/hakushu', '#/whisky/chita',
    '#/whisky/yoichi', '#/whisky/miyagikyo', '#/whisky/fuji-single-blended', '#/whisky/kakubin',
  ]);
});

test('一覧：タイプで絞り込める', async () => {
  const env = await load('#/list?type=single-malt');
  const n = DATA.whiskies.filter((w) => /^シングルモルト/.test(w.type)).length;
  assert.equal(env.document.querySelectorAll('#results a.card').length, n);
});

test('一覧：地方で絞り込める', async () => {
  const env = await load('#/list?region=hokkaido');
  const ids = [...env.document.querySelectorAll('#results a.card')].map((a) => a.getAttribute('href'));
  assert.ok(ids.includes('#/whisky/yoichi'), '余市が出る');
  assert.ok(!ids.includes('#/whisky/yamazaki'), '山崎は出ない');
});

test('一覧：味わいで絞り込める（爽やかは飲みやすく濃すぎない）', async () => {
  const env = await load('#/list?taste=fresh');
  const n = DATA.whiskies.filter((w) => w.profile.drinkability >= 4 && w.profile.richness <= 2).length;
  assert.equal(env.document.querySelectorAll('#results a.card').length, n);
  assert.ok(n >= 1, '爽やかが1本もないと絞り込みの意味がない');
});

test('一覧：飲み方とシーンと区分で絞り込める', async () => {
  const a = await load('#/list?serve=highball');
  assert.equal(a.document.querySelectorAll('#results a.card').length, DATA.whiskies.filter((w) => w.serve.highball === 3).length);
  const b = await load('#/list?scene=' + encodeURIComponent('初めての1本'));
  assert.equal(b.document.querySelectorAll('#results a.card').length, DATA.whiskies.filter((w) => w.scenes.includes('初めての1本')).length);
  const c = await load('#/list?standard=foreign');
  assert.equal(c.document.querySelectorAll('#results a.card').length, DATA.whiskies.filter((w) => w.standard === 'foreign').length);
});

test('一覧：検索の言葉で絞り込める', async () => {
  const env = await load('#/list?q=' + encodeURIComponent('よいち'));
  const names = [...env.document.querySelectorAll('#results .card-name')].map((e) => e.textContent);
  assert.ok(names.some((n) => n.includes('余市')));
});

test('一覧：名前順・新着順に並ぶ', async () => {
  const name = await load('#/list?sort=name');
  const first = name.document.querySelector('#results .card-name').textContent;
  assert.equal(first, [...DATA.whiskies].sort((a, b) => a.kana.localeCompare(b.kana, 'ja'))[0].name);

  const fresh = await load('#/list?sort=new');
  const newest = fresh.document.querySelector('#results a.card').getAttribute('href').replace('#/whisky/', '');
  assert.equal(DATA.whiskies.find((w) => w.id === newest).addedAt, DATA.whiskies.map((w) => w.addedAt).sort().at(-1));
});

test('一覧：度数の高い順・低い順に並ぶ', async () => {
  const hi = await load('#/list?sort=abv-desc');
  const top = hi.document.querySelector('#results a.card').getAttribute('href').replace('#/whisky/', '');
  assert.equal(abvOf(DATA.whiskies.find((w) => w.id === top)), Math.max(...DATA.whiskies.map((w) => abvOf(w) ?? 0)));

  const lo = await load('#/list?sort=abv-asc');
  const bottom = lo.document.querySelector('#results a.card').getAttribute('href').replace('#/whisky/', '');
  assert.equal(abvOf(DATA.whiskies.find((w) => w.id === bottom)), Math.min(...DATA.whiskies.filter((w) => abvOf(w) !== null).map((w) => abvOf(w))));
});

test('一覧：条件に合う銘柄が無いときは、条件をゆるめる案内を出す', async () => {
  const env = await load('#/list?taste=smoky&type=grain&q=' + encodeURIComponent('ありえない銘柄名'));
  assert.equal(env.document.querySelectorAll('#results a.card').length, 0);
  assert.match(env.document.querySelector('#results .empty').textContent, /条件/);
  assert.ok(env.document.querySelector('#results .empty a[href="#/list"]'), '全部見る導線がある');
});

test('一覧：絞り込みを選ぶと URL に残る', async () => {
  const env = await load('#/list');
  const sel = env.document.querySelector('select[name="taste"]');
  sel.value = 'smoky';
  sel.dispatchEvent(new env.window.Event('change', { bubbles: true }));
  assert.match(env.window.location.hash, /taste=smoky/);
});

test('一覧：旧URL（トップの検索・味の絞り込み）は一覧に引き継ぐ', async () => {
  const a = await load('#/?q=' + encodeURIComponent('よいち'));
  assert.ok(a.document.getElementById('results'), '一覧が出る');
  assert.ok([...a.document.querySelectorAll('#results .card-name')].some((e) => e.textContent.includes('余市')));
  const b = await load('#/?taste=smoky-rich');
  assert.equal(b.document.querySelector('select[name="taste"]').value, 'smoky');
});
```

度数はデータに数字で持たせず `specs` の文字列から取り出すので、テストの冒頭（`const text = ...` の下）に次の道具を置く:

```js
const abvOf = (w) => {
  const s = (w.specs || []).find((x) => x.k === 'アルコール度数');
  const m = s && String(s.v).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
};
```

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/render.check.mjs
```

期待: 一覧のテストが全部落ちる（`#/list` が「見つかりません」になる）。

- [ ] **Step 3: 共通部品（地方・タイプ・味わい・並び替え）を足す**

`site/app.js` の共通部品の節（`QUADS` の下）に足す:

```js
  // 地方（仕様書 §4.3）。蒸溜所の都道府県をまとめる
  const REGIONS = [
    { key: 'hokkaido', label: '北海道', prefs: ['北海道'] },
    { key: 'tohoku', label: '東北', prefs: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'] },
    { key: 'kanto', label: '関東', prefs: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'] },
    { key: 'koshinetsu', label: '甲信越', prefs: ['新潟県', '山梨県', '長野県'] },
    { key: 'tokai', label: '東海', prefs: ['岐阜県', '静岡県', '愛知県', '三重県'] },
    { key: 'hokuriku', label: '北陸', prefs: ['富山県', '石川県', '福井県'] },
    { key: 'kinki', label: '近畿', prefs: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'] },
    { key: 'chugoku', label: '中国', prefs: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'] },
    { key: 'shikoku', label: '四国', prefs: ['徳島県', '香川県', '愛媛県', '高知県'] },
    { key: 'kyushu', label: '九州・沖縄', prefs: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'] },
  ];
  const regionOf = (pref) => REGIONS.find((r) => r.prefs.includes(pref)) || null;
  // 銘柄が属する地方（原酒の蒸溜所から。海外原酒は地方を持たない）
  function regionKeysOf(w) {
    const keys = w.components
      .filter((c) => c.distillery)
      .map((c) => regionOf(D.get(c.distillery).pref))
      .filter(Boolean)
      .map((r) => r.key);
    return [...new Set(keys)];
  }

  // タイプのまとめ方。上から順に見て、最初に当てはまったものになる
  const TYPE_GROUPS = [
    { key: 'single-malt', label: 'シングルモルト', test: (w) => /^シングルモルト/.test(w.type) },
    { key: 'grain', label: 'グレーン', test: (w) => /グレーン/.test(w.type) },
    { key: 'malt', label: 'モルト（ピュアモルト・ブレンデッドモルト）', test: (w) => /モルト/.test(w.type) },
    { key: 'blended', label: 'ブレンデッド', test: (w) => /ブレンデッド/.test(w.type) },
    { key: 'other', label: 'その他', test: () => true },
  ];
  const typeGroupOf = (w) => TYPE_GROUPS.find((g) => g.test(w));

  // 味わいの絞り込み（仕様書 §5.2。すべてサイト独自の目安）
  const TASTE_FILTERS = [
    { key: 'sweet', label: '甘い', test: (p) => p.sweetness >= 4 },
    { key: 'fruity', label: 'フルーティ', test: (p) => p.fruitiness >= 4 },
    { key: 'fresh', label: '爽やか', test: (p) => p.drinkability >= 4 && p.richness <= 2 },
    { key: 'rich', label: '濃厚', test: (p) => p.richness >= 4 },
    { key: 'smoky', label: 'スモーキー', test: (p) => p.smokiness >= 4 },
  ];
  const SCENES = ['初めての1本', '普段飲み', 'プレゼント', '特別な日', '食事と一緒に', 'バーで飲みたい'];
  const PROFILE_KEYS = [
    ['sweetness', '甘さ'], ['fruitiness', 'フルーティ'], ['smokiness', 'スモーキー'],
    ['richness', '濃厚'], ['drinkability', '飲みやすさ'],
  ];

  // 編集部が選ぶ定番（人気順ではない）
  const STAPLES = ['hibiki-jh', 'yamazaki', 'hakushu', 'chita', 'yoichi', 'miyagikyo', 'fuji-single-blended', 'kakubin'];

  const SORTS = [
    { key: 'recommend', label: 'おすすめ' },
    { key: 'name', label: '名前' },
    { key: 'new', label: '新着' },
    { key: 'abv-desc', label: '度数が高い' },
    { key: 'abv-asc', label: '度数が低い' },
  ];

  // 度数の数字（記載がなければ null）
  function abvNum(w) {
    const s = (w.specs || []).find((x) => x.k === 'アルコール度数');
    const m = s && String(s.v).match(/(\d+(?:\.\d+)?)\s*%/);
    return m ? Number(m[1]) : null;
  }
```

- [ ] **Step 4: 絞り込みと並び替えの中身を書く**

`site/app.js` に足す:

```js
  // 絞り込み1件ぶんの判定
  function listMatch(w, f) {
    if (f.type && typeGroupOf(w).key !== f.type) return false;
    if (f.region && !regionKeysOf(w).includes(f.region)) return false;
    if (f.distillery && !w.components.some((c) => c.distillery === f.distillery)) return false;
    if (f.taste) {
      const t = TASTE_FILTERS.find((x) => x.key === f.taste);
      if (t && !t.test(w.profile)) return false;
    }
    if (f.serve && w.serve[f.serve] !== 3) return false;
    if (f.scene && !w.scenes.includes(f.scene)) return false;
    if (f.standard && w.standard !== f.standard) return false;
    if (f.q && !whiskyHay.get(w.id).includes(norm(f.q))) return false;
    return true;
  }

  // 並び替え。同点のときは読みの順にそろえる
  function sortList(arr, sort) {
    const byName = (a, b) => a.kana.localeCompare(b.kana, 'ja') || a.name.localeCompare(b.name, 'ja');
    const copy = [...arr];
    if (sort === 'name') return copy.sort(byName);
    if (sort === 'new') return copy.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || byName(a, b));
    if (sort === 'abv-desc') return copy.sort((a, b) => (abvNum(b) ?? -1) - (abvNum(a) ?? -1) || byName(a, b));
    if (sort === 'abv-asc') return copy.sort((a, b) => (abvNum(a) ?? 999) - (abvNum(b) ?? 999) || byName(a, b));
    // おすすめ：定番8本 → 飲みやすさの高い順 → 読みの順
    const rank = (w) => (STAPLES.indexOf(w.id) < 0 ? 99 : STAPLES.indexOf(w.id));
    return copy.sort((a, b) => rank(a) - rank(b) || b.profile.drinkability - a.profile.drinkability || byName(a, b));
  }

  // 絞り込みから URL を作る（空の項目は付けない）
  const LIST_KEYS = ['q', 'type', 'region', 'distillery', 'taste', 'serve', 'scene', 'standard', 'sort'];
  function listHref(f) {
    const p = new URLSearchParams();
    for (const k of LIST_KEYS) if (f[k]) p.set(k, f[k]);
    const qs = p.toString();
    return qs ? `#/list?${qs}` : '#/list';
  }
```

- [ ] **Step 5: 一覧の画面を書く**

`site/app.js` の画面の節に足す（既存の `whiskyCard` をそのまま使う）:

```js
  // 並び替えの select（「すべて」は出さない）
  function sortSelect(current) {
    return `<label class="filter filter--sort"><span class="filter-label">並び替え</span><select name="sort">${
      SORTS.map((x) => `<option value="${esc(x.key)}"${x.key === (current || 'recommend') ? ' selected' : ''}>${esc(x.label)}</option>`).join('')
    }</select></label>`;
  }

  // 絞り込みのひとつぶん（select）
  function filterSelect(name, label, options, current) {
    const opts = [`<option value="">${esc(label)}：すべて</option>`]
      .concat(options.map(([v, t]) => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(t)}</option>`))
      .join('');
    return `<label class="filter"><span class="filter-label">${esc(label)}</span><select name="${esc(name)}">${opts}</select></label>`;
  }

  function viewList(r) {
    const hits = sortList(DATA.whiskies.filter((w) => listMatch(w, r)), r.sort || 'recommend');
    const onCount = LIST_KEYS.filter((k) => k !== 'sort' && r[k]).length;
    const filters = [
      filterSelect('type', 'タイプ', TYPE_GROUPS.filter((g) => g.key !== 'other').map((g) => [g.key, g.label]).concat([['other', 'その他']]), r.type),
      filterSelect('region', '地方', REGIONS.map((x) => [x.key, x.label]), r.region),
      filterSelect('distillery', '蒸溜所', DATA.distilleries.map((d) => [d.id, d.name]), r.distillery),
      filterSelect('taste', '味わい', TASTE_FILTERS.map((x) => [x.key, x.label]), r.taste),
      filterSelect('serve', '飲み方', SERVES.map(([k, label]) => [k, `${label}が◎`]), r.serve),
      filterSelect('scene', 'シーン', SCENES.map((s) => [s, s]), r.scene),
      filterSelect('standard', '区分', STD_KEYS.map((k) => [k, DATA.standards[k].label]), r.standard),
    ].join('');

    const list = hits.length
      ? `<ul class="cards">${hits.map((w) => whiskyCard(w)).join('')}</ul>`
      : `<p class="empty">条件に合う銘柄は見つかりませんでした。条件をひとつ減らすか、<a href="#/list">すべての銘柄</a>から探してみてください。</p>`;

    return {
      title: `銘柄をさがす｜${SITE}`,
      html: `
<section class="list-head">
  <h1>ウイスキーを探す</h1>
  <label class="search"><span class="visually-hidden">銘柄名・蒸溜所名で検索</span>
    <input id="q" type="search" name="q" value="${esc(r.q || '')}" placeholder="銘柄名・蒸溜所名（例：よいち、yoichi）" autocomplete="off"></label>
  <details class="filters"${onCount ? ' open' : ''}>
    <summary>絞り込み${onCount ? `<span class="filter-on">${onCount}</span>` : ''}</summary>
    <div class="filter-grid">${filters}</div>
    <p class="note">味わい・シーンは、このサイト独自の目安です。</p>
    ${onCount ? '<a class="clear" href="#/list">条件をすべて外す</a>' : ''}
  </details>
  <div class="sec-head">
    <span id="results-count" class="count">${hits.length}本</span>
    ${sortSelect(r.sort)}
  </div>
</section>
<section id="results">${list}</section>`,
    };
  }

  // 入力・選択を URL に反映する
  function bindList() {
    const current = parseHash(location.hash);
    const update = (name, value) => {
      const next = { ...current, [name]: value };
      location.hash = listHref(next);
    };
    const q = document.getElementById('q');
    if (q) {
      q.addEventListener('input', () => update('q', q.value.trim()));
      const end = q.value.length;
      q.focus();
      if (q.setSelectionRange) q.setSelectionRange(end, end);
    }
    for (const sel of document.querySelectorAll('.list-head select')) {
      sel.addEventListener('change', () => update(sel.name, sel.value));
    }
  }
```

**注意:** `bindList` は入力のたびに `location.hash` を変えて描き直すので、`render()` のあとに毎回カーソル位置を末尾へ戻す（上のコードに入っている）。既存の `bindTop` と同じやり方。

- [ ] **Step 6: ルーターに `#/list` と旧URLの引き継ぎを足す**

`parseHash` を次のように直す:

```js
  // 旧トップの味の絞り込み（象限）を、新しい味わいの絞り込みに読み替える
  const LEGACY_TASTE = { 'floral-light': 'fresh', 'floral-rich': 'rich', 'smoky-light': 'smoky', 'smoky-rich': 'smoky' };

  function listParams(params) {
    const f = { view: 'list' };
    for (const k of LIST_KEYS) f[k] = params.get(k) || '';
    return f;
  }

  function parseHash(h) {
    const raw = (h || '').replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    const params = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) {
      // 旧URL（#/?q= と #/?taste=）は一覧に引き継ぐ
      if (params.get('q') || params.get('taste')) {
        const f = listParams(params);
        f.taste = LEGACY_TASTE[params.get('taste')] || '';
        return f;
      }
      return { view: 'top' };
    }
    if (parts.length === 1 && parts[0] === 'list') return listParams(params);
    if (parts.length === 2 && parts[0] === 'whisky') return { view: 'whisky', id: decodeURIComponent(parts[1]) };
    if (parts.length === 2 && parts[0] === 'distillery') return { view: 'distillery', id: decodeURIComponent(parts[1]) };
    if (parts.length === 1 && parts[0] === 'find') {
      return { view: 'find', serve: params.get('serve') || 'any', flavor: params.get('flavor') || 'any', body: params.get('body') || 'any' };
    }
    if (parts.length === 1 && parts[0] === 'standard') return { view: 'standard' };
    return { view: 'notfound' };
  }
```

`render()` に画面を足す:

```js
    const v = r.view === 'top' ? viewTop(r)
      : r.view === 'list' ? viewList(r)
        : r.view === 'find' ? viewFind(r)
          : r.view === 'whisky' ? viewWhisky(r.id)
            : r.view === 'distillery' ? viewDistillery(r.id)
              : r.view === 'standard' ? viewStandard()
                : viewNotFound();
    app.innerHTML = v.html;
    document.title = v.title;
    if (r.view === 'top') bindTop();
    if (r.view === 'list') bindList();
    return r;
```

**既存のトップが壊れないようにする:** `viewTop` は `r.q` / `r.taste` を見ていたが、`parseHash` がトップで返さなくなる。この段階では `viewTop(r)` の中の検索窓と味の入口を、`#/list?q=...` / `#/list?taste=...` へのリンクに置き換えるだけにして、`resultsHtml` は残す（Task 10 でトップ全体を作り直す）。既存のトップのテストのうち、検索と味の絞り込みを見ている5件は一覧のテストに置き換わるので削除する。

- [ ] **Step 7: 見た目を足す**

`site/styles.css` に足す（既存の色の変数を使う）:

既存の `.search`（丸いピル型の検索窓）はそのまま使うので、`input` の見た目は足さない。

```css
/* ===== 一覧の絞り込み ===== */
.list-head{margin:0 0 20px}
.filters{margin:12px 0;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface)}
.filters > summary{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 14px;cursor:pointer;font-weight:700}
.filter-on{background:var(--amber);color:var(--amber-ink);border-radius:999px;padding:0 8px;font-size:13px}
.filter-grid{display:grid;grid-template-columns:1fr;gap:10px;padding:0 14px 14px}
.filter{display:flex;flex-direction:column;gap:4px}
.filter-label{font-size:13px;color:var(--text-2)}
.filter select,.sec-head select{min-height:44px;border-radius:10px;border:1px solid var(--line-2);background:var(--surface-2);color:var(--text);font-size:15px;font-family:var(--font);padding:0 10px}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (min-width:600px){.filter-grid{grid-template-columns:1fr 1fr}}
```

- [ ] **Step 8: テストを走らせて、通ることを確かめる**

```bash
node --test site/tests/*.check.mjs
```

期待: 一覧のテスト10件を含めて全部成功。落ちたら、`listMatch` の条件名と URL の名前がずれていないかを見る。

- [ ] **Step 9: スマホ幅で確認する**

```bash
bash site/tests/shots.sh
```

`#/list` を375pxで見て、絞り込みが折りたたまれていること、横スクロールが出ていないことを確認する。

- [ ] **Step 10: コミット**

```bash
git add site/app.js site/styles.css site/tests/render.check.mjs
git commit -m "$(cat <<'EOF'
site: 銘柄一覧（検索・7つの絞り込み・5つの並び替え）を追加し、旧URLを引き継ぐ

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 銘柄ページを組み替える

仕様書 §5.3。並び順を変え、味わい5段階・余韻・こんな人におすすめを足し、次の1本を3本にする。**小さな味の地図はここで外す**（地図は Task 7 の味わいMAPに集約）。

**Files:**
- Modify: `site/app.js`（`viewWhisky` の組み立て、`nextOf` の3本化、`profileBars` / `forWhomHtml` を追加）
- Modify: `site/styles.css`（5段階の棒・シーンのタグ）
- Modify: `site/tests/render.check.mjs`（銘柄ページのテストを書き換え・追加）

**Interfaces:**
- Consumes: Task 2 の `profile` / `finish` / `scenes`、Task 3 の `typeGroupOf` / `PROFILE_KEYS` / `listHref`
- Produces:
  ```js
  function profileBars(w);    // 5段階の棒（HTML文字列）
  function forWhomHtml(w);    // 「こんな人におすすめ」（HTML文字列）
  function nextOf(w);         // 必ず3本（手書き優先、足りない分は理由つきで補う）
  ```

- [ ] **Step 1: 銘柄ページのテストを書き換える**

`render.check.mjs` の銘柄ページの節で、次の2件を置き換える。

置き換え前（削除する）:
- `銘柄ページ：最初の一画面は 産地→味→飲み方→次の1本 の順`

置き換え後（足す）:

```js
test('銘柄ページ：仕様書の順に並ぶ', async () => {
  const env = await load('#/whisky/hibiki-jh');
  const ids = [...env.document.querySelectorAll('main section[id]')].map((s) => s.id);
  const want = ['taste', 'profile', 'notes', 'serve', 'for-whom', 'origin', 'next'];
  assert.deepEqual(ids.slice(0, want.length), want);
});

test('銘柄ページ：味わいは5段階の棒で出て、サイト独自の目安と書いてある', async () => {
  const env = await load('#/whisky/yoichi');
  const w = DATA.whiskies.find((x) => x.id === 'yoichi');
  const bars = [...env.document.querySelectorAll('#profile .bar')];
  assert.equal(bars.length, 5);
  for (const b of bars) {
    const v = Number(b.getAttribute('data-value'));
    assert.ok(v >= 1 && v <= 5);
    assert.equal(b.getAttribute('aria-valuenow'), String(v));
  }
  assert.equal(Number(env.document.querySelector('#profile .bar[data-key="smokiness"]').getAttribute('data-value')), w.profile.smokiness);
  assert.match(env.document.querySelector('#profile').textContent, /サイト独自の目安/);
  assert.equal(env.document.querySelectorAll('#profile svg').length, 0, '小さな味の地図は出さない');
});

test('銘柄ページ：余韻の長さが出る', async () => {
  const env = await load('#/whisky/yoichi');
  const w = DATA.whiskies.find((x) => x.id === 'yoichi');
  assert.match(text(env.document.querySelector('#notes')), new RegExp(`余韻${w.finish}`.replace(/\s/g, '')));
});

test('銘柄ページ：こんな人におすすめが、シーンのタグつきで出る', async () => {
  const env = await load('#/whisky/hibiki-jh');
  const w = DATA.whiskies.find((x) => x.id === 'hibiki-jh');
  const sec = env.document.querySelector('#for-whom');
  assert.match(sec.textContent, /編集部の見立て|サイト独自の目安/);
  const tags = [...sec.querySelectorAll('a.scene-tag')].map((a) => a.textContent);
  assert.deepEqual([...tags], w.scenes);
  const href = sec.querySelector('a.scene-tag').getAttribute('href');
  assert.equal(href, '#/list?scene=' + encodeURIComponent(w.scenes[0]));
});

test('銘柄ページ：次の1本は必ず3本出て、理由が付く', async () => {
  for (const id of ['hibiki-jh', 'yoichi', 'kujira-5']) {
    const env = await load('#/whisky/' + id);
    const items = [...env.document.querySelectorAll('#next .next-row > li')];
    assert.equal(items.length, 3, id);
    for (const li of items) assert.ok(li.querySelector('.next-why').textContent.trim().length >= 4, id);
    const hrefs = items.map((li) => li.querySelector('a').getAttribute('href'));
    assert.equal(new Set(hrefs).size, 3, `${id}: 同じ銘柄が重複している`);
    assert.ok(!hrefs.includes('#/whisky/' + id), `${id}: 自分自身を出している`);
  }
});
```

既存テスト `銘柄ページ：次の1本の手書きがない銘柄は、味の地図の近い銘柄を2本出す` は、この3本化テストに置き換わるので削除する。

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/render.check.mjs
```

期待: 銘柄ページの新しい5件が落ちる。

- [ ] **Step 3: 5段階の棒と「こんな人におすすめ」を書く**

`site/app.js` に足す:

```js
  // 味わい5段階の棒（サイト独自の目安）
  function profileBars(w) {
    const rows = PROFILE_KEYS.map(([k, label]) => {
      const v = w.profile[k];
      return `<li class="bar" data-key="${esc(k)}" data-value="${v}" role="img" aria-label="${esc(label)} 5段階で${v}" aria-valuenow="${v}">
  <span class="bar-label">${esc(label)}</span>
  <span class="bar-track"><span class="bar-fill" style="--v:${v}"></span></span>
  <span class="bar-value">${v}</span></li>`;
    }).join('');
    return `<ul class="bars">${rows}</ul>`;
  }

  // こんな人におすすめ（見立て）
  function forWhomHtml(w) {
    const p = w.profile;
    const bits = [];
    if (p.drinkability >= 4) bits.push('ウイスキーを飲み慣れていない人');
    if (p.smokiness >= 4) bits.push('煙っぽい香りを楽しみたい人');
    if (p.fruitiness >= 4) bits.push('果実のような香りが好きな人');
    if (p.sweetness >= 4) bits.push('甘みのある味わいが好きな人');
    if (p.richness >= 4) bits.push('飲みごたえがほしい人');
    if (!bits.length) bits.push('クセの少ない1本を探している人');
    const tags = w.scenes.map((s) => `<a class="scene-tag" href="#/list?scene=${encodeURIComponent(s)}">${esc(s)}</a>`).join('');
    return `<section id="for-whom" aria-labelledby="for-whom-h">
  <h2 id="for-whom-h">こんな人におすすめ</h2>
  <p>${esc(bits.join('、'))}に向いています。</p>
  <p class="scene-tags">${tags}</p>
  <p class="note">この項目は編集部の見立てです。</p>
</section>`;
  }
```

- [ ] **Step 4: 次の1本を3本にする**

`nextOf` を次に差し替える:

```js
  // 次の1本。手書きがあれば優先し、3本に足りない分は理由を変えて補う
  function nextOf(w) {
    const picked = [...(w.next || [])].slice(0, 3);
    const used = new Set([w.id, ...picked.map((n) => n.id)]);
    const dist = (o) => Math.hypot(o.taste.x - w.taste.x, o.taste.y - w.taste.y);
    const add = (o, why) => {
      if (!o || used.has(o.id)) return;
      used.add(o.id);
      picked.push({ id: o.id, name: o.name, why });
    };
    const rest = () => DATA.whiskies.filter((o) => !used.has(o.id)).sort((a, b) => dist(a) - dist(b));

    if (picked.length < 3) {
      const near = rest()[0];
      add(near, near ? `味わいが近い1本（${near.maker}の${near.type}）` : '');
    }
    if (picked.length < 3) {
      const other = rest().find((o) => typeGroupOf(o).key !== typeGroupOf(w).key);
      add(other, other ? `味わいは近いが、タイプが違う（${other.type}）` : '');
    }
    if (picked.length < 3) {
      const sameHouse = rest().find((o) => o.maker === w.maker)
        || rest().find((o) => o.components.some((c) => c.distillery && w.components.some((x) => x.distillery === c.distillery)));
      add(sameHouse, sameHouse ? `同じ造り手の別の1本（${sameHouse.maker}）` : '');
    }
    while (picked.length < 3) {
      const any = rest()[0];
      if (!any) break;
      add(any, '味わいの地図で近い位置にある1本');
    }
    return picked.slice(0, 3);
  }
```

- [ ] **Step 5: 銘柄ページを組み替える**

`viewWhisky` の `html` を、仕様書 §5.3 の順に並べ替える。節の `id` は次のとおり（テストが見ている）:

| 順 | `id` | 中身 |
|----|------|------|
| 見出し | （なし） | 銘柄名・英字・メーカー・タイプ・区分バッジ・限定・ボトル図 |
| 1 | `taste` | 味の一言（`.w-line`。いまの句ごとの改行制御をそのまま使う） |
| 2 | `profile` | `profileBars(w)` ＋「味わいの5段階は、このサイト独自の目安です。」 |
| 3 | `notes` | 公式の香り・味（`official`）＋「余韻：${w.finish}」 |
| 4 | `serve` | ◎○△ ＋ メーカー推奨（`makerServe`） |
| 5 | `for-whom` | `forWhomHtml(w)` |
| 6 | `origin` | 産地・中身の原酒（`componentChip` / `flowItem`。蒸溜所リンク） |
| 7 | `next` | `nextOf(w)` の3本 |
| 8 | `deep` | 原酒と樽・造り手と歴史・スペック（いまの「丁寧に知る」部分） |
| 9 | `sources` | 出典（`sourcesHtml`） |

**注意:** 「関連する比較」（仕様書 §5.3-9）は比較ページが出来てから足すので、Task 6 で `next` と `deep` の間に `id="related-compare"` を挿す。いまは作らない。

`notes` の中身の作り方:

```js
    const notes = (w.official || []).length || w.finish
      ? `<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">香り・味・余韻</h2>
${(w.official || []).map((o) => `<p class="note-row"><span class="note-k">${esc(o.k)}</span><span class="note-v">${esc(o.v)}</span></p>`).join('')}
<p class="note-row"><span class="note-k">余韻</span><span class="note-v">${esc(w.finish)}</span></p>
<p class="note">「特長」「香り」「味」はメーカー公式の説明を要約したものです。余韻の長さはサイト独自の目安です。</p></section>`
      : '';
```

- [ ] **Step 6: 見た目を足す**

`site/styles.css` に足す:

```css
/* ===== 味わい5段階 ===== */
.bars{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.bar{display:grid;grid-template-columns:5.5em 1fr 1.4em;align-items:center;gap:8px}
.bar-label{font-size:13px;color:var(--text-2);word-break:keep-all}
.bar-track{height:10px;border-radius:999px;background:var(--surface-2);overflow:hidden}
.bar-fill{display:block;height:100%;width:calc(var(--v) / 5 * 100%);background:linear-gradient(90deg,var(--amber-dim),var(--amber))}
.bar-value{font-size:13px;color:var(--text-3);text-align:right}
.scene-tags{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 0}
.scene-tag{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid var(--line-2);background:var(--surface-2);color:var(--text);font-size:14px;text-decoration:none;word-break:keep-all}
.note-row{display:flex;gap:10px;margin:6px 0}
.note-k{flex:0 0 3.5em;color:var(--text-3);font-size:14px}
.note-v{flex:1}
```

- [ ] **Step 7: テストを走らせて、通ることを確かめる**

```bash
node --test site/tests/*.check.mjs
```

期待: 全部成功。

- [ ] **Step 8: スマホ幅で確認する**

```bash
bash site/tests/shots.sh
```

`#/whisky/hibiki-jh` の375pxを見て、5段階の棒のラベルが折り返していないこと、次の1本の3枚が横に並んでいることを確認する。

- [ ] **Step 9: コミット**

```bash
git add site/app.js site/styles.css site/tests/render.check.mjs
git commit -m "$(cat <<'EOF'
site: 銘柄ページを味わい5段階・余韻・こんな人におすすめ・次の1本3本の並びに組み替える

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 診断を3問の新方式にする

仕様書 §5.4。いまの3問（飲み方・味・ボディ）を、普段のお酒・好きな味・場面の3問に入れ替え、結果に「あなたのタイプ」を足す。

**Files:**
- Modify: `site/app.js`（`FIND_QUESTIONS` / `findScore` / `findWhy` / `findType` / `viewFind` を書き換え）
- Modify: `site/styles.css`（タイプの表示）
- Modify: `site/tests/render.check.mjs`（診断のテストを書き換え）

**Interfaces:**
- Consumes: Task 2 の `profile` / `scenes`、Task 3 の `listHref`
- Produces:
  ```js
  const FIND_QUESTIONS;        // [{key:'q1'|'q2'|'q3', label, options:[[value,label],...]}]
  function findScore(w, a);    // 点数（大きいほど合う）
  function recommend(a);       // 上位3本（同点は読みの順）
  function findWhy(w, a);      // 1行の理由
  function findType(list);     // {key,label} … あなたのタイプ
  ```
  ルーター: `#/find?q1=&q2=&q3=`

- [ ] **Step 1: 診断のテストを書き換える**

`render.check.mjs` の「好みから探す」6件を削除し、次を足す:

```js
// ===== 診断 =====
test('診断：3つの質問が並び、選ぶ前は案内を出す', async () => {
  const env = await load('#/find');
  const qs = [...env.document.querySelectorAll('.q')];
  assert.equal(qs.length, 3);
  assert.deepEqual(qs.map((q) => q.querySelector('.q-label').textContent), [
    '普段どんなお酒を飲みますか？', 'どんな味が好きですか？', 'どんなときに飲みますか？',
  ]);
  assert.match(env.document.querySelector('#find-result').textContent, /選ぶと/);
  assert.deepEqual(env.errors, []);
});

test('診断：選ぶと上位3本が理由つきで出て、あなたのタイプが出る', async () => {
  const env = await load('#/find?q1=none&q2=fresh&q3=' + encodeURIComponent('初めての1本'));
  const cards = [...env.document.querySelectorAll('#find-result a.card')];
  assert.equal(cards.length, 3);
  for (const c of cards) assert.ok(c.querySelector('.card-why').textContent.trim().length >= 4);
  assert.match(env.document.querySelector('#find-type').textContent, /あなたのタイプ/);
  assert.match(env.document.querySelector('#find-result').textContent, /サイト独自の目安|編集部の見立て/);
});

test('診断：あまり飲まない人には、飲みやすくて煙っぽくない銘柄が出る', async () => {
  const env = await load('#/find?q1=none');
  const ids = [...env.document.querySelectorAll('#find-result a.card')].map((a) => a.getAttribute('href').replace('#/whisky/', ''));
  for (const id of ids) {
    const w = DATA.whiskies.find((x) => x.id === id);
    assert.ok(w.profile.drinkability >= 4, `${id}: 飲みやすさ ${w.profile.drinkability}`);
    assert.ok(w.profile.smokiness <= 3, `${id}: スモーキー ${w.profile.smokiness}`);
  }
});

test('診断：場面を選ぶと、そのシーンの銘柄が上位に来る', async () => {
  const env = await load('#/find?q3=' + encodeURIComponent('食事と一緒に'));
  const ids = [...env.document.querySelectorAll('#find-result a.card')].map((a) => a.getAttribute('href').replace('#/whisky/', ''));
  for (const id of ids) {
    assert.ok(DATA.whiskies.find((x) => x.id === id).scenes.includes('食事と一緒に'), id);
  }
});

test('診断：1問だけ選んでも結果が出る', async () => {
  const env = await load('#/find?q2=smoky');
  assert.equal(env.document.querySelectorAll('#find-result a.card').length, 3);
});

test('診断：選ぶと URL に残り、選んだものに印が付く', async () => {
  const env = await load('#/find');
  const btn = env.document.querySelector('.q[data-key="q2"] a[href*="q2=smoky"]');
  assert.ok(btn, 'スモーキーの選択肢がある');
  go(env, btn.getAttribute('href').replace(/^#/, '#'));
  assert.match(env.window.location.hash, /q2=smoky/);
  const on = [...env.document.querySelectorAll('.q[data-key="q2"] [aria-current="true"]')];
  assert.equal(on.length, 1);
  assert.equal(on[0].textContent, 'スモーキー');
});

test('診断：結果から別の条件で探しにいける', async () => {
  const env = await load('#/find?q2=smoky');
  assert.ok(env.document.querySelector('#find-result a[href^="#/list"]'), '一覧への導線がある');
});
```

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/render.check.mjs
```

期待: 診断の7件が落ちる。

- [ ] **Step 3: 質問と点の付け方を書く**

`site/app.js` の診断の節を、次に差し替える:

```js
  // ===== 画面：診断 =====
  // 質問はすべて「こだわらない」を既定にする（選ばなくても結果が出る）
  const FIND_QUESTIONS = [
    { key: 'q1', label: '普段どんなお酒を飲みますか？', options: [
      ['any', 'こだわらない'], ['beer', 'ビール'], ['wine', 'ワイン'], ['sake', '日本酒'],
      ['shochu', '焼酎'], ['highball', 'ハイボール'], ['none', 'あまり飲まない'],
    ] },
    { key: 'q2', label: 'どんな味が好きですか？', options: [
      ['any', 'よくわからない'], ['sweet', '甘め'], ['fresh', '爽やか'], ['rich', '濃厚'],
      ['smoky', 'スモーキー'], ['fruity', 'フルーティ'],
    ] },
    { key: 'q3', label: 'どんなときに飲みますか？', options: [['any', 'こだわらない']].concat(SCENES.map((s) => [s, s])) },
  ];

  // 点の付け方（すべてサイト独自の目安）
  function findScore(w, a) {
    const p = w.profile;
    let s = 0;
    if (a.q1 === 'beer') s += p.drinkability * 0.4 + (w.serve.highball === 3 ? 1.5 : 0);
    if (a.q1 === 'wine') s += p.fruitiness * 0.5 + p.sweetness * 0.3;
    if (a.q1 === 'sake') s += p.drinkability * 0.4 + (6 - p.richness) * 0.3;
    if (a.q1 === 'shochu') s += p.richness * 0.5 + (w.finish === '長い' ? 0.5 : 0);
    if (a.q1 === 'highball') s += (w.serve.highball === 3 ? 2 : w.serve.highball === 2 ? 1 : 0);
    if (a.q1 === 'none') s += p.drinkability * 0.8 - p.smokiness * 0.5;

    if (a.q2 === 'sweet') s += p.sweetness * 0.8;
    if (a.q2 === 'fruity') s += p.fruitiness * 0.8;
    if (a.q2 === 'smoky') s += p.smokiness * 0.8;
    if (a.q2 === 'rich') s += p.richness * 0.8;
    if (a.q2 === 'fresh') s += (p.drinkability + (6 - p.richness)) * 0.4;

    if (a.q3 && a.q3 !== 'any') s += w.scenes.includes(a.q3) ? 2.5 : -1.5;
    if (w.limited) s -= 0.3; // 手に入りにくい銘柄は少し下げる
    return s;
  }

  function recommend(a) {
    return [...DATA.whiskies]
      .map((w) => ({ w, s: findScore(w, a) }))
      .sort((x, y) => y.s - x.s || x.w.kana.localeCompare(y.w.kana, 'ja'))
      .slice(0, 3)
      .map((x) => x.w);
  }

  // 結果カードに出す1行の理由
  function findWhy(w, a) {
    const p = w.profile;
    const bits = [];
    if (a.q3 && a.q3 !== 'any' && w.scenes.includes(a.q3)) bits.push(`${a.q3}に向く`);
    if (a.q2 === 'sweet' && p.sweetness >= 4) bits.push('甘みがしっかりある');
    if (a.q2 === 'fruity' && p.fruitiness >= 4) bits.push('果実のような香りがある');
    if (a.q2 === 'smoky' && p.smokiness >= 4) bits.push('煙っぽさがはっきりある');
    if (a.q2 === 'rich' && p.richness >= 4) bits.push('飲みごたえがある');
    if (a.q2 === 'fresh' && p.drinkability >= 4) bits.push('軽やかで飲みやすい');
    if (a.q1 === 'none' && p.drinkability >= 4) bits.push('ウイスキーに慣れていなくても飲みやすい');
    if (a.q1 === 'highball' && w.serve.highball === 3) bits.push('ハイボールがとても合う');
    if (a.q1 === 'beer' && w.serve.highball === 3) bits.push('炭酸で割るとよく合う');
    if (a.q1 === 'wine' && p.fruitiness >= 4) bits.push('果実味があってワイン好きに向く');
    if (a.q1 === 'sake' && p.drinkability >= 4) bits.push('やわらかく、食中でも飲みやすい');
    if (a.q1 === 'shochu' && p.richness >= 4) bits.push('コクがあり、ロックで映える');
    if (!bits.length) bits.push(w.taste.line);
    return bits.slice(0, 2).join('。');
  }

  // あなたのタイプ（上位3本の平均で決める）
  const FIND_TYPES = [
    { key: 'smoky', label: 'スモーキー系', test: (p) => p.smokiness >= 4 },
    { key: 'floral', label: '華やか・フルーティ系', test: (p) => p.fruitiness >= 3.5 },
    { key: 'light', label: 'やさしい軽快系', test: (p) => p.drinkability >= 3.5 && p.richness <= 3 },
    { key: 'rich', label: '濃厚・熟成系', test: () => true },
  ];
  function findType(list) {
    const avg = (k) => list.reduce((a, w) => a + w.profile[k], 0) / list.length;
    const p = { sweetness: avg('sweetness'), fruitiness: avg('fruitiness'), smokiness: avg('smokiness'), richness: avg('richness'), drinkability: avg('drinkability') };
    return FIND_TYPES.find((t) => t.test(p));
  }
```

- [ ] **Step 4: 診断の画面を書く**

```js
  // 選択肢のリンク（選ぶと URL が変わる）
  function findHref(a, key, value) {
    const next = { ...a, [key]: value };
    const p = new URLSearchParams();
    for (const q of FIND_QUESTIONS) if (next[q.key] && next[q.key] !== 'any') p.set(q.key, next[q.key]);
    const qs = p.toString();
    return qs ? `#/find?${qs}` : '#/find';
  }

  function viewFind(a) {
    const answered = FIND_QUESTIONS.some((q) => a[q.key] && a[q.key] !== 'any');
    const questions = FIND_QUESTIONS.map((q) => {
      const cur = a[q.key] || 'any';
      const opts = q.options.map(([v, label]) => {
        const on = v === cur;
        return `<a class="opt${on ? ' opt--on' : ''}" href="${findHref(a, q.key, v)}"${on ? ' aria-current="true"' : ''}>${esc(label)}</a>`;
      }).join('');
      return `<fieldset class="q" data-key="${esc(q.key)}"><legend class="q-label">${esc(q.label)}</legend><div class="opts">${opts}</div></fieldset>`;
    }).join('');

    let result;
    if (!answered) {
      result = '<p class="empty">上の質問を選ぶと、合いそうな3本をここに出します。ひとつだけ選んでも大丈夫です。</p>';
    } else {
      const list = recommend(a);
      const type = findType(list);
      result = `<p id="find-type" class="find-type">あなたのタイプ：<strong>${esc(type.label)}</strong></p>
<ul class="cards">${list.map((w) => whiskyCard(w, findWhy(w, a))).join('')}</ul>
<p class="note">この結果はサイト独自の目安です。味の感じ方には個人差があります。</p>
<p class="find-links"><a class="btn btn--ghost" href="#/list">別の条件で探す</a></p>`;
    }

    return {
      title: `3問で診断｜${SITE}`,
      html: `<section class="hero hero--sm"><h1>3問であなたに合う1本</h1><p class="hero-lead">選ぶたびに結果が変わります。答えは URL に残るので、そのまま共有できます。</p></section>
<section class="find">${questions}</section>
<section id="find-result">${result}</section>`,
    };
  }
```

ルーターの `find` を、3問の受け取りに直す:

```js
    if (parts.length === 1 && parts[0] === 'find') {
      return { view: 'find', q1: params.get('q1') || 'any', q2: params.get('q2') || 'any', q3: params.get('q3') || 'any' };
    }
```

- [ ] **Step 5: 見た目を足す**

`site/styles.css` に足す:

```css
/* ===== ここから使う共通の部品 ===== */
.btn--ghost{background:transparent;border:1px solid var(--line-2);color:var(--text)}
.hero--sm{padding-top:18px;padding-bottom:10px}
.hero--sm h1{font-size:22px}

/* ===== 診断 ===== */
.q{border:0;margin:0 0 18px;padding:0}
.q-label{padding:0;margin:0 0 8px;font-weight:700;word-break:auto-phrase}
.opts{display:flex;flex-wrap:wrap;gap:8px}
.opt{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--line-2);background:var(--surface);color:var(--text);text-decoration:none;font-size:15px;word-break:keep-all}
.opt--on{background:var(--amber);border-color:var(--amber);color:var(--amber-ink);font-weight:700}
.find-type{margin:0 0 12px;font-size:17px}
.find-links{margin-top:14px}
```

- [ ] **Step 6: テストを走らせて、通ることを確かめる**

```bash
node --test site/tests/*.check.mjs
```

期待: 全部成功。`あまり飲まない人には...` が落ちるときは、`findScore` の `q1 === 'none'` の重みが足りないか、データの `drinkability` が偏っている。まず `node -e` で上位を出して中身を見る。

- [ ] **Step 7: コミット**

```bash
git add site/app.js site/styles.css site/tests/render.check.mjs
git commit -m "$(cat <<'EOF'
site: 診断を3問（普段のお酒・好きな味・場面）に入れ替え、あなたのタイプを足す

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 比較 `#/compare?a=&b=`

仕様書 §5.5。2本を並べて比べる。差が大きい項目を2つ取り上げた文を出す（順位は付けない）。銘柄ページにも「関連する比較」を足す。

**Files:**
- Modify: `site/app.js`（`COMPARE_PRESETS` / `compareDiff` / `viewCompare` / `bindCompare` / ルーター、`viewWhisky` に関連する比較）
- Modify: `site/styles.css`（比較の表）
- Modify: `site/tests/render.check.mjs`

**Interfaces:**
- Consumes: Task 2 の `profile` / `finish`、Task 3 の `abvNum` / `typeGroupOf`、Task 4 の `profileBars`
- Produces:
  ```js
  const COMPARE_PRESETS;            // [{a,b,label}, ...] 6組
  function compareDiff(a, b);       // 「こんな違いがあります」の文
  function compareHref(aId, bId);   // '#/compare?a=..&b=..'
  function viewCompare(r);          // → {title, html}
  function bindCompare();           // 2つの選択を URL に反映
  ```

- [ ] **Step 1: 比較のテストを書く**

```js
// ===== 比較 =====
test('比較：2本が並び、項目がそろう', async () => {
  const env = await load('#/compare?a=yamazaki&b=hakushu');
  const d = env.document;
  assert.deepEqual([...d.querySelectorAll('.cmp-name')].map((e) => e.textContent), ['山崎', '白州']);
  const keys = [...d.querySelectorAll('.cmp-row .cmp-k')].map((e) => e.textContent);
  for (const k of ['タイプ', '度数', '容量', '産地', '区分', '飲み方', '余韻']) {
    assert.ok(keys.some((x) => x.includes(k)), `${k} が無い`);
  }
  assert.equal(d.querySelectorAll('.cmp-col .bars').length, 2, '味わい5段階が2本ぶん出る');
  assert.deepEqual(env.errors, []);
});

test('比較：差が大きい項目を2つ取り上げた文が出る（順位は付けない）', async () => {
  const env = await load('#/compare?a=yoichi&b=chita');
  const s = env.document.querySelector('#cmp-diff').textContent;
  assert.match(s, /こんな違いがあります/);
  assert.ok(!/おすすめ|勝|優れ/.test(s), '順位付けの言葉を使わない');
  assert.match(env.document.querySelector('#cmp-diff').textContent, /目安|見立て/);
});

test('比較：定番の6組へ1タップで行ける', async () => {
  const env = await load('#/compare?a=yamazaki&b=hakushu');
  const hrefs = [...env.document.querySelectorAll('.cmp-presets a')].map((a) => a.getAttribute('href'));
  assert.equal(hrefs.length, 6);
  assert.ok(hrefs.includes('#/compare?a=yoichi&b=miyagikyo'));
  assert.ok(hrefs.includes('#/compare?a=taketsuru&b=miyagikyo'));
});

test('比較：銘柄を選び替えると URL が変わる', async () => {
  const env = await load('#/compare?a=yamazaki&b=hakushu');
  const sel = env.document.querySelector('select[name="b"]');
  sel.value = 'chita';
  sel.dispatchEvent(new env.window.Event('change', { bubbles: true }));
  assert.match(env.window.location.hash, /a=yamazaki&b=chita/);
});

test('比較：指定がないときは山崎と白州を出す', async () => {
  const env = await load('#/compare');
  assert.deepEqual([...env.document.querySelectorAll('.cmp-name')].map((e) => e.textContent), ['山崎', '白州']);
});

test('比較：知らない id は見つからない表示', async () => {
  const env = await load('#/compare?a=nope&b=hakushu');
  assert.match(env.document.querySelector('h1').textContent, /見つかりません/);
});

test('銘柄ページ：関連する比較へのリンクがある', async () => {
  const env = await load('#/whisky/yamazaki');
  const hrefs = [...env.document.querySelectorAll('#related-compare a')].map((a) => a.getAttribute('href'));
  assert.ok(hrefs.length >= 1);
  for (const h of hrefs) assert.match(h, /^#\/compare\?a=.+&b=.+/);
  assert.ok(hrefs.some((h) => h.includes('yamazaki')), '自分が入っている組が出る');
});
```

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/render.check.mjs
```

期待: 比較の7件が落ちる。

- [ ] **Step 3: 比較の中身を書く**

`site/app.js` に足す:

```js
  // ===== 画面：比較 =====
  const COMPARE_PRESETS = [
    { a: 'yamazaki', b: 'hakushu' },
    { a: 'yoichi', b: 'miyagikyo' },
    { a: 'yamazaki', b: 'hibiki-jh' },
    { a: 'hakushu', b: 'chita' },
    { a: 'taketsuru', b: 'miyagikyo' },
    { a: 'fuji-single-blended', b: 'chita' },
  ];
  const compareHref = (a, b) => `#/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;

  // 差が大きい項目を2つまで文にする（順位は付けない）
  function compareDiff(a, b) {
    const diffs = PROFILE_KEYS
      .map(([k, label]) => ({ label, d: a.profile[k] - b.profile[k] }))
      .filter((x) => x.d !== 0)
      .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
      .slice(0, 2);
    if (!diffs.length) return `${a.name}と${b.name}は、味わいの5段階では同じ目安です。産地や飲み方で選んでみてください。`;
    return diffs.map((x) => `${x.label}は${x.d > 0 ? a.name : b.name}のほうが${Math.abs(x.d)}段階強い`).join('。') + '。';
  }

  // 比較の1行
  function cmpRow(label, av, bv) {
    return `<li class="cmp-row"><span class="cmp-k">${esc(label)}</span><span class="cmp-v">${av}</span><span class="cmp-v">${bv}</span></li>`;
  }

  function serveText(w) {
    return SERVES.filter(([k]) => w.serve[k] === 3).map(([, label]) => label).join('・') || '好みが分かれます';
  }

  function viewCompare(r) {
    const a = W.get(r.a || 'yamazaki');
    const b = W.get(r.b || 'hakushu');
    if (!a || !b) return viewNotFound();

    const options = (cur) => sortList(DATA.whiskies, 'name')
      .map((w) => `<option value="${esc(w.id)}"${w.id === cur ? ' selected' : ''}>${esc(w.name)}</option>`).join('');
    const spec = (w, k) => (w.specs || []).find((s) => s.k === k)?.v || '記載なし';

    const rows = [
      cmpRow('タイプ', esc(a.type), esc(b.type)),
      cmpRow('度数', esc(spec(a, 'アルコール度数')), esc(spec(b, 'アルコール度数'))),
      cmpRow('容量', esc(spec(a, '容量')), esc(spec(b, '容量'))),
      cmpRow('産地', esc(originText(a)), esc(originText(b))),
      cmpRow('区分', badge(a.standard, true), badge(b.standard, true)),
      cmpRow('向いている飲み方', esc(serveText(a)), esc(serveText(b))),
      cmpRow('余韻', esc(a.finish), esc(b.finish)),
      cmpRow('限定', a.limited ? esc(a.limited) : 'なし', b.limited ? esc(b.limited) : 'なし'),
    ].join('');

    const presets = COMPARE_PRESETS
      .map((p) => `<a class="opt" href="${compareHref(p.a, p.b)}">${esc(W.get(p.a).name)} と ${esc(W.get(p.b).name)}</a>`)
      .join('');

    return {
      title: `${a.name} と ${b.name} を比べる｜${SITE}`,
      html: `<section class="hero hero--sm"><h1>2本を比べる</h1></section>
<section class="cmp">
  <div class="cmp-heads">
    <div class="cmp-col"><label class="filter"><span class="visually-hidden">左の銘柄</span><select name="a">${options(a.id)}</select></label>
      ${bottle(a, 'sm')}<p class="cmp-name">${esc(a.name)}</p><p class="cmp-meta">${esc(a.maker)}</p>${profileBars(a)}</div>
    <div class="cmp-col"><label class="filter"><span class="visually-hidden">右の銘柄</span><select name="b">${options(b.id)}</select></label>
      ${bottle(b, 'sm')}<p class="cmp-name">${esc(b.name)}</p><p class="cmp-meta">${esc(b.maker)}</p>${profileBars(b)}</div>
  </div>
  <ul class="cmp-rows">${rows}</ul>
  <p id="cmp-diff" class="cmp-diff"><strong>こんな違いがあります。</strong>${esc(compareDiff(a, b))}<span class="note">味わいの5段階と、この文はサイト独自の目安です。どちらが良いという意味ではありません。</span></p>
  <div class="cmp-presets"><h2>よくある組み合わせ</h2><div class="opts">${presets}</div></div>
  <p><a class="btn btn--ghost" href="#/list">ほかの銘柄を探す</a></p>
</section>`,
    };
  }

  function bindCompare() {
    const sels = [...document.querySelectorAll('.cmp select')];
    for (const sel of sels) {
      sel.addEventListener('change', () => {
        const a = document.querySelector('select[name="a"]').value;
        const b = document.querySelector('select[name="b"]').value;
        location.hash = compareHref(a, b);
      });
    }
  }
```

ルーターに足す:

```js
    if (parts.length === 1 && parts[0] === 'compare') {
      return { view: 'compare', a: params.get('a') || '', b: params.get('b') || '' };
    }
```

`render()` に `: r.view === 'compare' ? viewCompare(r)` と `if (r.view === 'compare') bindCompare();` を足す。

- [ ] **Step 4: 銘柄ページに「関連する比較」を足す**

`viewWhisky` の `next` と `deep` の間に挿す:

```js
    // この銘柄が入っている定番の組み合わせ。無ければ「次の1本」の1本目と比べる
    const pairs = COMPARE_PRESETS.filter((p) => p.a === w.id || p.b === w.id);
    const fallback = nextOf(w)[0];
    const links = (pairs.length
      ? pairs.map((p) => ({ a: p.a, b: p.b }))
      : fallback ? [{ a: w.id, b: fallback.id }] : []
    ).map(({ a, b }) => `<a class="opt" href="${compareHref(a, b)}">${esc(W.get(a).name)} と ${esc(W.get(b).name)}</a>`).join('');
    const relatedCompare = links
      ? `<section id="related-compare" aria-labelledby="related-compare-h"><h2 id="related-compare-h">関連する比較</h2><div class="opts">${links}</div></section>`
      : '';
```

- [ ] **Step 5: 見た目を足す**

```css
/* ===== 比較 ===== */
.cmp-heads{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cmp-col{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:12px;text-align:center}
.cmp-col .bars{margin-top:10px;text-align:left}
.cmp-col .bar{grid-template-columns:4.5em 1fr 1.2em}
.cmp-name{margin:8px 0 0;font-weight:700;word-break:keep-all}
.cmp-meta{margin:2px 0 0;font-size:13px;color:var(--text-2)}
.cmp-rows{list-style:none;margin:16px 0 0;padding:0}
.cmp-row{display:grid;grid-template-columns:5.5em 1fr 1fr;gap:8px;padding:8px 0;border-top:1px solid var(--line)}
.cmp-k{font-size:13px;color:var(--text-3)}
.cmp-v{font-size:14px;word-break:auto-phrase}
.cmp-diff{margin:16px 0 0;padding:12px;border-radius:var(--radius);background:var(--surface-2);line-height:1.8}
.cmp-diff .note{display:block;margin-top:6px}
.cmp-presets{margin-top:22px}
```

- [ ] **Step 6: テストを走らせて、通ることを確かめる**

```bash
node --test site/tests/*.check.mjs
```

- [ ] **Step 7: コミット**

```bash
git add site/app.js site/styles.css site/tests/render.check.mjs
git commit -m "$(cat <<'EOF'
site: 2本を比べるページと、銘柄ページからの関連する比較を追加

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 味わいMAP `#/map`

仕様書 §5.6。軸は **横＝軽やか↔濃厚、縦＝フルーティ↔スモーキー**。データの `taste.x` / `taste.y` は書き換えず、描くときだけ入れ替える。

**Files:**
- Modify: `site/app.js`（`mapSvg` / `viewMap` / ルーター）
- Modify: `site/styles.css`
- Modify: `site/tests/render.check.mjs`

**Interfaces:**
- Consumes: Task 3 の `TASTE_FILTERS`
- Produces:
  ```js
  const MAP_FILTERS;                  // [{key:''|'fruity'|'smoky'|'sweet'|'fresh', label}]
  function mapPos(w);                 // {cx, cy} … 0〜200 の座標
  function mapSvg(list, opts);        // SVG（opts.focus で1本を強調、opts.small で軸ラベルを省く）
  function viewMap(r);                // → {title, html}
  ```

- [ ] **Step 1: 味わいMAPのテストを書く**

```js
// ===== 味わいMAP =====
test('MAP：全銘柄が点で出て、銘柄ページへ行ける', async () => {
  const env = await load('#/map');
  const pts = [...env.document.querySelectorAll('#tastemap a.pt')];
  assert.equal(pts.length, DATA.whiskies.length);
  assert.equal(pts[0].getAttribute('href'), '#/whisky/' + pts[0].getAttribute('data-id'));
  assert.ok(pts[0].querySelector('title').textContent.includes(DATA.whiskies.find((w) => w.id === pts[0].getAttribute('data-id')).name));
  assert.deepEqual(env.errors, []);
});

test('MAP：軸は 横が軽やか↔濃厚、縦がフルーティ↔スモーキー', async () => {
  const env = await load('#/map');
  const s = text(env.document.querySelector('#tastemap'));
  assert.ok(s.includes('軽やか') && s.includes('濃厚') && s.includes('フルーティ') && s.includes('スモーキー'));
  // 濃厚な銘柄ほど右に、スモーキーな銘柄ほど上に来る
  const pos = (id) => {
    const a = env.document.querySelector(`#tastemap a.pt[data-id="${id}"] circle`);
    return { cx: Number(a.getAttribute('cx')), cy: Number(a.getAttribute('cy')) };
  };
  const rich = DATA.whiskies.reduce((m, w) => (w.taste.y > m.taste.y ? w : m));
  const light = DATA.whiskies.reduce((m, w) => (w.taste.y < m.taste.y ? w : m));
  assert.ok(pos(rich.id).cx > pos(light.id).cx, '濃厚が右');
  const smoky = DATA.whiskies.reduce((m, w) => (w.taste.x > m.taste.x ? w : m));
  const floral = DATA.whiskies.reduce((m, w) => (w.taste.x < m.taste.x ? w : m));
  assert.ok(pos(smoky.id).cy < pos(floral.id).cy, 'スモーキーが上');
});

test('MAP：絞り込みで点が減る', async () => {
  const env = await load('#/map?filter=smoky');
  const n = DATA.whiskies.filter((w) => w.profile.smokiness >= 4).length;
  assert.equal(env.document.querySelectorAll('#tastemap a.pt').length, n);
  assert.equal(env.document.querySelector('.map-filters [aria-current="true"]').textContent, 'スモーキー系');
});

test('MAP：点の一覧が文字でも出る（スマホで押しやすいように）', async () => {
  const env = await load('#/map?filter=fruity');
  const n = DATA.whiskies.filter((w) => w.profile.fruitiness >= 4).length;
  assert.equal(env.document.querySelectorAll('#map-list a.card').length, n);
});
```

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/render.check.mjs
```

- [ ] **Step 3: 味わいMAPを書く**

```js
  // ===== 画面：味わいMAP =====
  // 横＝軽やか(左)↔濃厚(右)は taste.y、縦＝フルーティ(下)↔スモーキー(上)は taste.x を使う
  const MAP_SIZE = 200;
  const MAP_PAD = 16;
  function mapPos(w) {
    const inner = MAP_SIZE - MAP_PAD * 2;
    const cx = MAP_PAD + ((w.taste.y + 1) / 2) * inner;
    const cy = MAP_PAD + (1 - (w.taste.x + 1) / 2) * inner;
    return { cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10 };
  }

  const MAP_FILTERS = [
    { key: '', label: 'すべて', test: () => true },
    { key: 'fruity', label: 'フルーティ系', test: (p) => p.fruitiness >= 4 },
    { key: 'smoky', label: 'スモーキー系', test: (p) => p.smokiness >= 4 },
    { key: 'sweet', label: '甘い系', test: (p) => p.sweetness >= 4 },
    { key: 'fresh', label: '軽やか系', test: (p) => p.drinkability >= 4 && p.richness <= 2 },
  ];

  function mapSvg(list, opts = {}) {
    const half = MAP_SIZE / 2;
    const pts = list.map((w) => {
      const { cx, cy } = mapPos(w);
      const on = opts.focus === w.id;
      return `<a class="pt${on ? ' pt--on' : ''}" href="#/whisky/${esc(w.id)}" data-id="${esc(w.id)}"><title>${esc(w.name)}：${esc(w.taste.line)}</title><circle cx="${cx}" cy="${cy}" r="${on ? 6 : 4}"></circle></a>`;
    }).join('');
    const labels = opts.small ? '' : `
  <text class="ax" x="${half}" y="10" text-anchor="middle">スモーキー</text>
  <text class="ax" x="${half}" y="${MAP_SIZE - 3}" text-anchor="middle">フルーティ</text>
  <text class="ax" x="3" y="${half}" text-anchor="start">軽やか</text>
  <text class="ax" x="${MAP_SIZE - 3}" y="${half}" text-anchor="end">濃厚</text>`;
    return `<svg class="wmap" viewBox="0 0 ${MAP_SIZE} ${MAP_SIZE}" role="img" aria-label="味わいの地図。横が軽やかから濃厚、縦がフルーティからスモーキー">
  <rect x="0" y="0" width="${MAP_SIZE}" height="${MAP_SIZE}" rx="12" class="wmap-bg"></rect>
  <line x1="${half}" y1="${MAP_PAD}" x2="${half}" y2="${MAP_SIZE - MAP_PAD}" class="wmap-axis"></line>
  <line x1="${MAP_PAD}" y1="${half}" x2="${MAP_SIZE - MAP_PAD}" y2="${half}" class="wmap-axis"></line>${labels}
  ${pts}
</svg>`;
  }

  function viewMap(r) {
    const f = MAP_FILTERS.find((x) => x.key === (r.filter || '')) || MAP_FILTERS[0];
    const list = DATA.whiskies.filter((w) => f.test(w.profile));
    const chips = MAP_FILTERS.map((x) => {
      const on = x.key === f.key;
      return `<a class="opt${on ? ' opt--on' : ''}" href="${x.key ? `#/map?filter=${x.key}` : '#/map'}"${on ? ' aria-current="true"' : ''}>${esc(x.label)}</a>`;
    }).join('');
    return {
      title: `味わいMAP｜${SITE}`,
      html: `<section class="hero hero--sm"><h1>味わいMAP</h1><p class="hero-lead">横は軽やかから濃厚、縦はフルーティからスモーキー。位置はサイト独自の目安です。</p></section>
<div class="map-filters chips">${chips}</div>
<div id="tastemap" class="wmap-wrap">${mapSvg(list)}</div>
<section id="map-list"><div class="sec-head"><h2>この範囲の銘柄</h2><span class="count">${list.length}本</span></div><ul class="cards">${sortList(list, 'recommend').map((w) => whiskyCard(w)).join('')}</ul></section>`,
    };
  }
```

ルーターに `if (parts.length === 1 && parts[0] === 'map') return { view: 'map', filter: params.get('filter') || '' };` を足し、`render()` に `viewMap(r)` を足す。

- [ ] **Step 4: 見た目を足す**

```css
/* ===== 味わいMAP ===== */
.wmap-wrap{margin:14px 0 22px}
.wmap{width:100%;max-width:420px;margin:0 auto;display:block}
.wmap-bg{fill:var(--surface)}
.wmap-axis{stroke:var(--line-2);stroke-width:1}
.wmap .ax{fill:var(--text-3);font-size:9px;font-family:var(--font)}
.wmap .pt circle{fill:var(--amber);opacity:.75}
.wmap .pt:hover circle,.wmap .pt:focus circle{opacity:1;stroke:var(--text);stroke-width:1.5}
.wmap .pt--on circle{fill:var(--amber-2);opacity:1}
.map-filters{margin:0 0 6px}
```

- [ ] **Step 5: テストを走らせて、通ることを確かめる**

```bash
node --test site/tests/*.check.mjs
```

- [ ] **Step 6: コミット**

```bash
git add site/app.js site/styles.css site/tests/render.check.mjs
git commit -m "$(cat <<'EOF'
site: 味わいMAP（横＝軽やか↔濃厚、縦＝フルーティ↔スモーキー）を追加

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 今日の1本 `#/today`

仕様書 §5.7。同じ日なら何度開いても同じ1本。「もう一度選ぶ」で別の1本（番号がURLに残る）。

**Files:**
- Modify: `site/app.js`（`todayIndex` / `todayPick` / `viewToday` / ルーター）
- Modify: `site/styles.css`
- Modify: `site/tests/render.check.mjs`

**Interfaces:**
- Produces:
  ```js
  function todayIndex(date);   // 日付 → 0以上の整数（同じ日なら同じ値）
  function todayPick(n);       // 番号 → 銘柄（範囲外は折り返す）
  function viewToday(r);       // → {title, html}
  ```
  `window.__app` に `todayIndex` / `todayPick` を足す。

- [ ] **Step 1: 今日の1本のテストを書く**

```js
// ===== 今日の1本 =====
test('今日の1本：同じ日なら何度開いても同じ銘柄', async () => {
  const a = await load('#/today');
  const b = await load('#/today');
  const id = (env) => env.document.querySelector('#today a.btn').getAttribute('href');
  assert.equal(id(a), id(b));
  assert.equal(a.window.__app.todayIndex(new Date('2026-09-21T10:00:00')), a.window.__app.todayIndex(new Date('2026-09-21T23:00:00')));
  assert.notEqual(a.window.__app.todayIndex(new Date('2026-09-21T10:00:00')), a.window.__app.todayIndex(new Date('2026-09-22T10:00:00')));
});

test('今日の1本：番号を指定すると、その銘柄が出る', async () => {
  const env = await load('#/today?n=5');
  const w = env.window.__app.todayPick(5);
  assert.equal(env.document.querySelector('#today .today-name').textContent, w.name);
  assert.match(env.document.querySelector('#today').textContent, new RegExp(w.taste.line.slice(0, 6)));
});

test('今日の1本：もう一度選ぶと次の番号になる', async () => {
  const env = await load('#/today?n=5');
  assert.equal(env.document.querySelector('#today-again').getAttribute('href'), '#/today?n=6');
});

test('今日の1本：飲み方と銘柄ページへの導線がある', async () => {
  const env = await load('#/today?n=0');
  const sec = env.document.querySelector('#today');
  assert.ok(sec.querySelector('.serve-list'), '飲み方が出る');
  assert.match(sec.querySelector('a.btn').getAttribute('href'), /^#\/whisky\//);
});
```

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/render.check.mjs
```

- [ ] **Step 3: 今日の1本を書く**

```js
  // ===== 画面：今日の1本 =====
  // 日付の文字列から番号を作る（同じ日なら同じ番号）
  function todayIndex(date = new Date()) {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 100000;
    return h;
  }
  function todayPick(n) {
    const len = DATA.whiskies.length;
    return DATA.whiskies[((n % len) + len) % len];
  }

  function viewToday(r) {
    const n = r.n === '' ? todayIndex() : Number(r.n);
    const num = Number.isFinite(n) ? n : todayIndex();
    const w = todayPick(num);
    return {
      title: `今日の1本：${w.name}｜${SITE}`,
      html: `<section id="today" class="today">
  <p class="today-kicker">今日の1本</p>
  ${bottle(w, 'lg')}
  <h1 class="today-name">${esc(w.name)}</h1>
  <p class="today-meta">${esc(w.maker)}・${esc(w.type)}・${esc(originText(w))}</p>
  <p class="today-line">${esc(w.taste.line)}</p>
  <ul class="serve-list">${SERVES.map(([k, label]) => `<li><span class="serve-mark">${MARK[w.serve[k]]}</span><span>${esc(label)}</span></li>`).join('')}</ul>
  <p class="note">味の一言と飲み方は編集部の見立てです。</p>
  <p class="today-links"><a class="btn" href="#/whisky/${esc(w.id)}">この銘柄を見る</a>
  <a id="today-again" class="btn btn--ghost" href="#/today?n=${num + 1}">もう一度選ぶ</a></p>
</section>`,
    };
  }
```

ルーターに `if (parts.length === 1 && parts[0] === 'today') return { view: 'today', n: params.get('n') || '' };`、`render()` に `viewToday(r)`、`window.__app` に `todayIndex, todayPick` を足す。

- [ ] **Step 4: 見た目を足す**

```css
/* ===== 今日の1本 ===== */
.today{text-align:center;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:22px 16px}
.today-kicker{margin:0 0 10px;color:var(--amber);font-size:13px;letter-spacing:.1em}
.today-name{margin:12px 0 4px;font-size:24px;word-break:keep-all}
.today-meta{margin:0;color:var(--text-2);font-size:14px}
.today-line{margin:10px 0 0;font-size:16px;word-break:auto-phrase}
.serve-list{list-style:none;display:flex;justify-content:center;gap:14px;margin:14px 0 0;padding:0;flex-wrap:wrap}
.serve-list li{display:flex;align-items:center;gap:4px;font-size:14px}
.serve-mark{color:var(--amber)}
.today-links{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px}
```

- [ ] **Step 5: 診断とMAPから今日の1本へ行けるようにする**

`viewFind` の `find-links` に `<a class="btn btn--ghost" href="#/map">味わいMAPを見る</a><a class="btn btn--ghost" href="#/today">今日の1本を見る</a>` を足し、診断結果の3本を比較できるように `<a class="btn btn--ghost" href="${compareHref(list[0].id, list[1].id)}">上位2本を比べる</a>` を足す（仕様書 §5.4 の導線）。テストを1件足す:

```js
test('診断：結果から比較・MAP・今日の1本へ行ける', async () => {
  const env = await load('#/find?q2=smoky');
  const hrefs = [...env.document.querySelectorAll('#find-result a')].map((a) => a.getAttribute('href'));
  assert.ok(hrefs.some((h) => h.startsWith('#/compare?')));
  assert.ok(hrefs.includes('#/map'));
  assert.ok(hrefs.includes('#/today'));
});
```

- [ ] **Step 6: テストを走らせて、通ることを確かめる**

```bash
node --test site/tests/*.check.mjs
```

- [ ] **Step 7: コミット**

```bash
git add site/app.js site/styles.css site/tests/render.check.mjs
git commit -m "$(cat <<'EOF'
site: 今日の1本を追加し、診断の結果から比較・MAP・今日の1本へつなぐ

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 蒸溜所一覧 `#/distilleries`（地方別）

仕様書 §5.8。一覧は地方別。詳細ページは今の内容を引き継ぎ、その蒸溜所の銘柄を一覧で見る導線を足す。全国MAPと見学情報は作らない。

**Files:**
- Modify: `site/app.js`（`viewDistilleries` / `viewDistillery` の追記 / ルーター）
- Modify: `site/styles.css`
- Modify: `site/tests/render.check.mjs`

**Interfaces:**
- Consumes: Task 3 の `REGIONS` / `regionOf` / `listHref`
- Produces: `function viewDistilleries(r);`

- [ ] **Step 1: テストを書く**

```js
// ===== 蒸溜所一覧 =====
test('蒸溜所一覧：地方ごとにまとまり、全蒸溜所が出る', async () => {
  const env = await load('#/distilleries');
  const cards = [...env.document.querySelectorAll('a.card--dist')];
  assert.equal(cards.length, DATA.distilleries.length);
  const heads = [...env.document.querySelectorAll('.region-head')].map((e) => e.textContent.replace(/\d+か所/, '').trim());
  assert.ok(heads.includes('北海道'));
  assert.ok(heads.includes('九州・沖縄'));
  assert.ok(!heads.includes('四国'), '蒸溜所のない地方は出さない');
  assert.deepEqual(env.errors, []);
});

test('蒸溜所一覧：カードに県・運営会社・代表銘柄が出る', async () => {
  const env = await load('#/distilleries');
  const card = env.document.querySelector('a.card--dist[href="#/distillery/yoichi"]');
  const s = text(card);
  assert.ok(s.includes('北海道'));
  assert.ok(s.includes('ニッカウヰスキー'));
  assert.ok(s.includes('シングルモルト余市'));
});

test('蒸溜所一覧：地方で絞り込める', async () => {
  const env = await load('#/distilleries?region=kinki');
  const cards = [...env.document.querySelectorAll('a.card--dist')];
  const n = DATA.distilleries.filter((d) => ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'].includes(d.pref)).length;
  assert.equal(cards.length, n);
  assert.equal(env.document.querySelector('.region-filters [aria-current="true"]').textContent, '近畿');
});

test('蒸溜所ページ：その蒸溜所の銘柄を一覧で見る導線がある', async () => {
  const env = await load('#/distillery/yamazaki');
  const a = env.document.querySelector('a[href="#/list?distillery=yamazaki"]');
  assert.ok(a, '一覧への導線がある');
});
```

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/render.check.mjs
```

- [ ] **Step 3: 蒸溜所一覧を書く**

```js
  // ===== 画面：蒸溜所一覧 =====
  // 代表銘柄：定番に入っているものを優先し、無ければその蒸溜所の銘柄の1本目
  function flagship(d) {
    const ws = DATA.whiskies.filter((w) => w.components.some((c) => c.distillery === d.id));
    return ws.find((w) => STAPLES.includes(w.id)) || ws.find((w) => w.maker === d.maker) || ws[0] || null;
  }

  function distilleryCardFull(d) {
    const f = flagship(d);
    return `<li><a class="card card--dist" href="#/distillery/${esc(d.id)}"><span class="card-body">
<span class="card-name">${esc(d.name)}</span>
<span class="card-meta">${esc(d.pref)}・${esc(d.maker)}</span>
${f ? `<span class="card-meta">代表銘柄：${esc(f.name)}</span>` : ''}</span></a></li>`;
  }

  function viewDistilleries(r) {
    const chips = [['', 'すべて']].concat(
      REGIONS.filter((x) => DATA.distilleries.some((d) => regionOf(d.pref)?.key === x.key)).map((x) => [x.key, x.label])
    ).map(([k, label]) => {
      const on = (r.region || '') === k;
      return `<a class="opt${on ? ' opt--on' : ''}" href="${k ? `#/distilleries?region=${k}` : '#/distilleries'}"${on ? ' aria-current="true"' : ''}>${esc(label)}</a>`;
    }).join('');

    const groups = REGIONS.map((reg) => {
      const ds = DATA.distilleries.filter((d) => regionOf(d.pref)?.key === reg.key);
      if (!ds.length || (r.region && r.region !== reg.key)) return '';
      return `<section class="region"><div class="sec-head"><h2 class="region-head">${esc(reg.label)}<span class="count">${ds.length}か所</span></h2></div>
<ul class="cards">${ds.map(distilleryCardFull).join('')}</ul></section>`;
    }).join('');

    return {
      title: `蒸溜所から探す｜${SITE}`,
      html: `<section class="hero hero--sm"><h1>蒸溜所から探す</h1><p class="hero-lead">いま掲載しているのは${DATA.distilleries.length}か所です。所在地は各ページの出典で確認しています。</p></section>
<div class="region-filters chips">${chips}</div>
${groups || '<p class="empty">この地方の蒸溜所は、まだ掲載していません。</p>'}`,
    };
  }
```

`viewDistillery`（詳細）の「この蒸溜所の銘柄」の見出しの下に足す:

```js
    `<p><a class="btn btn--ghost" href="#/list?distillery=${esc(d.id)}">この蒸溜所の原酒を使う銘柄を一覧で見る</a></p>`
```

ルーターに `if (parts.length === 1 && parts[0] === 'distilleries') return { view: 'distilleries', region: params.get('region') || '' };` を足し、`render()` に `viewDistilleries(r)` を足す。

- [ ] **Step 4: 見た目を足す**

```css
.region{margin:0 0 26px}
.region-head{display:flex;align-items:baseline;gap:8px}
.region-filters{margin:0 0 18px}
```

- [ ] **Step 5: テストを走らせて、通ることを確かめる**

```bash
node --test site/tests/*.check.mjs
```

- [ ] **Step 6: コミット**

```bash
git add site/app.js site/styles.css site/tests/render.check.mjs
git commit -m "$(cat <<'EOF'
site: 蒸溜所一覧を地方別に作り、蒸溜所ページから銘柄一覧へつなぐ

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: トップを「探すページ」に作り直す

仕様書 §5.1。行き先がすべてそろったので、最後にトップを組み直す。ここで古い作り（`resultsHtml` / `QUADS` / 旧 `tasteMap` / 旧 `bindTop`）を消す。

**Files:**
- Modify: `site/index.html`（ヘッダーの「探す」を `#/list` に）
- Modify: `site/app.js`（`viewTop` / `bindTop` の作り直し、使われなくなった関数の削除）
- Modify: `site/styles.css`
- Modify: `site/tests/render.check.mjs`

**Interfaces:**
- Consumes: Task 3〜9 のすべて（`listHref` / `mapSvg` / `todayIndex` / `todayPick` / `STAPLES` / `REGIONS` / `SCENES` / `TASTE_FILTERS` / `whiskyCard` / `sortList`）
- Produces: 新しい `viewTop(r)` / `bindTop()`

- [ ] **Step 1: トップのテストを書く**

既存のトップのテスト（`トップ：全銘柄がメーカー別にまとまって並び...`、`都道府県から探す...`、`味から探す...`、`トップ：表示基準の説明への入口に5区分が並ぶ`）を削除し、次を足す:

```js
// ===== トップ =====
test('トップ：最初の画面に、探すボタンと診断ボタンと検索窓がある', async () => {
  const env = await load('');
  const d = env.document;
  assert.match(d.querySelector('h1').textContent, /あなたに合う/);
  assert.equal(d.querySelector('.hero a.btn[href="#/list"]').textContent, 'ウイスキーを探す');
  assert.equal(d.querySelector('.hero a.btn[href="#/find"]').textContent, '3問で診断する');
  assert.ok(d.querySelector('.hero input#q'), '検索窓がある');
  assert.deepEqual(env.errors, []);
});

test('トップ：何から探すかの入口が6つある', async () => {
  const env = await load('');
  const hrefs = [...env.document.querySelectorAll('.entries a')].map((a) => a.getAttribute('href'));
  assert.equal(hrefs.length, 6);
  for (const h of ['#/map', '#/find', '#/distilleries']) assert.ok(hrefs.includes(h), h);
  assert.ok(hrefs.some((h) => h.startsWith('#/list?taste=')), '味わいから探す');
  assert.ok(hrefs.some((h) => h.startsWith('#/list?type=')), 'タイプから探す');
  assert.ok(hrefs.some((h) => h.startsWith('#/list?scene=') || h.startsWith('#/list?serve=')), '飲み方・シーンから探す');
});

test('トップ：まずはここからは編集部が選ぶ定番8本', async () => {
  const env = await load('');
  const sec = env.document.querySelector('#staples');
  const hrefs = [...sec.querySelectorAll('a.card')].map((a) => a.getAttribute('href'));
  assert.deepEqual(hrefs, [
    '#/whisky/hibiki-jh', '#/whisky/yamazaki', '#/whisky/hakushu', '#/whisky/chita',
    '#/whisky/yoichi', '#/whisky/miyagikyo', '#/whisky/fuji-single-blended', '#/whisky/kakubin',
  ]);
  assert.match(sec.textContent, /編集部が選ぶ定番/);
  assert.ok(!/人気/.test(sec.textContent), '人気順とは書かない');
});

test('トップ：味わいMAPの簡易版・蒸溜所・今日の1本・新着がある', async () => {
  const env = await load('');
  const d = env.document;
  assert.equal(d.querySelectorAll('#top-map svg .pt').length, DATA.whiskies.length);
  assert.ok(d.querySelector('#top-map a[href="#/map"]'), 'MAPへの導線');
  const regions = [...d.querySelectorAll('#top-regions a')].map((a) => a.getAttribute('href'));
  assert.ok(regions.every((h) => h.startsWith('#/distilleries?region=')));
  assert.ok(d.querySelector('#top-today a[href^="#/whisky/"]'), '今日の1本');
  const news = [...d.querySelectorAll('#top-new a.card')];
  assert.equal(news.length, 6);
});

test('トップ：検索窓に打つと一覧へ移る', async () => {
  const env = await load('');
  const q = env.document.getElementById('q');
  q.value = 'よいち';
  q.dispatchEvent(new env.window.Event('input', { bubbles: true }));
  assert.match(env.window.location.hash, /^#\/list\?q=/);
});
```

- [ ] **Step 2: テストを走らせて、落ちることを確かめる**

```bash
node --test site/tests/render.check.mjs
```

- [ ] **Step 3: トップを書き直す**

`viewTop` / `bindTop` を次に差し替える:

```js
  // ===== 画面：トップ =====
  const ENTRIES = [
    { href: `#/list?taste=fruity`, title: '味わいから', desc: '甘い・フルーティ・爽やか・濃厚・スモーキー' },
    { href: `#/list?type=single-malt`, title: 'タイプから', desc: 'シングルモルト・ブレンデッド・グレーン' },
    { href: `#/list?serve=highball`, title: '飲み方から', desc: 'ハイボール・ロック・ストレート・水割り' },
    { href: `#/list?scene=${encodeURIComponent('初めての1本')}`, title: 'シーンから', desc: '初めての1本・普段飲み・プレゼント' },
    { href: '#/distilleries', title: '蒸溜所から', desc: '北海道から沖縄まで、地方別に見る' },
    { href: '#/find', title: '3問で診断', desc: '普段のお酒・好きな味・場面から探す' },
  ];

  function viewTop() {
    const staples = STAPLES.map((id) => W.get(id)).filter(Boolean);
    const todayW = todayPick(todayIndex());
    const news = sortList(DATA.whiskies, 'new').slice(0, 6);
    const regionCounts = REGIONS
      .map((reg) => ({ reg, n: DATA.distilleries.filter((d) => regionOf(d.pref)?.key === reg.key).length }))
      .filter((x) => x.n > 0);

    return {
      title: `${SITE}｜ジャパニーズウイスキーを1本ずつ`,
      html: `
<section class="hero">
  <h1>あなたに合うジャパニーズウイスキーを見つける。</h1>
  <p class="hero-lead">味わい・タイプ・飲み方・シーンから、あなたにぴったりの1本を探せます。いま${DATA.whiskies.length}銘柄・${DATA.distilleries.length}蒸溜所。</p>
  <p class="hero-btns"><a class="btn" href="#/list">ウイスキーを探す</a><a class="btn btn--ghost" href="#/find">3問で診断する</a></p>
  <label class="search"><span class="visually-hidden">銘柄名・蒸溜所名で検索</span>
    <input id="q" type="search" placeholder="銘柄名・蒸溜所名（例：よいち、yoichi）" autocomplete="off"></label>
</section>

<section class="entries-sec"><h2>何から探しますか？</h2>
  <div class="entries">${ENTRIES.map((e) => `<a class="entry" href="${e.href}"><span class="entry-t">${esc(e.title)}</span><span class="entry-d">${esc(e.desc)}</span></a>`).join('')}</div>
</section>

<section id="staples"><div class="sec-head"><h2>まずはここから</h2><span class="count">編集部が選ぶ定番8本</span></div>
  <ul class="cards">${staples.map((w) => whiskyCard(w)).join('')}</ul>
  <p class="note">売れている順ではなく、はじめの1本に選びやすい銘柄を編集部で選びました。</p>
</section>

<section class="cta"><h2>あなたに合う1本を探してみませんか？</h2>
  <p>普段のお酒・好きな味・飲む場面の3問だけです。</p>
  <p><a class="btn" href="#/find">3問で診断する</a></p>
</section>

<section id="top-map"><div class="sec-head"><h2>味わいMAP</h2><a class="clear" href="#/map">もっと見る</a></div>
  ${mapSvg(DATA.whiskies, { small: true })}
  <p class="note">横は軽やかから濃厚、縦はフルーティからスモーキー。位置はサイト独自の目安です。</p>
</section>

<section id="top-regions"><div class="sec-head"><h2>蒸溜所から探す</h2><a class="clear" href="#/distilleries">すべて見る</a></div>
  <div class="opts">${regionCounts.map(({ reg, n }) => `<a class="opt" href="#/distilleries?region=${reg.key}">${esc(reg.label)}<span class="count">${n}</span></a>`).join('')}</div>
</section>

<section id="top-today"><div class="sec-head"><h2>今日の1本</h2><a class="clear" href="#/today">ページで見る</a></div>
  <ul class="cards">${whiskyCard(todayW, todayW.taste.line)}</ul>
</section>

<section id="top-new"><div class="sec-head"><h2>新しく載せた銘柄</h2></div>
  <ul class="cards">${news.map((w) => whiskyCard(w)).join('')}</ul>
</section>

<section class="std-entry"><div class="sec-head"><h2>ジャパニーズウイスキーの表示基準</h2><a class="clear" href="#/standard">くわしく見る</a></div>
  <div class="opts">${STD_KEYS.map((k) => `<a class="opt" href="#/list?standard=${k}">${esc(DATA.standards[k].label)}</a>`).join('')}</div>
</section>`,
    };
  }

  // トップの検索窓は、打ったらそのまま一覧へ移る
  function bindTop() {
    const q = document.getElementById('q');
    if (!q) return;
    q.addEventListener('input', () => {
      const v = q.value.trim();
      if (v) location.hash = listHref({ q: v });
    });
  }
```

- [ ] **Step 4: 使われなくなった作りを消す**

次の3つはもう呼ばれないので削除する。消したあとに `node --test` を走らせて、参照が残っていないことを確かめる。

- `resultsHtml`（旧トップの検索結果）
- `QUADS` と `quadOf`、旧 `tasteMap`、`styles.css` の `.tmap` から `.tmap-frame` までの旧地図のCSS（新しい `.wmap` に置き換わった）
- `viewTop` が使っていた `byPref` の組み立て（新しい `viewTop` に無い）

`index.html` のヘッダーを直す:

```html
    <a class="header-search" href="#/list">探す</a>
```

- [ ] **Step 5: 見た目を足す**

```css
/* ===== トップ ===== */
.hero-btns{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 14px}
.entries-sec{margin:26px 0}
.entries{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.entry{display:flex;flex-direction:column;gap:4px;min-height:84px;padding:12px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);color:var(--text);text-decoration:none}
.entry-t{font-weight:700}
.entry-d{font-size:12px;color:var(--text-2);word-break:auto-phrase}
.cta{margin:26px 0;padding:18px 16px;border-radius:var(--radius);background:var(--surface-2);text-align:center}
.cta h2{margin:0 0 6px;word-break:auto-phrase}
#top-map .wmap{max-width:320px}
```

- [ ] **Step 6: テストを走らせて、通ることを確かめる**

```bash
node --test site/tests/*.check.mjs
```

- [ ] **Step 7: コミット**

```bash
git add site/index.html site/app.js site/styles.css site/tests/render.check.mjs
git commit -m "$(cat <<'EOF'
site: トップを探すページに作り直し、使われなくなった旧トップの作りを削除

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: 通しで確認して公開する

**Files:**
- Modify: `site/tests/shots.sh`（新しい画面を撮る）
- Modify: `README.md`（画面一覧）
- Modify: `site/SOURCES.md`（見立ての手直しの記録があれば）

- [ ] **Step 1: スクリーンショットの対象に新しい画面を足す**

`site/tests/shots.sh` の撮影するURLの並びを、次の9つにする:

```
'' '#/list' '#/list?taste=smoky' '#/whisky/hibiki-jh' '#/find?q1=none&q2=fresh' '#/compare?a=yamazaki&b=hakushu' '#/map' '#/today?n=3' '#/distilleries'
```

- [ ] **Step 2: スマホ幅で全画面を見る**

```bash
bash site/tests/shots.sh
```

9画面×4サイズを開いて、次を確認する:

- 375pxで横スクロールが出ていない
- 日本語が語の途中で折れていない（銘柄名・チップ・見出し）
- 押せるものが小さすぎない（絞り込みのselect・チップ・ボタン）
- 5段階の棒・比較の3列・MAPの点が潰れていない

崩れがあれば `styles.css` を直し、直したら **この Step をやり直す**。

- [ ] **Step 3: 文言と決まりごとの最終確認**

```bash
node --test site/tests/*.check.mjs
grep -n '[—―]' site/*.html site/*.css site/*.js | head
grep -n '円（税' site/*.html site/*.js | head
grep -rn 'serif' site/styles.css | head
```

期待: テスト全件成功、長いダッシュ0件、価格表記0件、serif は `sans-serif` の指定以外に出てこない。

- [ ] **Step 4: 実際のブラウザで通して触る**

`site/index.html` をブラウザで開き、次の順に動かして、コンソールにエラーが出ないことを確認する:

トップ → ウイスキーを探す → 絞り込み（味わい＝スモーキー）→ 銘柄ページ → 次の1本 → 関連する比較 → 比較の銘柄を選び替え → 味わいMAP → 点をタップ → 3問で診断 → 上位2本を比べる → 今日の1本 → もう一度選ぶ → 蒸溜所から探す → 地方で絞る → 蒸溜所ページ → その蒸溜所の銘柄を一覧で見る → ブラウザの戻る

- [ ] **Step 5: README を更新する**

`README.md` の画面一覧を、仕様書 §6 のルート表に合わせて書き直す（URLと画面名だけの表）。

- [ ] **Step 6: 最後のコミットと公開**

```bash
git add site/tests/shots.sh README.md site/SOURCES.md
git commit -m "$(cat <<'EOF'
docs: 新しい画面に合わせてREADMEとスクリーンショットの対象を更新

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
git log --oneline origin/main..HEAD
git push origin main
```

- [ ] **Step 7: 公開を確かめる**

```bash
gh run list --limit 3 2>/dev/null || echo 'gh は ota-sanpot でログインしていないので、ブラウザで Actions を見る'
curl -s https://ota-sanpot.github.io/whisky-site/ | head -20
curl -s https://ota-sanpot.github.io/whisky-site/data.js | head -c 80
curl -s -o /dev/null -w '%{http_code}\n' https://ota-sanpot.github.io/whisky-site/app.js
```

期待: トップのHTMLが返り、`data.js` が `window.WDATA = {` で始まり、`app.js` が 200。ブラウザで `https://ota-sanpot.github.io/whisky-site/#/list` と `#/find` と `#/map` を開いて動くことを確認する。

- [ ] **Step 8: CEO に報告する**

変わったこと（画面が増えたこと・味わい5段階が見立てであること・価格は載せないままであること）と、公開URLを伝える。

---

## 仕様書との対応

| 仕様書 | 実装するタスク |
|--------|----------------|
| §3 ファイル構成・公開の仕組み | Task 1 |
| §4.2 5段階・余韻・シーン・掲載日 | Task 2 |
| §4.3 地方の区分 | Task 3（`REGIONS`） |
| §5.1 トップ | Task 10 |
| §5.2 銘柄一覧 | Task 3 |
| §5.3 銘柄詳細 | Task 4（§5.3-9 の関連する比較は Task 6） |
| §5.4 診断 | Task 5（結果の導線は Task 6・8） |
| §5.5 比較 | Task 6 |
| §5.6 味わいMAP | Task 7 |
| §5.7 今日の1本 | Task 8 |
| §5.8 蒸溜所 | Task 9 |
| §5.9 表示基準 | 変更なし（既存のまま。トップからの入口は Task 10） |
| §6 ルーティング | Task 3（`#/list`・旧URL）、Task 5〜9（各画面） |
| §7 事実と見立ての線引き | 全タスク（Global Constraints） |
| §8 モバイルの決まり | 各タスクの見た目のStep＋Task 11 |
| §9 テスト | 各タスクのテストのStep＋Task 11 |
| §10 今回やらないこと | どのタスクでも作らない |

**進め方（§11）との違い:** 仕様書は「一覧・トップ → 詳細 → 診断 → 比較・MAP・今日 → 蒸溜所」の順だが、トップは行き先がそろっていないと作れないので、トップだけ最後（Task 10）に回した。やることの中身は同じ。
