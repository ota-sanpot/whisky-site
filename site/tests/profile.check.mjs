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

test('どのシーンにも当てはまらない銘柄は、バーで飲みたいに入る', () => {
  const none = { type: 'ブレンデッド', serve: { highball: 1, mizuwari: 1 }, maker: 'ニッカウヰスキー', specs: [] };
  assert.deepEqual(scenesOf(none, { drinkability: 2, smokiness: 3 }), ['バーで飲みたい']);
});

test('enrich は元のデータを壊さず、全銘柄に項目を足す', () => {
  const out = enrich(DATA);
  assert.equal(out.whiskies.length, DATA.whiskies.length);
  assert.equal(out.whiskies[0].name, DATA.whiskies[0].name);
  for (const w of out.whiskies) {
    assert.ok(w.profile && w.finish && w.scenes && w.addedAt, w.id);
  }
});
