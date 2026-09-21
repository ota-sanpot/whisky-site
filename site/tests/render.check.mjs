// 画面描画・検索・画面遷移のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, go, readData } from './helpers.mjs';

const DATA = readData();
const text = (el) => el.textContent.replace(/\s+/g, '');
const hrefs = (els) => [...els].map((a) => a.getAttribute('href'));

// ===== トップ・検索 =====

test('トップ：全銘柄がメーカー別にまとまって並び、エラーが出ない', () => {
  const env = load('');
  const d = env.document;
  assert.equal(d.querySelectorAll('#results a.card[href^="#/whisky/"]').length, DATA.whiskies.length);
  const makers = [...new Set(DATA.whiskies.map((w) => w.maker))];
  const groups = [...d.querySelectorAll('#results details.maker-group')];
  assert.equal(groups.length, makers.length);
  for (const g of groups) {
    const name = g.querySelector('.maker-name').textContent;
    const n = DATA.whiskies.filter((w) => w.maker === name).length;
    assert.equal(g.querySelectorAll('a.card').length, n, name);
    assert.match(g.querySelector('.maker-count').textContent, new RegExp(`${n}本`));
  }
  assert.equal(d.getElementById('checked-at').textContent, '2026年9月18日');
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
  const ids = [...found.filter((r) => r.kind === 'whisky').map((r) => r.item.id)];
  for (const id of ['yamazaki', 'yamazaki-12', 'hibiki-jh', 'ao', 'kakubin']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('yoichi'));
});

test('検索：URL の q で結果が出る（蒸溜所が先頭）', () => {
  const env = load('#/?q=%E3%82%88%E3%81%84%E3%81%A1');
  assert.equal(env.document.getElementById('q').value, 'よいち');
  const links = hrefs(env.document.querySelectorAll('#results a.card'));
  assert.equal(links[0], '#/distillery/yoichi');
  assert.ok(links.includes('#/whisky/yoichi'));
  assert.ok(links.includes('#/whisky/yoichi-10'));
});

test('検索：入力するとその場で結果と URL が変わる', () => {
  const env = load('');
  const input = env.document.getElementById('q');
  input.value = 'あお';
  input.dispatchEvent(new env.window.Event('input'));
  assert.ok(hrefs(env.document.querySelectorAll('#results a.card')).includes('#/whisky/ao'));
  assert.equal(env.window.location.hash, '#/?q=%E3%81%82%E3%81%8A');
});

test('検索：見つからない時は読みでの検索を案内する', () => {
  const env = load('#/?q=zzz');
  assert.match(env.document.querySelector('#results .empty').textContent, /ひらがな/);
  assert.equal(env.document.querySelectorAll('#results a.card').length, 0);
});

test('都道府県から探す：北から順に並び、全蒸溜所がリンク', () => {
  const env = load('');
  const prefs = [...env.document.querySelectorAll('#by-pref .pref-name')].map((p) => p.textContent);
  assert.equal(prefs[0], '北海道');
  assert.equal(new Set(prefs).size, prefs.length);
  const links = hrefs(env.document.querySelectorAll('#by-pref a'));
  assert.equal(links.length, DATA.distilleries.length);
});

test('味から探す：4つの入口があり、象限で絞り込める', () => {
  const env = load('#/?taste=smoky-rich');
  assert.equal(env.document.querySelectorAll('#by-taste a.quad').length, 4);
  assert.ok(env.document.querySelector('#by-taste a.quad[aria-current="true"][href="#/?taste=smoky-rich"]'));
  const ids = hrefs(env.document.querySelectorAll('#results a.card')).map((h) => h.replace('#/whisky/', ''));
  assert.ok(ids.includes('yoichi'));
  for (const id of ids) {
    const t = DATA.whiskies.find((w) => w.id === id).taste;
    assert.ok(t.x >= 0 && t.y >= 0, id);
  }
});

test('トップ：表示基準の説明への入口に5区分が並ぶ', () => {
  const env = load('');
  const card = env.document.querySelector('a.std-card[href="#/standard"]');
  assert.ok(card);
  assert.equal(card.querySelectorAll('.badge').length, 5);
});

test('知らない URL は見つからない表示', () => {
  const env = load('#/nope');
  assert.equal(text(env.document.querySelector('h1')), 'ページが見つかりません');
  assert.match(env.document.title, /^ページが見つかりません｜/);
});

test('サイト名は Japanese Whisky Guide', () => {
  const env = load('');
  assert.equal(env.document.querySelector('.brand-name').textContent, 'Japanese Whisky Guide');
  assert.equal(env.document.title, 'Japanese Whisky Guide');
  assert.equal(env.document.querySelector('.brand-tag'), null);
});

// ===== 銘柄ページ =====

test('銘柄ページ：響の最初の一画面', () => {
  const env = load('#/whisky/hibiki-jh');
  const d = env.document;
  assert.equal(d.querySelector('h1').textContent, '響 JAPANESE HARMONY');
  assert.equal(d.querySelector('.w-head .badge').textContent, 'ジャパニーズウイスキー');
  assert.equal(d.querySelector('.w-head .badge').getAttribute('href'), '#/standard');
  const chips = [...d.querySelectorAll('.w-origin .chip')].map(text);
  assert.deepEqual(chips, ['大阪府山崎モルト', '山梨県白州モルト', '愛知県知多グレーン']);
  assert.equal(d.querySelectorAll('.w-origin a.chip').length, 3);
  assert.match(d.querySelector('.w-line').textContent, /華やか/);
  assert.ok(d.querySelector('.w-taste svg circle.dot--focus'));
  assert.equal(d.querySelectorAll('.w-serve .serve-item').length, 4);
  assert.deepEqual(hrefs(d.querySelectorAll('.w-next a.next')), ['#/whisky/yamazaki', '#/whisky/hakushu', '#/whisky/ao']);
  assert.equal(d.title, '響 JAPANESE HARMONY｜Japanese Whisky Guide');
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

test('銘柄ページ：余市は1蒸溜所のシングルモルト、蒸溜所へリンク', () => {
  const env = load('#/whisky/yoichi');
  const d = env.document;
  assert.equal(d.querySelector('.w-origin h2').firstChild.textContent, '産地・蒸溜所');
  assert.deepEqual([...d.querySelectorAll('.w-origin .chip')].map(text), ['北海道余市モルト']);
  assert.deepEqual(hrefs(d.querySelectorAll('.w-origin a.chip')), ['#/distillery/yoichi']);
  assert.equal(d.querySelector('.w-origin .origin-note'), null);
});

test('銘柄ページ：スピリッツを含む区分', () => {
  const b = load('#/whisky/white').document.querySelector('.w-head .badge');
  assert.equal(b.textContent, 'スピリッツを含む');
  assert.ok(b.classList.contains('badge--spirits'));
});

test('銘柄ページ：チップの蒸溜所名と原酒の種類は短く出る', () => {
  const t1 = [...load('#/whisky/sunshine').document.querySelectorAll('.w-origin .chip')].map(text);
  assert.equal(t1[0], '富山県三郎丸モルト');
  const t2 = [...load('#/whisky/kujira-5').document.querySelectorAll('.w-origin .chip')].map(text);
  assert.deepEqual(t2, ['沖縄県まさひろ酒造米']);
});

test('銘柄ページ：米だけでつくる銘柄は表示基準の対象外', () => {
  const b = load('#/whisky/kujira-5').document.querySelector('.w-head .badge');
  assert.equal(b.textContent, '表示基準の対象外');
  assert.ok(b.classList.contains('badge--other'));
});

test('銘柄ページ：限定品には限定の表示が出る', () => {
  const d = load('#/whisky/date').document;
  assert.equal(d.querySelector('.w-head .limited').textContent, '宮城県限定');
  assert.ok(load('').document.querySelector('a.card[href="#/whisky/date"] .limited'));
  assert.equal(load('#/whisky/hibiki-jh').document.querySelector('.w-head .limited'), null);
});

test('銘柄ページ：次の1本の手書きがない銘柄は、味の地図の近い銘柄を2本出す', () => {
  const w = DATA.whiskies.find((x) => !x.next);
  const d = load(`#/whisky/${w.id}`).document;
  const cards = d.querySelectorAll('.w-next a.next');
  assert.equal(cards.length, 2);
  for (const c of cards) {
    assert.notEqual(c.getAttribute('href'), `#/whisky/${w.id}`);
    assert.match(c.querySelector('.next-why').textContent, /味の地図/);
  }
});

test('銘柄ページ：丁寧に知る部分と出典', () => {
  for (const w of DATA.whiskies) {
    const d = load(`#/whisky/${w.id}`).document;
    assert.ok(d.getElementById('casks'), `${w.id}: #casks`);
    assert.equal(d.querySelectorAll('#casks .flow-item').length, w.components.length, `${w.id}: flow`);
    assert.equal(d.querySelectorAll('#official dt').length, (w.official || []).length, `${w.id}: official`);
    assert.equal(d.querySelectorAll('#story p').length, (w.story || []).length, `${w.id}: story`);
    assert.equal(d.querySelectorAll('#specs dt').length, (w.specs || []).length + 1, `${w.id}: specs＋表示基準`);
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

test('銘柄ページ：味の一言は読点ごとの句に分けて、句の途中で改行しない', () => {
  const env = load('#/whisky/yoichi');
  const phrases = [...env.document.querySelectorAll('.w-line .ph')].map((s) => s.textContent);
  assert.deepEqual(phrases, ['スモーキーで香ばしい、', 'どっしり力強い']);
});

test('銘柄ページ：メーカーのおすすめがある銘柄だけ、見立てとは別に出す', () => {
  const yoichi = load('#/whisky/yoichi').document.querySelector('.w-serve .maker-serve');
  assert.ok(yoichi);
  assert.match(yoichi.textContent, /^メーカーのおすすめ/);
  assert.equal(load('#/whisky/ao').document.querySelector('.w-serve .maker-serve'), null);
});

// ===== 蒸溜所・表示基準 =====

test('蒸溜所ページ：山崎（シングルモルトと、原酒が使われている銘柄）', () => {
  const env = load('#/distillery/yamazaki');
  const d = env.document;
  assert.equal(d.querySelector('h1').textContent, '山崎蒸溜所');
  assert.match(d.querySelector('.d-meta').textContent, /大阪府三島郡島本町山崎5-2-1/);
  assert.match(d.querySelector('.d-meta').textContent, /1923年/);
  assert.equal(d.querySelectorAll('#features dt').length, 4);
  const single = hrefs(d.querySelectorAll('#single a.card'));
  for (const id of ['yamazaki', 'yamazaki-12', 'yamazaki-18']) assert.ok(single.includes(`#/whisky/${id}`), id);
  const used = hrefs(d.querySelectorAll('#used a.card'));
  for (const id of ['hibiki-jh', 'ao', 'kakubin']) assert.ok(used.includes(`#/whisky/${id}`), id);
  assert.ok(!used.includes('#/whisky/yamazaki'));
  assert.equal(d.querySelectorAll('#sources a').length, DATA.distilleries.find((x) => x.id === 'yamazaki').sources.length);
  assert.equal(d.title, '山崎蒸溜所｜Japanese Whisky Guide');
  assert.deepEqual(env.errors, []);
});

test('蒸溜所ページ：全蒸溜所にページがある', () => {
  for (const dist of DATA.distilleries) {
    const d = load(`#/distillery/${dist.id}`).document;
    assert.equal(d.querySelector('h1').textContent, dist.name, dist.id);
    assert.ok(d.querySelectorAll('#sources a').length >= 1, dist.id);
  }
});

test('蒸溜所ページ：存在しない id は見つからない表示', () => {
  const env = load('#/distillery/nope');
  assert.equal(text(env.document.querySelector('h1')), 'ページが見つかりません');
});

test('銘柄と蒸溜所を行き来できる', () => {
  const env = load('#/whisky/hibiki-jh');
  go(env, env.document.querySelector('.w-origin a.chip').getAttribute('href'));
  assert.equal(env.document.querySelector('h1').textContent, '山崎蒸溜所');
  go(env, env.document.querySelector('#used a.card[href="#/whisky/hibiki-jh"]').getAttribute('href'));
  assert.equal(env.document.querySelector('h1').textContent, '響 JAPANESE HARMONY');
  assert.deepEqual(env.errors, []);
});

test('表示基準ページ：要件5つと5区分と出典', () => {
  const d = load('#/standard').document;
  assert.match(d.querySelector('h1').textContent, /ジャパニーズウイスキー/);
  assert.deepEqual([...d.querySelectorAll('.std-items dt')].map((x) => x.textContent), ['原材料', '造り', '熟成', '瓶詰め', 'その他']);
  assert.deepEqual([...d.querySelectorAll('#kinds .badge')].map((x) => x.textContent), ['ジャパニーズウイスキー', '海外原酒を含む', 'スピリッツを含む', '表示基準の対象外', '区分 未確認']);
  assert.equal(d.querySelectorAll('#sources a').length, 2);
});

test('銘柄ページのバッジから表示基準ページへ行ける', () => {
  const env = load('#/whisky/ao');
  go(env, env.document.querySelector('.w-head .badge').getAttribute('href'));
  assert.match(env.document.querySelector('h1').textContent, /名乗れる条件/);
});

// ===== 好みから探す =====

test('好みから探す：3つの質問があり、選ぶ前は案内を出す', () => {
  const env = load('#/find');
  const d = env.document;
  assert.equal(d.querySelectorAll('#find-form .find-q').length, 3);
  assert.deepEqual([...d.querySelectorAll('#find-form .find-q > .label')].map((e) => e.firstChild.textContent), ['どう飲む？', 'どんな香り？', '濃さは？']);
  assert.ok(d.querySelector('#find-result .find-hint'));
  assert.equal(d.querySelectorAll('#find-result a.card').length, 0);
  assert.match(d.title, /^好みから探す｜/);
  assert.deepEqual(env.errors, []);
});

test('好みから探す：選ぶと合う順に3本出る', () => {
  const d = load('#/find?serve=highball&flavor=smoky&body=rich').document;
  const cards = d.querySelectorAll('#find-result a.card');
  assert.equal(cards.length, 3);
  const ids = hrefs(cards).map((h) => h.replace('#/whisky/', ''));
  for (const id of ids) {
    const w = DATA.whiskies.find((x) => x.id === id);
    assert.equal(w.serve.highball, 3, `${id}: ハイボールが◎でない`);
    assert.ok(w.taste.x > 0 && w.taste.y > 0, `${id}: スモーキー×濃厚でない`);
  }
});

test('好みから探す：1つだけ選んでも結果が出る', () => {
  const d = load('#/find?serve=straight').document;
  const cards = d.querySelectorAll('#find-result a.card');
  assert.equal(cards.length, 3);
  for (const h of hrefs(cards)) {
    const w = DATA.whiskies.find((x) => x.id === h.replace('#/whisky/', ''));
    assert.notEqual(w.serve.straight, 1, `${w.id}: ストレートが△なのに上位`);
  }
});

test('好みから探す：結果には合う理由と見立ての表示がある', () => {
  const d = load('#/find?serve=highball&flavor=floral&body=light').document;
  const why = [...d.querySelectorAll('#find-result .card-why')].map((e) => e.textContent);
  assert.equal(why.length, 3);
  assert.match(why[0], /ハイボール/);
  assert.equal(d.querySelector('#find-result .opinion').textContent, '編集部の見立て');
});

test('好みから探す：選ぶと URL に残り、選んだものに印が付く', () => {
  const env = load('#/find');
  // 選ぶ前は、どの質問も「こだわらない」が選ばれている
  assert.deepEqual([...env.document.querySelectorAll('.find-opt[aria-current="true"]')].map((e) => e.textContent), ['こだわらない', 'こだわらない', 'こだわらない']);
  go(env, env.document.querySelector('.find-opt[href*="serve=rock"]').getAttribute('href'));
  assert.equal(env.window.location.hash, '#/find?serve=rock');
  const sel = [...env.document.querySelectorAll('.find-opt[aria-current="true"]')].map((e) => e.textContent);
  assert.equal(sel.length, 3, '質問ごとに1つずつ選ばれている');
  assert.equal(sel[0], 'ロック');
  // ほかの質問を選ぶと、前の答えは残る
  go(env, env.document.querySelector('.find-opt[href*="body=rich"]').getAttribute('href'));
  assert.match(env.window.location.hash, /serve=rock/);
  assert.match(env.window.location.hash, /body=rich/);
  assert.deepEqual(env.errors, []);
});

test('好みから探す：トップに入口がある', () => {
  const d = load('').document;
  assert.ok(d.querySelector('.hero a[href="#/find"]'));
  assert.ok(d.querySelector('#by-find a[href="#/find"]'));
});
