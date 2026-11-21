// ウイスキークイズのデータと画面のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, readData } from './helpers.mjs';

const DATA = readData();
const QZ = DATA.quiz;

test('クイズ：7レベルあり、固定問題の数がそろっていて、問題の id は重複しない', () => {
  assert.deepEqual(QZ.levels.map((l) => l.key), ['basic', 'making', 'jp1', 'jp2', 'brands', 'map', 'world']);
  for (const l of QZ.levels) {
    if (l.auto) continue;
    const n = QZ.questions.filter((q) => q.level === l.key).length;
    if (l.count) assert.ok(n >= l.count, `${l.key}: 毎回出す数より多い`);
    else assert.equal(n, 10, l.key);
  }
  assert.ok(QZ.questions.filter((q) => q.level === 'making').length >= 30, 'つくり方は30問以上');
  assert.equal(new Set(QZ.questions.map((q) => q.id)).size, QZ.questions.length);
});

test('クイズ：全問が4択で、正解・解説・関連ページ・出典がある', () => {
  for (const q of QZ.questions) {
    assert.equal(q.choices.length, 4, q.id);
    assert.equal(new Set(q.choices).size, 4, `${q.id}: 選択肢の重複`);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, `${q.id}: answer`);
    assert.ok(q.q && q.explain, q.id);
    assert.match(q.link, /^#\//, `${q.id}: link`);
    assert.ok(q.sources.length >= 1, `${q.id}: 出典`);
    for (const s of q.sources) assert.match(s.url, /^https:\/\//, `${q.id}: 出典URL`);
  }
});

test('クイズ：正解の位置が偏っていない', () => {
  for (let i = 0; i < 4; i++) assert.ok(QZ.questions.filter((q) => q.answer === i).length >= 5, `位置${i}`);
});

test('クイズ：入口に全レベル、トップと基礎ページから導線がある', async () => {
  const env = await load('#/quiz');
  const hrefs = [...env.document.querySelectorAll('.qz-level')].map((a) => a.getAttribute('href'));
  assert.deepEqual(hrefs, QZ.levels.map((l) => `#/quiz/${l.key}`));
  assert.deepEqual(env.errors, []);
  const top = await load('');
  assert.ok(top.document.querySelector('#top-basics a[href="#/quiz"]'));
  const basics = await load('#/basics');
  assert.ok(basics.document.querySelector('a[href="#/quiz/basic"]'));
});

test('クイズ：答えると正誤と解説が出て、全問で結果が出る', async () => {
  const env = await load('#/quiz/basic');
  const d = env.document;
  const qs = [...d.querySelectorAll('.qz-q')];
  assert.equal(qs.length, 10);
  assert.ok(d.querySelector('#qz-result').hidden);
  qs.forEach((li, i) => {
    const ans = Number(li.dataset.answer);
    const pick = i < 7 ? ans : (ans + 1) % 4; // 7問正解・3問不正解
    li.querySelectorAll('.qz-choice')[pick].click();
    assert.equal(li.querySelector('.qz-explain').hidden, false);
    // 2回目は数えない
    li.querySelectorAll('.qz-choice')[ans].click();
  });
  assert.equal(d.querySelectorAll('.qz-q--ok').length, 7);
  assert.equal(d.querySelectorAll('.qz-q--ng').length, 3);
  assert.match(d.querySelector('.qz-q--ng .qz-judge').textContent, /不正解（正解は「/);
  assert.equal(d.querySelector('#qz-result').hidden, false);
  assert.equal(d.querySelector('#qz-correct').textContent, '7');
  assert.ok(d.querySelector('#qz-result a[href="#/quiz/making"]'), '次のレベルへ');
  assert.deepEqual(env.errors, []);
});

test('クイズ：もう一度挑戦すると最初からになる', async () => {
  const env = await load('#/quiz/world');
  const d = env.document;
  for (const li of d.querySelectorAll('.qz-q')) li.querySelector('.qz-choice').click();
  d.querySelector('#qz-retry').click();
  assert.equal(d.querySelectorAll('.qz-q--ok, .qz-q--ng').length, 0);
  assert.ok(d.querySelector('#qz-result').hidden);
  assert.ok(!d.querySelector('#qz-result a[href^="#/quiz/"]:not(#qz-retry)'), '最後のレベルは次がない');
});

test('クイズ：存在しないレベルは見つからない画面', async () => {
  const env = await load('#/quiz/nope');
  assert.ok(!env.document.querySelector('.qz-q'));
});

// 表示中の問題の正解の文字
const shown = (li) => {
  const cs = [...li.querySelectorAll('.qz-choice')].map((b) => b.textContent);
  return { q: li.querySelector('.qz-text').textContent, cs, ans: cs[Number(li.dataset.answer)], link: li.querySelector('.qz-more a').getAttribute('href') };
};

test('クイズ：ランダムのレベルも毎回10問、4択がすべて違い、出典がある', async () => {
  for (const key of ['making', 'brands', 'map', 'world']) {
    for (let t = 0; t < 5; t++) {
      const env = await load(`#/quiz/${key}`);
      const lis = [...env.document.querySelectorAll('.qz-q')];
      assert.equal(lis.length, 10, key);
      assert.equal(new Set(lis.map((li) => li.querySelector('.qz-text').textContent)).size, 10, `${key}: 同じ問題が2回出ない`);
      for (const li of lis) {
        const x = shown(li);
        assert.equal(new Set(x.cs).size, 4, `${key}: ${x.q}`);
        assert.ok(x.ans, `${key}: 正解がある`);
        assert.ok(li.querySelector('.qz-src a[href^="https://"]'), `${key}: 出典 ${x.q}`);
      }
      assert.deepEqual(env.errors, []);
    }
  }
});

test('クイズ：銘柄の問題の正解は、掲載データと一致する', async () => {
  const W = new Map(DATA.whiskies.map((w) => [w.id, w]));
  const Dm = new Map(DATA.distilleries.map((d) => [d.id, d]));
  for (let t = 0; t < 15; t++) {
    const env = await load('#/quiz/brands');
    for (const li of env.document.querySelectorAll('.qz-q')) {
      const x = shown(li);
      const name = x.q.match(/「(.+)」/)[1];
      const w = DATA.whiskies.find((v) => v.name === name);
      assert.ok(w && !w.unverified, `掲載の裏取り済み銘柄: ${name}`);
      if (/つくっているのは/.test(x.q)) assert.equal(x.ans, w.maker, name);
      if (/度数/.test(x.q)) assert.ok((w.specs.find((s) => s.k === 'アルコール度数').v).startsWith(x.ans), name);
      if (/蒸溜所があるのは/.test(x.q)) assert.equal(x.ans, Dm.get(x.link.split('/').pop()).pref, name);
      assert.ok(W.has(w.id));
    }
  }
});

test('クイズ：蒸溜所の問題の正解は掲載データと一致し、名前に県名が入るものは県を聞かない', async () => {
  for (let t = 0; t < 15; t++) {
    const env = await load('#/quiz/map');
    for (const li of env.document.querySelectorAll('.qz-q')) {
      const x = shown(li);
      const d = DATA.distilleries.find((v) => v.id === x.link.split('/').pop());
      if (/があるのは/.test(x.q)) {
        assert.equal(x.ans, d.pref, d.name);
        assert.ok(!d.name.includes(d.pref.replace(/[都府県]$/, '')), `答えが名前に出ている: ${d.name}`);
      } else assert.equal(x.ans, d.maker, d.name);
    }
  }
});
