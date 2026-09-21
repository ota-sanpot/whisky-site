(() => {
  'use strict';

  // ===== 共通 =====
  const DATA = window.WDATA;
  const W = new Map(DATA.whiskies.map((w) => [w.id, w]));
  const D = new Map(DATA.distilleries.map((d) => [d.id, d]));
  const SITE = 'Japanese Whisky Guide';
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
  const distName = (d) => d.name.replace(/蒸[溜留]所$/, '');
  const quadOf = (t) => QUADS.find((q) => q.test(t));
  const STD_KEYS = Object.keys(DATA.standards);

  // ボトル図の色。個別の指定がなければ種類で液色を変え、ラベルの字は short の1文字目
  function lookOf(w) {
    if (w.look) return w.look;
    const liquid = /グレーン/.test(w.type) && !/モルト/.test(w.type) ? '#d6a24e' : /シングルモルト/.test(w.type) ? '#b8732a' : '#c4832f';
    return { liquid, label: '#e9dfcc', mark: '#2a1d10', char: [...w.short][0] };
  }

  // 限定品の表示（地域限定・数量限定など）
  const limitedTag = (w) => (w.limited ? `<span class="limited">${esc(w.limited)}</span>` : '');

  // 手書きの「次の1本」がない銘柄は、味の地図で近い2本を出す（同じメーカーは少し遠く扱って偏りを減らす）
  function nextOf(w) {
    if (w.next) return w.next;
    return DATA.whiskies
      .filter((o) => o.id !== w.id)
      .map((o) => ({ o, d: Math.hypot(o.taste.x - w.taste.x, o.taste.y - w.taste.y) + (o.maker === w.maker ? 0.08 : 0) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .map(({ o }) => ({ id: o.id, name: o.name, why: `味の地図で近い位置にある、${o.maker}の${o.type}` }));
  }

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
    const l = lookOf(w);
    return `<span class="bottle bottle--${size}" style="--liquid:${esc(l.liquid)};--label:${esc(l.label)};--mark:${esc(l.mark)}" aria-hidden="true"><span class="bottle-neck"></span><span class="bottle-body"></span><span class="bottle-label">${esc(l.char)}</span></span>`;
  }

  // 味の地図。focus を渡すとその銘柄だけを強調する小さい版、渡さないと全銘柄のラベル付きの大きい版
  function tasteMap(opts) {
    const S = 200;
    const P = 14;
    const I = S - P * 2;
    const at = (t) => [P + ((t.x + 1) / 2) * I, P + (1 - (t.y + 1) / 2) * I];
    // 銘柄が多いとラベルが重なるので、点だけにする（点に触れると名前が出る）
    const labels = DATA.whiskies.length <= 12;
    const dots = DATA.whiskies.map((w) => {
      const [cx, cy] = at(w.taste);
      if (opts.focus) {
        const on = w.id === opts.focus;
        return { on, svg: `<circle class="dot${on ? ' dot--focus' : ''}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${on ? 7 : 4}"><title>${esc(w.name)}</title></circle>` };
      }
      const right = w.taste.x > 0.45;
      const label = labels ? `<text class="dot-label" x="${(right ? cx - 10 : cx + 10).toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="${right ? 'end' : 'start'}">${esc(w.short)}</text>` : '';
      return { on: false, svg: `<a href="#/whisky/${esc(w.id)}"><circle class="dot dot--all" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${labels ? 6 : 3.5}"><title>${esc(w.name)}</title></circle>${label}</a>` };
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

  function whiskyCard(w, why) {
    return `<li><a class="card" href="#/whisky/${esc(w.id)}">${bottle(w, 'sm')}<span class="card-body"><span class="card-name">${esc(w.name)}</span><span class="card-meta">${esc(w.maker)}・${esc(w.type)}</span><span class="card-meta">${esc(originText(w))}</span>${why ? `<span class="card-why">${esc(why)}</span>` : ''}<span class="card-tags">${badge(w.standard, false)}${limitedTag(w)}</span></span></a></li>`;
  }

  function distilleryCard(d) {
    return `<li><a class="card card--dist" href="#/distillery/${esc(d.id)}"><span class="card-body"><span class="card-kind">蒸溜所</span><span class="card-name">${esc(d.name)}</span><span class="card-meta">${esc(d.pref)}・${esc(d.maker)}</span></span></a></li>`;
  }

  function viewNotFound() {
    return {
      title: `ページが見つかりません｜${SITE}`,
      html: `<section class="hero"><h1>ページが見つかりません</h1><p class="hero-lead">いま掲載しているのは${DATA.whiskies.length}銘柄と${DATA.distilleries.length}蒸溜所です。順次増やしていきます。</p><p><a class="btn" href="#/">トップへ戻る</a></p></section>`,
    };
  }

  // ===== 検索 =====
  const whiskyHay = new Map(DATA.whiskies.map((w) => [w.id, norm([
    w.name, w.nameEn, w.kana, ...(w.aliases || []), w.maker, w.type, w.limited,
    ...w.components.flatMap((c) => {
      const d = c.distillery ? D.get(c.distillery) : null;
      return d ? [d.name, d.nameEn, d.kana, d.pref] : [c.country];
    }),
  ].join('|'))]));
  const distilleryHay = new Map(DATA.distilleries.map((d) => [d.id, norm([d.name, d.nameEn, d.kana, d.maker, d.pref].join('|'))]));

  // 蒸溜所を先に、続けて銘柄を返す
  function search(q) {
    const nq = norm(q);
    if (!nq) return [];
    const ds = DATA.distilleries
      .filter((d) => distilleryHay.get(d.id).includes(nq))
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
      emptyText = `見つかりませんでした。ひらがな・カタカナ・英字の読みでも探せます（例：よいち、yoichi）。いま掲載しているのは${DATA.whiskies.length}銘柄で、順次増やしていきます。`;
    } else if (QUADS.some((q) => q.key === r.taste)) {
      const q = QUADS.find((x) => x.key === r.taste);
      head = `味：${esc(q.label)}`;
      items = DATA.whiskies.filter((w) => q.test(w.taste)).map((item) => ({ kind: 'whisky', item }));
      clear = '<a class="clear" href="#/">すべて表示</a>';
      emptyText = 'この味の銘柄は、まだ掲載していません。';
    } else {
      const makers = [...new Set(DATA.whiskies.map((w) => w.maker))];
      return `<div class="sec-head"><h2 id="results-h">掲載中の銘柄</h2><span class="count">${DATA.whiskies.length}本</span></div>${makers.map((m, i) => {
        const ws = DATA.whiskies.filter((w) => w.maker === m);
        return `<details class="maker-group"${i === 0 ? ' open' : ''}><summary><span class="maker-name">${esc(m)}</span><span class="maker-count">${ws.length}本</span></summary><ul class="cards">${ws.map((w) => whiskyCard(w)).join('')}</ul></details>`;
      }).join('')}`;
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
  <p class="eyebrow">JAPANESE WHISKY GUIDE</p>
  <h1>その一本を、<br>ちゃんと知る。</h1>
  <p class="hero-lead">ジャパニーズウイスキーを1本ずつ。どこの県の、どの原酒で、どんな味で、どう飲むとうまいか。</p>
  <form class="search" role="search" id="search-form">
    <label class="sr-only" for="q">銘柄名・蒸溜所名で探す</label>
    <input id="q" name="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="例：ひびき / hibiki / 山崎" value="${esc(r.q)}">
    <button type="submit">探す</button>
  </form>
  <p class="search-hint">ひらがな・カタカナ・英字でも引けます。棚のラベルの読みでどうぞ。</p>
  <p class="hero-find"><a class="btn" href="#/find">好みから探す（3タップ）</a></p>
</section>
<section class="sec" aria-labelledby="results-h">
  <div id="results">${resultsHtml(r)}</div>
</section>
<section class="sec" id="by-pref" aria-labelledby="pref-h">
  <div class="sec-head"><h2 id="pref-h">都道府県から探す</h2><span class="count">${DATA.distilleries.length}蒸溜所</span></div>
  <ul class="prefs">${prefs.map((p) => `<li class="pref"><p class="pref-name">${esc(p)}</p><ul>${byPref.get(p).map((d) => `<li><a href="#/distillery/${esc(d.id)}">${esc(d.name)}</a></li>`).join('')}</ul></li>`).join('')}</ul>
</section>
<section class="sec" id="by-find">
  <a class="std-card" href="#/find">
    <h2>迷ったら、好みから探す</h2>
    <p>飲み方と味の好みを3タップ選ぶと、合いそうな3本を出します。</p>
    <span class="badges"><span class="badge badge--jw">3タップ</span><span class="opinion">編集部の見立て</span></span>
  </a>
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
    <p>${esc(rule.summary)} このサイトでは全銘柄に、${STD_KEYS.length}つの区分のどれかを付けています。</p>
    <span class="badges">${STD_KEYS.map((k) => badge(k, false)).join('')}</span>
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

  // ===== 画面：好みから探す =====
  // 3つの質問。answers は { serve, flavor, body }（'any' は「こだわらない」）
  const FIND_QUESTIONS = [
    { key: 'serve', label: 'どう飲む？', options: [['straight', 'ストレート'], ['rock', 'ロック'], ['highball', 'ハイボール'], ['mizuwari', '水割り'], ['any', 'こだわらない']] },
    { key: 'flavor', label: 'どんな香り？', options: [['floral', '華やか・フルーティ'], ['any', 'こだわらない'], ['smoky', 'スモーキー']] },
    { key: 'body', label: '濃さは？', options: [['light', '軽やか'], ['any', 'こだわらない'], ['rich', '濃厚']] },
  ];
  const SERVE_NAME = Object.fromEntries(SERVES);

  // 飲み方は◎+2・○+1・△-2、香りと濃さは味の地図の位置で点を付ける。限定品は店で会いにくいので少し下げる
  function findScore(w, a) {
    let s = 0;
    if (a.serve !== 'any') s += { 3: 2, 2: 1, 1: -2 }[w.serve[a.serve]];
    if (a.flavor === 'floral') s += -w.taste.x * 2;
    if (a.flavor === 'smoky') s += w.taste.x * 2;
    if (a.body === 'light') s += -w.taste.y * 2;
    if (a.body === 'rich') s += w.taste.y * 2;
    if (w.limited) s -= 0.3;
    return s;
  }

  function recommend(a) {
    return DATA.whiskies
      .map((w) => ({ w, s: findScore(w, a) }))
      .sort((x, y) => y.s - x.s || x.w.id.localeCompare(y.w.id))
      .slice(0, 3);
  }

  // 「なぜ合うか」の1行（飲み方の◎○△と、味の地図の位置から）
  function findWhy(w, a) {
    const parts = [];
    if (a.serve !== 'any') parts.push(`${SERVE_NAME[a.serve]}が${MARK_TEXT[w.serve[a.serve]]}`);
    parts.push(quadOf(w.taste).label.replace(' × ', 'で'));
    return parts.join('・');
  }

  const findHref = (a, key, value) => {
    const next = { ...a, [key]: value };
    const qs = FIND_QUESTIONS.map((q) => q.key).filter((k) => next[k] !== 'any').map((k) => `${k}=${next[k]}`).join('&');
    return qs ? `#/find?${qs}` : '#/find';
  };

  function findResultHtml(a) {
    const chosen = FIND_QUESTIONS.some((q) => a[q.key] !== 'any');
    if (!chosen) {
      return `<p class="find-hint">上の3つから選ぶと、合う順に3本出します。1つだけ選んでも大丈夫です。</p>`;
    }
    const hits = recommend(a);
    return `<div class="sec-head"><h2 id="find-result-h">あなたに合いそうな3本</h2><span class="opinion">編集部の見立て</span></div>
<ul class="cards">${hits.map(({ w }) => whiskyCard(w, findWhy(w, a))).join('')}</ul>
<p class="note">飲み方の◎○△と味の地図をもとにした、編集部の見立てです。</p>`;
  }

  function viewFind(a) {
    return {
      title: `好みから探す｜${SITE}`,
      html: `
<nav class="crumb" aria-label="現在地"><a href="#/">トップ</a> / 好みから探す</nav>
<header class="d-head">
  <p class="w-maker">3タップで選ぶ</p>
  <h1 class="d-name">好みから探す</h1>
  <p class="d-lead">飲み方と味の好みを選ぶと、合いそうな3本を出します。</p>
</header>
<div id="find-form">
  ${FIND_QUESTIONS.map((q) => `<section class="find-q" aria-labelledby="find-${q.key}">
    <h2 class="label" id="find-${q.key}">${q.label}</h2>
    <ul class="find-opts">${q.options.map(([v, label]) => `<li><a class="find-opt" href="${findHref(a, q.key, v)}"${a[q.key] === v ? ' aria-current="true"' : ''}>${label}</a></li>`).join('')}</ul>
  </section>`).join('')}
</div>
<section class="sec" id="find-result" aria-labelledby="find-result-h">${findResultHtml(a)}</section>`,
    };
  }

  // ===== 画面：銘柄 =====
  const shortKind = (k) => k.replace(/の?原酒$/, '') || '原酒';

  // 読点ごとの句に分ける（句の途中で改行させない）
  const phrases = (s) => s.split(/(?<=、)/).map((p) => `<span class="ph">${esc(p)}</span>`).join('');

  // 最初の一画面の「産地・原酒」チップ。蒸溜所が分かるものは蒸溜所ページへリンク
  function componentChip(c) {
    const d = c.distillery ? D.get(c.distillery) : null;
    const where = d ? d.pref : c.country;
    const inner = `<span class="chip-where">${esc(where)}</span>${d ? `<span class="chip-name">${esc(distName(d))}</span>` : ''}<span class="chip-kind">${esc(shortKind(c.kind))}</span>`;
    return d
      ? `<a class="chip" href="#/distillery/${esc(d.id)}">${inner}</a>`
      : `<span class="chip">${inner}</span>`;
  }

  // 「原酒と樽」の構成図の1行
  function flowItem(c) {
    const d = c.distillery ? D.get(c.distillery) : null;
    const name = d
      ? `<a href="#/distillery/${esc(d.id)}">${esc(d.name)}</a>`
      : '蒸溜所名 非公表';
    const where = d ? `${c.country}・${d.pref}` : c.country;
    return `<div class="flow-item"><span class="flow-where">${esc(where)}</span><span class="flow-name">${name}</span><span class="flow-kind">${esc(c.kind)}</span>${c.note ? `<span class="flow-note">${esc(c.note)}</span>` : ''}</div>`;
  }

  // 「次の1本」カード。まだページのない銘柄はリンクにしない
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
    ${w.nameEn ? `<p class="w-en">${esc(w.nameEn)}</p>` : ''}
    <p class="w-tags">${badge(w.standard, true)}${limitedTag(w)}</p>
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
    <div class="w-taste-body"><p class="w-line">${phrases(w.taste.line)}</p>${tasteMap({ focus: w.id })}</div>
  </section>
  <section class="w-serve" aria-labelledby="serve-h">
    <h2 class="label" id="serve-h">おすすめの飲み方${opinion}</h2>
    <ul class="serve">${SERVES.map(([k, label]) => `<li class="serve-item serve-${w.serve[k]}"><span class="serve-mark" aria-hidden="true">${MARK[w.serve[k]]}</span><span class="serve-name">${label}</span><span class="sr-only">${MARK_TEXT[w.serve[k]]}</span></li>`).join('')}</ul>
    ${w.makerServe ? `<p class="maker-serve"><span class="maker-tag">メーカーのおすすめ</span>${esc(w.makerServe.text)}</p>` : ''}
  </section>
  <section class="w-next" aria-labelledby="next-h">
    <h2 class="label" id="next-h">似ている銘柄・次の1本${opinion}</h2>
    <ul class="next-row">${nextOf(w).map((n) => `<li>${nextCard(n)}</li>`).join('')}</ul>
  </section>
</div>
<div class="deep">
  <p class="deep-intro">もっと知る</p>
  ${w.official ? `<section id="official" aria-labelledby="official-h">
    <h2 id="official-h">香り・味・余韻</h2>
    <dl class="dl">${w.official.map((o) => `<dt>${esc(o.k)}</dt><dd>${esc(o.v)}</dd>`).join('')}</dl>
    <p class="note">メーカー公式の説明を要約しています。${w.official.length === 1 ? '香り・味・余韻を分けた説明は、公式ページにありません。' : ''}</p>
  </section>` : ''}
  <section id="casks" aria-labelledby="casks-h">
    <h2 id="casks-h">原酒と樽</h2>
    <div class="flow">${w.components.map(flowItem).join('')}<div class="flow-arrow" aria-hidden="true">▼</div><div class="flow-result">${esc(w.name)}</div></div>
    ${w.componentsNote ? `<p class="note">${esc(w.componentsNote)}</p>` : ''}
    ${w.casks ? `<p class="note">${esc(w.casks)}</p>` : ''}
  </section>
  ${w.story ? `<section id="story" class="story" aria-labelledby="story-h">
    <h2 id="story-h">造り手と歴史</h2>
    ${w.story.map((p) => `<p>${esc(p)}</p>`).join('')}
  </section>` : ''}
  <section id="specs" aria-labelledby="specs-h">
    <h2 id="specs-h">スペック</h2>
    <dl class="dl">${(w.specs || []).map((x) => `<dt>${esc(x.k)}</dt><dd>${esc(x.v)}</dd>`).join('')}<dt>表示基準</dt><dd>${esc(std.label)}。${esc(w.standardNote)}</dd></dl>
  </section>
  ${sourcesHtml(w.sources)}
</div>`,
    };
  }

  // ===== 画面：蒸溜所・表示基準 =====
  function viewDistillery(id) {
    const d = D.get(id);
    if (!d) return viewNotFound();
    // この蒸溜所だけでつくる銘柄と、この蒸溜所の原酒が使われている銘柄に分ける
    const own = DATA.whiskies.filter((w) => w.components.every((c) => c.distillery === d.id));
    const used = DATA.whiskies
      .filter((w) => !own.includes(w))
      .map((w) => ({ w, c: w.components.find((c) => c.distillery === d.id) }))
      .filter((x) => x.c);
    const meta = [['所在地', d.address], ['創業', d.founded], ['運営', d.maker]].filter(([, v]) => v);
    return {
      title: `${d.name}｜${SITE}`,
      html: `
<nav class="crumb" aria-label="現在地"><a href="#/">トップ</a> / 蒸溜所</nav>
<header class="d-head">
  <p class="w-maker">${esc(d.pref)}・${esc(d.maker)}</p>
  <h1 class="d-name">${esc(d.name)}</h1>
  ${d.nameEn ? `<p class="w-en">${esc(d.nameEn)}</p>` : ''}
  ${d.lead ? `<p class="d-lead">${esc(d.lead)}</p>` : ''}
</header>
<dl class="dl d-meta">${meta.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
<div class="deep">
  ${d.features ? `<section id="features" aria-labelledby="features-h">
    <h2 id="features-h">この蒸溜所の特徴</h2>
    <dl class="dl">${d.features.map((f) => `<dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd>`).join('')}</dl>
  </section>` : ''}
  ${own.length ? `<section id="single" aria-labelledby="single-h">
    <h2 id="single-h">この蒸溜所の銘柄</h2>
    <ul class="cards">${own.map((w) => whiskyCard(w)).join('')}</ul>
  </section>` : ''}
  ${used.length ? `<section id="used" aria-labelledby="used-h">
    <h2 id="used-h">この蒸溜所の原酒が使われている銘柄</h2>
    <ul class="cards">${used.map(({ w, c }) => `<li><a class="card" href="#/whisky/${esc(w.id)}">${bottle(w, 'sm')}<span class="card-body"><span class="used-role">${esc(c.kind)}として使用</span><span class="card-name">${esc(w.name)}</span><span class="card-meta">${esc(w.maker)}・${esc(w.type)}</span><span class="card-tags">${badge(w.standard, false)}${limitedTag(w)}</span></span></a></li>`).join('')}</ul>
    <p class="note">原酒の使用を公表で確認できた銘柄だけを載せています。</p>
  </section>` : ''}
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
    <h2 id="kinds-h">このサイトの${STD_KEYS.length}つの区分</h2>
    <ul class="kinds">${STD_KEYS.map((k) => `<li>${badge(k, false)}<p>${esc(DATA.standards[k].desc)}</p></li>`).join('')}</ul>
    <p class="note">区分はメーカーの公表内容で決めています。この基準は業界団体の自主基準で、法律による決まりではありません。</p>
  </section>
  ${sourcesHtml(rule.sources)}
</div>`,
    };
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
    if (parts.length === 1 && parts[0] === 'find') {
      return { view: 'find', serve: params.get('serve') || 'any', flavor: params.get('flavor') || 'any', body: params.get('body') || 'any' };
    }
    if (parts.length === 1 && parts[0] === 'standard') return { view: 'standard' };
    return { view: 'notfound' };
  }

  function render() {
    const r = parseHash(location.hash);
    const v = r.view === 'top' ? viewTop(r)
      : r.view === 'find' ? viewFind(r)
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
  window.__app = { search, norm, parseHash, render };
})();
