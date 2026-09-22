// 画面描画・検索・画面遷移のテスト
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, go, readData } from './helpers.mjs';

const DATA = readData();
const text = (el) => el.textContent.replace(/\s+/g, '');
const hrefs = (els) => [...els].map((a) => a.getAttribute('href'));

// 度数はデータに数字で持たせず specs の文字列から取り出す
const abvOf = (w) => {
  const s = (w.specs || []).find((x) => x.k === 'アルコール度数');
  const m = s && String(s.v).match(/(\d+(?:\.\d+)?)\s*%/);
  return m ? Number(m[1]) : null;
};

// ===== トップ・検索 =====

test('トップ：全銘柄がメーカー別にまとまって並び、エラーが出ない', async () => {
  const env = await load('');
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

test('都道府県から探す：北から順に並び、全蒸溜所がリンク', async () => {
  const env = await load('');
  const prefs = [...env.document.querySelectorAll('#by-pref .pref-name')].map((p) => p.textContent);
  assert.equal(prefs[0], '北海道');
  assert.equal(new Set(prefs).size, prefs.length);
  const links = hrefs(env.document.querySelectorAll('#by-pref a'));
  assert.equal(links.length, DATA.distilleries.length);
});

test('トップ：表示基準の説明への入口に5区分が並ぶ', async () => {
  const env = await load('');
  const card = env.document.querySelector('a.std-card[href="#/standard"]');
  assert.ok(card);
  assert.equal(card.querySelectorAll('.badge').length, 5);
});

test('知らない URL は見つからない表示', async () => {
  const env = await load('#/nope');
  assert.equal(text(env.document.querySelector('h1')), 'ページが見つかりません');
  assert.match(env.document.title, /^ページが見つかりません｜/);
});

test('サイト名は Japanese Whisky Guide', async () => {
  const env = await load('');
  assert.equal(env.document.querySelector('.brand-name').textContent, 'Japanese Whisky Guide');
  assert.equal(env.document.title, 'Japanese Whisky Guide');
  assert.equal(env.document.querySelector('.brand-tag'), null);
});

// ===== 銘柄ページ =====

test('銘柄ページ：響の最初の一画面', async () => {
  const env = await load('#/whisky/hibiki-jh');
  const d = env.document;
  assert.equal(d.querySelector('h1').textContent, '響 JAPANESE HARMONY');
  assert.equal(d.querySelector('.w-head .badge').textContent, 'ジャパニーズウイスキー');
  assert.equal(d.querySelector('.w-head .badge').getAttribute('href'), '#/standard');
  const chips = [...d.querySelectorAll('#origin .chip')].map(text);
  assert.deepEqual(chips, ['大阪府山崎モルト', '山梨県白州モルト', '愛知県知多グレーン']);
  assert.equal(d.querySelectorAll('#origin a.chip').length, 3);
  assert.match(d.querySelector('.w-line').textContent, /華やか/);
  assert.equal(d.querySelectorAll('#taste svg').length, 0, '銘柄ページから小さな味の地図は外した');
  assert.equal(d.querySelectorAll('#serve .serve-item').length, 4);
  assert.deepEqual(hrefs(d.querySelectorAll('#next a.next')), ['#/whisky/yamazaki', '#/whisky/hakushu', '#/whisky/ao']);
  assert.equal(d.title, '響 JAPANESE HARMONY｜Japanese Whisky Guide');
  assert.deepEqual(env.errors, []);
});

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

test('銘柄ページ：余韻の長さが出る（公式の余韻とは見出しで区別する）', async () => {
  const env = await load('#/whisky/yoichi');
  const w = DATA.whiskies.find((x) => x.id === 'yoichi');
  const notes = text(env.document.querySelector('#notes'));
  assert.ok(notes.includes(`余韻の長さ（サイト独自の目安）${w.finish}`), notes);
  // 公式に「余韻」の記述がある銘柄では、公式の行も残る
  const official = (w.official || []).find((o) => o.k === '余韻');
  if (official) assert.ok(notes.includes(official.v.replace(/\s+/g, '')), '公式の余韻の記述が消えている');

  // 公式に余韻の記述がない銘柄（hibiki-jh）でも、見立ての行は出る
  const hEnv = await load('#/whisky/hibiki-jh');
  const hw = DATA.whiskies.find((x) => x.id === 'hibiki-jh');
  assert.ok(!(hw.official || []).some((o) => o.k === '余韻'), 'このテストの前提（hibiki-jhに公式の余韻記述がないこと）が崩れている');
  const hNotes = text(hEnv.document.querySelector('#notes'));
  assert.ok(hNotes.includes(`余韻の長さ（サイト独自の目安）${hw.finish}`), hNotes);
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

test('銘柄ページ：見立ての項目には見立ての表示がある', async () => {
  const env = await load('#/whisky/yoichi');
  for (const sel of ['#taste', '#serve', '#next']) {
    assert.equal(env.document.querySelector(`${sel} .opinion`).textContent, '編集部の見立て', sel);
  }
});

test('銘柄ページ：飲み方は◎○△と読み上げ用の言葉で出る', async () => {
  const env = await load('#/whisky/yoichi');
  const items = [...env.document.querySelectorAll('#serve .serve-item')].map(text);
  assert.deepEqual(items, ['◎ストレートとても合う', '◎ロックとても合う', '○ハイボール合う', '△水割り好みが分かれる']);
});

test('銘柄ページ：碧Aoは海外原酒の区分と国別の原酒', async () => {
  const env = await load('#/whisky/ao');
  const d = env.document;
  const b = d.querySelector('.w-head .badge');
  assert.equal(b.textContent, '海外原酒を含む');
  assert.ok(b.classList.contains('badge--foreign'));
  const chips = [...d.querySelectorAll('#origin .chip')].map(text);
  assert.deepEqual(chips, ['大阪府山崎モルト', 'アメリカバーボン', 'スコットランド原酒', 'アイルランド原酒', 'カナダ原酒']);
  assert.match(d.querySelector('#origin .origin-note').textContent, /非公表|公表されていません/);
});

test('銘柄ページ：余市は1蒸溜所のシングルモルト、蒸溜所へリンク', async () => {
  const env = await load('#/whisky/yoichi');
  const d = env.document;
  assert.equal(d.querySelector('#origin h2').firstChild.textContent, '産地・蒸溜所');
  assert.deepEqual([...d.querySelectorAll('#origin .chip')].map(text), ['北海道余市モルト']);
  assert.deepEqual(hrefs(d.querySelectorAll('#origin a.chip')), ['#/distillery/yoichi']);
  assert.equal(d.querySelector('#origin .origin-note'), null);
});

test('銘柄ページ：スピリッツを含む区分', async () => {
  const b = (await load('#/whisky/white')).document.querySelector('.w-head .badge');
  assert.equal(b.textContent, 'スピリッツを含む');
  assert.ok(b.classList.contains('badge--spirits'));
});

test('銘柄ページ：チップの蒸溜所名と原酒の種類は短く出る', async () => {
  const t1 = [...(await load('#/whisky/sunshine')).document.querySelectorAll('#origin .chip')].map(text);
  assert.equal(t1[0], '富山県三郎丸モルト');
  const t2 = [...(await load('#/whisky/kujira-5')).document.querySelectorAll('#origin .chip')].map(text);
  assert.deepEqual(t2, ['沖縄県まさひろ酒造米']);
});

test('銘柄ページ：米だけでつくる銘柄は表示基準の対象外', async () => {
  const b = (await load('#/whisky/kujira-5')).document.querySelector('.w-head .badge');
  assert.equal(b.textContent, '表示基準の対象外');
  assert.ok(b.classList.contains('badge--other'));
});

test('銘柄ページ：限定品には限定の表示が出る', async () => {
  const d = (await load('#/whisky/date')).document;
  assert.equal(d.querySelector('.w-head .limited').textContent, '宮城県限定');
  assert.ok((await load('')).document.querySelector('a.card[href="#/whisky/date"] .limited'));
  assert.equal((await load('#/whisky/hibiki-jh')).document.querySelector('.w-head .limited'), null);
});

test('銘柄ページ：丁寧に知る部分と出典', async () => {
  for (const w of DATA.whiskies) {
    const d = (await load(`#/whisky/${w.id}`)).document;
    assert.ok(d.getElementById('casks'), `${w.id}: #casks`);
    assert.equal(d.querySelectorAll('#casks .flow-item').length, w.components.length, `${w.id}: flow`);
    assert.equal(d.querySelectorAll('#notes .note-row').length, (w.official || []).length + 1, `${w.id}: notes（公式の要約＋余韻）`);
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

test('銘柄ページ：存在しない id は見つからない表示', async () => {
  const env = await load('#/whisky/nope');
  assert.equal(text(env.document.querySelector('h1')), 'ページが見つかりません');
});

test('銘柄ページ：味の一言は読点ごとの句に分けて、句の途中で改行しない', async () => {
  const env = await load('#/whisky/yoichi');
  const phrases = [...env.document.querySelectorAll('.w-line .ph')].map((s) => s.textContent);
  assert.deepEqual(phrases, ['スモーキーで香ばしい、', 'どっしり力強い']);
});

test('銘柄ページ：メーカーのおすすめがある銘柄だけ、見立てとは別に出す', async () => {
  const yoichi = (await load('#/whisky/yoichi')).document.querySelector('#serve .maker-serve');
  assert.ok(yoichi);
  assert.match(yoichi.textContent, /^メーカーのおすすめ/);
  assert.equal((await load('#/whisky/ao')).document.querySelector('#serve .maker-serve'), null);
});

// ===== 蒸溜所・表示基準 =====

test('蒸溜所ページ：山崎（シングルモルトと、原酒が使われている銘柄）', async () => {
  const env = await load('#/distillery/yamazaki');
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

test('蒸溜所ページ：全蒸溜所にページがある', async () => {
  for (const dist of DATA.distilleries) {
    const d = (await load(`#/distillery/${dist.id}`)).document;
    assert.equal(d.querySelector('h1').textContent, dist.name, dist.id);
    assert.ok(d.querySelectorAll('#sources a').length >= 1, dist.id);
  }
});

test('蒸溜所ページ：存在しない id は見つからない表示', async () => {
  const env = await load('#/distillery/nope');
  assert.equal(text(env.document.querySelector('h1')), 'ページが見つかりません');
});

test('銘柄と蒸溜所を行き来できる', async () => {
  const env = await load('#/whisky/hibiki-jh');
  go(env, env.document.querySelector('#origin a.chip').getAttribute('href'));
  assert.equal(env.document.querySelector('h1').textContent, '山崎蒸溜所');
  go(env, env.document.querySelector('#used a.card[href="#/whisky/hibiki-jh"]').getAttribute('href'));
  assert.equal(env.document.querySelector('h1').textContent, '響 JAPANESE HARMONY');
  assert.deepEqual(env.errors, []);
});

test('表示基準ページ：要件5つと5区分と出典', async () => {
  const d = (await load('#/standard')).document;
  assert.match(d.querySelector('h1').textContent, /ジャパニーズウイスキー/);
  assert.deepEqual([...d.querySelectorAll('.std-items dt')].map((x) => x.textContent), ['原材料', '造り', '熟成', '瓶詰め', 'その他']);
  assert.deepEqual([...d.querySelectorAll('#kinds .badge')].map((x) => x.textContent), ['ジャパニーズウイスキー', '海外原酒を含む', 'スピリッツを含む', '表示基準の対象外', '区分 未確認']);
  assert.equal(d.querySelectorAll('#sources a').length, 2);
});

test('銘柄ページのバッジから表示基準ページへ行ける', async () => {
  const env = await load('#/whisky/ao');
  go(env, env.document.querySelector('.w-head .badge').getAttribute('href'));
  assert.match(env.document.querySelector('h1').textContent, /名乗れる条件/);
});

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

test('診断：同点が多いときは、編集部が選ぶ定番から上位に出る', async () => {
  const env = await load('#/find?q3=' + encodeURIComponent('食事と一緒に'));
  const ids = [...env.document.querySelectorAll('#find-result a.card')].map((a) => a.getAttribute('href').replace('#/whisky/', ''));
  assert.equal(ids.length, 3);
  const staples = ['hibiki-jh', 'yamazaki', 'hakushu', 'chita', 'yoichi', 'miyagikyo', 'fuji-single-blended', 'kakubin'];
  assert.ok(ids.every((id) => staples.includes(id)), `定番以外が出ている: ${ids.join('/')}`);
  // 該当する銘柄がそろって同点になる場面なので、読みの順（碧Ao など）に落ちていないことも確かめる
  assert.ok(!ids.includes('ao'), '読みの順に戻っている');
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

// ===== 銘柄一覧 =====

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
  // 余韻の長さ・向いている飲み方も見立てなので、注記にその断りが含まれること
  assert.match(s, /サイト独自の目安/);
  assert.match(s, /余韻の長さ/);
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
