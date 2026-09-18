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
