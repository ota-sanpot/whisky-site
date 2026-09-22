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
  <a class="search" href="#/list">
    <span class="sr-only">銘柄名・蒸溜所名で探す</span>
    <input type="text" placeholder="例：ひびき / hibiki / 山崎" readonly tabindex="-1">
    <button type="button" tabindex="-1">探す</button>
  </a>
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
    return `<a class="quad" href="${listHref({ taste: LEGACY_TASTE[q.key] })}"><span class="quad-name">${esc(q.label)}</span><span class="quad-count">${n}本</span></a>`;
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

  // トップの検索窓・味の入口は #/list へのリンクになったので、束ねる対象がない（Task 10 でトップを作り直す）
  function bindTop() {}

  // ===== 画面：銘柄一覧 =====

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
    // 同点のときは、一覧の「おすすめ」と同じ並び（定番→飲みやすさ→読み）で決める
    const order = new Map(sortList(DATA.whiskies, 'recommend').map((w, i) => [w.id, i]));
    return [...DATA.whiskies]
      .map((w) => ({ w, s: findScore(w, a) }))
      .sort((x, y) => y.s - x.s || order.get(x.w.id) - order.get(y.w.id))
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
<p class="find-links"><a class="btn btn--ghost" href="#/list">別の条件で探す</a><a class="btn btn--ghost" href="${compareHref(list[0].id, list[1].id)}">上位2本を比べる</a><a class="btn btn--ghost" href="#/map">味わいMAPを見る</a><a class="btn btn--ghost" href="#/today">今日の1本を見る</a></p>`;
    }

    return {
      title: `3問で診断｜${SITE}`,
      html: `<section class="hero hero--sm"><h1>3問であなたに合う1本</h1><p class="hero-lead">選ぶたびに結果が変わります。答えは URL に残るので、そのまま共有できます。</p></section>
<section class="find">${questions}</section>
<section id="find-result">${result}</section>`,
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
  <h2 class="label" id="for-whom-h">こんな人におすすめ</h2>
  <p>${esc(bits.join('、'))}に向いています。</p>
  <p class="scene-tags">${tags}</p>
  <p class="note">この項目は編集部の見立てです。</p>
</section>`;
  }

  function viewWhisky(id) {
    const w = W.get(id);
    if (!w) return viewNotFound();
    const multi = w.components.length > 1;
    const std = DATA.standards[w.standard];
    const opinion = '<span class="opinion">編集部の見立て</span>';
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
    // 香り・味・余韻（公式の要約＋余韻の長さ）。finish は全銘柄に入っているので、この節は必ず出る
    const notes = (w.official || []).length || w.finish
      ? `<section id="notes" aria-labelledby="notes-h"><h2 class="label" id="notes-h">香り・味・余韻</h2>
${(w.official || []).map((o) => `<p class="note-row"><span class="note-k">${esc(o.k)}</span><span class="note-v">${esc(o.v)}</span></p>`).join('')}
<p class="note-row note-finish"><span class="note-k">余韻の長さ（サイト独自の目安）</span><span class="note-v">${esc(w.finish)}</span></p>
<p class="note">「特長」「香り」「味」はメーカー公式の説明を要約したものです。余韻の長さはサイト独自の目安です。</p></section>`
      : '';
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
  <section id="taste" aria-labelledby="taste-h">
    <h2 class="label" id="taste-h">味の一言${opinion}</h2>
    <p class="w-line">${phrases(w.taste.line)}</p>
  </section>
  <section id="profile" aria-labelledby="profile-h">
    <h2 class="label" id="profile-h">味わい（5段階）</h2>
    ${profileBars(w)}
    <p class="note">味わいの5段階は、このサイト独自の目安です。</p>
  </section>
  ${notes}
  <section id="serve" aria-labelledby="serve-h">
    <h2 class="label" id="serve-h">おすすめの飲み方${opinion}</h2>
    <ul class="serve">${SERVES.map(([k, label]) => `<li class="serve-item serve-${w.serve[k]}"><span class="serve-mark" aria-hidden="true">${MARK[w.serve[k]]}</span><span class="serve-name">${label}</span><span class="sr-only">${MARK_TEXT[w.serve[k]]}</span></li>`).join('')}</ul>
    ${w.makerServe ? `<p class="maker-serve"><span class="maker-tag">メーカーのおすすめ</span>${esc(w.makerServe.text)}</p>` : ''}
  </section>
  ${forWhomHtml(w)}
  <section id="origin" aria-labelledby="origin-h">
    <h2 class="label" id="origin-h">${multi ? '中身の原酒と産地' : '産地・蒸溜所'}</h2>
    <ul class="chips">${w.components.map((c) => `<li>${componentChip(c)}</li>`).join('')}</ul>
    ${w.originNote ? `<p class="origin-note">${esc(w.originNote)}</p>` : ''}
  </section>
  <section id="next" aria-labelledby="next-h">
    <h2 class="label" id="next-h">次の1本${opinion}</h2>
    <ul class="next-row">${nextOf(w).map((n) => `<li>${nextCard(n)}</li>`).join('')}</ul>
  </section>
</div>
${relatedCompare}
<section id="deep" class="deep">
  <p class="deep-intro">もっと知る</p>
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
</section>`,
    };
  }

  // ===== 画面：蒸溜所一覧 =====
  // 代表銘柄（編集部が選ぶ）：その蒸溜所だけで造る銘柄を優先し、その中では定番を先に
  function flagship(d) {
    const uses = DATA.whiskies.filter((w) => w.components.some((c) => c.distillery === d.id));
    const own = uses.filter((w) => w.components.every((c) => c.distillery === d.id));
    const pick = (list) => list.find((w) => STAPLES.includes(w.id)) || list[0] || null;
    return pick(own) || pick(uses.filter((w) => w.maker === d.maker)) || pick(uses);
  }

  function distilleryCardFull(d) {
    const f = flagship(d);
    return `<li><a class="card card--dist" href="#/distillery/${esc(d.id)}"><span class="card-body">
<span class="card-name">${esc(d.name)}</span>
<span class="card-meta">${esc(d.pref)}・${esc(d.maker)}</span>
${f ? `<span class="card-meta">代表銘柄（編集部が選ぶ）：${esc(f.name)}</span>` : ''}</span></a></li>`;
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
  <p><a class="btn btn--ghost" href="#/list?distillery=${esc(d.id)}">この蒸溜所の原酒を使う銘柄を一覧で見る</a></p>
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
      cmpRow('区分', badge(a.standard, false), badge(b.standard, false)),
      cmpRow('向いている飲み方', esc(serveText(a)), esc(serveText(b))),
      cmpRow('余韻の長さ', esc(a.finish), esc(b.finish)),
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
  <p id="cmp-diff" class="cmp-diff"><strong>こんな違いがあります。</strong>${esc(compareDiff(a, b))}<span class="note">味わいの5段階・余韻の長さ・向いている飲み方と、この文はサイト独自の目安です。どちらが良いという意味ではありません。</span></p>
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

  // 味わいの判定は一覧（TASTE_FILTERS）と同じものを使う。地図では呼び名だけ変える
  const tasteTest = (key) => TASTE_FILTERS.find((x) => x.key === key).test;
  const MAP_FILTERS = [
    { key: '', label: 'すべて', test: () => true },
    { key: 'fruity', label: 'フルーティ系', test: tasteTest('fruity') },
    { key: 'smoky', label: 'スモーキー系', test: tasteTest('smoky') },
    { key: 'sweet', label: '甘い系', test: tasteTest('sweet') },
    { key: 'fresh', label: '軽やか系', test: tasteTest('fresh') },
  ];

  function mapSvg(list, opts = {}) {
    const half = MAP_SIZE / 2;
    const pts = list.map((w) => {
      const { cx, cy } = mapPos(w);
      const on = opts.focus === w.id;
      return `<a class="pt${on ? ' pt--on' : ''}" href="#/whisky/${esc(w.id)}" data-id="${esc(w.id)}"><title>${esc(w.name)}：${esc(w.taste.line)}</title><circle class="pt-hit" cx="${cx}" cy="${cy}" r="10"></circle><circle cx="${cx}" cy="${cy}" r="${on ? 6 : 4}"></circle></a>`;
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

  // ===== 画面：今日の1本 =====
  // 今日の通算日数を種に、日ごとに大きく動く番号を作る（同じ日なら必ず同じ値）
  function todayIndex(date = new Date()) {
    const days = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    let x = days + 1;
    x = Math.imul(x ^ (x >>> 16), 2246822507);
    x = Math.imul(x ^ (x >>> 13), 3266489909);
    return (x ^ (x >>> 16)) >>> 0;
  }
  function todayPick(n) {
    const len = DATA.whiskies.length;
    return DATA.whiskies[((n % len) + len) % len];
  }

  function viewToday(r) {
    const n = r.n === '' ? todayIndex() : Number(r.n);
    const num = Number.isInteger(n) ? n : todayIndex();
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

  // ===== ルーター =====
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
    if (parts.length === 1 && parts[0] === 'distilleries') return { view: 'distilleries', region: params.get('region') || '' };
    if (parts.length === 1 && parts[0] === 'find') {
      return { view: 'find', q1: params.get('q1') || 'any', q2: params.get('q2') || 'any', q3: params.get('q3') || 'any' };
    }
    if (parts.length === 1 && parts[0] === 'standard') return { view: 'standard' };
    if (parts.length === 1 && parts[0] === 'compare') {
      return { view: 'compare', a: params.get('a') || '', b: params.get('b') || '' };
    }
    if (parts.length === 1 && parts[0] === 'map') return { view: 'map', filter: params.get('filter') || '' };
    if (parts.length === 1 && parts[0] === 'today') return { view: 'today', n: params.get('n') || '' };
    return { view: 'notfound' };
  }

  function render() {
    const r = parseHash(location.hash);
    const v = r.view === 'top' ? viewTop(r)
      : r.view === 'list' ? viewList(r)
        : r.view === 'find' ? viewFind(r)
          : r.view === 'whisky' ? viewWhisky(r.id)
            : r.view === 'distillery' ? viewDistillery(r.id)
              : r.view === 'distilleries' ? viewDistilleries(r)
                : r.view === 'standard' ? viewStandard()
                  : r.view === 'compare' ? viewCompare(r)
                    : r.view === 'map' ? viewMap(r)
                      : r.view === 'today' ? viewToday(r)
                        : viewNotFound();
    app.innerHTML = v.html;
    document.title = v.title;
    if (r.view === 'top') bindTop();
    if (r.view === 'list') bindList();
    if (r.view === 'compare') bindCompare();
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
  window.__app = { search, norm, parseHash, render, listMatch, sortList, regionOf, typeGroupOf, todayIndex, todayPick };
})();
