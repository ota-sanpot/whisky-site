// データの整合性テスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { html, css, allSource, readData, HTML_PATH } from './helpers.mjs';

const data = readData();
const distilleryIds = new Set(data.distilleries.map((d) => d.id));
const whiskyIds = new Set(data.whiskies.map((w) => w.id));
const STANDARDS = ['jw', 'foreign', 'spirits', 'other', 'unknown'];

test('id が重複していない', () => {
  assert.equal(whiskyIds.size, data.whiskies.length, '銘柄 id の重複');
  assert.equal(distilleryIds.size, data.distilleries.length, '蒸溜所 id の重複');
});

test('最初の見本3本と山崎蒸溜所が残っている', () => {
  for (const id of ['hibiki-jh', 'yoichi', 'ao']) assert.ok(whiskyIds.has(id), id);
  assert.ok(distilleryIds.has('yamazaki'));
});

test('表示基準の区分は5つ', () => {
  assert.deepEqual(Object.keys(data.standards), STANDARDS);
  for (const k of STANDARDS) assert.ok(data.standards[k].label && data.standards[k].desc, k);
});

test('全銘柄に最初の一画面の項目がある', () => {
  for (const w of data.whiskies) {
    for (const k of ['name', 'short', 'kana', 'maker', 'type', 'standardNote']) assert.ok(w[k], `${w.id}: ${k}`);
    assert.ok(STANDARDS.includes(w.standard), `${w.id}: standard`);
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
    for (const n of w.next || []) assert.ok(n.id === null || whiskyIds.has(n.id), `${w.id}: next → ${n.id}`);
    if (w.limited !== undefined) assert.ok(typeof w.limited === 'string' && w.limited, `${w.id}: limited`);
  }
});

test('任意の項目は、あるなら中身が空でない', () => {
  for (const w of data.whiskies) {
    for (const k of ['story', 'official', 'specs']) {
      if (w[k] !== undefined) assert.ok(Array.isArray(w[k]) && w[k].length >= 1, `${w.id}: ${k}`);
    }
    for (const o of w.official || []) assert.ok(o.k && o.v, `${w.id}: official`);
  }
});

test('事実には出典が付いている（全銘柄・全蒸溜所）', () => {
  for (const item of [...data.whiskies, ...data.distilleries, data.standardRule]) {
    assert.ok(item.sources && item.sources.length >= 1, `${item.id ?? 'standardRule'}: sources`);
    for (const s of item.sources) {
      assert.match(s.url, /^https:\/\//, `${item.id ?? 'standardRule'}: url`);
      assert.ok(s.title && s.used, `${item.id ?? 'standardRule'}: title/used`);
    }
  }
  assert.match(data.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
});

test('全蒸溜所に県と運営会社がある', () => {
  for (const d of data.distilleries) {
    for (const k of ['name', 'kana', 'maker', 'pref']) assert.ok(d[k], `${d.id}: ${k}`);
  }
});

test('区分の違う見本がある', () => {
  const byId = Object.fromEntries(data.whiskies.map((w) => [w.id, w]));
  assert.equal(byId['hibiki-jh'].standard, 'jw');
  assert.equal(byId.ao.standard, 'foreign');
  assert.equal(byId.yoichi.components.length, 1);
  assert.equal(byId.white.standard, 'spirits');
  assert.equal(byId.date.limited, '宮城県限定');
  assert.equal(byId['kujira-5'].standard, 'other');
});

test('クラフト蒸溜所の銘柄も入っている', () => {
  for (const id of ['amahagan-basic', 'sakurao', 'togouchi', 'kanosuke-single-malt', 'kanosuke-double', 'shizuoka-pot-still-w', 'saburomaru-8', 'yamazakura-black', 'yuza-2026', 'kuju-green-dram', 'kujira-5']) {
    assert.ok(whiskyIds.has(id), id);
  }
  assert.ok(data.whiskies.length >= 90, `銘柄数 ${data.whiskies.length}`);
});

test('価格は載せない', () => {
  for (const w of data.whiskies) {
    for (const s of w.specs || []) assert.ok(!/価格/.test(s.k), `${w.id}: ${s.k}`);
  }
  assert.ok(!/円（税別）|円（税込）/.test(allSource()), '価格の表記が残っている');
});

test('長いダッシュを使っていない', () => {
  assert.ok(!/[—―]/.test(allSource()), '長いダッシュが入っている');
});

test('公開用の文言：モック・仮称の表記が残っていない', () => {
  assert.ok(!/モック|仮称|（仮）/.test(allSource()), 'モック・仮称の表記が残っている');
});

test('旧サイトの URL は新しいトップへ転送する（404.html）', () => {
  const p = join(dirname(HTML_PATH), '404.html');
  assert.ok(existsSync(p), '404.html がない');
  const s = readFileSync(p, 'utf8');
  assert.match(s, /http-equiv="refresh" content="0; url=\/whisky-site\/"/);
  assert.match(s, /location\.replace\('\/whisky-site\/'\)/);
});

test('アイコンがある', () => {
  const dir = dirname(HTML_PATH);
  for (const f of ['favicon.svg', 'apple-touch-icon.png']) assert.ok(existsSync(join(dir, f)), f);
  assert.match(html(), /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/);
  assert.match(html(), /<link rel="apple-touch-icon" href="apple-touch-icon\.png">/);
});

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

test('押せるリンクの高さが44px以上になっている', () => {
  const s = css();
  const rule = s.match(/\.clear\{[^}]*\}/);
  assert.ok(rule, '.clear の指定が見つからない');
  assert.match(rule[0], /min-height:44px/);
});
