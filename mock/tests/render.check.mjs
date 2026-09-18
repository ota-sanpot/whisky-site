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
