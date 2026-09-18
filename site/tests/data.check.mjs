// データの整合性テスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { html, readData, HTML_PATH } from './helpers.mjs';

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

test('余市は公式ページで確認した区分と参考小売価格', () => {
  const y = data.whiskies.find((w) => w.id === 'yoichi');
  assert.equal(y.standard, 'jw');
  assert.deepEqual(y.specs.find((s) => /小売価格/.test(s.k)), { k: '参考小売価格', v: '7,000円（税別）' });
  assert.ok(y.makerServe && y.makerServe.text, 'makerServe');
});

test('公開用の文言：モック・仮称の表記が残っていない', () => {
  assert.ok(!/モック|仮称|（仮）/.test(html()), 'モック・仮称の表記が残っている');
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
